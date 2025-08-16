/**
 * Navigation state hook for Hero's Path
 * Provides easy access to navigation state and synchronization utilities
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { useCallback, useMemo } from 'react';
import { useNavigationContext } from '../contexts/NavigationContext';
import { useNavigationSync } from './useNavigationSync';
import { useUser } from '../contexts/UserContext';
import { 
  requiresAuthentication, 
  getFallbackScreen, 
  SCREEN_NAMES,
  validateNavigationParams 
} from '../utils/navigationUtils';

export const useNavigationState = () => {
  const navigationContext = useNavigationContext();
  const { isAuthenticated, loading: authLoading } = useUser();
  const navigationSync = useNavigationSync();

  /**
   * Enhanced navigation function with validation and sync
   */
  const navigateWithValidation = useCallback((screenName, params = {}) => {
    // Validate authentication requirements
    if (requiresAuthentication(screenName) && !isAuthenticated) {
      console.warn(`Screen ${screenName} requires authentication`);
      navigationContext.navigateToScreen(SCREEN_NAMES.LOGIN);
      return false;
    }

    // Validate navigation parameters
    if (!validateNavigationParams(screenName, params)) {
      console.warn(`Invalid parameters for screen ${screenName}:`, params);
      return false;
    }

    // Check if navigation is allowed
    if (!navigationSync.isNavigationAllowed(screenName)) {
      console.warn(`Navigation to ${screenName} is not allowed in current state`);
      return false;
    }

    // Perform navigation
    navigationContext.navigateToScreen(screenName, params);
    return true;
  }, [isAuthenticated, navigationContext, navigationSync]);

  /**
   * Safe back navigation with fallback
   */
  const goBackSafely = useCallback(() => {
    if (navigationContext.canGoBack) {
      navigationContext.goBack();
      return true;
    } else {
      // Navigate to appropriate fallback screen
      const fallbackScreen = getFallbackScreen(isAuthenticated);
      navigationContext.resetToScreen(fallbackScreen);
      return false;
    }
  }, [navigationContext, isAuthenticated]);

  /**
   * Reset navigation to a safe state
   */
  const resetToSafeState = useCallback(() => {
    const safeScreen = getFallbackScreen(isAuthenticated);
    navigationContext.resetToScreen(safeScreen);
  }, [navigationContext, isAuthenticated]);

  /**
   * Get current navigation status
   */
  const navigationStatus = useMemo(() => ({
    currentScreen: navigationContext.currentScreen,
    previousScreen: navigationContext.previousScreen,
    canGoBack: navigationContext.canGoBack,
    isNavigating: navigationContext.isNavigating,
    isAuthenticated,
    authLoading,
    routeHistory: navigationContext.routeHistory,
    availableScreens: navigationSync.getAvailableScreens(),
  }), [
    navigationContext.currentScreen,
    navigationContext.previousScreen,
    navigationContext.canGoBack,
    navigationContext.isNavigating,
    navigationContext.routeHistory,
    isAuthenticated,
    authLoading,
    navigationSync,
  ]);

  /**
   * Check if a screen is accessible in current state
   */
  const isScreenAccessible = useCallback((screenName) => {
    // Check authentication requirements
    if (requiresAuthentication(screenName) && !isAuthenticated) {
      return false;
    }

    // Check if screen is in available screens list
    const availableScreens = navigationSync.getAvailableScreens();
    return availableScreens.includes(screenName);
  }, [isAuthenticated, navigationSync]);

  /**
   * Get navigation breadcrumb for current location
   */
  const getNavigationBreadcrumb = useCallback(() => {
    const history = navigationContext.routeHistory;
    const current = navigationContext.currentScreen;
    
    if (!current) return [];

    // Create breadcrumb from recent history
    const breadcrumb = [...history.slice(-3), current].filter((screen, index, arr) => 
      arr.indexOf(screen) === index // Remove duplicates
    );

    return breadcrumb.map(screen => ({
      screen,
      title: getScreenTitle(screen),
      accessible: isScreenAccessible(screen),
    }));
  }, [navigationContext.routeHistory, navigationContext.currentScreen, isScreenAccessible]);

  /**
   * Handle deep link navigation with validation
   */
  const handleDeepLinkSafely = useCallback((url, params = {}) => {
    try {
      // Use the navigation context's deep link handler
      navigationContext.handleDeepLink(url, params);
      return true;
    } catch (error) {
      console.error('Deep link navigation failed:', error);
      resetToSafeState();
      return false;
    }
  }, [navigationContext, resetToSafeState]);

  /**
   * Batch navigation operations
   */
  const batchNavigationOperations = useCallback((operations) => {
    try {
      operations.forEach(operation => {
        switch (operation.type) {
          case 'navigate':
            navigateWithValidation(operation.screen, operation.params);
            break;
          case 'reset':
            navigationContext.resetToScreen(operation.screen, operation.params);
            break;
          case 'goBack':
            goBackSafely();
            break;
          default:
            console.warn('Unknown navigation operation:', operation.type);
        }
      });
      return true;
    } catch (error) {
      console.error('Batch navigation operations failed:', error);
      return false;
    }
  }, [navigateWithValidation, navigationContext, goBackSafely]);

  return {
    // Navigation state
    ...navigationStatus,
    
    // Enhanced navigation methods
    navigate: navigateWithValidation,
    goBack: goBackSafely,
    reset: resetToSafeState,
    handleDeepLink: handleDeepLinkSafely,
    batchOperations: batchNavigationOperations,
    
    // State queries
    isScreenAccessible,
    getNavigationBreadcrumb,
    
    // Synchronization utilities
    syncWithAuth: navigationSync.syncNavigationWithAuth,
    validateNavigation: navigationSync.validateNavigation,
    
    // Raw context access (for advanced use cases)
    rawContext: navigationContext,
    rawSync: navigationSync,
  };
};

/**
 * Helper function to get screen title for display
 */
const getScreenTitle = (screenName) => {
  const titles = {
    [SCREEN_NAMES.MAP]: 'Map',
    [SCREEN_NAMES.JOURNEYS]: 'Journeys',
    [SCREEN_NAMES.DISCOVERIES]: 'Discoveries',
    [SCREEN_NAMES.SAVED_PLACES]: 'Saved Places',
    [SCREEN_NAMES.SOCIAL]: 'Social',
    [SCREEN_NAMES.SETTINGS]: 'Settings',
    [SCREEN_NAMES.PROFILE]: 'Profile',
    [SCREEN_NAMES.LOGIN]: 'Sign In',
    [SCREEN_NAMES.SIGNUP]: 'Sign Up',
    [SCREEN_NAMES.EMAIL_AUTH]: 'Email Authentication',
    [SCREEN_NAMES.JOURNEY_DETAIL]: 'Journey Details',
    [SCREEN_NAMES.DISCOVERY_DETAIL]: 'Discovery Details',
    [SCREEN_NAMES.PLACE_DETAIL]: 'Place Details',
    [SCREEN_NAMES.DISCOVERY_PREFERENCES]: 'Discovery Preferences',
    [SCREEN_NAMES.PAST_JOURNEYS]: 'Past Journeys',
  };
  
  return titles[screenName] || screenName;
};

export default useNavigationState;