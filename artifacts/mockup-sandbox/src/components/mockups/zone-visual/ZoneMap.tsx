import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import melbourneGeoJSON from "./data/melbourne.json";
import sfGeoJSON from "./data/sf.json";
import tokyoData from "./data/tokyo-processed.json";

// ── BotW palette ──────────────────────────────────────────────────────────────
const C = {
  bg: "#0D1A10",
  surface: "#152218",
  card: "#1D2E1F",
  border: "#2C4030",
  primary: "#9FC184",   // BotW green
  secondary: "#97C8D9", // BotW blue
  gold: "#F9F4CE",      // BotW text / claimed gold
  text: "#F9F4CE",
  muted: "#86A5A9",
};

type ZoneState = "complete" | "progress" | "untouched";
type CityKey = "tokyo" | "melbourne" | "sanfrancisco";

// ── Demo completion assignments ───────────────────────────────────────────────
// Key = zone name (English or Japanese), value = [state, pct?]
const DEMO_STATES: Record<string, [ZoneState, number?]> = {
  // Tokyo – Shibuya ward
  "Tomigaya":      ["complete"],
  "Jingumae":      ["complete"],
  "Shibuya":       ["progress", 0.61],
  "Hiroo":         ["progress", 0.45],
  "Dōgenzaka":     ["progress", 0.78],
  "Udagawachō":    ["progress", 0.33],
  "Kamiyamachō":   ["progress", 0.52],
  "Shōtō":         ["progress", 0.20],
  // Tokyo – Meguro ward (adjacent)
  "Naka-Meguro":   ["complete"],
  "Daikanyamacho": ["complete"],
  "Ebisu":         ["progress", 0.71],
  "Ebisu-Minami":  ["progress", 0.44],
  "Aobadai":       ["progress", 0.28],
  // Melbourne
  "Fitzroy":       ["complete"],
  "Collingwood":   ["complete"],
  "Richmond":      ["progress", 0.71],
  "Carlton":       ["progress", 0.47],
  "Brunswick":     ["progress", 0.28],
  "Fitzroy North": ["progress", 0.55],
  "Abbotsford":    ["progress", 0.38],
  "Clifton Hill":  ["progress", 0.18],
  // San Francisco
  "Mission":       ["complete"],
  "Castro":        ["complete"],
  "Noe Valley":    ["progress", 0.67],
  "Hayes Valley":  ["progress", 0.43],
  "Bernal Heights":["progress", 0.58],
  "Inner Sunset":  ["progress", 0.31],
  "Lower Haight":  ["progress", 0.49],
  "Glen Park":     ["progress", 0.22],
};

function getState(name: string): [ZoneState, number] {
  const raw = name.trim();
  // Try direct match
  if (DEMO_STATES[raw]) {
    const [s, p] = DEMO_STATES[raw];
    return [s, p ?? 0];
  }
  return ["untouched", 0];
}

// ── Leaflet style per state ───────────────────────────────────────────────────
function zoneStyle(state: ZoneState, pct: number): L.PathOptions {
  switch (state) {
    case "complete":
      return {
        fillColor: C.gold,
        fillOpacity: 0.55,
        color: C.gold,
        weight: 2,
        opacity: 0.9,
      };
    case "progress":
      return {
        fillColor: C.primary,
        fillOpacity: 0.12 + pct * 0.30,
        color: C.primary,
        weight: 1.5,
        opacity: 0.85,
      };
    default:
      return {
        fillColor: "transparent",
        fillOpacity: 0,
        color: "rgba(159,193,132,0.32)",
        weight: 1,
        opacity: 0.7,
      };
  }
}

function zoneHover(state: ZoneState): L.PathOptions {
  const base = zoneStyle(state, 0.5);
  return { ...base, weight: 2.5, fillOpacity: Math.min((base.fillOpacity ?? 0) + 0.2, 0.85) };
}

// ── Tooltip HTML ──────────────────────────────────────────────────────────────
function tooltipHtml(name: string, state: ZoneState, pct: number) {
  const stateColor = state === "complete" ? C.gold : state === "progress" ? C.primary : C.muted;
  const stateLabel = state === "complete" ? "100%  ✓" : state === "progress" ? `${Math.round(pct * 100)}%` : "0%";
  return `<div style="background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:5px 10px;font-family:system-ui,sans-serif;pointer-events:none">
    <div style="color:${C.text};font-weight:600;font-size:12px">${name}</div>
    <div style="color:${stateColor};font-size:10px;margin-top:1px">${stateLabel}</div>
  </div>`;
}

// ── Ward config for Tokyo ─────────────────────────────────────────────────────
// Map of wardId → adjacent wardIds (for the 1km boundary demo)
const WARD_ADJACENCY: Record<string, string[]> = {
  shibuya:   ["meguro", "minato", "shinjuku"],
  meguro:    ["shibuya", "shinagawa", "setagaya"],
  minato:    ["shibuya", "chiyoda", "chuo", "shinagawa"],
  shinjuku:  ["shibuya", "bunkyo", "toshima", "nakano"],
  setagaya:  ["meguro", "suginami", "nerima"],
};

