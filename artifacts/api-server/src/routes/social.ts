import { Router, type Request, type Response } from "express";
import {
  db,
  users,
  friendships,
  friendInviteCodes,
  explorationSharing,
  listShares,
  listCollaborators,
  journeys,
  journeyWaypoints,
} from "@workspace/db";
import { eq, and, or, sql, gte, lte } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import logger from "../logger.js";

export const friendsRouter = Router();
export const socialMeRouter = Router();

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId)
        )
      )
    );
  return rows.map((r) =>
    r.requesterId === userId ? r.addresseeId : r.requesterId
  );
}

async function areFriends(userA: string, userB: string): Promise<boolean> {
  const [lo, hi] = sortPair(userA, userB);
  const [row] = await db
    .select({ status: friendships.status })
    .from(friendships)
    .where(
      and(
        eq(friendships.requesterId, lo),
        eq(friendships.addresseeId, hi),
        eq(friendships.status, "accepted")
      )
    );
  return !!row;
}

friendsRouter.get("/", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const friendIds = await getAcceptedFriendIds(user.id);
  if (friendIds.length === 0) {
    res.json({ friends: [] });
    return;
  }

  const friendUsers = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl,
    })
    .from(users)
    .where(sql`${users.id} = ANY(ARRAY[${sql.join(
      friendIds.map((id) => sql`${id}::text`),
      sql`, `
    )}])`);

  const sharingRows = await db
    .select({ friendId: explorationSharing.friendId })
    .from(explorationSharing)
    .where(eq(explorationSharing.userId, user.id));
  const sharingSet = new Set(sharingRows.map((r) => r.friendId));

  const friends = friendUsers.map((f) => ({
    ...f,
    explorationSharing: sharingSet.has(f.id),
  }));
  res.json({ friends });
});

