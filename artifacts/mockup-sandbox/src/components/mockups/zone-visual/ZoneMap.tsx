import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import melbourneFallback from "./data/melbourne.json";
import sfFallback        from "./data/sf.json";
import tokyoFallback     from "./data/tokyo-processed.json";
import geelongFallback   from "./data/geelong.json";

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
} as const;

type ZoneState = "complete" | "progress" | "untouched";
type CityKey   = "melbourne" | "geelong" | "sanfrancisco" | "tokyo";

// ── Typed fallback JSON shapes ────────────────────────────────────────────────
interface NamedFeature {
  properties: { name: string };
  geometry:   { coordinates: Array<Array<[number, number]>> };
}
// SF is MultiPolygon: coordinates[poly][ring][point]
interface NhoodFeature {
  properties: { nhood: string };
  geometry:   { coordinates: Array<Array<Array<[number, number]>>> };
}
interface TokyoZoneEntry {
  wardId:  string;
  name:    string;
  nameEn:  string;
  ring:    Array<[number, number]>;
}

interface Zone { name: string; ring: Array<[number, number]> }

// ── Overpass types ────────────────────────────────────────────────────────────
interface OverpassPt  { lat: number; lon: number }
interface OverpassMbr { role: string; geometry?: OverpassPt[] }
interface OverpassElem {
  type:      string;
  tags?:     Record<string, string>;
  geometry?: OverpassPt[];
  members?:  OverpassMbr[];
}

async function overpassPost(query: string): Promise<OverpassElem[]> {
  const r = await fetch("https://overpass-api.de/api/interpreter", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({ data: query }),
    signal:  AbortSignal.timeout(12_000),
  });
  if (!r.ok) throw new Error(`Overpass ${r.status}`);
  const j = await r.json() as { elements: OverpassElem[] };
  return j.elements;
}

function ringFromElem(el: OverpassElem): Array<[number, number]> | null {
  let pts: OverpassPt[] | undefined;
  if (el.type === "way") pts = el.geometry;
  else if (el.type === "relation") {
    pts = el.members?.find(m => m.role === "outer" && (m.geometry?.length ?? 0) > 3)?.geometry;
  }
  if (!pts || pts.length < 4) return null;
  const ring: Array<[number, number]> = pts.map(p => [p.lon, p.lat]);
  if (ring[0][0] !== ring[ring.length - 1][0]) ring.push(ring[0]);
  return ring;
}

// ── Fallback builders ─────────────────────────────────────────────────────────
function melbourneFallbackZones(): Zone[] {
  return (melbourneFallback.features as NamedFeature[])
    .map(f => ({ name: f.properties.name, ring: f.geometry.coordinates[0] }));
}
function geelongFallbackZones(): Zone[] {
  return (geelongFallback.features as NamedFeature[])
    .map(f => ({ name: f.properties.name, ring: f.geometry.coordinates[0] }));
}
function sfFallbackZones(): Zone[] {
  // SF data is MultiPolygon — take the outer ring of the first polygon
  return (sfFallback.features as NhoodFeature[])
    .map(f => ({ name: f.properties.nhood, ring: f.geometry.coordinates[0][0] }));
}
function tokyoFallbackZones(): Zone[] {
  return (tokyoFallback.zones as TokyoZoneEntry[])
    .filter(z => z.wardId === "shibuya")
    .map(z => ({ name: z.nameEn || z.name, ring: z.ring }));
}

// ── Live Overpass upgrade attempts ────────────────────────────────────────────
const MELB_TARGET = new Set([
  "Fitzroy","Collingwood","Richmond","Carlton","Brunswick","Fitzroy North",
  "Northcote","Abbotsford","Windsor","South Yarra","Prahran",
  "St Kilda","Thornbury","Clifton Hill","Hawthorn","Kew","East Melbourne",
  "North Melbourne","West Melbourne","Southbank","Parkville","Alphington",
  "Fairfield","Docklands","Cremorne",
]);

async function upgradeMelbourne(): Promise<Zone[] | null> {
  try {
    const elems = await overpassPost(
      `[out:json][timeout:12];
(way["place"="suburb"](-37.87,144.90,-37.74,145.05);
 relation["place"="suburb"](-37.87,144.90,-37.74,145.05););
out body geom;`);
    const zones: Zone[] = []; const seen = new Set<string>();
    for (const el of elems) {
      const name = el.tags?.name ?? "";
      if (!MELB_TARGET.has(name) || seen.has(name)) continue;
      const ring = ringFromElem(el);
      if (ring) { zones.push({ name, ring }); seen.add(name); }
    }
    return zones.length >= 15 ? zones : null;
  } catch { return null; }
}