const DEMO_WARDS = ["shibuya", "meguro", "minato", "shinjuku", "setagaya", "nakano"];
const WARD_LABELS: Record<string, string> = {
  shibuya: "渋谷区  Shibuya",
  meguro:  "目黒区  Meguro",
  minato:  "港区  Minato",
  shinjuku:"新宿区  Shinjuku",
  setagaya:"世田谷区  Setagaya",
  nakano:  "中野区  Nakano",
};

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { label: "Complete",    fill: `${C.gold}8c`,    stroke: C.gold },
    { label: "In progress", fill: `${C.primary}55`, stroke: C.primary },
    { label: "Unexplored",  fill: "transparent",    stroke: "rgba(159,193,132,0.4)" },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 28, left: 12, zIndex: 1000,
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    }}>
      <div style={{ color: C.muted, fontSize: 10, fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Territory States</div>
      {items.map(({ label, fill, stroke }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 14, borderRadius: 3, background: fill, border: `2px solid ${stroke}`, flexShrink: 0 }} />
          <span style={{ color: C.text, fontSize: 12, fontFamily: "system-ui" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function Stats({ zones }: { zones: Array<{ name: string }> }) {
  const complete  = zones.filter(z => getState(z.name)[0] === "complete").length;
  const progress  = zones.filter(z => getState(z.name)[0] === "progress").length;
  const total = zones.length;
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <span style={{ color: C.gold,    fontSize: 12, fontFamily: "system-ui", fontWeight: 600 }}>{complete} complete</span>
      <span style={{ color: C.primary, fontSize: 12, fontFamily: "system-ui" }}>{progress} in progress</span>
      <span style={{ color: C.muted,   fontSize: 12, fontFamily: "system-ui" }}>{total - complete - progress} unexplored</span>
      <span style={{ color: C.border,  fontSize: 11 }}>·</span>
      <span style={{ color: C.muted,   fontSize: 12, fontFamily: "system-ui" }}>{total} zones</span>
    </div>
  );
}

// ── Ward selector (Tokyo only) ────────────────────────────────────────────────
function WardSelector({
  selected, adjacent, onSelect, onToggleAdjacent, zones
}: {
  selected: string;
  adjacent: boolean;
  onSelect: (id: string) => void;
  onToggleAdjacent: () => void;
  zones: typeof tokyoData.zones;
}) {
  const adjacentIds = WARD_ADJACENCY[selected] ?? [];
  return (
    <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "7px 14px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ color: C.muted, fontSize: 11, fontFamily: "system-ui", marginRight: 4 }}>Ward:</span>
      {DEMO_WARDS.map(id => {
        const cnt = zones.filter(z => z.wardId === id).length;
        const active = id === selected;
        return (
          <button key={id} onClick={() => onSelect(id)} style={{
            background: active ? C.primary : "transparent",
            color: active ? C.bg : C.muted,
            border: `1px solid ${active ? C.primary : C.border}`,
            borderRadius: 6, padding: "4px 11px",
            fontWeight: active ? 700 : 400, fontSize: 12,
            cursor: "pointer", fontFamily: "system-ui", transition: "all 0.12s",
          }}>
            {WARD_LABELS[id].split("  ")[1]} <span style={{ opacity: 0.6, fontSize: 10 }}>({cnt})</span>
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <button onClick={onToggleAdjacent} style={{
        background: adjacent ? `${C.secondary}33` : "transparent",
        color: adjacent ? C.secondary : C.muted,
        border: `1px solid ${adjacent ? C.secondary : C.border}`,
        borderRadius: 6, padding: "4px 12px",
        fontSize: 11, cursor: "pointer", fontFamily: "system-ui", transition: "all 0.12s",
      }}>
        + Adjacent wards{adjacent ? ` (${adjacentIds.map(id => WARD_LABELS[id]?.split("  ")[1]).join(", ")})` : ""}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ZoneMap() {
  const [activeCity, setActiveCity] = useState<CityKey>("tokyo");
  const [selectedWard, setSelectedWard] = useState("shibuya");
  const [showAdjacent, setShowAdjacent] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Compute which zones to show for Tokyo
  const tokyoZones = useMemo(() => {
    const wardIds = showAdjacent
      ? [selectedWard, ...(WARD_ADJACENCY[selectedWard] ?? [])]
      : [selectedWard];
    return tokyoData.zones.filter(z => wardIds.includes(z.wardId));
  }, [selectedWard, showAdjacent]);

  // Derive map center + zoom for current ward
  const wardCenter = useMemo(() => {
    const ward = tokyoData.wards.find(w => w.id === selectedWard);
    return ward ? { lat: ward.lat, lng: ward.lng } : { lat: 35.663, lng: 139.704 };
  }, [selectedWard]);

  // Build zone descriptor list for stats
  const statZones = useMemo(() => {
    if (activeCity === "tokyo") return tokyoZones.map(z => ({ name: z.nameEn || z.name }));
    if (activeCity === "melbourne") return (melbourneGeoJSON as GeoJSON.FeatureCollection).features.map(f => ({ name: (f.properties as any).name as string }));
    return (sfGeoJSON as GeoJSON.FeatureCollection).features.map(f => ({ name: (f.properties as any).nhood as string }));
  }, [activeCity, tokyoZones]);

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

  // Render zones when city/ward changes
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;
    group.clearLayers();

    function renderFeature(name: string, geojson: GeoJSON.Feature) {
      const [state, pct] = getState(name);
      const style = zoneStyle(state, pct);
      const layer = L.geoJSON(geojson, { style: () => style });
      const showLabel = state !== "untouched";
      layer.bindTooltip(tooltipHtml(name, state, pct), {
        permanent: showLabel, direction: "center", className: "zt", opacity: 1,
      });
      layer.on("mouseover", () => layer.setStyle(zoneHover(state)));
      layer.on("mouseout",  () => layer.setStyle(style));
      group.addLayer(layer);
    }

    if (activeCity === "tokyo") {
      map.flyTo([wardCenter.lat, wardCenter.lng], 14, { duration: 0.7 });
      for (const z of tokyoZones) {
        const feat: GeoJSON.Feature = {
          type: "Feature",
          properties: { name: z.name },
          geometry: { type: "Polygon", coordinates: [z.ring as [number,number][]] },
        };
        renderFeature(z.nameEn || z.name, feat);
      }
    } else if (activeCity === "melbourne") {
      map.flyTo([-37.808, 144.989], 13, { duration: 0.7 });
      for (const feat of (melbourneGeoJSON as GeoJSON.FeatureCollection).features) {
        const name = (feat.properties as any).name as string;
        renderFeature(name, feat as GeoJSON.Feature);
      }
    } else {
      map.flyTo([37.762, -122.428], 13, { duration: 0.7 });
      for (const feat of (sfGeoJSON as GeoJSON.FeatureCollection).features) {
        const name = (feat.properties as any).nhood as string;
        renderFeature(name, feat as GeoJSON.Feature);
      }
    }
  }, [activeCity, tokyoZones, wardCenter]);

  const cities: { key: CityKey; label: string }[] = [
    { key: "tokyo",        label: "🗼 Tokyo" },
    { key: "melbourne",    label: "🦘 Melbourne" },
    { key: "sanfrancisco", label: "🌉 San Francisco" },
  ];

  return (
    <div style={{ width: "100vw", height: "100vh", background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "system-ui" }}>Hero's Path — Territory Zones</span>
          <span style={{ fontSize: 10, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 7px", fontFamily: "system-ui" }}>Visual Prototype</span>
        </div>
        <Stats zones={statZones} />
      </div>

      {/* City tabs */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 4, padding: "7px 14px", flexShrink: 0 }}>
        {cities.map(({ key, label }) => {
          const active = key === activeCity;
          return (
            <button key={key} onClick={() => setActiveCity(key)} style={{
              background: active ? C.primary : "transparent",
              color: active ? C.bg : C.muted,
              border: `1px solid ${active ? C.primary : C.border}`,
              borderRadius: 7, padding: "5px 15px",
              fontWeight: active ? 700 : 400, fontSize: 13,
              cursor: "pointer", fontFamily: "system-ui", transition: "all 0.14s",
            }}>{label}</button>
          );
        })}

        {activeCity === "tokyo" && (
          <div style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: C.muted, fontSize: 11, fontFamily: "system-ui" }}>
              {tokyoZones.length} zones · {showAdjacent ? "multi-ward view" : "single ward"}
            </span>
          </div>
        )}
      </div>

      {/* Ward selector (Tokyo only) */}
      {activeCity === "tokyo" && (
        <WardSelector
          selected={selectedWard}
          adjacent={showAdjacent}
          onSelect={(id) => { setSelectedWard(id); setShowAdjacent(false); }}
          onToggleAdjacent={() => setShowAdjacent(v => !v)}
          zones={tokyoData.zones}
        />
      )}

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <div id="zone-map-el" style={{ width: "100%", height: "100%" }} />
        <Legend />

        {/* Tokyo data note */}
        {activeCity === "tokyo" && (
          <div style={{
            position: "absolute", top: 10, right: 12, zIndex: 1000,
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "8px 12px", maxWidth: 240,
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}>
            <div style={{ color: C.text, fontSize: 11, fontFamily: "system-ui", fontWeight: 600, marginBottom: 4 }}>
              Ward-based zones
            </div>
            <div style={{ color: C.muted, fontSize: 10, fontFamily: "system-ui", lineHeight: 1.5 }}>
              Tokyo uses OSM admin level 9 boundaries grouped by ward (区). Toggle "Adjacent wards" to see cross-ward zones when near a boundary.
            </div>
          </div>
        )}
      </div>

      <style>{`
        .zt,.zt::before,.leaflet-tooltip { background:transparent!important; border:none!important; box-shadow:none!important; padding:0!important; }
      `}</style>
    </div>
  );
}

export default ZoneMap;
