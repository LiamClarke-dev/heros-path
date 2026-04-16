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
  const pad = 0.05;
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

export const ZONE_COLORS = {
  // Untouched zones — ghost outline only, no fill
  unvisitedStroke: "rgba(255,213,0,0.30)",
  // In-progress zones — visible dashed outline, coverage-scaled fill
  inProgressStroke: "rgba(255,213,0,0.75)",
  // Completed zones — bright dashed outline, fixed fill
  completedStroke: "rgba(255,213,0,0.95)",
  completedFill: "rgba(255,213,0,0.25)",
} as const;

export const ZONE_COMPLETION_THRESHOLD = 0.8;
