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
 * Map style definitions with theme-aware styling
 * Each style includes configuration for both iOS and Android platforms
 */
export const MAP_STYLE_DEFINITIONS = {
  [MAP_STYLES.STANDARD]: {
    name: 'Standard',
    description: 'Default map style with clear roads and landmarks',
    preview: 'standard-preview.png',
    ios: {
      mapType: 'standard',
      customStyle: null
    },
    android: {
      mapType: 'standard',
      customStyle: null
    },
    themes: {
      light: {
        polylineColor: '#00FF88',
        savedRouteColor: '#4A90E2',
        markerTint: '#4A90E2'
      },
      dark: {
        polylineColor: '#60D888',
        savedRouteColor: '#5AA3F0',
        markerTint: '#5AA3F0'
      },
      adventure: {
        polylineColor: '#32CD32',
        savedRouteColor: '#228B22',
        markerTint: '#8B4513'
      }
    }
  },
  [MAP_STYLES.SATELLITE]: {
    name: 'Satellite',
    description: 'Satellite imagery with roads and labels',
    preview: 'satellite-preview.png',
    ios: {
      mapType: 'satellite',
      customStyle: null
    },
    android: {
      mapType: 'satellite',
      customStyle: null
    },
    themes: {
      light: {
        polylineColor: '#00FF88',
        savedRouteColor: '#FFFFFF',
        markerTint: '#FFFFFF'
      },
      dark: {
        polylineColor: '#60D888',
        savedRouteColor: '#FFFFFF',
        markerTint: '#FFFFFF'
      },
      adventure: {
        polylineColor: '#32CD32',
        savedRouteColor: '#F5DEB3',
        markerTint: '#F5DEB3'
      }
    }
  },
  [MAP_STYLES.TERRAIN]: {
    name: 'Terrain',
    description: 'Topographic map showing elevation and terrain features',
    preview: 'terrain-preview.png',
    ios: {
      mapType: 'satellite', // Fallback for iOS
      customStyle: null
    },
    android: {
      mapType: 'terrain',
      customStyle: null
    },
    themes: {
      light: {
        polylineColor: '#00FF88',
        savedRouteColor: '#8B4513',
        markerTint: '#8B4513'
      },
      dark: {
        polylineColor: '#60D888',
        savedRouteColor: '#DEB887',
        markerTint: '#DEB887'
      },
      adventure: {
        polylineColor: '#32CD32',
        savedRouteColor: '#228B22',
        markerTint: '#8B4513'
      }
    }
  },
  [MAP_STYLES.NIGHT]: {
    name: 'Night',
    description: 'Dark theme optimized for low-light conditions',
    preview: 'night-preview.png',
    ios: {
      mapType: 'standard',
      customStyle: [
        {
          featureType: 'all',
          stylers: [{ invert_lightness: true }]
        },
        {
          featureType: 'water',
          stylers: [{ color: '#1a1a2e' }]
        },
        {
          featureType: 'landscape',
          stylers: [{ color: '#16213e' }]
        },
        {
          featureType: 'road',
          stylers: [{ color: '#0f3460' }]
        }
      ]
    },
    android: {
      mapType: 'standard',
      customStyle: [
        {
          featureType: 'all',
          stylers: [{ invert_lightness: true }]
        },
        {
          featureType: 'water',
          stylers: [{ color: '#1a1a2e' }]
        },
        {
          featureType: 'landscape',
          stylers: [{ color: '#16213e' }]
        },
        {
          featureType: 'road',
          stylers: [{ color: '#0f3460' }]
        }
      ]
    },
    themes: {
      light: {
        polylineColor: '#60D888',
        savedRouteColor: '#5AA3F0',
        markerTint: '#5AA3F0'
      },
      dark: {
        polylineColor: '#60D888',
        savedRouteColor: '#5AA3F0',
        markerTint: '#5AA3F0'
      },
      adventure: {
        polylineColor: '#32CD32',
        savedRouteColor: '#228B22',
        markerTint: '#DEB887'
      }
    }
  },
  [MAP_STYLES.ADVENTURE]: {
    name: 'Adventure',
    description: 'Fantasy-themed map style for the ultimate adventure experience',
    preview: 'adventure-preview.png',
    ios: {
      mapType: 'standard',
      customStyle: [
        {
          featureType: 'water',
          stylers: [{ color: '#2F4F4F' }]
        },
        {
          featureType: 'landscape',
          stylers: [{ color: '#3C5C3C' }]
        },
        {
          featureType: 'road',
          stylers: [{ color: '#8B4513' }]
        },
        {
          featureType: 'poi',
          stylers: [{ color: '#556B2F' }]
        }
      ]
    },
    android: {
      mapType: 'standard',
      customStyle: [
        {
          featureType: 'water',
          stylers: [{ color: '#2F4F4F' }]
        },
        {
          featureType: 'landscape',
          stylers: [{ color: '#3C5C3C' }]
        },
        {
          featureType: 'road',
          stylers: [{ color: '#8B4513' }]
        },
        {
          featureType: 'poi',
          stylers: [{ color: '#556B2F' }]
        }
      ]
    },
    themes: {
      light: {
        polylineColor: '#32CD32',
        savedRouteColor: '#228B22',
        markerTint: '#8B4513'
      },
      dark: {
        polylineColor: '#32CD32',
        savedRouteColor: '#228B22',
        markerTint: '#DEB887'
      },
      adventure: {
        polylineColor: '#32CD32',
        savedRouteColor: '#228B22',
        markerTint: '#8B4513'
      }
    }
  }
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

/**
 * Gets the map style configuration for a specific style and theme
 * 
 * @param {string} style - The map style (e.g., 'standard', 'satellite')
 * @param {string} theme - The app theme (e.g., 'light', 'dark', 'adventure')
 * @returns {object} Style configuration object
 */
export function getMapStyleConfig(style = MAP_STYLES.STANDARD, theme = 'light') {
  const styleDefinition = MAP_STYLE_DEFINITIONS[style];
  if (!styleDefinition) {
    console.warn(`Unknown map style: ${style}, falling back to standard`);
    return getMapStyleConfig(MAP_STYLES.STANDARD, theme);
  }

  const platform = Platform.OS;
  const platformConfig = styleDefinition[platform] || styleDefinition.android;
  const themeColors = styleDefinition.themes[theme] || styleDefinition.themes.light;

  return {
    ...styleDefinition,
    mapType: platformConfig.mapType,
    customStyle: platformConfig.customStyle,
    colors: themeColors,
    platform
  };
}

/**
 * Gets all available map styles with their metadata
 * 
 * @returns {Array} Array of map style objects
 */
export function getAvailableMapStyles() {
  return Object.keys(MAP_STYLE_DEFINITIONS).map(styleKey => ({
    key: styleKey,
    ...MAP_STYLE_DEFINITIONS[styleKey]
  }));
}

/**
 * Checks if a map style is supported on the current platform
 * 
 * @param {string} style - The map style to check
 * @returns {boolean} Whether the style is supported
 */
export function isMapStyleSupported(style) {
  const styleDefinition = MAP_STYLE_DEFINITIONS[style];
  if (!styleDefinition) return false;

  const platform = Platform.OS;
  
  // Special case for terrain on iOS (not natively supported)
  if (platform === 'ios' && style === MAP_STYLES.TERRAIN) {
    return false; // Will fallback to satellite
  }

  return true;
}

/**
 * Gets the appropriate fallback style for unsupported styles
 * 
 * @param {string} style - The requested style
 * @returns {string} The fallback style
 */
export function getMapStyleFallback(style) {
  const platform = Platform.OS;
  
  // iOS terrain fallback
  if (platform === 'ios' && style === MAP_STYLES.TERRAIN) {
    return MAP_STYLES.SATELLITE;
  }

  // Default fallback
  if (!MAP_STYLE_DEFINITIONS[style]) {
    return MAP_STYLES.STANDARD;
  }

  return style;
}