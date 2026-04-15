const Colors = {
  // Core backgrounds
  background: "#09080F",
  surface: "#14101F",
  card: "#1E1830",
  border: "#2E2448",
  borderLight: "#4A3C7A",

  // Primary — vivid violet
  gold: "#8B5CF6",
  goldDark: "#6D28D9",
  goldGlow: "rgba(139,92,246,0.14)",

  // Accent — warm amber (XP, badges, highlights)
  amber: "#F59E0B",
  amberDark: "#D97706",
  amberGlow: "rgba(245,158,11,0.14)",

  // Text
  parchment: "#EDE9FE",
  parchmentMuted: "#A89CC8",
  parchmentDim: "#6B5C8A",

  // Status
  error: "#EF4444",
  info: "#38BDF8",
  success: "#22C55E",

  // Tab bar
  tabBar: "#0E0B18",
  tabBarActive: "#8B5CF6",
  tabBarInactive: "#4A3C6A",

  mapDark: [
    { elementType: "geometry", stylers: [{ color: "#14101F" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#09080F" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#A89CC8" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#8B5CF6" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#221A38" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#14101F" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#A89CC8" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#2E2448" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#14101F" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#8B5CF6" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#14101F" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#060412" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#38BDF8" }],
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [{ color: "#14101F" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#0D1F18" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#22C55E" }],
    },
  ],
};

export default Colors;