async function upgradeSF(): Promise<Zone[] | null> {
  try {
    const elems = await overpassPost(
      `[out:json][timeout:12];
(way["place"="neighbourhood"](37.70,-122.52,37.82,-122.36);
 relation["place"="neighbourhood"](37.70,-122.52,37.82,-122.36););
out body geom;`);
    const zones: Zone[] = [];
    for (const el of elems) {
      const name = el.tags?.name ?? "";
      if (!name) continue;
      const ring = ringFromElem(el);
      if (ring) zones.push({ name, ring });
    }
    return zones.length >= 20 ? zones : null;
  } catch { return null; }
}

const CHOME_RE = /[一二三四五六七八九十\d]丁目/;
async function upgradeTokyo(): Promise<Zone[] | null> {
  try {
    const elems = await overpassPost(
      `[out:json][timeout:12];
(way["place"="neighbourhood"](35.62,139.68,35.70,139.73);
 relation["place"="neighbourhood"](35.62,139.68,35.70,139.73);
 way["place"="quarter"](35.62,139.68,35.70,139.73);
 relation["place"="quarter"](35.62,139.68,35.70,139.73););
out body geom;`);
    const zones: Zone[] = [];
    for (const el of elems) {
      const name = el.tags?.name ?? "";
      if (!name || CHOME_RE.test(name)) continue;
      const ring = ringFromElem(el);
      if (ring) zones.push({ name: el.tags?.["name:en"] ?? name, ring });
    }
    return zones.length >= 8 ? zones : null;
  } catch { return null; }
}

// ── Demo completion states ────────────────────────────────────────────────────
const DEMO: Record<string, [ZoneState, number]> = {
  // Tokyo
  "Tomigaya":["complete",1], "Jingumae":["complete",1],
  "Shibuya":["progress",0.61], "Hiroo":["progress",0.45],
  "Dōgenzaka":["progress",0.78], "Udagawachō":["progress",0.33],
  "Kamiyamachō":["progress",0.52], "Shōtō":["progress",0.20],
  // Melbourne
  "Fitzroy":["complete",1], "Collingwood":["complete",1],
  "Richmond":["progress",0.71], "Carlton":["progress",0.47],
  "Brunswick":["progress",0.28], "Fitzroy North":["progress",0.55],
  "Abbotsford":["progress",0.38], "Clifton Hill":["progress",0.18],
  // Geelong
  "Geelong":["complete",1], "South Geelong":["complete",1],
  "Geelong West":["progress",0.64], "Geelong East":["progress",0.41],
  "Newtown":["progress",0.35], "Drumcondra":["progress",0.22],
  "Rippleside":["progress",0.58],
  // SF
  "Mission":["complete",1], "Castro":["complete",1],
  "Noe Valley":["progress",0.67], "Hayes Valley":["progress",0.43],
  "Bernal Heights":["progress",0.58], "Inner Sunset":["progress",0.31],
  "Lower Haight":["progress",0.49], "Glen Park":["progress",0.22],
};
function stateOf(name: string): [ZoneState, number] {
  return DEMO[name.trim()] ?? ["untouched", 0];
}

