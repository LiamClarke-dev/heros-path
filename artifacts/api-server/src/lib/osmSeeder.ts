/**
 * On-demand OSM seeder: fetches chōme-level (admin_level=9) suburb boundaries
 * from Overpass API for a given bounding box and persists them to the DB.
 *
 * Used by:
 *  - seed-suburbs.ts  (offline / CLI)
 *  - map.ts           (on-demand when viewport returns zero suburbs)
 */

import { db, suburbs, suburbRoadSegments } from "@workspace/db";
import { eq } from "drizzle-orm";
import logger from "../logger.js";

type GeoCoord = [number, number];
type GeoRing = GeoCoord[];

interface GeoPolygon {
  type: "Polygon";
  coordinates: GeoRing[];
}

interface GeoMultiPolygon {
  type: "MultiPolygon";
  coordinates: GeoRing[][];
}

interface GeoLineString {
  type: "LineString";
  coordinates: GeoCoord[];
}

type GeoGeometry = GeoPolygon | GeoMultiPolygon | GeoLineString;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const ROAD_TYPES =
  'way[highway~"^(residential|secondary|tertiary|unclassified|footway|path|steps)$"]';

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface OSMRelationMember {
  type: string;
  ref: number;
  role: string;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OSMElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  members?: OSMRelationMember[];
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: OSMElement[];
}

async function overpassFetch(query: string, timeoutSec = 60): Promise<OverpassResponse> {
  const body = `[out:json][timeout:${timeoutSec}];\n${query}`;
  const encoded = `data=${encodeURIComponent(body)}`;
  const lastErr: Error[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encoded,
        signal: AbortSignal.timeout((timeoutSec + 15) * 1000),
      });
      if (!res.ok) {
        lastErr.push(new Error(`${endpoint} HTTP ${res.status}`));
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return res.json() as Promise<OverpassResponse>;
    } catch (err) {
      lastErr.push(err as Error);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastErr[lastErr.length - 1] ?? new Error("All Overpass endpoints failed");
}

function douglasPeucker(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);

  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    let d: number;
    if (len === 0) {
      d = Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
    } else {
      d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
    }
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

function computeCentroid(coords: [number, number][]): { lat: number; lng: number } {
  const lats = coords.map(([, lat]) => lat);
  const lngs = coords.map(([lng]) => lng);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
}

function inferCity(lat: number, lng: number): string {
  if (lat >= 35.0 && lat <= 36.5 && lng >= 138.5 && lng <= 140.5) return "tokyo";
  if (lat >= -38.5 && lat <= -37.0 && lng >= 144.0 && lng <= 145.5) return "melbourne";
  if (lat >= 37.0 && lat <= 38.0 && lng >= -123.0 && lng <= -122.0) return "san-francisco";
  return "unknown";
}

/**
 * Fetch all admin_level=9 chōme relations within a bounding box.
 * Returns parsed boundary geometry per relation.
 */
export async function fetchChomelevelSuburbs(bbox: BBox): Promise<
  Array<{
    osmRelationId: number;
    name: string;
    boundary: GeoGeometry;
    centroid: { lat: number; lng: number };
  }>
> {
  const { south, west, north, east } = bbox;
  const bboxStr = `${south},${west},${north},${east}`;

  const query = `
    relation["admin_level"="9"]["boundary"="administrative"](${bboxStr});
    out body geom;
  `;

  let data: OverpassResponse;
  try {
    data = await overpassFetch(query, 90);
  } catch (err) {
    logger.warn({ err, bbox }, "OSM chōme fetch failed");
    return [];
  }

  const results: Array<{
    osmRelationId: number;
    name: string;
    boundary: GeoGeometry;
    centroid: { lat: number; lng: number };
  }> = [];

  for (const el of data.elements) {
    if (el.type !== "relation" || !el.members) continue;

    const name =
      el.tags?.["name:en"] ??
      el.tags?.["name"] ??
      `choume-${el.id}`;

    const outerMembers = el.members.filter(
      (m) => m.type === "way" && m.role === "outer" && m.geometry && m.geometry.length >= 2
    );

    if (outerMembers.length === 0) continue;

    const coordRings: [number, number][][] = outerMembers.map((m) => {
      const raw: [number, number][] = m.geometry!.map((n) => [n.lon, n.lat]);
      return douglasPeucker(raw, 0.00005);
    });

    const allCoords = coordRings.flat();
    if (allCoords.length === 0) continue;

    const centroid = computeCentroid(allCoords);

    const boundary: GeoGeometry =
      coordRings.length === 1
        ? { type: "Polygon", coordinates: coordRings }
        : { type: "MultiPolygon", coordinates: coordRings.map((r) => [r]) };

    results.push({ osmRelationId: el.id, name, boundary, centroid });
  }

  return results;
}

