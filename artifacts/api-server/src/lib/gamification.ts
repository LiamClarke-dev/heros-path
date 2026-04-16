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
import { eq, and, sql, count, lt } from "drizzle-orm";
import logger from "../logger.js";

// ─── XP constants ────────────────────────────────────────────────────────────

const XP_NEW_STREET = 10;
const XP_REVISIT = 3;
const XP_NEW_PLACE = 25;

// ─── Level ───────────────────────────────────────────────────────────────────

export function computeLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}

export function xpForNextLevel(level: number): number {
  return level * level * 100;
}

export function xpForCurrentLevel(level: number): number {
  return (level - 1) * (level - 1) * 100;
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
  { key: "first_journey",        name: "First Steps",       description: "Complete your first journey",       icon: "🥾" },
  { key: "streets_10",           name: "Street Walker",     description: "Walk 10 new grid cells",            icon: "🗺️" },
  { key: "streets_50",           name: "City Explorer",     description: "Walk 50 new grid cells",            icon: "🏙️" },
  { key: "streets_200",          name: "Legend Strider",    description: "Walk 200 new grid cells",           icon: "⚔️" },
  { key: "discovery_first",      name: "The Discoverer",    description: "Find your first place",             icon: "🔭" },
  { key: "discovery_10",         name: "Place Hunter",      description: "Discover 10 unique places",         icon: "🏛️" },
  { key: "discovery_50",         name: "World Cataloguer",  description: "Discover 50 unique places",         icon: "📖" },
  { key: "night_explorer",       name: "Night Owl",         description: "Complete a journey after 9 PM",     icon: "🦉" },
  { key: "streak_3",             name: "Consistent",        description: "Journey 3 days in a row",           icon: "🔥" },
  { key: "streak_7",             name: "Devoted",           description: "Journey 7 days in a row",           icon: "🔥" },
  { key: "streak_30",            name: "Legend Streak",     description: "Journey 30 days in a row",          icon: "👑" },
  { key: "ping_master",          name: "Ping Master",       description: "Use ping 5+ times in one journey",  icon: "📡" },
  { key: "globe_trotter",        name: "Globe Trotter",     description: "Journey in 3 different areas",      icon: "🌍" },
  { key: "zone_local",           name: "Local",             description: "Complete 1 zone (≥ 80%)",           icon: "🏘️" },
  { key: "zone_cartographer",    name: "Cartographer",      description: "Complete 5 zones",                  icon: "🗺️" },
  { key: "zone_master",          name: "Master Explorer",   description: "Complete 20 zones",                 icon: "🌟" },
];

// ─── Quest definitions ────────────────────────────────────────────────────────

export interface QuestDef {
  key: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  metric: "new_streets" | "new_places" | "journeys" | "distance_m" | "pings" | "neighborhoods" | "restaurant" | "duration_s";
}

export const QUEST_DEFINITIONS: QuestDef[] = [
  { key: "q_streets_5",      title: "Street Explorer",      description: "Walk 5 new streets this week",     target: 5,    xpReward: 50, metric: "new_streets"  },
  { key: "q_places_3",       title: "Place Hunter",         description: "Discover 3 new places",            target: 3,    xpReward: 75, metric: "new_places"   },
  { key: "q_journeys_3",     title: "Adventurer",           description: "Complete 3 journeys",              target: 3,    xpReward: 60, metric: "journeys"     },
  { key: "q_distance_2km",   title: "Long Haul",            description: "Walk 2 km total",                  target: 2000, xpReward: 80, metric: "distance_m"   },
  { key: "q_pings_3",        title: "Sonar",                description: "Use ping 3 times",                 target: 3,    xpReward: 40, metric: "pings"        },
  { key: "q_neighborhoods_2",title: "Neighborhood Hopper",  description: "Explore 2 different neighborhoods",target: 2,    xpReward: 90, metric: "neighborhoods"},
  { key: "q_restaurant_1",   title: "Food Scout",           description: "Find a restaurant",                target: 1,    xpReward: 30, metric: "restaurant"   },
  { key: "q_duration_20m",   title: "Marathon Walker",      description: "Journey for 20 minutes total",     target: 1200, xpReward: 50, metric: "duration_s"   },
];

// ─── Result type ──────────────────────────────────────────────────────────────

