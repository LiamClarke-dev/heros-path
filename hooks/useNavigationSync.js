/**
 * Navigation synchronization hook for Hero's Path
 * Handles synchronization between navigation state and authentication changes
 * Requirements: 6.4, 6.5, 6.6
 */

import { useEffect, useCallback, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useNavigationContext } from '../contexts/NavigationContext';
import { useUser } from '../contexts/UserContext';
import { 
  requiresAuthentication, 
  getFallbackScreen, 
  isNavigationAllowed,
  SCREEN_NAMES 
} from '../utils/navigationUtils';

export const useNavigationSync = () => {
  const { 
    navigationState, 
    navigateToScreen, 
    resetToScreen, 
    goBack,
    canGoBack,
    currentScreen 
  } = useNavigationContext();
  
  const { isAuthenticated, loading: authLoading } = useUser();
  const previousAuthState = useRef(isAuthenticated);
  const syncInProgress = useRef(false);

  /**
   * Handle authentication state changes and sync navigation
   * Requirements: 6.4 - Sync navigation state with authentication changes
   */
  const syncNavigationWithAuth = useCallback(async () => {
    // Prevent multiple sync operations
    if (syncInProgress.current || authLoading) {
      return;
    }

    syncInProgress.current = true;

    try {
      const authChanged = previousAuthState.current !== isAuthenticated;
      
      if (authChanged) {
        console.log('Authentication state changed:', { 
          from: previousAuthState.current, 
          to: isAuthenticated,
          currentScreen 
        });

        // User just signed in
        if (isAuthenticated && !previousAuthState.current) {
          // If on auth screen, navigate to main app
          if (currentScreen === SCREEN_NAMES.LOGIN || 
              currentScreen === SCREEN_NAMES.SIGNUP || 
              currentScreen === SCREEN_NAMES.EMAIL_AUTH) {
            resetToScreen(SCREEN_NAMES.MAP);
          }
          // If on a screen that now has more features available, stay there
          // The UI will update to show authenticated features
        }
        
        // User just signed out
        else if (!isAuthenticated && previousAuthState.current) {
          // Check if current screen requires authentication
          if (currentScreen && requiresAuthentication(currentScreen)) {
            resetToScreen(SCREEN_NAMES.LOGIN);
          } else {
            // Stay on current screen but navigation will show limited options
            // The UI will update to hide authenticated features
          }
        }

        previousAuthState.current = isAuthenticated;
      }

      // Validate current screen access regardless of auth change
      if (currentScreen && requiresAuthentication(currentScreen) && !isAuthenticated) {
        resetToScreen(getFallbackScreen(isAuthenticated));
      }

    } catch (error) {
      console.error('Navigation sync error:', error);
      // Fallback to safe screen
      resetToScreen(getFallbackScreen(isAuthenticated));
    } finally {
      syncInProgress.current = false;
    }
  }, [isAuthenticated, authLoading, currentScreen, resetToScreen]);

  /**
   * Handle back button behavior with proper navigation stack management
   * Requirements: 6.6 - Implement proper back button behavior
   */
  const handleBackButton = useCallback(() => {
    try {
      // If we can go back in navigation stack, do so
      if (canGoBack) {
        goBack();
        return true; // Prevent default back button behavior
      }

      // If on main screens, don't exit app - stay on current screen
      const mainScreens = [
        SCREEN_NAMES.MAP,
        SCREEN_NAMES.JOURNEYS,
        SCREEN_NAMES.DISCOVERIES,
        SCREEN_NAMES.SAVED_PLACES
      ];

      if (mainScreens.includes(currentScreen)) {
        // On main screens, back button should not exit app
        // Instead, navigate to Map if not already there
        if (currentScreen !== SCREEN_NAMES.MAP) {
          navigateToScreen(SCREEN_NAMES.MAP);
          return true;
        }
        // If already on Map, let system handle (will show exit confirmation)
        return false;
      }

      // On other screens, try to go to appropriate fallback
      const fallbackScreen = getFallbackScreen(isAuthenticated);
      if (currentScreen !== fallbackScreen) {
        resetToScreen(fallbackScreen);
        return true;
      }

      // Let system handle default back behavior (exit app)
      return false;

    } catch (error) {
      console.error('Back button handling error:', error);
      // Fallback to safe navigation
      resetToScreen(getFallbackScreen(isAuthenticated));
      return true;
    }
  }, [canGoBack, goBack, currentScreen, isAuthenticated, navigateToScreen, resetToScreen]);

  /**
   * Update navigation UI based on state changes
   * Requirements: 6.5 - Update navigation UI based on state changes
   */
  const updateNavigationUI = useCallback(() => {
    // This function provides data that navigation components can use
    // to update their UI based on current state
    
    const navigationUIState = {
      isAuthenticated,
      currentScreen,
      canGoBack,
      showAuthenticatedFeatures: isAuthenticated,
      availableScreens: getAvailableScreens(isAuthenticated),
      navigationHistory: navigationState.routeHistory,
    };

    return navigationUIState;
  }, [isAuthenticated, currentScreen, canGoBack, navigationState.routeHistory]);

  /**
   * Get list of screens available based on authentication state
   */
  const getAvailableScreens = useCallback((authenticated) => {
    const publicScreens = [SCREEN_NAMES.MAP];
    const authenticatedScreens = [
      SCREEN_NAMES.MAP,
      SCREEN_NAMES.JOURNEYS,
      SCREEN_NAMES.DISCOVERIES,
      SCREEN_NAMES.SAVED_PLACES,
      SCREEN_NAMES.SOCIAL,
      SCREEN_NAMES.SETTINGS,
      SCREEN_NAMES.PROFILE,
    ];

    return authenticated ? authenticatedScreens : publicScreens;
  }, []);

  /**
   * Handle navigation stack cleanup
   * Requirements: 6.5 - Handle navigation stack management and cleanup
   */
  const cleanupNavigationStack = useCallback(() => {
    // Clear any navigation queues or pending operations
    if (navigationState.navigationQueue && navigationState.navigationQueue.length > 0) {
      console.log('Cleaning up navigation queue');
      // The NavigationContext will handle queue cleanup
    }

    // Clear deep link data after processing
    if (navigationState.deepLinkData) {
      console.log('Clearing processed deep link data');
      // This would be handled by NavigationContext
    }
  }, [navigationState]);

  /**
   * Validate navigation request before execution
   */
  const validateNavigation = useCallback((targetScreen, params = {}) => {
    return isNavigationAllowed(currentScreen, targetScreen, isAuthenticated);
  }, [currentScreen, isAuthenticated]);

  // Set up authentication sync effect
  useEffect(() => {
    if (!authLoading) {
      syncNavigationWithAuth();
    }
  }, [isAuthenticated, authLoading, syncNavigationWithAuth]);

  // Set up back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    
    return () => {
      backHandler.remove();
    };
  }, [handleBackButton]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      cleanupNavigationStack();
    };
  }, [cleanupNavigationStack]);

  // Return navigation sync utilities
  return {
    // State
    isAuthenticated,
    currentScreen,
    canGoBack,
    navigationUIState: updateNavigationUI(),
    
    // Methods
    syncNavigationWithAuth,
    handleBackButton,
    updateNavigationUI,
    cleanupNavigationStack,
    validateNavigation,
    getAvailableScreens: () => getAvailableScreens(isAuthenticated),
    
    // Utilities
    requiresAuth: (screen) => requiresAuthentication(screen),
    isNavigationAllowed: (targetScreen) => validateNavigation(targetScreen),
  };
};

export default useNavigationSync;