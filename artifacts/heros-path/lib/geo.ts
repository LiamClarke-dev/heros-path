export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface LatLng {
  latitude: number;
  longitude: number;
}

function perpendicularDistanceDeg(
  point: LatLng,
  lineStart: LatLng,
  lineEnd: LatLng
): number {
  const dx = lineEnd.longitude - lineStart.longitude;
  const dy = lineEnd.latitude - lineStart.latitude;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = point.longitude - lineStart.longitude;
    const ey = point.latitude - lineStart.latitude;
    return Math.sqrt(ex * ex + ey * ey);
  }
  const t = ((point.longitude - lineStart.longitude) * dx + (point.latitude - lineStart.latitude) * dy) / lenSq;
  const px = lineStart.longitude + t * dx - point.longitude;
  const py = lineStart.latitude + t * dy - point.latitude;
  return Math.sqrt(px * px + py * py);
}

export function rdpSimplify(points: LatLng[], epsilonDeg: number): LatLng[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistanceDeg(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilonDeg) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilonDeg);
    const right = rdpSimplify(points.slice(maxIdx), epsilonDeg);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[end]];
}
