import { Router, type Request, type Response } from "express";
import { db, userBadges, userQuests, users, journeys, journeyWaypoints, userDiscoveredPlaces, suburbCompletions } from "@workspace/db";
import { eq, and, isNotNull, count, sql, sum, max } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import {
  BADGE_DEFINITIONS,
  QUEST_DEFINITIONS,
  computeLevel,
  rankName,
  xpForCurrentLevel,
  xpForNextLevel,
} from "../lib/gamification.js";

const router = Router();

// GET /api/quests
router.get("/quests", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const rows = await db
    .select()
    .from(userQuests)
    .where(eq(userQuests.userId, user.id));

  const rowMap = new Map(rows.map((r) => [r.questKey, r]));

  const active = [];
  const completed = [];

  for (const def of QUEST_DEFINITIONS) {
    const row = rowMap.get(def.key);
    const progress = row?.progress ?? 0;
    const isCompleted = row?.completedAt != null;
    const item = {
      key: def.key,
      title: def.title,
      description: def.description,
      xpReward: def.xpReward,
      progress,
      target: def.target,
      isCompleted,
      completedAt: row?.completedAt ?? null,
    };
    if (isCompleted) {
      completed.push(item);
    } else {
      active.push(item);
    }
  }

  res.json({ active, completed });
});

// GET /api/badges
router.get("/badges", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  // Fetch earned badges, user stats, and journey data in parallel
  const [
    badgeRows,
    [dbUser],
    [journeyCountRow],
    [placeCountRow],
    allWaypoints,
    [maxPingRow],
    [suburbCountRow],
  ] = await Promise.all([
    db.select().from(userBadges).where(eq(userBadges.userId, user.id)),
    db.select().from(users).where(eq(users.id, user.id)),
    db.select({ c: count() }).from(journeys).where(and(eq(journeys.userId, user.id), isNotNull(journeys.endedAt))),
    db.select({ c: count() }).from(userDiscoveredPlaces).where(eq(userDiscoveredPlaces.userId, user.id)),
    db.select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
      .from(journeyWaypoints)
      .innerJoin(journeys, eq(journeyWaypoints.journeyId, journeys.id))
      .where(eq(journeys.userId, user.id)),
    db.select({ maxPing: max(journeys.pingCount) })
      .from(journeys)
      .where(and(eq(journeys.userId, user.id), isNotNull(journeys.endedAt))),
    db.select({ c: count() }).from(suburbCompletions).where(eq(suburbCompletions.userId, user.id)),
  ]);

  const earnedMap = new Map(badgeRows.map((r) => [r.badgeKey, r.earnedAt]));

  // Compute cell-based stats
  const CELL = 0.0005;
  const AREA = 0.1;
  const cellSet = new Set<string>();
  const areaSet = new Set<string>();
  for (const wp of allWaypoints) {
    const lat = parseFloat(String(wp.lat));
    const lng = parseFloat(String(wp.lng));
    const cLat = Math.floor(lat / CELL) * CELL;
    const cLng = Math.floor(lng / CELL) * CELL;
    cellSet.add(`${cLat.toFixed(4)},${cLng.toFixed(4)}`);
    const aLat = Math.floor(lat / AREA) * AREA;
    const aLng = Math.floor(lng / AREA) * AREA;
    areaSet.add(`${aLat.toFixed(1)},${aLng.toFixed(1)}`);
  }

  const totalNewCells = cellSet.size;
  const totalPlaces = Number(placeCountRow?.c ?? 0);
  const totalJourneys = Number(journeyCountRow?.c ?? 0);
  const currentStreak = dbUser?.streakDays ?? 0;
  const maxPingCount = Number(maxPingRow?.maxPing ?? 0);
  const distinctAreas = areaSet.size;
  const suburbCount = Number(suburbCountRow?.c ?? 0);

  // Badge progress values: progress value + target (null if no progress tracking)
  const badgeProgress: Record<string, { progress: number; target: number } | null> = {
    first_journey:        { progress: Math.min(totalJourneys, 1), target: 1 },
    streets_10:           { progress: totalNewCells, target: 10 },
    streets_50:           { progress: totalNewCells, target: 50 },
    streets_200:          { progress: totalNewCells, target: 200 },
    discovery_first:      { progress: Math.min(totalPlaces, 1), target: 1 },
    discovery_10:         { progress: totalPlaces, target: 10 },
    discovery_50:         { progress: totalPlaces, target: 50 },
    night_explorer:       null,
    streak_3:             { progress: currentStreak, target: 3 },
    streak_7:             { progress: currentStreak, target: 7 },
    streak_30:            { progress: currentStreak, target: 30 },
    ping_master:          { progress: maxPingCount, target: 5 },
    globe_trotter:        { progress: distinctAreas, target: 3 },
    suburb_local:         { progress: Math.min(suburbCount, 1), target: 1 },
    suburb_cartographer:  { progress: suburbCount, target: 5 },
    suburb_master:        { progress: suburbCount, target: 20 },
  };

  const earned = [];
  const available = [];

  for (const def of BADGE_DEFINITIONS) {
    const prog = badgeProgress[def.key] ?? null;
    if (earnedMap.has(def.key)) {
      earned.push({
        key: def.key,
        name: def.name,
        description: def.description,
        icon: def.icon,
        earnedAt: earnedMap.get(def.key),
        progress: prog,
      });
    } else {
      available.push({
        key: def.key,
        name: def.name,
        description: def.description,
        icon: def.icon,
        earnedAt: null,
        progress: prog,
      });
    }
  }

  res.json({ earned, available });
});

