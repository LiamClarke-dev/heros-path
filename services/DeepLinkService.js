/**
 * Deep Link Service
 * Handles deep link processing, validation, and navigation
 */

import { Linking } from 'react-native';
import { 
  parseDeepLink, 
  generateDeepLink, 
  getInitialDeepLink,
  DEEP_LINK_PREFIXES 
} from '../utils/deepLinkConfig';

class DeepLinkService {
  constructor() {
    this.listeners = [];
    this.navigationRef = null;
    this.userContext = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the deep link service
   * @param {Object} navigationRef - React Navigation reference
   * @param {Object} userContext - User context for authentication checks
   */
  initialize(navigationRef, userContext) {
    this.navigationRef = navigationRef;
    this.userContext = userContext;
    this.isInitialized = true;

    // Set up deep link listener
    this.setupDeepLinkListener();

    // Handle initial deep link if app was opened from one
    this.handleInitialDeepLink();
  }

  /**
   * Set up listener for incoming deep links
   */
  setupDeepLinkListener() {
    const handleDeepLink = (event) => {
      if (event?.url) {
        this.processDeepLink(event.url);
      }
    };

    // Add listener for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);
    this.listeners.push(subscription);
  }

  /**
   * Handle initial deep link when app is opened
   */
  async handleInitialDeepLink() {
    try {
      const initialUrl = await getInitialDeepLink();
      if (initialUrl) {
        // Delay processing to ensure navigation is ready
        setTimeout(() => {
          this.processDeepLink(initialUrl);
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling initial deep link:', error);
    }
  }

  /**
   * Process a deep link URL
   * @param {string} url - The deep link URL to process
   * @returns {Promise<Object>} Processing result
   */
  async processDeepLink(url) {
    try {
      console.log('Processing deep link:', url);

      // Parse the deep link
      const parseResult = parseDeepLink(url);
      
      if (!parseResult.isValid) {
        console.error('Invalid deep link:', parseResult.error);
        return this.handleInvalidDeepLink(url, parseResult.error);
      }

      // Check authentication requirements
      if (parseResult.requiresAuth && !this.isUserAuthenticated()) {
        console.log('Deep link requires authentication, redirecting to login');
        return this.handleAuthenticationRequired(parseResult);
      }

      // Navigate to the target screen
      const navigationResult = await this.navigateToDeepLink(parseResult);
      
      if (navigationResult.success) {
        console.log('Deep link navigation successful:', parseResult.screen);
        return {
          success: true,
          screen: parseResult.screen,
          params: parseResult.params,
        };
      } else {
        console.error('Deep link navigation failed:', navigationResult.error);
        return this.handleNavigationError(parseResult, navigationResult.error);
      }

    } catch (error) {
      console.error('Error processing deep link:', error);
      return this.handleDeepLinkError(url, error);
    }
  }

  /**
   * Navigate to a deep link destination
   * @param {Object} parseResult - Parsed deep link information
   * @returns {Promise<Object>} Navigation result
   */
  async navigateToDeepLink(parseResult) {
    if (!this.navigationRef?.current) {
      return {
        success: false,
        error: 'Navigation reference not available',
      };
    }

    try {
      const { screen, params } = parseResult;

      // Navigate based on the screen type
      switch (screen) {
        case 'Map':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: { screen: 'Map' },
          });
          break;

        case 'JourneyDetails':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'Journeys',
              params: {
                screen: 'JourneyDetails',
                params: { journeyId: params.journeyId },
              },
            },
          });
          break;

        case 'PlaceDetails':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'Map',
              params: {
                screen: 'PlaceDetails',
                params: { placeId: params.placeId },
              },
            },
          });
          break;

        case 'Journeys':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: { screen: 'Journeys' },
          });
          break;

        case 'JourneyEdit':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'Journeys',
              params: {
                screen: 'JourneyEdit',
                params: { journeyId: params.journeyId },
              },
            },
          });
          break;

        case 'Discoveries':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: { screen: 'Discoveries' },
          });
          break;

        case 'DiscoveryDetails':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'Discoveries',
              params: {
                screen: 'DiscoveryDetails',
                params: { discoveryId: params.discoveryId },
              },
            },
          });
          break;

        case 'DiscoveryPreferences':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'Discoveries',
              params: { screen: 'DiscoveryPreferences' },
            },
          });
          break;

        case 'SavedPlaces':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: { screen: 'SavedPlaces' },
          });
          break;

        case 'SavedPlaceDetails':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'SavedPlaces',
              params: {
                screen: 'SavedPlaceDetails',
                params: { placeId: params.placeId },
              },
            },
          });
          break;

        case 'SavedPlaceEdit':
          this.navigationRef.current.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'SavedPlaces',
              params: {
                screen: 'SavedPlaceEdit',
                params: { placeId: params.placeId },
              },
            },
          });
          break;

        case 'Social':
          this.navigationRef.current.navigate('Main', {
            screen: 'Social',
          });
          break;

        case 'ShareJourney':
          this.navigationRef.current.navigate('Main', {
            screen: 'Social',
            params: {
              screen: 'ShareJourney',
              params: { journeyId: params.journeyId },
            },
          });
          break;

        case 'UserProfile':
          this.navigationRef.current.navigate('Main', {
            screen: 'Social',
            params: {
              screen: 'UserProfile',
              params: { userId: params.userId },
            },
          });
          break;

        case 'Settings':
          this.navigationRef.current.navigate('Main', {
            screen: 'Settings',
          });
          break;

        case 'Profile':
          this.navigationRef.current.navigate('Main', {
            screen: 'Settings',
            params: { screen: 'Profile' },
          });
          break;

        case 'Privacy':
          this.navigationRef.current.navigate('Main', {
            screen: 'Settings',
            params: { screen: 'Privacy' },
          });
          break;

        case 'Notifications':
          this.navigationRef.current.navigate('Main', {
            screen: 'Settings',
            params: { screen: 'Notifications' },
          });
          break;

        case 'About':
          this.navigationRef.current.navigate('Main', {
            screen: 'Settings',
            params: { screen: 'About' },
          });
          break;

        case 'Login':
          this.navigationRef.current.navigate('Auth', {
            screen: 'Login',
          });
          break;

        case 'Signup':
          this.navigationRef.current.navigate('Auth', {
            screen: 'Signup',
          });
          break;

        case 'ForgotPassword':
          this.navigationRef.current.navigate('Auth', {
            screen: 'ForgotPassword',
          });
          break;

        case 'ResetPassword':
          this.navigationRef.current.navigate('Auth', {
            screen: 'ResetPassword',
            params: { token: params.token },
          });
          break;

        default:
          return {
            success: false,
            error: `Unknown screen: ${screen}`,
          };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isUserAuthenticated() {
    return this.userContext?.user != null;
  }

  /**
   * Handle invalid deep link
   * @param {string} url - The invalid URL
   * @param {string} error - Error message
   * @returns {Object} Error result
   */
  handleInvalidDeepLink(url, error) {
    // Navigate to home screen with error message
    if (this.navigationRef?.current) {
      this.navigationRef.current.navigate('Main', {
        screen: 'CoreFeatures',
        params: { 
          screen: 'Map',
          params: { 
            deepLinkError: `Invalid link: ${error}` 
          }
        },
      });
    }

    return {
      success: false,
      error: `Invalid deep link: ${error}`,
      url,
    };
  }

  /**
   * Handle authentication required for deep link
   * @param {Object} parseResult - Parsed deep link information
   * @returns {Object} Authentication redirect result
   */
  handleAuthenticationRequired(parseResult) {
    // Store the intended destination for after authentication
    const pendingDeepLink = {
      screen: parseResult.screen,
      params: parseResult.params,
      timestamp: Date.now(),
    };

    // Navigate to login with return destination
    if (this.navigationRef?.current) {
      this.navigationRef.current.navigate('Auth', {
        screen: 'Login',
        params: { 
          returnTo: pendingDeepLink,
          message: 'Please sign in to access this content'
        },
      });
    }

    return {
      success: false,
      requiresAuth: true,
      pendingDeepLink,
    };
  }

  /**
   * Handle navigation error
   * @param {Object} parseResult - Parsed deep link information
   * @param {string} error - Navigation error
   * @returns {Object} Error result
   */
  handleNavigationError(parseResult, error) {
    // Navigate to home screen with error message
    if (this.navigationRef?.current) {
      this.navigationRef.current.navigate('Main', {
        screen: 'CoreFeatures',
        params: { 
          screen: 'Map',
          params: { 
            deepLinkError: `Navigation failed: ${error}` 
          }
        },
      });
    }

    return {
      success: false,
      error: `Navigation error: ${error}`,
      parseResult,
    };
  }

  /**
   * Handle general deep link error
   * @param {string} url - The problematic URL
   * @param {Error} error - The error that occurred
   * @returns {Object} Error result
   */
  handleDeepLinkError(url, error) {
    // Navigate to home screen
    if (this.navigationRef?.current) {
      this.navigationRef.current.navigate('Main', {
        screen: 'CoreFeatures',
        params: { 
          screen: 'Map',
          params: { 
            deepLinkError: 'Unable to process link' 
          }
        },
      });
    }

    return {
      success: false,
      error: error.message,
      url,
    };
  }

  /**
   * Generate a shareable deep link
   * @param {string} screen - Target screen name
   * @param {Object} params - Screen parameters
   * @param {Object} options - Generation options
   * @returns {string} Generated deep link URL
   */
  generateShareableLink(screen, params = {}, options = {}) {
    const { useHttps = false } = options;
    
    // Map screen names to route patterns
    const screenToRoute = {
      'JourneyDetails': 'journeys/:journeyId',
      'PlaceDetails': 'map/place/:placeId',
      'DiscoveryDetails': 'discoveries/:discoveryId',
      'SavedPlaceDetails': 'saved-places/:placeId',
      'ShareJourney': 'social/share/:journeyId',
      'UserProfile': 'social/profile/:userId',
    };

    const route = screenToRoute[screen];
    if (!route) {
      throw new Error(`Cannot generate link for screen: ${screen}`);
    }

    const prefix = useHttps ? DEEP_LINK_PREFIXES[1] : DEEP_LINK_PREFIXES[0];
    return generateDeepLink(route, params, prefix);
  }

  /**
   * Process pending deep link after authentication
   * @param {Object} pendingDeepLink - Stored deep link information
   * @returns {Promise<Object>} Processing result
   */
  async processPendingDeepLink(pendingDeepLink) {
    if (!pendingDeepLink || !pendingDeepLink.screen) {
      return { success: false, error: 'No pending deep link' };
    }

    // Check if the pending link is still valid (not too old)
    const maxAge = 10 * 60 * 1000; // 10 minutes
    if (Date.now() - pendingDeepLink.timestamp > maxAge) {
      return { success: false, error: 'Pending deep link expired' };
    }

    // Navigate to the pending destination
    return await this.navigateToDeepLink({
      screen: pendingDeepLink.screen,
      params: pendingDeepLink.params,
    });
  }

  /**
   * Clean up listeners and resources
   */
  cleanup() {
    this.listeners.forEach(listener => {
      if (listener?.remove) {
        listener.remove();
      }
    });
    this.listeners = [];
    this.navigationRef = null;
    this.userContext = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export default new DeepLinkService();