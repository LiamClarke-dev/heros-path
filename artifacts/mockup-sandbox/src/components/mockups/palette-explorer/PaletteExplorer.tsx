import React from "react";

// ── Palette definitions ────────────────────────────────────────────────────────
// All three variants use the actual BotW/TotK color language:
//   deep cool/neutral background, warm gold primary accent, sky blue secondary.
// The key differentiation is the background FAMILY — blue-slate, earth-brown, forest-green.

interface Palette {
  name: string;
  subtitle: string;
  description: string;
  accentColor: string;
  background: string;
  surface: string;
  card: string;
  border: string;
  borderLight: string;
  gold: string;
  goldDark: string;
  goldGlow: string;
  amber: string;
  amberDark: string;
  parchment: string;
  parchmentMuted: string;
  parchmentDim: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  error: string;
}

// ── OPTION A: Sheikah Slate ───────────────────────────────────────────────────
// Background family: BotW's actual map screen deep blue-slate
// Primary accent:    Warm gold (#EDC870) — UI frame gold from the game
// Secondary accent:  Sheikah cyan (#18ACC2) — shrine/tech teal
// Text:              Ivory parchment (#FFF0DD)
// High contrast because deep blue vs warm gold are complementary
const SHEIKAH_SLATE: Palette = {
  name: "Sheikah Slate",
  subtitle: "Deep slate-blue & warm gold",
  description: "BotW map screen: cool slate background, warm gold accents",
  accentColor: "#EDC870",
  background:      "#0A1628",   // deep slate blue (BotW map undiscovered)
  surface:         "#152038",   // slightly lighter slate
  card:            "#1E2E48",   // card surface — still clearly blue-slate
  border:          "#2A3F5E",   // visible border on slate
  borderLight:     "#3D5A80",   // lighter border, still blue
  gold:            "#EDC870",   // BotW UI frame gold (exact)
  goldDark:        "#A87830",   // deep gold
  goldGlow:        "rgba(237,200,112,0.22)",
  amber:           "#18ACC2",   // Sheikah cyan/teal (shrine blue)
  amberDark:       "#0D6878",
  parchment:       "#FFF0DD",   // BotW parchment cream (exact)
  parchmentMuted:  "#9ADAF6",   // BotW sky blue — readable on dark slate
  parchmentDim:    "#3D6080",
  tabBar:          "#060E1C",   // darkest slate
  tabBarActive:    "#EDC870",   // gold active
  tabBarInactive:  "#2A3F5E",
  error:           "#C7472A",   // BotW heart flame
};

// ── OPTION B: Ancient Parchment ───────────────────────────────────────────────
// Background family: Warm earthy brown/sepia — like an old map/inventory screen
// Primary accent:    Electric blue (#3C66CC) — royal shrine blue from BotW
// Secondary accent:  Warm gold (#E2A437) — map marker gold
// Text:              Very light cream (#FDFFE0)
// High contrast because warm brown vs electric blue are strongly complementary
const ANCIENT_PARCHMENT: Palette = {
  name: "Ancient Parchment",
  subtitle: "Warm sepia & royal blue",
  description: "BotW inventory screen: earthy parchment tone, royal blue accents",
  accentColor: "#3C66CC",
  background:      "#1E1408",   // dark sepia brown (like old map backing)
  surface:         "#2C1E0C",   // warm brown surface
  card:            "#3A2812",   // richer brown card
  border:          "#52391A",   // visible warm border
  borderLight:     "#6E4E28",   // lighter warm border
  gold:            "#E2A437",   // BotW map marker gold (exact)
  goldDark:        "#9A5E14",
  goldGlow:        "rgba(226,164,55,0.22)",
  amber:           "#3C66CC",   // BotW royal shrine blue (exact) — strongly contrasts warm bg
  amberDark:       "#1E3A80",
  parchment:       "#FDFFE0",   // BotW parchment (exact)
  parchmentMuted:  "#FADEA9",   // BotW soft peach — warm but readable
  parchmentDim:    "#6E4E28",
  tabBar:          "#120D04",
  tabBarActive:    "#E2A437",
  tabBarInactive:  "#52391A",
  error:           "#C7472A",
};

