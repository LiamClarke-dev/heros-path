const Colors = {
  background: "#0D0A0B",
  surface: "#1A1510",
  card: "#221C14",
  border: "#2E2418",
  borderLight: "#4A3C28",

  gold: "#D4A017",
  goldDark: "#A07810",
  goldGlow: "rgba(212,160,23,0.12)",

  parchment: "#F5E6C8",
  parchmentMuted: "#A08060",
  parchmentDim: "#6A5040",

  error: "#E53935",
  info: "#29B6F6",
  success: "#4A9B5E",

  tabBar: "#0E0B0C",
  tabBarActive: "#D4A017",
  tabBarInactive: "#6A5040",

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
};

export default Colors;
