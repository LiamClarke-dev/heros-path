import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { journeysTable, journeyWaypointsTable, userDiscoveredPlacesTable } from "@workspace/db";
import { eq, and, count, sum, isNotNull } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { getRank } from "./auth";
import { computeLevel } from "./journeys";

const router: IRouter = Router();

router.get("/profile/stats", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;

  const [journeyCount, totalDist, placesCount, favCount, waypointCount] = await Promise.all([
    db.select({ count: count() }).from(journeysTable).where(and(eq(journeysTable.userId, user.id), isNotNull(journeysTable.endedAt))),
    db.select({ total: sum(journeysTable.totalDistanceM) }).from(journeysTable).where(and(eq(journeysTable.userId, user.id), isNotNull(journeysTable.endedAt))),
    db.select({ count: count() }).from(userDiscoveredPlacesTable).where(eq(userDiscoveredPlacesTable.userId, user.id)),
    db
      .select({ count: count() })
      .from(userDiscoveredPlacesTable)
      .where(and(eq(userDiscoveredPlacesTable.userId, user.id), eq(userDiscoveredPlacesTable.isFavorited, true))),
    // Total waypoints across all completed journeys ≈ streets explored
    db
      .select({ count: count() })
      .from(journeyWaypointsTable)
      .innerJoin(journeysTable, eq(journeyWaypointsTable.journeyId, journeysTable.id))
      .where(and(eq(journeysTable.userId, user.id), isNotNull(journeysTable.endedAt))),
  ]);

  const xp = user.xp;
  const level = computeLevel(xp);
  // XP required to reach next level vs current level (based on computeLevel formula: level = floor(sqrt(xp/100))+1)
  // Level n requires (n-1)^2 * 100 XP; next level is (level)^2 * 100
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpToNextLevel = Math.max(0, xpForNextLevel - xp);
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpLevelRange = xpForNextLevel - xpForCurrentLevel;
  const levelProgress = xpLevelRange > 0 ? xpInCurrentLevel / xpLevelRange : 1;

  res.json({
    totalJourneys: Number(journeyCount[0]?.count ?? 0),
    totalDistanceM: Number(totalDist[0]?.total ?? 0),
    totalPlacesDiscovered: Number(placesCount[0]?.count ?? 0),
    totalFavorited: Number(favCount[0]?.count ?? 0),
    totalStreetsExplored: Number(waypointCount[0]?.count ?? 0),
    currentStreak: user.streakDays,
    xp,
    level,
    rank: getRank(xp),
    xpToNextLevel,
    levelProgress: Math.min(1, Math.max(0, levelProgress)),
  });
});

export default router;