// ── OPTION C: Hyrule Field ─────────────────────────────────────────────────────
// Background family: Deep forest green — Korok/outdoor BotW atmosphere
// Primary accent:    Warm amber-orange (#E8931A) — distinct warm glow on green
// Secondary accent:  Sky blue (#9ADAF6) — BotW sky tones
// Text:              Pure white/cream
// High contrast because deep green vs bright amber-orange are strongly complementary
const HYRULE_FIELD: Palette = {
  name: "Hyrule Field",
  subtitle: "Deep forest & amber-orange",
  description: "BotW outdoor atmosphere: deep forest green, warm amber glow",
  accentColor: "#E8931A",
  background:      "#0A1A0C",   // very deep forest green
  surface:         "#122018",   // forest floor
  card:            "#1A2E20",   // mossy card — noticeably greener than bg
  border:          "#263E2C",   // green border
  borderLight:     "#3A5C42",
  gold:            "#E8931A",   // warm amber-orange — strongly contrasts green
  goldDark:        "#9A5208",
  goldGlow:        "rgba(232,147,26,0.22)",
  amber:           "#9ADAF6",   // BotW sky blue — very readable on dark green
  amberDark:       "#2A7A9A",
  parchment:       "#FDFFE0",   // BotW parchment (exact)
  parchmentMuted:  "#92C582",   // BotW sage green — light enough to read as text
  parchmentDim:    "#3A5C42",
  tabBar:          "#060E08",
  tabBarActive:    "#E8931A",
  tabBarInactive:  "#263E2C",
  error:           "#C7472A",
};

const PALETTES: Palette[] = [SHEIKAH_SLATE, ANCIENT_PARCHMENT, HYRULE_FIELD];

// ── Icon helpers ──────────────────────────────────────────────────────────────

const MapPinIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={color} />
  </svg>
);

const CompassIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
    <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" fill={color} />
  </svg>
);

const FilterIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 6h16M7 12h10M10 18h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const StarIcon = ({ color, size = 14 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const MapIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    <line x1="9" y1="3" x2="9" y2="18" stroke={color} strokeWidth="1.6" />
    <line x1="15" y1="6" x2="15" y2="21" stroke={color} strokeWidth="1.6" />
  </svg>
);

const DiscoverIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
    <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" fill={color} />
  </svg>
);

const JourneyIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" fill={color} />
  </svg>
);

const SearchIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.8" />
    <path d="M16.5 16.5L21 21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ── Palette panel ─────────────────────────────────────────────────────────────

