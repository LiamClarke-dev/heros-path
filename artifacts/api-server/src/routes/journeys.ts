import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  journeysTable,
  journeyWaypointsTable,
  journeyDiscoveredPlacesTable,
  userDiscoveredPlacesTable,
  placeCacheTable,
  userPreferencesTable,
  userBadgesTable,
  userQuestsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, count, desc, isNotNull, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function buildPhotoUrl(photoReference: string | null, apiKey: string): string | null {
  if (!photoReference || !apiKey) return null;
  if (photoReference.includes("/")) {
    return `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=400&key=${apiKey}`;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${encodeURIComponent(photoReference)}&key=${apiKey}`;
}

// ─── Gamification helpers ────────────────────────────────────────────────────

export function computeLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC
}

const BADGE_DEFINITIONS: Array<{
  key: string;
  name: string;
  description: string;
  iconName: string;
}> = [
  { key: "first_journey", name: "First Steps", description: "Complete your first journey", iconName: "map" },
  { key: "streets_10", name: "Street Walker", description: "Walk 10 new streets", iconName: "activity" },
  { key: "streets_50", name: "City Explorer", description: "Walk 50 new streets", iconName: "map-pin" },
  { key: "discovery_first", name: "The Discoverer", description: "Find your first place", iconName: "search" },
  { key: "discovery_10", name: "Place Hunter", description: "Discover 10 places", iconName: "star" },
  { key: "night_explorer", name: "Night Owl", description: "Complete a journey after 9 PM", iconName: "moon" },
  { key: "globe_trotter", name: "Globe Trotter", description: "Journey in 3 different areas", iconName: "globe" },
  { key: "streak_3", name: "Consistent", description: "Journey 3 days in a row", iconName: "trending-up" },
  { key: "streak_7", name: "Devoted", description: "Journey 7 days in a row", iconName: "award" },
  { key: "streak_30", name: "Legend Streak", description: "Journey 30 days in a row", iconName: "zap" },
  { key: "ping_master", name: "Ping Master", description: "Use ping 5 times in one journey", iconName: "radio" },
];

export { BADGE_DEFINITIONS };

// Quest definitions shared with quests.ts
export const QUEST_DEFINITIONS = [
  {
    key: "first_journey",
    title: "The First Step",
    description: "Complete your first journey",
    xpReward: 50,
    target: 1,
    type: "total",
    metric: "journeys",
  },
  {
    key: "discover_3_places",
    title: "Curious Explorer",
    description: "Discover 3 new places",
    xpReward: 75,
    target: 3,
    type: "weekly",
    metric: "places",
  },
  {
    key: "discover_place_rated",
    title: "High Standards",
    description: "Discover a place rated 4.5 or above",
    xpReward: 60,
    target: 1,
    type: "weekly",
    metric: "rated_place",
  },
  {
    key: "walk_5_journeys",
    title: "Regular Adventurer",
    description: "Go on 5 journeys",
    xpReward: 100,
    target: 5,
    type: "total",
    metric: "journeys",
  },
  {
    key: "new_streets_3",
    title: "Street Trailblazer",
    description: "Walk 3 new streets in a single journey",
    xpReward: 80,
    target: 3,
    type: "weekly",
    metric: "new_streets_per_journey",
  },
  {
    key: "ping_3_times",
    title: "The Seeker",
    description: "Use the ping feature 3 times",
    xpReward: 60,
    target: 3,
    type: "weekly",
    metric: "pings",
  },
  {
    key: "favorite_5_places",
    title: "Connoisseur",
    description: "Favorite 5 places",
    xpReward: 80,
    target: 5,
    type: "total",
    metric: "favorites",
  },
  {
    key: "streak_3_days",
    title: "Three Peat",
    description: "Journey 3 days in a row",
    xpReward: 90,
    target: 3,
    type: "total",
    metric: "streak",
  },
  {
    key: "night_journey",
    title: "Creature of the Night",
    description: "Complete a journey after 9 PM",
    xpReward: 70,
    target: 1,
    type: "total",
    metric: "night_journey",
  },
];

interface GamificationResult {
  xpGained: number;
  newLevel: number;
  newBadges: Array<{ key: string; name: string; description: string }>;
  completedQuests: Array<{ key: string; title: string; xpReward: number }>;
  newStreak: number;
}

async function awardJourneyGamification(
  userId: string,
  journeyId: string,
  newWaypointCount: number,
  pingCountThisJourney: number,
): Promise<GamificationResult> {
  const now = new Date();
  const todayStr = todayDateString();
  const isNight = now.getHours() >= 21;

  // Fetch current user state
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) return { xpGained: 0, newLevel: 1, newBadges: [], completedQuests: [], newStreak: 0 };

  // Count new places discovered in this journey (net-new to this user)
  const journeyPlaces = await db
    .select({ googlePlaceId: journeyDiscoveredPlacesTable.googlePlaceId })
    .from(journeyDiscoveredPlacesTable)
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));

  const placeIds = journeyPlaces.map((p) => p.googlePlaceId);

  // Check which places discovered in this journey were net-new (firstDiscoveredAt matches this journey)
  const userPlaceStates =
    placeIds.length > 0
      ? await db
          .select({
            googlePlaceId: userDiscoveredPlacesTable.googlePlaceId,
            discoveryCount: userDiscoveredPlacesTable.discoveryCount,
            firstDiscoveredAt: userDiscoveredPlacesTable.firstDiscoveredAt,
          })
          .from(userDiscoveredPlacesTable)
          .where(
            and(
              eq(userDiscoveredPlacesTable.userId, userId),
              inArray(userDiscoveredPlacesTable.googlePlaceId, placeIds),
            ),
          )
      : [];

  const newPlacesCount = userPlaceStates.filter((p) => p.discoveryCount === 1).length;

  // Check for highly-rated places (for quest)
  let hasHighRatedPlace = false;
  if (placeIds.length > 0) {
    const ratedPlaces = await db
      .select({ rating: placeCacheTable.rating })
      .from(placeCacheTable)
      .where(inArray(placeCacheTable.googlePlaceId, placeIds));
    hasHighRatedPlace = ratedPlaces.some((p) => p.rating && Number(p.rating) >= 4.5);
  }

  // XP computation: +10 per new street (waypoint ~= street), +3 per revisit (approximate)
  // We use waypoints as street proxy: new journey = all waypoints are "new" segments
  const newStreetXp = newWaypointCount * 10;
  const newPlaceXp = newPlacesCount * 25;
  let xpGained = newStreetXp + newPlaceXp;

  // Streak tracking
  const lastJourneyDate = user.lastJourneyDate as string | null;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let newStreak = 1;
  if (lastJourneyDate === todayStr) {
    newStreak = user.streakDays; // same day - no change
  } else if (lastJourneyDate === yesterday) {
    newStreak = user.streakDays + 1; // consecutive
  } else {
    newStreak = 1; // streak broken
  }

  // Count total journeys for this user
  const journeyCountResult = await db
    .select({ count: count() })
    .from(journeysTable)
    .where(and(eq(journeysTable.userId, userId), isNotNull(journeysTable.endedAt)));
  const totalJourneys = Number(journeyCountResult[0]?.count ?? 0);

  // Total places discovered
  const totalPlacesResult = await db
    .select({ count: count() })
    .from(userDiscoveredPlacesTable)
    .where(eq(userDiscoveredPlacesTable.userId, userId));
  const totalPlaces = Number(totalPlacesResult[0]?.count ?? 0);

  // Total favorited
  const totalFavoritedResult = await db
    .select({ count: count() })
    .from(userDiscoveredPlacesTable)
    .where(and(eq(userDiscoveredPlacesTable.userId, userId), eq(userDiscoveredPlacesTable.isFavorited, true)));
  const totalFavorited = Number(totalFavoritedResult[0]?.count ?? 0);

  // Get total pings ever used (approximated from userDiscoveredPlacesTable ping source)
  const pingSourceResult = await db
    .select({ count: count() })
    .from(journeyDiscoveredPlacesTable)
    .where(
      and(
        eq(journeyDiscoveredPlacesTable.userId, userId),
        sql`${journeyDiscoveredPlacesTable.discoverySource} = 'ping'`,
      ),
    );
  const totalPingDiscoveries = Number(pingSourceResult[0]?.count ?? 0);

  // Evaluate and update quest progress
  const userQuests = await db.select().from(userQuestsTable).where(eq(userQuestsTable.userId, userId));
  const questMap = new Map(userQuests.map((q) => [q.questKey, q]));

  const completedQuests: Array<{ key: string; title: string; xpReward: number }> = [];

  for (const def of QUEST_DEFINITIONS) {
    let userQuest = questMap.get(def.key);

    // Auto-create quest if not present
    if (!userQuest) {
      const expiresAt = def.type === "weekly" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;
      const newRows = await db
        .insert(userQuestsTable)
        .values({
          id: crypto.randomUUID(),
          userId,
          questKey: def.key,
          expiresAt,
          progressJson: { current: 0 },
        })
        .returning();
      userQuest = newRows[0];
    }

    if (userQuest.completedAt) continue; // already done

    // Check if weekly quest has expired — reset it
    if (def.type === "weekly" && userQuest.expiresAt && userQuest.expiresAt < now) {
      const newRows = await db
        .insert(userQuestsTable)
        .values({
          id: crypto.randomUUID(),
          userId,
          questKey: def.key,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          progressJson: { current: 0 },
        })
        .returning();
      userQuest = newRows[0];
    }

    const current = (userQuest.progressJson as { current?: number })?.current ?? 0;
    let newProgress = current;

    switch (def.metric) {
      case "journeys":
        newProgress = totalJourneys;
        break;
      case "places":
        newProgress = totalPlaces;
        break;
      case "rated_place":
        if (hasHighRatedPlace) newProgress = Math.max(newProgress, 1);
        break;
      case "new_streets_per_journey":
        newProgress = Math.max(newProgress, newWaypointCount);
        break;
      case "pings":
        newProgress = Math.max(newProgress, pingCountThisJourney);
        break;
      case "favorites":
        newProgress = totalFavorited;
        break;
      case "streak":
        newProgress = newStreak;
        break;
      case "night_journey":
        if (isNight) newProgress = 1;
        break;
    }

    newProgress = Math.min(newProgress, def.target);

    const isNowComplete = newProgress >= def.target;
    if (isNowComplete && !userQuest.completedAt) {
      xpGained += def.xpReward;
      completedQuests.push({ key: def.key, title: def.title, xpReward: def.xpReward });
    }

    await db
      .update(userQuestsTable)
      .set({
        progressJson: { current: newProgress },
        completedAt: isNowComplete ? now : null,
      })
      .where(eq(userQuestsTable.id, userQuest.id));
  }

  // Badge checking
  const earnedBadgeRows = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId));
  const earnedBadgeKeys = new Set(earnedBadgeRows.map((b) => b.badgeKey));

  const newBadges: Array<{ key: string; name: string; description: string }> = [];

  async function awardBadge(key: string) {
    if (!earnedBadgeKeys.has(key)) {
      await db.insert(userBadgesTable).values({ id: crypto.randomUUID(), userId, badgeKey: key });
      earnedBadgeKeys.add(key);
      const def = BADGE_DEFINITIONS.find((b) => b.key === key);
      if (def) newBadges.push({ key: def.key, name: def.name, description: def.description });
      xpGained += 30; // bonus XP per badge earned
    }
  }

  if (totalJourneys >= 1) await awardBadge("first_journey");
  if (newWaypointCount >= 10 || (user.streakDays > 0 && totalJourneys > 3)) {
    // Track total waypoints for streets badges
    const totalWaypointResult = await db
      .select({ count: count() })
      .from(journeyWaypointsTable)
      .where(
        sql`${journeyWaypointsTable.journeyId} IN (SELECT id FROM journeys WHERE user_id = ${userId})`,
      );
    const totalWaypoints = Number(totalWaypointResult[0]?.count ?? 0);
    if (totalWaypoints >= 10) await awardBadge("streets_10");
    if (totalWaypoints >= 50) await awardBadge("streets_50");
  }
  if (totalPlaces >= 1) await awardBadge("discovery_first");
  if (totalPlaces >= 10) await awardBadge("discovery_10");
  if (isNight) await awardBadge("night_explorer");
  if (newStreak >= 3) await awardBadge("streak_3");
  if (newStreak >= 7) await awardBadge("streak_7");
  if (newStreak >= 30) await awardBadge("streak_30");
  if (pingCountThisJourney >= 5) await awardBadge("ping_master");

  // Globe trotter: check if user has journeys in 3 distinct geographic areas (1-degree grid squares)
  const allJourneyWaypoints = await db
    .select({ lat: journeyWaypointsTable.lat, lng: journeyWaypointsTable.lng })
    .from(journeyWaypointsTable)
    .innerJoin(journeysTable, eq(journeyWaypointsTable.journeyId, journeysTable.id))
    .where(and(eq(journeysTable.userId, userId), isNotNull(journeysTable.endedAt)))
    .limit(500);

  const gridSquares = new Set(
    allJourneyWaypoints.map((w) => `${Math.floor(Number(w.lat))},${Math.floor(Number(w.lng))}`),
  );
  if (gridSquares.size >= 3) await awardBadge("globe_trotter");

  // Compute new XP and level
  const newXp = user.xp + xpGained;
  const newLevel = computeLevel(newXp);

  // Update user record
  await db
    .update(usersTable)
    .set({
      xp: newXp,
      level: newLevel,
      streakDays: newStreak,
      lastJourneyDate: todayStr,
      updatedAt: now,
    })
    .where(eq(usersTable.id, userId));

  return { xpGained, newLevel, newBadges, completedQuests, newStreak };
}

// ─── POST /journeys ─────────────────────────────────────────────────────────

router.post("/journeys", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { isDevSimulated = false } = req.body as { isDevSimulated?: boolean };

  const journey = await db
    .insert(journeysTable)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      isDevSimulated,
    })
    .returning();

  res.status(201).json({ ...journey[0], placeCount: 0 });
});

// ─── GET /journeys ───────────────────────────────────────────────────────────

router.get("/journeys", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const journeys = await db
    .select()
    .from(journeysTable)
    .where(eq(journeysTable.userId, user.id))
    .orderBy(desc(journeysTable.startedAt))
    .limit(limit)
    .offset(offset);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  const journeysWithCount = await Promise.all(
    journeys.map(async (j) => {
      const placeCountResult = await db
        .select({ count: count() })
        .from(journeyDiscoveredPlacesTable)
        .where(eq(journeyDiscoveredPlacesTable.journeyId, j.id));

      let staticMapUrl: string | null = null;
      if (j.polylineEncoded && apiKey) {
        const styles = [
          "feature:all|element:geometry|color:0x1A1510",
          "feature:all|element:labels.text.fill|color:0xA08060",
          "feature:road|element:geometry|color:0x3A2E20",
          "feature:road.highway|element:geometry|color:0x4A3C28",
          "feature:water|element:geometry|color:0x0A0E14",
          "feature:poi|visibility:off",
          "feature:transit|visibility:off",
        ];
        const styleParams = styles.map((s) => `style=${encodeURIComponent(s)}`).join("&");
        const pathParam = `path=color:0xD4A017ff|weight:3|enc:${encodeURIComponent(j.polylineEncoded)}`;
        staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&${pathParam}&${styleParams}&key=${apiKey}`;
      }

      return {
        ...j,
        placeCount: placeCountResult[0]?.count ?? 0,
        staticMapUrl,
        totalDistanceM: j.totalDistanceM ? Number(j.totalDistanceM) : null,
      };
    }),
  );

  res.json({ journeys: journeysWithCount, total: journeysWithCount.length });
});

