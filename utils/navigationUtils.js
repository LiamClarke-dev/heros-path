/**
 * Navigation utilities for Hero's Path
 * Provides helper functions for navigation state management and routing
 */

// Screen name constants
export const SCREEN_NAMES = {
  // Auth screens
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  EMAIL_AUTH: 'EmailAuth',
  
  // Main screens
  MAP: 'Map',
  JOURNEYS: 'Journeys',
  DISCOVERIES: 'Discoveries',
  SAVED_PLACES: 'SavedPlaces',
  SOCIAL: 'Social',
  SETTINGS: 'Settings',
  
  // Sub-screens
  JOURNEY_DETAIL: 'JourneyDetail',
  DISCOVERY_DETAIL: 'DiscoveryDetail',
  PLACE_DETAIL: 'PlaceDetail',
  PROFILE: 'Profile',
  DISCOVERY_PREFERENCES: 'DiscoveryPreferences',
  PAST_JOURNEYS: 'PastJourneys',
};

// Navigation stack names
export const STACK_NAMES = {
  AUTH: 'Auth',
  MAIN: 'Main',
  MAP_STACK: 'MapStack',
  JOURNEYS_STACK: 'JourneysStack',
  DISCOVERIES_STACK: 'DiscoveriesStack',
  SAVED_PLACES_STACK: 'SavedPlacesStack',
  SOCIAL_STACK: 'SocialStack',
  SETTINGS_STACK: 'SettingsStack',
};

// Deep link URL patterns
export const DEEP_LINK_PATTERNS = {
  MAP: '/map',
  JOURNEYS: '/journeys',
  JOURNEY_DETAIL: '/journeys/:id',
  DISCOVERIES: '/discoveries',
  DISCOVERY_DETAIL: '/discoveries/:id',
  SAVED_PLACES: '/saved-places',
  PLACE_DETAIL: '/places/:id',
  SOCIAL: '/social',
  SETTINGS: '/settings',
  PROFILE: '/profile',
};

/**
 * Parse deep link URL and extract screen name and parameters
 * @param {string} url - The deep link URL
 * @returns {object} - Object containing screen name and parameters
 */
export const parseDeepLink = (url) => {
  try {
    if (!url || typeof url !== 'string') {
      return { screen: SCREEN_NAMES.MAP, params: {} };
    }

    // Handle custom scheme URLs (com.liamclarke.herospath://path)
    let pathname = '';
    let searchParams = {};
    
    if (url.includes('://')) {
      const parts = url.split('://');
      if (parts.length > 1) {
        const pathPart = parts[1];
        if (pathPart.includes('?')) {
          const [path, query] = pathPart.split('?');
          pathname = '/' + path;
          // Parse query parameters
          const urlParams = new URLSearchParams(query);
          searchParams = Object.fromEntries(urlParams);
        } else {
          pathname = '/' + pathPart;
        }
      }
    } else {
      // Handle regular URLs
      const urlObj = new URL(url);
      pathname = urlObj.pathname;
      searchParams = Object.fromEntries(urlObj.searchParams);
    }
    
    // Match against known patterns
    if (pathname === '/map' || pathname === 'map') {
      return { screen: SCREEN_NAMES.MAP, params: searchParams };
    }
    
    if (pathname.startsWith('/journeys/') || pathname.startsWith('journeys/')) {
      const id = pathname.split('/')[2] || pathname.split('/')[1];
      return { 
        screen: SCREEN_NAMES.JOURNEY_DETAIL, 
        params: { ...searchParams, journeyId: id } 
      };
    }
    
    if (pathname === '/journeys' || pathname === 'journeys') {
      return { screen: SCREEN_NAMES.JOURNEYS, params: searchParams };
    }
    
    if (pathname.startsWith('/discoveries/') || pathname.startsWith('discoveries/')) {
      const id = pathname.split('/')[2] || pathname.split('/')[1];
      return { 
        screen: SCREEN_NAMES.DISCOVERY_DETAIL, 
        params: { ...searchParams, discoveryId: id } 
      };
    }
    
    if (pathname === '/discoveries' || pathname === 'discoveries') {
      return { screen: SCREEN_NAMES.DISCOVERIES, params: searchParams };
    }
    
    if (pathname.startsWith('/places/') || pathname.startsWith('places/')) {
      const id = pathname.split('/')[2] || pathname.split('/')[1];
      return { 
        screen: SCREEN_NAMES.PLACE_DETAIL, 
        params: { ...searchParams, placeId: id } 
      };
    }
    
    if (pathname === '/saved-places' || pathname === 'saved-places') {
      return { screen: SCREEN_NAMES.SAVED_PLACES, params: searchParams };
    }
    
    if (pathname === '/social' || pathname === 'social') {
      return { screen: SCREEN_NAMES.SOCIAL, params: searchParams };
    }
    
    if (pathname === '/settings' || pathname === 'settings') {
      return { screen: SCREEN_NAMES.SETTINGS, params: searchParams };
    }
    
    if (pathname === '/profile' || pathname === 'profile') {
      return { screen: SCREEN_NAMES.PROFILE, params: searchParams };
    }
    
    // Default fallback
    return { screen: SCREEN_NAMES.MAP, params: {} };
    
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return { screen: SCREEN_NAMES.MAP, params: {} };
  }
};

