/**
 * Generates tokyo-wards.json and melbourne-lgas.json from existing zone data.
 * Ward/LGA boundaries are computed as MultiPolygons of their constituent zone polygons
 * (not bbox rectangles), giving accurate point-in-polygon detection and boundary proximity.
 *
 * Usage: tsx artifacts/api-server/scripts/generate-ward-boundaries.ts [--fetch]
 *   --fetch  Also fetch new Melbourne suburb polygons from Overpass API
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "../src/data/zones");

type GeoRing = [number, number][];
type GeoPolygon = GeoRing[];
type GeoMultiPolygon = GeoPolygon[];

interface WardBoundaryEntry {
  id: string;
  name: string;
  nameEn?: string;
  boundary: {
    type: "MultiPolygon";
    coordinates: GeoMultiPolygon;
  };
  centroidLat: number;
  centroidLng: number;
}

function extractRings(geometry: { type: string; coordinates: unknown }): GeoRing[] {
  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates as GeoRing[];
    return rings.length > 0 ? [rings[0]] : [];
  } else if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates as GeoPolygon[];
    return polys.map((p) => p[0]).filter(Boolean);
  }
  return [];
}

function ringsToMultiPolygon(rings: GeoRing[]): {
  type: "MultiPolygon";
  coordinates: GeoMultiPolygon;
} {
  return {
    type: "MultiPolygon",
    coordinates: rings.map((r) => [r]),
  };
}

function centroidFromRings(rings: GeoRing[]): { lat: number; lng: number } {
  const lats: number[] = [];
  const lngs: number[] = [];
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lng != null && lat != null && !isNaN(lng) && !isNaN(lat)) {
        lats.push(lat);
        lngs.push(lng);
      }
    }
  }
  if (lats.length === 0) return { lat: 0, lng: 0 };
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

// ─── Tokyo ────────────────────────────────────────────────────────────────────

function generateTokyoWards(): void {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, "tokyo.json"), "utf8")) as {
    zones: Array<{
      id: string;
      name: string;
      nameEn: string;
      wardId: string;
      ring: GeoRing;
    }>;
  };

  const wardRings = new Map<string, GeoRing[]>();
  const wardNameMap = new Map<string, string>();

  for (const z of raw.zones) {
    if (!z.wardId || !z.ring || z.ring.length === 0) continue;
    if (!wardRings.has(z.wardId)) wardRings.set(z.wardId, []);
    wardRings.get(z.wardId)!.push(z.ring);

    if (z.wardId && !wardNameMap.has(z.wardId)) {
      wardNameMap.set(z.wardId, z.wardId);
    }
  }

  const wards: WardBoundaryEntry[] = [];
  for (const [wardId, rings] of wardRings) {
    const validRings = rings.filter(
      (r) => r.length >= 3 && r.every(([lng, lat]) => !isNaN(lng) && !isNaN(lat))
    );
    if (validRings.length === 0) {
      console.warn(`  Ward ${wardId}: no valid rings — skipped`);
      continue;
    }
    const centroid = centroidFromRings(validRings);
    wards.push({
      id: wardId,
      name: wardId,
      boundary: ringsToMultiPolygon(validRings),
      centroidLat: centroid.lat,
      centroidLng: centroid.lng,
    });
  }

  writeFileSync(join(DATA_DIR, "tokyo-wards.json"), JSON.stringify({ wards }, null, 2));
  console.log(
    `Generated tokyo-wards.json: ${wards.length} wards, ` +
      `${wards.reduce((n, w) => n + w.boundary.coordinates.length, 0)} total zone polygons`
  );
}

// ─── Melbourne LGA map ────────────────────────────────────────────────────────

export const MELBOURNE_LGA_MAP: Record<string, string> = {
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
  // Monash (inner southeast) - extends existing
  Clayton: "monash",
  Mulgrave: "monash",
  "Glen Waverley": "monash",
  "Mount Waverley": "monash",
  // Whitehorse (inner east) - extends existing
  "Box Hill": "whitehorse",
  Mitcham: "whitehorse",
  Vermont: "whitehorse",
  Nunawading: "whitehorse",
  Blackburn: "whitehorse",
};

const MELBOURNE_LGA_NAMES: Record<string, string> = {
  bayside: "City of Bayside",
  banyule: "City of Banyule",
  boroondara: "City of Boroondara",
  brimbank: "City of Brimbank",
  darebin: "City of Darebin",
  glen_eira: "City of Glen Eira",
  hobsons_bay: "City of Hobsons Bay",
  manningham: "City of Manningham",
  maribyrnong: "City of Maribyrnong",
  melbourne: "City of Melbourne",
  monash: "City of Monash",
  moonee_valley: "City of Moonee Valley",
  moreland: "City of Moreland",
  port_phillip: "City of Port Phillip",
  stonnington: "City of Stonnington",
  whitehorse: "City of Whitehorse",
  yarra: "City of Yarra",
};

// ─── Overpass suburb fetcher ──────────────────────────────────────────────────

const NEW_SUBURBS = [
  // Banyule
  "Heidelberg", "Ivanhoe", "Rosanna", "Greensborough", "Eaglemont",
  // Brimbank
  "Sunshine", "St Albans", "Keilor East", "Deer Park", "Sunshine West",
  // Manningham
  "Doncaster", "Templestowe", "Warrandyte", "Bulleen", "Templestowe Lower",
  // Monash (new ones, Chadstone/Oakleigh already exist → Monash above)
  "Clayton", "Mulgrave", "Glen Waverley", "Mount Waverley",
  // Whitehorse (Surrey Hills already exists above)
  "Box Hill", "Mitcham", "Vermont", "Nunawading", "Blackburn",
];

async function fetchSuburbPolygon(suburb: string): Promise<[number, number][][] | null> {
  const bbox = "-38.6,143.5,-37.0,145.5";
  const queries = [
    `[out:json][timeout:20];relation["place"="suburb"]["name"="${suburb}"](${bbox});out geom;`,
    `[out:json][timeout:20];relation["boundary"="administrative"]["name"="${suburb}"](${bbox});out geom;`,
    `[out:json][timeout:20];way["place"="suburb"]["name"="${suburb}"](${bbox});out geom;`,
  ];

  for (const query of queries) {
    try {
      const resp = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(25000),
      });
      if (!resp.ok) continue;
      const json = (await resp.json()) as {
        elements: Array<{
          type: string;
          geometry?: Array<{ lat: number; lon: number }>;
          members?: Array<{ type: string; role: string; geometry?: Array<{ lat: number; lon: number }> }>;
        }>;
      };

      for (const el of json.elements) {
        if (el.type === "relation" && el.members) {
          const rings: [number, number][][] = [];
          for (const m of el.members) {
            if (m.role !== "outer" || !m.geometry || m.geometry.length < 3) continue;
            const ring = m.geometry.map((p) => [p.lon, p.lat] as [number, number]);
            if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
              ring.push(ring[0]);
            }
            rings.push(ring);
          }
          if (rings.length > 0) return rings;
        } else if (el.type === "way" && el.geometry && el.geometry.length >= 3) {
          const ring = el.geometry.map((p) => [p.lon, p.lat] as [number, number]);
          if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
            ring.push(ring[0]);
          }
          return [ring];
        }
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("timeout")) console.warn(`  Overpass error for ${suburb} (${msg})`);
    }
  }
  return null;
}

async function fetchNewMelbourneSuburbs(): Promise<void> {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, "melbourne.json"), "utf8")) as {
    type: string;
    features: Array<{ type: string; properties: Record<string, string>; geometry: unknown }>;
  };

  const existingNames = new Set(raw.features.map((f) => f.properties["name"]));
  const toFetch = NEW_SUBURBS.filter((s) => !existingNames.has(s));

  if (toFetch.length === 0) {
    console.log("All new suburbs already in melbourne.json");
    return;
  }

  console.log(`Fetching ${toFetch.length} new suburbs from Overpass API...`);
  let added = 0;
  let failed = 0;

  for (const suburb of toFetch) {
    process.stdout.write(`  ${suburb}... `);
    const rings = await fetchSuburbPolygon(suburb);
    if (!rings || rings.length === 0) {
      console.log("not found");
      failed++;
      continue;
    }

    const geometry =
      rings.length === 1
        ? { type: "Polygon", coordinates: rings }
        : { type: "MultiPolygon", coordinates: rings.map((r) => [r]) };

    raw.features.push({
      type: "Feature",
      properties: { name: suburb },
      geometry,
    });
    console.log(`ok (${rings.length} ring${rings.length > 1 ? "s" : ""})`);
    added++;
    await new Promise((r) => setTimeout(r, 800));
  }

  writeFileSync(join(DATA_DIR, "melbourne.json"), JSON.stringify(raw, null, 2));
  console.log(`Updated melbourne.json: +${added} suburbs, ${failed} failed`);
}

// ─── Melbourne LGA boundary generator ────────────────────────────────────────

function generateMelbourneLGAs(): void {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, "melbourne.json"), "utf8")) as {
    features: Array<{
      properties: Record<string, string>;
      geometry: { type: string; coordinates: unknown };
    }>;
  };

  const lgaRings = new Map<string, GeoRing[]>();

  for (const f of raw.features) {
    const suburbName = f.properties["name"];
    const lgaId = MELBOURNE_LGA_MAP[suburbName];
    if (!lgaId) {
      console.warn(`  No LGA mapping for: ${suburbName}`);
      continue;
    }

    const rings = extractRings(f.geometry as { type: string; coordinates: unknown });
    if (!lgaRings.has(lgaId)) lgaRings.set(lgaId, []);
    for (const ring of rings) {
      const validRing = ring.filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat));
      if (validRing.length >= 3) lgaRings.get(lgaId)!.push(validRing as GeoRing);
    }
  }

  const lgas: WardBoundaryEntry[] = [];
  for (const [lgaId, rings] of lgaRings) {
    if (rings.length === 0) {
      console.warn(`  LGA ${lgaId}: no valid rings — skipped`);
      continue;
    }
    const centroid = centroidFromRings(rings);
    lgas.push({
      id: lgaId,
      name: MELBOURNE_LGA_NAMES[lgaId] ?? lgaId,
      boundary: ringsToMultiPolygon(rings),
      centroidLat: centroid.lat,
      centroidLng: centroid.lng,
    });
  }

  const output = { lgas, suburbToLga: MELBOURNE_LGA_MAP };
  writeFileSync(join(DATA_DIR, "melbourne-lgas.json"), JSON.stringify(output, null, 2));
  console.log(
    `Generated melbourne-lgas.json: ${lgas.length} LGAs, ` +
      `${lgas.reduce((n, l) => n + l.boundary.coordinates.length, 0)} total suburb polygons`
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const doFetch = process.argv.includes("--fetch");

if (doFetch) {
  await fetchNewMelbourneSuburbs();
}

generateTokyoWards();
generateMelbourneLGAs();
console.log("Done.");
process.exit(0);
