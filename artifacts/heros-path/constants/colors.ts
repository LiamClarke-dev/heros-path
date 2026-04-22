// Hero's Path — "Sheikah Slate" palette
// Inspired by Breath of the Wild's actual map/UI screen colours:
//   deep blue-slate backgrounds, warm gold accents, Sheikah cyan highlights,
//   ivory parchment text — maximum contrast across all surfaces.

const Colors = {
  // ── Backgrounds ──────────────────────────────────────────────
  background:  "#0A1628",   // Deep slate blue (BotW map undiscovered)
  surface:     "#152038",   // Slightly lighter slate
  card:        "#1E2E48",   // Card surface — clearly blue-slate
  border:      "#2A3F5E",   // Visible border on slate
  borderLight: "#3D5A80",   // Lighter border, still blue

  // ── Primary: Warm Gold ───────────────────────────────────────
  gold:        "#EDC870",   // BotW UI frame gold (exact from community palette)
  goldDark:    "#A87830",   // Deep gold
  goldGlow:    "rgba(237,200,112,0.22)",

  // ── Secondary: Sheikah Cyan ──────────────────────────────────
  amber:       "#18ACC2",   // Sheikah cyan/teal (shrine blue)
  amberDark:   "#0D6878",   // Deep lake teal
  amberGlow:   "rgba(24,172,194,0.16)",

  // ── Text: BotW Parchment ─────────────────────────────────────
  parchment:      "#FFF0DD",  // BotW parchment cream (exact)
  parchmentMuted: "#9ADAF6",  // BotW sky blue — readable on dark slate
  parchmentDim:   "#3D6080",  // Dim slate shadow text

  // ── Amber (Sheikah cyan) alpha variants ──────────────────────
  amberGlow80: "rgba(24,172,194,0.80)",
  amberGlow55: "rgba(24,172,194,0.55)",
  amberGlow30: "rgba(24,172,194,0.30)",

  // ── Background alpha variants (for overlays / gradients) ────
  backgroundAlpha92: "rgba(10,22,40,0.92)",
  backgroundAlpha88: "rgba(10,22,40,0.88)",
  backgroundAlpha85: "rgba(10,22,40,0.85)",
  backgroundAlpha75: "rgba(10,22,40,0.75)",
  backgroundAlpha72: "rgba(10,22,40,0.72)",
  backgroundAlpha70: "rgba(10,22,40,0.70)",
  backgroundAlpha50: "rgba(10,22,40,0.50)",
  backgroundAlpha40: "rgba(10,22,40,0.40)",

  // ── Gold alpha variants (for tinted backgrounds) ─────────────
  goldGlow45: "rgba(237,200,112,0.45)",
  goldGlow40: "rgba(237,200,112,0.40)",
  goldGlow30: "rgba(237,200,112,0.30)",
  goldGlow20: "rgba(237,200,112,0.20)",
  goldGlow18: "rgba(237,200,112,0.18)",
  goldGlow15: "rgba(237,200,112,0.15)",
  goldGlow12: "rgba(237,200,112,0.12)",
  goldGlow10: "rgba(237,200,112,0.10)",
  goldGlow08: "rgba(237,200,112,0.08)",

  // ── Status ───────────────────────────────────────────────────
  error:   "#C7472A",         // BotW heart flame red
  info:    "#18ACC2",         // Sheikah cyan
  success: "#EDC870",         // Gold

  // ── Tab Bar ──────────────────────────────────────────────────
  tabBar:         "#060E1C",  // Darkest slate
  tabBarActive:   "#EDC870",  // Gold active
  tabBarInactive: "#2A3F5E",  // Dark slate inactive

  // ── Map: Zelda Breath of the Wild warm parchment cartography ─
  // All `labels.icon` features are forced off — without this, Google Maps renders
  // grey square placeholders where icons would normally sit, covering roads.
  mapDark: [
    { featureType: "all", elementType: "labels", stylers: [{ visibility: "on" }] },
    { featureType: "all", elementType: "labels.text", stylers: [{ visibility: "on" }] },
    { featureType: "all", elementType: "labels.text.fill", stylers: [{ visibility: "on" }] },
    { featureType: "all", elementType: "labels.text.stroke", stylers: [{ visibility: "on" }] },
    { featureType: "all", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "all", stylers: [{ visibility: "on" }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#9d935e" }] },
    { featureType: "administrative", elementType: "labels.text.stroke", stylers: [{ color: "#3f3b28" }] },
    { featureType: "administrative", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "landscape", elementType: "geometry.fill", stylers: [{ color: "#5a5335" }] },
    { featureType: "landscape.man_made", elementType: "geometry.fill", stylers: [{ color: "#4d4329" }] },
    { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
    { featureType: "landscape.natural.terrain", elementType: "geometry.fill", stylers: [{ color: "#6e6950" }] },
    { featureType: "poi", elementType: "geometry.fill", stylers: [{ color: "#372f14" }] },
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#372f14" }] },
    { featureType: "road", elementType: "all", stylers: [{ saturation: -100 }, { lightness: 45 }, { color: "#959358" }] },
    { featureType: "road", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "road.highway", elementType: "all", stylers: [{ visibility: "simplified" }] },
    { featureType: "road.highway", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "road.arterial", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#344144" }] },
  ],
};

export default Colors;
