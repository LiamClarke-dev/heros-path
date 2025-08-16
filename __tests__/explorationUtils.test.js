/**
 * Exploration Utils Tests
 * 
 * Tests for the exploration utility functions including segment creation,
 * merging, filtering, and statistics calculations.
 */

import {
  createRouteSegments,
  mergeSegments,
  findSegmentsInArea,
  calculateSegmentsTotalDistance,
  getSegmentStatistics,
  filterSegmentsByTimeRange,
  groupSegmentsByJourney,
  validateSegment,
  createExplorationHistoryEntry,
  cleanupOldExplorationData
} from '../utils/explorationUtils';

// Mock Logger
jest.mock('../utils/Logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock distance utils
jest.mock('../utils/distanceUtils', () => ({
  calculateDistance: jest.fn((point1, point2) => {
    // Simple distance calculation for testing
    const latDiff = point2.latitude - point1.latitude;
    const lngDiff = point2.longitude - point1.longitude;
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // Rough meters
  })
}));

describe('explorationUtils', () => {
  const mockCoordinates = [
    { latitude: 37.7749, longitude: -122.4194, timestamp: 1000 },
    { latitude: 37.7759, longitude: -122.4184, timestamp: 2000 },
    { latitude: 37.7769, longitude: -122.4174, timestamp: 3000 },
    { latitude: 37.7779, longitude: -122.4164, timestamp: 4000 },
    { latitude: 37.7789, longitude: -122.4154, timestamp: 5000 }
  ];

  describe('createRouteSegments', () => {
    test('should create segments from coordinates', () => {
      const segments = createRouteSegments(mockCoordinates, {
        minSegmentLength: 50,
        maxSegmentLength: 200,
        journeyId: 'journey_1'
      });

      expect(segments).toBeInstanceOf(Array);
      expect(segments.length).toBeGreaterThan(0);
      
      segments.forEach(segment => {
        expect(segment).toHaveProperty('start');
        expect(segment).toHaveProperty('end');
        expect(segment).toHaveProperty('timestamp');
        expect(segment).toHaveProperty('metadata');
        expect(segment.metadata.journeyId).toBe('journey_1');
      });
    });

    test('should return empty array for insufficient coordinates', () => {
      const segments = createRouteSegments([mockCoordinates[0]]);
      expect(segments).toEqual([]);
    });

    test('should handle empty coordinates', () => {
      const segments = createRouteSegments([]);
      expect(segments).toEqual([]);
    });

    test('should handle null coordinates', () => {
      const segments = createRouteSegments(null);
      expect(segments).toEqual([]);
    });
  });

  describe('mergeSegments', () => {
    const mockSegments = [
      {
        start: { latitude: 37.7749, longitude: -122.4194 },
        end: { latitude: 37.7759, longitude: -122.4184 },
        timestamp: 1000,
        metadata: {}
      },
      {
        start: { latitude: 37.7759, longitude: -122.4184 },
        end: { latitude: 37.7769, longitude: -122.4174 },
        timestamp: 2000,
        metadata: {}
      }
    ];

    test('should merge adjacent segments', () => {
      const merged = mergeSegments(mockSegments, 50); // 50 meter tolerance
      expect(merged).toBeInstanceOf(Array);
      expect(merged.length).toBeLessThanOrEqual(mockSegments.length);
    });

    test('should return original segments if no merging possible', () => {
      const distantSegments = [
        {
          start: { latitude: 37.7749, longitude: -122.4194 },
          end: { latitude: 37.7759, longitude: -122.4184 },
          timestamp: 1000,
          metadata: {}
        },
        {
          start: { latitude: 40.7128, longitude: -74.0060 }, // New York
          end: { latitude: 40.7138, longitude: -74.0050 },
          timestamp: 2000,
          metadata: {}
        }
      ];

      const merged = mergeSegments(distantSegments, 10);
      expect(merged).toHaveLength(2);
    });

    test('should handle empty segments array', () => {
      const merged = mergeSegments([]);
      expect(merged).toEqual([]);
    });

    test('should handle single segment', () => {
      const merged = mergeSegments([mockSegments[0]]);
      expect(merged).toEqual([mockSegments[0]]);
    });
  });

  describe('findSegmentsInArea', () => {
    const mockSegments = [
      {
        start: { latitude: 37.7749, longitude: -122.4194 },
        end: { latitude: 37.7759, longitude: -122.4184 },
        timestamp: 1000,
        metadata: {}
      },
      {
        start: { latitude: 40.7128, longitude: -74.0060 }, // New York
        end: { latitude: 40.7138, longitude: -74.0050 },
        timestamp: 2000,
        metadata: {}
      }
    ];

    test('should find segments within area', () => {
      const area = {
        center: { latitude: 37.7749, longitude: -122.4194 },
        radius: 1000 // 1km
      };

      const found = findSegmentsInArea(mockSegments, area);
      expect(found).toHaveLength(1);
      expect(found[0].start.latitude).toBeCloseTo(37.7749);
    });

    test('should return empty array for area with no segments', () => {
      const area = {
        center: { latitude: 50.0, longitude: 0.0 },
        radius: 100
      };

      const found = findSegmentsInArea(mockSegments, area);
      expect(found).toEqual([]);
    });

    test('should handle invalid area', () => {
      const found = findSegmentsInArea(mockSegments, null);
      expect(found).toEqual([]);
    });
  });

  describe('calculateSegmentsTotalDistance', () => {
    const mockSegments = [
      {
        start: { latitude: 37.7749, longitude: -122.4194 },
        end: { latitude: 37.7759, longitude: -122.4184 },
        distance: 100
      },
      {
        start: { latitude: 37.7759, longitude: -122.4184 },
        end: { latitude: 37.7769, longitude: -122.4174 },
        distance: 150
      }
    ];

    test('should calculate total distance from segments with distance property', () => {
      const total = calculateSegmentsTotalDistance(mockSegments);
      expect(total).toBe(250);
    });

    test('should calculate total distance from segments without distance property', () => {
      const segmentsWithoutDistance = mockSegments.map(segment => ({
        start: segment.start,
        end: segment.end
      }));

      const total = calculateSegmentsTotalDistance(segmentsWithoutDistance);
      expect(total).toBeGreaterThan(0);
    });

    test('should return 0 for empty segments', () => {
      const total = calculateSegmentsTotalDistance([]);
      expect(total).toBe(0);
    });

    test('should handle null segments', () => {
      const total = calculateSegmentsTotalDistance(null);
      expect(total).toBe(0);
    });
  });

  describe('getSegmentStatistics', () => {
    const mockSegments = [
      {
        start: { latitude: 37.7749, longitude: -122.4194 },
        end: { latitude: 37.7759, longitude: -122.4184 },
        distance: 100,
        timestamp: 1000
      },
      {
        start: { latitude: 37.7759, longitude: -122.4184 },
        end: { latitude: 37.7769, longitude: -122.4174 },
        distance: 200,
        timestamp: 2000
      },
      {
        start: { latitude: 37.7769, longitude: -122.4174 },
        end: { latitude: 37.7779, longitude: -122.4164 },
        distance: 150,
        timestamp: 3000
      }
    ];

    test('should calculate segment statistics', () => {
      const stats = getSegmentStatistics(mockSegments);

      expect(stats).toHaveProperty('count', 3);
      expect(stats).toHaveProperty('totalDistance', 450);
      expect(stats).toHaveProperty('averageDistance', 150);
      expect(stats).toHaveProperty('minDistance', 100);
      expect(stats).toHaveProperty('maxDistance', 200);
      expect(stats).toHaveProperty('timeSpan', 2000);
    });

    test('should return zero stats for empty segments', () => {
      const stats = getSegmentStatistics([]);

      expect(stats.count).toBe(0);
      expect(stats.totalDistance).toBe(0);
      expect(stats.averageDistance).toBe(0);
      expect(stats.minDistance).toBe(0);
      expect(stats.maxDistance).toBe(0);
      expect(stats.timeSpan).toBe(0);
    });
  });

  describe('filterSegmentsByTimeRange', () => {
    const mockSegments = [
      { timestamp: 1000, start: {}, end: {} },
      { timestamp: 2000, start: {}, end: {} },
      { timestamp: 3000, start: {}, end: {} },
      { timestamp: 4000, start: {}, end: {} }
    ];

    test('should filter segments by time range', () => {
      const filtered = filterSegmentsByTimeRange(mockSegments, 1500, 3500);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].timestamp).toBe(2000);
      expect(filtered[1].timestamp).toBe(3000);
    });

    test('should return all segments if no time range specified', () => {
      const filtered = filterSegmentsByTimeRange(mockSegments, null, null);
      expect(filtered).toEqual(mockSegments);
    });

    test('should handle empty segments', () => {
      const filtered = filterSegmentsByTimeRange([], 1000, 2000);
      expect(filtered).toEqual([]);
    });
  });

  describe('groupSegmentsByJourney', () => {
    const mockSegments = [
      {
        start: {},
        end: {},
        metadata: { journeyId: 'journey_1' }
      },
      {
        start: {},
        end: {},
        metadata: { journeyId: 'journey_1' }
      },
      {
        start: {},
        end: {},
        metadata: { journeyId: 'journey_2' }
      },
      {
        start: {},
        end: {},
        metadata: {} // No journey ID
      }
    ];

    test('should group segments by journey ID', () => {
      const grouped = groupSegmentsByJourney(mockSegments);

      expect(grouped).toHaveProperty('journey_1');
      expect(grouped).toHaveProperty('journey_2');
      expect(grouped).toHaveProperty('unknown');

      expect(grouped.journey_1).toHaveLength(2);
      expect(grouped.journey_2).toHaveLength(1);
      expect(grouped.unknown).toHaveLength(1);
    });

    test('should return empty object for empty segments', () => {
      const grouped = groupSegmentsByJourney([]);
      expect(grouped).toEqual({});
    });
  });

  describe('validateSegment', () => {
    test('should validate correct segment', () => {
      const validSegment = {
        start: { latitude: 37.7749, longitude: -122.4194 },
        end: { latitude: 37.7759, longitude: -122.4184 },
        timestamp: 1000
      };

      expect(validateSegment(validSegment)).toBe(true);
    });

    test('should reject segment without start', () => {
      const invalidSegment = {
        end: { latitude: 37.7759, longitude: -122.4184 }
      };

      expect(validateSegment(invalidSegment)).toBe(false);
    });

    test('should reject segment without end', () => {
      const invalidSegment = {
        start: { latitude: 37.7749, longitude: -122.4194 }
      };

      expect(validateSegment(invalidSegment)).toBe(false);
    });

    test('should reject segment with invalid coordinates', () => {
      const invalidSegment = {
        start: { latitude: 91, longitude: -122.4194 }, // Invalid latitude
        end: { latitude: 37.7759, longitude: -122.4184 }
      };

      expect(validateSegment(invalidSegment)).toBe(false);
    });

    test('should reject null segment', () => {
      expect(validateSegment(null)).toBe(false);
    });

    test('should reject non-object segment', () => {
      expect(validateSegment('invalid')).toBe(false);
    });
  });

  describe('createExplorationHistoryEntry', () => {
    test('should create history entry', () => {
      const entry = createExplorationHistoryEntry('journey_start', { journeyId: 'journey_1' });

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('type', 'journey_start');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('data', { journeyId: 'journey_1' });
      expect(entry).toHaveProperty('createdAt');
    });

    test('should create entry with empty data', () => {
      const entry = createExplorationHistoryEntry('test_event');

      expect(entry).toHaveProperty('type', 'test_event');
      expect(entry).toHaveProperty('data', {});
    });
  });

  describe('cleanupOldExplorationData', () => {
    const now = Date.now();
    const oldTimestamp = now - (40 * 24 * 60 * 60 * 1000); // 40 days ago
    const recentTimestamp = now - (10 * 24 * 60 * 60 * 1000); // 10 days ago

    const mockSegments = [
      { timestamp: oldTimestamp, start: {}, end: {} },
      { timestamp: recentTimestamp, start: {}, end: {} }
    ];

    const mockHistory = [
      { timestamp: oldTimestamp, type: 'old_event' },
      { timestamp: recentTimestamp, type: 'recent_event' }
    ];

    test('should cleanup old data', () => {
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      const cleaned = cleanupOldExplorationData(mockSegments, mockHistory, maxAge);

      expect(cleaned.segments).toHaveLength(1);
      expect(cleaned.history).toHaveLength(1);
      expect(cleaned.segments[0].timestamp).toBe(recentTimestamp);
      expect(cleaned.history[0].timestamp).toBe(recentTimestamp);
    });

    test('should handle null data', () => {
      const cleaned = cleanupOldExplorationData(null, null);

      expect(cleaned.segments).toEqual([]);
      expect(cleaned.history).toEqual([]);
    });

    test('should handle empty arrays', () => {
      const cleaned = cleanupOldExplorationData([], []);

      expect(cleaned.segments).toEqual([]);
      expect(cleaned.history).toEqual([]);
    });
  });
});