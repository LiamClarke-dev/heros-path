/**
 * Navigation Stack Utilities
 * Utilities for managing navigation stacks for deep-linked content
 */

import { CommonActions, StackActions } from '@react-navigation/native';

/**
 * Navigation stack configurations for different deep link destinations
 */
export const NAVIGATION_STACKS = {
  // Map-related stacks
  'Map': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'Map' } },
    ],
    requiresAuth: false,
  },
  'PlaceDetails': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'Map' } },
      { name: 'PlaceDetails', params: {} },
    ],
    requiresAuth: false,
  },

  // Journey-related stacks
  'Journeys': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'Journeys' } },
    ],
    requiresAuth: true,
  },
  'JourneyDetails': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'Journeys' } },
      { name: 'JourneyDetails', params: {} },
    ],
    requiresAuth: true,
  },
  'JourneyEdit': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'Journeys' } },
      { name: 'JourneyDetails', params: {} },
      { name: 'JourneyEdit', params: {} },
    ],
    requiresAuth: true,
  },

  // Discovery-related stacks
  'Discoveries': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'Discoveries' } },
    ],
    requiresAuth: true,
  },
  'DiscoveryDetails': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'Discoveries' } },
      { name: 'DiscoveryDetails', params: {} },
    ],
    requiresAuth: true,
  },
  'DiscoveryPreferences': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'Discoveries' } },
      { name: 'DiscoveryPreferences', params: {} },
    ],
    requiresAuth: true,
  },

  // Saved Places-related stacks
  'SavedPlaces': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'SavedPlaces' } },
    ],
    requiresAuth: true,
  },
  'SavedPlaceDetails': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'SavedPlaces' } },
      { name: 'SavedPlaceDetails', params: {} },
    ],
    requiresAuth: true,
  },
  'SavedPlaceEdit': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'CoreFeatures', params: { screen: 'SavedPlaces' } },
      { name: 'SavedPlaceDetails', params: {} },
      { name: 'SavedPlaceEdit', params: {} },
    ],
    requiresAuth: true,
  },

  // Social-related stacks
  'Social': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'Social', params: {} },
    ],
    requiresAuth: true,
  },
  'ShareJourney': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'Social', params: {} },
      { name: 'ShareJourney', params: {} },
    ],
    requiresAuth: true,
  },
  'UserProfile': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'Social', params: {} },
      { name: 'UserProfile', params: {} },
    ],
    requiresAuth: true,
  },

  // Settings-related stacks
  'Settings': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'Settings', params: {} },
    ],
    requiresAuth: true,
  },
  'Profile': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'Settings', params: {} },
      { name: 'Profile', params: {} },
    ],
    requiresAuth: true,
  },
  'Privacy': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'Settings', params: {} },
      { name: 'Privacy', params: {} },
    ],
    requiresAuth: true,
  },
  'Notifications': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'Settings', params: {} },
      { name: 'Notifications', params: {} },
    ],
    requiresAuth: true,
  },
  'About': {
    stack: [
      { name: 'Main', params: {} },
      { name: 'Settings', params: {} },
      { name: 'About', params: {} },
    ],
    requiresAuth: false,
  },

  // Auth-related stacks
  'Login': {
    stack: [
      { name: 'Auth', params: {} },
      { name: 'Login', params: {} },
    ],
    requiresAuth: false,
  },
  'Signup': {
    stack: [
      { name: 'Auth', params: {} },
      { name: 'Signup', params: {} },
    ],
    requiresAuth: false,
  },
  'ForgotPassword': {
    stack: [
      { name: 'Auth', params: {} },
      { name: 'ForgotPassword', params: {} },
    ],
    requiresAuth: false,
  },
  'ResetPassword': {
    stack: [
      { name: 'Auth', params: {} },
      { name: 'ResetPassword', params: {} },
    ],
    requiresAuth: false,
  },
};

/**
 * Create a proper navigation stack for deep-linked content
 * @param {string} targetScreen - The target screen name
 * @param {Object} params - Screen parameters
 * @param {Object} options - Navigation options
 * @returns {Object} Navigation stack configuration
 */
export function createNavigationStack(targetScreen, params = {}, options = {}) {
  const stackConfig = NAVIGATION_STACKS[targetScreen];
  
  if (!stackConfig) {
    console.warn(`No navigation stack configuration found for screen: ${targetScreen}`);
    return {
      stack: [{ name: 'Main', params: {} }],
      requiresAuth: false,
    };
  }

  // Clone the stack and apply parameters to the target screen
  const stack = stackConfig.stack.map((screen, index) => {
    if (index === stackConfig.stack.length - 1) {
      // This is the target screen, apply the parameters
      return {
        ...screen,
        params: { ...screen.params, ...params },
      };
    }
    return screen;
  });

  return {
    stack,
    requiresAuth: stackConfig.requiresAuth,
  };
}

/**
 * Navigate to a screen with proper stack management
 * @param {Object} navigation - React Navigation object
 * @param {string} targetScreen - Target screen name
 * @param {Object} params - Screen parameters
 * @param {Object} options - Navigation options
 * @returns {Promise<boolean>} Success status
 */
