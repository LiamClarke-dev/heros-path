import {
  db,
  zones,
  zoneCoverage,
  zoneCompletions,
  users,
  userBadges,
  userPreferences,
} from "@workspace/db";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import logger from "../logger.js";

const ZONE_COMPLETION_XP = 500;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "../data/zones");

const PROXIMITY_DEG = 0.009;

interface WardBoundary {
  id: string;
  name: string;
  boundary: { type: string; coordinates: unknown };
  centroidLat: number;
  centroidLng: number;
}

let _tokyoWards: WardBoundary[] | null = null;
function loadTokyoWards(): WardBoundary[] {
  if (!_tokyoWards) {
    try {
      const raw = JSON.parse(readFileSync(join(DATA_DIR, "tokyo-wards.json"), "utf8")) as { wards: WardBoundary[] };
      _tokyoWards = raw.wards;
    } catch {
      _tokyoWards = [];
    }
  }
  return _tokyoWards;
}

let _melbourneLGAs: WardBoundary[] | null = null;
function loadMelbourneLGAs(): WardBoundary[] {
  if (!_melbourneLGAs) {
    try {
      const raw = JSON.parse(readFileSync(join(DATA_DIR, "melbourne-lgas.json"), "utf8")) as { lgas: WardBoundary[] };
      _melbourneLGAs = raw.lgas;
    } catch {
      _melbourneLGAs = [];
    }
  }
  return _melbourneLGAs;
}

function detectWardForPoint(lat: number, lng: number, wards: WardBoundary[]): string | null {
  for (const ward of wards) {
    if (pointInBoundary(lat, lng, ward.boundary as Record<string, unknown>)) {
      return ward.id;
    }
  }
  return null;
}

function getWardBbox(ward: WardBoundary): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  const b = ward.boundary as { type: string; coordinates: unknown };
  if (b.type !== "Polygon") return null;
  const coords = (b.coordinates as [number, number][][])[0];
  if (!coords || coords.length < 4) return null;
  const lngs = coords.map(([x]) => x).filter((x) => x != null && !isNaN(x));
  const lats = coords.map(([, y]) => y).filter((y) => y != null && !isNaN(y));
  if (lngs.length === 0 || lats.length === 0) return null;
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function getAdjacentWards(lat: number, lng: number, wards: WardBoundary[], thresholdDeg: number): string[] {
  const adjacent: string[] = [];
  for (const ward of wards) {
    const bbox = getWardBbox(ward);
    if (!bbox) continue;
    const distLat = Math.max(0, bbox.minLat - lat, lat - bbox.maxLat);
    const distLng = Math.max(0, bbox.minLng - lng, lng - bbox.maxLng);
    if (distLat <= thresholdDeg && distLng <= thresholdDeg) {
      adjacent.push(ward.id);
    }
  }
  return adjacent;
}
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
    return pointInPolygon(lat, lng, outer.map(([x, y]) => [x, y] as [number, number]));
  }
  if (type === "MultiPolygon") {
    const coords = boundary.coordinates as [number, number][][][];
    return coords.some((poly) => {
      const outer = poly[0];
      if (!outer) return false;
      return pointInPolygon(lat, lng, outer.map(([x, y]) => [x, y] as [number, number]));
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

  const routeMinLat = Math.min(...waypoints.map((w) => w.lat));
  const routeMaxLat = Math.max(...waypoints.map((w) => w.lat));
  const routeMinLng = Math.min(...waypoints.map((w) => w.lng));
  const routeMaxLng = Math.max(...waypoints.map((w) => w.lng));

  const nearbyZones = await db
    .select()
    .from(zones)
    .where(
      sql`${zones.bboxMinLat} <= ${routeMaxLat}
          AND ${zones.bboxMaxLat} >= ${routeMinLat}
          AND ${zones.bboxMinLng} <= ${routeMaxLng}
          AND ${zones.bboxMaxLng} >= ${routeMinLng}`
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

export function inferCityFromCoords(lat: number, lng: number): string | null {
  if (lat >= 34.8 && lat <= 36.2 && lng >= 138.5 && lng <= 140.5) return "tokyo";
  if (lat >= -38.5 && lat <= -37.5 && lng >= 143.5 && lng <= 145.0) return "geelong";
  if (lat >= -38.5 && lat <= -37.0 && lng >= 144.0 && lng <= 145.5) return "melbourne";
  if (lat >= 37.0 && lat <= 38.0 && lng >= -123.0 && lng <= -122.0) return "san_francisco";
  return null;
}

type ZoneApiRow = {
  id: string;
  name: string;
  nameEn: string | null;
  wardId: string | null;
  centroidLat: number;
  centroidLng: number;
  boundary: Record<string, unknown>;
  coveragePct: number;
  completedAt: string | null;
};

async function attachCoverage(
  userId: string,
  cityZones: (typeof zones.$inferSelect)[]
): Promise<ZoneApiRow[]> {
  if (cityZones.length === 0) return [];
  const zoneIds = cityZones.map((z) => z.id);

  const [coverageRows, completionRows] = await Promise.all([
    db
      .select({ zoneId: zoneCoverage.zoneId, coveragePct: zoneCoverage.coveragePct })
      .from(zoneCoverage)
      .where(and(eq(zoneCoverage.userId, userId), inArray(zoneCoverage.zoneId, zoneIds))),
    db
      .select({ zoneId: zoneCompletions.zoneId, completedAt: zoneCompletions.completedAt })
      .from(zoneCompletions)
      .where(and(eq(zoneCompletions.userId, userId), inArray(zoneCompletions.zoneId, zoneIds))),
  ]);

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

export async function getAllZonesForUser(userId: string, city: string): Promise<ZoneApiRow[]> {
  const cityZones = await db.select().from(zones).where(eq(zones.city, city));
  return attachCoverage(userId, cityZones);
}

export async function getZonesForLocation(
  userId: string,
  city: string,
  lat: number | null,
  lng: number | null
): Promise<ZoneApiRow[]> {
  if (city === "geelong" || city === "san_francisco" || lat == null || lng == null) {
    return getAllZonesForUser(userId, city);
  }

  const targetWardIds = new Set<string>();

  if (city === "tokyo") {
    const wards = loadTokyoWards();
    const adjacentWards = getAdjacentWards(lat, lng, wards, PROXIMITY_DEG);
    for (const w of adjacentWards) targetWardIds.add(w);

    const [prefs] = await db
      .select({ tokyoWards: userPreferences.tokyoWards })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    for (const w of prefs?.tokyoWards ?? []) targetWardIds.add(w);

  } else if (city === "melbourne") {
    const lgas = loadMelbourneLGAs();
    const adjacentLGAs = getAdjacentWards(lat, lng, lgas, PROXIMITY_DEG);
    for (const w of adjacentLGAs) targetWardIds.add(w);
  }

  if (targetWardIds.size === 0) {
    return getAllZonesForUser(userId, city);
  }

  const cityZones = await db
    .select()
    .from(zones)
    .where(and(eq(zones.city, city), inArray(zones.wardId, [...targetWardIds])));

  return attachCoverage(userId, cityZones);
}
