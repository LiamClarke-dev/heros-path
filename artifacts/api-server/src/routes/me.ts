import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  userPreferencesTable,
  userBadgesTable,
  userDiscoveredPlacesTable,
  journeysTable,
  journeyDiscoveredPlacesTable,
} from "@workspace/db";
import { eq, and, count, isNotNull } from "drizzle-orm";
import { getRank } from "./auth";
import { BADGE_DEFINITIONS } from "./journeys";

const router: IRouter = Router();

async function evaluateAndAwardBadges(userId: string, streakDays: number): Promise<void> {
  const [earnedBadgeRows, journeyCountResult, placeCountResult, pingMaxResult] = await Promise.all([
    db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId)),
    db.select({ count: count() }).from(journeysTable).where(and(eq(journeysTable.userId, userId), isNotNull(journeysTable.endedAt))),
    db.select({ count: count() }).from(userDiscoveredPlacesTable).where(eq(userDiscoveredPlacesTable.userId, userId)),
    db.select({ journeyId: journeyDiscoveredPlacesTable.journeyId, cnt: count() })
      .from(journeyDiscoveredPlacesTable)
      .where(and(eq(journeyDiscoveredPlacesTable.userId, userId), eq(journeyDiscoveredPlacesTable.discoverySource, "ping")))
      .groupBy(journeyDiscoveredPlacesTable.journeyId),
  ]);

  const earnedKeys = new Set(earnedBadgeRows.map((b) => b.badgeKey));
  const totalJourneys = Number(journeyCountResult[0]?.count ?? 0);
  const totalPlaces = Number(placeCountResult[0]?.count ?? 0);
  const maxPingsInJourney = pingMaxResult.reduce((max, r) => Math.max(max, Number(r.cnt)), 0);

  const conditions: Record<string, boolean> = {
    first_journey: totalJourneys >= 1,
    streets_10: false,
    streets_50: false,
    discovery_first: totalPlaces >= 1,
    discovery_10: totalPlaces >= 10,
    night_explorer: false,
    globe_trotter: false,
    streak_3: streakDays >= 3,
    streak_7: streakDays >= 7,
    streak_30: streakDays >= 30,
    ping_master: maxPingsInJourney >= 5,
  };

  for (const [key, unlocked] of Object.entries(conditions)) {
    if (unlocked && !earnedKeys.has(key)) {
      await db.insert(userBadgesTable).values({
        id: crypto.randomUUID(),
        userId,
        badgeKey: key,
      }).catch(() => {});
    }
  }
}

export { evaluateAndAwardBadges };

router.get("/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const authUser = req.user;
  const dbUsers = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id)).limit(1);
  const user = dbUsers[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.profileImageUrl ?? user.avatarUrl,
    email: user.email,
    xp: user.xp,
    level: user.level,
    rank: getRank(user.xp),
    streakDays: user.streakDays,
    createdAt: user.createdAt,
  });
});

router.get("/me/preferences", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const authUser = req.user;
  const prefs = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, authUser.id))
    .limit(1);

  if (!prefs.length) {
    res.json({ placeTypes: [], minRating: 0 });
    return;
  }

  res.json({ placeTypes: prefs[0].placeTypes, minRating: parseFloat(String(prefs[0].minRating)) });
});

router.put("/me/preferences", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const authUser = req.user;
  const { placeTypes, minRating } = req.body as { placeTypes?: string[]; minRating?: number };

  const validRating = minRating != null ? Math.round(Math.min(5, Math.max(0, minRating)) * 2) / 2 : undefined;

  const existing = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, authUser.id))
    .limit(1);

  if (existing.length) {
    const updated = await db
      .update(userPreferencesTable)
      .set({
        placeTypes: placeTypes ?? existing[0].placeTypes,
        minRating: validRating != null ? String(validRating) : existing[0].minRating,
        updatedAt: new Date(),
      })
      .where(eq(userPreferencesTable.userId, authUser.id))
      .returning();
    res.json({ placeTypes: updated[0].placeTypes, minRating: parseFloat(String(updated[0].minRating)) });
  } else {
    const created = await db
      .insert(userPreferencesTable)
      .values({
        id: crypto.randomUUID(),
        userId: authUser.id,
        placeTypes: placeTypes ?? [],
        minRating: String(validRating ?? 0),
      })
      .returning();
    res.json({ placeTypes: created[0].placeTypes, minRating: parseFloat(String(created[0].minRating)) });
  }
});

router.get("/me/badges", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const authUser = req.user;
  const dbUsers = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id)).limit(1);
  const user = dbUsers[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await evaluateAndAwardBadges(user.id, user.streakDays).catch((err) =>
    console.error("badge evaluation on profile load failed", err),
  );

  const earned = await db
    .select()
    .from(userBadgesTable)
    .where(eq(userBadgesTable.userId, user.id));

  const earnedKeys = new Set(earned.map((b) => b.badgeKey));

  res.json({
    badges: BADGE_DEFINITIONS.map((b) => ({
      ...b,
      isEarned: earnedKeys.has(b.key),
      earnedAt: earned.find((e) => e.badgeKey === b.key)?.earnedAt ?? null,
    })),
  });
});

export default router;