// ─── GET /journeys/history (historical polylines for map overlay) ─────────────

router.get("/journeys/history", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;

  const completed = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.userId, user.id), isNotNull(journeysTable.endedAt)))
    .orderBy(desc(journeysTable.startedAt))
    .limit(20);

  const journeyData = await Promise.all(
    completed.map(async (j) => {
      const waypoints = await db
        .select({ lat: journeyWaypointsTable.lat, lng: journeyWaypointsTable.lng })
        .from(journeyWaypointsTable)
        .where(eq(journeyWaypointsTable.journeyId, j.id))
        .orderBy(journeyWaypointsTable.recordedAt);

      // Sample every 3rd waypoint to reduce payload size
      const sampled = waypoints.filter((_, i) => i % 3 === 0);

      return {
        id: j.id,
        startedAt: j.startedAt,
        waypoints: sampled.map((w) => ({ lat: Number(w.lat), lng: Number(w.lng) })),
      };
    }),
  );

  res.json({ journeys: journeyData.filter((j) => j.waypoints.length > 1) });
});

// ─── GET /journeys/:journeyId ────────────────────────────────────────────────

router.get("/journeys/:journeyId", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { journeyId } = req.params;

  const journeys = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.id, journeyId), eq(journeysTable.userId, user.id)))
    .limit(1);

  if (!journeys.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const waypoints = await db
    .select()
    .from(journeyWaypointsTable)
    .where(eq(journeyWaypointsTable.journeyId, journeyId))
    .orderBy(journeyWaypointsTable.recordedAt);

  const placeCountResult = await db
    .select({ count: count() })
    .from(journeyDiscoveredPlacesTable)
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));

  const journey = { ...journeys[0], placeCount: placeCountResult[0]?.count ?? 0 };

  res.json({
    journey,
    waypoints: waypoints.map((w) => ({
      id: w.id,
      lat: Number(w.lat),
      lng: Number(w.lng),
      recordedAt: w.recordedAt,
    })),
  });
});

