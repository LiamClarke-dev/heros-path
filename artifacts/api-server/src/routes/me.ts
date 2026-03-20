import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { userPreferencesTable, userBadgesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { getRank } from "./auth";
import { BADGE_DEFINITIONS } from "./journeys";

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

  res.json({
    badges: BADGE_DEFINITIONS.map((b) => ({
      ...b,
      isEarned: earnedKeys.has(b.key),
      earnedAt: earned.find((e) => e.badgeKey === b.key)?.earnedAt ?? null,
    })),
  });
});

export default router;
