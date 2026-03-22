import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, journeysTable, journeyWaypointsTable, userDiscoveredPlacesTable } from "@workspace/db";
import { eq, and, count, sum, isNotNull, sql } from "drizzle-orm";
import { getRank } from "./auth";
import { computeLevel } from "./journeys";

const router: IRouter = Router();

router.get("/profile/stats", async (req: Request, res: Response) => {
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

  const [journeyCount, totalDist, placesCount, favCount, waypointCount, daysActiveResult] = await Promise.all([
    db.select({ count: count() }).from(journeysTable).where(and(eq(journeysTable.userId, user.id), isNotNull(journeysTable.endedAt))),
    db.select({ total: sum(journeysTable.totalDistanceM) }).from(journeysTable).where(and(eq(journeysTable.userId, user.id), isNotNull(journeysTable.endedAt))),
    db.select({ count: count() }).from(userDiscoveredPlacesTable).where(eq(userDiscoveredPlacesTable.userId, user.id)),
    db
      .select({ count: count() })
      .from(userDiscoveredPlacesTable)
      .where(and(eq(userDiscoveredPlacesTable.userId, user.id), eq(userDiscoveredPlacesTable.isFavorited, true))),
    db
      .select({ count: count() })
      .from(journeyWaypointsTable)
      .innerJoin(journeysTable, eq(journeyWaypointsTable.journeyId, journeysTable.id))
      .where(and(eq(journeysTable.userId, user.id), isNotNull(journeysTable.endedAt))),
    db
      .select({ days: sql<number>`count(distinct date(${journeysTable.endedAt} at time zone 'UTC'))` })
      .from(journeysTable)
      .where(and(eq(journeysTable.userId, user.id), isNotNull(journeysTable.endedAt))),
  ]);

  const xp = user.xp;
  const level = computeLevel(xp);
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
    daysActive: Number(daysActiveResult[0]?.days ?? 0),
    currentStreak: user.streakDays,
    xp,
    level,
    rank: getRank(xp),
    xpToNextLevel,
    levelProgress: Math.min(1, Math.max(0, levelProgress)),
  });
});

export default router;
