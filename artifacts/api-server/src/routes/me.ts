import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { userPreferencesTable, userBadgesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { getRank } from "./auth";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  res.json({
    id: user.id,
    googleId: user.googleId,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    email: user.email,
    xp: user.xp,
    level: user.level,
    rank: getRank(user.xp),
    streakDays: user.streakDays,
    createdAt: user.createdAt,
  });
});

router.get("/me/preferences", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const prefs = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, user.id))
    .limit(1);

  if (!prefs.length) {
    res.json({ placeTypes: [], minRating: 0 });
    return;
  }

  // numeric columns return as strings from Postgres — parse to float for the client
  res.json({ placeTypes: prefs[0].placeTypes, minRating: parseFloat(String(prefs[0].minRating)) });
});

router.put("/me/preferences", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { placeTypes, minRating } = req.body as { placeTypes?: string[]; minRating?: number };

  // Validate minRating bounds: must be between 0 and 5, increments of 0.5
  const validRating = minRating != null ? Math.round(Math.min(5, Math.max(0, minRating)) * 2) / 2 : undefined;

  const existing = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, user.id))
    .limit(1);

  if (existing.length) {
    const updated = await db
      .update(userPreferencesTable)
      .set({
        placeTypes: placeTypes ?? existing[0].placeTypes,
        minRating: validRating != null ? String(validRating) : existing[0].minRating,
        updatedAt: new Date(),
      })
      .where(eq(userPreferencesTable.userId, user.id))
      .returning();
    res.json({ placeTypes: updated[0].placeTypes, minRating: parseFloat(String(updated[0].minRating)) });
  } else {
    const created = await db
      .insert(userPreferencesTable)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        placeTypes: placeTypes ?? [],
        minRating: String(validRating ?? 0),
      })
      .returning();
    res.json({ placeTypes: created[0].placeTypes, minRating: parseFloat(String(created[0].minRating)) });
  }
});

router.get("/me/badges", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const earned = await db
    .select()
    .from(userBadgesTable)
    .where(eq(userBadgesTable.userId, user.id));

  const earnedKeys = new Set(earned.map((b) => b.badgeKey));

  const allBadges = [
    { key: "first_journey", name: "First Steps", description: "Complete your first journey", iconName: "map" },
    { key: "streets_10", name: "Street Walker", description: "Walk 10 new streets", iconName: "road" },
    { key: "streets_50", name: "City Explorer", description: "Walk 50 new streets", iconName: "city" },
    { key: "discovery_first", name: "The Discoverer", description: "Find your first place", iconName: "search" },
    { key: "discovery_10", name: "Place Hunter", description: "Discover 10 places", iconName: "location-pin" },
    { key: "night_explorer", name: "Night Owl", description: "Complete a journey after 9 PM", iconName: "nightlife" },
    { key: "streak_3", name: "Consistent", description: "Journey 3 days in a row", iconName: "repeat" },
    { key: "streak_7", name: "Devoted", description: "Journey 7 days in a row", iconName: "star" },
    { key: "ping_master", name: "Ping Master", description: "Use ping 5 times in one journey", iconName: "notifications" },
  ];

  res.json({
    badges: allBadges.map((b) => ({
      ...b,
      isEarned: earnedKeys.has(b.key),
      earnedAt: earned.find((e) => e.badgeKey === b.key)?.earnedAt ?? null,
    })),
  });
});

export default router;
