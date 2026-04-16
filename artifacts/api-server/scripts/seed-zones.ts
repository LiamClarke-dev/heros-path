/**
 * Zone seeder — loads static GeoJSON boundary files for all 4 cities into the `zones` table.
 *
 * Usage:
 *   tsx artifacts/api-server/scripts/seed-zones.ts [city|all]
 */

import { db, zones } from "@workspace/db";
import { eq, isNull, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "../src/data/zones");

const CELL_DEG = 0.0005;

function pointInPolygon(lng: number, lat: number, ring: [number, number][]): boolean {
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

interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function computeBBox(boundary: { type: string; coordinates: unknown }): BBox {
  let allCoords: [number, number][] = [];

  if (boundary.type === "Polygon") {
    allCoords = (boundary.coordinates as [number, number][][]).flat();
  } else if (boundary.type === "MultiPolygon") {
    allCoords = (boundary.coordinates as [number, number][][][]).flat(2);
  }

  const lngs = allCoords.map(([lng]) => lng);
  const lats = allCoords.map(([, lat]) => lat);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function computeTotalCells(boundary: { type: string; coordinates: unknown }, bbox: BBox): number {
  let rings: [number, number][][] = [];

  if (boundary.type === "Polygon") {
    rings = [(boundary.coordinates as [number, number][][])[0]];
  } else if (boundary.type === "MultiPolygon") {
    rings = (boundary.coordinates as [number, number][][][]).map((poly) => poly[0]);
  }

  if (rings.length === 0) return 1;

  let count = 0;
  for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += CELL_DEG) {
    for (let lng = bbox.minLng; lng <= bbox.maxLng; lng += CELL_DEG) {
      const cellCenterLat = lat + CELL_DEG / 2;
      const cellCenterLng = lng + CELL_DEG / 2;
      const inAny = rings.some((ring) => pointInPolygon(cellCenterLng, cellCenterLat, ring));
      if (inAny) count++;
    }
  }
  return Math.max(count, 1);
}

interface ZoneRecord {
  id: string;
  city: string;
  name: string;
  nameEn: string | null;
  wardId: string | null;
  boundary: { type: string; coordinates: unknown };
  centroidLat: number;
  centroidLng: number;
}

function loadTokyo(): ZoneRecord[] {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, "tokyo.json"), "utf8")) as {
    zones: Array<{
      id: string;
      name: string;
      nameEn: string;
      wardId: string;
      centroid: [number, number] | null;
      ring: [number, number][];
    }>;
  };

  return raw.zones.map((z): ZoneRecord | null => {
    const ring = z.ring;
    if (!ring || ring.length < 3) return null;

    const closed =
      ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
        ? ring
        : [...ring, ring[0]];

    const centroidLat = z.centroid?.[0] ?? null;
    const centroidLng = z.centroid?.[1] ?? null;

    let resolvedLat: number;
    let resolvedLng: number;

    if (centroidLat == null || centroidLng == null || isNaN(centroidLat) || isNaN(centroidLng)) {
      const lats = ring.map((pt) => pt[1]);
      const lngs = ring.map((pt) => pt[0]);
      resolvedLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      resolvedLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      if (isNaN(resolvedLat) || isNaN(resolvedLng)) return null;
    } else {
      resolvedLat = centroidLat;
      resolvedLng = centroidLng;
    }

    return {
      id: `tokyo-${z.id.replace(/\//g, "-")}`,
      city: "tokyo",
      name: z.name,
      nameEn: z.nameEn ?? null,
      wardId: z.wardId ?? null,
      boundary: { type: "Polygon", coordinates: [closed] },
      centroidLat: resolvedLat,
      centroidLng: resolvedLng,
    };
  }).filter((z): z is ZoneRecord => z !== null);
}

function loadGeoJsonCity(city: string, filename: string, nameKey: string): ZoneRecord[] {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, filename), "utf8")) as {
    features: Array<{
      properties: Record<string, string>;
      geometry: { type: string; coordinates: unknown };
    }>;
  };

  const prefix = city === "san_francisco" ? "sf" : city === "melbourne" ? "mel" : "geo";

  return raw.features.map((f, idx) => {
    const name = f.properties[nameKey] ?? f.properties["name"] ?? `Zone ${idx + 1}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const coords: [number, number][] =
      f.geometry.type === "Polygon"
        ? (f.geometry.coordinates as [number, number][][]).flat()
        : (f.geometry.coordinates as [number, number][][][]).flat(2);

    const lngs = coords.map(([lng]) => lng);
    const lats = coords.map(([, lat]) => lat);
    const centroidLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centroidLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    return {
      id: `${prefix}-${slug}`,
      city,
      name,
      nameEn: null,
      wardId: null,
      boundary: f.geometry as { type: string; coordinates: unknown },
      centroidLat,
      centroidLng,
    };
  });
}

async function seedCity(city: string, records: ZoneRecord[]): Promise<void> {
  console.log(`\nSeeding ${city} (${records.length} zones)...`);
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const rec of records) {
    const [existing] = await db
      .select({ id: zones.id, bboxMinLat: zones.bboxMinLat })
      .from(zones)
      .where(eq(zones.id, rec.id));

    const bbox = computeBBox(rec.boundary);
    const totalCells = computeTotalCells(rec.boundary, bbox);

    if (existing) {
      if (existing.bboxMinLat == null) {
        await db
          .update(zones)
          .set({
            bboxMinLat: bbox.minLat,
            bboxMaxLat: bbox.maxLat,
            bboxMinLng: bbox.minLng,
            bboxMaxLng: bbox.maxLng,
            gridSize: CELL_DEG,
            totalCells,
          })
          .where(eq(zones.id, rec.id));
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    await db.insert(zones).values({
      id: rec.id,
      city: rec.city,
      name: rec.name,
      nameEn: rec.nameEn,
      wardId: rec.wardId,
      boundaryGeoJSON: rec.boundary as unknown as Record<string, unknown>,
      centroidLat: rec.centroidLat,
      centroidLng: rec.centroidLng,
      totalCells,
      bboxMinLat: bbox.minLat,
      bboxMaxLat: bbox.maxLat,
      bboxMinLng: bbox.minLng,
      bboxMaxLng: bbox.maxLng,
      gridSize: CELL_DEG,
    });

    inserted++;
    if (inserted % 50 === 0) {
      console.log(`  ${inserted}/${records.length} seeded...`);
    }
  }

  console.log(`  Done: ${inserted} inserted, ${updated} bbox-updated, ${skipped} already complete`);
}

async function main() {
  const target = process.argv[2] ?? "all";
  const cities =
    target === "all"
      ? ["tokyo", "melbourne", "geelong", "san_francisco"]
      : target.split(",").map((s) => s.trim());

  for (const city of cities) {
    let records: ZoneRecord[];
    switch (city) {
      case "tokyo":
        records = loadTokyo();
        break;
      case "melbourne":
        records = loadGeoJsonCity("melbourne", "melbourne.json", "name");
        break;
      case "geelong":
        records = loadGeoJsonCity("geelong", "geelong.json", "name");
        break;
      case "san_francisco":
        records = loadGeoJsonCity("san_francisco", "sf.json", "nhood");
        break;
      default:
        console.warn(`Unknown city: ${city}`);
        continue;
    }
    await seedCity(city, records);
  }

  console.log("\nSeeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