// ── Map styling ───────────────────────────────────────────────────────────────
function zoneStyle(state: ZoneState, pct: number): L.PathOptions {
  switch (state) {
    case "complete":
      return { fillColor: C.gold, fillOpacity: 0.45, color: C.gold, weight: 3, opacity: 1 };
    case "progress":
      return { fillColor: C.primary, fillOpacity: 0.10 + pct * 0.28, color: C.primary, weight: 2.5, opacity: 0.9 };
    default:
      return { fillColor: "transparent", fillOpacity: 0, color: "rgba(159,193,132,0.50)", weight: 2, opacity: 0.8 };
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

// ── Demo street polylines — [lat, lng] format for Leaflet ─────────────────────
// Shows what explored vs unexplored streets look like inside a territory zone.
// Each entry: { explored: true = coloured line, false = ghost line }
interface DemoSegment {
  explored: boolean;
  latlngs: Array<[number, number]>;
}
const DEMO_STREETS: Record<string, DemoSegment[]> = {
  // ── Melbourne ─────────────────────────────────────────────────────────────
  "Fitzroy": [
    // All streets explored (complete zone) — shown in gold
    { explored:true, latlngs:[[-37.7929,144.9786],[-37.7980,144.9786]] },  // Smith St
    { explored:true, latlngs:[[-37.7920,144.9763],[-37.7983,144.9763]] },  // Brunswick St
    { explored:true, latlngs:[[-37.7942,144.9720],[-37.7942,144.9810]] },  // Johnston St
    { explored:true, latlngs:[[-37.7968,144.9720],[-37.7968,144.9810]] },  // Gertrude St
  ],
  "Richmond": [
    // Explored streets (progress 71%) — shown in green
    { explored:true,  latlngs:[[-37.8230,144.9920],[-37.8230,145.0020]] },  // Swan St explored
    { explored:true,  latlngs:[[-37.8215,144.9940],[-37.8215,145.0010]] },  // Bridge Rd partial
    { explored:true,  latlngs:[[-37.8200,144.9970],[-37.8260,144.9970]] },  // Church St explored
    // Unexplored remainder — ghost
    { explored:false, latlngs:[[-37.8215,145.0010],[-37.8215,145.0065]] },  // Bridge Rd unexplored end
    { explored:false, latlngs:[[-37.8244,144.9940],[-37.8244,145.0060]] },  // Wellington St
  ],
  "Carlton": [
    { explored:true,  latlngs:[[-37.7970,144.9677],[-37.8025,144.9677]] },  // Lygon St partial
    { explored:true,  latlngs:[[-37.7985,144.9640],[-37.7985,144.9710]] },  // Grattan St partial
    { explored:false, latlngs:[[-37.8025,144.9677],[-37.8055,144.9677]] },  // Lygon St south unexplored
    { explored:false, latlngs:[[-37.7990,144.9600],[-37.7990,144.9710]] },  // Cardigan St
  ],
  "North Melbourne": [
    // Untouched zone — all ghost streets
    { explored:false, latlngs:[[-37.7960,144.9480],[-37.8010,144.9480]] },  // Errol St
    { explored:false, latlngs:[[-37.7975,144.9460],[-37.7975,144.9535]] },  // Queensberry St
    { explored:false, latlngs:[[-37.8000,144.9460],[-37.8000,144.9540]] },  // Victoria St
  ],
  // ── Geelong ───────────────────────────────────────────────────────────────
  "Geelong": [
    // City centre complete — gold streets
    { explored:true, latlngs:[[-38.1415,144.3590],[-38.1505,144.3590]] },  // Moorabool St
    { explored:true, latlngs:[[-38.1440,144.3550],[-38.1440,144.3680]] },  // Malop St
    { explored:true, latlngs:[[-38.1465,144.3555],[-38.1465,144.3675]] },  // Little Malop St
    { explored:true, latlngs:[[-38.1430,144.3550],[-38.1430,144.3670]] },  // Ryrie St
    { explored:true, latlngs:[[-38.1480,144.3565],[-38.1480,144.3655]] },  // Brougham St
  ],
  "Geelong West": [
    // Progress 64% — Pakington St corridor explored, side streets ghost
    { explored:true,  latlngs:[[-38.1300,144.3498],[-38.1430,144.3498]] },  // Pakington St explored
    { explored:true,  latlngs:[[-38.1350,144.3470],[-38.1350,144.3530]] },  // Shannon Ave partial
    { explored:false, latlngs:[[-38.1380,144.3440],[-38.1380,144.3530]] },  // Aberdeen St ghost
    { explored:false, latlngs:[[-38.1420,144.3480],[-38.1420,144.3530]] },  // Verner St ghost
  ],
  "Newtown": [
    // Progress 35% — just one corridor done
    { explored:true,  latlngs:[[-38.1530,144.3260],[-38.1530,144.3340]] },  // Pakington St south
    { explored:false, latlngs:[[-38.1560,144.3255],[-38.1560,144.3340]] },
    { explored:false, latlngs:[[-38.1520,144.3230],[-38.1520,144.3380]] },
  ],
  "Highton": [
    // Untouched — ghost streets only
    { explored:false, latlngs:[[-38.1620,144.3100],[-38.1620,144.3210]] },
    { explored:false, latlngs:[[-38.1660,144.3080],[-38.1660,144.3200]] },
    { explored:false, latlngs:[[-38.1640,144.3090],[-38.1640,144.3230]] },
  ],
  // ── SF ────────────────────────────────────────────────────────────────────
  "Mission": [
    { explored:true, latlngs:[[37.7590,-122.4194],[37.7590,-122.4100]] },  // 24th St
    { explored:true, latlngs:[[37.7630,-122.4194],[37.7630,-122.4100]] },  // 22nd St
    { explored:true, latlngs:[[37.7530,-122.4150],[37.7650,-122.4150]] },  // Mission St
    { explored:true, latlngs:[[37.7530,-122.4130],[37.7650,-122.4130]] },  // Valencia St
  ],
  "Noe Valley": [
    { explored:true,  latlngs:[[37.7500,-122.4330],[37.7500,-122.4250]] },  // 24th St explored
    { explored:true,  latlngs:[[37.7490,-122.4300],[37.7560,-122.4300]] },  // Sanchez St partial
    { explored:false, latlngs:[[37.7560,-122.4300],[37.7610,-122.4300]] },  // Sanchez upper ghost
    { explored:false, latlngs:[[37.7510,-122.4270],[37.7610,-122.4270]] },  // Castro St ghost
  ],
  "Bernal Heights": [
    { explored:true,  latlngs:[[37.7430,-122.4185],[37.7430,-122.4110]] },
    { explored:false, latlngs:[[37.7470,-122.4170],[37.7470,-122.4100]] },
    { explored:false, latlngs:[[37.7450,-122.4200],[37.7450,-122.4090]] },
  ],
};

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{ position:"absolute", bottom:28, left:12, zIndex:1000, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", display:"flex", flexDirection:"column", gap:8, boxShadow:"0 4px 16px rgba(0,0,0,0.5)", minWidth:170 }}>
      <div style={{ color:C.muted, fontSize:10, fontFamily:"system-ui", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Zones</div>
      {([
        { label:"Complete",    fill:`${C.gold}73`,    stroke:C.gold },
        { label:"In progress", fill:`${C.primary}4d`, stroke:C.primary },
        { label:"Unexplored",  fill:"transparent",    stroke:"rgba(159,193,132,0.50)" },
      ] as const).map(({ label, fill, stroke }) => (
        <div key={label} style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:22, height:13, borderRadius:3, background:fill, border:`2px solid ${stroke}`, flexShrink:0 }} />
          <span style={{ color:C.text, fontSize:12, fontFamily:"system-ui" }}>{label}</span>
        </div>
      ))}
      <div style={{ color:C.muted, fontSize:10, fontFamily:"system-ui", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:6, marginBottom:2 }}>Streets</div>
      {([
        { label:"Street explored",   color:C.gold,                     dash:false },
        { label:"Street in progress", color:C.primary,                  dash:false },
        { label:"Street unexplored",  color:"rgba(159,193,132,0.30)",   dash:true  },
      ] as const).map(({ label, color, dash }) => (
        <div key={label} style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:22, height:3, borderRadius:2, background: dash ? "transparent" : color, border: dash ? `1.5px dashed ${color}` : "none", flexShrink:0 }} />
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

// ── City config ───────────────────────────────────────────────────────────────
const CITY_CONFIG = {
  melbourne:    { label:"🦘 Melbourne",     center:[-37.808, 144.989] as [number,number], zoom:13, sub:"Inner Suburbs (SAL 2021)" },
  geelong:      { label:"🌊 Geelong",       center:[-38.143, 144.360] as [number,number], zoom:13, sub:"Greater Geelong (SAL 2021)" },
  sanfrancisco: { label:"🌉 San Francisco", center:[37.762, -122.428] as [number,number], zoom:13, sub:"Neighbourhoods" },
  tokyo:        { label:"🗼 Tokyo",         center:[35.663, 139.704]  as [number,number], zoom:14, sub:"Shibuya Ward" },
} as const;

// ── Main ──────────────────────────────────────────────────────────────────────
export function ZoneMap() {
  const [activeCity, setActiveCity] = useState<CityKey>("melbourne");

  const [zonesMap, setZonesMap] = useState<Record<CityKey, Zone[]>>({
    melbourne:    melbourneFallbackZones(),
    geelong:      geelongFallbackZones(),
    sanfrancisco: sfFallbackZones(),
    tokyo:        tokyoFallbackZones(),
  });

  const mapRef        = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Background Overpass upgrade attempts
  useEffect(() => {
    upgradeMelbourne().then(z => { if (z) setZonesMap(m => ({ ...m, melbourne: z })); });
    upgradeSF().then(z        => { if (z) setZonesMap(m => ({ ...m, sanfrancisco: z })); });
    upgradeTokyo().then(z     => { if (z) setZonesMap(m => ({ ...m, tokyo: z })); });
  }, []);

  useEffect(() => {
    if (mapRef.current) return;
    const cfg = CITY_CONFIG.melbourne;
    const map = L.map("zone-map-el", { center: cfg.center, zoom: cfg.zoom, zoomControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© CARTO © OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map   = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    const cfg   = CITY_CONFIG[activeCity];
    const zones = zonesMap[activeCity];
    map.flyTo(cfg.center, cfg.zoom, { duration: 0.7 });
    group.clearLayers();

    // Render zone polygons
    for (const zone of zones) {
      const [state, pct] = stateOf(zone.name);
      const style = zoneStyle(state, pct);
      const feat: GeoJSON.Feature<GeoJSON.Polygon> = {
        type:       "Feature",
        properties: null,
        geometry:   { type: "Polygon", coordinates: [zone.ring] },
      };
      const layer = L.geoJSON(feat, { style: () => style });
      layer.bindTooltip(tipHtml(zone.name, state, pct), {
        permanent:  state !== "untouched",
        direction:  "center",
        className:  "zt",
        opacity:    1,
      });
      layer.on("mouseover", () => {
        const h = zoneStyle(state, pct);
        layer.setStyle({ ...h, weight: h.weight! + 1.5, fillOpacity: Math.min((h.fillOpacity ?? 0) + 0.18, 0.80) });
      });
      layer.on("mouseout", () => layer.setStyle(style));
      group.addLayer(layer);
    }

    // Render demo street polylines
    for (const zone of zones) {
      const [state] = stateOf(zone.name);
      const streets = DEMO_STREETS[zone.name];
      if (!streets) continue;

      for (const seg of streets) {
        const isExplored = seg.explored;
        let color: string, weight: number, opacity: number, dashArray: string | undefined;

        if (isExplored) {
          color      = state === "complete" ? C.gold : C.primary;
          weight     = 4;
          opacity    = state === "complete" ? 0.92 : 0.82;
          dashArray  = undefined;
        } else {
          color      = "rgba(159,193,132,0.30)";
          weight     = 2.5;
          opacity    = 1;
          dashArray  = "5, 5";
        }

        const line = L.polyline(seg.latlngs, { color, weight, opacity, dashArray, lineCap:"round", lineJoin:"round" });
        group.addLayer(line);
      }
    }
  }, [activeCity, zonesMap]);

  const zones = zonesMap[activeCity];
  const cfg   = CITY_CONFIG[activeCity];

  return (
    <div style={{ width:"100vw", height:"100vh", background:C.bg, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"system-ui" }}>Hero's Path — Territory Zones</span>
          <span style={{ fontSize:10, color:C.muted, background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:"2px 7px", fontFamily:"system-ui" }}>Visual Prototype</span>
        </div>
        <StatsBar zones={zones} />
      </div>

      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, display:"flex", gap:4, padding:"7px 14px", flexShrink:0, alignItems:"center" }}>
        {(Object.keys(CITY_CONFIG) as CityKey[]).map(key => {
          const active = key === activeCity;
          return (
            <button key={key} onClick={() => setActiveCity(key)} style={{
              background: active ? C.primary : "transparent",
              color:      active ? C.bg      : C.muted,
              border:     `1px solid ${active ? C.primary : C.border}`,
              borderRadius:7, padding:"5px 15px",
              fontWeight: active ? 700 : 400, fontSize:13,
              cursor:"pointer", fontFamily:"system-ui", transition:"all 0.14s",
            }}>{CITY_CONFIG[key].label}</button>
          );
        })}
        <span style={{ marginLeft:8, color:C.muted, fontSize:11, fontFamily:"system-ui" }}>
          {cfg.sub} · {zones.length} zones
        </span>
      </div>

      <div style={{ flex:1, position:"relative" }}>
        <div id="zone-map-el" style={{ width:"100%", height:"100%" }} />
        <Legend />
      </div>

      <style>{`.zt,.zt::before,.leaflet-tooltip{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;}`}</style>
    </div>
  );
}

export default ZoneMap;
