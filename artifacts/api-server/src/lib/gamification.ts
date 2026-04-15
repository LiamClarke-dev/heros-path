import {
  db,
  journeys,
  journeyWaypoints,
  journeyDiscoveredPlaces,
  userDiscoveredPlaces,
  userBadges,
  userQuests,
  users,
} from "@workspace/db";
import { eq, and, sql, gte, count } from "drizzle-orm";
import logger from "../logger.js";

// ─── XP constants ────────────────────────────────────────────────────────────

const XP_NEW_STREET = 10;
const XP_REVISIT = 3;
const XP_NEW_PLACE = 25;
const XP_QUEST_COMPLETE = 50;

// ─── Level ───────────────────────────────────────────────────────────────────

export function computeLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}

export function xpForNextLevel(level: number): number {
  return (level * level) * 100;
}

export function xpForCurrentLevel(level: number): number {
  return ((level - 1) * (level - 1)) * 100;
}

export const RANK_NAMES: Record<number, string> = {
  1: "Wanderer",
  2: "Pathfinder",
  3: "Cartographer",
  4: "Explorer",
  5: "Wayfarer",
  6: "Ranger",
  7: "Trailblazer",
  8: "Vanguard",
  9: "Scout Master",
};

export function rankName(level: number): string {
  return RANK_NAMES[level] ?? "Legendary Explorer";
}

// ─── Badge definitions ────────────────────────────────────────────────────────

export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGE_DEFINITIONS: BadgeDef[] = [
  {
    key: "first_journey",
    name: "First Steps",
    description: "Complete your first journey",
    icon: "🥾",
  },
  {
    key: "streets_10",
    name: "Street Walker",
    description: "Walk 10 new grid cells",
    icon: "🗺️",
  },
  {
    key: "streets_50",
    name: "City Explorer",
    description: "Walk 50 new grid cells",
    icon: "🏙️",
  },
  {
    key: "streets_200",
    name: "Legend Strider",
    description: "Walk 200 new grid cells",
    icon: "⚔️",
  },
  {
    key: "discovery_first",
    name: "The Discoverer",
    description: "Find your first place",
    icon: "🔭",
  },
  {
    key: "discovery_10",
    name: "Place Hunter",
    description: "Discover 10 unique places",
    icon: "🏛️",
  },
  {
    key: "discovery_50",
    name: "World Cataloguer",
    description: "Discover 50 unique places",
    icon: "📖",
  },
  {
    key: "night_explorer",
    name: "Night Owl",
    description: "Complete a journey after 9 PM",
    icon: "🦉",
  },
  {
    key: "streak_3",
    name: "Consistent",
    description: "Journey 3 days in a row",
    icon: "🔥",
  },
  {
    key: "streak_7",
    name: "Devoted",
    description: "Journey 7 days in a row",
    icon: "🔥",
  },
  {
    key: "streak_30",
    name: "Legend Streak",
    description: "Journey 30 days in a row",
    icon: "👑",
  },
  {
    key: "ping_master",
    name: "Ping Master",
    description: "Use ping 5+ times in one journey",
    icon: "📡",
  },
  {
    key: "globe_trotter",
    name: "Globe Trotter",
    description: "Journey in 3 different areas",
    icon: "🌍",
  },
];

// ─── Quest definitions ────────────────────────────────────────────────────────

export interface QuestDef {
  key: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  /** What metric to increment when a journey ends */
  metric: "new_streets" | "new_places" | "journeys" | "distance_m" | "pings" | "neighborhoods" | "restaurant" | "duration_s";
}

export const QUEST_DEFINITIONS: QuestDef[] = [
  {
    key: "q_streets_5",
    title: "Street Explorer",
    description: "Walk 5 new streets this week",
    target: 5,
    xpReward: 50,
    metric: "new_streets",
  },
  {
    key: "q_places_3",
    title: "Place Hunter",
    description: "Discover 3 new places",
    target: 3,
    xpReward: 75,
    metric: "new_places",
  },
  {
    key: "q_journeys_3",
    title: "Adventurer",
    description: "Complete 3 journeys",
    target: 3,
    xpReward: 60,
    metric: "journeys",
  },
  {
    key: "q_distance_2km",
    title: "Long Haul",
    description: "Walk 2 km total",
    target: 2000,
    xpReward: 80,
    metric: "distance_m",
  },
  {
    key: "q_pings_3",
    title: "Sonar",
    description: "Use ping 3 times",
    target: 3,
    xpReward: 40,
    metric: "pings",
  },
  {
    key: "q_neighborhoods_2",
    title: "Neighborhood Hopper",
    description: "Explore 2 different neighborhoods",
    target: 2,
    xpReward: 90,
    metric: "neighborhoods",
  },
  {
    key: "q_restaurant_1",
    title: "Food Scout",
    description: "Find a restaurant",
    target: 1,
    xpReward: 30,
    metric: "restaurant",
  },
  {
    key: "q_duration_20m",
    title: "Marathon Walker",
    description: "Journey for 20 minutes total",
    target: 1200,
    xpReward: 50,
    metric: "duration_s",
  },
];