// ─── PATCH /journeys/:journeyId ──────────────────────────────────────────────

router.patch("/journeys/:journeyId", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { journeyId } = req.params;
  const { waypoints, status } = req.body as {
    waypoints?: Array<{ lat: number; lng: number; recordedAt?: string }>;
    status?: "active" | "ended";
  };

  const existing = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.id, journeyId), eq(journeysTable.userId, user.id)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (waypoints?.length) {
    await db.insert(journeyWaypointsTable).values(
      waypoints.map((w) => ({
        id: crypto.randomUUID(),
        journeyId,
        lat: w.lat.toString(),
        lng: w.lng.toString(),
        recordedAt: w.recordedAt ? new Date(w.recordedAt) : new Date(),
      })),
    );
  }

  type JourneyUpdate = {
    endedAt?: Date;
    totalDistanceM?: string;
    polylineEncoded?: string;
  };
  const updates: JourneyUpdate = {};

  if (status === "ended") {
    updates.endedAt = new Date();

    const allWaypoints = await db
      .select()
      .from(journeyWaypointsTable)
      .where(eq(journeyWaypointsTable.journeyId, journeyId))
      .orderBy(journeyWaypointsTable.recordedAt);

    if (allWaypoints.length > 1) {
      let totalDist = 0;
      for (let i = 1; i < allWaypoints.length; i++) {
        totalDist += haversineDistance(
          Number(allWaypoints[i - 1].lat),
          Number(allWaypoints[i - 1].lng),
          Number(allWaypoints[i].lat),
          Number(allWaypoints[i].lng),
        );
      }
      updates.totalDistanceM = totalDist.toFixed(2);
      updates.polylineEncoded = encodePolyline(
        allWaypoints.map((w) => ({ lat: Number(w.lat), lng: Number(w.lng) })),
      );
    }
  }

  // Only call db.update() when there are journey-level fields to persist
  let updated: (typeof journeysTable.$inferSelect)[];
  if (Object.keys(updates).length > 0) {
    updated = await db
      .update(journeysTable)
      .set(updates)
      .where(eq(journeysTable.id, journeyId))
      .returning();
  } else {
    updated = existing;
  }

  // Trigger end-of-journey place discovery after polyline is persisted
  if (status === "ended" && updates.polylineEncoded) {
    void discoverPlacesAlongRoute(journeyId, user.id, updates.polylineEncoded).catch((err) =>
      console.error("end-of-journey discovery failed", err),
    );
  }

  const placeCountResult = await db
    .select({ count: count() })
    .from(journeyDiscoveredPlacesTable)
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));

  // Award XP + update quest/badge/streak on journey end
  let gamification: GamificationResult | null = null;
  if (status === "ended") {
    // Count pings used in this journey (distinct ping-sourced discoveries)
    const pingResult = await db
      .select({ count: count() })
      .from(journeyDiscoveredPlacesTable)
      .where(
        and(
          eq(journeyDiscoveredPlacesTable.journeyId, journeyId),
          eq(journeyDiscoveredPlacesTable.discoverySource, "ping"),
        ),
      );
    const pingCount = Number(pingResult[0]?.count ?? 0);

    // Use allWaypoints length as proxy for "streets walked"
    const allWaypointCount = waypoints?.length ?? 0;

    gamification = await awardJourneyGamification(user.id, journeyId, allWaypointCount, pingCount).catch(
      (err) => {
        console.error("gamification failed", err);
        return null;
      },
    );
  }

  res.json({
    ...updated[0],
    placeCount: placeCountResult[0]?.count ?? 0,
    totalDistanceM: updated[0]?.totalDistanceM ? Number(updated[0].totalDistanceM) : null,
    ...(gamification
      ? {
          xpGained: gamification.xpGained,
          newLevel: gamification.newLevel,
          newBadges: gamification.newBadges,
          completedQuests: gamification.completedQuests,
          newStreak: gamification.newStreak,
        }
      : {}),
  });
});

