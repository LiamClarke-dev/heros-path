import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── BotW palette ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0D1A10",
  surface: "#152218",
  card: "#1D2E1F",
  border: "#2C4030",
  primary: "#9FC184",
  secondary: "#97C8D9",
  text: "#F9F4CE",
  muted: "#86A5A9",
};

// ── Types ─────────────────────────────────────────────────────────────────────
type ZoneState = "complete" | "progress" | "untouched";
type CityKey = "tokyo" | "melbourne" | "sanfrancisco";

interface ZoneDef {
  name: string;
  /** GeoJSON ring coords: [lng, lat][] — must close (first === last) */
  ring: [number, number][];
  state: ZoneState;
  pct?: number; // 0-1 for "progress" zones
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Make a rectangular polygon from a bounding box — GeoJSON [lng, lat] order */
function rect(s: number, w: number, n: number, e: number): [number, number][] {
  return [[w, s], [e, s], [e, n], [w, n], [w, s]];
}
/** Slightly irregular quadrilateral — looks less "boxy" than a pure rectangle */
function quad(
  s: number, w: number, n: number, e: number,
  ds = 0, dw = 0, dn = 0, de = 0
): [number, number][] {
  return [
    [w + dw, s + ds], [e + de, s - ds * 0.5],
    [e - de * 0.3, n + dn], [w + dw * 0.5, n - dn * 0.4],
    [w + dw, s + ds],
  ];
}

function zoneStyle(z: ZoneDef): L.PathOptions {
  const pct = z.pct ?? 0;
  switch (z.state) {
    case "complete":
      return { fillColor: C.primary, fillOpacity: 0.62, color: C.primary, weight: 2, opacity: 0.95 };
    case "progress":
      return { fillColor: C.primary, fillOpacity: 0.15 + pct * 0.38, color: C.primary, weight: 1.5, opacity: 0.78 };
    default:
      return { fillColor: C.primary, fillOpacity: 0, color: "rgba(159,193,132,0.38)", weight: 1, opacity: 0.6 };
  }
}
function label(z: ZoneDef) {
  if (z.state === "complete") return "100%  ✓";
  if (z.state === "progress") return `${Math.round((z.pct ?? 0) * 100)}%`;
  return "0%";
}

// ── Pre-defined zones: GeoJSON coords [lng, lat] ──────────────────────────────

const TOKYO_ZONES: ZoneDef[] = [
  // Completed
  { name: "Nakameguro",    state: "complete",  ring: quad(35.635, 139.693, 35.651, 139.714, 0.001, 0.001, 0.001, 0.001) },
  { name: "Daikanyama",    state: "complete",  ring: quad(35.645, 139.697, 35.655, 139.708, 0.001, 0.001, 0.001, 0.001) },
  // In progress
  { name: "Ebisu",         state: "progress",  pct: 0.62, ring: quad(35.644, 139.708, 35.656, 139.722, 0.001, 0.001, 0.001, 0.001) },
  { name: "Shibuya",       state: "progress",  pct: 0.38, ring: quad(35.655, 139.695, 35.670, 139.714, 0.001, 0.001, 0.001, 0.001) },
  { name: "Tomigaya",      state: "progress",  pct: 0.81, ring: quad(35.667, 139.688, 35.676, 139.698, 0.001, 0.001, 0.001, 0.001) },
  { name: "Harajuku",      state: "progress",  pct: 0.24, ring: quad(35.668, 139.698, 35.678, 139.710, 0.001, 0.001, 0.001, 0.001) },
  { name: "Omotesando",    state: "progress",  pct: 0.45, ring: quad(35.662, 139.712, 35.672, 139.724, 0.001, 0.001, 0.001, 0.001) },
  // Untouched
  { name: "Sangenjaya",    state: "untouched", ring: rect(35.633, 139.663, 35.648, 139.682) },
  { name: "Shimokitazawa", state: "untouched", ring: rect(35.657, 139.665, 35.669, 139.679) },
  { name: "Jiyugaoka",     state: "untouched", ring: rect(35.606, 139.669, 35.622, 139.683) },
  { name: "Meguro",        state: "untouched", ring: rect(35.628, 139.701, 35.641, 139.717) },
  { name: "Yutenji",       state: "untouched", ring: rect(35.629, 139.681, 35.641, 139.697) },
  { name: "Gakugei-daigaku", state: "untouched", ring: rect(35.619, 139.678, 35.631, 139.691) },
  { name: "Hiroo",         state: "untouched", ring: rect(35.648, 139.718, 35.660, 139.730) },
  { name: "Minami-Aoyama", state: "untouched", ring: rect(35.662, 139.718, 35.672, 139.730) },
  { name: "Naka-Meguro",   state: "untouched", ring: rect(35.640, 139.696, 35.649, 139.710) },
  { name: "Daita",         state: "untouched", ring: rect(35.657, 139.679, 35.667, 139.688) },
  { name: "Setagaya",      state: "untouched", ring: rect(35.643, 139.650, 35.655, 139.667) },
];

const MELBOURNE_ZONES: ZoneDef[] = [
  // Completed
  { name: "Fitzroy",        state: "complete",  ring: quad(-37.800, 144.974, -37.790, 144.990, 0.001, 0.001, 0.001, 0.001) },
  { name: "Collingwood",    state: "complete",  ring: quad(-37.800, 144.989, -37.790, 145.005, 0.001, 0.001, 0.001, 0.001) },
  // In progress
  { name: "Richmond",       state: "progress",  pct: 0.71, ring: quad(-37.823, 144.999, -37.806, 145.015, 0.001, 0.001, 0.001, 0.001) },
  { name: "Carlton",        state: "progress",  pct: 0.47, ring: quad(-37.807, 144.960, -37.793, 144.978, 0.001, 0.001, 0.001, 0.001) },
  { name: "Brunswick",      state: "progress",  pct: 0.28, ring: quad(-37.776, 144.960, -37.762, 144.976, 0.001, 0.001, 0.001, 0.001) },
  { name: "Abbotsford",     state: "progress",  pct: 0.55, ring: quad(-37.810, 144.999, -37.798, 145.014, 0.001, 0.001, 0.001, 0.001) },
  { name: "Fitzroy North",  state: "progress",  pct: 0.33, ring: quad(-37.790, 144.974, -37.778, 144.990, 0.001, 0.001, 0.001, 0.001) },
  // Untouched
  { name: "Northcote",      state: "untouched", ring: rect(-37.783, 144.989, -37.768, 145.003) },
  { name: "Prahran",        state: "untouched", ring: rect(-37.852, 144.983, -37.838, 144.999) },
  { name: "South Yarra",    state: "untouched", ring: rect(-37.845, 144.993, -37.833, 145.010) },
  { name: "St Kilda",       state: "untouched", ring: rect(-37.872, 144.975, -37.858, 144.990) },
  { name: "Windsor",        state: "untouched", ring: rect(-37.859, 144.990, -37.848, 145.001) },
  { name: "Cremorne",       state: "untouched", ring: rect(-37.830, 144.995, -37.820, 145.008) },
  { name: "Thornbury",      state: "untouched", ring: rect(-37.771, 144.983, -37.757, 144.999) },
  { name: "Preston",        state: "untouched", ring: rect(-37.752, 144.988, -37.739, 145.003) },
  { name: "Hawthorn",       state: "untouched", ring: rect(-37.826, 145.018, -37.814, 145.032) },
  { name: "Kew",            state: "untouched", ring: rect(-37.812, 145.025, -37.799, 145.040) },
  { name: "Camberwell",     state: "untouched", ring: rect(-37.839, 145.058, -37.825, 145.075) },
];

const SF_ZONES: ZoneDef[] = [
  // Completed
  { name: "Mission District", state: "complete",  ring: quad(37.745, -122.429, 37.764, -122.408, 0.001, 0.001, 0.001, 0.001) },
  { name: "Castro",           state: "complete",  ring: quad(37.757, -122.443, 37.769, -122.432, 0.001, 0.001, 0.001, 0.001) },
  // In progress
  { name: "Noe Valley",       state: "progress",  pct: 0.67, ring: quad(37.745, -122.443, 37.758, -122.430, 0.001, 0.001, 0.001, 0.001) },
  { name: "Hayes Valley",     state: "progress",  pct: 0.43, ring: quad(37.772, -122.428, 37.779, -122.419, 0.001, 0.001, 0.001, 0.001) },
  { name: "Bernal Heights",   state: "progress",  pct: 0.58, ring: quad(37.733, -122.422, 37.748, -122.408, 0.001, 0.001, 0.001, 0.001) },
  { name: "Inner Sunset",     state: "progress",  pct: 0.31, ring: quad(37.757, -122.470, 37.765, -122.451, 0.001, 0.001, 0.001, 0.001) },
  { name: "Lower Haight",     state: "progress",  pct: 0.49, ring: quad(37.770, -122.433, 37.777, -122.425, 0.001, 0.001, 0.001, 0.001) },
  // Untouched
  { name: "Potrero Hill",     state: "untouched", ring: rect(37.757, -122.410, 37.768, -122.398) },
  { name: "SOMA",             state: "untouched", ring: rect(37.775, -122.412, 37.785, -122.394) },
  { name: "Pacific Heights",  state: "untouched", ring: rect(37.788, -122.442, 37.797, -122.430) },
  { name: "Outer Sunset",     state: "untouched", ring: rect(37.753, -122.500, 37.765, -122.480) },
  { name: "Richmond",         state: "untouched", ring: rect(37.775, -122.483, 37.784, -122.458) },
  { name: "Cole Valley",      state: "untouched", ring: rect(37.763, -122.453, 37.770, -122.443) },
  { name: "Dogpatch",         state: "untouched", ring: rect(37.756, -122.397, 37.766, -122.387) },
  { name: "Glen Park",        state: "untouched", ring: rect(37.730, -122.436, 37.739, -122.426) },
  { name: "Nob Hill",         state: "untouched", ring: rect(37.791, -122.420, 37.799, -122.411) },
  { name: "North Beach",      state: "untouched", ring: rect(37.800, -122.413, 37.807, -122.404) },
  { name: "Financial District",state: "untouched", ring: rect(37.793, -122.404, 37.802, -122.394) },
];

// ── City config ───────────────────────────────────────────────────────────────
interface CityConfig {
  label: string;
  center: [number, number];
  zoom: number;
  zones: ZoneDef[];
}
const CITIES: Record<CityKey, CityConfig> = {
  tokyo:         { label: "🗼 Tokyo",         center: [35.651, 139.700], zoom: 13, zones: TOKYO_ZONES },
  melbourne:     { label: "🦘 Melbourne",     center: [-37.808, 144.989], zoom: 13, zones: MELBOURNE_ZONES },
  sanfrancisco:  { label: "🌉 San Francisco", center: [37.762, -122.428], zoom: 13, zones: SF_ZONES },
};

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { label: "Complete  (≥ 80%)", fill: `${C.primary}9e`, stroke: C.primary },
    { label: "In progress",       fill: `${C.primary}55`, stroke: `${C.primary}c0` },
    { label: "Unexplored",        fill: "transparent",    stroke: `${C.primary}60` },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 28, left: 12, zIndex: 1000,
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    }}>
      <div style={{ color: C.muted, fontSize: 10, fontFamily: "system-ui,sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Territory States</div>
      {items.map(({ label: l, fill, stroke }) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 14, borderRadius: 3, background: fill, border: `2px solid ${stroke}`, flexShrink: 0 }} />
          <span style={{ color: C.text, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>{l}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stats badge ───────────────────────────────────────────────────────────────
function Stats({ zones }: { zones: ZoneDef[] }) {
  const complete = zones.filter(z => z.state === "complete").length;
  const progress = zones.filter(z => z.state === "progress").length;
  const total = zones.length;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <span style={{ color: C.primary, fontSize: 12, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>
        {complete} complete
      </span>
      <span style={{ color: C.secondary, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
        {progress} in progress
      </span>
      <span style={{ color: C.muted, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
        {total - complete - progress} unexplored
      </span>
      <span style={{ color: C.border, fontSize: 12 }}>·</span>
      <span style={{ color: C.muted, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
        {total} zones total
      </span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ZoneMap() {
  const [activeCity, setActiveCity] = useState<CityKey>("tokyo");
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;
    const cfg = CITIES.tokyo;
    const map = L.map("zone-map-el", {
      center: cfg.center, zoom: cfg.zoom,
      zoomControl: true, attributionControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© CARTO · © OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    renderZones("tokyo");
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const renderZones = useCallback((cityKey: CityKey) => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;
    const cfg = CITIES[cityKey];
    map.flyTo(cfg.center, cfg.zoom, { duration: 0.6 });
    group.clearLayers();

    for (const zone of cfg.zones) {
      const style = zoneStyle(zone);
      const feat: GeoJSON.Feature = {
        type: "Feature",
        properties: { name: zone.name },
        geometry: { type: "Polygon", coordinates: [zone.ring] },
      };
      const layer = L.geoJSON(feat as GeoJSON.GeoJsonObject, { style: () => style });
      const lbl = label(zone);
      const isLabelled = zone.state !== "untouched";
      const tooltipHtml = `
        <div style="background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:5px 10px;font-family:system-ui,sans-serif;pointer-events:none">
          <div style="color:${C.text};font-weight:600;font-size:12px">${zone.name}</div>
          <div style="color:${zone.state === "complete" ? C.primary : zone.state === "progress" ? C.secondary : C.muted};font-size:10px;margin-top:1px">${lbl}</div>
        </div>
      `;
      layer.bindTooltip(tooltipHtml, {
        permanent: isLabelled,
        direction: "center",
        className: "zt",
        opacity: 1,
      });
      layer.on("mouseover", () => layer.setStyle({ ...style, fillOpacity: Math.min((style.fillOpacity ?? 0) + 0.18, 0.9), weight: 2.5 }));
      layer.on("mouseout", () => layer.setStyle(style));
      group.addLayer(layer);
    }
  }, []);

  // Swap city
  useEffect(() => {
    renderZones(activeCity);
  }, [activeCity, renderZones]);

  const city = CITIES[activeCity];

  return (
    <div style={{ width: "100vw", height: "100vh", background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "system-ui,sans-serif" }}>Hero's Path — Territory Zones</span>
          <span style={{ fontSize: 10, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 7px", fontFamily: "system-ui,sans-serif" }}>Visual Prototype</span>
        </div>
        <Stats zones={city.zones} />
      </div>

      {/* Tabs */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 4, padding: "7px 14px", flexShrink: 0 }}>
        {(Object.keys(CITIES) as CityKey[]).map(key => {
          const active = key === activeCity;
          return (
            <button key={key} onClick={() => setActiveCity(key)} style={{
              background: active ? C.primary : "transparent",
              color: active ? C.bg : C.muted,
              border: `1px solid ${active ? C.primary : C.border}`,
              borderRadius: 7, padding: "5px 15px",
              fontWeight: active ? 700 : 400, fontSize: 13,
              cursor: "pointer", fontFamily: "system-ui,sans-serif", transition: "all 0.14s",
            }}>
              {CITIES[key].label}
            </button>
          );
        })}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <div id="zone-map-el" style={{ width: "100%", height: "100%" }} />
        <Legend />
      </div>

      <style>{`
        .zt,.zt::before { background:transparent!important; border:none!important; box-shadow:none!important; padding:0!important; }
        .leaflet-tooltip { background:transparent!important; border:none!important; box-shadow:none!important; }
      `}</style>
    </div>
  );
}

export default ZoneMap;
