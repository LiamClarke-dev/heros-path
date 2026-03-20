const Colors = {
  background: "#0D0A0B",
  surface: "#1A1510",
  card: "#221C14",
  border: "#3A2E20",
  borderLight: "#4A3C28",

  gold: "#D4A017",
  goldDark: "#8B5E15",
  goldLight: "#E8C547",
  goldGlow: "rgba(212,160,23,0.25)",

  parchment: "#F5E6C8",
  parchmentMuted: "#A08060",
  parchmentDim: "#6B5040",

  accent: "#E8A030",
  success: "#4A9B5E",
  successLight: "rgba(74,155,94,0.2)",
  error: "#CF6679",
  errorLight: "rgba(207,102,121,0.2)",
  info: "#5B8CB8",
  infoLight: "rgba(91,140,184,0.2)",

  tabBar: "#0E0B0C",
  tabBarActive: "#D4A017",
  tabBarInactive: "#6B5040",

  mapDark: [
    { elementType: "geometry", stylers: [{ color: "#1A1510" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0D0A0B" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#A08060" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#D4A017" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#2A2018" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1A1510" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#A08060" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#3A2E20" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1A1510" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#D4A017" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#1A1510" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#0A0E14" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#5B7A9A" }],
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [{ color: "#1A1510" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#122A1A" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#4A9B5E" }],
    },
  ],

  light: {
    text: "#F5E6C8",
    background: "#0D0A0B",
    tint: "#D4A017",
    tabIconDefault: "#6B5040",
    tabIconSelected: "#D4A017",
  },
};

export default Colors;