// GET /api/me/stats — summary for profile screen (fresh DB read)
router.get("/me/stats", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const [[dbUser], [journeyCountRow], [placeCountRow], cellsResult, [distanceRow], [suburbCountRow]] =
    await Promise.all([
      db.select().from(users).where(eq(users.id, user.id)),
      db
        .select({ c: count() })
        .from(journeys)
        .where(and(eq(journeys.userId, user.id), isNotNull(journeys.endedAt))),
      db
        .select({ c: count() })
        .from(userDiscoveredPlaces)
        .where(eq(userDiscoveredPlaces.userId, user.id)),
      db
        .select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
        .from(journeyWaypoints)
        .innerJoin(journeys, eq(journeyWaypoints.journeyId, journeys.id))
        .where(eq(journeys.userId, user.id)),
      db
        .select({ total: sum(journeys.totalDistanceM) })
        .from(journeys)
        .where(and(eq(journeys.userId, user.id), isNotNull(journeys.endedAt))),
      db
        .select({ c: count() })
        .from(suburbCompletions)
        .where(eq(suburbCompletions.userId, user.id)),
    ]);

  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const CELL = 0.0005;
  const cellSet = new Set<string>();
  for (const wp of cellsResult) {
    const cLat = Math.floor(parseFloat(String(wp.lat)) / CELL) * CELL;
    const cLng = Math.floor(parseFloat(String(wp.lng)) / CELL) * CELL;
    cellSet.add(`${cLat.toFixed(4)},${cLng.toFixed(4)}`);
  }

  const xp = dbUser.xp ?? 0;
  const level = computeLevel(xp);

  const streak = dbUser.streakDays ?? 0;
  const cells = cellSet.size;
  res.json({
    xp,
    level,
    rankName: rankName(level),
    // A6 field names (kept for backward compatibility)
    streakDays: streak,
    totalStreetsWalked: cells,
    displayName: dbUser.displayName,
    email: dbUser.email ?? null,
    profileImageUrl: dbUser.profileImageUrl ?? null,
    xpCurrentLevel: xpForCurrentLevel(level),
    xpNextLevel: xpForNextLevel(level),
    totalJourneys: Number(journeyCountRow?.c ?? 0),
    totalPlaces: Number(placeCountRow?.c ?? 0),
    totalDistanceM: distanceRow?.total != null ? Math.round(Number(distanceRow.total)) : 0,
    joinedAt: dbUser.createdAt ?? null,
    // A7 contract field names
    currentStreak: streak,
    longestStreak: streak,
    totalNewCells: cells,
    suburbsCompleted: Number(suburbCountRow?.c ?? 0),
  });
});

export default router;
