/**
 * Route Encoder Tests
 * 
 * Comprehensive tests for the Route Encoder utility functions.
 * Tests encoding, validation, and edge cases for various route patterns.
 */

import {
  validateCoordinates,
  encodeRoute,
  calculateRouteDistance,
  isRouteLongEnoughForSAR,
  simplifyRoute
} from '../utils/routeEncoder';

describe('Route Encoder', () => {
  describe('validateCoordinates', () => {
    test('should return true for valid coordinates', () => {
      const validCoords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 }
      ];
      expect(validateCoordinates(validCoords)).toBe(true);
    });

    test('should return false for empty array', () => {
      expect(validateCoordinates([])).toBe(false);
    });

    test('should return false for non-array input', () => {
      expect(validateCoordinates(null)).toBe(false);
      expect(validateCoordinates(undefined)).toBe(false);
      expect(validateCoordinates('invalid')).toBe(false);
      expect(validateCoordinates({})).toBe(false);
    });

    test('should return false for coordinates with invalid latitude', () => {
      const invalidCoords = [
        { latitude: 91, longitude: -122.4194 }, // latitude > 90
        { latitude: -91, longitude: -122.4194 }, // latitude < -90
        { latitude: NaN, longitude: -122.4194 }, // NaN latitude
        { latitude: Infinity, longitude: -122.4194 } // Infinite latitude
      ];
      
      invalidCoords.forEach(coords => {
        expect(validateCoordinates([coords])).toBe(false);
      });
    });

    test('should return false for coordinates with invalid longitude', () => {
      const invalidCoords = [
        { latitude: 37.7749, longitude: 181 }, // longitude > 180
        { latitude: 37.7749, longitude: -181 }, // longitude < -180
        { latitude: 37.7749, longitude: NaN }, // NaN longitude
        { latitude: 37.7749, longitude: Infinity } // Infinite longitude
      ];
      
      invalidCoords.forEach(coords => {
        expect(validateCoordinates([coords])).toBe(false);
      });
    });

    test('should return false for coordinates missing required properties', () => {
      const invalidCoords = [
        { latitude: 37.7749 }, // missing longitude
        { longitude: -122.4194 }, // missing latitude
        {}, // missing both
        null, // null coordinate
        undefined // undefined coordinate
      ];
      
      invalidCoords.forEach(coords => {
        expect(validateCoordinates([coords])).toBe(false);
      });
    });

    test('should return false for coordinates with non-numeric values', () => {
      const invalidCoords = [
        { latitude: '37.7749', longitude: -122.4194 }, // string latitude
        { latitude: 37.7749, longitude: '-122.4194' }, // string longitude
        { latitude: true, longitude: -122.4194 }, // boolean latitude
        { latitude: 37.7749, longitude: false } // boolean longitude
      ];
      
      invalidCoords.forEach(coords => {
        expect(validateCoordinates([coords])).toBe(false);
      });
    });

    test('should validate boundary values correctly', () => {
      const boundaryCoords = [
        { latitude: 90, longitude: 180 }, // max values
        { latitude: -90, longitude: -180 }, // min values
        { latitude: 0, longitude: 0 } // zero values
      ];
      expect(validateCoordinates(boundaryCoords)).toBe(true);
    });
  });

  describe('encodeRoute', () => {
    test('should encode a simple two-point route', () => {
      const coords = [
        { latitude: 38.5, longitude: -120.2 },
        { latitude: 40.7, longitude: -120.95 }
      ];
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    test('should encode a single coordinate', () => {
      const coords = [{ latitude: 37.7749, longitude: -122.4194 }];
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    test('should encode a complex multi-point route', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 },
        { latitude: 37.7949, longitude: -122.3994 },
        { latitude: 37.8049, longitude: -122.3894 },
        { latitude: 37.8149, longitude: -122.3794 }
      ];
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    test('should handle coordinates with high precision', () => {
      const coords = [
        { latitude: 37.774929, longitude: -122.419416 },
        { latitude: 37.774930, longitude: -122.419417 }
      ];
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    test('should handle coordinates at extreme values', () => {
      const coords = [
        { latitude: -90, longitude: -180 },
        { latitude: 90, longitude: 180 }
      ];
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    test('should handle coordinates with zero values', () => {
      const coords = [
        { latitude: 0, longitude: 0 },
        { latitude: 0.001, longitude: 0.001 }
      ];
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    test('should throw error for invalid coordinates', () => {
      const invalidCoords = [
        { latitude: 91, longitude: -122.4194 }
      ];
      expect(() => encodeRoute(invalidCoords)).toThrow('Invalid coordinates provided');
    });

    test('should throw error for empty coordinates array', () => {
      expect(() => encodeRoute([])).toThrow('Invalid coordinates provided');
    });

    test('should handle straight line routes', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4194 }, // same longitude
        { latitude: 37.7949, longitude: -122.4194 }
      ];
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    test('should handle curved routes', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 },
        { latitude: 37.7749, longitude: -122.3994 }, // curve back
        { latitude: 37.7649, longitude: -122.4094 }
      ];
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe('calculateRouteDistance', () => {
    test('should return 0 for empty coordinates', () => {
      expect(calculateRouteDistance([])).toBe(0);
    });

    test('should return 0 for single coordinate', () => {
      const coords = [{ latitude: 37.7749, longitude: -122.4194 }];
      expect(calculateRouteDistance(coords)).toBe(0);
    });

    test('should calculate distance for two coordinates', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 }
      ];
      const distance = calculateRouteDistance(coords);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20000); // Should be reasonable distance
    });

    test('should calculate cumulative distance for multiple coordinates', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 },
        { latitude: 37.7949, longitude: -122.3994 }
      ];
      const distance = calculateRouteDistance(coords);
      expect(distance).toBeGreaterThan(0);
      
      // Distance should be greater than single segment
      const singleSegmentDistance = calculateRouteDistance([coords[0], coords[1]]);
      expect(distance).toBeGreaterThan(singleSegmentDistance);
    });

    test('should handle coordinates at same location', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7749, longitude: -122.4194 }
      ];
      const distance = calculateRouteDistance(coords);
      expect(distance).toBe(0);
    });

    test('should return 0 for invalid coordinates', () => {
      const invalidCoords = [
        { latitude: 91, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 }
      ];
      expect(calculateRouteDistance(invalidCoords)).toBe(0);
    });
  });

  describe('isRouteLongEnoughForSAR', () => {
    test('should return true for routes longer than minimum length', () => {
      // Create a route that's definitely longer than 50m
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 } // ~1.5km apart
      ];
      expect(isRouteLongEnoughForSAR(coords)).toBe(true);
    });

    test('should return false for very short routes', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.774901, longitude: -122.419401 } // ~1m apart
      ];
      expect(isRouteLongEnoughForSAR(coords)).toBe(false);
    });

    test('should return false for single coordinate', () => {
      const coords = [{ latitude: 37.7749, longitude: -122.4194 }];
      expect(isRouteLongEnoughForSAR(coords)).toBe(false);
    });

    test('should return false for empty coordinates', () => {
      expect(isRouteLongEnoughForSAR([])).toBe(false);
    });

    test('should respect custom minimum length', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7749, longitude: -122.4184 } // ~100m apart
      ];
      expect(isRouteLongEnoughForSAR(coords, 50)).toBe(true);
      expect(isRouteLongEnoughForSAR(coords, 200)).toBe(false);
    });

    test('should return false for invalid coordinates', () => {
      const invalidCoords = [
        { latitude: 91, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 }
      ];
      expect(isRouteLongEnoughForSAR(invalidCoords)).toBe(false);
    });
  });

  describe('simplifyRoute', () => {
    test('should return original coordinates for routes with 2 or fewer points', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 }
      ];
      const simplified = simplifyRoute(coords);
      expect(simplified).toEqual(coords);
    });

    test('should simplify routes with redundant points', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7799, longitude: -122.4144 }, // midpoint on straight line
        { latitude: 37.7849, longitude: -122.4094 }
      ];
      const simplified = simplifyRoute(coords, 100); // High tolerance
      expect(simplified.length).toBeLessThan(coords.length);
      expect(simplified[0]).toEqual(coords[0]);
      expect(simplified[simplified.length - 1]).toEqual(coords[coords.length - 1]);
    });

    test('should preserve important points in complex routes', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 },
        { latitude: 37.7749, longitude: -122.3994 }, // significant turn
        { latitude: 37.7649, longitude: -122.4094 }
      ];
      const simplified = simplifyRoute(coords, 5); // Low tolerance
      expect(simplified.length).toBeGreaterThan(2);
      expect(simplified[0]).toEqual(coords[0]);
      expect(simplified[simplified.length - 1]).toEqual(coords[coords.length - 1]);
    });

    test('should handle invalid coordinates gracefully', () => {
      const invalidCoords = [
        { latitude: 91, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 }
      ];
      const simplified = simplifyRoute(invalidCoords);
      expect(simplified).toEqual(invalidCoords);
    });

    test('should handle empty coordinates', () => {
      const simplified = simplifyRoute([]);
      expect(simplified).toEqual([]);
    });

    test('should respect tolerance parameter', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7799, longitude: -122.4144 },
        { latitude: 37.7849, longitude: -122.4094 }
      ];
      
      const highTolerance = simplifyRoute(coords, 1000);
      const lowTolerance = simplifyRoute(coords, 1);
      
      expect(highTolerance.length).toBeLessThanOrEqual(lowTolerance.length);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle routes with duplicate consecutive points', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7749, longitude: -122.4194 }, // duplicate
        { latitude: 37.7849, longitude: -122.4094 }
      ];
      
      expect(() => encodeRoute(coords)).not.toThrow();
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
    });

    test('should handle very long routes', () => {
      // Create a route with many points
      const coords = [];
      for (let i = 0; i < 1000; i++) {
        coords.push({
          latitude: 37.7749 + (i * 0.0001),
          longitude: -122.4194 + (i * 0.0001)
        });
      }
      
      expect(() => encodeRoute(coords)).not.toThrow();
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    test('should handle routes crossing the international date line', () => {
      const coords = [
        { latitude: 0, longitude: 179 },
        { latitude: 0, longitude: -179 }
      ];
      
      expect(() => encodeRoute(coords)).not.toThrow();
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
    });

    test('should handle routes crossing the equator', () => {
      const coords = [
        { latitude: 1, longitude: 0 },
        { latitude: -1, longitude: 0 }
      ];
      
      expect(() => encodeRoute(coords)).not.toThrow();
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
    });

    test('should handle routes at the poles', () => {
      const coords = [
        { latitude: 89, longitude: 0 },
        { latitude: 90, longitude: 0 }
      ];
      
      expect(() => encodeRoute(coords)).not.toThrow();
      const encoded = encodeRoute(coords);
      expect(typeof encoded).toBe('string');
    });
  });

  describe('Performance Tests', () => {
    test('should encode large routes efficiently', () => {
      // Create a large route
      const coords = [];
      for (let i = 0; i < 10000; i++) {
        coords.push({
          latitude: 37.7749 + (i * 0.00001),
          longitude: -122.4194 + (i * 0.00001)
        });
      }
      
      const startTime = Date.now();
      const encoded = encodeRoute(coords);
      const endTime = Date.now();
      
      expect(typeof encoded).toBe('string');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should validate large coordinate arrays efficiently', () => {
      // Create a large coordinate array
      const coords = [];
      for (let i = 0; i < 10000; i++) {
        coords.push({
          latitude: 37.7749 + (i * 0.00001),
          longitude: -122.4194 + (i * 0.00001)
        });
      }
      
      const startTime = Date.now();
      const isValid = validateCoordinates(coords);
      const endTime = Date.now();
      
      expect(isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});