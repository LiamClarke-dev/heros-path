import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NavigationContext = createContext();

const NAVIGATION_STATE_KEY = 'herospath_navigation_state';
const MAX_HISTORY_LENGTH = 20;

export function NavigationProvider({ children }) {
  
  const [state, setState] = useState({
    currentScreen: null,
    previousScreen: null,
    canGoBack: false,
    routeHistory: [],
    deepLinkData: null,
    navigationRef: null,
    isNavigating: false,
    lastNavigationTime: null,
    navigationQueue: [],
  });

  const navigationTimeoutRef = useRef(null);

  // Set navigation reference
  const setNavigationRef = useCallback((ref) => {
    setState(prevState => ({
      ...prevState,
      navigationRef: ref,
    }));
    
    // Set up navigation state listener
    if (ref) {
      const unsubscribe = ref.addListener('state', (e) => {
        const currentRoute = ref.getCurrentRoute();
        if (currentRoute) {
          setState(prevState => ({
            ...prevState,
            currentScreen: currentRoute.name,
            canGoBack: ref.canGoBack(),
            lastNavigationTime: Date.now(),
          }));
        }
      });
      
      return unsubscribe;
    }
  }, []);

  // Process navigation queue
  const processNavigationQueue = useCallback(() => {
    if (state.navigationQueue.length > 0 && !state.isNavigating && state.navigationRef) {
      const nextNavigation = state.navigationQueue[0];
      setState(prevState => ({
        ...prevState,
        navigationQueue: prevState.navigationQueue.slice(1),
        isNavigating: true,
      }));
      
      try {
        state.navigationRef.navigate(nextNavigation.screenName, nextNavigation.params);
        
        // Clear navigation flag after a short delay
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
        }
        navigationTimeoutRef.current = setTimeout(() => {
          setState(prevState => ({
            ...prevState,
            isNavigating: false,
          }));
        }, 100);
        
      } catch (error) {
        console.error('Navigation queue processing error:', error);
        setState(prevState => ({
          ...prevState,
          isNavigating: false,
        }));
      }
    }
  }, [state.navigationQueue, state.isNavigating, state.navigationRef]);

  // Navigate to screen with state tracking and queuing
  const navigateToScreen = useCallback((screenName, params = {}) => {
    if (!state.navigationRef) {
      console.warn('Navigation ref not available');
      return;
    }
    
    // If currently navigating, queue the navigation
    if (state.isNavigating) {
      setState(prevState => ({
        ...prevState,
        navigationQueue: [...prevState.navigationQueue, { screenName, params }],
      }));
      return;
    }
    
    try {
      setState(prevState => ({
        ...prevState,
        isNavigating: true,
        previousScreen: prevState.currentScreen,
        routeHistory: [...prevState.routeHistory.slice(-(MAX_HISTORY_LENGTH - 1)), screenName].filter(Boolean),
      }));
      
      state.navigationRef.navigate(screenName, params);
      
      // Clear navigation flag after a short delay
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      navigationTimeoutRef.current = setTimeout(() => {
        setState(prevState => ({
          ...prevState,
          isNavigating: false,
        }));
      }, 100);
      
    } catch (error) {
      console.error('Navigation error:', error);
      setState(prevState => ({
        ...prevState,
        isNavigating: false,
      }));
      
      // Fallback to reset navigation
      if (state.navigationRef.reset) {
        state.navigationRef.reset({
          index: 0,
          routes: [{ name: 'Map' }],
        });
      }
    }
  }, [state.navigationRef, state.isNavigating]);

  // Process queue when navigation state changes
  useEffect(() => {
    processNavigationQueue();
  }, [processNavigationQueue]);

  // Go back with error handling
  const goBack = useCallback(() => {
    if (!state.navigationRef) {
      console.warn('Navigation ref not available');
      return;
    }
    
    try {
      if (state.navigationRef.canGoBack()) {
        state.navigationRef.goBack();
      } else {
        // Fallback to home screen if can't go back
        if (state.navigationRef.reset) {
          state.navigationRef.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      }
    } catch (error) {
      console.error('Go back error:', error);
      if (state.navigationRef.reset) {
        state.navigationRef.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    }
  }, [state.navigationRef]);

  // Reset navigation to a specific screen
  const resetToScreen = useCallback((screenName, params = {}) => {
    if (!state.navigationRef) {
      console.warn('Navigation ref not available');
      return;
    }
    
    try {
      state.navigationRef.reset({
        index: 0,
        routes: [{ name: screenName, params }],
      });
    } catch (error) {
      console.error('Reset navigation error:', error);
    }
  }, [state.navigationRef]);

  // Handle deep link navigation
  const handleDeepLink = useCallback((url, params = {}) => {
    setState(prevState => ({
      ...prevState,
      deepLinkData: { url, params },
    }));
    
    // Process deep link and navigate accordingly
    // This will be expanded based on specific deep link requirements
    try {
      if (url.includes('/map')) {
        navigateToScreen('Map', params);
      } else if (url.includes('/journeys')) {
        navigateToScreen('Journeys', params);
      } else if (url.includes('/discoveries')) {
        navigateToScreen('Discoveries', params);
      } else if (url.includes('/saved-places')) {
        navigateToScreen('SavedPlaces', params);
      } else {
        // Default to map screen for unknown deep links
        navigateToScreen('Map');
      }
    } catch (error) {
      console.error('Deep link navigation error:', error);
      navigateToScreen('Map');
    }
  }, [navigateToScreen]);

  // Get current navigation state for external use
  const getCurrentNavigationState = useCallback(() => {
    if (!state.navigationRef) {
      return null;
    }
    
    try {
      const currentRoute = state.navigationRef.getCurrentRoute();
      const navigationState = state.navigationRef.getState();
      
      return {
        currentRoute,
        navigationState,
        canGoBack: state.navigationRef.canGoBack(),
        routeHistory: state.routeHistory,
      };
    } catch (error) {
      console.error('Error getting navigation state:', error);
      return null;
    }
  }, [state.navigationRef, state.routeHistory]);

  // Clear navigation history
  const clearNavigationHistory = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      routeHistory: [],
      previousScreen: null,
    }));
  }, []);

  // Persist navigation state with enhanced data
  const persistNavigationState = useCallback(async () => {
    try {
      const stateToSave = {
        currentScreen: state.currentScreen,
        routeHistory: state.routeHistory,
        lastNavigationTime: state.lastNavigationTime,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error persisting navigation state:', error);
    }
  }, [state.currentScreen, state.routeHistory, state.lastNavigationTime]);

  // Restore navigation state with validation
  const restoreNavigationState = useCallback(async () => {
    try {
      const savedState = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Validate saved state is not too old (24 hours)
        const isStateValid = parsedState.timestamp && 
          (Date.now() - parsedState.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isStateValid) {
          setState(prevState => ({
            ...prevState,
            currentScreen: parsedState.currentScreen,
            routeHistory: parsedState.routeHistory || [],
            lastNavigationTime: parsedState.lastNavigationTime,
          }));
          
          // Don't automatically navigate on restore - let the app handle initial navigation
          return parsedState.currentScreen;
        } else {
          // Clear old state
          await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
        }
      }
    } catch (error) {
      console.error('Error restoring navigation state:', error);
    }
    return null;
  }, []);

  // Auto-persist state when it changes
  useEffect(() => {
    if (state.currentScreen) {
      persistNavigationState();
    }
  }, [state.currentScreen, state.routeHistory, persistNavigationState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const value = {
    navigationState: state,
    navigateToScreen,
    goBack,
    resetToScreen,
    handleDeepLink,
    persistNavigationState,
    restoreNavigationState,
    setNavigationRef,
    getCurrentNavigationState,
    clearNavigationHistory,
    isNavigating: state.isNavigating,
    canGoBack: state.canGoBack,
    currentScreen: state.currentScreen,
    previousScreen: state.previousScreen,
    routeHistory: state.routeHistory,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
};

// Custom hook for navigation utilities
export const useNavigation = () => {
  const context = useNavigationContext();
  
  return {
    navigate: context.navigateToScreen,
    goBack: context.goBack,
    reset: context.resetToScreen,
    canGoBack: context.canGoBack,
    currentScreen: context.currentScreen,
    previousScreen: context.previousScreen,
    isNavigating: context.isNavigating,
  };
};

// Custom hook for navigation history
export const useNavigationHistory = () => {
  const context = useNavigationContext();
  
  return {
    history: context.routeHistory,
    clearHistory: context.clearNavigationHistory,
    getState: context.getCurrentNavigationState,
  };
};

// Custom hook for deep linking
export const useDeepLinking = () => {
  const context = useNavigationContext();
  
  return {
    handleDeepLink: context.handleDeepLink,
    deepLinkData: context.navigationState.deepLinkData,
  };
};