friendsRouter.get("/requests", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const rows = await db
    .select({
      id: friendships.id,
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
      status: friendships.status,
      createdAt: friendships.createdAt,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "pending"),
        or(
          eq(friendships.requesterId, user.id),
          eq(friendships.addresseeId, user.id)
        )
      )
    );

  const userIdSet = new Set<string>();
  rows.forEach((r) => {
    userIdSet.add(r.requesterId);
    userIdSet.add(r.addresseeId);
  });
  userIdSet.delete(user.id);

  let userMap: Record<string, { displayName: string; profileImageUrl: string | null }> = {};
  if (userIdSet.size > 0) {
    const ids = Array.from(userIdSet);
    const userRows = await db
      .select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl })
      .from(users)
      .where(sql`${users.id} = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}::text`), sql`, `)}])`);
    userMap = Object.fromEntries(userRows.map((u) => [u.id, u]));
  }

  const incoming = rows
    .filter((r) => r.addresseeId === user.id)
    .map((r) => ({ ...r, from: userMap[r.requesterId] ?? null }));
  const outgoing = rows
    .filter((r) => r.requesterId === user.id)
    .map((r) => ({ ...r, to: userMap[r.addresseeId] ?? null }));

  res.json({ incoming, outgoing });
});

friendsRouter.post("/invite", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  await db
    .delete(friendInviteCodes)
    .where(eq(friendInviteCodes.userId, user.id));

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  let code = genCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db
      .select({ id: friendInviteCodes.id })
      .from(friendInviteCodes)
      .where(eq(friendInviteCodes.code, code));
    if (existing.length === 0) break;
    code = genCode();
    attempts++;
  }

  const [row] = await db
    .insert(friendInviteCodes)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      code,
      expiresAt,
    })
    .returning();

  res.json({ code: row.code, expiresAt: row.expiresAt });
});

friendsRouter.get("/invite", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const [row] = await db
    .select()
    .from(friendInviteCodes)
    .where(
      and(
        eq(friendInviteCodes.userId, user.id),
        sql`${friendInviteCodes.usedAt} IS NULL`
      )
    )
    .orderBy(sql`${friendInviteCodes.createdAt} DESC`)
    .limit(1);

  if (!row || row.expiresAt < new Date()) {
    res.json({ code: null });
    return;
  }
  res.json({ code: row.code, expiresAt: row.expiresAt });
});

friendsRouter.post("/join/:code", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const rawCode = String(req.params.code).toUpperCase().trim();

  const [invite] = await db
    .select()
    .from(friendInviteCodes)
    .where(eq(friendInviteCodes.code, rawCode));

  if (!invite) {
    res.status(404).json({ error: "Invalid code" });
    return;
  }
  if (invite.userId === user.id) {
    res.status(400).json({ error: "Cannot add yourself" });
    return;
  }
  if (invite.usedAt !== null) {
    res.status(400).json({ error: "Code already used" });
    return;
  }
  if (invite.expiresAt < new Date()) {
    res.status(400).json({ error: "Code expired" });
    return;
  }

  const already = await areFriends(user.id, invite.userId);
  if (already) {
    res.status(400).json({ error: "Already friends" });
    return;
  }

  const [lo, hi] = sortPair(invite.userId, user.id);
  const existingRow = await db
    .select()
    .from(friendships)
    .where(
      and(eq(friendships.requesterId, lo), eq(friendships.addresseeId, hi))
    );

  if (existingRow.length > 0) {
    await db
      .update(friendships)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(
        and(eq(friendships.requesterId, lo), eq(friendships.addresseeId, hi))
      );
  } else {
    await db.insert(friendships).values({
      id: crypto.randomUUID(),
      requesterId: lo,
      addresseeId: hi,
      status: "accepted",
      updatedAt: new Date(),
    });
  }

  await db
    .update(friendInviteCodes)
    .set({ usedBy: user.id, usedAt: new Date() })
    .where(eq(friendInviteCodes.id, invite.id));

  const [friend] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl,
    })
    .from(users)
    .where(eq(users.id, invite.userId));

  res.json({ friend });
});

friendsRouter.delete("/:friendId", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const friendId = String(req.params.friendId);

  const [lo, hi] = sortPair(user.id, friendId);

  await db.transaction(async (tx) => {
    await tx
      .delete(friendships)
      .where(
        and(eq(friendships.requesterId, lo), eq(friendships.addresseeId, hi))
      );

    await tx
      .delete(explorationSharing)
      .where(
        or(
          and(
            eq(explorationSharing.userId, user.id),
            eq(explorationSharing.friendId, friendId)
          ),
          and(
            eq(explorationSharing.userId, friendId),
            eq(explorationSharing.friendId, user.id)
          )
        )
      );

    const theirListIds = await tx
      .select({ listId: listShares.listId })
      .from(listShares)
      .where(
        and(
          eq(listShares.sharedByUserId, friendId),
          eq(listShares.sharedWithUserId, user.id)
        )
      );
    const myListIds = await tx
      .select({ listId: listShares.listId })
      .from(listShares)
      .where(
        and(
          eq(listShares.sharedByUserId, user.id),
          eq(listShares.sharedWithUserId, friendId)
        )
      );

    await tx
      .delete(listShares)
      .where(
        or(
          and(
            eq(listShares.sharedByUserId, user.id),
            eq(listShares.sharedWithUserId, friendId)
          ),
          and(
            eq(listShares.sharedByUserId, friendId),
            eq(listShares.sharedWithUserId, user.id)
          )
        )
      );

    for (const { listId } of [...theirListIds, ...myListIds]) {
      await tx
        .delete(listCollaborators)
        .where(
          or(
            and(
              eq(listCollaborators.listId, listId),
              eq(listCollaborators.userId, user.id)
            ),
            and(
              eq(listCollaborators.listId, listId),
              eq(listCollaborators.userId, friendId)
            )
          )
        );
    }
  });

  res.json({ ok: true });
});

friendsRouter.post("/:friendId/block", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const friendId = String(req.params.friendId);
  const [lo, hi] = sortPair(user.id, friendId);

  const existing = await db
    .select()
    .from(friendships)
    .where(
      and(eq(friendships.requesterId, lo), eq(friendships.addresseeId, hi))
    );

  if (existing.length > 0) {
    await db
      .update(friendships)
      .set({ status: "blocked", updatedAt: new Date() })
      .where(
        and(eq(friendships.requesterId, lo), eq(friendships.addresseeId, hi))
      );
  } else {
    await db.insert(friendships).values({
      id: crypto.randomUUID(),
      requesterId: user.id < friendId ? user.id : friendId,
      addresseeId: user.id < friendId ? friendId : user.id,
      status: "blocked",
      updatedAt: new Date(),
    });
  }

  res.json({ ok: true });
});

friendsRouter.get(
  "/:friendId/exploration",
  async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const friendId = String(req.params.friendId);
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat((req.query.radius as string) ?? "0.01");

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: "lat and lng are required" });
      return;
    }

    const [sharing] = await db
      .select({ id: explorationSharing.id })
      .from(explorationSharing)
      .where(
        and(
          eq(explorationSharing.userId, friendId),
          eq(explorationSharing.friendId, user.id)
        )
      );

    if (!sharing) {
      res.status(403).json({ error: "Exploration sharing not enabled" });
      return;
    }

    const clampedRadius = Math.min(Math.max(radius, 0.001), 0.05);
    const CELL = 0.0005;

    const allWaypoints = await db
      .select({
        lat: journeyWaypoints.lat,
        lng: journeyWaypoints.lng,
      })
      .from(journeyWaypoints)
      .innerJoin(journeys, eq(journeyWaypoints.journeyId, journeys.id))
      .where(
        and(
          eq(journeys.userId, friendId),
          gte(journeyWaypoints.lat, String(lat - clampedRadius * 2)),
          lte(journeyWaypoints.lat, String(lat + clampedRadius * 2)),
          gte(journeyWaypoints.lng, String(lng - clampedRadius * 2)),
          lte(journeyWaypoints.lng, String(lng + clampedRadius * 2))
        )
      );

    const exploredSet = new Set<string>();
    for (const wp of allWaypoints) {
      const cellLat =
        Math.floor(parseFloat(String(wp.lat)) / CELL) * CELL;
      const cellLng =
        Math.floor(parseFloat(String(wp.lng)) / CELL) * CELL;
      exploredSet.add(`${cellLat.toFixed(4)},${cellLng.toFixed(4)}`);
    }

    const explored: Array<{ lat: number; lng: number }> = [];
    for (const key of exploredSet) {
      const [clat, clng] = key.split(",").map(Number);
      explored.push({ lat: clat, lng: clng });
    }

    res.json({ explored });
  }
);

socialMeRouter.get("/exploration-sharing", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const rows = await db
    .select({
      friendId: explorationSharing.friendId,
      sharedSince: explorationSharing.sharedSince,
    })
    .from(explorationSharing)
    .where(eq(explorationSharing.userId, user.id));

  if (rows.length === 0) {
    res.json({ friends: [] });
    return;
  }

  const ids = rows.map((r) => r.friendId);
  const friendUsers = await db
    .select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl })
    .from(users)
    .where(sql`${users.id} = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}::text`), sql`, `)}])`);

  const userMap = Object.fromEntries(friendUsers.map((u) => [u.id, u]));
  const result = rows.map((r) => ({
    ...userMap[r.friendId],
    sharedSince: r.sharedSince,
  }));
  res.json({ friends: result });
});

socialMeRouter.post(
  "/exploration-sharing/:friendId",
  async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const friendId = String(req.params.friendId);

    const isFriend = await areFriends(user.id, friendId);
    if (!isFriend) {
      res.status(403).json({ error: "Not friends with this user" });
      return;
    }

    await db
      .insert(explorationSharing)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        friendId,
      })
      .onConflictDoNothing();

    res.json({ ok: true });
  }
);

socialMeRouter.delete(
  "/exploration-sharing/:friendId",
  async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const friendId = String(req.params.friendId);

    await db
      .delete(explorationSharing)
      .where(
        and(
          eq(explorationSharing.userId, user.id),
          eq(explorationSharing.friendId, friendId)
        )
      );

    res.json({ ok: true });
  }
);
