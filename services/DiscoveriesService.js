/**
 * Discoveries Service
 * 
 * This service manages discovery preferences and provides functionality for
 * storing, retrieving, and applying user preferences for place discovery.
 * It handles both local storage (AsyncStorage) and cloud synchronization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
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
      
      // Save to storage
      await this._savePreferencesToStorage(defaultPreferences);
      await this._saveMinRatingToStorage(defaultMinRating);
      
      // Update cache
      this.preferencesCache = defaultPreferences;
      this.minRatingCache = defaultMinRating;
      this.lastCacheUpdate = Date.now();
      
      // Update last update timestamp
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
        Date.now().toString()
      );
      
      console.log('DiscoveriesService: Successfully reset preferences to defaults');
      
      return defaultPreferences;
    } catch (error) {
      console.error('DiscoveriesService: Error resetting discovery preferences:', error);
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
      
      // Save to storage
      await this._savePreferencesToStorage(updatedPreferences);
      
      // Update cache
      this.preferencesCache = updatedPreferences;
      this.lastCacheUpdate = Date.now();
      
      // Update last update timestamp
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
        Date.now().toString()
      );
      
      console.log(`DiscoveriesService: Successfully updated ${placeTypeKey} preference`);
      
      return updatedPreferences;
    } catch (error) {
      console.error('DiscoveriesService: Error updating place type preference:', error);
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
      
      // Save to storage
      await this._saveMinRatingToStorage(minRating);
      
      // Update cache
      this.minRatingCache = minRating;
      this.lastCacheUpdate = Date.now();
      
      // Update last update timestamp
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.LAST_PREFERENCES_UPDATE,
        Date.now().toString()
      );
      
      console.log('DiscoveriesService: Successfully updated minimum rating preference');
      
      return minRating;
    } catch (error) {
      console.error('DiscoveriesService: Error updating minimum rating preference:', error);
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
      // Load preferences if not provided
      if (!preferences) {
        preferences = await this.getUserDiscoveryPreferences();
      }
      
      if (minRating === null) {
        minRating = await this.getMinRatingPreference();
      }
      
      console.log(`DiscoveriesService: Filtering ${places.length} places with preferences`);
      
      const filteredPlaces = places.filter(place => {
        // Check place type preference
        const placeTypes = place.types || [];
        const hasEnabledType = placeTypes.some(type => preferences[type] === true);
        
        if (!hasEnabledType) {
          return false;
        }
        
        // Check minimum rating
        const placeRating = place.rating || 0;
        if (placeRating < minRating) {
          return false;
        }
        
        return true;
      });
      
      console.log(`DiscoveriesService: Filtered to ${filteredPlaces.length} places`);
      
      return filteredPlaces;
    } catch (error) {
      console.error('DiscoveriesService: Error filtering places by preferences:', error);
      // Return original places as fallback
      return places;
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
   * Save preferences to AsyncStorage
   * @param {Object} preferences - Preferences object to save
   * @returns {Promise<void>}
   * @private
   */
  async _savePreferencesToStorage(preferences) {
    try {
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.PLACE_TYPE_PREFERENCES,
        JSON.stringify(preferences)
      );
      console.log('DiscoveriesService: Saved preferences to storage');
    } catch (error) {
      console.error('DiscoveriesService: Error saving preferences to storage:', error);
      throw error;
    }
  }

  /**
   * Save minimum rating to AsyncStorage
   * @param {number} minRating - Minimum rating to save
   * @returns {Promise<void>}
   * @private
   */
  async _saveMinRatingToStorage(minRating) {
    try {
      await AsyncStorage.setItem(
        DISCOVERY_STORAGE_KEYS.MIN_RATING_PREFERENCE,
        minRating.toString()
      );
      console.log('DiscoveriesService: Saved minimum rating to storage');
    } catch (error) {
      console.error('DiscoveriesService: Error saving minimum rating to storage:', error);
      throw error;
    }
  }
}

// Export singleton instance
const discoveriesService = new DiscoveriesService();
export default discoveriesService;