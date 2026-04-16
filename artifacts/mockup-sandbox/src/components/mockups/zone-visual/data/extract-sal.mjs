// SAL 2021 shapefile extractor — pure Node.js, no external deps
// Usage: node extract-sal.mjs <suburb-name-1> <suburb-name-2> ...
// Output: GeoJSON FeatureCollection to stdout
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHP_DIR   = path.join(__dirname, 'SAL_2021_AUST_GDA94_SHP');
const SHP_FILE  = path.join(SHP_DIR, 'SAL_2021_AUST_GDA94.shp');
const DBF_FILE  = path.join(SHP_DIR, 'SAL_2021_AUST_GDA94.dbf');

// ── DBF reader ────────────────────────────────────────────────────────────────
function readDbf(file) {
  const buf      = readFileSync(file);
  const numRecs  = buf.readUInt32LE(4);
  const hdrLen   = buf.readUInt16LE(8);
  const recLen   = buf.readUInt16LE(10);

  // Parse field descriptors (each 32 bytes, starts at offset 32)
  const fields = [];
  let offset   = 32;
  while (buf[offset] !== 0x0D && offset < hdrLen) {
    const name = buf.slice(offset, offset + 11).toString('ascii').replace(/\0/g, '').trim();
    const type = String.fromCharCode(buf[offset + 11]);
    const len  = buf[offset + 16];
    fields.push({ name, type, len });
    offset += 32;
  }

  // Parse records
  const records = [];
  let recOffset = hdrLen;
  for (let i = 0; i < numRecs; i++) {
    const deleted = buf[recOffset] === 0x2A;
    recOffset++;
    const rec = {};
    let fieldOffset = 0;
    for (const field of fields) {
      const raw = buf.slice(recOffset + fieldOffset, recOffset + fieldOffset + field.len)
                     .toString('ascii').trim();
      rec[field.name] = raw;
      fieldOffset += field.len;
    }
    records.push({ deleted, ...rec });
    recOffset += recLen - 1;
  }
  return records;
}

// ── SHP reader — polygon shapes ───────────────────────────────────────────────
function readShp(file) {
  const buf     = readFileSync(file);
  const fileLen = buf.readInt32BE(24) * 2;
  const shapes  = [];

  let offset = 100;
  let shapeIdx = 0;
  while (offset < fileLen && offset < buf.length) {
    if (offset + 8 > buf.length) break;
    // const recNum = buf.readInt32BE(offset);
    const contentLen = buf.readInt32BE(offset + 4) * 2;
    offset += 8;
    if (contentLen === 0 || offset + contentLen > buf.length) {
      shapes.push(null);
      shapeIdx++;
      offset += contentLen;
      continue;
    }
    const shapeType = buf.readInt32LE(offset);
    if (shapeType === 0) {
      shapes.push(null);
      shapeIdx++;
      offset += contentLen;
      continue;
    }
    if (shapeType !== 5 && shapeType !== 15 && shapeType !== 25) {
      // Not a polygon type we handle
      shapes.push(null);
      shapeIdx++;
      offset += contentLen;
      continue;
    }
    // Polygon: bounding box (4×8), numParts (4), numPoints (4), parts array, points array
    const numParts  = buf.readInt32LE(offset + 36);
    const numPoints = buf.readInt32LE(offset + 40);
    const parts = [];
    for (let p = 0; p < numParts; p++) {
      parts.push(buf.readInt32LE(offset + 44 + p * 4));
    }
    const ptsStart = offset + 44 + numParts * 4;
    const coords   = [];
    for (let p = 0; p < numPoints; p++) {
      const x = buf.readDoubleLE(ptsStart + p * 16);
      const y = buf.readDoubleLE(ptsStart + p * 16 + 8);
      coords.push([x, y]);
    }
    // Build rings
    const rings = [];
    for (let p = 0; p < numParts; p++) {
      const start = parts[p];
      const end   = p + 1 < numParts ? parts[p + 1] : numPoints;
      rings.push(coords.slice(start, end));
    }
    shapes.push(rings);
    shapeIdx++;
    offset += contentLen;
  }
  return shapes;
}

// ── RDP simplification ────────────────────────────────────────────────────────
function ptLineDist([x, y], [x1, y1], [x2, y2]) {
  const dx  = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.hypot(x - x1, y - y1);
  return Math.abs(dx * (y1 - y) - (x1 - x) * dy) / len;
}
function rdp(pts, eps) {
  if (pts.length <= 2) return pts;
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = ptLineDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), eps), ...rdp(pts.slice(idx), eps).slice(1)];
}
function simplify(ring, eps = 0.00008) {
  let r = ring;
  for (let e = eps; r.length > 500; e *= 1.5) r = rdp(ring, e);
  return r;
}

// ── Main ──────────────────────────────────────────────────────────────────────
function stripState(name) {
  return name.replace(/\s*\([A-Za-z.]+\)\s*$/, '').trim();
}

const TARGET_NAMES = new Set(process.argv.slice(2).map(n => n.toLowerCase()));
if (TARGET_NAMES.size === 0) {
  console.error('Usage: node extract-sal.mjs <suburb-name-1> ...');
  process.exit(1);
}

const records = readDbf(DBF_FILE);
const shapes  = readShp(SHP_FILE);

const features = [];
for (let i = 0; i < records.length; i++) {
  const rec = records[i];
  if (rec.deleted) continue;
  if (rec.STE_CODE21 !== '2') continue; // Victoria only
  const raw  = rec.SAL_NAME21 || '';
  const name = stripState(raw);
  if (!TARGET_NAMES.has(name.toLowerCase())) continue;
  const rings = shapes[i];
  if (!rings || rings.length === 0) continue;
  const outer = simplify(rings[0]);
  features.push({
    type: 'Feature',
    properties: { name },
    geometry:   { type: 'Polygon', coordinates: [outer] },
  });
}

console.log(JSON.stringify({ type: 'FeatureCollection', features }, null, 0));
