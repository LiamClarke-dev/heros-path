import { Platform } from 'react-native';

/**
 * Map Provider Selection Utility
 * 
 * Determines the appropriate map provider based on platform and style preferences.
 * This utility handles the platform-specific logic for iOS and Android map providers.
 * 
 * Based on design document requirements:
 * - iOS: Uses AppleMaps component from expo-maps
 * - Android: Uses GoogleMaps component from expo-maps
 * - Platform-specific provider logic handled automatically by expo-maps
 */

/**
 * Available map providers
 */
export const MAP_PROVIDERS = {
  APPLE: 'apple',
  GOOGLE: 'google'
};

/**
 * Available map styles
 */
export const MAP_STYLES = {
  STANDARD: 'standard',
  SATELLITE: 'satellite',
  TERRAIN: 'terrain',
  NIGHT: 'night',
  ADVENTURE: 'adventure'
};

/**
 * Determines the appropriate map provider based on platform and style
 * 
 * @param {string} style - The requested map style
 * @returns {object} Provider configuration object
 */
export function getMapProvider(style = MAP_STYLES.STANDARD) {
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  // Platform-specific provider selection
  if (isIOS) {
    return {
      provider: MAP_PROVIDERS.APPLE,
      component: 'AppleMaps',
      platform: 'ios',
      supportsStyle: style !== MAP_STYLES.TERRAIN, // Apple Maps doesn't support terrain
      fallbackStyle: style === MAP_STYLES.TERRAIN ? MAP_STYLES.SATELLITE : style
    };
  }

  if (isAndroid) {
    return {
      provider: MAP_PROVIDERS.GOOGLE,
      component: 'GoogleMaps',
      platform: 'android',
      supportsStyle: true, // Google Maps supports all styles
      fallbackStyle: style
    };
  }

  // Web fallback (for development)
  return {
    provider: MAP_PROVIDERS.GOOGLE,
    component: 'GoogleMaps',
    platform: 'web',
    supportsStyle: true,
    fallbackStyle: style
  };
}

/**
 * Gets the appropriate map component based on platform
 * 
 * @returns {string} Component name to use
 */
export function getMapComponent() {
  const provider = getMapProvider();
  return provider.component;
}

/**
 * Validates if a style is supported on the current platform
 * 
 * @param {string} style - The style to validate
 * @returns {boolean} Whether the style is supported
 */
export function isStyleSupported(style) {
  const provider = getMapProvider(style);
  return provider.supportsStyle;
}

/**
 * Gets the fallback style for unsupported styles
 * 
 * @param {string} style - The requested style
 * @returns {string} The fallback style to use
 */
export function getFallbackStyle(style) {
  const provider = getMapProvider(style);
  return provider.fallbackStyle;
}

/**
 * Platform-specific map configuration
 */
export const MAP_CONFIG = {
  ios: {
    showsUserLocation: true,
    showsMyLocationButton: false, // We'll implement custom locate button
    followsUserLocation: false,
    showsCompass: true,
    showsScale: false,
    rotateEnabled: true,
    scrollEnabled: true,
    zoomEnabled: true,
    pitchEnabled: true
  },
  android: {
    showsUserLocation: true,
    showsMyLocationButton: false, // We'll implement custom locate button
    followsUserLocation: false,
    showsCompass: true,
    showsScale: false,
    rotateEnabled: true,
    scrollEnabled: true,
    zoomEnabled: true,
    pitchEnabled: true
  }
};

/**
 * Gets platform-specific map configuration
 * 
 * @returns {object} Platform-specific configuration
 */
export function getMapConfig() {
  const platform = Platform.OS;
  return MAP_CONFIG[platform] || MAP_CONFIG.android;
}