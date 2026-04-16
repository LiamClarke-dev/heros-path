/**
 * Zone seeder — loads static GeoJSON boundary files for all 4 cities into the `zones` table.
 *
 * Usage:
 *   tsx artifacts/api-server/scripts/seed-zones.ts [city|all]
 */

import { db, zones } from "@workspace/db";
import { eq, isNull, sql, inArray, notInArray } from "drizzle-orm";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "../src/data/zones");

const CELL_DEG = 0.0005;
const GRID_SIZE = 20;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

const MELBOURNE_LGA_MAP: Record<string, string> = {
  Abbotsford: "yarra",
  "Albert Park": "port_phillip",
  Alphington: "darebin",
  "Ascot Vale": "moonee_valley",
  Bentleigh: "glen_eira",
  Brighton: "bayside",
  "Brighton East": "bayside",
  Brunswick: "moreland",
  "Brunswick East": "moreland",
  Camberwell: "boroondara",
  Carlton: "melbourne",
  Carnegie: "glen_eira",
  Chadstone: "monash",
  "Clifton Hill": "yarra",
  Coburg: "moreland",
  Collingwood: "yarra",
  Cremorne: "yarra",
  Docklands: "melbourne",
  "East Melbourne": "melbourne",
  Elwood: "port_phillip",
  Fairfield: "darebin",
  Fitzroy: "yarra",
  "Fitzroy North": "yarra",
  Flemington: "moonee_valley",
  Footscray: "maribyrnong",
  "Glen Iris": "boroondara",
  Hampton: "bayside",
  Hawthorn: "boroondara",
  "Hawthorn East": "boroondara",
  Kew: "boroondara",
  Malvern: "stonnington",
  "Malvern East": "stonnington",
  "Middle Park": "port_phillip",
  "Moonee Ponds": "moonee_valley",
  Murrumbeena: "glen_eira",
  Newport: "hobsons_bay",
  "North Melbourne": "melbourne",
  Northcote: "darebin",
  Oakleigh: "monash",
  Parkville: "melbourne",
  "Port Melbourne": "port_phillip",
  Prahran: "stonnington",
  Preston: "darebin",
  Reservoir: "darebin",
  Richmond: "yarra",
  Sandringham: "bayside",
  Seddon: "maribyrnong",
  "South Melbourne": "port_phillip",
  "South Yarra": "stonnington",
  Southbank: "melbourne",
  "St Kilda": "port_phillip",
  "St Kilda East": "port_phillip",
  "Surrey Hills": "whitehorse",
  Thornbury: "darebin",
  Toorak: "stonnington",
  "West Melbourne": "melbourne",
  Williamstown: "hobsons_bay",
  Windsor: "stonnington",
  Yarraville: "maribyrnong",
  // Banyule (inner north)
  Heidelberg: "banyule",
  Ivanhoe: "banyule",
  Rosanna: "banyule",
  Greensborough: "banyule",
  Eaglemont: "banyule",
  // Brimbank (inner west)
  Sunshine: "brimbank",
  "St Albans": "brimbank",
  "Keilor East": "brimbank",
  "Deer Park": "brimbank",
  "Sunshine West": "brimbank",
  // Manningham (inner northeast)
  Doncaster: "manningham",
  Templestowe: "manningham",
  Warrandyte: "manningham",
  Bulleen: "manningham",
  "Templestowe Lower": "manningham",
  // Monash (inner/middle southeast)
  Clayton: "monash",
  Mulgrave: "monash",
  "Glen Waverley": "monash",
  "Mount Waverley": "monash",
  // Whitehorse (inner east)
  "Box Hill": "whitehorse",
  Mitcham: "whitehorse",
  Vermont: "whitehorse",
  Nunawading: "whitehorse",
  Blackburn: "whitehorse",
};

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

function computePolygonAreaDeg2(ring: [number, number][]): number {
  let area = 0;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    area += (xj + xi) * (yj - yi);
  }
  return Math.abs(area) / 2;
}

