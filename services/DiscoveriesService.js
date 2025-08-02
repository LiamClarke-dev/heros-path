/**
 * Discoveries Service
 * 
 * This service manages discovery preferences and provides functionality for
 * storing, retrieving, and applying user preferences for place discovery.
 * It handles both local storage (AsyncStorage) and cloud synchronization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, getCurrentUser } from '../firebase';
import { DISCOVERY_STORAGE_KEYS, STORAGE_DEFAULTS } from '../constants/StorageKeys';
import { PlaceTypeUtils, DEFAULT_MIN_RATING } from '../constants/PlaceTypes';

/**
 * DiscoveriesService class for managing discovery preferences
 */
class DiscoveriesService {
  constructor() {
    this.preferencesCache = null;
    this.minRatingCache = null;
    this.lastCacheUpdate = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.syncInProgress = false;
    this.pendingChanges = new Set();
    this.syncDebounceTimeout = null;
    this.syncDebounceDelay = 500; // 500ms debounce for cloud sync
  }

  /**
   * Get user's discovery preferences for place types
   * @returns {Promise<Object>} Map of place type keys to boolean enabled state
   */
  async getUserDiscoveryPreferences() {
    try {
      // Check cache first
      if (this.preferencesCache && this._isCacheValid()) {
        console.log('DiscoveriesService: Returning cached preferences');
        return this.preferencesCache;
      }

      console.log('DiscoveriesService: Loading preferences from storage');
      
      // Try to load from AsyncStorage
      const storedPreferences = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.PLACE_TYPE_PREFERENCES
      );

      let preferences;
      
      if (storedPreferences) {
        try {
          preferences = JSON.parse(storedPreferences);
          console.log('DiscoveriesService: Loaded existing preferences from storage');
          
          // Handle backward compatibility with legacy formats
          preferences = await this._handleBackwardCompatibility(preferences);
          
          // Validate the loaded preferences
          if (!this._validatePreferenceDataStructure(preferences)) {
            console.warn('DiscoveriesService: Invalid preferences found after compatibility check, creating defaults');
            preferences = PlaceTypeUtils.createDefaultPreferences();
          } else {
            // Sync with current place types (add new ones, remove old ones)
            preferences = await this.syncPreferencesWithPlaceTypes(preferences);
          }
        } catch (parseError) {
          console.error('DiscoveriesService: Error parsing stored preferences:', parseError);
          preferences = PlaceTypeUtils.createDefaultPreferences();
        }
      } else {
        console.log('DiscoveriesService: No existing preferences found, creating defaults');
        preferences = PlaceTypeUtils.createDefaultPreferences();
      }

      // Save the preferences back to storage (in case they were synced or created)
      await this._savePreferencesToStorage(preferences);
      
      // Update cache
      this.preferencesCache = preferences;
      this.lastCacheUpdate = Date.now();
      
      return preferences;
    } catch (error) {
      console.error('DiscoveriesService: Error getting user discovery preferences:', error);
      
      // Return default preferences as fallback
      const defaultPreferences = PlaceTypeUtils.createDefaultPreferences();
      this.preferencesCache = defaultPreferences;
      this.lastCacheUpdate = Date.now();
      
      return defaultPreferences;
    }
  }

  /**
   * Handle backward compatibility with legacy preference formats
   * @param {any} rawPreferences - Raw preferences data from storage
   * @returns {Promise<Object>} Normalized preferences object
   * @private
   */
  async _handleBackwardCompatibility(rawPreferences) {
    try {
      // If it's already a valid object with boolean values, return as-is
      if (this._validatePreferenceDataStructure(rawPreferences)) {
        return rawPreferences;
      }
      
      console.log('DiscoveriesService: Handling backward compatibility for preferences');
      
      // Handle legacy array format (if preferences were stored as array of enabled types)
      if (Array.isArray(rawPreferences)) {
        console.log('DiscoveriesService: Converting legacy array format to object format');
        const convertedPreferences = PlaceTypeUtils.createDefaultPreferences();
        
        // Enable place types that were in the array
        rawPreferences.forEach(placeType => {
          if (typeof placeType === 'string' && convertedPreferences.hasOwnProperty(placeType)) {
            convertedPreferences[placeType] = true;
          }
        });
        
        return convertedPreferences;
      }
      
      // Handle legacy object format with non-boolean values
      if (typeof rawPreferences === 'object' && rawPreferences !== null) {
        console.log('DiscoveriesService: Converting legacy object format with non-boolean values');
        const convertedPreferences = PlaceTypeUtils.createDefaultPreferences();
        
        Object.entries(rawPreferences).forEach(([key, value]) => {
          if (typeof key === 'string' && convertedPreferences.hasOwnProperty(key)) {
            // Convert various truthy/falsy values to boolean
            if (typeof value === 'boolean') {
              convertedPreferences[key] = value;
            } else if (typeof value === 'string') {
              convertedPreferences[key] = value.toLowerCase() === 'true' || value === '1';
            } else if (typeof value === 'number') {
              convertedPreferences[key] = value > 0;
            } else {
              convertedPreferences[key] = Boolean(value);
            }
          }
        });
        
        return convertedPreferences;
      }
      
      // If we can't handle the format, return defaults
      console.warn('DiscoveriesService: Unknown legacy format, returning defaults');
      return PlaceTypeUtils.createDefaultPreferences();
      
    } catch (error) {
      console.error('DiscoveriesService: Error handling backward compatibility:', error);
      return PlaceTypeUtils.createDefaultPreferences();
    }
  }

  /**
   * Get user's minimum rating preference
   * @returns {Promise<number>} Minimum rating threshold (1.0 to 5.0)
   */
  async getMinRatingPreference() {
    try {
      // Check cache first
      if (this.minRatingCache !== null && this._isCacheValid()) {
        console.log('DiscoveriesService: Returning cached minimum rating');
        return this.minRatingCache;
      }

      console.log('DiscoveriesService: Loading minimum rating from storage');
      
      // Try to load from AsyncStorage
      const storedMinRating = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.MIN_RATING_PREFERENCE
      );

      let minRating;
      
      if (storedMinRating !== null) {
        try {
          minRating = parseFloat(storedMinRating);
          
          // Validate the rating is within acceptable range
          if (isNaN(minRating) || minRating < 1.0 || minRating > 5.0) {
            console.warn('DiscoveriesService: Invalid minimum rating found, using default');
            minRating = DEFAULT_MIN_RATING;
          } else {
            console.log(`DiscoveriesService: Loaded minimum rating: ${minRating}`);
          }
        } catch (parseError) {
          console.error('DiscoveriesService: Error parsing stored minimum rating:', parseError);
          minRating = DEFAULT_MIN_RATING;
        }
      } else {
        console.log('DiscoveriesService: No existing minimum rating found, using default');
        minRating = DEFAULT_MIN_RATING;
      }

      // Save the minimum rating back to storage (in case it was defaulted)
      await this._saveMinRatingToStorage(minRating);
      
      // Update cache
      this.minRatingCache = minRating;
      this.lastCacheUpdate = Date.now();
      
      return minRating;
    } catch (error) {
      console.error('DiscoveriesService: Error getting minimum rating preference:', error);
      
      // Return default minimum rating as fallback
      this.minRatingCache = DEFAULT_MIN_RATING;
      this.lastCacheUpdate = Date.now();
      
      return DEFAULT_MIN_RATING;
    }
  }

  /**
   * Reset discovery preferences to default values
   * @returns {Promise<Object>} Default preferences object
   */
  async resetDiscoveryPreferences() {
    try {
      console.log('DiscoveriesService: Resetting discovery preferences to defaults');
      
      // Create default preferences
      const defaultPreferences = PlaceTypeUtils.createDefaultPreferences();
      const defaultMinRating = DEFAULT_MIN_RATING;
      
      // Save to local storage immediately
      await this._savePreferencesToStorage(defaultPreferences);
      await this._saveMinRatingToStorage(defaultMinRating);
      
      // Update cache
      this.preferencesCache = defaultPreferences;
      this.minRatingCache = defaultMinRating;
      this.lastCacheUpdate = Date.now();
      
      // Update last update timestamp
      const timestamp = Date.now().toString();
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
        timestamp
      );
      
      // Attempt cloud sync (debounced)
      this._debouncedCloudSync(defaultPreferences, defaultMinRating);
      
      // Handle offline scenario
      if (!getCurrentUser()) {
        await this._handleOfflineChange('reset', { preferences: defaultPreferences, minRating: defaultMinRating });
      }
      
      console.log('DiscoveriesService: Successfully reset preferences to defaults');
      
      return defaultPreferences;
    } catch (error) {
      console.error('DiscoveriesService: Error resetting discovery preferences:', error);
      
      // Handle storage errors gracefully
      if (error.message?.includes('storage') || error.message?.includes('AsyncStorage')) {
        console.warn('DiscoveriesService: Local storage error, continuing with in-memory reset');
        
        // Update cache only
        const defaultPreferences = PlaceTypeUtils.createDefaultPreferences();
        const defaultMinRating = DEFAULT_MIN_RATING;
        
        this.preferencesCache = defaultPreferences;
        this.minRatingCache = defaultMinRating;
        
        return defaultPreferences;
      }
      
      throw error;
    }
  }

  /**
   * Update a specific place type preference
   * @param {string} placeTypeKey - The place type key to update
   * @param {boolean} enabled - Whether the place type should be enabled
   * @returns {Promise<Object>} Updated preferences object
   */
  async updatePlaceTypePreference(placeTypeKey, enabled) {
    try {
      console.log(`DiscoveriesService: Updating ${placeTypeKey} to ${enabled}`);
      
      // Get current preferences
      const currentPreferences = await this.getUserDiscoveryPreferences();
      
      // Update the specific preference
      const updatedPreferences = {
        ...currentPreferences,
        [placeTypeKey]: enabled,
      };
      
      // Save to local storage immediately
      await this._savePreferencesToStorage(updatedPreferences);
      
      // Update cache
      this.preferencesCache = updatedPreferences;
      this.lastCacheUpdate = Date.now();
      
      // Update last update timestamp
      const timestamp = Date.now().toString();
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
        timestamp
      );
      
      // Attempt cloud sync (debounced)
      const currentMinRating = await this.getMinRatingPreference();
      this._debouncedCloudSync(updatedPreferences, currentMinRating);
      
      // Handle offline scenario
      if (!getCurrentUser()) {
        await this._handleOfflineChange('placeType', { key: placeTypeKey, enabled });
      }
      
      console.log(`DiscoveriesService: Successfully updated ${placeTypeKey} preference`);
      
      return updatedPreferences;
    } catch (error) {
      console.error('DiscoveriesService: Error updating place type preference:', error);
      
      // Handle storage errors gracefully
      if (error.message?.includes('storage') || error.message?.includes('AsyncStorage')) {
        console.warn('DiscoveriesService: Local storage error, continuing with in-memory update');
        
        // Update cache only
        if (this.preferencesCache) {
          this.preferencesCache[placeTypeKey] = enabled;
        }
        
        return this.preferencesCache || {};
      }
      
      throw error;
    }
  }

  /**
   * Update minimum rating preference
   * @param {number} minRating - New minimum rating (1.0 to 5.0)
   * @returns {Promise<number>} Updated minimum rating
   */
  async updateMinRatingPreference(minRating) {
    try {
      // Validate rating
      if (isNaN(minRating) || minRating < 1.0 || minRating > 5.0) {
        throw new Error(`Invalid minimum rating: ${minRating}. Must be between 1.0 and 5.0`);
      }
      
      console.log(`DiscoveriesService: Updating minimum rating to ${minRating}`);
      
      // Save to local storage immediately
      await this._saveMinRatingToStorage(minRating);
      
      // Update cache
      this.minRatingCache = minRating;
      this.lastCacheUpdate = Date.now();
      
      // Update last update timestamp
      const timestamp = Date.now().toString();
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
        timestamp
      );
      
      // Attempt cloud sync (debounced)
      const currentPreferences = await this.getUserDiscoveryPreferences();
      this._debouncedCloudSync(currentPreferences, minRating);
      
      // Handle offline scenario
      if (!getCurrentUser()) {
        await this._handleOfflineChange('minRating', minRating);
      }
      
      console.log('DiscoveriesService: Successfully updated minimum rating preference');
      
      return minRating;
    } catch (error) {
      console.error('DiscoveriesService: Error updating minimum rating preference:', error);
      
      // Handle storage errors gracefully
      if (error.message?.includes('storage') || error.message?.includes('AsyncStorage')) {
        console.warn('DiscoveriesService: Local storage error, continuing with in-memory update');
        
        // Update cache only
        this.minRatingCache = minRating;
        
        return minRating;
      }
      
      throw error;
    }
  }

  /**
   * Filter places based on user preferences
   * @param {Array} places - Array of place objects from Google Places API
   * @param {Object} preferences - User's place type preferences (optional, will load if not provided)
   * @param {number} minRating - Minimum rating threshold (optional, will load if not provided)
   * @returns {Promise<Array>} Filtered array of places
   */
  async filterPlacesByPreferences(places, preferences = null, minRating = null) {
    try {
      // Validate input
      if (!Array.isArray(places)) {
        console.warn('DiscoveriesService: Invalid places array provided to filterPlacesByPreferences');
        return [];
      }

      if (places.length === 0) {
        console.log('DiscoveriesService: No places to filter');
        return [];
      }

      // Load preferences if not provided
      if (!preferences) {
        preferences = await this.getUserDiscoveryPreferences();
      }
      
      if (minRating === null) {
        minRating = await this.getMinRatingPreference();
      }
      
      console.log(`DiscoveriesService: Filtering ${places.length} places with preferences (minRating: ${minRating})`);
      
      const filteredPlaces = places.filter(place => {
        // Validate place object
        if (!place || typeof place !== 'object') {
          console.warn('DiscoveriesService: Invalid place object encountered during filtering');
          return false;
        }

        // Check place type preference
        const placeTypes = place.types || [];
        if (!Array.isArray(placeTypes)) {
          console.warn('DiscoveriesService: Place types is not an array:', place);
          return false;
        }

        // Check if any of the place's types are enabled in preferences
        const hasEnabledType = placeTypes.some(type => preferences[type] === true);
        
        if (!hasEnabledType) {
          return false;
        }
        
        // Check minimum rating
        const placeRating = place.rating;
        if (typeof placeRating === 'number' && placeRating > 0 && placeRating < minRating) {
          return false;
        }
        
        // If minRating is set and place has no rating, exclude it
        if (minRating > 0 && (!placeRating || placeRating === 0)) {
          return false;
        }
        
        return true;
      });
      
      console.log(`DiscoveriesService: Filtered to ${filteredPlaces.length} places`);
      
      return filteredPlaces;
    } catch (error) {
      console.error('DiscoveriesService: Error filtering places by preferences:', error);
      // Return original places as fallback
      return places || [];
    }
  }

  /**
   * Get suggestions for a route using Search Along Route with user preferences applied
   * @param {Array<{latitude: number, longitude: number}>} coordinates - Route coordinates
   * @param {Object} options - Optional parameters
   * @param {Object} options.preferences - User preferences (will load if not provided)
   * @param {number} options.minRating - Minimum rating (will load if not provided)
   * @param {boolean} options.useCache - Whether to use cached results (default: true)
   * @returns {Promise<Array>} Array of suggested places along the route
   */
  async getSuggestionsForRoute(coordinates, options = {}) {
    try {
      // Validate coordinates
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        throw new Error('Invalid coordinates: must be an array with at least 2 points');
      }

      // Validate coordinate format
      const isValidCoordinate = (coord) => {
        return coord && 
               typeof coord.latitude === 'number' && 
               typeof coord.longitude === 'number' &&
               coord.latitude >= -90 && coord.latitude <= 90 &&
               coord.longitude >= -180 && coord.longitude <= 180;
      };

      if (!coordinates.every(isValidCoordinate)) {
        throw new Error('Invalid coordinate format: each coordinate must have valid latitude and longitude');
      }

      console.log(`DiscoveriesService: Getting suggestions for route with ${coordinates.length} coordinates`);

      // Load preferences if not provided
      const preferences = options.preferences || await this.getUserDiscoveryPreferences();
      const minRating = options.minRating !== undefined ? options.minRating : await this.getMinRatingPreference();

      // Import SearchAlongRouteService dynamically to avoid circular dependencies
      const SearchAlongRouteService = (await import('./SearchAlongRouteService')).default;

      // Use SearchAlongRouteService to get places along the route
      const places = await SearchAlongRouteService.searchAlongRoute(
        coordinates,
        { placeTypes: preferences, minRating },
        minRating
      );

      // Apply additional preference filtering (defensive filtering)
      const filteredPlaces = await this.filterPlacesByPreferences(places, preferences, minRating);

      console.log(`DiscoveriesService: Route suggestions completed - ${filteredPlaces.length} places found`);

      return filteredPlaces;
    } catch (error) {
      console.error('DiscoveriesService: Error getting suggestions for route:', error);
      
      // Return empty array as fallback to prevent app crashes
      return [];
    }
  }

  /**
   * Synchronize preferences with current place types
   * Adds new place types and removes obsolete ones while preserving existing preferences
   * @param {Object} existingPreferences - Current user preferences (optional, will load if not provided)
   * @returns {Promise<Object>} Updated preferences object
   */
  async syncPreferencesWithPlaceTypes(existingPreferences = null) {
    try {
      console.log('DiscoveriesService: Synchronizing preferences with place types');
      
      // Load existing preferences if not provided
      if (!existingPreferences) {
        existingPreferences = await this.getUserDiscoveryPreferences();
      }
      
      // Validate existing preferences structure
      if (!this._validatePreferenceDataStructure(existingPreferences)) {
        console.warn('DiscoveriesService: Invalid preference data structure detected, creating defaults');
        existingPreferences = PlaceTypeUtils.createDefaultPreferences();
      }
      
      // Use PlaceTypeUtils to sync preferences
      const syncedPreferences = PlaceTypeUtils.syncPreferencesWithPlaceTypes(existingPreferences);
      
      // Validate the synced preferences
      if (!this._validatePreferenceDataStructure(syncedPreferences)) {
        console.error('DiscoveriesService: Synced preferences are invalid, falling back to defaults');
        const defaultPreferences = PlaceTypeUtils.createDefaultPreferences();
        await this._savePreferencesToStorage(defaultPreferences);
        return defaultPreferences;
      }
      
      // Check if any changes were made
      const hasChanges = JSON.stringify(existingPreferences) !== JSON.stringify(syncedPreferences);
      
      if (hasChanges) {
        console.log('DiscoveriesService: Preferences were updated during sync');
        
        // Save the updated preferences
        await this._savePreferencesToStorage(syncedPreferences);
        
        // Update cache
        this.preferencesCache = syncedPreferences;
        this.lastCacheUpdate = Date.now();
        
        // Update last update timestamp
        await AsyncStorage.setItem(
          DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
          Date.now().toString()
        );
        
        // Update preferences version to indicate sync occurred
        const currentVersion = await AsyncStorage.getItem(DISCOVERY_STORAGE_KEYS.PREFERENCES_VERSION) || '1';
        const currentVersionNum = parseInt(currentVersion) || 1;
        const newVersion = (currentVersionNum + 1).toString();
        await AsyncStorage.setItem(DISCOVERY_STORAGE_KEYS.PREFERENCES_VERSION, newVersion);
        
        console.log(`DiscoveriesService: Preferences synced and version updated to ${newVersion}`);
        
        // Log the changes for debugging
        this._logPreferenceChanges(existingPreferences, syncedPreferences);
      } else {
        console.log('DiscoveriesService: No changes needed during sync');
      }
      
      return syncedPreferences;
    } catch (error) {
      console.error('DiscoveriesService: Error synchronizing preferences with place types:', error);
      
      // Return existing preferences as fallback if they're valid
      if (existingPreferences && this._validatePreferenceDataStructure(existingPreferences)) {
        return existingPreferences;
      }
      
      // If no valid existing preferences, return defaults
      const defaultPreferences = PlaceTypeUtils.createDefaultPreferences();
      try {
        await this._savePreferencesToStorage(defaultPreferences);
      } catch (saveError) {
        console.error('DiscoveriesService: Failed to save default preferences:', saveError);
      }
      return defaultPreferences;
    }
  }

  /**
   * Validate preference data structure for backward compatibility
   * @param {Object} preferences - Preferences object to validate
   * @returns {boolean} Whether the data structure is valid
   * @private
   */
  _validatePreferenceDataStructure(preferences) {
    try {
      // Check if preferences is an object
      if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
        console.warn('DiscoveriesService: Preferences is not a valid object');
        return false;
      }
      
      // Check if all values are boolean
      for (const [key, value] of Object.entries(preferences)) {
        if (typeof value !== 'boolean') {
          console.warn(`DiscoveriesService: Invalid preference value for ${key}: ${value} (expected boolean)`);
          return false;
        }
        
        // Check if key is a string
        if (typeof key !== 'string' || key.trim() === '') {
          console.warn(`DiscoveriesService: Invalid preference key: ${key}`);
          return false;
        }
      }
      
      // Check if preferences has at least some entries
      if (Object.keys(preferences).length === 0) {
        console.warn('DiscoveriesService: Preferences object is empty');
        return false;
      }
      
      // Additional validation: check for common corruption patterns
      const stringified = JSON.stringify(preferences);
      if (stringified.includes('undefined') || stringified.includes('null')) {
        console.warn('DiscoveriesService: Preferences contain undefined or null values');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('DiscoveriesService: Error validating preference data structure:', error);
      return false;
    }
  }

  /**
   * Log changes made during preference synchronization
   * @param {Object} oldPreferences - Original preferences
   * @param {Object} newPreferences - Updated preferences
   * @private
   */
  _logPreferenceChanges(oldPreferences, newPreferences) {
    try {
      const oldKeys = new Set(Object.keys(oldPreferences));
      const newKeys = new Set(Object.keys(newPreferences));
      
      // Find added keys
      const addedKeys = [...newKeys].filter(key => !oldKeys.has(key));
      if (addedKeys.length > 0) {
        console.log(`DiscoveriesService: Added place types: ${addedKeys.join(', ')}`);
      }
      
      // Find removed keys
      const removedKeys = [...oldKeys].filter(key => !newKeys.has(key));
      if (removedKeys.length > 0) {
        console.log(`DiscoveriesService: Removed place types: ${removedKeys.join(', ')}`);
      }
      
      // Find changed values
      const changedKeys = [...newKeys].filter(key => 
        oldKeys.has(key) && oldPreferences[key] !== newPreferences[key]
      );
      if (changedKeys.length > 0) {
        console.log(`DiscoveriesService: Changed place types: ${changedKeys.join(', ')}`);
      }
      
      console.log(`DiscoveriesService: Sync summary - Added: ${addedKeys.length}, Removed: ${removedKeys.length}, Changed: ${changedKeys.length}`);
    } catch (error) {
      console.error('DiscoveriesService: Error logging preference changes:', error);
    }
  }

  /**
   * Clear preferences cache (useful for testing or forcing refresh)
   */
  clearCache() {
    console.log('DiscoveriesService: Clearing preferences cache');
    this.preferencesCache = null;
    this.minRatingCache = null;
    this.lastCacheUpdate = null;
  }

  /**
   * Sync preferences to cloud storage (Firestore)
   * @param {Object} preferences - Place type preferences
   * @param {number} minRating - Minimum rating preference
   * @returns {Promise<boolean>} Success status
   */
  async syncPreferencesToCloud(preferences = null, minRating = null) {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.log('DiscoveriesService: No authenticated user, skipping cloud sync');
        return false;
      }

      // Load current preferences if not provided
      if (!preferences) {
        preferences = await this.getUserDiscoveryPreferences();
      }
      if (minRating === null) {
        minRating = await this.getMinRatingPreference();
      }

      console.log('DiscoveriesService: Syncing preferences to cloud for user:', currentUser.uid);

      const userDocRef = doc(db, 'users', currentUser.uid, 'settings', 'discoveryPreferences');
      
      const preferencesData = {
        placeTypes: preferences,
        minRating: minRating,
        lastUpdated: serverTimestamp(),
        schemaVersion: 1,
        deviceInfo: {
          platform: 'react-native',
          lastSyncDevice: 'mobile',
        },
      };

      await setDoc(userDocRef, preferencesData, { merge: true });

      // Update local sync status
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.LAST_CLOUD_SYNC,
        Date.now().toString()
      );
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.PREFERENCES_SYNC_STATUS,
        'synced'
      );

      console.log('DiscoveriesService: Successfully synced preferences to cloud');
      return true;
    } catch (error) {
      console.error('DiscoveriesService: Error syncing preferences to cloud:', error);
      
      // Update sync status to indicate failure
      try {
        await AsyncStorage.setItem(
          DISCOVERY_STORAGE_KEYS.PREFERENCES_SYNC_STATUS,
          'failed'
        );
      } catch (statusError) {
        console.error('DiscoveriesService: Error updating sync status:', statusError);
      }
      
      return false;
    }
  }

  /**
   * Load preferences from cloud storage (Firestore)
   * @returns {Promise<Object|null>} Cloud preferences or null if not found
   */
  async loadPreferencesFromCloud() {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.log('DiscoveriesService: No authenticated user, cannot load from cloud');
        return null;
      }

      console.log('DiscoveriesService: Loading preferences from cloud for user:', currentUser.uid);

      const userDocRef = doc(db, 'users', currentUser.uid, 'settings', 'discoveryPreferences');
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        console.log('DiscoveriesService: Found cloud preferences');

        // Validate cloud data structure
        if (cloudData.placeTypes && typeof cloudData.minRating === 'number') {
          // Sync cloud preferences with current place types
          const syncedPreferences = await this.syncPreferencesWithPlaceTypes(cloudData.placeTypes);
          
          return {
            preferences: syncedPreferences,
            minRating: cloudData.minRating,
            lastUpdated: cloudData.lastUpdated?.toDate?.() || new Date(),
            schemaVersion: cloudData.schemaVersion || 1,
          };
        } else {
          console.warn('DiscoveriesService: Invalid cloud data structure');
          return null;
        }
      } else {
        console.log('DiscoveriesService: No cloud preferences found');
        return null;
      }
    } catch (error) {
      console.error('DiscoveriesService: Error loading preferences from cloud:', error);
      return null;
    }
  }

  /**
   * Merge local and cloud preferences, handling conflicts intelligently
   * @param {Object} localPreferences - Local preferences
   * @param {number} localMinRating - Local minimum rating
   * @param {Object} cloudData - Cloud preferences data
   * @returns {Promise<Object>} Merged preferences
   */
  async mergePreferences(localPreferences, localMinRating, cloudData) {
    try {
      console.log('DiscoveriesService: Merging local and cloud preferences');

      // Get local last update timestamp
      const localLastUpdate = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE
      );
      const localTimestamp = localLastUpdate ? parseInt(localLastUpdate) : 0;
      const cloudTimestamp = cloudData.lastUpdated ? cloudData.lastUpdated.getTime() : 0;

      console.log('DiscoveriesService: Local timestamp:', localTimestamp, 'Cloud timestamp:', cloudTimestamp);

      // Check if there's a significant difference that indicates a conflict
      const timeDifference = Math.abs(cloudTimestamp - localTimestamp);
      const conflictThreshold = 5 * 60 * 1000; // 5 minutes

      // If both have recent changes, handle as a conflict
      if (timeDifference < conflictThreshold && localTimestamp > 0 && cloudTimestamp > 0) {
        console.log('DiscoveriesService: Detected potential sync conflict, using conflict resolution');
        return await this.handleSyncConflict(localPreferences, localMinRating, cloudData);
      }

      // Otherwise, use the newer preferences
      let finalPreferences, finalMinRating;

      if (cloudTimestamp > localTimestamp) {
        console.log('DiscoveriesService: Using cloud preferences (newer)');
        finalPreferences = cloudData.preferences;
        finalMinRating = cloudData.minRating;
      } else {
        console.log('DiscoveriesService: Using local preferences (newer or equal)');
        finalPreferences = localPreferences;
        finalMinRating = localMinRating;
      }

      // Save merged preferences locally
      await this._savePreferencesToStorage(finalPreferences);
      await this._saveMinRatingToStorage(finalMinRating);
      
      // Update local timestamp
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
        Math.max(localTimestamp, cloudTimestamp).toString()
      );

      return {
        preferences: finalPreferences,
        minRating: finalMinRating,
      };
    } catch (error) {
      console.error('DiscoveriesService: Error merging preferences:', error);
      
      // Return local preferences as fallback
      return {
        preferences: localPreferences,
        minRating: localMinRating,
      };
    }
  }

  /**
   * Debounced cloud sync to prevent excessive API calls
   * @param {Object} preferences - Preferences to sync
   * @param {number} minRating - Minimum rating to sync
   */
  _debouncedCloudSync(preferences, minRating) {
    // Clear existing timeout
    if (this.syncDebounceTimeout) {
      clearTimeout(this.syncDebounceTimeout);
    }

    // Set new timeout
    this.syncDebounceTimeout = setTimeout(async () => {
      try {
        await this.syncPreferencesToCloud(preferences, minRating);
      } catch (error) {
        console.error('DiscoveriesService: Debounced cloud sync failed:', error);
      }
    }, this.syncDebounceDelay);
  }

  /**
   * Handle offline scenarios by queuing changes for later sync
   * @param {string} changeType - Type of change ('preferences' or 'minRating')
   * @param {any} changeData - Data that changed
   */
  async _handleOfflineChange(changeType, changeData) {
    try {
      // Get existing pending changes
      const pendingChangesStr = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.PENDING_PREFERENCE_CHANGES
      );
      const pendingChanges = pendingChangesStr ? JSON.parse(pendingChangesStr) : [];

      // Add new change
      const change = {
        type: changeType,
        data: changeData,
        timestamp: Date.now(),
      };
      pendingChanges.push(change);

      // Save updated pending changes
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.PENDING_PREFERENCE_CHANGES,
        JSON.stringify(pendingChanges)
      );

      console.log(`DiscoveriesService: Queued offline change: ${changeType}`);
    } catch (error) {
      console.error('DiscoveriesService: Error handling offline change:', error);
    }
  }

  /**
   * Process pending changes when coming back online
   * @returns {Promise<boolean>} Success status
   */
  async processPendingChanges() {
    try {
      const pendingChangesStr = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.PENDING_PREFERENCE_CHANGES
      );
      
      if (!pendingChangesStr) {
        console.log('DiscoveriesService: No pending changes to process');
        return true;
      }

      const pendingChanges = JSON.parse(pendingChangesStr);
      if (pendingChanges.length === 0) {
        return true;
      }

      console.log(`DiscoveriesService: Processing ${pendingChanges.length} pending changes`);

      // Get current preferences to sync
      const currentPreferences = await this.getUserDiscoveryPreferences();
      const currentMinRating = await this.getMinRatingPreference();

      // Attempt to sync to cloud
      const syncSuccess = await this.syncPreferencesToCloud(currentPreferences, currentMinRating);

      if (syncSuccess) {
        // Clear pending changes on successful sync
        await AsyncStorage.removeItem(DISCOVERY_STORAGE_KEYS.PENDING_PREFERENCE_CHANGES);
        console.log('DiscoveriesService: Successfully processed all pending changes');
        return true;
      } else {
        console.log('DiscoveriesService: Failed to process pending changes, will retry later');
        return false;
      }
    } catch (error) {
      console.error('DiscoveriesService: Error processing pending changes:', error);
      return false;
    }
  }

  /**
   * Initialize preferences with cloud sync on app start
   * @returns {Promise<Object>} Initialized preferences
   */
  async initializePreferences() {
    try {
      console.log('DiscoveriesService: Initializing preferences with cloud sync');

      // Load local preferences first for immediate display
      const localPreferences = await this.getUserDiscoveryPreferences();
      const localMinRating = await this.getMinRatingPreference();

      // Try to load from cloud in background
      const cloudData = await this.loadPreferencesFromCloud();

      if (cloudData) {
        // Merge local and cloud preferences
        const merged = await this.mergePreferences(
          localPreferences,
          localMinRating,
          cloudData
        );

        // Update cache with merged data
        this.preferencesCache = merged.preferences;
        this.minRatingCache = merged.minRating;
        this.lastCacheUpdate = Date.now();

        return merged;
      } else {
        // No cloud data, sync local preferences to cloud
        await this._debouncedCloudSync(localPreferences, localMinRating);

        return {
          preferences: localPreferences,
          minRating: localMinRating,
        };
      }
    } catch (error) {
      console.error('DiscoveriesService: Error initializing preferences:', error);
      
      // Return local preferences as fallback
      const fallbackPreferences = await this.getUserDiscoveryPreferences();
      const fallbackMinRating = await this.getMinRatingPreference();
      
      return {
        preferences: fallbackPreferences,
        minRating: fallbackMinRating,
      };
    }
  }

  /**
   * Handle synchronization conflicts when both local and cloud have changes
   * @param {Object} localPreferences - Local preferences
   * @param {number} localMinRating - Local minimum rating
   * @param {Object} cloudData - Cloud preferences data
   * @returns {Promise<Object>} Resolved preferences
   */
  async handleSyncConflict(localPreferences, localMinRating, cloudData) {
    try {
      console.log('DiscoveriesService: Handling synchronization conflict');

      // Get timestamps for comparison
      const localLastUpdate = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE
      );
      const localTimestamp = localLastUpdate ? parseInt(localLastUpdate) : 0;
      const cloudTimestamp = cloudData.lastUpdated ? cloudData.lastUpdated.getTime() : 0;

      // If timestamps are very close (within 1 minute), merge the preferences
      const timeDifference = Math.abs(cloudTimestamp - localTimestamp);
      const oneMinute = 60 * 1000;

      if (timeDifference < oneMinute) {
        console.log('DiscoveriesService: Timestamps are close, merging preferences');
        
        // Merge preferences by taking the union of enabled place types
        const mergedPreferences = { ...localPreferences };
        Object.entries(cloudData.preferences).forEach(([key, value]) => {
          // If either local or cloud has it enabled, keep it enabled
          if (value === true || localPreferences[key] === true) {
            mergedPreferences[key] = true;
          }
        });

        // For minimum rating, take the higher value (more restrictive)
        const mergedMinRating = Math.max(localMinRating, cloudData.minRating);

        // Save merged preferences
        await this._savePreferencesToStorage(mergedPreferences);
        await this._saveMinRatingToStorage(mergedMinRating);

        // Update timestamp
        const mergedTimestamp = Math.max(localTimestamp, cloudTimestamp);
        await AsyncStorage.setItem(
          DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
          mergedTimestamp.toString()
        );

        // Sync merged preferences to cloud
        await this.syncPreferencesToCloud(mergedPreferences, mergedMinRating);

        console.log('DiscoveriesService: Successfully merged conflicting preferences');

        return {
          preferences: mergedPreferences,
          minRating: mergedMinRating,
        };
      } else {
        // Use the newer preferences based on timestamp
        if (cloudTimestamp > localTimestamp) {
          console.log('DiscoveriesService: Using cloud preferences (newer)');
          
          await this._savePreferencesToStorage(cloudData.preferences);
          await this._saveMinRatingToStorage(cloudData.minRating);
          await AsyncStorage.setItem(
            DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
            cloudTimestamp.toString()
          );

          return {
            preferences: cloudData.preferences,
            minRating: cloudData.minRating,
          };
        } else {
          console.log('DiscoveriesService: Using local preferences (newer)');
          
          // Sync local preferences to cloud
          await this.syncPreferencesToCloud(localPreferences, localMinRating);

          return {
            preferences: localPreferences,
            minRating: localMinRating,
          };
        }
      }
    } catch (error) {
      console.error('DiscoveriesService: Error handling sync conflict:', error);
      
      // Return local preferences as fallback
      return {
        preferences: localPreferences,
        minRating: localMinRating,
      };
    }
  }

  /**
   * Force sync preferences to cloud (useful for manual sync)
   * @returns {Promise<boolean>} Success status
   */
  async forceSyncToCloud() {
    try {
      console.log('DiscoveriesService: Force syncing preferences to cloud');

      const currentPreferences = await this.getUserDiscoveryPreferences();
      const currentMinRating = await this.getMinRatingPreference();

      const success = await this.syncPreferencesToCloud(currentPreferences, currentMinRating);

      if (success) {
        // Process any pending changes
        await this.processPendingChanges();
        console.log('DiscoveriesService: Force sync completed successfully');
      } else {
        console.log('DiscoveriesService: Force sync failed');
      }

      return success;
    } catch (error) {
      console.error('DiscoveriesService: Error during force sync:', error);
      return false;
    }
  }

  /**
   * Check sync status and last sync time
   * @returns {Promise<Object>} Sync status information
   */
  async getSyncStatus() {
    try {
      const syncStatus = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.PREFERENCES_SYNC_STATUS
      );
      const lastCloudSync = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.LAST_CLOUD_SYNC
      );
      const lastLocalUpdate = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE
      );
      const pendingChanges = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.PENDING_PREFERENCE_CHANGES
      );

      return {
        syncStatus: syncStatus || 'unknown',
        lastCloudSync: lastCloudSync ? parseInt(lastCloudSync) : null,
        lastLocalUpdate: lastLocalUpdate ? parseInt(lastLocalUpdate) : null,
        hasPendingChanges: pendingChanges ? JSON.parse(pendingChanges).length > 0 : false,
        isUserAuthenticated: !!getCurrentUser(),
      };
    } catch (error) {
      console.error('DiscoveriesService: Error getting sync status:', error);
      return {
        syncStatus: 'error',
        lastCloudSync: null,
        lastLocalUpdate: null,
        hasPendingChanges: false,
        isUserAuthenticated: false,
        error: error.message,
      };
    }
  }

  // Private helper methods

  /**
   * Check if the current cache is still valid
   * @returns {boolean} Whether cache is valid
   * @private
   */
  _isCacheValid() {
    if (!this.lastCacheUpdate) {
      return false;
    }
    
    const now = Date.now();
    return (now - this.lastCacheUpdate) < this.cacheExpiry;
  }

  /**
   * Save preferences to AsyncStorage with error handling
   * @param {Object} preferences - Preferences object to save
   * @returns {Promise<void>}
   * @private
   */
  async _savePreferencesToStorage(preferences) {
    try {
      // Validate preferences before saving
      if (!preferences || typeof preferences !== 'object') {
        throw new Error('Invalid preferences object');
      }

      const preferencesJson = JSON.stringify(preferences);
      
      // Check if JSON is too large (AsyncStorage has limits)
      if (preferencesJson.length > 1024 * 1024) { // 1MB limit
        console.warn('DiscoveriesService: Preferences data is very large, may cause storage issues');
      }

      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.PLACE_TYPE_PREFERENCES,
        preferencesJson
      );
      
      console.log('DiscoveriesService: Saved preferences to storage');
      
      // Update storage success timestamp
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.PREFERENCES_CACHE_TIMESTAMP,
        Date.now().toString()
      );
      
    } catch (error) {
      console.error('DiscoveriesService: Error saving preferences to storage:', error);
      
      // Try to save a minimal version if the full save failed
      if (error.message?.includes('quota') || error.message?.includes('storage')) {
        console.warn('DiscoveriesService: Storage quota exceeded, attempting to save minimal preferences');
        
        try {
          // Create a minimal version with only enabled preferences
          const minimalPreferences = {};
          Object.entries(preferences).forEach(([key, value]) => {
            if (value === true) {
              minimalPreferences[key] = true;
            }
          });
          
          await AsyncStorage.setItem(
            DISCOVERY_STORAGE_KEYS.PLACE_TYPE_PREFERENCES,
            JSON.stringify(minimalPreferences)
          );
          
          console.log('DiscoveriesService: Saved minimal preferences to storage');
        } catch (minimalError) {
          console.error('DiscoveriesService: Failed to save even minimal preferences:', minimalError);
          throw error; // Re-throw original error
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Save minimum rating to AsyncStorage with error handling
   * @param {number} minRating - Minimum rating to save
   * @returns {Promise<void>}
   * @private
   */
  async _saveMinRatingToStorage(minRating) {
    try {
      // Validate rating before saving
      if (typeof minRating !== 'number' || isNaN(minRating)) {
        throw new Error('Invalid minimum rating value');
      }

      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.MIN_RATING_PREFERENCE,
        minRating.toString()
      );
      
      console.log('DiscoveriesService: Saved minimum rating to storage');
      
      // Update storage success timestamp
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.PREFERENCES_CACHE_TIMESTAMP,
        Date.now().toString()
      );
      
    } catch (error) {
      console.error('DiscoveriesService: Error saving minimum rating to storage:', error);
      
      // For minimum rating, we can't really create a "minimal" version
      // so we just log the error and re-throw
      throw error;
    }
  }

  /**
   * Check storage health and available space
   * @returns {Promise<Object>} Storage health information
   * @private
   */
  async _checkStorageHealth() {
    try {
      // Try to write a small test value
      const testKey = `${DISCOVERY_STORAGE_KEYS.PLACE_TYPE_PREFERENCES}_test`;
      const testValue = JSON.stringify({ test: true });
      
      await AsyncStorage.setItem(testKey, testValue);
      await AsyncStorage.removeItem(testKey);
      
      // Get cache timestamp to check if storage is working
      const cacheTimestamp = await AsyncStorage.getItem(
        DISCOVERY_STORAGE_KEYS.PREFERENCES_CACHE_TIMESTAMP
      );
      
      return {
        healthy: true,
        lastSuccessfulWrite: cacheTimestamp ? parseInt(cacheTimestamp) : null,
        canWrite: true,
      };
    } catch (error) {
      console.error('DiscoveriesService: Storage health check failed:', error);
      
      return {
        healthy: false,
        lastSuccessfulWrite: null,
        canWrite: false,
        error: error.message,
      };
    }
  }

  /**
   * Get ping discoveries with user preferences applied
   * This method is designed to be used by the PingService when it's implemented
   * @param {Object} location - Current location {latitude, longitude}
   * @param {Object} options - Optional parameters
   * @param {Object} options.preferences - User preferences (will load if not provided)
   * @param {number} options.minRating - Minimum rating (will load if not provided)
   * @param {number} options.radius - Search radius in meters (default: 1000)
   * @param {number} options.maxResults - Maximum number of results (default: 10)
   * @returns {Promise<Array>} Array of nearby places filtered by preferences
   */
  async getPingDiscoveries(location, options = {}) {
    try {
      // Validate location
      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        throw new Error('Invalid location: must have valid latitude and longitude');
      }

      console.log(`DiscoveriesService: Getting ping discoveries for location (${location.latitude}, ${location.longitude})`);

      // Load preferences if not provided
      const preferences = options.preferences || await this.getUserDiscoveryPreferences();
      const minRating = options.minRating !== undefined ? options.minRating : await this.getMinRatingPreference();
      const radius = options.radius || 1000; // Default 1km radius
      const maxResults = options.maxResults || 10;

      // TODO: When PingService is implemented, it should call this method
      // For now, return empty array as placeholder
      console.log('DiscoveriesService: PingService not yet implemented - returning empty results');
      
      // This is where the actual ping discovery logic would go:
      // 1. Use Google Places Nearby Search API
      // 2. Apply user preferences for place types
      // 3. Apply minimum rating filter
      // 4. Return filtered results
      
      // Placeholder implementation - return empty array
      const pingResults = [];

      // Apply preference filtering (defensive filtering)
      const filteredResults = await this.filterPlacesByPreferences(pingResults, preferences, minRating);

      console.log(`DiscoveriesService: Ping discoveries completed - ${filteredResults.length} places found`);

      return filteredResults;
    } catch (error) {
      console.error('DiscoveriesService: Error getting ping discoveries:', error);
      
      // Return empty array as fallback to prevent app crashes
      return [];
    }
  }

  /**
   * Apply real-time preference updates to ping discoveries
   * This method ensures that preference changes are immediately reflected in ping results
   * @param {Array} existingPingResults - Current ping results
   * @param {Object} updatedPreferences - Updated user preferences
   * @param {number} updatedMinRating - Updated minimum rating
   * @returns {Promise<Array>} Re-filtered ping results
   */
  async applyPreferenceUpdatesToPingResults(existingPingResults, updatedPreferences = null, updatedMinRating = null) {
    try {
      if (!Array.isArray(existingPingResults)) {
        console.warn('DiscoveriesService: Invalid ping results provided for preference update');
        return [];
      }

      console.log(`DiscoveriesService: Applying preference updates to ${existingPingResults.length} ping results`);

      // Load current preferences if not provided
      const preferences = updatedPreferences || await this.getUserDiscoveryPreferences();
      const minRating = updatedMinRating !== null ? updatedMinRating : await this.getMinRatingPreference();

      // Re-filter existing results with updated preferences
      const reFilteredResults = await this.filterPlacesByPreferences(existingPingResults, preferences, minRating);

      console.log(`DiscoveriesService: Preference updates applied - ${reFilteredResults.length} places remain after filtering`);

      return reFilteredResults;
    } catch (error) {
      console.error('DiscoveriesService: Error applying preference updates to ping results:', error);
      
      // Return original results as fallback
      return existingPingResults || [];
    }
  }

  /**
   * Get manual search results with user preferences applied
   * This method is designed to be used by manual search features when they're implemented
   * @param {string} query - Search query string
   * @param {Object} location - Search location {latitude, longitude}
   * @param {Object} options - Optional parameters
   * @param {Object} options.preferences - User preferences (will load if not provided)
   * @param {number} options.minRating - Minimum rating (will load if not provided)
   * @param {number} options.radius - Search radius in meters (default: 5000)
   * @param {number} options.maxResults - Maximum number of results (default: 20)
   * @returns {Promise<Array>} Array of search results filtered by preferences
   */
  async getManualSearchResults(query, location, options = {}) {
    try {
      // Validate inputs
      if (!query || typeof query !== 'string' || query.trim() === '') {
        throw new Error('Invalid query: must be a non-empty string');
      }

      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        throw new Error('Invalid location: must have valid latitude and longitude');
      }

      console.log(`DiscoveriesService: Getting manual search results for query "${query}" at location (${location.latitude}, ${location.longitude})`);

      // Load preferences if not provided
      const preferences = options.preferences || await this.getUserDiscoveryPreferences();
      const minRating = options.minRating !== undefined ? options.minRating : await this.getMinRatingPreference();
      const radius = options.radius || 5000; // Default 5km radius
      const maxResults = options.maxResults || 20;

      // TODO: When manual search features are implemented, they should call this method
      // For now, return empty array as placeholder
      console.log('DiscoveriesService: Manual search features not yet implemented - returning empty results');
      
      // This is where the actual manual search logic would go:
      // 1. Use Google Places Text Search API or Nearby Search API
      // 2. Apply user preferences for place types
      // 3. Apply minimum rating filter
      // 4. Return filtered results
      
      // Placeholder implementation - return empty array
      const searchResults = [];

      // Apply preference filtering (defensive filtering)
      const filteredResults = await this.filterPlacesByPreferences(searchResults, preferences, minRating);

      console.log(`DiscoveriesService: Manual search completed - ${filteredResults.length} places found`);

      return filteredResults;
    } catch (error) {
      console.error('DiscoveriesService: Error getting manual search results:', error);
      
      // Return empty array as fallback to prevent app crashes
      return [];
    }
  }

  /**
   * Apply consistent filtering across all discovery methods
   * This method ensures that all discovery features (SAR, Ping, Manual Search) use the same filtering logic
   * @param {Array} places - Array of places from any discovery method
   * @param {Object} options - Optional parameters
   * @param {Object} options.preferences - User preferences (will load if not provided)
   * @param {number} options.minRating - Minimum rating (will load if not provided)
   * @param {string} options.source - Source of the places (for logging)
   * @returns {Promise<Array>} Consistently filtered places
   */
  async applyConsistentFiltering(places, options = {}) {
    try {
      if (!Array.isArray(places)) {
        console.warn('DiscoveriesService: Invalid places array provided for consistent filtering');
        return [];
      }

      const source = options.source || 'unknown';
      console.log(`DiscoveriesService: Applying consistent filtering to ${places.length} places from ${source}`);

      // Load preferences if not provided
      const preferences = options.preferences || await this.getUserDiscoveryPreferences();
      const minRating = options.minRating !== undefined ? options.minRating : await this.getMinRatingPreference();

      // Apply the same filtering logic used throughout the service
      const filteredPlaces = await this.filterPlacesByPreferences(places, preferences, minRating);

      console.log(`DiscoveriesService: Consistent filtering applied to ${source} - ${filteredPlaces.length} places remain`);

      return filteredPlaces;
    } catch (error) {
      console.error('DiscoveriesService: Error applying consistent filtering:', error);
      
      // Return original places as fallback
      return places || [];
    }
  }
}

// Export singleton instance
const discoveriesService = new DiscoveriesService();
export default discoveriesService;