export async function navigateWithStack(navigation, targetScreen, params = {}, options = {}) {
  try {
    const { 
      resetStack = false, 
      preserveHistory = true,
      animationType = 'default' 
    } = options;

    const stackConfig = createNavigationStack(targetScreen, params);

    if (resetStack) {
      // Reset the entire navigation stack
      const resetAction = CommonActions.reset({
        index: stackConfig.stack.length - 1,
        routes: stackConfig.stack,
      });
      navigation.dispatch(resetAction);
    } else {
      // Navigate normally, preserving existing stack
      const [rootScreen, ...nestedScreens] = stackConfig.stack;
      
      if (nestedScreens.length === 0) {
        // Simple navigation
        navigation.navigate(rootScreen.name, rootScreen.params);
      } else {
        // Nested navigation
        const nestedParams = nestedScreens.reduce((acc, screen, index) => {
          if (index === nestedScreens.length - 1) {
            // Last screen gets the actual params
            return {
              screen: screen.name,
              params: screen.params,
            };
          } else {
            // Intermediate screens
            return {
              screen: screen.name,
              params: acc,
            };
          }
        }, {});

        navigation.navigate(rootScreen.name, nestedParams);
      }
    }

    return true;
  } catch (error) {
    console.error('Error navigating with stack:', error);
    return false;
  }
}

/**
 * Get the current navigation stack depth
 * @param {Object} navigationState - Current navigation state
 * @returns {number} Stack depth
 */
export function getStackDepth(navigationState) {
  if (!navigationState || !navigationState.routes) {
    return 0;
  }

  let depth = navigationState.routes.length;
  
  // Check for nested navigators
  const currentRoute = navigationState.routes[navigationState.index];
  if (currentRoute && currentRoute.state) {
    depth += getStackDepth(currentRoute.state);
  }

  return depth;
}

/**
 * Check if a screen is currently in the navigation stack
 * @param {Object} navigationState - Current navigation state
 * @param {string} screenName - Screen name to check
 * @returns {boolean} Whether the screen is in the stack
 */
export function isScreenInStack(navigationState, screenName) {
  if (!navigationState || !navigationState.routes) {
    return false;
  }

  // Check current level
  const hasScreen = navigationState.routes.some(route => route.name === screenName);
  if (hasScreen) {
    return true;
  }

  // Check nested navigators
  for (const route of navigationState.routes) {
    if (route.state && isScreenInStack(route.state, screenName)) {
      return true;
    }
  }

  return false;
}

/**
 * Get the path to a screen in the navigation stack
 * @param {Object} navigationState - Current navigation state
 * @param {string} screenName - Screen name to find
 * @returns {Array|null} Path to the screen or null if not found
 */
export function getScreenPath(navigationState, screenName) {
  if (!navigationState || !navigationState.routes) {
    return null;
  }

  // Check current level
  const routeIndex = navigationState.routes.findIndex(route => route.name === screenName);
  if (routeIndex !== -1) {
    return [screenName];
  }

  // Check nested navigators
  for (const route of navigationState.routes) {
    if (route.state) {
      const nestedPath = getScreenPath(route.state, screenName);
      if (nestedPath) {
        return [route.name, ...nestedPath];
      }
    }
  }

  return null;
}

/**
 * Calculate the optimal navigation action for a target screen
 * @param {Object} currentState - Current navigation state
 * @param {string} targetScreen - Target screen name
 * @param {Object} params - Screen parameters
 * @returns {Object} Optimal navigation action
 */
export function calculateOptimalNavigation(currentState, targetScreen, params = {}) {
  const targetPath = getScreenPath(currentState, targetScreen);
  const stackConfig = createNavigationStack(targetScreen, params);

  if (targetPath) {
    // Screen is already in stack, decide whether to pop to it or push new instance
    return {
      action: 'navigate',
      method: 'existing',
      path: targetPath,
    };
  } else {
    // Screen is not in stack, need to navigate to it
    return {
      action: 'navigate',
      method: 'new',
      stack: stackConfig.stack,
    };
  }
}

/**
 * Optimize navigation stack by removing unnecessary screens
 * @param {Object} navigation - React Navigation object
 * @param {number} maxDepth - Maximum allowed stack depth
 * @returns {boolean} Whether optimization was performed
 */
export function optimizeNavigationStack(navigation, maxDepth = 10) {
  try {
    const state = navigation.getState();
    const currentDepth = getStackDepth(state);

    if (currentDepth <= maxDepth) {
      return false; // No optimization needed
    }

    // Remove screens from the middle of the stack
    const routesToKeep = Math.min(maxDepth, state.routes.length);
    const routesToRemove = state.routes.length - routesToKeep;

    for (let i = 0; i < routesToRemove; i++) {
      navigation.dispatch(StackActions.pop());
    }

    return true;
  } catch (error) {
    console.error('Error optimizing navigation stack:', error);
    return false;
  }
}