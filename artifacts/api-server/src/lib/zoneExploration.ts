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
import { join } from "path";
import logger from "../logger.js";

const ZONE_COMPLETION_XP = 500;

// pnpm runs scripts with CWD set to the package directory (artifacts/api-server/).
// This works in both ESM dev (tsx) and production CJS (esbuild) without import.meta.url.
const DATA_DIR = join(process.cwd(), "src/data/zones");

const PROXIMITY_DEG = 0.009;
// Hard cap: never send more than this many zones to the client for Tokyo
const TOKYO_ZONE_CAP = 40;
// Fallback radius when user is not inside any ward (parks, stations, rivers)
const FALLBACK_RADIUS_DEG = 0.015; // ~1.5 km


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
  let allCoords: [number, number][] = [];

  if (b.type === "Polygon") {
    const rings = b.coordinates as [number, number][][];
    if (rings[0]) allCoords = rings[0];
  } else if (b.type === "MultiPolygon") {
    const polys = b.coordinates as [number, number][][][];
    for (const poly of polys) {
      if (poly[0]) allCoords = allCoords.concat(poly[0]);
    }
  } else {
    return null;
  }

  const lngs = allCoords.map(([x]) => x).filter((x) => x != null && !isNaN(x));
  const lats = allCoords.map(([, y]) => y).filter((y) => y != null && !isNaN(y));
  if (lngs.length === 0 || lats.length === 0) return null;
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

// Point-to-line-segment distance (in coordinate degrees, not metres)
function pointToSegmentDist(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Minimum distance from (lat, lng) to any edge of a polygon ring [lng, lat][]
function pointToRingEdgeDist(lat: number, lng: number, ring: [number, number][]): number {
  let min = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const d = pointToSegmentDist(lng, lat, x1, y1, x2, y2);
    if (d < min) min = d;
  }
  return min;
}

// Minimum distance from (lat, lng) to any polygon edge of a WardBoundary (MultiPolygon or Polygon)
function pointToWardEdgeDist(lat: number, lng: number, ward: WardBoundary): number {
  const b = ward.boundary as { type: string; coordinates: unknown };
  let min = Infinity;
  if (b.type === "Polygon") {
    const rings = b.coordinates as [number, number][][];
    if (rings[0]) { const d = pointToRingEdgeDist(lat, lng, rings[0]); if (d < min) min = d; }
  } else if (b.type === "MultiPolygon") {
    const polys = b.coordinates as [number, number][][][];
    for (const poly of polys) {
      if (poly[0]) { const d = pointToRingEdgeDist(lat, lng, poly[0]); if (d < min) min = d; }
    }
  }
  return min;
}

// All ward IDs whose polygon boundary is within thresholdDeg of (lat, lng)
function getAdjacentWards(lat: number, lng: number, wards: WardBoundary[], thresholdDeg: number): string[] {
  const adjacent: string[] = [];
  for (const ward of wards) {
    // Fast bbox pre-filter: skip wards whose bbox is far beyond threshold
    const bbox = getWardBbox(ward);
    if (bbox) {
      const bboxDistLat = Math.max(0, bbox.minLat - lat, lat - bbox.maxLat);
      const bboxDistLng = Math.max(0, bbox.minLng - lng, lng - bbox.maxLng);
      if (bboxDistLat > thresholdDeg * 2 || bboxDistLng > thresholdDeg * 2) continue;
    }
    // Precise polygon-edge distance check
    if (pointToWardEdgeDist(lat, lng, ward) <= thresholdDeg) {
      adjacent.push(ward.id);
    }
  }
  return adjacent;
}