function computeZoneAreaKm2(ring: [number, number][], centroidLat: number): number {
  const deg2 = computePolygonAreaDeg2(ring);
  const latKmPerDeg = 111.32;
  const lngKmPerDeg = 111.32 * Math.cos((centroidLat * Math.PI) / 180);
  return deg2 * latKmPerDeg * lngKmPerDeg;
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

const TOKYO_AREA_THRESHOLD_KM2 = 0.08;
const TOKYO_DENSE_WARD_THRESHOLD = 40;

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

  type ZoneWithArea = ZoneRecord & { areaKm2: number };

  const allZones: ZoneWithArea[] = raw.zones.flatMap((z): ZoneWithArea[] => {
    const ring = z.ring;
    if (!ring || ring.length < 3) return [];

    const validRing = ring.filter(([lng, lat]) => lng != null && lat != null && !isNaN(lng) && !isNaN(lat));
    if (validRing.length < 3) return [];

    const closed =
      validRing[0][0] === validRing[validRing.length - 1][0] &&
      validRing[0][1] === validRing[validRing.length - 1][1]
        ? validRing
        : [...validRing, validRing[0]];

    const centroidLat = z.centroid?.[0] ?? null;
    const centroidLng = z.centroid?.[1] ?? null;

    let resolvedLat: number;
    let resolvedLng: number;

    if (centroidLat == null || centroidLng == null || isNaN(centroidLat) || isNaN(centroidLng)) {
      const lats = validRing.map((pt) => pt[1]);
      const lngs = validRing.map((pt) => pt[0]);
      resolvedLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      resolvedLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      if (isNaN(resolvedLat) || isNaN(resolvedLng)) return [];
    } else {
      resolvedLat = centroidLat;
      resolvedLng = centroidLng;
    }

    const areaKm2 = computeZoneAreaKm2(validRing, resolvedLat);

    return [{
      id: `tokyo-${z.id.replace(/\//g, "-")}`,
      city: "tokyo",
      name: z.name,
      nameEn: z.nameEn ?? null,
      wardId: z.wardId ?? null,
      boundary: { type: "Polygon", coordinates: [closed] },
      centroidLat: resolvedLat,
      centroidLng: resolvedLng,
      areaKm2,
    }];
  });

  const wardCounts = new Map<string, number>();
  for (const z of allZones) {
    if (z.wardId) wardCounts.set(z.wardId, (wardCounts.get(z.wardId) ?? 0) + 1);
  }

  const filtered = allZones.filter((z) => {
    if (!z.wardId) return true;
    const count = wardCounts.get(z.wardId) ?? 0;
    if (count > TOKYO_DENSE_WARD_THRESHOLD && z.areaKm2 < TOKYO_AREA_THRESHOLD_KM2) return false;
    return true;
  });

  const afterCounts = new Map<string, number>();
  for (const z of filtered) {
    if (z.wardId) afterCounts.set(z.wardId, (afterCounts.get(z.wardId) ?? 0) + 1);
  }

  console.log(`Tokyo: ${allZones.length} zones → ${filtered.length} after area filter`);
  for (const [wardId, before] of wardCounts) {
    const after = afterCounts.get(wardId) ?? 0;
    if (before !== after) console.log(`  Ward ${wardId}: ${before} → ${after}`);
  }

  return filtered;
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

    const wardId = city === "melbourne" ? (MELBOURNE_LGA_MAP[name] ?? null) : null;

    return {
      id: `${prefix}-${slug}`,
      city,
      name,
      nameEn: null,
      wardId,
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
      .select({ id: zones.id, bboxMinLat: zones.bboxMinLat, wardId: zones.wardId, gridSize: zones.gridSize })
      .from(zones)
      .where(eq(zones.id, rec.id));

    const bbox = computeBBox(rec.boundary);

    if (existing) {
      const needsBboxUpdate = existing.bboxMinLat == null;
      const needsWardUpdate = existing.wardId == null && rec.wardId != null;
      const needsGridUpdate = existing.gridSize == null || existing.gridSize < 1;

      if (needsBboxUpdate || needsWardUpdate || needsGridUpdate) {
        await db
          .update(zones)
          .set({
            ...(needsBboxUpdate
              ? {
                  bboxMinLat: bbox.minLat,
                  bboxMaxLat: bbox.maxLat,
                  bboxMinLng: bbox.minLng,
                  bboxMaxLng: bbox.maxLng,
                }
              : {}),
            ...(needsWardUpdate ? { wardId: rec.wardId } : {}),
            ...(needsGridUpdate ? { gridSize: GRID_SIZE, totalCells: TOTAL_CELLS } : {}),
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
      totalCells: TOTAL_CELLS,
      bboxMinLat: bbox.minLat,
      bboxMaxLat: bbox.maxLat,
      bboxMinLng: bbox.minLng,
      bboxMaxLng: bbox.maxLng,
      gridSize: GRID_SIZE,
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

    if (city === "tokyo") {
      const validIds = records.map((r) => r.id);
      const existing = await db
        .select({ id: zones.id })
        .from(zones)
        .where(eq(zones.city, "tokyo"));
      const toDelete = existing.map((r) => r.id).filter((id) => !validIds.includes(id));
      if (toDelete.length > 0) {
        console.log(`Removing ${toDelete.length} filtered-out Tokyo zones from DB...`);
        for (let i = 0; i < toDelete.length; i += 100) {
          await db.delete(zones).where(inArray(zones.id, toDelete.slice(i, i + 100)));
        }
      }
    }
  }

  console.log("\nSeeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
