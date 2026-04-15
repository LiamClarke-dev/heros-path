import logger from "../logger.js";

export interface Coord {
  lat: number;
  lng: number;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function totalDistance(coords: Coord[]): number {
  let dist = 0;
  for (let i = 1; i < coords.length; i++) {
    dist += haversineDistance(
      coords[i - 1].lat,
      coords[i - 1].lng,
      coords[i].lat,
      coords[i].lng
    );
  }
  return dist;
}

function encodeValue(value: number): string {
  let encoded = "";
  let v = Math.round(value * 1e5);
  v = v < 0 ? ~(v << 1) : v << 1;
  while (v >= 0x20) {
    encoded += String.fromCharCode(((v & 0x1f) | 0x20) + 63);
    v >>= 5;
  }
  encoded += String.fromCharCode(v + 63);
  return encoded;
}

export function encodePolyline(coords: Coord[]): string {
  let result = "";
  let prevLat = 0;
  let prevLng = 0;
  for (const { lat, lng } of coords) {
    result += encodeValue(lat - prevLat);
    result += encodeValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return result;
}

export function decodePolyline(encoded: string): Coord[] {
  const coords: Coord[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}

export async function snapRouteToRoads(coords: Coord[]): Promise<Coord[] | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    logger.warn("GOOGLE_MAPS_API_KEY not set — skipping road snap");
    return null;
  }

  const step = Math.ceil(coords.length / 100);
  const sample = coords.filter((_, i) => i % step === 0 || i === coords.length - 1);
  const path = sample.map((c) => `${c.lat},${c.lng}`).join("|");

  try {
    const url =
      `https://roads.googleapis.com/v1/snapToRoads` +
      `?path=${encodeURIComponent(path)}&interpolate=true&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const hint =
        res.status === 403
          ? "Roads API not enabled — enable it in GCP Console > APIs & Services"
          : res.status === 429
            ? "Roads API quota exceeded — check GCP quotas for Roads API"
            : "Check GCP credentials and API key restrictions";
      logger.warn({ status: res.status, body: text, hint }, "Roads API snap failed");
      return null;
    }
    const data = (await res.json()) as {
      snappedPoints?: Array<{ location: { latitude: number; longitude: number } }>;
    };
    if (!data.snappedPoints?.length) return null;
    return data.snappedPoints.map((p) => ({
      lat: p.location.latitude,
      lng: p.location.longitude,
    }));
  } catch (err) {
    logger.warn({ err }, "Roads API snap threw — keeping raw polyline");
    return null;
  }
}
