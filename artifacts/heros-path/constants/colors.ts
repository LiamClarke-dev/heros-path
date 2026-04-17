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

  // ── Map: Hyrule-style dark cartography (unchanged) ───────────
  mapDark: [
    // Base land — forest floor
    { elementType: "geometry",
      stylers: [{ color: "#152218" }] },
    { elementType: "labels.text.stroke",
      stylers: [{ color: "#0D1A10" }] },
    { elementType: "labels.text.fill",
      stylers: [{ color: "#86A5A9" }] },

    // Town / locality labels — sage green
    { featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9FC184" }] },

    // Roads — warm olive earth path
    { featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#243820" }] },
    { featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#152218" }] },
    { featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#86A5A9" }] },

    // Highways — lighter earthy trail
    { featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#2E4828" }] },
    { featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#152218" }] },
    { featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9FC184" }] },

    // Transit
    { featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#152218" }] },

    // Water — deep Hyrule lake
    { featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#0A1E28" }] },
    { featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#97C8D9" }] },

    // POI
    { featureType: "poi",
      elementType: "geometry",
      stylers: [{ color: "#152218" }] },

    // Parks — lush Hyrule field
    { featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#182A18" }] },
    { featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9FC184" }] },
  ],
};

export default Colors;
