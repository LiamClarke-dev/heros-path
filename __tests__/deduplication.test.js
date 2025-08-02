/**
 * Deduplication Algorithm Tests
 * 
 * Comprehensive tests for the enhanced deduplication functionality in SearchAlongRouteService
 * Requirements: 1.5, 5.2
 */

import SearchAlongRouteService from '../services/SearchAlongRouteService';

// Mock Platform before importing
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

// Mock the config module
jest.mock('../config', () => ({
  GOOGLE_MAPS_API_KEY_ANDROID: 'test-android-key',
  GOOGLE_MAPS_API_KEY_IOS: 'test-ios-key'
}));

// Mock the route encoder utilities
jest.mock('../utils/routeEncoder', () => ({
  validateCoordinates: jest.fn(),
  encodeRoute: jest.fn(),
  isRouteLongEnoughForSAR: jest.fn(),
  calculateCenterPoint: jest.fn(),
  calculateRouteDistance: jest.fn()
}));

describe('SearchAlongRouteService - Deduplication Algorithm', () => {
  let service;

  beforeEach(() => {
    service = SearchAlongRouteService;
    service.clearCache();
    jest.clearAllMocks();
  });

  describe('deduplicateResults - Basic Functionality', () => {
    it('should handle empty arrays', () => {
      const result = service.deduplicateResults([]);
      expect(result).toEqual([]);
    });

    it('should handle null/undefined input', () => {
      expect(service.deduplicateResults(null)).toEqual([]);
      expect(service.deduplicateResults(undefined)).toEqual([]);
    });

    it('should handle non-array input', () => {
      expect(service.deduplicateResults('not an array')).toEqual([]);
      expect(service.deduplicateResults(123)).toEqual([]);
      expect(service.deduplicateResults({})).toEqual([]);
    });

    it('should return single item unchanged', () => {
      const places = [
        { id: 'place1', name: 'Test Place', rating: 4.5 }
      ];
      const result = service.deduplicateResults(places);
      expect(result).toEqual(places);
    });

    it('should preserve unique places', () => {
      const places = [
        { id: 'place1', name: 'Restaurant A', rating: 4.5 },
        { id: 'place2', name: 'Cafe B', rating: 4.2 },
        { id: 'place3', name: 'Park C', rating: 4.8 }
      ];
      const result = service.deduplicateResults(places);
      expect(result).toHaveLength(3);
      expect(result).toEqual(places);
    });
  });

  describe('deduplicateResults - Duplicate Handling', () => {
    it('should remove exact duplicates by placeId', () => {
      const places = [
        { placeId: 'place1', name: 'Restaurant A', rating: 4.5 },
        { placeId: 'place2', name: 'Cafe B', rating: 4.2 },
        { placeId: 'place1', name: 'Restaurant A', rating: 4.5 } // Exact duplicate
      ];
      const result = service.deduplicateResults(places);
      expect(result).toHaveLength(2);
      expect(result.map(p => p.placeId)).toEqual(['place1', 'place2']);
    });

    it('should handle duplicates with different field names (id vs placeId)', () => {
      const places = [
        { placeId: 'place1', name: 'Restaurant A', rating: 4.5 },
        { id: 'place1', name: 'Restaurant A Duplicate', rating: 4.3 }, // Same place, different format
        { placeId: 'place2', name: 'Cafe B', rating: 4.2 }
      ];
      const result = service.deduplicateResults(places);
      expect(result).toHaveLength(2);
      expect(result.map(p => p.placeId || p.id)).toEqual(['place1', 'place2']);
    });

    it('should preserve highest rated duplicate by default', () => {
      const places = [
        { placeId: 'place1', name: 'Restaurant A', rating: 4.2 },
        { placeId: 'place1', name: 'Restaurant A Better', rating: 4.8 }, // Higher rating
        { placeId: 'place1', name: 'Restaurant A Worse', rating: 3.9 }  // Lower rating
      ];
      const result = service.deduplicateResults(places);
      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(4.8);
      expect(result[0].name).toBe('Restaurant A Better');
    });

    it('should handle places without ratings when preserving highest rated', () => {
      const places = [
        { placeId: 'place1', name: 'Restaurant A', rating: null },
        { placeId: 'place1', name: 'Restaurant A Better', rating: 4.5 },
        { placeId: 'place1', name: 'Restaurant A No Rating' } // No rating field
      ];
      const result = service.deduplicateResults(places);
      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(4.5);
      expect(result[0].name).toBe('Restaurant A Better');
    });

    it('should keep first occurrence when preserveHighestRated is false', () => {
      const places = [
        { placeId: 'place1', name: 'Restaurant A First', rating: 4.2 },
        { placeId: 'place1', name: 'Restaurant A Better', rating: 4.8 }
      ];
      const result = service.deduplicateResults(places, { preserveHighestRated: false });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Restaurant A First');
      expect(result[0].rating).toBe(4.2);
    });
  });

  describe('deduplicateResults - Large Dataset Handling', () => {
    it('should handle small datasets efficiently', () => {
      const places = Array.from({ length: 100 }, (_, i) => ({
        placeId: `place${i}`,
        name: `Place ${i}`,
        rating: Math.random() * 5
      }));
      
      const startTime = Date.now();
      const result = service.deduplicateResults(places);
      const endTime = Date.now();
      
      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should handle large datasets with batch processing', () => {
      const places = Array.from({ length: 2000 }, (_, i) => ({
        placeId: `place${i % 1000}`, // Create duplicates
        name: `Place ${i}`,
        rating: Math.random() * 5
      }));
      
      const result = service.deduplicateResults(places, { batchSize: 500 });
      expect(result).toHaveLength(1000); // Should deduplicate to 1000 unique places
    });

    it('should handle very large datasets efficiently', () => {
      const places = Array.from({ length: 10000 }, (_, i) => ({
        placeId: `place${i % 2000}`, // Create many duplicates
        name: `Place ${i}`,
        rating: Math.random() * 5
      }));
      
      const startTime = Date.now();
      const result = service.deduplicateResults(places, { batchSize: 1000 });
      const endTime = Date.now();
      
      expect(result).toHaveLength(2000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should preserve memory efficiency with large datasets', () => {
      // Test that batch processing doesn't cause memory issues
      const places = Array.from({ length: 5000 }, (_, i) => ({
        placeId: `place${i % 1000}`,
        name: `Place ${i}`,
        rating: Math.random() * 5,
        // Add some extra data to make objects larger
        description: `This is a description for place ${i}`.repeat(10),
        metadata: { index: i, category: 'test' }
      }));
      
      const result = service.deduplicateResults(places, { batchSize: 500 });
      expect(result).toHaveLength(1000);
      
      // Verify that all results have the expected structure
      result.forEach(place => {
        expect(place).toHaveProperty('placeId');
        expect(place).toHaveProperty('name');
        expect(place).toHaveProperty('description');
        expect(place).toHaveProperty('metadata');
      });
    });
  });

  describe('deduplicateResults - Edge Cases', () => {
    it('should handle places without IDs gracefully', () => {
      const places = [
        { placeId: 'place1', name: 'Valid Place', rating: 4.5 },
        { name: 'No ID Place', rating: 4.2 }, // Missing ID
        { placeId: null, name: 'Null ID Place', rating: 4.0 }, // Null ID
        { placeId: '', name: 'Empty ID Place', rating: 3.8 }, // Empty ID
        { placeId: 'place2', name: 'Another Valid Place', rating: 4.3 }
      ];
      
      const result = service.deduplicateResults(places);
      expect(result).toHaveLength(2); // Only places with valid IDs
      expect(result.map(p => p.placeId)).toEqual(['place1', 'place2']);
    });

    it('should handle malformed place objects', () => {
      const places = [
        { placeId: 'place1', name: 'Valid Place', rating: 4.5 },
        null, // Null object
        undefined, // Undefined object
        'not an object', // String instead of object
        { placeId: 'place2', name: 'Another Valid Place', rating: 4.3 }
      ];
      
      const result = service.deduplicateResults(places);
      expect(result).toHaveLength(2);
      expect(result.map(p => p.placeId)).toEqual(['place1', 'place2']);
    });

    it('should handle different ID field formats', () => {
      const places = [
        { placeId: 'place1', name: 'Place with placeId', rating: 4.5 },
        { id: 'place2', name: 'Place with id', rating: 4.2 },
        { place_id: 'place3', name: 'Place with place_id', rating: 4.8 },
        { googlePlaceId: 'place4', name: 'Place with googlePlaceId', rating: 4.1 }
      ];
      
      const result = service.deduplicateResults(places);
      expect(result).toHaveLength(4);
    });

    it('should handle duplicate detection across different ID field formats', () => {
      const places = [
        { placeId: 'place1', name: 'Original', rating: 4.2 },
        { id: 'place1', name: 'Duplicate with id field', rating: 4.8 },
        { place_id: 'place1', name: 'Duplicate with place_id field', rating: 4.1 }
      ];
      
      const result = service.deduplicateResults(places);
      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(4.8); // Should keep highest rated
    });
  });

  describe('deduplicateResults - Options Configuration', () => {
    it('should respect custom batch size', () => {
      const places = Array.from({ length: 100 }, (_, i) => ({
        placeId: `place${i}`,
        name: `Place ${i}`,
        rating: Math.random() * 5
      }));
      
      // Force batch processing with small batch size
      const result = service.deduplicateResults(places, { batchSize: 10 });
      expect(result).toHaveLength(100);
    });

    it('should disable logging when requested', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const places = [
        { placeId: 'place1', name: 'Original', rating: 4.2 },
        { placeId: 'place1', name: 'Duplicate', rating: 4.8 }
      ];
      
      service.deduplicateResults(places, { logDuplicates: false });
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should enable logging when requested', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const places = [
        { placeId: 'place1', name: 'Original', rating: 4.2 },
        { placeId: 'place1', name: 'Duplicate', rating: 4.8 }
      ];
      
      service.deduplicateResults(places, { logDuplicates: true });
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getDeduplicationStats', () => {
    it('should provide accurate statistics for deduplication', () => {
      const originalResults = [
        { placeId: 'place1', name: 'Restaurant A', rating: 4.5 },
        { placeId: 'place2', name: 'Cafe B', rating: 4.2 },
        { placeId: 'place1', name: 'Restaurant A Duplicate', rating: 4.3 },
        { placeId: 'place3', name: 'Park C', rating: 4.8 },
        { placeId: 'place2', name: 'Cafe B Duplicate', rating: 4.1 }
      ];
      
      const deduplicatedResults = service.deduplicateResults(originalResults);
      const stats = service.getDeduplicationStats(originalResults, deduplicatedResults);
      
      expect(stats.originalCount).toBe(5);
      expect(stats.deduplicatedCount).toBe(3);
      expect(stats.duplicatesRemoved).toBe(2);
      expect(stats.deduplicationRate).toBe(40);
      expect(stats.uniquePlaceIds).toBe(3);
      expect(stats.duplicateGroups).toHaveLength(2); // place1 and place2 had duplicates
    });

    it('should handle empty arrays', () => {
      const stats = service.getDeduplicationStats([], []);
      expect(stats.originalCount).toBe(0);
      expect(stats.deduplicatedCount).toBe(0);
      expect(stats.duplicatesRemoved).toBe(0);
      expect(stats.deduplicationRate).toBe(0);
    });

    it('should handle invalid input', () => {
      const stats = service.getDeduplicationStats(null, undefined);
      expect(stats.error).toBe('Invalid input arrays');
      expect(stats.originalCount).toBe(0);
    });

    it('should identify most duplicated places', () => {
      const originalResults = [
        { placeId: 'place1', name: 'Very Popular Place' },
        { placeId: 'place1', name: 'Very Popular Place Dup 1' },
        { placeId: 'place1', name: 'Very Popular Place Dup 2' },
        { placeId: 'place1', name: 'Very Popular Place Dup 3' },
        { placeId: 'place2', name: 'Somewhat Popular Place' },
        { placeId: 'place2', name: 'Somewhat Popular Place Dup 1' },
        { placeId: 'place3', name: 'Unique Place' }
      ];
      
      const deduplicatedResults = service.deduplicateResults(originalResults);
      const stats = service.getDeduplicationStats(originalResults, deduplicatedResults);
      
      expect(stats.duplicateGroups[0]).toEqual(['place1', 4]); // Most duplicated
      expect(stats.duplicateGroups[1]).toEqual(['place2', 2]); // Less duplicated
      expect(stats.averageDuplicatesPerPlace).toBe(3); // (4 + 2) / 2 = 3
    });
  });

  describe('Performance Tests', () => {
    it('should handle realistic SAR result sizes efficiently', () => {
      // Simulate realistic SAR results with some duplicates
      const places = [];
      for (let i = 0; i < 500; i++) {
        places.push({
          placeId: `place${i % 100}`, // 20% duplication rate
          name: `Place ${i}`,
          rating: Math.random() * 5,
          types: ['restaurant', 'food'],
          location: { latitude: 37.7749 + Math.random() * 0.01, longitude: -122.4194 + Math.random() * 0.01 }
        });
      }
      
      const startTime = Date.now();
      const result = service.deduplicateResults(places);
      const endTime = Date.now();
      
      expect(result).toHaveLength(100); // Should deduplicate to 100 unique places
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast for realistic sizes
    });

    it('should maintain performance with complex place objects', () => {
      const places = Array.from({ length: 1000 }, (_, i) => ({
        placeId: `place${i % 200}`, // 80% duplication rate
        name: `Complex Place ${i}`,
        rating: Math.random() * 5,
        types: ['restaurant', 'food', 'establishment'],
        location: { 
          latitude: 37.7749 + Math.random() * 0.01, 
          longitude: -122.4194 + Math.random() * 0.01 
        },
        metadata: {
          category: 'Food & Dining',
          discoverySource: 'SAR',
          discoveredAt: new Date().toISOString(),
          saved: false,
          dismissed: false
        },
        // Add some large data to test memory efficiency
        description: `This is a detailed description for place ${i}. `.repeat(20),
        reviews: Array.from({ length: 5 }, (_, j) => ({
          id: `review${j}`,
          text: `Review ${j} for place ${i}`,
          rating: Math.floor(Math.random() * 5) + 1
        }))
      }));
      
      const startTime = Date.now();
      const result = service.deduplicateResults(places);
      const endTime = Date.now();
      
      expect(result).toHaveLength(200);
      expect(endTime - startTime).toBeLessThan(300); // Should handle complex objects efficiently
    });
  });

  describe('Integration with SearchAlongRouteService', () => {
    it('should integrate properly with existing SAR workflow', () => {
      // Test that deduplication works as part of the larger SAR process
      const mockSARResults = [
        { placeId: 'place1', name: 'Restaurant A', rating: 4.5, discoverySource: 'SAR' },
        { placeId: 'place2', name: 'Cafe B', rating: 4.2, discoverySource: 'SAR' }
      ];
      
      const mockCenterPointResults = [
        { placeId: 'place1', name: 'Restaurant A', rating: 4.3, discoverySource: 'center-point' }, // Duplicate
        { placeId: 'place3', name: 'Park C', rating: 4.8, discoverySource: 'center-point' }
      ];
      
      const combinedResults = [...mockSARResults, ...mockCenterPointResults];
      const deduplicatedResults = service.deduplicateResults(combinedResults);
      
      expect(deduplicatedResults).toHaveLength(3);
      
      // Should preserve the higher-rated SAR result over center-point result
      const restaurantA = deduplicatedResults.find(p => p.placeId === 'place1');
      expect(restaurantA.rating).toBe(4.5);
      expect(restaurantA.discoverySource).toBe('SAR');
    });
  });
});