export interface GamificationResult {
  xpGained: number;
  newLevel: number;
  newBadges: Array<{ key: string; name: string; description: string; icon: string }>;
  completedQuests: Array<{ key: string; title: string; xpReward: number }>;
  newStreak: number;
  newCells: number;
  revisitCells: number;
  newPlacesThisJourney: number;
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
  durationSeconds: number,
  tzOffsetMinutes: number = 0
): Promise<GamificationResult> {
  // ── 1. Load journey row to get startedAt ──────────────────────────────────
  const [journeyRow] = await db.select().from(journeys).where(eq(journeys.id, journeyId));
  if (!journeyRow) throw new Error("Journey not found");
  const journeyStartedAt = new Date(journeyRow.startedAt);

  // ── 2. Grid cells: this journey vs prior journeys ────────────────────────
  // Current journey's waypoints
  const thisJourneyWps = await db
    .select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
    .from(journeyWaypoints)
    .where(eq(journeyWaypoints.journeyId, journeyId));

  const journeyCells = new Set<string>();
  for (const wp of thisJourneyWps) {
    journeyCells.add(toCellKey(parseFloat(String(wp.lat)), parseFloat(String(wp.lng))));
  }

  // Waypoints from all OTHER completed journeys by this user
  const priorWps = await db
    .select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
    .from(journeyWaypoints)
    .innerJoin(journeys, eq(journeyWaypoints.journeyId, journeys.id))
    .where(and(eq(journeys.userId, userId), sql`${journeyWaypoints.journeyId} != ${journeyId}`));

  const priorCells = new Set<string>();
  for (const wp of priorWps) {
    priorCells.add(toCellKey(parseFloat(String(wp.lat)), parseFloat(String(wp.lng))));
  }

  let newCells = 0;
  let revisitCells = 0;
  for (const cell of journeyCells) {
    if (priorCells.has(cell)) {
      revisitCells++;
    } else {
      newCells++;
    }
  }

  // ── 3. New places: places first discovered BY THIS USER during this journey
  // Correct: compare firstDiscoveredAt to journey startedAt (not discoveryCount,
  // which can be >1 if pings rediscovered the same place in the same journey)
  const journeyPlaceIds = await db
    .select({ googlePlaceId: journeyDiscoveredPlaces.googlePlaceId })
    .from(journeyDiscoveredPlaces)
    .where(eq(journeyDiscoveredPlaces.journeyId, journeyId));

  let newPlacesThisJourney = 0;
  let hasRestaurant = false;

  for (const { googlePlaceId } of journeyPlaceIds) {
    const [udp] = await db
      .select({ firstDiscoveredAt: userDiscoveredPlaces.firstDiscoveredAt })
      .from(userDiscoveredPlaces)
      .where(
        and(
          eq(userDiscoveredPlaces.userId, userId),
          eq(userDiscoveredPlaces.googlePlaceId, googlePlaceId)
        )
      );
    // Place is new if it was first discovered at or after this journey started
    if (udp && udp.firstDiscoveredAt && new Date(udp.firstDiscoveredAt) >= journeyStartedAt) {
      newPlacesThisJourney++;
    }

    if (!hasRestaurant) {
      const [cached] = await db
        .select({ primaryType: sql<string>`primary_type`, types: sql<string[]>`types` })
        .from(sql`place_cache`)
        .where(sql`google_place_id = ${googlePlaceId}`);
      if (cached) {
        const t = (cached.primaryType ?? "").toLowerCase();
        const types = (cached.types ?? []) as string[];
        if (
          t.includes("restaurant") || t.includes("food") ||
          types.some((tt) => tt.toLowerCase().includes("restaurant") || tt.toLowerCase().includes("food"))
        ) {
          hasRestaurant = true;
        }
      }
    }
  }

  // ── 4. Neighborhood diversity (0.005° ≈ 500 m cells) ────────────────────
  const NEIGH_CELL = 0.005;
  const neighborhoodCells = new Set<string>();
  for (const wp of thisJourneyWps) {
    const nLat = Math.floor(parseFloat(String(wp.lat)) / NEIGH_CELL) * NEIGH_CELL;
    const nLng = Math.floor(parseFloat(String(wp.lng)) / NEIGH_CELL) * NEIGH_CELL;
    neighborhoodCells.add(`${nLat.toFixed(3)},${nLng.toFixed(3)}`);
  }

  // ── 5. Globe-trotter: distinct 0.1° × 0.1° area cells across ALL journeys ─
  const AREA_CELL = 0.1;
  const allUserWps = await db
    .select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
    .from(journeyWaypoints)
    .innerJoin(journeys, eq(journeyWaypoints.journeyId, journeys.id))
    .where(eq(journeys.userId, userId));

  const areaCells = new Set<string>();
  for (const wp of allUserWps) {
    const aLat = Math.floor(parseFloat(String(wp.lat)) / AREA_CELL) * AREA_CELL;
    const aLng = Math.floor(parseFloat(String(wp.lng)) / AREA_CELL) * AREA_CELL;
    areaCells.add(`${aLat.toFixed(1)},${aLng.toFixed(1)}`);
  }

  // ── 6. Base XP ────────────────────────────────────────────────────────────
  let xpGained = newCells * XP_NEW_STREET + revisitCells * XP_REVISIT + newPlacesThisJourney * XP_NEW_PLACE;

  // ── 7. Fetch current user ─────────────────────────────────────────────────
  const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
  if (!currentUser) throw new Error("User not found");

  // ── 8. Streak (UTC date strings: YYYY-MM-DD) ──────────────────────────────
  const todayUTC = new Date().toISOString().slice(0, 10);
  const lastDate = currentUser.lastJourneyDate;

  let newStreak: number;
  if (!lastDate) {
    newStreak = 1;
  } else {
    const lastDateStr = typeof lastDate === "string" ? lastDate : (lastDate as Date).toISOString().slice(0, 10);
    const lastMs = new Date(lastDateStr + "T00:00:00Z").getTime();
    const todayMs = new Date(todayUTC + "T00:00:00Z").getTime();
    const diffDays = Math.round((todayMs - lastMs) / 86400000);
    if (diffDays === 0) {
      newStreak = currentUser.streakDays ?? 1;
    } else if (diffDays === 1) {
      newStreak = (currentUser.streakDays ?? 0) + 1;
    } else {
      newStreak = 1;
    }
  }

  // ── 9. Aggregate lifetime totals for badge evaluation ─────────────────────
  const [[totalPlacesRow], [totalJourneysRow]] = await Promise.all([
    db.select({ c: count() }).from(userDiscoveredPlaces).where(eq(userDiscoveredPlaces.userId, userId)),
    db.select({ c: count() }).from(journeys).where(and(eq(journeys.userId, userId), sql`${journeys.endedAt} IS NOT NULL`)),
  ]);
  const totalPlaces = Number(totalPlacesRow?.c ?? 0);
  const totalJourneys = Number(totalJourneysRow?.c ?? 0);

  // All cells for this user (including current journey — already in allUserWps)
  const allCells = new Set<string>();
  for (const wp of allUserWps) {
    allCells.add(toCellKey(parseFloat(String(wp.lat)), parseFloat(String(wp.lng))));
  }
  const totalCells = allCells.size;

  const localHour = new Date(new Date().getTime() - tzOffsetMinutes * 60000).getUTCHours();
  const isNight = localHour >= 21 || localHour < 4;

  // ── 10. Badge evaluation (after XP/streak computed, before DB write) ──────
  const earnedBadgeRows = await db
    .select({ badgeKey: userBadges.badgeKey })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));
  const earnedKeys = new Set(earnedBadgeRows.map((b) => b.badgeKey));

  const badgeConditions: Record<string, boolean> = {
    first_journey:   totalJourneys >= 1,
    streets_10:      totalCells >= 10,
    streets_50:      totalCells >= 50,
    streets_200:     totalCells >= 200,
    discovery_first: totalPlaces >= 1,
    discovery_10:    totalPlaces >= 10,
    discovery_50:    totalPlaces >= 50,
    night_explorer:  isNight,
    streak_3:        newStreak >= 3,
    streak_7:        newStreak >= 7,
    streak_30:       newStreak >= 30,
    ping_master:     pingCount >= 5,
    globe_trotter:   areaCells.size >= 3,
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

  // ── 11. Quest progress — reset immediately on completion ─────────────────
  const questIncrements: Record<QuestDef["metric"], number> = {
    new_streets:   newCells,
    new_places:    newPlacesThisJourney,
    journeys:      1,
    distance_m:    Math.round(distanceM),
    pings:         pingCount,
    neighborhoods: neighborhoodCells.size,
    restaurant:    hasRestaurant ? 1 : 0,
    duration_s:    Math.round(durationSeconds),
  };

  const completedQuests: GamificationResult["completedQuests"] = [];

  const questRows = await db
    .select()
    .from(userQuests)
    .where(eq(userQuests.userId, userId));
  const questMap = new Map(questRows.map((r) => [r.questKey, r]));

  for (const def of QUEST_DEFINITIONS) {
    const increment = questIncrements[def.metric] ?? 0;
    const row = questMap.get(def.key);

    // Current progress (only count if quest is not already completed)
    const currentProgress = row?.completedAt == null ? (row?.progress ?? 0) : 0;
    const newProgress = Math.min(currentProgress + increment, def.target);
    const justCompleted = newProgress >= def.target && currentProgress < def.target;

    if (row) {
      await db
        .update(userQuests)
        .set({
          // Reset immediately on completion so quest stays concurrent
          progress: justCompleted ? 0 : newProgress,
          completedAt: null,
        })
        .where(and(eq(userQuests.userId, userId), eq(userQuests.questKey, def.key)));
    } else if (increment > 0) {
      await db.insert(userQuests).values({
        userId,
        questKey: def.key,
        progress: justCompleted ? 0 : newProgress,
        completedAt: null,
      });
    }

    if (justCompleted) {
      completedQuests.push({ key: def.key, title: def.title, xpReward: def.xpReward });
      xpGained += def.xpReward;
    }
  }

  // ── 12. Persist XP, level, streak to users table ─────────────────────────
  const newXp = (currentUser.xp ?? 0) + xpGained;
  const newLevel = computeLevel(newXp);

  await db
    .update(users)
    .set({ xp: newXp, level: newLevel, streakDays: newStreak, lastJourneyDate: todayUTC })
    .where(eq(users.id, userId));

  return { xpGained, newLevel, newBadges, completedQuests, newStreak, newCells, revisitCells, newPlacesThisJourney };
}
