export interface SuburbSegment {
  id: string;
  geom: {
    type: "LineString";
    coordinates: [number, number][];
  };
  explored: boolean;
}

export interface SuburbData {
  id: string;
  name: string;
  city: string;
  centroidLat: number;
  centroidLng: number;
  completionPct: number;
  completedAt: string | null;
  boundary: {
    type: "Polygon" | "MultiPolygon";
    coordinates: [number, number][][] | [number, number][][][];
  };
  segments: SuburbSegment[];
}

export interface ViewportBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface RNCoord {
  latitude: number;
  longitude: number;
}

export function culledSegments(
  segments: SuburbSegment[],
  bounds: ViewportBounds
): SuburbSegment[] {
  return segments.filter((seg) => {
    if (!seg.geom?.coordinates?.length) return false;
    return seg.geom.coordinates.some(
      ([lng, lat]) =>
        lat >= bounds.swLat &&
        lat <= bounds.neLat &&
        lng >= bounds.swLng &&
        lng <= bounds.neLng
    );
  });
}

export function boundaryToPolygonCoords(
  boundary: SuburbData["boundary"]
): RNCoord[][] {
  if (boundary.type === "Polygon") {
    return (boundary.coordinates as [number, number][][]).map((ring) =>
      ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
    );
  }
  return (boundary.coordinates as [number, number][][][]).map((poly) =>
    poly[0].map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
  );
}

export function segmentToPolylineCoords(seg: SuburbSegment): RNCoord[] {
  return seg.geom.coordinates.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));
}

export function getCompletionLabel(suburb: SuburbData): string {
  return `${Math.round(suburb.completionPct * 100)}% · ${suburb.name}`;
}

export const SUBURB_COLORS = {
  boundaryStroke: "rgba(159,193,132,0.55)",
  unexploredSegment: "rgba(180,180,180,0.25)",
  exploredSegment: "rgba(212,160,23,0.65)",
  completedFill: "rgba(159,193,132,0.18)",
} as const;

export const SUBURB_COMPLETION_THRESHOLD = 0.8;