/**
 * Generate deep link URL for a screen and parameters
 * @param {string} screen - Screen name
 * @param {object} params - Parameters object
 * @returns {string} - Deep link URL
 */
export const generateDeepLink = (screen, params = {}) => {
  const baseUrl = 'com.liamclarke.herospath://';
  
  switch (screen) {
    case SCREEN_NAMES.MAP:
      return `${baseUrl}map`;
      
    case SCREEN_NAMES.JOURNEYS:
      return `${baseUrl}journeys`;
      
    case SCREEN_NAMES.JOURNEY_DETAIL:
      return `${baseUrl}journeys/${params.journeyId || ''}`;
      
    case SCREEN_NAMES.DISCOVERIES:
      return `${baseUrl}discoveries`;
      
    case SCREEN_NAMES.DISCOVERY_DETAIL:
      return `${baseUrl}discoveries/${params.discoveryId || ''}`;
      
    case SCREEN_NAMES.SAVED_PLACES:
      return `${baseUrl}saved-places`;
      
    case SCREEN_NAMES.PLACE_DETAIL:
      return `${baseUrl}places/${params.placeId || ''}`;
      
    case SCREEN_NAMES.SOCIAL:
      return `${baseUrl}social`;
      
    case SCREEN_NAMES.SETTINGS:
      return `${baseUrl}settings`;
      
    case SCREEN_NAMES.PROFILE:
      return `${baseUrl}profile`;
      
    default:
      return `${baseUrl}map`;
  }
};

/**
 * Validate if a screen requires authentication
 * @param {string} screen - Screen name
 * @returns {boolean} - Whether authentication is required
 */
export const requiresAuthentication = (screen) => {
  const publicScreens = [
    SCREEN_NAMES.LOGIN,
    SCREEN_NAMES.SIGNUP,
    SCREEN_NAMES.EMAIL_AUTH,
    SCREEN_NAMES.MAP, // Map can be viewed without auth but with limited features
  ];
  
  return !publicScreens.includes(screen);
};

/**
 * Get the appropriate fallback screen based on authentication status
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @returns {string} - Fallback screen name
 */
export const getFallbackScreen = (isAuthenticated) => {
  return isAuthenticated ? SCREEN_NAMES.MAP : SCREEN_NAMES.LOGIN;
};

/**
 * Validate navigation parameters for a specific screen
 * @param {string} screen - Screen name
 * @param {object} params - Parameters to validate
 * @returns {boolean} - Whether parameters are valid
 */
export const validateNavigationParams = (screen, params) => {
  switch (screen) {
    case SCREEN_NAMES.JOURNEY_DETAIL:
      return !!(params && params.journeyId);
      
    case SCREEN_NAMES.DISCOVERY_DETAIL:
      return !!(params && params.discoveryId);
      
    case SCREEN_NAMES.PLACE_DETAIL:
      return !!(params && params.placeId);
      
    default:
      return true; // Most screens don't require specific params
  }
};

/**
 * Get navigation options for a screen
 * @param {string} screen - Screen name
 * @param {object} theme - Theme object
 * @returns {object} - Navigation options
 */
export const getScreenOptions = (screen, theme) => {
  const baseOptions = {
    headerStyle: {
      backgroundColor: theme.colors.surface,
    },
    headerTintColor: theme.colors.text,
    headerTitleStyle: {
      fontFamily: theme.fonts.medium,
    },
  };
  
  switch (screen) {
    case SCREEN_NAMES.MAP:
      return {
        ...baseOptions,
        headerShown: false, // Map has custom header
      };
      
    case SCREEN_NAMES.LOGIN:
    case SCREEN_NAMES.SIGNUP:
      return {
        ...baseOptions,
        headerShown: false, // Auth screens have custom headers
      };
      
    default:
      return baseOptions;
  }
};

/**
 * Check if navigation is allowed based on current state
 * @param {string} fromScreen - Current screen
 * @param {string} toScreen - Target screen
 * @param {boolean} isAuthenticated - Authentication status
 * @returns {boolean} - Whether navigation is allowed
 */
export const isNavigationAllowed = (fromScreen, toScreen, isAuthenticated) => {
  // Prevent navigation to same screen
  if (fromScreen === toScreen) {
    return false;
  }
  
  // Check authentication requirements
  if (requiresAuthentication(toScreen) && !isAuthenticated) {
    return false;
  }
  
  // All other navigation is allowed
  return true;
};