// Build ward adjacency by checking polygon-vertex proximity between each pair of wards.
// Two wards are considered adjacent when any vertex of one lies within TOL degrees of the
// expanded bounding box of the other — far more precise than bbox-rectangle overlap.
function computeWardAdjacency(wards: WardBoundary[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const w of wards) adj.set(w.id, new Set());

  // Collect all polygon vertices per ward
  const wardVerts = new Map<string, [number, number][]>();
  for (const ward of wards) {
    const b = ward.boundary as { type: string; coordinates: unknown };
    const verts: [number, number][] = [];
    if (b.type === "Polygon") {
      for (const pt of (b.coordinates as [number, number][][])[0] ?? []) verts.push(pt);
    } else if (b.type === "MultiPolygon") {
      for (const poly of (b.coordinates as [number, number][][][])) {
        for (const pt of poly[0] ?? []) verts.push(pt);
      }
    }
    wardVerts.set(ward.id, verts);
  }

  const bboxes = new Map<string, ReturnType<typeof getWardBbox>>();
  for (const w of wards) bboxes.set(w.id, getWardBbox(w));

  const TOL = 0.005; // ~500 m tolerance for shared/near-shared borders
  for (let i = 0; i < wards.length; i++) {
    for (let j = i + 1; j < wards.length; j++) {
      const bboxA = bboxes.get(wards[i].id);
      const bboxB = bboxes.get(wards[j].id);
      if (!bboxA || !bboxB) continue;
      // Expanded bbox overlap pre-filter
      if (
        bboxA.minLat - TOL > bboxB.maxLat || bboxA.maxLat + TOL < bboxB.minLat ||
        bboxA.minLng - TOL > bboxB.maxLng || bboxA.maxLng + TOL < bboxB.minLng
      ) continue;
      // Check if any vertex of A falls inside the expanded bbox of B, or vice versa
      let found = false;
      for (const [lng, lat] of (wardVerts.get(wards[i].id) ?? [])) {
        if (lat >= bboxB.minLat - TOL && lat <= bboxB.maxLat + TOL &&
            lng >= bboxB.minLng - TOL && lng <= bboxB.maxLng + TOL) { found = true; break; }
      }
      if (!found) {
        for (const [lng, lat] of (wardVerts.get(wards[j].id) ?? [])) {
          if (lat >= bboxA.minLat - TOL && lat <= bboxA.maxLat + TOL &&
              lng >= bboxA.minLng - TOL && lng <= bboxA.maxLng + TOL) { found = true; break; }
        }
      }
      if (found) {
        adj.get(wards[i].id)!.add(wards[j].id);
        adj.get(wards[j].id)!.add(wards[i].id);
      }
    }
  }
  return adj;
}

let _tokyoAdjacency: Map<string, Set<string>> | null = null;
function getTokyoAdjacency(): Map<string, Set<string>> {
  if (!_tokyoAdjacency) _tokyoAdjacency = computeWardAdjacency(loadTokyoWards());
  return _tokyoAdjacency;
}

