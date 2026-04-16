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
  boundaryStroke: "rgba(106,221,147,0.45)",
  boundaryStrokeMuted: "rgba(159,193,132,0.30)",
  visitedFill: "rgba(106,221,147,0.15)",
  completedFill: "rgba(106,221,147,0.30)",
  completedStroke: "rgba(106,221,147,0.80)",
} as const;

export const ZONE_COMPLETION_THRESHOLD = 0.8;
