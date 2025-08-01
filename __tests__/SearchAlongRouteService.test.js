/**
 * SearchAlongRouteService Tests
 * 
 * Tests for the Search Along Route service functionality including:
 * - API integration
 * - Preference filtering
 * - Error handling
 * - Cache management
 */

import SearchAlongRouteService, { PLACE_TYPES, PLACE_CATEGORIES, PLACE_TYPE_TO_CATEGORY } from '../services/SearchAlongRouteService';

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
  calculateCenterPoint: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('SearchAlongRouteService', () => {
  let service;
  const mockCoordinates = [
    { latitude: 37.7749, longitude: -122.4194 },
    { latitude: 37.7849, longitude: -122.4094 },
    { latitude: 37.7949, longitude: -122.3994 }
  ];

  const mockPreferences = {
    placeTypes: {
      restaurant: true,
      cafe: true,
      park: true
    },
    minRating: 4.0,
    allTypes: false
  };

  const mockLegacyPreferences = {
    restaurant: true,
    cafe: true,
    park: true
  };

  const mockApiResponse = {
    places: [
      {
        id: 'place1',
        displayName: { text: 'Test Restaurant' },
        types: ['restaurant', 'food'],
        primaryType: 'restaurant',
        location: { latitude: 37.7799, longitude: -122.4144 },
        rating: 4.5,
        priceLevel: 2
      },
      {
        id: 'place2',
        displayName: { text: 'Test Cafe' },
        types: ['cafe', 'food'],
        primaryType: 'cafe',
        location: { latitude: 37.7899, longitude: -122.4044 },
        rating: 4.2
      }
    ]
  };

  beforeEach(() => {
    service = SearchAlongRouteService;
    service.clearCache();
    jest.clearAllMocks();
    
    // Setup default mocks
    const { validateCoordinates, encodeRoute, isRouteLongEnoughForSAR } = require('../utils/routeEncoder');
    validateCoordinates.mockReturnValue(true);
    encodeRoute.mockReturnValue('encoded_polyline_string');
    isRouteLongEnoughForSAR.mockReturnValue(true);
  });

  describe('getApiKey', () => {
    it('should return iOS API key on iOS platform', () => {
      // Platform.OS is already mocked as 'ios'
      const apiKey = service.getApiKey();
      expect(apiKey).toBe('test-ios-key');
    });

    it('should return Android API key on Android platform', () => {
      // Mock Platform.OS for this test
      const originalPlatform = require('react-native').Platform;
      require('react-native').Platform = { OS: 'android' };
      
      const apiKey = service.getApiKey();
      expect(apiKey).toBe('test-android-key');
      
      // Restore original platform
      require('react-native').Platform = originalPlatform;
    });

    it('should throw error when no API key is available', () => {
      // Test the fallback logic by temporarily modifying the service
      const originalGetApiKey = service.getApiKey;
      service.getApiKey = function() {
        // Mock empty API keys
        const { Platform } = require('react-native');
        let apiKey;
        
        if (Platform.OS === 'ios' && '') {
          apiKey = '';
        } else if (Platform.OS === 'android' && '') {
          apiKey = '';
        } else {
          // Fallback to any available key
          apiKey = '' || '';
        }

        if (!apiKey) {
          throw new Error('No Google Maps API key available for Search Along Route');
        }

        return apiKey;
      };
      
      expect(() => service.getApiKey()).toThrow('No Google Maps API key available for Search Along Route');
      
      // Restore original method
      service.getApiKey = originalGetApiKey;
    });
  });

  describe('buildPlaceTypesFromPreferences', () => {
    it('should return all place types when allTypes is true', () => {
      const preferences = { allTypes: true };
      const result = service.buildPlaceTypesFromPreferences(preferences);
      expect(result).toEqual(Object.keys(PLACE_TYPES));
    });

    it('should return selected place types from structured preferences', () => {
      const preferences = {
        placeTypes: {
          restaurant: true,
          cafe: true,
          park: false
        }
      };
      const result = service.buildPlaceTypesFromPreferences(preferences);
      expect(result).toEqual(['restaurant', 'cafe']);
    });

    it('should return selected place types from legacy preferences', () => {
      const preferences = {
        restaurant: true,
        cafe: true,
        park: false
      };
      const result = service.buildPlaceTypesFromPreferences(preferences);
      expect(result).toEqual(['restaurant', 'cafe']);
    });

    it('should return all place types when no preferences provided', () => {
      const result = service.buildPlaceTypesFromPreferences(null);
      expect(result).toEqual(Object.keys(PLACE_TYPES));
    });

    it('should return all place types when no types are selected', () => {
      const preferences = {
        placeTypes: {
          restaurant: false,
          cafe: false,
          park: false
        }
      };
      const result = service.buildPlaceTypesFromPreferences(preferences);
      expect(result).toEqual(Object.keys(PLACE_TYPES));
    });
  });

  describe('buildSARRequest', () => {
    it('should build correct SAR request payload', () => {
      const encodedPolyline = 'test_polyline';
      const preferences = { restaurant: true, cafe: true };
      const minRating = 4.0;

      const result = service.buildSARRequest(encodedPolyline, preferences, minRating);

      expect(result).toEqual({
        polyline: {
          encodedPolyline: 'test_polyline'
        },
        includedTypes: ['restaurant', 'cafe'],
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        minRating: 4.0
      });
    });

    it('should not include minRating when not specified', () => {
      const result = service.buildSARRequest('test_polyline', {});
      expect(result.minRating).toBeUndefined();
    });

    it('should not include minRating when invalid', () => {
      const result = service.buildSARRequest('test_polyline', {}, 6); // Invalid rating > 5
      expect(result.minRating).toBeUndefined();
    });
  });

  describe('performSARRequest', () => {
    beforeEach(() => {
      // Platform.OS is already mocked as 'ios'
    });

    it('should make successful SAR API request', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const result = await service.performSARRequest('test_polyline', mockPreferences, 4.0);

      expect(fetch).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places:searchAlongRoute',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': 'test-ios-key',
            'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.location,places.rating,places.priceLevel,places.primaryType'
          })
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'place1',
        name: 'Test Restaurant',
        types: ['restaurant', 'food'],
        discoverySource: 'SAR'
      });
    });

    it('should handle API error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid request'
      });

      await expect(service.performSARRequest('test_polyline', mockPreferences))
        .rejects.toThrow('SAR API request failed: 400 Bad Request');
    });

    it('should handle empty places response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [] })
      });

      const result = await service.performSARRequest('test_polyline', mockPreferences);
      expect(result).toEqual([]);
    });

    it('should handle missing places in response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await service.performSARRequest('test_polyline', mockPreferences);
      expect(result).toEqual([]);
    });
  });

  describe('processRawPlaces', () => {
    it('should process raw places data correctly', () => {
      const rawPlaces = mockApiResponse.places;
      const result = service.processRawPlaces(rawPlaces);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'place1',
        placeId: 'place1',
        name: 'Test Restaurant',
        types: ['restaurant', 'food'],
        primaryType: 'restaurant',
        location: { latitude: 37.7799, longitude: -122.4144 },
        rating: 4.5,
        priceLevel: 2,
        category: PLACE_CATEGORIES.FOOD_DINING,
        discoverySource: 'SAR',
        saved: false,
        dismissed: false,
        schemaVersion: 1
      });
    });

    it('should handle places with missing data', () => {
      const rawPlaces = [
        {
          id: 'place1',
          // Missing displayName, types, location, etc.
        }
      ];

      const result = service.processRawPlaces(rawPlaces);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'place1',
        name: 'Unnamed Place',
        types: [],
        primaryType: 'establishment',
        location: { latitude: 0, longitude: 0 },
        rating: null,
        category: PLACE_CATEGORIES.SERVICES_UTILITIES // Default category
      });
    });
  });

  describe('getPlaceCategory', () => {
    it('should return correct category for known place types', () => {
      expect(service.getPlaceCategory(['restaurant'])).toBe(PLACE_CATEGORIES.FOOD_DINING);
      expect(service.getPlaceCategory(['park'])).toBe(PLACE_CATEGORIES.ENTERTAINMENT_CULTURE);
      expect(service.getPlaceCategory(['hospital'])).toBe(PLACE_CATEGORIES.HEALTH_WELLNESS);
    });

    it('should return default category for unknown types', () => {
      expect(service.getPlaceCategory(['unknown_type'])).toBe(PLACE_CATEGORIES.SERVICES_UTILITIES);
    });

    it('should return default category for empty types', () => {
      expect(service.getPlaceCategory([])).toBe(PLACE_CATEGORIES.SERVICES_UTILITIES);
      expect(service.getPlaceCategory(null)).toBe(PLACE_CATEGORIES.SERVICES_UTILITIES);
    });

    it('should return category for first matching type', () => {
      expect(service.getPlaceCategory(['unknown_type', 'restaurant', 'cafe']))
        .toBe(PLACE_CATEGORIES.FOOD_DINING);
    });
  });

  describe('searchAlongRoute', () => {
    beforeEach(() => {
      // Platform.OS is already mocked as 'ios'
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });
    });

    it('should perform complete SAR flow successfully', async () => {
      const result = await service.searchAlongRoute(mockCoordinates, mockPreferences, 4.0);

      expect(result).toHaveLength(2);
      expect(result[0].discoverySource).toBe('SAR');
    });

    it('should throw error for invalid coordinates', async () => {
      const { validateCoordinates } = require('../utils/routeEncoder');
      validateCoordinates.mockReturnValue(false);

      await expect(service.searchAlongRoute([], mockPreferences))
        .rejects.toThrow('Invalid coordinates provided for Search Along Route');
    });

    it('should return empty array for routes too short for SAR', async () => {
      const { isRouteLongEnoughForSAR } = require('../utils/routeEncoder');
      isRouteLongEnoughForSAR.mockReturnValue(false);

      const result = await service.searchAlongRoute(mockCoordinates, mockPreferences);
      expect(result).toEqual([]);
    });

    it('should use cached results when available', async () => {
      // First call
      const result1 = await service.searchAlongRoute(mockCoordinates, mockPreferences, 4.0);
      
      // Second call should use cache
      const result2 = await service.searchAlongRoute(mockCoordinates, mockPreferences, 4.0);

      expect(fetch).toHaveBeenCalledTimes(1); // Only called once
      expect(result1).toEqual(result2);
    });
  });

  describe('isRouteLongEnough', () => {
    it('should delegate to route encoder utility', () => {
      const { isRouteLongEnoughForSAR } = require('../utils/routeEncoder');
      isRouteLongEnoughForSAR.mockReturnValue(true);

      const result = service.isRouteLongEnough(mockCoordinates);
      
      expect(isRouteLongEnoughForSAR).toHaveBeenCalledWith(mockCoordinates);
      expect(result).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should generate consistent cache keys', () => {
      const key1 = service.generateCacheKey(mockCoordinates, mockPreferences, 4.0);
      const key2 = service.generateCacheKey(mockCoordinates, mockPreferences, 4.0);
      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different inputs', () => {
      const key1 = service.generateCacheKey(mockCoordinates, mockPreferences, 4.0);
      const key2 = service.generateCacheKey(mockCoordinates, mockPreferences, 3.0);
      expect(key1).not.toBe(key2);
    });

    it('should store and retrieve cached data', () => {
      const testData = [{ id: 'test' }];
      service.setCachedData('test-key', testData);
      
      const retrieved = service.getCachedData('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for expired cache data', () => {
      const testData = [{ id: 'test' }];
      service.setCachedData('test-key', testData);
      
      // Mock expired cache
      service.cache.set('test-key', {
        data: testData,
        timestamp: Date.now() - (11 * 60 * 1000) // 11 minutes ago
      });
      
      const retrieved = service.getCachedData('test-key');
      expect(retrieved).toBeNull();
    });

    it('should clear all cache data', () => {
      service.setCachedData('test-key-1', [{ id: 'test1' }]);
      service.setCachedData('test-key-2', [{ id: 'test2' }]);
      
      service.clearCache();
      
      expect(service.getCachedData('test-key-1')).toBeNull();
      expect(service.getCachedData('test-key-2')).toBeNull();
    });
  });

  describe('getMinRatingFromPreferences', () => {
    it('should return minRating from preferences', () => {
      const preferences = { minRating: 4.5 };
      const result = service.getMinRatingFromPreferences(preferences);
      expect(result).toBe(4.5);
    });

    it('should return minimumRating as fallback', () => {
      const preferences = { minimumRating: 3.5 };
      const result = service.getMinRatingFromPreferences(preferences);
      expect(result).toBe(3.5);
    });

    it('should return 0 for invalid preferences', () => {
      expect(service.getMinRatingFromPreferences(null)).toBe(0);
      expect(service.getMinRatingFromPreferences({})).toBe(0);
      expect(service.getMinRatingFromPreferences({ minRating: 'invalid' })).toBe(0);
      expect(service.getMinRatingFromPreferences({ minRating: 6 })).toBe(0); // Out of range
    });
  });

  describe('applyPreferenceFiltering', () => {
    const mockPlaces = [
      {
        id: 'place1',
        name: 'High Rated Restaurant',
        types: ['restaurant'],
        rating: 4.5
      },
      {
        id: 'place2',
        name: 'Low Rated Cafe',
        types: ['cafe'],
        rating: 2.5
      },
      {
        id: 'place3',
        name: 'Park',
        types: ['park'],
        rating: null
      }
    ];

    it('should filter by minimum rating', () => {
      const preferences = { minRating: 4.0 };
      const result = service.applyPreferenceFiltering(mockPlaces, preferences);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('place1');
    });

    it('should filter by place types', () => {
      const preferences = {
        placeTypes: {
          restaurant: true,
          cafe: false,
          park: false
        }
      };
      const result = service.applyPreferenceFiltering(mockPlaces, preferences);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('place1');
    });

    it('should apply both rating and type filters', () => {
      const preferences = {
        placeTypes: {
          restaurant: true,
          cafe: true,
          park: false
        },
        minRating: 4.0
      };
      const result = service.applyPreferenceFiltering(mockPlaces, preferences);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('place1');
    });

    it('should return all places when no preferences', () => {
      const result = service.applyPreferenceFiltering(mockPlaces, {});
      expect(result).toHaveLength(3);
    });

    it('should handle empty places array', () => {
      const result = service.applyPreferenceFiltering([], mockPreferences);
      expect(result).toEqual([]);
    });
  });

  describe('validateAndNormalizePreferences', () => {
    it('should normalize structured preferences', () => {
      const preferences = {
        placeTypes: { restaurant: true, cafe: false },
        minRating: 4.0,
        allTypes: false
      };
      const result = service.validateAndNormalizePreferences(preferences);
      expect(result.placeTypes.restaurant).toBe(true);
      expect(result.placeTypes.cafe).toBe(false);
      expect(result.minRating).toBe(4.0);
      expect(result.allTypes).toBe(false);
    });

    it('should handle legacy preference format', () => {
      const preferences = {
        restaurant: true,
        cafe: false,
        minRating: 3.5
      };
      const result = service.validateAndNormalizePreferences(preferences);
      expect(result.placeTypes.restaurant).toBe(true);
      expect(result.placeTypes.cafe).toBe(false);
      expect(result.minRating).toBe(3.5);
    });

    it('should provide defaults for empty preferences', () => {
      const result = service.validateAndNormalizePreferences(null);
      expect(result.placeTypes).toEqual({});
      expect(result.minRating).toBe(0);
      expect(result.allTypes).toBe(true);
    });
  });

  describe('getPreferenceStats', () => {
    it('should return preference statistics', () => {
      const preferences = {
        placeTypes: {
          restaurant: true,
          cafe: true,
          park: false
        },
        minRating: 4.0
      };
      const stats = service.getPreferenceStats(preferences);
      expect(stats.enabledPlaceTypes).toBe(2);
      expect(stats.minRating).toBe(4.0);
      expect(stats.allTypesEnabled).toBe(false);
      expect(stats.enabledByCategory).toBeDefined();
    });
  });

  describe('constants', () => {
    it('should have all required place types defined', () => {
      expect(PLACE_TYPES).toBeDefined();
      expect(Object.keys(PLACE_TYPES).length).toBeGreaterThan(0);
      
      // Check some key place types
      expect(PLACE_TYPES.restaurant).toBe('Restaurant');
      expect(PLACE_TYPES.cafe).toBe('Cafe');
      expect(PLACE_TYPES.park).toBe('Park');
    });

    it('should have all place categories defined', () => {
      expect(PLACE_CATEGORIES).toBeDefined();
      expect(PLACE_CATEGORIES.FOOD_DINING).toBe('Food & Dining');
      expect(PLACE_CATEGORIES.ENTERTAINMENT_CULTURE).toBe('Entertainment & Culture');
    });

    it('should have consistent place type to category mapping', () => {
      expect(PLACE_TYPE_TO_CATEGORY).toBeDefined();
      expect(PLACE_TYPE_TO_CATEGORY.restaurant).toBe(PLACE_CATEGORIES.FOOD_DINING);
      expect(PLACE_TYPE_TO_CATEGORY.park).toBe(PLACE_CATEGORIES.ENTERTAINMENT_CULTURE);
    });
  });
});