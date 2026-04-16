import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import melbourneFallback from "./data/melbourne.json";
import sfFallback        from "./data/sf.json";
import tokyoFallback     from "./data/tokyo-processed.json";

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
type CityKey   = "tokyo" | "melbourne" | "sanfrancisco";

// ── Typed fallback JSON shapes ────────────────────────────────────────────────
interface NamedFeature {
  properties: { name: string };
  geometry:   { coordinates: Array<Array<[number, number]>> };
}
interface NhoodFeature {
  properties: { nhood: string };
  geometry:   { coordinates: Array<Array<[number, number]>> };
}
interface TokyoZoneEntry {
  wardId:  string;
  name:    string;
  nameEn:  string;
  ring:    Array<[number, number]>;
}

interface Zone {
  name: string;
  ring: Array<[number, number]>;
}

// ── Overpass types ────────────────────────────────────────────────────────────
interface OverpassPt   { lat: number; lon: number }
interface OverpassMbr  { role: string; geometry?: OverpassPt[] }
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

// ── Fallback zone builders ────────────────────────────────────────────────────
function melbourneFallbackZones(): Zone[] {
  return (melbourneFallback.features as NamedFeature[])
    .map(f => ({ name: f.properties.name, ring: f.geometry.coordinates[0] }));
}

function sfFallbackZones(): Zone[] {
  return (sfFallback.features as NhoodFeature[])
    .map(f => ({ name: f.properties.nhood, ring: f.geometry.coordinates[0] }));
}

function tokyoFallbackZones(): Zone[] {
  return (tokyoFallback.zones as TokyoZoneEntry[])
    .filter(z => z.wardId === "shibuya")
    .map(z => ({ name: z.nameEn || z.name, ring: z.ring }));
}

// ── Live Overpass fetchers (upgrade fallback data if possible) ────────────────
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
out body geom;`
    );
    const zones: Zone[] = [];
    const seen = new Set<string>();
    for (const el of elems) {
      const name = el.tags?.name ?? "";
      if (!MELB_TARGET.has(name) || seen.has(name)) continue;
      const ring = ringFromElem(el);
      if (ring) { zones.push({ name, ring }); seen.add(name); }
    }
    return zones.length >= 15 ? zones : null;
  } catch {
    return null;
  }
}

async function upgradeSF(): Promise<Zone[] | null> {
  try {
    const elems = await overpassPost(
      `[out:json][timeout:12];
(way["place"="neighbourhood"](37.70,-122.52,37.82,-122.36);
 relation["place"="neighbourhood"](37.70,-122.52,37.82,-122.36););
out body geom;`
    );
    const zones: Zone[] = [];
    for (const el of elems) {
      const name = el.tags?.name ?? "";
      if (!name) continue;
      const ring = ringFromElem(el);
      if (ring) zones.push({ name, ring });
    }
    return zones.length >= 20 ? zones : null;
  } catch {
    return null;
  }
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
out body geom;`
    );
    const zones: Zone[] = [];
    for (const el of elems) {
      const name = el.tags?.name ?? "";
      if (!name || CHOME_RE.test(name)) continue;
      const ring = ringFromElem(el);
      if (ring) zones.push({ name: el.tags?.["name:en"] ?? name, ring });
    }
    return zones.length >= 8 ? zones : null;
  } catch {
    return null;
  }
}

