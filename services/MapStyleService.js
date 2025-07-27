import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAP_STYLES, getMapStyleConfig, getMapStyleFallback, isMapStyleSupported } from '../utils/mapProvider';

/**
 * MapStyleService
 * 
 * Handles map style persistence and management.
 * Provides functionality to save, load, and manage user's map style preferences.
 * 
 * Requirements addressed:
 * - 4.4: Remember previously selected map style when user reopens the app
 * - 4.1, 4.2, 4.3: Map style options and immediate application
 */

const STORAGE_KEY = 'map_style_preference';

class MapStyleService {
  /**
   * Save user's map style preference
   * 
   * @param {string} style - The map style to save
   * @returns {Promise<boolean>} Success status
   */
  static async saveMapStyle(style) {
    try {
      // Validate the style
      if (!Object.values(MAP_STYLES).includes(style)) {
        console.warn(`Invalid map style: ${style}, falling back to standard`);
        style = MAP_STYLES.STANDARD;
      }

      // Check if style is supported on current platform
      if (!isMapStyleSupported(style)) {
        const fallback = getMapStyleFallback(style);
        console.warn(`Map style ${style} not supported on this platform, using ${fallback}`);
        style = fallback;
      }

      await AsyncStorage.setItem(STORAGE_KEY, style);
      console.log(`Map style saved: ${style}`);
      return true;
    } catch (error) {
      console.error('Error saving map style:', error);
      return false;
    }
  }

  /**
   * Load user's saved map style preference
   * 
   * @returns {Promise<string>} The saved map style or default
   */
  static async loadMapStyle() {
    try {
      const savedStyle = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (savedStyle && Object.values(MAP_STYLES).includes(savedStyle)) {
        // Check if the saved style is still supported
        if (isMapStyleSupported(savedStyle)) {
          console.log(`Loaded map style: ${savedStyle}`);
          return savedStyle;
        } else {
          // Style no longer supported, use fallback
          const fallback = getMapStyleFallback(savedStyle);
          console.warn(`Saved style ${savedStyle} no longer supported, using ${fallback}`);
          
          // Update storage with fallback
          await this.saveMapStyle(fallback);
          return fallback;
        }
      }

      // No saved style or invalid style, return default
      console.log('No saved map style found, using default');
      return MAP_STYLES.STANDARD;
    } catch (error) {
      console.error('Error loading map style:', error);
      return MAP_STYLES.STANDARD;
    }
  }

  /**
   * Get the current map style configuration with theme integration
   * 
   * @param {string} style - The map style
   * @param {string} theme - The app theme
   * @returns {object} Complete style configuration
   */
  static getStyleConfig(style, theme) {
    return getMapStyleConfig(style, theme);
  }

  /**
   * Clear saved map style preference
   * 
   * @returns {Promise<boolean>} Success status
   */
  static async clearMapStyle() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('Map style preference cleared');
      return true;
    } catch (error) {
      console.error('Error clearing map style:', error);
      return false;
    }
  }

  /**
   * Check if a specific style is currently saved
   * 
   * @param {string} style - The style to check
   * @returns {Promise<boolean>} Whether the style is currently saved
   */
  static async isStyleSaved(style) {
    try {
      const savedStyle = await this.loadMapStyle();
      return savedStyle === style;
    } catch (error) {
      console.error('Error checking saved style:', error);
      return false;
    }
  }

  /**
   * Get style configuration with automatic theme detection
   * This method integrates with the app's theme system
   * 
   * @param {string} style - The map style
   * @param {object} themeContext - The theme context object
   * @returns {object} Style configuration with theme colors
   */
  static getThemeAwareStyleConfig(style, themeContext) {
    const themeName = themeContext?.currentTheme === 'system' 
      ? (themeContext?.theme?.dark ? 'dark' : 'light')
      : themeContext?.currentTheme || 'light';

    return this.getStyleConfig(style, themeName);
  }

  /**
   * Migrate old map style preferences (for future use)
   * 
   * @returns {Promise<boolean>} Migration success status
   */
  static async migrateMapStylePreferences() {
    try {
      // Check for old storage keys and migrate if needed
      const oldKeys = ['mapStyle', 'map_style', 'userMapStyle'];
      
      for (const oldKey of oldKeys) {
        const oldValue = await AsyncStorage.getItem(oldKey);
        if (oldValue && Object.values(MAP_STYLES).includes(oldValue)) {
          await this.saveMapStyle(oldValue);
          await AsyncStorage.removeItem(oldKey);
          console.log(`Migrated map style from ${oldKey}: ${oldValue}`);
          return true;
        }
      }

      return true;
    } catch (error) {
      console.error('Error migrating map style preferences:', error);
      return false;
    }
  }
}

export default MapStyleService;