// Hero's Path — "Hyrule Twilight" palette
// Inspired by Breath of the Wild's organic naturalistic tones:
//   sage greens, sky blues, warm parchment, deep forest darks.

const Colors = {
  // ── Backgrounds ──────────────────────────────────────────────
  background: "#0D1A10",    // Deep forest at dusk
  surface:    "#152218",    // Forest floor
  card:       "#1D2E1F",    // Mossy stone
  border:     "#2C4030",    // Undergrowth edge
  borderLight: "#3E5840",   // Sunlit leaf edge

  // ── Primary: Korok / Sage Green ──────────────────────────────
  gold:       "#9FC184",    // Hyrule sage green  (from palette 2)
  goldDark:   "#536F50",    // Deep forest shade
  goldGlow:   "rgba(159,193,132,0.18)",

  // ── Secondary: Hyrule Sky Blue ───────────────────────────────
  amber:      "#97C8D9",    // BotW sky / lake water (palette 2)
  amberDark:  "#316570",    // Deep lake teal
  amberGlow:  "rgba(151,200,217,0.14)",

  // ── Text: Ancient Parchment ──────────────────────────────────
  parchment:     "#F9F4CE", // Warm cream — ancient stone (palette 2)
  parchmentMuted: "#86A5A9", // Weathered blue-grey slate (palette 1)
  parchmentDim:  "#4A6040", // Dim forest shadow text

  // ── Status ───────────────────────────────────────────────────
  error:   "#D96060",       // Muted danger red
  info:    "#97C8D9",       // Sky blue
  success: "#9FC184",       // Sage green

  // ── Tab Bar ──────────────────────────────────────────────────
  tabBar:          "#0A1309", // Deepest forest floor
  tabBarActive:    "#9FC184", // Sage green
  tabBarInactive:  "#2C4030", // Dark undergrowth

  // ── Map: Hyrule-style dark cartography ───────────────────────
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
