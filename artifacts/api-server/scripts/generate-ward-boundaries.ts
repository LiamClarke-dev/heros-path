/**
 * Generates tokyo-wards.json and melbourne-lgas.json from existing zone data.
 * Ward/LGA boundaries are computed as bounding box polygons of their constituent zones.
 *
 * Usage: tsx artifacts/api-server/scripts/generate-ward-boundaries.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "../src/data/zones");

interface BBoxPoly {
  id: string;
  name: string;
  nameEn?: string;
  boundary: { type: "Polygon"; coordinates: [number, number][][] };
  centroidLat: number;
  centroidLng: number;
}

function bboxToPolygon(
  minLat: number, maxLat: number, minLng: number, maxLng: number
): [number, number][] {
  const padLat = (maxLat - minLat) * 0.02;
  const padLng = (maxLng - minLng) * 0.02;
  const n = maxLat + padLat;
  const s = minLat - padLat;
  const e = maxLng + padLng;
  const w = minLng - padLng;
  return [[w, s], [e, s], [e, n], [w, n], [w, s]];
}

function computeWardBoundaries(
  zones: Array<{ wardId: string; wardNameEn?: string; ring: [number, number][] }>
): BBoxPoly[] {
  const wardMap = new Map<string, { lats: number[]; lngs: number[] }>();

  for (const z of zones) {
    if (!z.wardId || !z.ring) continue;
    let entry = wardMap.get(z.wardId);
    if (!entry) {
      entry = { lats: [], lngs: [] };
      wardMap.set(z.wardId, entry);
    }
    for (const [lng, lat] of z.ring) {
      if (lng == null || lat == null || isNaN(lng) || isNaN(lat)) continue;
      entry.lats.push(lat);
      entry.lngs.push(lng);
    }
  }

  const wards: BBoxPoly[] = [];
  for (const [wardId, { lats, lngs }] of wardMap) {
    if (lats.length === 0 || lngs.length === 0) {
      console.warn(`Ward ${wardId} has no valid coordinates — skipped`);
      continue;
    }
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centroidLat = (minLat + maxLat) / 2;
    const centroidLng = (minLng + maxLng) / 2;
    wards.push({
      id: wardId,
      name: wardId,
      boundary: {
        type: "Polygon",
        coordinates: [bboxToPolygon(minLat, maxLat, minLng, maxLng)],
      },
      centroidLat,
      centroidLng,
    });
  }
  return wards;
}

function generateTokyoWards(): void {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, "tokyo.json"), "utf8")) as {
    zones: Array<{
      id: string;
      name: string;
      nameEn: string;
      wardId: string;
      ring: [number, number][];
    }>;
  };

  const wards = computeWardBoundaries(raw.zones);
  const output = { wards };
  writeFileSync(join(DATA_DIR, "tokyo-wards.json"), JSON.stringify(output, null, 2));
  console.log(`Generated tokyo-wards.json with ${wards.length} wards`);
}

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
  Chadstone: "glen_eira",
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
  Oakleigh: "glen_eira",
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
  "Surrey Hills": "boroondara",
  Thornbury: "darebin",
  Toorak: "stonnington",
  "West Melbourne": "melbourne",
  Williamstown: "hobsons_bay",
  Windsor: "stonnington",
  Yarraville: "maribyrnong",
};

const MELBOURNE_LGA_NAMES: Record<string, string> = {
  bayside: "City of Bayside",
  boroondara: "City of Boroondara",
  darebin: "City of Darebin",
  glen_eira: "City of Glen Eira",
  hobsons_bay: "City of Hobsons Bay",
  maribyrnong: "City of Maribyrnong",
  melbourne: "City of Melbourne",
  moonee_valley: "City of Moonee Valley",
  moreland: "City of Moreland",
  port_phillip: "City of Port Phillip",
  stonnington: "City of Stonnington",
  yarra: "City of Yarra",
};

function generateMelbourneLGAs(): void {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, "melbourne.json"), "utf8")) as {
    features: Array<{
      properties: Record<string, string>;
      geometry: { type: string; coordinates: unknown };
    }>;
  };

  const lgaMap = new Map<string, { lats: number[]; lngs: number[] }>();

  for (const f of raw.features) {
    const suburbName = f.properties["name"];
    const lgaId = MELBOURNE_LGA_MAP[suburbName];
    if (!lgaId) {
      console.warn(`  No LGA mapping for Melbourne suburb: ${suburbName}`);
      continue;
    }

    const coords: [number, number][] =
      f.geometry.type === "Polygon"
        ? (f.geometry.coordinates as [number, number][][]).flat()
        : (f.geometry.coordinates as [number, number][][][]).flat(2);

    let entry = lgaMap.get(lgaId);
    if (!entry) {
      entry = { lats: [], lngs: [] };
      lgaMap.set(lgaId, entry);
    }
    for (const [lng, lat] of coords) {
      entry.lats.push(lat);
      entry.lngs.push(lng);
    }
  }

  const lgas: BBoxPoly[] = [];
  for (const [lgaId, { lats, lngs }] of lgaMap) {
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    lgas.push({
      id: lgaId,
      name: MELBOURNE_LGA_NAMES[lgaId] ?? lgaId,
      boundary: {
        type: "Polygon",
        coordinates: [bboxToPolygon(minLat, maxLat, minLng, maxLng)],
      },
      centroidLat: (minLat + maxLat) / 2,
      centroidLng: (minLng + maxLng) / 2,
    });
  }

  const output = { lgas, suburbToLga: MELBOURNE_LGA_MAP };
  writeFileSync(join(DATA_DIR, "melbourne-lgas.json"), JSON.stringify(output, null, 2));
  console.log(`Generated melbourne-lgas.json with ${lgas.length} LGAs`);
}

generateTokyoWards();
generateMelbourneLGAs();
console.log("Done.");
process.exit(0);
