/**
 * Route Encoder Utility
 * 
 * Converts GPS coordinates to Google's encoded polyline format for Search Along Route API.
 * Implements validation and handles various route patterns and edge cases.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

/**
 * Validates coordinates to ensure they are within valid latitude/longitude ranges
 * @param {Array<{latitude: number, longitude: number}>} coordinates - Array of GPS coordinates
 * @returns {boolean} - True if all coordinates are valid
 */
export function validateCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return false;
  }

  return coordinates.every(coord => {
    // Check if coordinate has required properties
    if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
      return false;
    }

    // Validate latitude range (-90 to 90)
    if (coord.latitude < -90 || coord.latitude > 90) {
      return false;
    }

    // Validate longitude range (-180 to 180)
    if (coord.longitude < -180 || coord.longitude > 180) {
      return false;
    }

    // Check for NaN or infinite values
    if (!isFinite(coord.latitude) || !isFinite(coord.longitude)) {
      return false;
    }

    return true;
  });
}

/**
 * Encodes a single coordinate value using Google's polyline algorithm
 * @param {number} value - Coordinate value to encode
 * @returns {string} - Encoded coordinate string
 */
function encodeValue(value) {
  // Convert to integer (multiply by 1e5 and round)
  let intValue = Math.round(value * 1e5);
  
  // Left-shift the binary value one bit
  intValue <<= 1;
  
  // If the original decimal value is negative, invert all the bits
  if (value < 0) {
    intValue = ~intValue;
  }
  
  let encoded = '';
  
  // Break the binary value out into 5-bit chunks
  while (intValue >= 0x20) {
    // Place the 5-bit chunks into reverse order, OR each value with 0x20 if another bit chunk follows
    encoded += String.fromCharCode((0x20 | (intValue & 0x1f)) + 63);
    intValue >>= 5;
  }
  
  // Add the final chunk without the OR operation
  encoded += String.fromCharCode(intValue + 63);
  
  return encoded;
}

/**
 * Converts an array of GPS coordinates to Google's encoded polyline format
 * @param {Array<{latitude: number, longitude: number}>} coordinates - Array of GPS coordinates
 * @returns {string} - Encoded polyline string
 * @throws {Error} - If coordinates are invalid
 */
export function encodeRoute(coordinates) {
  // Validate input coordinates
  if (!validateCoordinates(coordinates)) {
    throw new Error('Invalid coordinates provided. Coordinates must be an array of objects with valid latitude and longitude values.');
  }

  // Handle edge case of single coordinate
  if (coordinates.length === 1) {
    const { latitude, longitude } = coordinates[0];
    return encodeValue(latitude) + encodeValue(longitude);
  }

  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  // Encode each coordinate as a delta from the previous coordinate
  for (const coord of coordinates) {
    const { latitude, longitude } = coord;
    
    // Calculate deltas
    const deltaLat = latitude - prevLat;
    const deltaLng = longitude - prevLng;
    
    // Encode deltas
    encoded += encodeValue(deltaLat);
    encoded += encodeValue(deltaLng);
    
    // Update previous coordinates
    prevLat = latitude;
    prevLng = longitude;
  }

  return encoded;
}

/**
 * Calculates the total distance of a route in meters
 * @param {Array<{latitude: number, longitude: number}>} coordinates - Array of GPS coordinates
 * @returns {number} - Total distance in meters
 */
export function calculateRouteDistance(coordinates) {
  if (!validateCoordinates(coordinates) || coordinates.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    totalDistance += calculateHaversineDistance(prev, curr);
  }

  return totalDistance;
}

/**
 * Calculates the distance between two coordinates using the Haversine formula
 * @param {{latitude: number, longitude: number}} coord1 - First coordinate
 * @param {{latitude: number, longitude: number}} coord2 - Second coordinate
 * @returns {number} - Distance in meters
 */
function calculateHaversineDistance(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLngRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Checks if a route meets the minimum length requirement for Search Along Route
 * @param {Array<{latitude: number, longitude: number}>} coordinates - Array of GPS coordinates
 * @param {number} minLength - Minimum length in meters (default: 50)
 * @returns {boolean} - True if route is long enough for SAR
 */
export function isRouteLongEnoughForSAR(coordinates, minLength = 50) {
  const distance = calculateRouteDistance(coordinates);
  return distance >= minLength;
}

/**
 * Simplifies a route by removing redundant points while preserving the overall shape
 * Uses the Douglas-Peucker algorithm for line simplification
 * @param {Array<{latitude: number, longitude: number}>} coordinates - Array of GPS coordinates
 * @param {number} tolerance - Tolerance in meters (default: 5)
 * @returns {Array<{latitude: number, longitude: number}>} - Simplified coordinates
 */
export function simplifyRoute(coordinates, tolerance = 5) {
  if (!validateCoordinates(coordinates) || coordinates.length <= 2) {
    return coordinates;
  }

  // Convert tolerance from meters to degrees (approximate)
  const toleranceDegrees = tolerance / 111000; // Rough conversion: 1 degree ≈ 111km

  return douglasPeucker(coordinates, toleranceDegrees);
}

/**
 * Douglas-Peucker line simplification algorithm
 * @param {Array<{latitude: number, longitude: number}>} points - Array of coordinates
 * @param {number} tolerance - Tolerance in degrees
 * @returns {Array<{latitude: number, longitude: number}>} - Simplified coordinates
 */
function douglasPeucker(points, tolerance) {
  if (points.length <= 2) {
    return points;
  }

  // Find the point with the maximum distance from the line between first and last points
  let maxDistance = 0;
  let maxIndex = 0;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If the maximum distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const leftSegment = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const rightSegment = douglasPeucker(points.slice(maxIndex), tolerance);
    
    // Combine segments, removing duplicate point at the junction
    return leftSegment.slice(0, -1).concat(rightSegment);
  } else {
    // If no point is far enough, return just the endpoints
    return [firstPoint, lastPoint];
  }
}

/**
 * Calculates the perpendicular distance from a point to a line
 * @param {{latitude: number, longitude: number}} point - Point to measure distance from
 * @param {{latitude: number, longitude: number}} lineStart - Start of the line
 * @param {{latitude: number, longitude: number}} lineEnd - End of the line
 * @returns {number} - Perpendicular distance in degrees
 */
function perpendicularDistance(point, lineStart, lineEnd) {
  const A = point.latitude - lineStart.latitude;
  const B = point.longitude - lineStart.longitude;
  const C = lineEnd.latitude - lineStart.latitude;
  const D = lineEnd.longitude - lineStart.longitude;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line start and end are the same point
    return Math.sqrt(A * A + B * B);
  }

  const param = dot / lenSq;
  let xx, yy;

  if (param < 0) {
    xx = lineStart.latitude;
    yy = lineStart.longitude;
  } else if (param > 1) {
    xx = lineEnd.latitude;
    yy = lineEnd.longitude;
  } else {
    xx = lineStart.latitude + param * C;
    yy = lineStart.longitude + param * D;
  }

  const dx = point.latitude - xx;
  const dy = point.longitude - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}