// ── Demo completion assignments ───────────────────────────────────────────────
const DEMO: Record<string, [ZoneState, number]> = {
  "Tomigaya":["complete",1], "Jingumae":["complete",1],
  "Shibuya":["progress",0.61], "Hiroo":["progress",0.45],
  "Dōgenzaka":["progress",0.78], "Udagawachō":["progress",0.33],
  "Kamiyamachō":["progress",0.52], "Shōtō":["progress",0.20],
  "Fitzroy":["complete",1], "Collingwood":["complete",1],
  "Richmond":["progress",0.71], "Carlton":["progress",0.47],
  "Brunswick":["progress",0.28], "Fitzroy North":["progress",0.55],
  "Abbotsford":["progress",0.38], "Clifton Hill":["progress",0.18],
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
  const items = [
    { label:"Complete",    fill:`${C.gold}8c`,    stroke:C.gold },
    { label:"In progress", fill:`${C.primary}55`, stroke:C.primary },
    { label:"Unexplored",  fill:"transparent",    stroke:"rgba(159,193,132,0.38)" },
  ] as const;
  return (
    <div style={{ position:"absolute", bottom:28, left:12, zIndex:1000, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", display:"flex", flexDirection:"column", gap:8, boxShadow:"0 4px 16px rgba(0,0,0,0.5)" }}>
      <div style={{ color:C.muted, fontSize:10, fontFamily:"system-ui", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Territory States</div>
      {items.map(({ label, fill, stroke }) => (
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

// ── City config ───────────────────────────────────────────────────────────────
const CITY_CONFIG = {
  tokyo:        { label:"🗼 Tokyo",         center:[35.663, 139.704] as [number,number], zoom:14, sub:"Shibuya Ward" },
  melbourne:    { label:"🦘 Melbourne",     center:[-37.808, 144.989] as [number,number], zoom:13, sub:"Inner Suburbs (SAL 2021)" },
  sanfrancisco: { label:"🌉 San Francisco", center:[37.762, -122.428] as [number,number], zoom:13, sub:"Neighbourhoods" },
} as const;

// ── Main component ────────────────────────────────────────────────────────────
export function ZoneMap() {
  const [activeCity, setActiveCity] = useState<CityKey>("melbourne");

  // Initialize immediately with fallback data — no loading spinner
  const [zonesMap, setZonesMap] = useState<Record<CityKey, Zone[]>>({
    tokyo:        tokyoFallbackZones(),
    melbourne:    melbourneFallbackZones(),
    sanfrancisco: sfFallbackZones(),
  });

  const mapRef        = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Attempt live Overpass upgrade in the background
  useEffect(() => {
    upgradeTokyo().then(zones => {
      if (zones) setZonesMap(m => ({ ...m, tokyo: zones }));
    });
    upgradeMelbourne().then(zones => {
      if (zones) setZonesMap(m => ({ ...m, melbourne: zones }));
    });
    upgradeSF().then(zones => {
      if (zones) setZonesMap(m => ({ ...m, sanfrancisco: zones }));
    });
  }, []);

  // Init Leaflet map once
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

  // Re-render zones when city or data changes
  useEffect(() => {
    const map   = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    const cfg   = CITY_CONFIG[activeCity];
    const zones = zonesMap[activeCity];
    map.flyTo(cfg.center, cfg.zoom, { duration: 0.7 });
    group.clearLayers();

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
        layer.setStyle({ ...h, weight: 2.5, fillOpacity: Math.min((h.fillOpacity ?? 0) + 0.2, 0.85) });
      });
      layer.on("mouseout", () => layer.setStyle(style));
      group.addLayer(layer);
    }
  }, [activeCity, zonesMap]);

  const zones = zonesMap[activeCity];
  const cfg   = CITY_CONFIG[activeCity];

  return (
    <div style={{ width:"100vw", height:"100vh", background:C.bg, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"system-ui" }}>Hero's Path — Territory Zones</span>
          <span style={{ fontSize:10, color:C.muted, background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:"2px 7px", fontFamily:"system-ui" }}>Visual Prototype</span>
        </div>
        <StatsBar zones={zones} />
      </div>

      {/* City tabs */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, display:"flex", gap:4, padding:"7px 14px", flexShrink:0, alignItems:"center" }}>
        {(Object.keys(CITY_CONFIG) as CityKey[]).map(key => {
          const active = key === activeCity;
          return (
            <button key={key} onClick={() => setActiveCity(key)} style={{
              background: active ? C.primary : "transparent",
              color:      active ? C.bg     : C.muted,
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

      {/* Map */}
      <div style={{ flex:1, position:"relative" }}>
        <div id="zone-map-el" style={{ width:"100%", height:"100%" }} />
        <Legend />
      </div>

      <style>{`.zt,.zt::before,.leaflet-tooltip{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;}`}</style>
    </div>
  );
}

export default ZoneMap;