let _melbourneAdjacency: Map<string, Set<string>> | null = null;
function getMelbourneAdjacency(): Map<string, Set<string>> {
  if (!_melbourneAdjacency) _melbourneAdjacency = computeWardAdjacency(loadMelbourneLGAs());
  return _melbourneAdjacency;
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

const DEFAULT_GRID_SIZE = 20;

function cellIndex(lat: number, lng: number, zone: ZoneRow): number | null {
  if (
    zone.bboxMinLat == null ||
    zone.bboxMaxLat == null ||
    zone.bboxMinLng == null ||
    zone.bboxMaxLng == null
  ) {
    return null;
  }
  const G = zone.gridSize ?? DEFAULT_GRID_SIZE;
  const latRange = zone.bboxMaxLat - zone.bboxMinLat;
  const lngRange = zone.bboxMaxLng - zone.bboxMinLng;
  if (latRange <= 0 || lngRange <= 0) return null;
  const normLat = (lat - zone.bboxMinLat) / latRange;
  const normLng = (lng - zone.bboxMinLng) / lngRange;
  if (normLat < 0 || normLat >= 1 || normLng < 0 || normLng >= 1) return null;
  const row = Math.min(Math.floor(normLat * G), G - 1);
  const col = Math.min(Math.floor(normLng * G), G - 1);
  return row * G + col;
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
  if (lat >= -38.6 && lat <= -37.95 && lng >= 143.5 && lng <= 144.75) return "geelong";
  if (lat >= -38.1 && lat <= -37.5 && lng >= 144.75 && lng <= 145.5) return "melbourne";
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
    const adjacency = getTokyoAdjacency();
    const currentWard = detectWardForPoint(lat, lng, wards);
    if (currentWard) {
      targetWardIds.add(currentWard);
      const wardDef = wards.find((w) => w.id === currentWard);
      if (wardDef) {
        // Use actual polygon-edge distance, not bbox-edge distance
        const distToEdge = pointToWardEdgeDist(lat, lng, wardDef);
        if (distToEdge < PROXIMITY_DEG) {
          for (const adj of (adjacency.get(currentWard) ?? [])) targetWardIds.add(adj);
        }
      }
    } else {
      const nearby = getAdjacentWards(lat, lng, wards, PROXIMITY_DEG);
      for (const w of nearby) targetWardIds.add(w);
    }

    const [prefs] = await db
      .select({ tokyoWards: userPreferences.tokyoWards })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    for (const w of prefs?.tokyoWards ?? []) targetWardIds.add(w);

  } else if (city === "melbourne") {
    const lgas = loadMelbourneLGAs();
    const adjacency = getMelbourneAdjacency();
    const currentLGA = detectWardForPoint(lat, lng, lgas);
    if (currentLGA) {
      targetWardIds.add(currentLGA);
      const lgaDef = lgas.find((w) => w.id === currentLGA);
      if (lgaDef) {
        // Use actual polygon-edge distance, not bbox-edge distance
        const distToEdge = pointToWardEdgeDist(lat, lng, lgaDef);
        if (distToEdge < PROXIMITY_DEG) {
          for (const adj of (adjacency.get(currentLGA) ?? [])) targetWardIds.add(adj);
        }
      }
    } else {
      const nearby = getAdjacentWards(lat, lng, lgas, PROXIMITY_DEG);
      for (const w of nearby) targetWardIds.add(w);
    }
  }

  // Fallback: when the user is outside all ward boundaries (parks, rivers, station plazas,
  // boundary gaps), do a tight bounding-box query rather than dumping all city zones.
  // This keeps the payload small even in edge-case locations.
  if (targetWardIds.size === 0) {
    const r = FALLBACK_RADIUS_DEG;
    const fallbackZones = await db
      .select()
      .from(zones)
      .where(
        sql`${zones.city} = ${city}
          AND ${zones.bboxMinLat} <= ${lat + r}
          AND ${zones.bboxMaxLat} >= ${lat - r}
          AND ${zones.bboxMinLng} <= ${lng + r}
          AND ${zones.bboxMaxLng} >= ${lng - r}`
      );
    logger.debug({ city, lat, lng, count: fallbackZones.length }, "zone fallback bbox query");
    return attachCoverage(userId, fallbackZones);
  }

  // Hard cap for Tokyo: push the ordering and LIMIT into the DB so PostgreSQL
  // fetches at most TOKYO_ZONE_CAP rows rather than pulling everything into JS.
  // The distance expression is a fast cosine-corrected Euclidean approximation
  // (accurate enough for proximity ranking within a city).
  const cosLat = Math.cos(lat * (Math.PI / 180));
  const cityZones = city === "tokyo"
    ? await db
        .select()
        .from(zones)
        .where(and(eq(zones.city, city), inArray(zones.wardId, [...targetWardIds])))
        .orderBy(
          sql`(${zones.centroidLat} - ${lat})^2 + ((${zones.centroidLng} - ${lng}) * ${cosLat})^2`
        )
        .limit(TOKYO_ZONE_CAP)
    : await db
        .select()
        .from(zones)
        .where(and(eq(zones.city, city), inArray(zones.wardId, [...targetWardIds])));

  return attachCoverage(userId, cityZones);
}
