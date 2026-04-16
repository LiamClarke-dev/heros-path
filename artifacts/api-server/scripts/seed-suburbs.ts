/**
 * One-time seeding script for suburb boundaries + road segments.
 *
 * Usage:
 *   npx tsx artifacts/api-server/scripts/seed-suburbs.ts [city]
 *
 * city: "melbourne" | "san-francisco" | "tokyo" | "all" (default: "all")
 *
 * This script:
 * 1. Fetches suburb boundary polygons from OSM Overpass API
 * 2. For each suburb, fetches OSM road segments within the boundary
 * 3. Breaks each OSM way into individual node-pair segments
 * 4. Applies Douglas-Peucker simplification (ε=0.00005)
 * 5. Stores everything in the database
 */

import { db, suburbs, suburbRoadSegments } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const ROAD_TYPES =
  'way[highway~"^(residential|secondary|tertiary|unclassified|footway|path|steps)$"]';

interface OSMNode {
  id: number;
  lat: number;
  lon: number;
}

interface OSMWay {
  id: number;
  nodes: number[];
}

interface OSMElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  members?: unknown[];
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: OSMElement[];
}

interface SuburbSpec {
  city: "melbourne" | "san-francisco" | "tokyo";
  name: string;
  id: string;
  overpassQuery: string;
}

const CITIES: Record<string, SuburbSpec[]> = {
  melbourne: [
    { city: "melbourne", name: "Fitzroy",   id: "fitzroy-melbourne",   overpassQuery: `relation["name"="Fitzroy"]["admin_level"~"^(9|10)$"]["boundary"="administrative"](area.melbourne);` },
    { city: "melbourne", name: "Richmond",  id: "richmond-melbourne",  overpassQuery: `relation["name"="Richmond"]["admin_level"~"^(9|10)$"]["boundary"="administrative"](area.melbourne);` },
    { city: "melbourne", name: "Brunswick", id: "brunswick-melbourne", overpassQuery: `relation["name"="Brunswick"]["admin_level"~"^(9|10)$"]["boundary"="administrative"](area.melbourne);` },
    { city: "melbourne", name: "Carlton",   id: "carlton-melbourne",   overpassQuery: `relation["name"="Carlton"]["admin_level"~"^(9|10)$"]["boundary"="administrative"](area.melbourne);` },
    { city: "melbourne", name: "Collingwood", id: "collingwood-melbourne", overpassQuery: `relation["name"="Collingwood"]["admin_level"~"^(9|10)$"]["boundary"="administrative"](area.melbourne);` },
  ],
  "san-francisco": [
    { city: "san-francisco", name: "Noe Valley",    id: "noe-valley-sf",    overpassQuery: `relation["name"="Noe Valley"]["boundary"="administrative"](area.sf);` },
    { city: "san-francisco", name: "The Castro",    id: "castro-sf",         overpassQuery: `relation["name"="The Castro"]["boundary"="administrative"](area.sf);` },
    { city: "san-francisco", name: "Mission",       id: "mission-sf",        overpassQuery: `relation["name"="Mission District"]["boundary"="administrative"](area.sf);` },
    { city: "san-francisco", name: "Haight",        id: "haight-sf",         overpassQuery: `relation["name"="Haight-Ashbury"]["boundary"="administrative"](area.sf);` },
    { city: "san-francisco", name: "North Beach",   id: "north-beach-sf",    overpassQuery: `relation["name"="North Beach"]["boundary"="administrative"](area.sf);` },
  ],
  tokyo: [
    { city: "tokyo", name: "Shibuya", id: "shibuya-tokyo", overpassQuery: `relation["name"="渋谷区"]["admin_level"="7"]["boundary"="administrative"];` },
    { city: "tokyo", name: "Shinjuku", id: "shinjuku-tokyo", overpassQuery: `relation["name"="新宿区"]["admin_level"="7"]["boundary"="administrative"];` },
    { city: "tokyo", name: "Asakusa", id: "asakusa-tokyo", overpassQuery: `relation["name"="浅草"]["admin_level"~"^(8|9)$"]["boundary"="administrative"];` },
    { city: "tokyo", name: "Harajuku", id: "harajuku-tokyo", overpassQuery: `relation["name"="原宿"]["admin_level"~"^(8|9)$"]["boundary"="administrative"];` },
    { city: "tokyo", name: "Roppongi", id: "roppongi-tokyo", overpassQuery: `relation["name"="六本木"]["admin_level"~"^(8|9)$"]["boundary"="administrative"];` },
  ],
};

