import {
  db,
  zones,
  zoneCoverage,
  zoneCompletions,
  users,
  userBadges,
} from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import logger from "../logger.js";
import { computeLevel, xpForCurrentLevel, xpForNextLevel } from "./gamification.js";

const ZONE_COMPLETION_XP = 500;
const ZONE_THRESHOLD = 0.8;

function pointInPolygon(lat: number, lng: number, ring: [number, number][]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInBoundary(lat: number, lng: number, boundary: Record<string, unknown>): boolean {
  const type = boundary.type as string;
  if (type === "Polygon") {
    const coords = boundary.coordinates as [number, number][][];
    const outer = coords[0];
    if (!outer) return false;
    return pointInPolygon(lng, lat, outer.map(([x, y]) => [x, y]));
  }
  if (type === "MultiPolygon") {
    const coords = boundary.coordinates as [number, number][][][];
    return coords.some((poly) => {
      const outer = poly[0];
      if (!outer) return false;
      return pointInPolygon(lng, lat, outer.map(([x, y]) => [x, y]));
    });
  }
  return false;
}

type ZoneRow = typeof zones.$inferSelect;

function cellIndex(lat: number, lng: number, zone: ZoneRow): number | null {
  if (
    zone.bboxMinLat == null ||
    zone.bboxMaxLat == null ||
    zone.bboxMinLng == null ||
    zone.bboxMaxLng == null
  ) {
    return null;
  }
  const gridSize = zone.gridSize ?? 0.0005;
  const row = Math.floor((lat - zone.bboxMinLat) / gridSize);
  const col = Math.floor((lng - zone.bboxMinLng) / gridSize);
  const numCols = Math.ceil((zone.bboxMaxLng - zone.bboxMinLng) / gridSize);
  if (row < 0 || col < 0 || col >= numCols) return null;
  return row * numCols + col;
}

interface WaypointCoord {
  lat: number;
  lng: number;
}

export interface ZoneCoverageBadge {
  badgeKey: string;
  name: string;
  description: string;
  icon: string;
}

export const ZONE_BADGE_DEFINITIONS: ZoneCoverageBadge[] = [
  { badgeKey: "zone_local",        name: "Local",           description: "Complete 1 zone (≥ 80%)",   icon: "🏘️" },
  { badgeKey: "zone_cartographer", name: "Cartographer",    description: "Complete 5 zones",           icon: "🗺️" },
  { badgeKey: "zone_master",       name: "Master Explorer", description: "Complete 20 zones",          icon: "🌟" },
];

export interface ZoneExplorationResult {
  newZoneCompletions: Array<{ zoneId: string; name: string; coveragePct: number }>;
  zoneXpGained: number;
  newZoneBadges: Array<{ key: string; name: string; description: string; icon: string }>;
}

export async function processZoneCoverage(
  userId: string,
  waypoints: WaypointCoord[]
): Promise<ZoneExplorationResult> {
  if (waypoints.length === 0) {
    return { newZoneCompletions: [], zoneXpGained: 0, newZoneBadges: [] };
  }

  const padding = 0.001;
  const minLat = Math.min(...waypoints.map((w) => w.lat)) - padding;
  const maxLat = Math.max(...waypoints.map((w) => w.lat)) + padding;
  const minLng = Math.min(...waypoints.map((w) => w.lng)) - padding;
  const maxLng = Math.max(...waypoints.map((w) => w.lng)) + padding;

  const nearbyZones = await db
    .select()
    .from(zones)
    .where(
      sql`${zones.centroidLat} >= ${minLat} AND ${zones.centroidLat} <= ${maxLat}
          AND ${zones.centroidLng} >= ${minLng} AND ${zones.centroidLng} <= ${maxLng}`
    );

  if (nearbyZones.length === 0) {
    return { newZoneCompletions: [], zoneXpGained: 0, newZoneBadges: [] };
  }

  const newZoneCompletions: ZoneExplorationResult["newZoneCompletions"] = [];
  let zoneXpGained = 0;
  const newZoneBadges: ZoneExplorationResult["newZoneBadges"] = [];

  for (const zone of nearbyZones) {
    if (zone.totalCells === 0) continue;

    const boundary = zone.boundaryGeoJSON as Record<string, unknown>;

    const newCellIndices = new Set<number>();
    for (const wp of waypoints) {
      if (pointInBoundary(wp.lat, wp.lng, boundary)) {
        const idx = cellIndex(wp.lat, wp.lng, zone);
        if (idx !== null) newCellIndices.add(idx);
      }
    }

    if (newCellIndices.size === 0) continue;

    const [existingRow] = await db
      .select({ visitedCells: zoneCoverage.visitedCells, coveragePct: zoneCoverage.coveragePct })
      .from(zoneCoverage)
      .where(and(eq(zoneCoverage.userId, userId), eq(zoneCoverage.zoneId, zone.id)));

    const prevCells: number[] = existingRow?.visitedCells ?? [];
    const prevCoveragePct = existingRow?.coveragePct ?? 0;

    const mergedSet = new Set([...prevCells, ...newCellIndices]);
    const mergedCells = [...mergedSet].sort((a, b) => a - b);
    const newCoveragePct = Math.min(1, mergedCells.length / zone.totalCells);

    if (mergedCells.length === prevCells.length && newCoveragePct === prevCoveragePct) continue;

    await db
      .insert(zoneCoverage)
      .values({
        userId,
        zoneId: zone.id,
        visitedCells: mergedCells,
        coveragePct: newCoveragePct,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [zoneCoverage.userId, zoneCoverage.zoneId],
        set: {
          visitedCells: sql`(SELECT array(SELECT DISTINCT unnest(zone_coverage.visited_cells || EXCLUDED.visited_cells) ORDER BY 1))`,
          coveragePct: sql`LEAST(1.0, array_length((SELECT array(SELECT DISTINCT unnest(zone_coverage.visited_cells || EXCLUDED.visited_cells))), 1)::real / ${zone.totalCells})`,
          updatedAt: new Date(),
        },
      });

    if (prevCoveragePct < ZONE_THRESHOLD && newCoveragePct >= ZONE_THRESHOLD) {
      const [alreadyCompleted] = await db
        .select({ userId: zoneCompletions.userId })
        .from(zoneCompletions)
        .where(and(eq(zoneCompletions.userId, userId), eq(zoneCompletions.zoneId, zone.id)));

      if (!alreadyCompleted) {
        await db.insert(zoneCompletions).values({
          userId,
          zoneId: zone.id,
          coveragePct: newCoveragePct,
        });
        newZoneCompletions.push({
          zoneId: zone.id,
          name: zone.name,
          coveragePct: newCoveragePct,
        });
        zoneXpGained += ZONE_COMPLETION_XP;
        logger.info({ userId, zoneId: zone.id, name: zone.name }, "Zone completed");
      }
    }
  }

  if (zoneXpGained > 0) {
    try {
      await db
        .update(users)
        .set({ xp: sql`${users.xp} + ${zoneXpGained}` })
        .where(eq(users.id, userId));
    } catch (err) {
      logger.warn({ err }, "Zone XP update failed");
    }
  }

  if (newZoneCompletions.length > 0) {
    const [completionCount] = await db
      .select({ c: sql<number>`count(*)` })
      .from(zoneCompletions)
      .where(eq(zoneCompletions.userId, userId));

    const total = Number(completionCount?.c ?? 0);
    const thresholds = [
      { count: 1,  badge: ZONE_BADGE_DEFINITIONS[0] },
      { count: 5,  badge: ZONE_BADGE_DEFINITIONS[1] },
      { count: 20, badge: ZONE_BADGE_DEFINITIONS[2] },
    ];

    for (const { count, badge } of thresholds) {
      if (total >= count) {
        const [existingBadge] = await db
          .select({ userId: userBadges.userId })
          .from(userBadges)
          .where(
            and(eq(userBadges.userId, userId), eq(userBadges.badgeKey, badge.badgeKey))
          );

        if (!existingBadge) {
          await db.insert(userBadges).values({
            userId,
            badgeKey: badge.badgeKey,
          });
          newZoneBadges.push({
            key: badge.badgeKey,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
          });
        }
      }
    }
  }

  return { newZoneCompletions, zoneXpGained, newZoneBadges };
}

export async function getAllZonesForUser(
  userId: string,
  city: string
): Promise<Array<{
  id: string;
  name: string;
  nameEn: string | null;
  wardId: string | null;
  centroidLat: number;
  centroidLng: number;
  boundary: Record<string, unknown>;
  coveragePct: number;
  completedAt: string | null;
}>> {
  const cityZones = await db
    .select()
    .from(zones)
    .where(eq(zones.city, city));

  if (cityZones.length === 0) return [];

  const zoneIds = cityZones.map((z) => z.id);

  const coverageRows = await db
    .select({ zoneId: zoneCoverage.zoneId, coveragePct: zoneCoverage.coveragePct })
    .from(zoneCoverage)
    .where(and(eq(zoneCoverage.userId, userId), inArray(zoneCoverage.zoneId, zoneIds)));

  const completionRows = await db
    .select({ zoneId: zoneCompletions.zoneId, completedAt: zoneCompletions.completedAt })
    .from(zoneCompletions)
    .where(and(eq(zoneCompletions.userId, userId), inArray(zoneCompletions.zoneId, zoneIds)));

  const coverageMap = new Map(coverageRows.map((r) => [r.zoneId, r.coveragePct]));
  const completionMap = new Map(completionRows.map((r) => [r.zoneId, r.completedAt]));

  return cityZones.map((z) => ({
    id: z.id,
    name: z.name,
    nameEn: z.nameEn ?? null,
    wardId: z.wardId ?? null,
    centroidLat: z.centroidLat,
    centroidLng: z.centroidLng,
    boundary: z.boundaryGeoJSON as Record<string, unknown>,
    coveragePct: coverageMap.get(z.id) ?? 0,
    completedAt: completionMap.get(z.id)?.toISOString() ?? null,
  }));
}

export function inferCityFromCoords(lat: number, lng: number): string | null {
  if (lat >= 34.8 && lat <= 36.2 && lng >= 138.5 && lng <= 140.5) return "tokyo";
  if (lat >= -38.5 && lat <= -37.0 && lng >= 144.0 && lng <= 145.5) return "melbourne";
  if (lat >= -38.5 && lat <= -37.5 && lng >= 143.5 && lng <= 145.0) return "geelong";
  if (lat >= 37.0 && lat <= 38.0 && lng >= -123.0 && lng <= -122.0) return "san_francisco";
  return null;
}