// ─── POST /journeys/:journeyId/ping ─────────────────────────────────────────

router.post("/journeys/:journeyId/ping", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { journeyId } = req.params;
  const { lat, lng } = req.body as { lat?: number; lng?: number };

  if (lat == null || lng == null) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  const existing = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.id, journeyId), eq(journeysTable.userId, user.id)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    res.json({ places: [], source: "no_api_key" });
    return;
  }

  const prefs = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, user.id))
    .limit(1);

  const minRating = parseFloat(String(prefs[0]?.minRating ?? "0"));
  const placeTypes = prefs[0]?.placeTypes ?? [];
  const allowedTypesSet = placeTypes.length ? new Set(placeTypes) : null;

  // Fetch user's existing discovered places to determine:
  // - dismissed places (never returned to client)
  // - already-seen places (not returned as new, but still get discoveryCount updated)
  const existingUserPlaces = await db
    .select({
      googlePlaceId: userDiscoveredPlacesTable.googlePlaceId,
      isDismissed: userDiscoveredPlacesTable.isDismissed,
    })
    .from(userDiscoveredPlacesTable)
    .where(eq(userDiscoveredPlacesTable.userId, user.id));

  const previouslySeenIds = new Set(existingUserPlaces.map((p) => p.googlePlaceId));

  // For a single type, pass it as a filter to Google. For multiple types,
  // fetch without a type filter and post-filter by the allowed set.
  const typeQuery = placeTypes.length === 1 ? `&type=${placeTypes[0]}` : "";
  const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&key=${apiKey}${typeQuery}`;

  const nearbyRes = await fetch(nearbyUrl);
  if (!nearbyRes.ok) {
    res.json({ places: [] });
    return;
  }

  const nearbyData = (await nearbyRes.json()) as {
    results: Array<{
      place_id: string;
      name: string;
      geometry: { location: { lat: number; lng: number } };
      rating?: number;
      types?: string[];
      photos?: Array<{ photo_reference: string }>;
      vicinity?: string;
    }>;
  };

  // Apply user preference filters, then map to our place shape
  // Include ALL non-dismissed places for persistence (to track discoveryCount)
  const allFilteredPlaces = (nearbyData.results ?? [])
    .filter((p) => minRating === 0 || (p.rating ?? 0) >= minRating)
    .filter((p) => !allowedTypesSet || (p.types ?? []).some((t) => allowedTypesSet.has(t)))
    .slice(0, 20)
    .map((p) => ({
      googlePlaceId: p.place_id,
      name: p.name,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      rating: p.rating ?? null,
      types: p.types ?? [],
      photoReference: p.photos?.[0]?.photo_reference ?? null,
      address: p.vicinity ?? null,
      distanceM: haversineDistance(lat, lng, p.geometry.location.lat, p.geometry.location.lng),
    }));

  // Persist ALL (including rediscoveries) so discoveryCount stays accurate
  if (allFilteredPlaces.length > 0) {
    await upsertPlaceCache(allFilteredPlaces);
    await saveDiscoveredPlaces(allFilteredPlaces, journeyId, user.id, "ping");
  }

  // Only return net-new (not previously seen) to the client
  const newPlaceIds = allFilteredPlaces
    .filter((p) => !previouslySeenIds.has(p.googlePlaceId))
    .map((p) => p.googlePlaceId)
    .slice(0, 10);

  // Fetch the persisted user-level discovery state for the new places
  const newPlaceStates =
    newPlaceIds.length > 0
      ? await db
          .select()
          .from(userDiscoveredPlacesTable)
          .where(
            and(
              eq(userDiscoveredPlacesTable.userId, user.id),
              inArray(userDiscoveredPlacesTable.googlePlaceId, newPlaceIds),
            ),
          )
      : [];

  const stateByPlaceId = new Map(newPlaceStates.map((s) => [s.googlePlaceId, s]));

  res.json({
    places: allFilteredPlaces
      .filter((p) => newPlaceIds.includes(p.googlePlaceId))
      .map((p) => {
        const state = stateByPlaceId.get(p.googlePlaceId);
        return {
          ...p,
          photoUrl: buildPhotoUrl(p.photoReference, apiKey),
          discoveryCount: state?.discoveryCount ?? 1,
          firstDiscoveredAt: state?.firstDiscoveredAt ?? new Date().toISOString(),
          lastDiscoveredAt: state?.lastDiscoveredAt ?? new Date().toISOString(),
          isFavorited: state?.isFavorited ?? false,
          isDismissed: state?.isDismissed ?? false,
          isSnoozed: state?.isSnoozed ?? false,
          snoozedUntil: state?.snoozedUntil ?? null,
        };
      }),
  });
});

// ─── GET /journeys/:journeyId/discoveries ────────────────────────────────────

router.get("/journeys/:journeyId/discoveries", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { journeyId } = req.params;

  const existing = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.id, journeyId), eq(journeysTable.userId, user.id)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const journey = existing[0];

  // If journey has ended, check whether route discovery has run yet.
  // If no route discoveries exist (e.g., the fire-and-forget finished before polyline
  // was persisted), run it inline so the client gets deterministic results on first fetch.
  if (journey.endedAt != null && journey.polylineEncoded) {
    const hasRouteDiscoveries = await db
      .select({ googlePlaceId: journeyDiscoveredPlacesTable.googlePlaceId })
      .from(journeyDiscoveredPlacesTable)
      .where(
        and(
          eq(journeyDiscoveredPlacesTable.journeyId, journeyId),
          eq(journeyDiscoveredPlacesTable.discoverySource, "route"),
        ),
      )
      .limit(1);

    if (!hasRouteDiscoveries.length) {
      await discoverPlacesAlongRoute(journeyId, user.id, journey.polylineEncoded).catch((err) =>
        console.error("inline discovery failed", err),
      );
    }
  }

  const journeyPlaces = await db
    .select({
      googlePlaceId: journeyDiscoveredPlacesTable.googlePlaceId,
      discoveredAt: journeyDiscoveredPlacesTable.discoveredAt,
      discoverySource: journeyDiscoveredPlacesTable.discoverySource,
      place: placeCacheTable,
    })
    .from(journeyDiscoveredPlacesTable)
    .innerJoin(placeCacheTable, eq(journeyDiscoveredPlacesTable.googlePlaceId, placeCacheTable.googlePlaceId))
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));

  // Join with user's action state; filter out dismissed places
  const placeIds = journeyPlaces.map((p) => p.googlePlaceId);
  const userStates =
    placeIds.length > 0
      ? await db
          .select()
          .from(userDiscoveredPlacesTable)
          .where(
            and(
              eq(userDiscoveredPlacesTable.userId, user.id),
              inArray(userDiscoveredPlacesTable.googlePlaceId, placeIds),
              eq(userDiscoveredPlacesTable.isDismissed, false),
            ),
          )
      : [];

  const stateByPlaceId = new Map(userStates.map((s) => [s.googlePlaceId, s]));
  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  // Only return non-dismissed places
  const nonDismissedPlaces = journeyPlaces.filter((p) => stateByPlaceId.has(p.place.googlePlaceId));

  res.json({
    places: nonDismissedPlaces.map((p) => {
      const state = stateByPlaceId.get(p.place.googlePlaceId);
      return {
        googlePlaceId: p.place.googlePlaceId,
        name: p.place.name,
        lat: Number(p.place.lat),
        lng: Number(p.place.lng),
        rating: p.place.rating ? Number(p.place.rating) : null,
        types: p.place.types,
        photoReference: p.place.photoReference,
        photoUrl: buildPhotoUrl(p.place.photoReference, apiKey),
        address: p.place.address,
        discoverySource: p.discoverySource,
        discoveredAt: p.discoveredAt,
        discoveryCount: state?.discoveryCount ?? 1,
        firstDiscoveredAt: state?.firstDiscoveredAt ?? p.discoveredAt,
        lastDiscoveredAt: state?.lastDiscoveredAt ?? p.discoveredAt,
        isFavorited: state?.isFavorited ?? false,
        isDismissed: false,
        isSnoozed: state?.isSnoozed ?? false,
      };
    }),
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Default place type queries used when the user has no specific preferences set
const DEFAULT_ROUTE_QUERIES = ["restaurant", "cafe", "museum", "park", "tourist_attraction"];

interface PlaceResult {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  types: string[];
  photoReference: string | null;
  address: string | null;
  distanceM: number;
}

// Response shape for the Google Places (New) API
interface PlacesNewApiResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    location?: { latitude: number; longitude: number };
    rating?: number;
    types?: string[];
    formattedAddress?: string;
    photos?: Array<{ name: string }>;
  }>;
}

/**
 * Uses the Google Places (New) API — Text Search with searchAlongRouteParameters —
 * to discover places along the journey's encoded polyline. Makes one request per
 * place-type category (up to 5), deduplicates, and stores results in the DB.
 */
async function discoverPlacesAlongRoute(
  journeyId: string,
  userId: string,
  encodedPolyline: string,
) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !encodedPolyline) return;

  const prefs = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId))
    .limit(1);

  const minRating = parseFloat(String(prefs[0]?.minRating ?? "0"));
  const placeTypes = prefs[0]?.placeTypes ?? [];

  // Use user's selected types (up to 5) or fall back to default discovery categories
  const queries = placeTypes.length > 0 ? placeTypes.slice(0, 5) : DEFAULT_ROUTE_QUERIES;

  // Also exclude places already discovered in THIS journey (from pings) to avoid
  // double-counting within the same journey
  const alreadyFound = await db
    .select({ googlePlaceId: journeyDiscoveredPlacesTable.googlePlaceId })
    .from(journeyDiscoveredPlacesTable)
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));
  const alreadyFoundIds = new Set(alreadyFound.map((d) => d.googlePlaceId));

  const allFound = new Map<string, PlaceResult>();

  const SEARCH_ALONG_ROUTE_URL = "https://places.googleapis.com/v1/places:searchText";
  const FIELD_MASK = "places.id,places.displayName,places.location,places.rating,places.types,places.formattedAddress,places.photos";

  for (const query of queries) {
    const res = await fetch(SEARCH_ALONG_ROUTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 20,
        searchAlongRouteParameters: {
          polyline: { encodedPolyline },
        },
      }),
    }).catch(() => null);

    if (!res?.ok) continue;

    const data = (await res.json()) as PlacesNewApiResponse;

    for (const p of data.places ?? []) {
      if (!p.id || !p.location) continue;
      // Only skip if already tracked in THIS journey (to avoid counting twice per journey)
      if (alreadyFoundIds.has(p.id) || allFound.has(p.id)) continue;
      // Apply rating filter (0 = no filter)
      if (minRating > 0 && (p.rating ?? 0) < minRating) continue;

      allFound.set(p.id, {
        googlePlaceId: p.id,
        name: p.displayName?.text ?? "Unknown Place",
        lat: p.location.latitude,
        lng: p.location.longitude,
        rating: p.rating ?? null,
        types: p.types ?? [],
        // photos[0].name is the resource name — store it for later rendering
        photoReference: p.photos?.[0]?.name ?? null,
        address: p.formattedAddress ?? null,
        distanceM: 0,
      });
    }
  }

  // Persist ALL places (including rediscoveries across journeys) so discoveryCount stays accurate
  const places = Array.from(allFound.values());
  if (places.length > 0) {
    await upsertPlaceCache(places);
    await saveDiscoveredPlaces(places, journeyId, userId, "route");
  }
}

async function saveDiscoveredPlaces(
  places: Array<{
    googlePlaceId: string;
    name: string;
    lat: number;
    lng: number;
    rating: number | null;
    types: string[];
    photoReference: string | null;
    address: string | null;
  }>,
  journeyId: string,
  userId: string,
  source: string,
) {
  const existingDiscoveries = await db
    .select({ googlePlaceId: journeyDiscoveredPlacesTable.googlePlaceId })
    .from(journeyDiscoveredPlacesTable)
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));
  const existingIds = new Set(existingDiscoveries.map((d) => d.googlePlaceId));

  const newPlaces = places.filter((p) => !existingIds.has(p.googlePlaceId));
  if (newPlaces.length === 0) return;

  // Save to journey_discovered_places
  await db.insert(journeyDiscoveredPlacesTable).values(
    newPlaces.map((p) => ({
      id: crypto.randomUUID(),
      journeyId,
      userId,
      googlePlaceId: p.googlePlaceId,
      discoverySource: source,
    })),
  );

  // Upsert to user_discovered_places
  for (const p of newPlaces) {
    const existing = await db
      .select()
      .from(userDiscoveredPlacesTable)
      .where(
        and(
          eq(userDiscoveredPlacesTable.userId, userId),
          eq(userDiscoveredPlacesTable.googlePlaceId, p.googlePlaceId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userDiscoveredPlacesTable)
        .set({
          lastDiscoveredAt: new Date(),
          discoveryCount: existing[0].discoveryCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(userDiscoveredPlacesTable.id, existing[0].id));
    } else {
      await db.insert(userDiscoveredPlacesTable).values({
        id: crypto.randomUUID(),
        userId,
        googlePlaceId: p.googlePlaceId,
        firstJourneyId: journeyId,
      });
    }
  }
}

async function upsertPlaceCache(
  places: Array<{
    googlePlaceId: string;
    name: string;
    lat: number;
    lng: number;
    rating: number | null;
    types: string[];
    photoReference: string | null;
    address: string | null;
  }>,
) {
  for (const p of places) {
    await db
      .insert(placeCacheTable)
      .values({
        googlePlaceId: p.googlePlaceId,
        name: p.name,
        lat: p.lat.toString(),
        lng: p.lng.toString(),
        rating: p.rating?.toString() ?? null,
        types: p.types,
        photoReference: p.photoReference,
        address: p.address,
      })
      .onConflictDoUpdate({
        target: placeCacheTable.googlePlaceId,
        set: {
          name: p.name,
          rating: p.rating?.toString() ?? null,
          types: p.types,
          photoReference: p.photoReference,
          address: p.address,
          cachedAt: new Date(),
        },
      });
  }
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function encodePolyline(coords: { lat: number; lng: number }[]): string {
  let result = "";
  let prevLat = 0;
  let prevLng = 0;
  for (const coord of coords) {
    const lat = Math.round(coord.lat * 1e5);
    const lng = Math.round(coord.lng * 1e5);
    result += encodeValue(lat - prevLat);
    result += encodeValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return result;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let result = "";
  while (v >= 0x20) {
    result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  result += String.fromCharCode(v + 63);
  return result;
}

export default router;
