/**
 * Deep Link Configuration
 * Provides comprehensive deep linking setup with route mapping, parameter parsing, and validation
 */

import { Linking } from 'react-native';

/**
 * URL schemes and prefixes for deep linking
 */
export const DEEP_LINK_PREFIXES = [
  'com.liamclarke.herospath://',
  'https://herospath.app',
  'https://www.herospath.app',
];

/**
 * Route configuration for deep linking
 * Maps URL paths to navigation screens with parameter support
 */
export const DEEP_LINK_CONFIG = {
  screens: {
    Main: {
      screens: {
        CoreFeatures: {
          screens: {
            Map: {
              path: 'map',
              screens: {
                MapScreen: 'map',
                JourneyDetails: 'map/journey/:journeyId',
                PlaceDetails: 'map/place/:placeId',
              },
            },
            Journeys: {
              path: 'journeys',
              screens: {
                JourneysList: 'journeys',
                JourneyDetails: 'journeys/:journeyId',
                JourneyEdit: 'journeys/:journeyId/edit',
              },
            },
            Discoveries: {
              path: 'discoveries',
              screens: {
                DiscoveriesList: 'discoveries',
                DiscoveryDetails: 'discoveries/:discoveryId',
                DiscoveryPreferences: 'discoveries/preferences',
              },
            },
            SavedPlaces: {
              path: 'saved-places',
              screens: {
                SavedPlacesList: 'saved-places',
                SavedPlaceDetails: 'saved-places/:placeId',
                SavedPlaceEdit: 'saved-places/:placeId/edit',
              },
            },
          },
        },
        Social: {
          path: 'social',
          screens: {
            SocialFeed: 'social',
            ShareJourney: 'social/share/:journeyId',
            UserProfile: 'social/profile/:userId',
          },
        },
        Settings: {
          path: 'settings',
          screens: {
            SettingsMain: 'settings',
            Profile: 'settings/profile',
            Privacy: 'settings/privacy',
            Notifications: 'settings/notifications',
            About: 'settings/about',
          },
        },
      },
    },
    Auth: {
      screens: {
        Login: 'login',
        Signup: 'signup',
        ForgotPassword: 'forgot-password',
        ResetPassword: 'reset-password/:token',
      },
    },
  },
};

/**
 * Route definitions with metadata for validation and processing
 */
