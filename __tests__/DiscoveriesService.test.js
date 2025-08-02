/**
 * Tests for DiscoveriesService
 * 
 * These tests verify the core functionality of the discovery preferences
 * management system, including storage, retrieval, and synchronization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import DiscoveriesService from '../services/DiscoveriesService';
import { DISCOVERY_STORAGE_KEYS } from '../constants/StorageKeys';
import { PlaceTypeUtils, DEFAULT_MIN_RATING } from '../constants/PlaceTypes';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('DiscoveriesService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Clear the service cache
    DiscoveriesService.clearCache();
  });

  describe('getUserDiscoveryPreferences', () => {
    it('should return default preferences when no stored preferences exist', async () => {
      // Mock AsyncStorage to return null (no stored preferences)
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue();

      const preferences = await DiscoveriesService.getUserDiscoveryPreferences();

      // Should return default preferences
      const expectedDefaults = PlaceTypeUtils.createDefaultPreferences();
      expect(preferences).toEqual(expectedDefaults);

      // Should save the defaults to storage
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        DISCOVERY_STORAGE_KEYS.PLACE_TYPE_PREFERENCES,
        JSON.stringify(expectedDefaults)
      );
    });

    it('should return stored preferences when they exist and are valid', async () => {
      const storedPreferences = {
        restaurant: true,
        cafe: false,
        museum: true,
      };

      // Mock AsyncStorage to return stored preferences
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedPreferences));
      AsyncStorage.setItem.mockResolvedValue();

      const preferences = await DiscoveriesService.getUserDiscoveryPreferences();

      // Should return preferences that include both stored and new place types
      expect(preferences).toHaveProperty('restaurant', true);
      expect(preferences).toHaveProperty('cafe', false);
      expect(preferences).toHaveProperty('museum', true);
      
      // Should have all place types (including ones not in stored preferences)
      const allPlaceTypes = PlaceTypeUtils.getAllPlaceTypeKeys();
      allPlaceTypes.forEach(placeType => {
        expect(preferences).toHaveProperty(placeType);
        expect(typeof preferences[placeType]).toBe('boolean');
      });
    });

    it('should handle corrupted stored preferences gracefully', async () => {
      // Mock AsyncStorage to return invalid JSON
      AsyncStorage.getItem.mockResolvedValue('invalid json');
      AsyncStorage.setItem.mockResolvedValue();

      const preferences = await DiscoveriesService.getUserDiscoveryPreferences();

      // Should return default preferences
      const expectedDefaults = PlaceTypeUtils.createDefaultPreferences();
      expect(preferences).toEqual(expectedDefaults);
    });

    it('should use cache when available and valid', async () => {
      const storedPreferences = { restaurant: true, cafe: false };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedPreferences));
      AsyncStorage.setItem.mockResolvedValue();

      // First call should load from storage
      const preferences1 = await DiscoveriesService.getUserDiscoveryPreferences();
      
      // Second call should use cache (AsyncStorage.getItem should not be called again)
      AsyncStorage.getItem.mockClear();
      const preferences2 = await DiscoveriesService.getUserDiscoveryPreferences();

      expect(preferences1).toEqual(preferences2);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('getMinRatingPreference', () => {
    it('should return default minimum rating when no stored rating exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue();

      const minRating = await DiscoveriesService.getMinRatingPreference();

      expect(minRating).toBe(DEFAULT_MIN_RATING);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        DISCOVERY_STORAGE_KEYS.MIN_RATING_PREFERENCE,
        DEFAULT_MIN_RATING.toString()
      );
    });

    it('should return stored minimum rating when it exists and is valid', async () => {
      const storedRating = '3.5';
      AsyncStorage.getItem.mockResolvedValue(storedRating);

      const minRating = await DiscoveriesService.getMinRatingPreference();

      expect(minRating).toBe(3.5);
    });

    it('should handle invalid stored rating gracefully', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid');
      AsyncStorage.setItem.mockResolvedValue();

      const minRating = await DiscoveriesService.getMinRatingPreference();

      expect(minRating).toBe(DEFAULT_MIN_RATING);
    });

    it('should handle out-of-range rating gracefully', async () => {
      AsyncStorage.getItem.mockResolvedValue('6.0'); // Invalid: > 5.0
      AsyncStorage.setItem.mockResolvedValue();

      const minRating = await DiscoveriesService.getMinRatingPreference();

      expect(minRating).toBe(DEFAULT_MIN_RATING);
    });
  });

  describe('resetDiscoveryPreferences', () => {
    it('should reset preferences to defaults', async () => {
      AsyncStorage.setItem.mockResolvedValue();

      const preferences = await DiscoveriesService.resetDiscoveryPreferences();

      const expectedDefaults = PlaceTypeUtils.createDefaultPreferences();
      expect(preferences).toEqual(expectedDefaults);

      // Should save defaults to storage
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        DISCOVERY_STORAGE_KEYS.PLACE_TYPE_PREFERENCES,
        JSON.stringify(expectedDefaults)
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        DISCOVERY_STORAGE_KEYS.MIN_RATING_PREFERENCE,
        DEFAULT_MIN_RATING.toString()
      );
    });
  });

  describe('updatePlaceTypePreference', () => {
    it('should update a specific place type preference', async () => {
      const initialPreferences = { restaurant: false, cafe: true };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(initialPreferences));
      AsyncStorage.setItem.mockResolvedValue();

      const updatedPreferences = await DiscoveriesService.updatePlaceTypePreference('restaurant', true);

      expect(updatedPreferences.restaurant).toBe(true);
      expect(updatedPreferences.cafe).toBe(true); // Should preserve other preferences
    });
  });

  describe('updateMinRatingPreference', () => {
    it('should update minimum rating preference', async () => {
      AsyncStorage.setItem.mockResolvedValue();

      const newRating = await DiscoveriesService.updateMinRatingPreference(3.5);

      expect(newRating).toBe(3.5);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        DISCOVERY_STORAGE_KEYS.MIN_RATING_PREFERENCE,
        '3.5'
      );
    });

    it('should reject invalid rating values', async () => {
      await expect(DiscoveriesService.updateMinRatingPreference(6.0)).rejects.toThrow();
      await expect(DiscoveriesService.updateMinRatingPreference(0.5)).rejects.toThrow();
      await expect(DiscoveriesService.updateMinRatingPreference('invalid')).rejects.toThrow();
    });
  });

  describe('filterPlacesByPreferences', () => {
    it('should filter places based on preferences and minimum rating', async () => {
      const places = [
        { types: ['restaurant'], rating: 4.5, name: 'Good Restaurant' },
        { types: ['restaurant'], rating: 3.0, name: 'Bad Restaurant' },
        { types: ['cafe'], rating: 4.2, name: 'Good Cafe' },
        { types: ['museum'], rating: 4.8, name: 'Great Museum' },
      ];

      const preferences = { restaurant: true, cafe: false, museum: true };
      const minRating = 4.0;

      const filteredPlaces = await DiscoveriesService.filterPlacesByPreferences(
        places,
        preferences,
        minRating
      );

      expect(filteredPlaces).toHaveLength(2);
      expect(filteredPlaces[0].name).toBe('Good Restaurant');
      expect(filteredPlaces[1].name).toBe('Great Museum');
    });

    it('should handle places without ratings gracefully', async () => {
      const places = [
        { types: ['restaurant'], name: 'No Rating Restaurant' },
        { types: ['restaurant'], rating: 4.5, name: 'Good Restaurant' },
      ];

      const preferences = { restaurant: true };
      const minRating = 4.0;

      const filteredPlaces = await DiscoveriesService.filterPlacesByPreferences(
        places,
        preferences,
        minRating
      );

      // Should only include the place with rating >= minRating
      expect(filteredPlaces).toHaveLength(1);
      expect(filteredPlaces[0].name).toBe('Good Restaurant');
    });
  });

  describe('syncPreferencesWithPlaceTypes', () => {
    it('should add new place types with enabled state', async () => {
      const existingPreferences = { restaurant: true, cafe: false };
      AsyncStorage.setItem.mockResolvedValue();
      AsyncStorage.getItem.mockResolvedValue('1'); // version

      const syncedPreferences = await DiscoveriesService.syncPreferencesWithPlaceTypes(existingPreferences);

      // Should preserve existing preferences
      expect(syncedPreferences.restaurant).toBe(true);
      expect(syncedPreferences.cafe).toBe(false);

      // Should add new place types
      const allPlaceTypes = PlaceTypeUtils.getAllPlaceTypeKeys();
      allPlaceTypes.forEach(placeType => {
        expect(syncedPreferences).toHaveProperty(placeType);
        expect(typeof syncedPreferences[placeType]).toBe('boolean');
      });
    });

    it('should handle invalid preference data structure', async () => {
      const invalidPreferences = 'not an object';
      AsyncStorage.setItem.mockResolvedValue();

      const syncedPreferences = await DiscoveriesService.syncPreferencesWithPlaceTypes(invalidPreferences);

      // Should return default preferences
      const expectedDefaults = PlaceTypeUtils.createDefaultPreferences();
      expect(syncedPreferences).toEqual(expectedDefaults);
    });
  });

  describe('getSuggestionsForRoute', () => {
    beforeEach(() => {
      // Mock SearchAlongRouteService
      jest.doMock('../services/SearchAlongRouteService', () => ({
        default: {
          searchAlongRoute: jest.fn().mockResolvedValue([
            { id: '1', name: 'Test Restaurant', types: ['restaurant'], rating: 4.5 },
            { id: '2', name: 'Test Cafe', types: ['cafe'], rating: 4.2 }
          ])
        }
      }));
    });

    it('should return suggestions for a valid route', async () => {
      const coordinates = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 }
      ];

      const suggestions = await DiscoveriesService.getSuggestionsForRoute(coordinates);

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should handle invalid coordinates gracefully', async () => {
      const invalidCoordinates = [{ latitude: 'invalid' }];

      const suggestions = await DiscoveriesService.getSuggestionsForRoute(invalidCoordinates);

      expect(suggestions).toEqual([]);
    });

    it('should handle empty coordinates array', async () => {
      const suggestions = await DiscoveriesService.getSuggestionsForRoute([]);

      expect(suggestions).toEqual([]);
    });

    it('should handle single coordinate', async () => {
      const singleCoordinate = [{ latitude: 37.7749, longitude: -122.4194 }];

      const suggestions = await DiscoveriesService.getSuggestionsForRoute(singleCoordinate);

      expect(suggestions).toEqual([]);
    });
  });

  describe('getPingDiscoveries', () => {
    it('should return empty array for valid location (placeholder implementation)', async () => {
      const location = { latitude: 37.7749, longitude: -122.4194 };

      const discoveries = await DiscoveriesService.getPingDiscoveries(location);

      expect(discoveries).toEqual([]);
    });

    it('should handle invalid location gracefully', async () => {
      const invalidLocation = { latitude: 'invalid' };

      const discoveries = await DiscoveriesService.getPingDiscoveries(invalidLocation);

      expect(discoveries).toEqual([]);
    });

    it('should handle missing location gracefully', async () => {
      const discoveries = await DiscoveriesService.getPingDiscoveries(null);

      expect(discoveries).toEqual([]);
    });
  });

  describe('applyPreferenceUpdatesToPingResults', () => {
    it('should re-filter ping results with updated preferences', async () => {
      const pingResults = [
        { id: '1', name: 'Test Restaurant', types: ['restaurant'], rating: 4.5 },
        { id: '2', name: 'Test Cafe', types: ['cafe'], rating: 3.5 }
      ];

      const updatedPreferences = { restaurant: true, cafe: false };
      const updatedMinRating = 4.0;

      const filteredResults = await DiscoveriesService.applyPreferenceUpdatesToPingResults(
        pingResults, 
        updatedPreferences, 
        updatedMinRating
      );

      expect(filteredResults).toHaveLength(1);
      expect(filteredResults[0].name).toBe('Test Restaurant');
    });

    it('should handle invalid ping results gracefully', async () => {
      const invalidResults = 'not an array';

      const filteredResults = await DiscoveriesService.applyPreferenceUpdatesToPingResults(invalidResults);

      expect(filteredResults).toEqual([]);
    });

    it('should handle empty ping results', async () => {
      const emptyResults = [];

      const filteredResults = await DiscoveriesService.applyPreferenceUpdatesToPingResults(emptyResults);

      expect(filteredResults).toEqual([]);
    });
  });

  describe('getManualSearchResults', () => {
    it('should return empty array for valid query and location (placeholder implementation)', async () => {
      const query = 'coffee shops';
      const location = { latitude: 37.7749, longitude: -122.4194 };

      const results = await DiscoveriesService.getManualSearchResults(query, location);

      expect(results).toEqual([]);
    });

    it('should handle invalid query gracefully', async () => {
      const invalidQuery = '';
      const location = { latitude: 37.7749, longitude: -122.4194 };

      const results = await DiscoveriesService.getManualSearchResults(invalidQuery, location);

      expect(results).toEqual([]);
    });

    it('should handle invalid location gracefully', async () => {
      const query = 'restaurants';
      const invalidLocation = { latitude: 'invalid' };

      const results = await DiscoveriesService.getManualSearchResults(query, invalidLocation);

      expect(results).toEqual([]);
    });

    it('should handle missing parameters gracefully', async () => {
      const results = await DiscoveriesService.getManualSearchResults(null, null);

      expect(results).toEqual([]);
    });
  });

  describe('applyConsistentFiltering', () => {
    it('should apply consistent filtering to places from any source', async () => {
      const places = [
        { id: '1', name: 'Test Restaurant', types: ['restaurant'], rating: 4.5 },
        { id: '2', name: 'Test Cafe', types: ['cafe'], rating: 3.5 },
        { id: '3', name: 'Test Bar', types: ['bar'], rating: 4.2 }
      ];

      const preferences = { restaurant: true, cafe: false, bar: true };
      const minRating = 4.0;

      const filteredResults = await DiscoveriesService.applyConsistentFiltering(places, {
        preferences,
        minRating,
        source: 'test'
      });

      expect(filteredResults).toHaveLength(2);
      expect(filteredResults.map(p => p.name)).toEqual(['Test Restaurant', 'Test Bar']);
    });

    it('should handle invalid places array gracefully', async () => {
      const invalidPlaces = 'not an array';

      const filteredResults = await DiscoveriesService.applyConsistentFiltering(invalidPlaces);

      expect(filteredResults).toEqual([]);
    });

    it('should handle empty places array', async () => {
      const emptyPlaces = [];

      const filteredResults = await DiscoveriesService.applyConsistentFiltering(emptyPlaces);

      expect(filteredResults).toEqual([]);
    });
  });
});