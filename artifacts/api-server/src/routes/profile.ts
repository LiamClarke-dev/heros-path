import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { journeysTable, userDiscoveredPlacesTable } from "@workspace/db";
import { eq, and, count, sum } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { getRank } from "./auth";

const router: IRouter = Router();

const XP_PER_LEVEL = 150;

router.get("/profile/stats", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;

  const [journeyCount, totalDist, placesCount, favCount] = await Promise.all([
    db.select({ count: count() }).from(journeysTable).where(eq(journeysTable.userId, user.id)),
    db.select({ total: sum(journeysTable.totalDistanceM) }).from(journeysTable).where(eq(journeysTable.userId, user.id)),
    db.select({ count: count() }).from(userDiscoveredPlacesTable).where(eq(userDiscoveredPlacesTable.userId, user.id)),
    db
      .select({ count: count() })
      .from(userDiscoveredPlacesTable)
      .where(and(eq(userDiscoveredPlacesTable.userId, user.id), eq(userDiscoveredPlacesTable.isFavorited, true))),
  ]);

  const xpToNextLevel = XP_PER_LEVEL * user.level - user.xp;

  res.json({
    totalJourneys: Number(journeyCount[0]?.count ?? 0),
    totalDistanceM: Number(totalDist[0]?.total ?? 0),
    totalPlacesDiscovered: Number(placesCount[0]?.count ?? 0),
    totalFavorited: Number(favCount[0]?.count ?? 0),
    currentStreak: user.streakDays,
    xp: user.xp,
    level: user.level,
    rank: getRank(user.xp),
    xpToNextLevel: Math.max(0, xpToNextLevel),
  });
});

export default router;