async function overpassFetch(query: string): Promise<OverpassResponse> {
  const body = `[out:json][timeout:60];\n${query}`;
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(body)}`,
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<OverpassResponse>;
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

async function fetchSuburbBoundary(spec: SuburbSpec): Promise<{
  boundary: GeoJSON.Geometry;
  centroid: { lat: number; lng: number };
} | null> {
  const query = `
    ${spec.overpassQuery.includes("area.") ? `area["name"~"Melbourne|San Francisco|Tokyo"]->.area_root;` : ""}
    (
      ${spec.overpassQuery}
    );
    out geom;
  `;

  try {
    const data = await overpassFetch(query);
    const relation = data.elements.find((e) => e.type === "relation");
    if (!relation || !relation.members) return null;

    const outerWayIds = (relation.members as Array<{ type: string; ref: number; role: string }>)
      .filter((m) => m.type === "way" && m.role === "outer")
      .map((m) => m.ref);

    const wayQuery = `
      way(id:${outerWayIds.join(",")});
      out geom;
    `;
    const wayData = await overpassFetch(wayQuery);
    const coordRings: [number, number][][] = [];

    for (const way of wayData.elements) {
      if (way.type !== "way" || !way.geometry) continue;
      const coords: [number, number][] = way.geometry.map((n) => [n.lon, n.lat]);
      coordRings.push(douglasPeucker(coords, 0.00005));
    }

    if (coordRings.length === 0) return null;

    const allCoords = coordRings.flat();
    const centroid = computeCentroid(allCoords);

    const boundary: GeoJSON.Geometry =
      coordRings.length === 1
        ? { type: "Polygon", coordinates: coordRings }
        : { type: "MultiPolygon", coordinates: coordRings.map((r) => [r]) };

    return { boundary, centroid };
  } catch (err) {
    console.error(`Failed to fetch boundary for ${spec.name}:`, err);
    return null;
  }
}

async function fetchRoadSegments(
  suburbId: string,
  boundary: GeoJSON.Geometry
): Promise<Array<{ id: string; geom: GeoJSON.LineString; osmWayId: number }>> {
  const coords =
    boundary.type === "Polygon"
      ? boundary.coordinates[0]
      : (boundary as GeoJSON.MultiPolygon).coordinates[0][0];

  const polyStr = coords.map(([lng, lat]) => `${lat} ${lng}`).join(" ");

  const query = `
    (
      ${ROAD_TYPES}(poly:"${polyStr}");
    );
    out geom;
  `;

  try {
    const data = await overpassFetch(query);
    const segments: Array<{ id: string; geom: GeoJSON.LineString; osmWayId: number }> = [];

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
          geom: {
            type: "LineString",
            coordinates: [nodes[i], nodes[i + 1]],
          },
        });
      }
    }

    return segments;
  } catch (err) {
    console.error(`Failed to fetch road segments for suburb ${suburbId}:`, err);
    return [];
  }
}

async function seedSuburb(spec: SuburbSpec): Promise<void> {
  console.log(`\nSeeding ${spec.name} (${spec.city})...`);

  const [existing] = await db
    .select({ id: suburbs.id, totalSegments: suburbs.totalSegments })
    .from(suburbs)
    .where(eq(suburbs.id, spec.id));

  if (existing && existing.totalSegments > 0) {
    console.log(`  Skipping — already seeded (${existing.totalSegments} segments)`);
    return;
  }

  const boundaryResult = await fetchSuburbBoundary(spec);
  if (!boundaryResult) {
    console.warn(`  Could not fetch boundary for ${spec.name}`);
    return;
  }

  const { boundary, centroid } = boundaryResult;

  await db
    .insert(suburbs)
    .values({
      id: spec.id,
      city: spec.city,
      name: spec.name,
      boundaryGeoJSON: boundary as Record<string, unknown>,
      centroidLat: centroid.lat,
      centroidLng: centroid.lng,
      totalSegments: 0,
    })
    .onConflictDoNothing();

  console.log(`  Boundary stored. Fetching road segments...`);

  const segments = await fetchRoadSegments(spec.id, boundary);
  console.log(`  Found ${segments.length} road segments`);

  if (segments.length === 0) {
    console.warn(`  No segments found for ${spec.name}`);
    return;
  }

  const BATCH_SIZE = 500;
  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);
    await db
      .insert(suburbRoadSegments)
      .values(
        batch.map((s) => ({
          id: s.id,
          suburbId: spec.id,
          geom: s.geom as Record<string, unknown>,
          osmWayId: s.osmWayId,
        }))
      )
      .onConflictDoNothing();
  }

  await db
    .update(suburbs)
    .set({ totalSegments: segments.length })
    .where(eq(suburbs.id, spec.id));

  console.log(`  Done: ${spec.name} — ${segments.length} segments`);
}

async function main() {
  const target = process.argv[2] ?? "all";
  const citiesToSeed =
    target === "all"
      ? Object.keys(CITIES)
      : target.split(",").map((s) => s.trim());

  console.log(`Seeding suburbs for: ${citiesToSeed.join(", ")}`);

  for (const city of citiesToSeed) {
    const specs = CITIES[city];
    if (!specs) {
      console.warn(`Unknown city: ${city}. Available: ${Object.keys(CITIES).join(", ")}`);
      continue;
    }
    for (const spec of specs) {
      await seedSuburb(spec);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log("\nSeeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