// ─── Result type ──────────────────────────────────────────────────────────────

export interface GamificationResult {
  xpGained: number;
  newLevel: number;
  newBadges: Array<{ key: string; name: string; description: string; icon: string }>;
  completedQuests: Array<{ key: string; title: string; xpReward: number }>;
  newStreak: number;
}

// ─── Grid cell helpers ────────────────────────────────────────────────────────

const CELL = 0.0005;

function toCellKey(lat: number, lng: number): string {
  const cellLat = Math.floor(lat / CELL) * CELL;
  const cellLng = Math.floor(lng / CELL) * CELL;
  return `${cellLat.toFixed(4)},${cellLng.toFixed(4)}`;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function awardJourneyGamification(
  userId: string,
  journeyId: string,
  pingCount: number,
  distanceM: number,
  durationSeconds: number
): Promise<GamificationResult> {
  // ── 1. Compute new vs revisit grid cells for this journey ──────────────────

  // All waypoints for this journey
  const journeyWps = await db
    .select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
    .from(journeyWaypoints)
    .where(eq(journeyWaypoints.journeyId, journeyId));

  const journeyCells = new Set<string>();
  for (const wp of journeyWps) {
    journeyCells.add(toCellKey(parseFloat(String(wp.lat)), parseFloat(String(wp.lng))));
  }

  // All previously explored cells from OTHER journeys
  const previousWps = await db
    .select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
    .from(journeyWaypoints)
    .innerJoin(journeys, eq(journeyWaypoints.journeyId, journeys.id))
    .where(and(eq(journeys.userId, userId)));

  const previousCells = new Set<string>();
  for (const wp of previousWps) {
    const key = toCellKey(parseFloat(String(wp.lat)), parseFloat(String(wp.lng)));
    // Only count if it's not from this journey
    previousCells.add(key);
  }
  // Subtract current journey's own cells (they were included above)
  // so we need to check: which cells in journeyCells were NOT in previousCells before this journey
  // Actually we need cells from ALL journeys except this one
  const prevOnlyWps = await db
    .select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
    .from(journeyWaypoints)
    .innerJoin(journeys, eq(journeyWaypoints.journeyId, journeys.id))
    .where(and(
      eq(journeys.userId, userId),
      sql`${journeyWaypoints.journeyId} != ${journeyId}`
    ));

  const prevOnlyCells = new Set<string>();
  for (const wp of prevOnlyWps) {
    prevOnlyCells.add(toCellKey(parseFloat(String(wp.lat)), parseFloat(String(wp.lng))));
  }

  let newCells = 0;
  let revisitCells = 0;
  for (const cell of journeyCells) {
    if (prevOnlyCells.has(cell)) {
      revisitCells++;
    } else {
      newCells++;
    }
  }

  // ── 2. Count new places discovered during this journey ────────────────────

  // Places discovered in this specific journey
  const journeyPlaces = await db
    .select({ googlePlaceId: journeyDiscoveredPlaces.googlePlaceId })
    .from(journeyDiscoveredPlaces)
    .where(eq(journeyDiscoveredPlaces.journeyId, journeyId));

  // Of those, which were new discoveries for this user (first time ever)
  let newPlacesThisJourney = 0;
  let hasRestaurant = false;
  const neighborhoodCells = new Set<string>();

  for (const { googlePlaceId } of journeyPlaces) {
    // Check if this place was first discovered in this journey
    const [udp] = await db
      .select()
      .from(userDiscoveredPlaces)
      .where(
        and(
          eq(userDiscoveredPlaces.userId, userId),
          eq(userDiscoveredPlaces.googlePlaceId, googlePlaceId)
        )
      );
    if (udp && udp.discoveryCount === 1) {
      newPlacesThisJourney++;
    }
    // Check for restaurant type
    if (!hasRestaurant) {
      const [cached] = await db
        .select({ primaryType: sql<string>`primary_type`, types: sql<string[]>`types` })
        .from(sql`place_cache`)
        .where(sql`google_place_id = ${googlePlaceId}`);
      if (cached) {
        const t = (cached.primaryType ?? "").toLowerCase();
        const types = cached.types ?? [];
        if (
          t.includes("restaurant") ||
          t.includes("food") ||
          types.some((tt: string) => tt.toLowerCase().includes("restaurant") || tt.toLowerCase().includes("food"))
        ) {
          hasRestaurant = true;
        }
      }
    }
  }

  // ── 3. Compute neighborhood diversity for this journey ────────────────────
  // Use a larger cell (0.005 degrees ≈ 500m) for neighborhood-level granularity
  const NEIGH_CELL = 0.005;
  for (const wp of journeyWps) {
    const nLat = Math.floor(parseFloat(String(wp.lat)) / NEIGH_CELL) * NEIGH_CELL;
    const nLng = Math.floor(parseFloat(String(wp.lng)) / NEIGH_CELL) * NEIGH_CELL;
    neighborhoodCells.add(`${nLat.toFixed(3)},${nLng.toFixed(3)}`);
  }

  // ── 4. Compute total area diversity across all journeys ───────────────────
  // For globe_trotter badge: count distinct large-area cells (0.1 deg ≈ 10km)
  const AREA_CELL = 0.1;
  const areaCells = new Set<string>();
  for (const wp of previousWps) {
    const aLat = Math.floor(parseFloat(String(wp.lat)) / AREA_CELL) * AREA_CELL;
    const aLng = Math.floor(parseFloat(String(wp.lng)) / AREA_CELL) * AREA_CELL;
    areaCells.add(`${aLat.toFixed(1)},${aLng.toFixed(1)}`);
  }
  for (const wp of journeyWps) {
    const aLat = Math.floor(parseFloat(String(wp.lat)) / AREA_CELL) * AREA_CELL;
    const aLng = Math.floor(parseFloat(String(wp.lng)) / AREA_CELL) * AREA_CELL;
    areaCells.add(`${aLat.toFixed(1)},${aLng.toFixed(1)}`);
  }

  // ── 5. Compute base XP ────────────────────────────────────────────────────
  let xpGained = newCells * XP_NEW_STREET + revisitCells * XP_REVISIT + newPlacesThisJourney * XP_NEW_PLACE;

  // ── 6. Fetch current user ─────────────────────────────────────────────────
  const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
  if (!currentUser) throw new Error("User not found");

  // ── 7. Update streak ──────────────────────────────────────────────────────
  const todayUTC = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const lastDate = currentUser.lastJourneyDate;

  let newStreak: number;
  if (!lastDate) {
    newStreak = 1;
  } else {
    const lastDateStr = typeof lastDate === "string" ? lastDate : (lastDate as Date).toISOString().slice(0, 10);
    // Calculate difference in UTC days
    const lastMs = new Date(lastDateStr + "T00:00:00Z").getTime();
    const todayMs = new Date(todayUTC + "T00:00:00Z").getTime();
    const diffDays = Math.round((todayMs - lastMs) / 86400000);
    if (diffDays === 0) {
      // Same day — maintain streak
      newStreak = currentUser.streakDays ?? 1;
    } else if (diffDays === 1) {
      // Consecutive day
      newStreak = (currentUser.streakDays ?? 0) + 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
  }

  // ── 8. Get total user stats (after this journey's data is written) ─────────
  const [totalPlacesRow] = await db
    .select({ c: count() })
    .from(userDiscoveredPlaces)
    .where(eq(userDiscoveredPlaces.userId, userId));
  const totalPlaces = Number(totalPlacesRow?.c ?? 0);

  const [totalJourneysRow] = await db
    .select({ c: count() })
    .from(journeys)
    .where(and(eq(journeys.userId, userId), sql`${journeys.endedAt} IS NOT NULL`));
  const totalJourneys = Number(totalJourneysRow?.c ?? 0);

  // Count all explored cells across all journeys
  const allUserWps = await db
    .select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
    .from(journeyWaypoints)
    .innerJoin(journeys, eq(journeyWaypoints.journeyId, journeys.id))
    .where(eq(journeys.userId, userId));
  const allCells = new Set<string>();
  for (const wp of allUserWps) {
    allCells.add(toCellKey(parseFloat(String(wp.lat)), parseFloat(String(wp.lng))));
  }
  const totalCells = allCells.size;

  // Night explorer: check if this journey ended after 9 PM local (use UTC hour as fallback)
  const nowHour = new Date().getUTCHours();
  const isNight = nowHour >= 21 || nowHour < 4;

  // ── 9. Get already earned badges ─────────────────────────────────────────
  const earnedBadgeRows = await db
    .select({ badgeKey: userBadges.badgeKey })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));
  const earnedKeys = new Set(earnedBadgeRows.map((b) => b.badgeKey));

  // ── 10. Evaluate badge conditions ────────────────────────────────────────
  const badgeConditions: Record<string, boolean> = {
    first_journey: totalJourneys >= 1,
    streets_10: totalCells >= 10,
    streets_50: totalCells >= 50,
    streets_200: totalCells >= 200,
    discovery_first: totalPlaces >= 1,
    discovery_10: totalPlaces >= 10,
    discovery_50: totalPlaces >= 50,
    night_explorer: isNight,
    streak_3: newStreak >= 3,
    streak_7: newStreak >= 7,
    streak_30: newStreak >= 30,
    ping_master: pingCount >= 5,
    globe_trotter: areaCells.size >= 3,
  };

  const newBadges: GamificationResult["newBadges"] = [];
  for (const def of BADGE_DEFINITIONS) {
    if (!earnedKeys.has(def.key) && badgeConditions[def.key]) {
      try {
        await db.insert(userBadges).values({ userId, badgeKey: def.key }).onConflictDoNothing();
        newBadges.push({ key: def.key, name: def.name, description: def.description, icon: def.icon });
      } catch (err) {
        logger.warn({ err }, `Failed to insert badge ${def.key}`);
      }
    }
  }

  // ── 11. Update quest progress ─────────────────────────────────────────────
  const questIncrements: Record<QuestDef["metric"], number> = {
    new_streets: newCells,
    new_places: newPlacesThisJourney,
    journeys: 1,
    distance_m: Math.round(distanceM),
    pings: pingCount,
    neighborhoods: neighborhoodCells.size,
    restaurant: hasRestaurant ? 1 : 0,
    duration_s: Math.round(durationSeconds),
  };

  const completedQuests: GamificationResult["completedQuests"] = [];

  for (const def of QUEST_DEFINITIONS) {
    const increment = questIncrements[def.metric] ?? 0;
    if (increment <= 0) continue;

    // Upsert quest row
    const existing = await db
      .select()
      .from(userQuests)
      .where(and(eq(userQuests.userId, userId), eq(userQuests.questKey, def.key)));

    const questRow = existing[0];

    if (questRow?.completedAt) {
      // Quest already completed — reset and start fresh
      const newProgress = Math.min(increment, def.target);
      const isCompleted = newProgress >= def.target;
      await db
        .update(userQuests)
        .set({
          progress: newProgress,
          completedAt: isCompleted ? new Date() : null,
        })
        .where(and(eq(userQuests.userId, userId), eq(userQuests.questKey, def.key)));
      if (isCompleted) {
        completedQuests.push({ key: def.key, title: def.title, xpReward: def.xpReward });
        xpGained += def.xpReward;
      }
    } else {
      const currentProgress = questRow?.progress ?? 0;
      const newProgress = Math.min(currentProgress + increment, def.target);
      const isCompleted = newProgress >= def.target;

      if (questRow) {
        await db
          .update(userQuests)
          .set({
            progress: newProgress,
            completedAt: isCompleted ? new Date() : null,
          })
          .where(and(eq(userQuests.userId, userId), eq(userQuests.questKey, def.key)));
      } else {
        await db.insert(userQuests).values({
          userId,
          questKey: def.key,
          progress: newProgress,
          completedAt: isCompleted ? new Date() : null,
        });
      }

      if (isCompleted && !questRow?.completedAt) {
        completedQuests.push({ key: def.key, title: def.title, xpReward: def.xpReward });
        xpGained += def.xpReward;
      }
    }
  }

  // ── 12. Update user XP, level, streak ────────────────────────────────────
  const newXp = (currentUser.xp ?? 0) + xpGained;
  const newLevel = computeLevel(newXp);

  await db
    .update(users)
    .set({
      xp: newXp,
      level: newLevel,
      streakDays: newStreak,
      lastJourneyDate: todayUTC,
    })
    .where(eq(users.id, userId));

  return {
    xpGained,
    newLevel,
    newBadges,
    completedQuests,
    newStreak,
  };
}