async function fetchRoadSegmentsForBoundary(
  suburbId: string,
  boundary: GeoGeometry
): Promise<Array<{ id: string; geom: GeoLineString; osmWayId: number }>> {
  const coords: GeoCoord[] =
    boundary.type === "Polygon"
      ? (boundary as GeoPolygon).coordinates[0]
      : (boundary as GeoMultiPolygon).coordinates[0][0];

  const polyStr = coords.map(([lng, lat]: GeoCoord) => `${lat} ${lng}`).join(" ");

  const query = `
    (
      ${ROAD_TYPES}(poly:"${polyStr}");
    );
    out geom;
  `;

  try {
    const data = await overpassFetch(query, 60);
    const segments: Array<{ id: string; geom: GeoLineString; osmWayId: number }> = [];

    for (const el of data.elements) {
      if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;

      const nodes = douglasPeucker(
        el.geometry.map((n) => [n.lon, n.lat] as [number, number]),
        0.00005
      );

      for (let i = 0; i < nodes.length - 1; i++) {
        segments.push({
          id: `${el.id}_${i}`,
          osmWayId: el.id,
          geom: { type: "LineString", coordinates: [nodes[i], nodes[i + 1]] },
        });
      }
    }

    return segments;
  } catch (err) {
    logger.warn({ err, suburbId }, "Road segment fetch failed");
    return [];
  }
}

/**
 * Seed a single chōme relation into the DB (idempotent via onConflictDoNothing).
 * Returns the number of road segments stored (0 if skipped).
 */
export async function seedOneChoume(
  osmRelationId: number,
  name: string,
  city: string,
  boundary: GeoGeometry,
  centroid: { lat: number; lng: number }
): Promise<number> {
  const id = `choume-${osmRelationId}`;

  const [existing] = await db
    .select({ totalSegments: suburbs.totalSegments })
    .from(suburbs)
    .where(eq(suburbs.id, id));

  if (existing && existing.totalSegments > 0) {
    return 0;
  }

  await db
    .insert(suburbs)
    .values({
      id,
      city: city as "tokyo" | "melbourne" | "san-francisco",
      name,
      boundaryGeoJSON: boundary as unknown as Record<string, unknown>,
      centroidLat: centroid.lat,
      centroidLng: centroid.lng,
      totalSegments: 0,
    })
    .onConflictDoNothing();

  const segments = await fetchRoadSegmentsForBoundary(id, boundary);
  if (segments.length === 0) return 0;

  const BATCH_SIZE = 500;
  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);
    await db
      .insert(suburbRoadSegments)
      .values(
        batch.map((s) => ({
          id: s.id,
          suburbId: id,
          geom: s.geom as unknown as Record<string, unknown>,
          osmWayId: s.osmWayId,
        }))
      )
      .onConflictDoNothing();
  }

  await db.update(suburbs).set({ totalSegments: segments.length }).where(eq(suburbs.id, id));

  return segments.length;
}

const seedingLocks = new Set<string>();

/**
 * On-demand: seed chōme-level suburbs for a viewport bounding box.
 * Idempotent — skips already-seeded relations, and uses an in-memory lock
 * to prevent concurrent duplicate seeding of the same area.
 *
 * Returns the number of new suburb records inserted.
 */
export async function seedSuburbsForViewport(
  swLat: number,
  swLng: number,
  neLat: number,
  neLng: number
): Promise<number> {
  const lockKey = `${(swLat * 20).toFixed(0)},${(swLng * 20).toFixed(0)},${(neLat * 20).toFixed(0)},${(neLng * 20).toFixed(0)}`;

  if (seedingLocks.has(lockKey)) {
    logger.info({ lockKey }, "On-demand seed already in progress, skipping");
    return 0;
  }

  seedingLocks.add(lockKey);

  try {
    const bbox: BBox = { south: swLat, west: swLng, north: neLat, east: neLng };
    const chomes = await fetchChomelevelSuburbs(bbox);

    if (chomes.length === 0) {
      logger.info({ bbox }, "No chōme relations found in bbox");
      return 0;
    }

    const centerLat = (swLat + neLat) / 2;
    const centerLng = (swLng + neLng) / 2;
    const city = inferCity(centerLat, centerLng);

    let totalSeeded = 0;
    for (const chome of chomes) {
      try {
        const segCount = await seedOneChoume(
          chome.osmRelationId,
          chome.name,
          city,
          chome.boundary,
          chome.centroid
        );
        if (segCount > 0) {
          totalSeeded++;
          logger.info({ name: chome.name, segCount }, "Seeded chōme on-demand");
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        logger.warn({ err, name: chome.name }, "Failed to seed chōme on-demand");
      }
    }

    return totalSeeded;
  } finally {
    seedingLocks.delete(lockKey);
  }
}