export const ROUTE_DEFINITIONS = {
  // Map routes
  'map': {
    screen: 'Map',
    requiresAuth: false,
    params: [],
  },
  'map/journey/:journeyId': {
    screen: 'JourneyDetails',
    requiresAuth: true,
    params: ['journeyId'],
    validation: {
      journeyId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
  'map/place/:placeId': {
    screen: 'PlaceDetails',
    requiresAuth: false,
    params: ['placeId'],
    validation: {
      placeId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
  
  // Journey routes
  'journeys': {
    screen: 'Journeys',
    requiresAuth: true,
    params: [],
  },
  'journeys/:journeyId': {
    screen: 'JourneyDetails',
    requiresAuth: true,
    params: ['journeyId'],
    validation: {
      journeyId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
  'journeys/:journeyId/edit': {
    screen: 'JourneyEdit',
    requiresAuth: true,
    params: ['journeyId'],
    validation: {
      journeyId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
  
  // Discovery routes
  'discoveries': {
    screen: 'Discoveries',
    requiresAuth: true,
    params: [],
  },
  'discoveries/:discoveryId': {
    screen: 'DiscoveryDetails',
    requiresAuth: true,
    params: ['discoveryId'],
    validation: {
      discoveryId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
  'discoveries/preferences': {
    screen: 'DiscoveryPreferences',
    requiresAuth: true,
    params: [],
  },
  
  // Saved Places routes
  'saved-places': {
    screen: 'SavedPlaces',
    requiresAuth: true,
    params: [],
  },
  'saved-places/:placeId': {
    screen: 'SavedPlaceDetails',
    requiresAuth: true,
    params: ['placeId'],
    validation: {
      placeId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
  'saved-places/:placeId/edit': {
    screen: 'SavedPlaceEdit',
    requiresAuth: true,
    params: ['placeId'],
    validation: {
      placeId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
  
  // Social routes
  'social': {
    screen: 'Social',
    requiresAuth: true,
    params: [],
  },
  'social/share/:journeyId': {
    screen: 'ShareJourney',
    requiresAuth: true,
    params: ['journeyId'],
    validation: {
      journeyId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
  'social/profile/:userId': {
    screen: 'UserProfile',
    requiresAuth: true,
    params: ['userId'],
    validation: {
      userId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
  
  // Settings routes
  'settings': {
    screen: 'Settings',
    requiresAuth: true,
    params: [],
  },
  'settings/profile': {
    screen: 'Profile',
    requiresAuth: true,
    params: [],
  },
  'settings/privacy': {
    screen: 'Privacy',
    requiresAuth: true,
    params: [],
  },
  'settings/notifications': {
    screen: 'Notifications',
    requiresAuth: true,
    params: [],
  },
  'settings/about': {
    screen: 'About',
    requiresAuth: false,
    params: [],
  },
  
  // Auth routes
  'login': {
    screen: 'Login',
    requiresAuth: false,
    params: [],
  },
  'signup': {
    screen: 'Signup',
    requiresAuth: false,
    params: [],
  },
  'forgot-password': {
    screen: 'ForgotPassword',
    requiresAuth: false,
    params: [],
  },
  'reset-password/:token': {
    screen: 'ResetPassword',
    requiresAuth: false,
    params: ['token'],
    validation: {
      token: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
};

/**
 * Parse URL path and extract route information
 * @param {string} url - The deep link URL
 * @returns {Object} Parsed route information
 */
export function parseDeepLink(url) {
  try {
    // Remove prefix to get the path
    let path = url;
    for (const prefix of DEEP_LINK_PREFIXES) {
      if (url.startsWith(prefix)) {
        path = url.replace(prefix, '');
        break;
      }
    }
    
    // Remove leading slash if present
    path = path.replace(/^\//, '');
    
    // Find matching route definition
    const routeDefinition = findMatchingRoute(path);
    if (!routeDefinition) {
      return {
        isValid: false,
        error: 'Route not found',
        path,
      };
    }
    
    // Extract parameters
    const params = extractParameters(path, routeDefinition.route);
    
    // Validate parameters
    const validationResult = validateParameters(params, routeDefinition.definition);
    if (!validationResult.isValid) {
      return {
        isValid: false,
        error: validationResult.error,
        path,
        params,
      };
    }
    
    return {
      isValid: true,
      path,
      route: routeDefinition.route,
      screen: routeDefinition.definition.screen,
      params,
      requiresAuth: routeDefinition.definition.requiresAuth,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      path: url,
    };
  }
}

/**
 * Find matching route definition for a given path
 * @param {string} path - The URL path
 * @returns {Object|null} Matching route definition
 */
function findMatchingRoute(path) {
  for (const [route, definition] of Object.entries(ROUTE_DEFINITIONS)) {
    if (matchesRoute(path, route)) {
      return { route, definition };
    }
  }
  return null;
}

/**
 * Check if a path matches a route pattern
 * @param {string} path - The URL path
 * @param {string} route - The route pattern
 * @returns {boolean} Whether the path matches the route
 */
function matchesRoute(path, route) {
  // Convert route pattern to regex
  const routeRegex = route
    .replace(/:[^/]+/g, '([^/]+)') // Replace :param with capture group
    .replace(/\//g, '\\/'); // Escape forward slashes
  
  const regex = new RegExp(`^${routeRegex}$`);
  return regex.test(path);
}

/**
 * Extract parameters from a path using a route pattern
 * @param {string} path - The URL path
 * @param {string} route - The route pattern
 * @returns {Object} Extracted parameters
 */
function extractParameters(path, route) {
  const params = {};
  
  // Get parameter names from route
  const paramNames = route.match(/:([^/]+)/g)?.map(param => param.slice(1)) || [];
  
  if (paramNames.length === 0) {
    return params;
  }
  
  // Convert route pattern to regex with capture groups
  const routeRegex = route
    .replace(/:[^/]+/g, '([^/]+)')
    .replace(/\//g, '\\/');
  
  const regex = new RegExp(`^${routeRegex}$`);
  const matches = path.match(regex);
  
  if (matches) {
    paramNames.forEach((paramName, index) => {
      params[paramName] = decodeURIComponent(matches[index + 1]);
    });
  }
  
  return params;
}

/**
 * Validate parameters against route definition
 * @param {Object} params - Extracted parameters
 * @param {Object} definition - Route definition
 * @returns {Object} Validation result
 */
function validateParameters(params, definition) {
  if (!definition.validation) {
    return { isValid: true };
  }
  
  for (const [paramName, validator] of Object.entries(definition.validation)) {
    const paramValue = params[paramName];
    
    if (paramValue === undefined) {
      return {
        isValid: false,
        error: `Missing required parameter: ${paramName}`,
      };
    }
    
    if (!validator(paramValue)) {
      return {
        isValid: false,
        error: `Invalid parameter value for ${paramName}: ${paramValue}`,
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Generate a deep link URL for a given route and parameters
 * @param {string} route - The route pattern
 * @param {Object} params - Route parameters
 * @param {string} prefix - URL prefix to use (default: custom scheme)
 * @returns {string} Generated deep link URL
 */
export function generateDeepLink(route, params = {}, prefix = DEEP_LINK_PREFIXES[0]) {
  let url = route;
  
  // Replace parameters in the route
  for (const [paramName, paramValue] of Object.entries(params)) {
    url = url.replace(`:${paramName}`, encodeURIComponent(paramValue));
  }
  
  return `${prefix}${url}`;
}

/**
 * Check if the current app can handle a deep link URL
 * @param {string} url - The deep link URL
 * @returns {Promise<boolean>} Whether the URL can be handled
 */
export async function canHandleDeepLink(url) {
  try {
    return await Linking.canOpenURL(url);
  } catch (error) {
    console.error('Error checking deep link capability:', error);
    return false;
  }
}

/**
 * Get the initial deep link URL when the app is opened
 * @returns {Promise<string|null>} Initial URL or null
 */
export async function getInitialDeepLink() {
  try {
    return await Linking.getInitialURL();
  } catch (error) {
    console.error('Error getting initial deep link:', error);
    return null;
  }
}