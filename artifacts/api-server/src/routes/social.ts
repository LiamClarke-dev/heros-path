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

  let friendUserId: string;
  try {
    friendUserId = await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(friendInviteCodes)
        .set({ usedBy: user.id, usedAt: new Date() })
        .where(
          and(
            eq(friendInviteCodes.id, invite.id),
            sql`${friendInviteCodes.usedAt} IS NULL`,
            sql`${friendInviteCodes.expiresAt} > now()`
          )
        )
        .returning({ id: friendInviteCodes.id, userId: friendInviteCodes.userId });

      if (!claimed) {
        throw new Error("CODE_INVALID");
      }

      const [lo, hi] = sortPair(invite.userId, user.id);

      const existing = await tx
        .select({ status: friendships.status })
        .from(friendships)
        .where(and(eq(friendships.requesterId, lo), eq(friendships.addresseeId, hi)));

      if (existing.length > 0 && existing[0].status === "accepted") {
        throw new Error("ALREADY_FRIENDS");
      }
      if (existing.length > 0 && existing[0].status === "blocked") {
        throw new Error("BLOCKED");
      }

      if (existing.length > 0) {
        await tx
          .update(friendships)
          .set({ status: "accepted", updatedAt: new Date() })
          .where(and(eq(friendships.requesterId, lo), eq(friendships.addresseeId, hi)));
      } else {
        await tx.insert(friendships).values({
          id: crypto.randomUUID(),
          requesterId: lo,
          addresseeId: hi,
          status: "accepted",
          updatedAt: new Date(),
        });
      }

      return invite.userId;
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "CODE_INVALID") {
      res.status(400).json({ error: "Code expired or already used" });
    } else if (msg === "ALREADY_FRIENDS") {
      res.status(400).json({ error: "Already friends" });
    } else if (msg === "BLOCKED") {
      res.status(403).json({ error: "Cannot connect with this user" });
    } else {
      logger.error({ err }, "join code error");
      res.status(500).json({ error: "Internal error" });
    }
    return;
  }

  const [friend] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl,
    })
    .from(users)
    .where(eq(users.id, friendUserId));

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

    await tx
      .delete(listCollaborators)
      .where(
        or(
          and(
            sql`${listCollaborators.userId} = ${user.id}`,
            sql`${listCollaborators.listId} IN (SELECT id FROM place_lists WHERE user_id = ${friendId})`
          ),
          and(
            sql`${listCollaborators.userId} = ${friendId}`,
            sql`${listCollaborators.listId} IN (SELECT id FROM place_lists WHERE user_id = ${user.id})`
          )
        )
      );
  });

  res.json({ ok: true });
});

friendsRouter.post("/:friendId/block", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const friendId = String(req.params.friendId);
  const [lo, hi] = sortPair(user.id, friendId);

  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(friendships)
      .where(and(eq(friendships.requesterId, lo), eq(friendships.addresseeId, hi)));

    if (existing.length > 0) {
      await tx
        .update(friendships)
        .set({ status: "blocked", updatedAt: new Date() })
        .where(and(eq(friendships.requesterId, lo), eq(friendships.addresseeId, hi)));
    } else {
      await tx.insert(friendships).values({
        id: crypto.randomUUID(),
        requesterId: lo,
        addresseeId: hi,
        status: "blocked",
        updatedAt: new Date(),
      });
    }

    await tx
      .delete(explorationSharing)
      .where(
        or(
          and(eq(explorationSharing.userId, user.id), eq(explorationSharing.friendId, friendId)),
          and(eq(explorationSharing.userId, friendId), eq(explorationSharing.friendId, user.id))
        )
      );

    await tx
      .delete(listShares)
      .where(
        or(
          and(eq(listShares.sharedByUserId, user.id), eq(listShares.sharedWithUserId, friendId)),
          and(eq(listShares.sharedByUserId, friendId), eq(listShares.sharedWithUserId, user.id))
        )
      );

    await tx
      .delete(listCollaborators)
      .where(
        or(
          and(sql`${listCollaborators.userId} = ${user.id}`, sql`${listCollaborators.listId} IN (SELECT id FROM place_lists WHERE user_id = ${friendId})`),
          and(sql`${listCollaborators.userId} = ${friendId}`, sql`${listCollaborators.listId} IN (SELECT id FROM place_lists WHERE user_id = ${user.id})`)
        )
      );
  });

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

    function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const explored: Array<{ lat: number; lng: number }> = [];
    for (const key of exploredSet) {
      const [cLat, cLng] = key.split(",").map(Number);
      const dist = haversineDistance(lat, lng, cLat, cLng);
      if (dist <= clampedRadius * 111000) {
        explored.push({ lat: cLat, lng: cLng });
      }
    }

    const unexplored: Array<{ lat: number; lng: number }> = [];
    const steps = Math.ceil(clampedRadius / CELL);
    for (let i = -steps; i <= steps; i++) {
      for (let j = -steps; j <= steps; j++) {
        const cLat = Math.floor(lat / CELL) * CELL + i * CELL;
        const cLng = Math.floor(lng / CELL) * CELL + j * CELL;
        const key = `${cLat.toFixed(4)},${cLng.toFixed(4)}`;
        if (!exploredSet.has(key)) {
          const dist = haversineDistance(lat, lng, cLat, cLng);
          if (dist <= clampedRadius * 111000) {
            unexplored.push({ lat: cLat, lng: cLng });
          }
        }
      }
    }

    res.json({ explored, unexplored });
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
