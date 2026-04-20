export interface ZoneData {
  id: string;
  name: string;
  nameEn: string | null;
  wardId: string | null;
  centroidLat: number;
  centroidLng: number;
  boundary: {
    type: "Polygon" | "MultiPolygon";
    coordinates: [number, number][][] | [number, number][][][];
  };
  coveragePct: number;
  completedAt: string | null;
}

export interface RNCoord {
  latitude: number;
  longitude: number;
}

export interface ViewportBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export function boundaryToPolygonCoords(boundary: ZoneData["boundary"]): RNCoord[][] {
  if (boundary.type === "Polygon") {
    return (boundary.coordinates as [number, number][][]).map((ring) =>
      ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
    );
  }
  return (boundary.coordinates as [number, number][][][]).map((poly) =>
    poly[0].map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
  );
}

export function isZoneInViewport(zone: ZoneData, bounds: ViewportBounds): boolean {
  const { centroidLat, centroidLng } = zone;
  const pad = 0.1;
  return (
    centroidLat >= bounds.swLat - pad &&
    centroidLat <= bounds.neLat + pad &&
    centroidLng >= bounds.swLng - pad &&
    centroidLng <= bounds.neLng + pad
  );
}

export function getZoneCompletionLabel(zone: ZoneData): string {
  const pct = Math.round(zone.coveragePct * 100);
  const displayName = zone.nameEn ?? zone.name;
  return `${pct}% · ${displayName}`;
}

// Use #RRGGBBAA hex format throughout — rgba() strings are not reliably parsed
// by the native Google Maps layer on iOS New Architecture (Fabric).
export const ZONE_COLORS = {
  // Untouched zones — ghost outline only, no fill
  unvisitedStroke: "#38CCF6F2",   // 95% opacity
  // In-progress zones — visible dashed outline, coverage-scaled fill
  inProgressStroke: "#38CCF6F2",  // 95% opacity
  // Completed zones — bright dashed outline, fixed fill
  completedStroke: "#38CCF6FF",   // 100% opacity
  completedFill: "#38CCF633",     // 20% opacity
} as const;

export const ZONE_COMPLETION_THRESHOLD = 0.8;
