/**
 * Discovery Preferences Persistence Tests
 * 
 * Tests for local storage persistence and cloud synchronization
 * of discovery preferences functionality.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import discoveriesService from '../services/DiscoveriesService';
import { DISCOVERY_STORAGE_KEYS } from '../constants/StorageKeys';
import { PlaceTypeUtils, DEFAULT_MIN_RATING } from '../constants/PlaceTypes';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {},
  getCurrentUser: jest.fn(() => ({ uid: 'test-user-123' })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ toDate: () => new Date() })),
}));

describe('DiscoveriesService - Preference Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    discoveriesService.clearCache();
  });

  describe('Local Storage Persistence', () => {
    test('should save preferences to AsyncStorage on change', async () => {
      // Mock existing preferences
      const existingPreferences = PlaceTypeUtils.createDefaultPreferences();
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingPreferences));
      AsyncStorage.getItem.mockResolvedValueOnce(DEFAULT_MIN_RATING.toString());

      // Update a preference
      await discoveriesService.updatePlaceTypePreference('restaurant', true);

      // Verify AsyncStorage.setItem was called
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        DISCOVERY_STORAGE_KEYS.PLACE_TYPE_PREFERENCES,
        expect.stringContaining('"restaurant":true')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
        expect.any(String)
      );
    });

    test('should load preferences from AsyncStorage on app start', async () => {
      const testPreferences = { restaurant: true, cafe: false };
      const testMinRating = 4.5;

      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(testPreferences))
        .mockResolvedValueOnce(testMinRating.toString());

      const preferences = await discoveriesService.getUserDiscoveryPreferences();
      const minRating = await discoveriesService.getMinRatingPreference();

      expect(preferences).toEqual(expect.objectContaining(testPreferences));
      expect(minRating).toBe(testMinRating);
    });

    test('should handle storage errors gracefully', async () => {
      // Mock storage error
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw and return defaults
      const preferences = await discoveriesService.getUserDiscoveryPreferences();
      
      expect(preferences).toEqual(PlaceTypeUtils.createDefaultPreferences());
    });

    test('should handle corrupted data gracefully', async () => {
      // Mock corrupted JSON
      AsyncStorage.getItem.mockResolvedValueOnce('invalid json');

      // Should not throw and return defaults
      const preferences = await discoveriesService.getUserDiscoveryPreferences();
      
      expect(preferences).toEqual(PlaceTypeUtils.createDefaultPreferences());
    });

    test('should validate preference data structure', async () => {
      // Mock invalid preference structure
      const invalidPreferences = { restaurant: 'invalid', cafe: 123 };
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(invalidPreferences));

      // Should return defaults for invalid data
      const preferences = await discoveriesService.getUserDiscoveryPreferences();
      
      expect(preferences).toEqual(PlaceTypeUtils.createDefaultPreferences());
    });
  });

  describe('Cloud Synchronization', () => {
    test('should sync preferences to cloud when user is authenticated', async () => {
      const { setDoc } = require('firebase/firestore');
      
      const testPreferences = PlaceTypeUtils.createDefaultPreferences();
      const testMinRating = 4.0;

      const success = await discoveriesService.syncPreferencesToCloud(testPreferences, testMinRating);

      expect(success).toBe(true);
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          placeTypes: testPreferences,
          minRating: testMinRating,
          schemaVersion: 1,
        }),
        { merge: true }
      );
    });

    test('should handle offline scenarios by queuing changes', async () => {
      // Mock no authenticated user (offline)
      const { getCurrentUser } = require('../firebase');
      getCurrentUser.mockReturnValueOnce(null);

      AsyncStorage.getItem.mockResolvedValueOnce('[]'); // No pending changes

      await discoveriesService._handleOfflineChange('placeType', { key: 'restaurant', enabled: true });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        DISCOVERY_STORAGE_KEYS.PENDING_PREFERENCE_CHANGES,
        expect.stringContaining('placeType')
      );
    });

    test('should process pending changes when coming back online', async () => {
      const pendingChanges = [
        { type: 'placeType', data: { key: 'restaurant', enabled: true }, timestamp: Date.now() }
      ];

      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(pendingChanges)) // Pending changes
        .mockResolvedValueOnce(JSON.stringify(PlaceTypeUtils.createDefaultPreferences())) // Current preferences
        .mockResolvedValueOnce(DEFAULT_MIN_RATING.toString()); // Current min rating

      const success = await discoveriesService.processPendingChanges();

      expect(success).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        DISCOVERY_STORAGE_KEYS.PENDING_PREFERENCE_CHANGES
      );
    });
  });

  describe('Error Handling', () => {
    test('should continue with in-memory updates when storage fails', async () => {
      // Mock storage failure
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage quota exceeded'));
      
      // Mock existing preferences in cache
      discoveriesService.preferencesCache = PlaceTypeUtils.createDefaultPreferences();

      // Should not throw
      const result = await discoveriesService.updatePlaceTypePreference('restaurant', true);

      expect(result).toBeDefined();
      expect(result.restaurant).toBe(true);
    });

    test('should handle cloud sync failures gracefully', async () => {
      const { setDoc } = require('firebase/firestore');
      setDoc.mockRejectedValueOnce(new Error('Network error'));

      const success = await discoveriesService.syncPreferencesToCloud({}, 4.0);

      expect(success).toBe(false);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        DISCOVERY_STORAGE_KEYS.PREFERENCES_SYNC_STATUS,
        'failed'
      );
    });

    test('should provide sync status information', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('synced') // sync status
        .mockResolvedValueOnce('1234567890') // last cloud sync
        .mockResolvedValueOnce('1234567891') // last local update
        .mockResolvedValueOnce('[]'); // pending changes

      const status = await discoveriesService.getSyncStatus();

      expect(status).toEqual({
        syncStatus: 'synced',
        lastCloudSync: 1234567890,
        lastLocalUpdate: 1234567891,
        hasPendingChanges: false,
        isUserAuthenticated: true,
      });
    });
  });

  describe('Preference Merging', () => {
    test('should merge preferences correctly when timestamps are close', async () => {
      const localPreferences = { restaurant: true, cafe: false };
      const cloudPreferences = { restaurant: false, cafe: true };
      const localMinRating = 4.0;
      const cloudMinRating = 4.5;

      const now = Date.now();
      AsyncStorage.getItem.mockResolvedValueOnce(now.toString()); // Local timestamp

      const cloudData = {
        preferences: cloudPreferences,
        minRating: cloudMinRating,
        lastUpdated: new Date(now + 30000), // 30 seconds later
      };

      const merged = await discoveriesService.mergePreferences(
        localPreferences,
        localMinRating,
        cloudData
      );

      // Should use cloud preferences (newer)
      expect(merged.preferences).toEqual(cloudPreferences);
      expect(merged.minRating).toBe(cloudMinRating);
    });

    test('should handle sync conflicts by merging enabled preferences', async () => {
      const localPreferences = { restaurant: true, cafe: false, museum: true };
      const cloudPreferences = { restaurant: false, cafe: true, museum: false };
      const localMinRating = 4.0;
      const cloudMinRating = 4.5;

      const now = Date.now();
      AsyncStorage.getItem.mockResolvedValueOnce(now.toString()); // Local timestamp

      const cloudData = {
        preferences: cloudPreferences,
        minRating: cloudMinRating,
        lastUpdated: new Date(now + 30000), // Within conflict threshold
      };

      // Mock the conflict resolution
      const resolved = await discoveriesService.handleSyncConflict(
        localPreferences,
        localMinRating,
        cloudData
      );

      // Should merge by taking union of enabled preferences and higher rating
      expect(resolved.preferences.restaurant || resolved.preferences.cafe || resolved.preferences.museum).toBe(true);
      expect(resolved.minRating).toBe(Math.max(localMinRating, cloudMinRating));
    });
  });
});