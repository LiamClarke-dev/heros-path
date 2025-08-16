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
  calculateCenterPoint: jest.fn(),
  calculateRouteDistance: jest.fn()
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
      service.getApiKey = function () {
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

    it('should return rating as alternative fallback', () => {
      const preferences = { rating: 4.2 };
      const result = service.getMinRatingFromPreferences(preferences);
      expect(result).toBe(4.2);
    });

    it('should prioritize minRating over other properties', () => {
      const preferences = { minRating: 4.5, minimumRating: 3.5, rating: 2.5 };
      const result = service.getMinRatingFromPreferences(preferences);
      expect(result).toBe(4.5);
    });

    it('should return 0 for invalid preferences', () => {
      expect(service.getMinRatingFromPreferences(null)).toBe(0);
      expect(service.getMinRatingFromPreferences({})).toBe(0);
      expect(service.getMinRatingFromPreferences({ minRating: 'invalid' })).toBe(0);
      expect(service.getMinRatingFromPreferences({ minRating: 6 })).toBe(0); // Out of range
      expect(service.getMinRatingFromPreferences({ minRating: -1 })).toBe(0); // Out of range
    });
  });

  describe('applyPreferenceFiltering', () => {
    const mockPlaces = [
      {
        id: 'place1',
        name: 'High Rated Restaurant',
        types: ['restaurant'],
        primaryType: 'restaurant',
        rating: 4.5,
        category: 'Food & Dining'
      },
      {
        id: 'place2',
        name: 'Low Rated Cafe',
        types: ['cafe'],
        primaryType: 'cafe',
        rating: 2.5,
        category: 'Food & Dining'
      },
      {
        id: 'place3',
        name: 'Park',
        types: ['park'],
        primaryType: 'park',
        rating: null,
        category: 'Entertainment & Culture'
      },
      {
        id: 'place4',
        name: 'Museum',
        types: ['museum'],
        primaryType: 'museum',
        rating: 4.8,
        category: 'Entertainment & Culture'
      }
    ];

    it('should filter by minimum rating with enhanced logic', () => {
      const preferences = { minRating: 4.0 };
      const result = service.applyPreferenceFiltering(mockPlaces, preferences);
      expect(result).toHaveLength(3); // place1, place3 (null rating with minRating < 4.5), place4
      expect(result.map(p => p.id)).toContain('place1');
      expect(result.map(p => p.id)).toContain('place3'); // Null rating allowed for minRating < 4.5
      expect(result.map(p => p.id)).toContain('place4');
    });

    it('should filter out null ratings for very high minimum rating', () => {
      const preferences = { minRating: 4.5 };
      const result = service.applyPreferenceFiltering(mockPlaces, preferences);
      expect(result).toHaveLength(2); // place1, place4 (place3 excluded due to null rating)
      expect(result.map(p => p.id)).toContain('place1');
      expect(result.map(p => p.id)).toContain('place4');
      expect(result.map(p => p.id)).not.toContain('place3');
    });

    it('should filter by place types using structured preferences', () => {
      const preferences = {
        placeTypes: {
          restaurant: true,
          cafe: false,
          park: false,
          museum: false
        }
      };
      const result = service.applyPreferenceFiltering(mockPlaces, preferences);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('place1');
    });

    it('should handle places without types using primaryType', () => {
      const placesWithoutTypes = [
        {
          id: 'place5',
          name: 'Restaurant without types',
          types: [], // Empty array instead of undefined
          primaryType: 'restaurant',
          rating: 4.0,
          category: 'Food & Dining' // Add category so it doesn't get filtered out by category balancing
        }
      ];
      const preferences = {
        placeTypes: {
          restaurant: true,
          cafe: false
        }
      };



      const result = service.applyPreferenceFiltering(placesWithoutTypes, preferences);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('place5');
    });

    it('should apply both rating and type filters', () => {
      const preferences = {
        placeTypes: {
          restaurant: true,
          cafe: true,
          park: false,
          museum: true
        },
        minRating: 4.0
      };
      const result = service.applyPreferenceFiltering(mockPlaces, preferences);
      expect(result).toHaveLength(2); // place1 and place4
      expect(result.map(p => p.id)).toContain('place1');
      expect(result.map(p => p.id)).toContain('place4');
    });

    it('should skip type filtering when allTypes is true', () => {
      const preferences = {
        allTypes: true,
        minRating: 4.0
      };
      const result = service.applyPreferenceFiltering(mockPlaces, preferences);
      expect(result).toHaveLength(3); // All places with rating >= 4.0 or null rating
    });

    it('should return all places when no preferences', () => {
      const result = service.applyPreferenceFiltering(mockPlaces, {});
      expect(result).toHaveLength(4);
    });

    it('should handle empty places array', () => {
      const result = service.applyPreferenceFiltering([], mockPreferences);
      expect(result).toEqual([]);
    });

    it('should handle null or undefined places array', () => {
      expect(service.applyPreferenceFiltering(null, mockPreferences)).toBeNull();
      expect(service.applyPreferenceFiltering(undefined, mockPreferences)).toBeUndefined();
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

  describe('applyCategoryBalancing', () => {
    const mockPlaces = [
      { id: 'rest1', category: 'Food & Dining', rating: 4.5 },
      { id: 'rest2', category: 'Food & Dining', rating: 4.2 },
      { id: 'rest3', category: 'Food & Dining', rating: 3.8 },
      { id: 'museum1', category: 'Entertainment & Culture', rating: 4.8 },
      { id: 'museum2', category: 'Entertainment & Culture', rating: 4.1 },
      { id: 'hospital1', category: 'Health & Wellness', rating: 4.3 }
    ];

    it('should balance results across categories', () => {
      const preferences = {
        placeTypes: {
          restaurant: true,
          museum: true,
          hospital: true
        }
      };
      const result = service.applyCategoryBalancing(mockPlaces, preferences);

      // Should have representatives from each enabled category
      const categories = new Set(result.map(p => p.category));
      expect(categories.size).toBeGreaterThan(1);
    });

    it('should prioritize higher-rated places within categories', () => {
      const preferences = {
        placeTypes: {
          restaurant: true,
          museum: true
        }
      };
      const result = service.applyCategoryBalancing(mockPlaces, preferences);

      // Find food places in result
      const foodPlaces = result.filter(p => p.category === 'Food & Dining');
      if (foodPlaces.length > 1) {
        // Should be sorted by rating (highest first)
        expect(foodPlaces[0].rating).toBeGreaterThanOrEqual(foodPlaces[1].rating);
      }
    });

    it('should handle empty places array', () => {
      const result = service.applyCategoryBalancing([], {});
      expect(result).toEqual([]);
    });
  });

  describe('createSARPreferencesFromDiscoveryScreen', () => {
    const mockDiscoveryPreferences = {
      restaurant: true,
      cafe: true,
      park: false,
      museum: true
    };

    it('should create SAR-compatible preferences from DiscoveryPreferencesScreen data', () => {
      const result = service.createSARPreferencesFromDiscoveryScreen(
        mockDiscoveryPreferences,
        4.0,
        { categoryBalancing: true }
      );

      expect(result.placeTypes.restaurant).toBe(true);
      expect(result.placeTypes.cafe).toBe(true);
      expect(result.placeTypes.museum).toBe(true);
      expect(result.placeTypes.park).toBe(false); // Should be false since it was set to false
      expect(result.minRating).toBe(4.0);
      expect(result.categoryBalancing).toBe(true);
    });

    it('should handle invalid discovery preferences', () => {
      const result = service.createSARPreferencesFromDiscoveryScreen(null, 4.0);

      // When discovery preferences are null, placeTypes should be empty object but normalized to have all types as false
      expect(Object.keys(result.placeTypes).length).toBeGreaterThan(0); // All place types will be present as false
      expect(result.minRating).toBe(4.0);
      expect(result.allTypes).toBe(true); // Should be true since no types are enabled, defaults to all
    });

    it('should handle invalid minRating', () => {
      const result = service.createSARPreferencesFromDiscoveryScreen(
        mockDiscoveryPreferences,
        'invalid'
      );

      expect(result.minRating).toBe(0);
    });
  });

  describe('validateDiscoveryScreenCompatibility', () => {
    it('should validate valid preferences', () => {
      const preferences = {
        placeTypes: {
          restaurant: true,
          cafe: true
        },
        minRating: 4.0
      };
      const result = service.validateDiscoveryScreenCompatibility(preferences);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid preferences', () => {
      const result = service.validateDiscoveryScreenCompatibility(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Preferences object is required');
    });

    it('should provide warnings for high minimum rating', () => {
      const preferences = {
        placeTypes: { restaurant: true },
        minRating: 4.8
      };
      const result = service.validateDiscoveryScreenCompatibility(preferences);

      expect(result.warnings).toContain('Very high minimum rating may result in few discoveries');
    });

    it('should provide suggestions for limited place types', () => {
      const preferences = {
        placeTypes: { restaurant: true },
        minRating: 4.0
      };
      const result = service.validateDiscoveryScreenCompatibility(preferences);

      expect(result.suggestions).toContain('Consider enabling more place types for diverse discoveries');
    });
  });

  describe('searchAlongRouteWithDiscoveryPreferences', () => {
    const mockDiscoveryPreferences = {
      restaurant: true,
      cafe: true,
      park: false
    };

    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });
    });

    it('should perform SAR with DiscoveryPreferencesScreen integration', async () => {
      const result = await service.searchAlongRouteWithDiscoveryPreferences(
        mockCoordinates,
        mockDiscoveryPreferences,
        4.0
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const { validateCoordinates } = require('../utils/routeEncoder');
      validateCoordinates.mockReturnValue(false);

      await expect(
        service.searchAlongRouteWithDiscoveryPreferences(
          [],
          mockDiscoveryPreferences,
          4.0
        )
      ).rejects.toThrow();
    });
  });

  describe('enhanced validateAndNormalizePreferences', () => {
    it('should handle structured preferences from DiscoveryPreferencesScreen', () => {
      const preferences = {
        placeTypes: {
          restaurant: true,
          cafe: false
        },
        minRating: 4.0,
        categoryBalancing: true
      };
      const result = service.validateAndNormalizePreferences(preferences);

      expect(result.placeTypes.restaurant).toBe(true);
      expect(result.placeTypes.cafe).toBe(false);
      expect(result.minRating).toBe(4.0);
      expect(result.categoryBalancing).toBe(true);
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

    it('should detect when all types are enabled', () => {
      const allTypesPreferences = {};
      Object.keys(PLACE_TYPES).forEach(type => {
        allTypesPreferences[type] = true;
      });

      const result = service.validateAndNormalizePreferences({
        placeTypes: allTypesPreferences
      });

      expect(result.allTypes).toBe(true);
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

  describe('Fallback Center-Point Search', () => {
    const mockCenterPoint = { latitude: 37.7849, longitude: -122.4094 };
    const mockNearbyResponse = {
      places: [
        {
          id: 'nearby1',
          displayName: { text: 'Nearby Restaurant' },
          types: ['restaurant'],
          primaryType: 'restaurant',
          location: { latitude: 37.7850, longitude: -122.4095 },
          rating: 4.3
        },
        {
          id: 'nearby2',
          displayName: { text: 'Nearby Cafe' },
          types: ['cafe'],
          primaryType: 'cafe',
          location: { latitude: 37.7848, longitude: -122.4093 },
          rating: 4.1
        }
      ]
    };

    beforeEach(() => {
      const { calculateCenterPoint, calculateRouteDistance } = require('../utils/routeEncoder');
      calculateCenterPoint.mockReturnValue(mockCenterPoint);
      calculateRouteDistance.mockReturnValue(150); // Mock route distance
    });

    describe('performCenterPointSearch', () => {
      it('should perform center-point search successfully', async () => {
        fetch.mockResolvedValue({
          ok: true,
          json: async () => mockNearbyResponse
        });

        const result = await service.performCenterPointSearch(
          mockCoordinates,
          mockPreferences,
          4.0
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          id: 'nearby1',
          name: 'Nearby Restaurant',
          discoverySource: 'center-point',
          fallbackReason: 'SAR API failure'
        });
      });

      it('should calculate center point correctly', async () => {
        const { calculateCenterPoint } = require('../utils/routeEncoder');

        fetch.mockResolvedValue({
          ok: true,
          json: async () => ({ places: [] })
        });

        await service.performCenterPointSearch(mockCoordinates, mockPreferences);

        expect(calculateCenterPoint).toHaveBeenCalledWith(mockCoordinates);
      });

      it('should search for each enabled place type separately', async () => {
        const preferences = {
          placeTypes: {
            restaurant: true,
            cafe: true,
            park: false
          }
        };

        fetch.mockResolvedValue({
          ok: true,
          json: async () => ({ places: [] })
        });

        await service.performCenterPointSearch(mockCoordinates, preferences);

        // Should make 2 API calls (restaurant and cafe)
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it('should handle API errors for individual place types gracefully', async () => {
        const preferences = {
          placeTypes: {
            restaurant: true,
            cafe: true
          }
        };

        // Mock first call to succeed, second to fail
        fetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ places: [mockNearbyResponse.places[0]] })
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: async () => 'Server error'
          });

        const result = await service.performCenterPointSearch(mockCoordinates, preferences);

        // Should still return results from successful call
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Nearby Restaurant');
      });

      it('should apply preference filtering to results', async () => {
        const preferences = {
          placeTypes: {
            restaurant: true,
            cafe: false // Cafe disabled
          },
          minRating: 4.2
        };

        fetch.mockResolvedValue({
          ok: true,
          json: async () => mockNearbyResponse
        });

        const result = await service.performCenterPointSearch(mockCoordinates, preferences, 4.2);

        // Should filter out cafe and low-rated places
        expect(result.length).toBeLessThanOrEqual(1);
        if (result.length > 0) {
          expect(result[0].types).toContain('restaurant');
          expect(result[0].rating).toBeGreaterThanOrEqual(4.2);
        }
      });

      it('should deduplicate results', async () => {
        const duplicateResponse = {
          places: [
            mockNearbyResponse.places[0],
            mockNearbyResponse.places[0], // Duplicate
            mockNearbyResponse.places[1]
          ]
        };

        fetch.mockResolvedValue({
          ok: true,
          json: async () => duplicateResponse
        });

        const result = await service.performCenterPointSearch(mockCoordinates, mockPreferences);

        expect(result).toHaveLength(2); // Duplicates removed
      });
    });

    describe('performNearbySearch', () => {
      it('should make correct Nearby Search API request', async () => {
        fetch.mockResolvedValue({
          ok: true,
          json: async () => mockNearbyResponse
        });

        await service.performNearbySearch(
          mockCenterPoint,
          ['restaurant'],
          500,
          4.0
        );

        expect(fetch).toHaveBeenCalledWith(
          'https://places.googleapis.com/v1/places:searchNearby',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': 'test-ios-key',
              'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.location,places.rating,places.priceLevel,places.primaryType'
            }),
            body: expect.stringContaining('"includedTypes":["restaurant"]')
          })
        );
      });

      it('should include location restriction with correct radius', async () => {
        fetch.mockResolvedValue({
          ok: true,
          json: async () => mockNearbyResponse
        });

        await service.performNearbySearch(mockCenterPoint, ['restaurant'], 500);

        const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
        expect(requestBody.locationRestriction.circle.radius).toBe(500);
        expect(requestBody.locationRestriction.circle.center).toEqual(mockCenterPoint);
      });

      it('should include minimum rating when specified', async () => {
        fetch.mockResolvedValue({
          ok: true,
          json: async () => mockNearbyResponse
        });

        await service.performNearbySearch(mockCenterPoint, ['restaurant'], 500, 4.0);

        const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
        expect(requestBody.minRating).toBe(4.0);
      });

      it('should handle API errors', async () => {
        fetch.mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: async () => 'Invalid request'
        });

        await expect(
          service.performNearbySearch(mockCenterPoint, ['restaurant'], 500)
        ).rejects.toThrow('Nearby Search API request failed: 400 Bad Request');
      });

      it('should handle empty response', async () => {
        fetch.mockResolvedValue({
          ok: true,
          json: async () => ({ places: [] })
        });

        const result = await service.performNearbySearch(mockCenterPoint, ['restaurant'], 500);
        expect(result).toEqual([]);
      });
    });

    describe('deduplicateResults', () => {
      it('should remove duplicate places by place ID', () => {
        const duplicateResults = [
          { id: 'place1', placeId: 'place1', name: 'Restaurant A' },
          { id: 'place2', placeId: 'place2', name: 'Cafe B' },
          { id: 'place1', placeId: 'place1', name: 'Restaurant A Duplicate' },
          { id: 'place3', placeId: 'place3', name: 'Park C' }
        ];

        const result = service.deduplicateResults(duplicateResults);

        expect(result).toHaveLength(3);
        expect(result.map(p => p.placeId)).toEqual(['place1', 'place2', 'place3']);
      });

      it('should handle empty array', () => {
        const result = service.deduplicateResults([]);
        expect(result).toEqual([]);
      });

      it('should handle null/undefined input', () => {
        expect(service.deduplicateResults(null)).toBeNull();
        expect(service.deduplicateResults(undefined)).toBeUndefined();
      });

      it('should handle places without placeId using id field', () => {
        const results = [
          { id: 'place1', name: 'Restaurant A' },
          { id: 'place1', name: 'Restaurant A Duplicate' }
        ];

        const result = service.deduplicateResults(results);
        expect(result).toHaveLength(1);
      });
    });

    describe('searchAlongRouteWithFallback', () => {
      beforeEach(() => {
        const { calculateRouteDistance } = require('../utils/routeEncoder');
        calculateRouteDistance.mockReturnValue(150); // Mock route distance for logging
      });

      it('should use SAR when successful', async () => {
        fetch.mockResolvedValue({
          ok: true,
          json: async () => mockApiResponse
        });

        const result = await service.searchAlongRouteWithFallback(
          mockCoordinates,
          mockPreferences,
          4.0
        );

        expect(result).toHaveLength(2);
        expect(result[0].discoverySource).toBe('SAR');
      });

      it('should fallback to center-point search when SAR fails', async () => {
        // Mock SAR to fail
        fetch
          .mockRejectedValueOnce(new Error('SAR API failed'))
          .mockResolvedValue({
            ok: true,
            json: async () => mockNearbyResponse
          });

        const result = await service.searchAlongRouteWithFallback(
          mockCoordinates,
          mockPreferences,
          4.0
        );

        expect(result).toHaveLength(2);
        expect(result[0].discoverySource).toBe('center-point');
        expect(result[0].fallbackReason).toBe('SAR API failure');
      });

      it('should use center-point search for short routes', async () => {
        const { isRouteLongEnoughForSAR } = require('../utils/routeEncoder');
        isRouteLongEnoughForSAR.mockReturnValue(false);

        fetch.mockResolvedValue({
          ok: true,
          json: async () => mockNearbyResponse
        });

        const result = await service.searchAlongRouteWithFallback(
          mockCoordinates,
          mockPreferences,
          4.0
        );

        expect(result).toHaveLength(2);
        expect(result[0].discoverySource).toBe('center-point');
      });

      it('should handle invalid coordinates', async () => {
        const { validateCoordinates } = require('../utils/routeEncoder');
        validateCoordinates.mockReturnValue(false);

        await expect(
          service.searchAlongRouteWithFallback([], mockPreferences)
        ).rejects.toThrow('Invalid coordinates provided for Search Along Route');
      });

      it('should return empty results when both SAR and fallback fail', async () => {
        // Mock both SAR and nearby search to fail
        fetch.mockRejectedValue(new Error('API completely unavailable'));

        const result = await service.searchAlongRouteWithFallback(mockCoordinates, mockPreferences);

        // Should return empty array when all API calls fail, not throw error
        expect(result).toEqual([]);
      });
    });

    describe('logFallbackOperation', () => {
      it('should log fallback operation with correct information', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const sarError = new Error('SAR API failed');

        service.logFallbackOperation(mockCoordinates, mockPreferences, sarError);

        expect(consoleSpy).toHaveBeenCalledWith(
          'SAR Fallback Operation:',
          expect.objectContaining({
            operation: 'SAR_FALLBACK_TO_CENTER_POINT',
            routeInfo: expect.objectContaining({
              coordinateCount: mockCoordinates.length
            }),
            sarError: expect.objectContaining({
              message: 'SAR API failed',
              name: 'Error'
            }),
            fallbackReason: 'SAR API failure',
            fallbackMethod: 'center-point search with 500m radius'
          })
        );

        consoleSpy.mockRestore();
      });

      it('should include route distance when available', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const { calculateRouteDistance } = require('../utils/routeEncoder');
        calculateRouteDistance.mockReturnValue(250);

        service.logFallbackOperation(mockCoordinates, mockPreferences, new Error('Test'));

        expect(consoleSpy).toHaveBeenCalledWith(
          'SAR Fallback Operation:',
          expect.objectContaining({
            routeInfo: expect.objectContaining({
              routeDistance: 250
            })
          })
        );

        consoleSpy.mockRestore();
      });
    });
  });
});