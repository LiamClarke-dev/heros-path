/**
 * ZoneMap – Territory Zones Visual Prototype
 *
 * Data strategy:
 *  - Melbourne: runtime Overpass fetch (place=suburb, inner suburbs).
 *    Falls back to pre-fetched static JSON if Overpass is unavailable.
 *  - San Francisco: runtime Overpass fetch (place=neighbourhood).
 *    Falls back to SF Open Data static JSON (41 zones) if Overpass returns
 *    fewer than 20 features (OSM SF neighbourhood coverage is sparse: ~8 entries).
 *  - Tokyo: OSM place=neighbourhood in Tokyo returns ~260 chōme (丁目) micro-
 *    subdivisions, not the recognisable named areas. Overpass cannot supply the
 *    right data. Instead, pre-processed OSM admin_level=9 boundaries are
 *    fetched from a local static asset (ward-grouped, 1 057 zones total),
 *    then filtered client-side to a single ward (~22–40 zones) matching the
 *    user's location — exactly the ward-based approach agreed with the user.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fallback static data (used when Overpass is rate-limited / unreachable)
import melbourneFallback from "./data/melbourne.json";
import sfFallback        from "./data/sf.json";

// ── BotW palette ──────────────────────────────────────────────────────────────
const C = {
  bg:      "#0D1A10",
  surface: "#152218",
  card:    "#1D2E1F",
  border:  "#2C4030",
  primary: "#9FC184",
  gold:    "#F9F4CE",
  text:    "#F9F4CE",
  muted:   "#86A5A9",
  blue:    "#97C8D9",
} as const;

// ── Domain types ──────────────────────────────────────────────────────────────
type ZoneState = "complete" | "progress" | "untouched";
type CityKey   = "tokyo" | "melbourne" | "sanfrancisco";

interface Zone {
  name:  string;
  ring:  Array<[number, number]>;  // GeoJSON [lng, lat] pairs
}

interface TokyoWard {
  id:   string;
  name: string;
  en:   string;
  lat:  number;
  lng:  number;
}
interface TokyoRawZone {
  id:       string;
  name:     string;
  nameEn:   string;
  wardId:   string;
  wardName: string;
  centroid: [number, number];
  ring:     Array<[number, number]>;
}
interface TokyoDataFile {
  wards: TokyoWard[];
  zones: TokyoRawZone[];
}

// ── Overpass types ────────────────────────────────────────────────────────────
interface OverpassMember {
  type:      string;
  ref:       number;
  role:      string;
  geometry?: Array<{ lat: number; lon: number }>;
}
interface OverpassElement {
  type:      "way" | "relation" | string;
  id:        number;
  tags?:     Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  members?:  OverpassMember[];
}
interface OverpassResponse {
  version:  number;
  elements: OverpassElement[];
}

// ── Melbourne fallback GeoJSON types ─────────────────────────────────────────
interface MelbourneProps { name: string }
interface SFProps        { nhood: string }

// ── Overpass helpers ──────────────────────────────────────────────────────────
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

async function overpassFetch(query: string): Promise<OverpassResponse> {
  const body = new URLSearchParams({ data: query });
  const resp = await fetch(OVERPASS_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
  const json: unknown = await resp.json();
  return json as OverpassResponse;
}

function elementToRing(el: OverpassElement): Array<[number, number]> | null {
  let pts: Array<{ lat: number; lon: number }> | undefined;
  if (el.type === "way") {
    pts = el.geometry;
  } else if (el.type === "relation") {
    const outer = el.members?.find(m => m.role === "outer" && m.geometry && m.geometry.length > 3);
    pts = outer?.geometry;
  }
  if (!pts || pts.length < 4) return null;
  const ring: Array<[number, number]> = pts.map(p => [p.lon, p.lat]);
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push(ring[0]);
  }
  return ring;
}

// ── Melbourne ─────────────────────────────────────────────────────────────────
const MELBOURNE_TARGET = new Set([
  "Fitzroy","Collingwood","Richmond","Carlton","Brunswick","Fitzroy North",
  "Northcote","Abbotsford","Cremorne","Windsor","South Yarra","Prahran",
  "St Kilda","Thornbury","Clifton Hill","Hawthorn","Kew","East Melbourne",
  "North Melbourne","West Melbourne","Southbank","Parkville","Alphington",
  "Fairfield","Docklands",
]);

async function fetchMelbourneZones(): Promise<Zone[]> {
  const query = `[out:json][timeout:30];
(way["place"="suburb"](-37.87,144.90,-37.74,145.05);
 relation["place"="suburb"](-37.87,144.90,-37.74,145.05););
out body geom;`;
  try {
    const data = await overpassFetch(query);
    const zones: Zone[] = [];
    for (const el of data.elements) {
      const name = el.tags?.name ?? "";
      if (!MELBOURNE_TARGET.has(name)) continue;
      const ring = elementToRing(el);
      if (ring) zones.push({ name, ring });
    }
    // Deduplicate by name
    const seen = new Set<string>();
    const deduped = zones.filter(z => { if (seen.has(z.name)) return false; seen.add(z.name); return true; });
    if (deduped.length >= 15) return deduped;
    throw new Error("Overpass returned too few Melbourne features");
  } catch {
    // Fall back to pre-fetched static data
    return (melbourneFallback as { type: string; features: Array<{ properties: MelbourneProps; geometry: { type: string; coordinates: Array<Array<[number,number]>> } }> })
      .features
      .map(f => ({ name: f.properties.name, ring: f.geometry.coordinates[0] }));
  }
}

// ── San Francisco ─────────────────────────────────────────────────────────────
async function fetchSFZones(): Promise<Zone[]> {
  const query = `[out:json][timeout:30];
(way["place"="neighbourhood"](37.70,-122.52,37.82,-122.36);
 relation["place"="neighbourhood"](37.70,-122.52,37.82,-122.36););
out body geom;`;
  try {
    const data = await overpassFetch(query);
    const zones: Zone[] = [];
    for (const el of data.elements) {
      const name = el.tags?.name ?? "";
      if (!name) continue;
      const ring = elementToRing(el);
      if (ring) zones.push({ name, ring });
    }
    // SF OSM has ~8 entries — accept if a reasonable count came back, else use fallback
    if (zones.length >= 20) return zones;
    throw new Error(`Overpass returned only ${zones.length} SF zones — using static fallback`);
  } catch {
    return (sfFallback as { type: string; features: Array<{ properties: SFProps; geometry: { type: string; coordinates: Array<Array<[number,number]>> } }> })
      .features
      .map(f => ({ name: f.properties.nhood, ring: f.geometry.coordinates[0] }));
  }
}

// ── Tokyo (ward-based, static asset) ─────────────────────────────────────────
// Wards shown in the selector — all have 22–39 zones, within the 25–40 target
const DISPLAY_WARDS = ["shibuya", "meguro", "minato", "shinjuku", "nakano", "toshima"];
const WARD_LABEL: Record<string, string> = {
  shibuya:  "渋谷区 Shibuya",
  meguro:   "目黒区 Meguro",
  minato:   "港区 Minato",
  shinjuku: "新宿区 Shinjuku",
  nakano:   "中野区 Nakano",
  toshima:  "豊島区 Toshima",
};
const WARD_ADJACENT: Record<string, string[]> = {
  shibuya:  ["meguro", "minato"],
  meguro:   ["shibuya", "shinagawa"],
  minato:   ["shibuya", "chiyoda"],
  shinjuku: ["shibuya", "nakano", "toshima"],
  nakano:   ["shinjuku", "suginami"],
  toshima:  ["shinjuku", "itabashi"],
};

async function fetchTokyoData(): Promise<TokyoDataFile> {
  // Fetch the pre-processed admin-level-9 static asset at runtime
  const url = new URL("./data/tokyo-processed.json", import.meta.url);
  const resp = await fetch(url.href);
  return (await resp.json()) as TokyoDataFile;
}

// ── Demo completion states ────────────────────────────────────────────────────
const DEMO: Record<string, [ZoneState, number]> = {
  // Shibuya
  "Tomigaya":    ["complete", 1], "Jingumae":    ["complete", 1],
  "Shibuya":     ["progress", 0.61], "Hiroo":       ["progress", 0.45],
  "Dōgenzaka":   ["progress", 0.78], "Udagawachō":  ["progress", 0.33],
  "Kamiyamachō": ["progress", 0.52], "Shōtō":       ["progress", 0.20],
  // Meguro
  "Naka-Meguro":  ["complete", 1], "Daikanyamacho": ["complete", 1],
  "Ebisu":        ["progress", 0.71], "Ebisu-Minami": ["progress", 0.44],
  "Aobadai":      ["progress", 0.28],
  // Melbourne
  "Fitzroy":       ["complete", 1], "Collingwood":   ["complete", 1],
  "Richmond":      ["progress", 0.71], "Carlton":       ["progress", 0.47],
  "Brunswick":     ["progress", 0.28], "Fitzroy North": ["progress", 0.55],
  "Abbotsford":    ["progress", 0.38], "Clifton Hill":  ["progress", 0.18],
  // SF
  "Mission":          ["complete", 1],  "Castro":           ["complete", 1],
  "Noe Valley":       ["progress", 0.67], "Hayes Valley":     ["progress", 0.43],
  "Bernal Heights":   ["progress", 0.58], "Inner Sunset":     ["progress", 0.31],
  "Lower Haight":     ["progress", 0.49], "Glen Park":        ["progress", 0.22],
};

function stateOf(name: string): [ZoneState, number] {
  return DEMO[name.trim()] ?? ["untouched", 0];
}

// ── Map styles ────────────────────────────────────────────────────────────────
function leafletStyle(state: ZoneState, pct: number): L.PathOptions {
  switch (state) {
    case "complete":
      return { fillColor: C.gold, fillOpacity: 0.55, color: C.gold, weight: 2, opacity: 0.9 };
    case "progress":
      return { fillColor: C.primary, fillOpacity: 0.10 + pct * 0.32, color: C.primary, weight: 1.5, opacity: 0.85 };
    default:
      return { fillColor: "transparent", fillOpacity: 0, color: "rgba(159,193,132,0.30)", weight: 1, opacity: 0.7 };
  }
}

function tipHtml(name: string, state: ZoneState, pct: number): string {
  const col   = state === "complete" ? C.gold : state === "progress" ? C.primary : C.muted;
  const badge = state === "complete" ? "100%  ✓" : state === "progress" ? `${Math.round(pct * 100)}%` : "0%";
  return `<div style="background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:5px 10px;font-family:system-ui,sans-serif">
    <div style="color:${C.text};font-weight:600;font-size:12px">${name}</div>
    <div style="color:${col};font-size:10px;margin-top:1px">${badge}</div>
  </div>`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{ position:"absolute", bottom:28, left:12, zIndex:1000, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", display:"flex", flexDirection:"column", gap:8, boxShadow:"0 4px 16px rgba(0,0,0,0.5)" }}>
      <div style={{ color:C.muted, fontSize:10, fontFamily:"system-ui", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Territory States</div>
      {([
        { label:"Complete",    fill:`${C.gold}8c`,    stroke:C.gold },
        { label:"In progress", fill:`${C.primary}55`, stroke:C.primary },
        { label:"Unexplored",  fill:"transparent",    stroke:"rgba(159,193,132,0.38)" },
      ] as const).map(({ label, fill, stroke }) => (
        <div key={label} style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:22, height:14, borderRadius:3, background:fill, border:`2px solid ${stroke}`, flexShrink:0 }} />
          <span style={{ color:C.text, fontSize:12, fontFamily:"system-ui" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function StatsBar({ zones }: { zones: Zone[] }) {
  const c = zones.filter(z => stateOf(z.name)[0] === "complete").length;
  const p = zones.filter(z => stateOf(z.name)[0] === "progress").length;
  return (
    <div style={{ display:"flex", gap:14, alignItems:"center" }}>
      <span style={{ color:C.gold,    fontSize:12, fontFamily:"system-ui", fontWeight:600 }}>{c} complete</span>
      <span style={{ color:C.primary, fontSize:12, fontFamily:"system-ui" }}>{p} in progress</span>
      <span style={{ color:C.muted,   fontSize:12, fontFamily:"system-ui" }}>{zones.length - c - p} unexplored</span>
      <span style={{ color:C.border,  fontSize:11 }}>·</span>
      <span style={{ color:C.muted,   fontSize:12, fontFamily:"system-ui" }}>{zones.length} zones</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ZoneMap() {
  const [activeCity,   setActiveCity]   = useState<CityKey>("tokyo");
  const [selectedWard, setSelectedWard] = useState("shibuya");
  const [showAdjacent, setShowAdjacent] = useState(false);

  const [melbourneZones, setMelbourneZones] = useState<Zone[] | null>(null);
  const [sfZones,        setSfZones]        = useState<Zone[] | null>(null);
  const [tokyoFile,      setTokyoFile]      = useState<TokyoDataFile | null>(null);

  const mapRef         = useRef<L.Map | null>(null);
  const layerGroupRef  = useRef<L.LayerGroup | null>(null);

  // Fetch all data on mount
  useEffect(() => {
    fetchMelbourneZones().then(setMelbourneZones).catch(console.error);
    fetchSFZones().then(setSfZones).catch(console.error);
    fetchTokyoData().then(setTokyoFile).catch(console.error);
  }, []);

  // Derive Tokyo zones for current ward selection
  const tokyoZones: Zone[] = useMemo(() => {
    if (!tokyoFile) return [];
    const wardIds = showAdjacent
      ? [selectedWard, ...(WARD_ADJACENT[selectedWard] ?? [])]
      : [selectedWard];
    return tokyoFile.zones
      .filter(z => wardIds.includes(z.wardId))
      .map(z => ({ name: z.nameEn || z.name, ring: z.ring }));
  }, [tokyoFile, selectedWard, showAdjacent]);

  const activeWard = useMemo(
    () => tokyoFile?.wards.find(w => w.id === selectedWard),
    [tokyoFile, selectedWard],
  );

  // Active zone list for stats bar
  const displayZones: Zone[] = useMemo(() => {
    if (activeCity === "tokyo")        return tokyoZones;
    if (activeCity === "melbourne")    return melbourneZones ?? [];
    /* sanfrancisco */                 return sfZones ?? [];
  }, [activeCity, tokyoZones, melbourneZones, sfZones]);

  // Init map
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("zone-map-el", { center: [35.663, 139.704], zoom: 14, zoomControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© CARTO © OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Render zones onto map
  useEffect(() => {
    const map   = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    // Fly to city/ward
    if (activeCity === "tokyo" && activeWard) {
      map.flyTo([activeWard.lat, activeWard.lng], 14, { duration: 0.7 });
    } else if (activeCity === "melbourne") {
      map.flyTo([-37.808, 144.989], 13, { duration: 0.7 });
    } else {
      map.flyTo([37.762, -122.428], 13, { duration: 0.7 });
    }

    group.clearLayers();

    function addZone(zone: Zone) {
      const [state, pct] = stateOf(zone.name);
      const style = leafletStyle(state, pct);
      const feat: GeoJSON.Feature = {
        type: "Feature",
        properties: null,
        geometry: { type: "Polygon", coordinates: [zone.ring] },
      };
      const layer = L.geoJSON(feat, { style: () => style });
      if (state !== "untouched") {
        layer.bindTooltip(tipHtml(zone.name, state, pct), {
          permanent: true, direction: "center", className: "zt", opacity: 1,
        });
      } else {
        layer.bindTooltip(tipHtml(zone.name, state, pct), {
          permanent: false, direction: "center", className: "zt", opacity: 1,
        });
      }
      layer.on("mouseover", () => {
        const hov = leafletStyle(state, pct);
        layer.setStyle({ ...hov, weight: 2.5, fillOpacity: Math.min((hov.fillOpacity ?? 0) + 0.2, 0.85) });
      });
      layer.on("mouseout", () => layer.setStyle(style));
      group.addLayer(layer);
    }

    displayZones.forEach(addZone);
  }, [activeCity, displayZones, activeWard]);

  const isLoading = activeCity === "tokyo"
    ? !tokyoFile
    : activeCity === "melbourne"
    ? !melbourneZones
    : !sfZones;

  return (
    <div style={{ width:"100vw", height:"100vh", background:C.bg, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"system-ui" }}>Hero's Path — Territory Zones</span>
          <span style={{ fontSize:10, color:C.muted, background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:"2px 7px", fontFamily:"system-ui" }}>Visual Prototype</span>
        </div>
        {!isLoading && <StatsBar zones={displayZones} />}
        {isLoading && <span style={{ color:C.muted, fontSize:12, fontFamily:"system-ui" }}>Fetching zone data…</span>}
      </div>

      {/* City tabs */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, display:"flex", gap:4, padding:"7px 14px", flexShrink:0, alignItems:"center" }}>
        {(["tokyo","melbourne","sanfrancisco"] as CityKey[]).map(key => {
          const labels: Record<CityKey, string> = { tokyo:"🗼 Tokyo", melbourne:"🦘 Melbourne", sanfrancisco:"🌉 San Francisco" };
          const active = key === activeCity;
          return (
            <button key={key} onClick={() => setActiveCity(key)} style={{
              background: active ? C.primary : "transparent",
              color: active ? C.bg : C.muted,
              border: `1px solid ${active ? C.primary : C.border}`,
              borderRadius:7, padding:"5px 15px",
              fontWeight: active ? 700 : 400, fontSize:13,
              cursor:"pointer", fontFamily:"system-ui", transition:"all 0.14s",
            }}>{labels[key]}</button>
          );
        })}
        {activeCity === "tokyo" && !isLoading && (
          <span style={{ marginLeft:12, color:C.muted, fontSize:11, fontFamily:"system-ui" }}>
            {tokyoZones.length} zones · {showAdjacent ? "multi-ward" : "single ward"}
          </span>
        )}
      </div>

      {/* Ward selector – Tokyo only */}
      {activeCity === "tokyo" && (
        <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"7px 14px", display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ color:C.muted, fontSize:11, fontFamily:"system-ui", marginRight:4 }}>Ward:</span>
          {DISPLAY_WARDS.map(id => {
            const cnt = tokyoFile?.zones.filter(z => z.wardId === id).length ?? 0;
            const active = id === selectedWard;
            return (
              <button key={id} onClick={() => { setSelectedWard(id); setShowAdjacent(false); }} style={{
                background: active ? C.primary : "transparent",
                color: active ? C.bg : C.muted,
                border: `1px solid ${active ? C.primary : C.border}`,
                borderRadius:6, padding:"4px 11px",
                fontWeight: active ? 700 : 400, fontSize:12,
                cursor:"pointer", fontFamily:"system-ui", transition:"all 0.12s",
              }}>
                {WARD_LABEL[id]?.split(" ")[1]} <span style={{ opacity:0.6, fontSize:10 }}>({cnt})</span>
              </button>
            );
          })}
          <div style={{ flex:1 }} />
          <button onClick={() => setShowAdjacent(v => !v)} style={{
            background: showAdjacent ? `${C.blue}33` : "transparent",
            color: showAdjacent ? C.blue : C.muted,
            border: `1px solid ${showAdjacent ? C.blue : C.border}`,
            borderRadius:6, padding:"4px 12px",
            fontSize:11, cursor:"pointer", fontFamily:"system-ui", transition:"all 0.12s",
          }}>
            {showAdjacent ? "✕ Hide adjacent wards" : "+ Adjacent wards (≤1 km from boundary)"}
          </button>
        </div>
      )}

      {/* Map */}
      <div style={{ flex:1, position:"relative" }}>
        <div id="zone-map-el" style={{ width:"100%", height:"100%" }} />
        <Legend />

        {/* Tokyo data note */}
        {activeCity === "tokyo" && (
          <div style={{ position:"absolute", top:10, right:12, zIndex:1000, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", maxWidth:230, boxShadow:"0 2px 12px rgba(0,0,0,0.4)" }}>
            <div style={{ color:C.text, fontSize:11, fontFamily:"system-ui", fontWeight:600, marginBottom:4 }}>Ward-based zones</div>
            <div style={{ color:C.muted, fontSize:10, fontFamily:"system-ui", lineHeight:1.5 }}>
              OSM admin level 9 boundaries, grouped by ward (区). Use "Adjacent wards" to see zones near a ward boundary — the production app uses GPS proximity.
            </div>
          </div>
        )}
      </div>

      <style>{`.zt,.zt::before,.leaflet-tooltip{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;}`}</style>
    </div>
  );
}

export default ZoneMap;
