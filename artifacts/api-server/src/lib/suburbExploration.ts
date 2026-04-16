import {
  db,
  suburbs,
  suburbRoadSegments,
  userExploredSegments,
  suburbCompletions,
  users,
  userBadges,
} from "@workspace/db";
import { eq, and, sql, count, inArray } from "drizzle-orm";
import logger from "../logger.js";
import { computeLevel, xpForCurrentLevel, xpForNextLevel } from "./gamification.js";

const EXPLORE_RADIUS_DEG = 0.00025;

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentDistanceM(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineM(pLat, pLng, aLat, aLng);
  let t = ((pLng - aLng) * dx + (pLat - aLat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestLat = aLat + t * dy;
  const closestLng = aLng + t * dx;
  return haversineM(pLat, pLng, closestLat, closestLng);
}

interface WaypointCoord {
  lat: number;
  lng: number;
}

interface SuburbCompletionBadge {
  badgeKey: string;
  name: string;
  description: string;
  icon: string;
}

export const SUBURB_BADGE_DEFINITIONS: SuburbCompletionBadge[] = [
  { badgeKey: "suburb_local",        name: "Local",           description: "Complete 1 suburb (≥ 80%)",   icon: "🏘️" },
  { badgeKey: "suburb_cartographer", name: "Cartographer",    description: "Complete 5 suburbs",           icon: "🗺️" },
  { badgeKey: "suburb_master",       name: "Master Explorer", description: "Complete 20 suburbs",          icon: "🌟" },
];

const SUBURB_COMPLETION_XP = 500;
const SUBURB_THRESHOLD = 0.8;

export interface SuburbExplorationResult {
  newSuburbCompletions: Array<{ suburbId: string; name: string; completionPct: number }>;
  suburbXpGained: number;
  newSuburbBadges: Array<{ key: string; name: string; description: string; icon: string }>;
}

export async function processSuburbExploration(
  userId: string,
  waypoints: WaypointCoord[]
): Promise<SuburbExplorationResult> {
  if (waypoints.length === 0) {
    return { newSuburbCompletions: [], suburbXpGained: 0, newSuburbBadges: [] };
  }

  const minLat = Math.min(...waypoints.map((w) => w.lat)) - EXPLORE_RADIUS_DEG * 2;
  const maxLat = Math.max(...waypoints.map((w) => w.lat)) + EXPLORE_RADIUS_DEG * 2;
  const minLng = Math.min(...waypoints.map((w) => w.lng)) - EXPLORE_RADIUS_DEG * 2;
  const maxLng = Math.max(...waypoints.map((w) => w.lng)) + EXPLORE_RADIUS_DEG * 2;

  const nearbySegments = await db
    .select({
      id: suburbRoadSegments.id,
      suburbId: suburbRoadSegments.suburbId,
      geom: suburbRoadSegments.geom,
    })
    .from(suburbRoadSegments)
    .innerJoin(suburbs, eq(suburbRoadSegments.suburbId, suburbs.id))
    .where(
      and(
        sql`${suburbs.centroidLat} >= ${minLat} AND ${suburbs.centroidLat} <= ${maxLat}`,
        sql`${suburbs.centroidLng} >= ${minLng} AND ${suburbs.centroidLng} <= ${maxLng}`
      )
    );

  if (nearbySegments.length === 0) {
    return { newSuburbCompletions: [], suburbXpGained: 0, newSuburbBadges: [] };
  }

  const exploredSegmentIds = new Set<string>();

  for (const seg of nearbySegments) {
    const geom = seg.geom as { type: string; coordinates: [number, number][] };
    if (!geom?.coordinates || geom.coordinates.length < 2) continue;

    for (const wp of waypoints) {
      let found = false;
      for (let i = 0; i < geom.coordinates.length - 1; i++) {
        const [aLng, aLat] = geom.coordinates[i];
        const [bLng, bLat] = geom.coordinates[i + 1];
        const distM = pointToSegmentDistanceM(wp.lat, wp.lng, aLat, aLng, bLat, bLng);
        if (distM <= 25) {
          exploredSegmentIds.add(seg.id);
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  if (exploredSegmentIds.size === 0) {
    return { newSuburbCompletions: [], suburbXpGained: 0, newSuburbBadges: [] };
  }

  const alreadyExplored = await db
    .select({ segmentId: userExploredSegments.segmentId })
    .from(userExploredSegments)
    .where(
      and(
        eq(userExploredSegments.userId, userId),
        inArray(userExploredSegments.segmentId, [...exploredSegmentIds])
      )
    );

  const alreadyExploredSet = new Set(alreadyExplored.map((r) => r.segmentId));
  const newSegmentIds = [...exploredSegmentIds].filter((id) => !alreadyExploredSet.has(id));

  if (newSegmentIds.length > 0) {
    await db
      .insert(userExploredSegments)
      .values(newSegmentIds.map((segmentId) => ({ userId, segmentId })))
      .onConflictDoNothing();
  }

  const affectedSuburbIds = [
    ...new Set(
      nearbySegments
        .filter((s) => exploredSegmentIds.has(s.id))
        .map((s) => s.suburbId)
    ),
  ];

  const newSuburbCompletions: SuburbExplorationResult["newSuburbCompletions"] = [];
  let suburbXpGained = 0;
  const newSuburbBadges: SuburbExplorationResult["newSuburbBadges"] = [];

  for (const suburbId of affectedSuburbIds) {
    const [suburbRow] = await db
      .select({ id: suburbs.id, name: suburbs.name, totalSegments: suburbs.totalSegments })
      .from(suburbs)
      .where(eq(suburbs.id, suburbId));

    if (!suburbRow || suburbRow.totalSegments === 0) continue;

    const [exploredCountRow] = await db
      .select({ c: count() })
      .from(userExploredSegments)
      .innerJoin(suburbRoadSegments, eq(userExploredSegments.segmentId, suburbRoadSegments.id))
      .where(
        and(
          eq(userExploredSegments.userId, userId),
          eq(suburbRoadSegments.suburbId, suburbId)
        )
      );

    const exploredCount = Number(exploredCountRow?.c ?? 0);
    const completionPct = exploredCount / suburbRow.totalSegments;

    if (completionPct >= SUBURB_THRESHOLD) {
      const [existing] = await db
        .select()
        .from(suburbCompletions)
        .where(
          and(
            eq(suburbCompletions.userId, userId),
            eq(suburbCompletions.suburbId, suburbId)
          )
        );

      if (!existing) {
        await db
          .insert(suburbCompletions)
          .values({ userId, suburbId, completionPct })
          .onConflictDoNothing();

        suburbXpGained += SUBURB_COMPLETION_XP;
        newSuburbCompletions.push({
          suburbId,
          name: suburbRow.name,
          completionPct,
        });
      }
    }
  }

  if (newSuburbCompletions.length > 0) {
    const [completedCountRow] = await db
      .select({ c: count() })
      .from(suburbCompletions)
      .where(eq(suburbCompletions.userId, userId));

    const totalCompleted = Number(completedCountRow?.c ?? 0);

    const earnedBadgeRows = await db
      .select({ badgeKey: userBadges.badgeKey })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
    const earnedKeys = new Set(earnedBadgeRows.map((b) => b.badgeKey));

    const badgeConditions: Record<string, boolean> = {
      suburb_local:        totalCompleted >= 1,
      suburb_cartographer: totalCompleted >= 5,
      suburb_master:       totalCompleted >= 20,
    };

    for (const def of SUBURB_BADGE_DEFINITIONS) {
      if (!earnedKeys.has(def.badgeKey) && badgeConditions[def.badgeKey]) {
        try {
          await db
            .insert(userBadges)
            .values({ userId, badgeKey: def.badgeKey })
            .onConflictDoNothing();
          newSuburbBadges.push({
            key: def.badgeKey,
            name: def.name,
            description: def.description,
            icon: def.icon,
          });
        } catch (err) {
          logger.warn({ err }, `Failed to insert suburb badge ${def.badgeKey}`);
        }
      }
    }

    if (suburbXpGained > 0) {
      const [currentUser] = await db
        .select({ xp: users.xp })
        .from(users)
        .where(eq(users.id, userId));

      if (currentUser) {
        const newXp = (currentUser.xp ?? 0) + suburbXpGained;
        const newLevel = computeLevel(newXp);
        await db
          .update(users)
          .set({ xp: newXp, level: newLevel })
          .where(eq(users.id, userId));
      }
    }
  }

  return { newSuburbCompletions, suburbXpGained, newSuburbBadges };
}

export async function getSuburbsInViewport(
  userId: string,
  swLat: number,
  swLng: number,
  neLat: number,
  neLng: number
): Promise<
  Array<{
    id: string;
    name: string;
    city: string;
    centroidLat: number;
    centroidLng: number;
    completionPct: number;
    completedAt: string | null;
    boundary: unknown;
    segments: Array<{ id: string; geom: unknown; explored: boolean }>;
  }>
> {
  const suburbsInView = await db
    .select()
    .from(suburbs)
    .where(
      and(
        sql`${suburbs.centroidLat} >= ${swLat} AND ${suburbs.centroidLat} <= ${neLat}`,
        sql`${suburbs.centroidLng} >= ${swLng} AND ${suburbs.centroidLng} <= ${neLng}`
      )
    );

  if (suburbsInView.length === 0) return [];

  const results = await Promise.all(
    suburbsInView.map(async (suburb) => {
      const segments = await db
        .select({
          id: suburbRoadSegments.id,
          geom: suburbRoadSegments.geom,
        })
        .from(suburbRoadSegments)
        .where(eq(suburbRoadSegments.suburbId, suburb.id));

      const exploredRows = await db
        .select({ segmentId: userExploredSegments.segmentId })
        .from(userExploredSegments)
        .where(eq(userExploredSegments.userId, userId));

      const exploredSet = new Set(exploredRows.map((r) => r.segmentId));

      const [completion] = await db
        .select()
        .from(suburbCompletions)
        .where(
          and(
            eq(suburbCompletions.userId, userId),
            eq(suburbCompletions.suburbId, suburb.id)
          )
        );

      const exploredCount = segments.filter((s) => exploredSet.has(s.id)).length;
      const completionPct =
        suburb.totalSegments > 0 ? exploredCount / suburb.totalSegments : 0;

      return {
        id: suburb.id,
        name: suburb.name,
        city: suburb.city,
        centroidLat: suburb.centroidLat,
        centroidLng: suburb.centroidLng,
        completionPct,
        completedAt: completion?.completedAt?.toISOString() ?? null,
        boundary: suburb.boundaryGeoJSON,
        segments: segments.map((s) => ({
          id: s.id,
          geom: s.geom,
          explored: exploredSet.has(s.id),
        })),
      };
    })
  );

  return results;
}