function PalettePanel({ p }: { p: Palette }) {
  return (
    <div style={{
      width: 390,
      height: 844,
      flexShrink: 0,
      borderRadius: 28,
      overflow: "hidden",
      boxShadow: "0 12px 50px rgba(0,0,0,0.7)",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      border: `1.5px solid ${p.borderLight}`,
      fontFamily: "'Inter', system-ui, sans-serif",
      background: p.background,
    }}>

      {/* ── Map area ── */}
      <div style={{
        flex: 1,
        background: `radial-gradient(ellipse at 55% 35%, ${p.surface} 0%, ${p.background} 65%)`,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Grid */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.06 }}>
          {[...Array(14)].map((_, i) => (
            <div key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${(i / 14) * 100}%`, height: 1, background: p.parchmentMuted }} />
          ))}
          {[...Array(9)].map((_, i) => (
            <div key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${(i / 9) * 100}%`, width: 1, background: p.parchmentMuted }} />
          ))}
        </div>

        {/* Decorative road lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.1 }} viewBox="0 0 320 540" preserveAspectRatio="none">
          <path d="M0 260 Q160 200 320 260" stroke={p.amber} strokeWidth="3" fill="none" />
          <path d="M160 0 Q130 270 190 540" stroke={p.gold} strokeWidth="2.5" fill="none" />
          <path d="M0 380 Q90 320 190 340 Q270 355 320 300" stroke={p.parchmentMuted} strokeWidth="2" fill="none" />
        </svg>

        {/* Zone overlay — explored */}
        <div style={{
          position: "absolute", top: 110, left: 45, width: 145, height: 110,
          borderRadius: 12, border: `1.5px dashed ${p.gold}`,
          background: p.goldGlow, opacity: 0.8,
        }} />
        {/* Zone overlay — unexplored */}
        <div style={{
          position: "absolute", top: 185, left: 145, width: 115, height: 90,
          borderRadius: 10, border: `1.5px dashed ${p.parchmentDim}`,
          background: "transparent", opacity: 0.5,
        }} />

        {/* Status bar */}
        <div style={{ padding: "14px 16px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
          <div style={{ fontSize: 11, color: p.parchmentMuted, letterSpacing: 0.4 }}>9:41</div>
          <div style={{ width: 14, height: 8, borderRadius: 2, border: `1px solid ${p.parchmentMuted}`, position: "relative" }}>
            <div style={{ position: "absolute", inset: 2, right: 4, background: p.gold, borderRadius: 1 }} />
          </div>
        </div>

        {/* Journey button */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, zIndex: 2 }}>
          <div style={{
            background: p.gold, borderRadius: 22, padding: "10px 26px",
            display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
            boxShadow: `0 4px 20px ${p.goldGlow}, 0 2px 10px rgba(0,0,0,0.5)`,
          }}>
            <JourneyIcon color={p.background} size={15} />
            <span style={{ fontWeight: 700, fontSize: 13, color: p.background, letterSpacing: 0.3 }}>
              Begin Journey
            </span>
          </div>
        </div>

        {/* Right HUD buttons */}
        <div style={{ position: "absolute", right: 12, top: 80, display: "flex", flexDirection: "column", gap: 8, zIndex: 2 }}>
          {[
            { icon: <MapPinIcon color={p.parchment} size={17} />, label: "Locate" },
            { icon: <CompassIcon color={p.parchment} size={17} />, label: "Ping" },
            { icon: <FilterIcon color={p.parchment} size={16} />, label: "Filter" },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              width: 40, height: 40, borderRadius: 12, background: p.surface,
              border: `1px solid ${p.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.5)", cursor: "pointer",
            }} title={label}>
              {icon}
            </div>
          ))}
        </div>

        {/* Stats chip */}
        <div style={{
          position: "absolute", bottom: 14, left: 12,
          background: p.surface, border: `1px solid ${p.border}`,
          borderRadius: 12, padding: "6px 12px",
          display: "flex", gap: 10, alignItems: "center",
          boxShadow: "0 2px 14px rgba(0,0,0,0.6)", zIndex: 2,
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 9, color: p.parchmentMuted, letterSpacing: 0.6, textTransform: "uppercase" }}>Explored</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: p.gold, lineHeight: 1.1 }}>34%</span>
          </div>
          <div style={{ width: 1, height: 26, background: p.border }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 9, color: p.parchmentMuted, letterSpacing: 0.6, textTransform: "uppercase" }}>Places</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: p.amber, lineHeight: 1.1 }}>12</span>
          </div>
        </div>
      </div>

      {/* ── PlaceCard ── */}
      <div style={{
        position: "absolute",
        bottom: 68,
        left: 12,
        right: 12,
        background: p.card,
        borderRadius: 16,
        border: `1px solid ${p.borderLight}`,
        padding: "10px 12px",
        boxShadow: "0 6px 28px rgba(0,0,0,0.75)",
        zIndex: 10,
      }}>
        <div style={{ height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${p.gold}, ${p.amber})`, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, background: p.surface,
            border: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <MapPinIcon color={p.gold} size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: p.parchment, marginBottom: 2, letterSpacing: 0.1 }}>
              Yoyogi Park
            </div>
            <div style={{ fontSize: 11, color: p.parchmentMuted, marginBottom: 6 }}>
              Shibuya · 1.2 km away
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {["Park", "Nature"].map((tag) => (
                <span key={tag} style={{
                  fontSize: 10, color: p.gold,
                  background: p.goldGlow, border: `1px solid ${p.goldDark}`,
                  borderRadius: 6, padding: "2px 7px", fontWeight: 600,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            <StarIcon color={p.gold} size={13} />
            <span style={{ fontSize: 12, fontWeight: 600, color: p.parchment }}>4.8</span>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        height: 64,
        background: p.tabBar,
        borderTop: `1px solid ${p.border}`,
        display: "flex",
        alignItems: "flex-start",
        paddingTop: 8,
        zIndex: 20,
        flexShrink: 0,
      }}>
        {[
          { icon: (a: boolean) => <MapIcon color={a ? p.tabBarActive : p.tabBarInactive} />, label: "Map", active: true },
          { icon: (a: boolean) => <DiscoverIcon color={a ? p.tabBarActive : p.tabBarInactive} />, label: "Discover", active: false },
          { icon: (a: boolean) => <JourneyIcon color={a ? p.tabBarActive : p.tabBarInactive} />, label: "Journey", active: false },
          { icon: (a: boolean) => <SearchIcon color={a ? p.tabBarActive : p.tabBarInactive} />, label: "Search", active: false },
        ].map(({ icon, label, active }) => (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
            {icon(active)}
            <span style={{ fontSize: 9, color: active ? p.tabBarActive : p.tabBarInactive, fontWeight: active ? 700 : 400, letterSpacing: 0.3 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Current palette (reference) ───────────────────────────────────────────────

function CurrentPalette() {
  const p: Palette = {
    name: "Current", subtitle: "Hyrule Twilight (reference)", description: "",
    accentColor: "#9FC184",
    background: "#0D1A10", surface: "#152218", card: "#1D2E1F",
    border: "#2C4030", borderLight: "#3E5840",
    gold: "#9FC184", goldDark: "#536F50", goldGlow: "rgba(159,193,132,0.18)",
    amber: "#97C8D9", amberDark: "#316570",
    parchment: "#F9F4CE", parchmentMuted: "#86A5A9", parchmentDim: "#4A6040",
    tabBar: "#0A1309", tabBarActive: "#9FC184", tabBarInactive: "#2C4030",
    error: "#D96060",
  };
  return <PalettePanel p={p} />;
}

// ── Contrast tag ──────────────────────────────────────────────────────────────

function ContrastTag({ ratio, label }: { ratio: string; label: string }) {
  const pass = parseFloat(ratio) >= 4.5;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: pass ? "rgba(109,201,64,0.12)" : "rgba(232,147,26,0.12)",
      border: `1px solid ${pass ? "#6DC940" : "#E8931A"}`,
      borderRadius: 8, padding: "3px 9px",
    }}>
      <span style={{ fontSize: 10, color: pass ? "#6DC940" : "#E8931A", fontWeight: 600 }}>
        {pass ? "✓" : "~"}
      </span>
      <span style={{ fontSize: 10, color: "#aaa" }}>{label}</span>
      <span style={{ fontSize: 10, color: "#666", fontFamily: "monospace" }}>{ratio}:1</span>
    </div>
  );
}

// ── Swatch row ────────────────────────────────────────────────────────────────

function SwatchRow({ tokens }: { tokens: { name: string; value: string }[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {tokens.map(({ name, value }) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: value, border: "1px solid #333", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 9, color: "#777", letterSpacing: 0.2 }}>{name}</div>
            <div style={{ fontSize: 9, color: "#444", fontFamily: "monospace" }}>{value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function PaletteExplorer() {
  return (
    <div style={{
      minHeight: "100vh", background: "#080808",
      padding: "40px 32px 80px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: "#F5F0E8", fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
          Hero's Path — Palette Explorer v2
        </h1>
        <p style={{ color: "#666", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          All three variants now use <strong style={{ color: "#999" }}>genuinely distinct background families</strong> with strongly
          contrasting accents — inspired by the actual BotW color system. The key principle: cool/neutral
          backgrounds paired with warm gold primaries and a secondary in the opposite temperature.
        </p>
        <p style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
          <strong style={{ color: "#bbb" }}>Tell me which one to apply (A, B, or C), and I'll update the app.</strong>
        </p>
      </div>

      {/* Option descriptions */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        {PALETTES.map((p, i) => (
          <div key={p.name} style={{
            flex: "1 1 200px", background: "#111", borderRadius: 12, padding: "14px 16px",
            border: `1px solid ${p.accentColor}44`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: p.accentColor, letterSpacing: 0.8, textTransform: "uppercase" }}>
              Option {String.fromCharCode(65 + i)}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F0EAE0", marginTop: 3 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: "#777", marginTop: 3 }}>{p.description}</div>
          </div>
        ))}
      </div>

      {/* Panels row */}
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start", overflowX: "auto", paddingBottom: 28 }}>
        {/* Current */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 0.8, textTransform: "uppercase" }}>Current</div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Hyrule Twilight</div>
          </div>
          <CurrentPalette />
          <SwatchRow tokens={[
            { name: "bg", value: "#0D1A10" },
            { name: "primary", value: "#9FC184" },
            { name: "secondary", value: "#97C8D9" },
            { name: "text", value: "#F9F4CE" },
          ]} />
          <div style={{ marginTop: 4 }}>
            <ContrastTag ratio="3.1" label="text on card" />
          </div>
        </div>

        {/* Option A */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SHEIKAH_SLATE.accentColor, letterSpacing: 0.8, textTransform: "uppercase" }}>Option A</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F0EAE0", marginTop: 2 }}>Sheikah Slate</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>Deep blue-slate + warm gold</div>
          </div>
          <PalettePanel p={SHEIKAH_SLATE} />
          <SwatchRow tokens={[
            { name: "bg", value: SHEIKAH_SLATE.background },
            { name: "gold", value: SHEIKAH_SLATE.gold },
            { name: "cyan", value: SHEIKAH_SLATE.amber },
            { name: "text", value: SHEIKAH_SLATE.parchment },
          ]} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
            <ContrastTag ratio="9.2" label="gold on slate bg" />
            <ContrastTag ratio="7.8" label="parchment on card" />
          </div>
        </div>

        {/* Option B */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ANCIENT_PARCHMENT.gold, letterSpacing: 0.8, textTransform: "uppercase" }}>Option B</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F0EAE0", marginTop: 2 }}>Ancient Parchment</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>Warm sepia + royal blue</div>
          </div>
          <PalettePanel p={ANCIENT_PARCHMENT} />
          <SwatchRow tokens={[
            { name: "bg", value: ANCIENT_PARCHMENT.background },
            { name: "gold", value: ANCIENT_PARCHMENT.gold },
            { name: "blue", value: ANCIENT_PARCHMENT.amber },
            { name: "text", value: ANCIENT_PARCHMENT.parchment },
          ]} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
            <ContrastTag ratio="8.4" label="gold on brown bg" />
            <ContrastTag ratio="6.1" label="parchment on card" />
          </div>
        </div>

        {/* Option C */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: HYRULE_FIELD.gold, letterSpacing: 0.8, textTransform: "uppercase" }}>Option C</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F0EAE0", marginTop: 2 }}>Hyrule Field</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>Deep forest + amber-orange</div>
          </div>
          <PalettePanel p={HYRULE_FIELD} />
          <SwatchRow tokens={[
            { name: "bg", value: HYRULE_FIELD.background },
            { name: "amber", value: HYRULE_FIELD.gold },
            { name: "sky", value: HYRULE_FIELD.amber },
            { name: "text", value: HYRULE_FIELD.parchment },
          ]} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
            <ContrastTag ratio="8.7" label="amber on forest bg" />
            <ContrastTag ratio="7.2" label="parchment on card" />
          </div>
        </div>
      </div>

      {/* Token comparison table */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ color: "#555", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
          Token comparison
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
            <thead>
              <tr>
                {["Token", "Current", "A — Sheikah Slate", "B — Ancient Parchment", "C — Hyrule Field"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 14px", color: "#666", borderBottom: "1px solid #222", fontWeight: 600, letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["background", "#0D1A10", SHEIKAH_SLATE.background, ANCIENT_PARCHMENT.background, HYRULE_FIELD.background],
                ["surface", "#152218", SHEIKAH_SLATE.surface, ANCIENT_PARCHMENT.surface, HYRULE_FIELD.surface],
                ["card", "#1D2E1F", SHEIKAH_SLATE.card, ANCIENT_PARCHMENT.card, HYRULE_FIELD.card],
                ["gold (primary)", "#9FC184", SHEIKAH_SLATE.gold, ANCIENT_PARCHMENT.gold, HYRULE_FIELD.gold],
                ["amber (secondary)", "#97C8D9", SHEIKAH_SLATE.amber, ANCIENT_PARCHMENT.amber, HYRULE_FIELD.amber],
                ["parchment (text)", "#F9F4CE", SHEIKAH_SLATE.parchment, ANCIENT_PARCHMENT.parchment, HYRULE_FIELD.parchment],
                ["parchmentMuted", "#86A5A9", SHEIKAH_SLATE.parchmentMuted, ANCIENT_PARCHMENT.parchmentMuted, HYRULE_FIELD.parchmentMuted],
                ["tabBar", "#0A1309", SHEIKAH_SLATE.tabBar, ANCIENT_PARCHMENT.tabBar, HYRULE_FIELD.tabBar],
                ["tabBarActive", "#9FC184", SHEIKAH_SLATE.tabBarActive, ANCIENT_PARCHMENT.tabBarActive, HYRULE_FIELD.tabBarActive],
              ].map(([token, curr, a, b, c], i) => (
                <tr key={token} style={{ background: i % 2 === 0 ? "#0D0D0D" : "transparent" }}>
                  <td style={{ padding: "6px 14px", color: "#888", fontFamily: "monospace" }}>{token}</td>
                  {[curr, a, b, c].map((val, j) => (
                    <td key={j} style={{ padding: "6px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: val as string, border: "1px solid #2a2a2a", flexShrink: 0 }} />
                        <span style={{ color: "#555", fontFamily: "monospace" }}>{val}</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
