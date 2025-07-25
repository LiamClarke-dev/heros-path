import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
  
  const [state, setState] = useState({
    currentScreen: null,
    previousScreen: null,
    canGoBack: false,
    routeHistory: [],
    deepLinkData: null,
    navigationRef: null,
  });

  // Set navigation reference
  const setNavigationRef = useCallback((ref) => {
    setState(prevState => ({
      ...prevState,
      navigationRef: ref,
    }));
  }, []);

  // Navigate to screen with state tracking
  const navigateToScreen = useCallback((screenName, params = {}) => {
    if (!state.navigationRef) {
      console.warn('Navigation ref not available');
      return;
    }
    
    try {
      state.navigationRef.navigate(screenName, params);
      setState(prevState => ({
        ...prevState,
        previousScreen: prevState.currentScreen,
        currentScreen: screenName,
        routeHistory: [...prevState.routeHistory.slice(-9), screenName].filter(Boolean),
      }));
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to reset navigation
      state.navigationRef.reset({
        index: 0,
        routes: [{ name: 'Map' }],
      });
    }
  }, [state.navigationRef]);

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
        state.navigationRef.reset({
          index: 0,
          routes: [{ name: 'Map' }],
        });
      }
    } catch (error) {
      console.error('Go back error:', error);
      state.navigationRef.reset({
        index: 0,
        routes: [{ name: 'Map' }],
      });
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

  // Persist navigation state
  const persistNavigationState = useCallback(async () => {
    try {
      await AsyncStorage.setItem('navigationState', JSON.stringify({
        currentScreen: state.currentScreen,
        routeHistory: state.routeHistory,
      }));
    } catch (error) {
      console.error('Error persisting navigation state:', error);
    }
  }, [state]);

  // Restore navigation state
  const restoreNavigationState = useCallback(async () => {
    try {
      const savedState = await AsyncStorage.getItem('navigationState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setState(prevState => ({
          ...prevState,
          currentScreen: parsedState.currentScreen,
          routeHistory: parsedState.routeHistory || [],
        }));
        
        // Optionally navigate to the last screen
        if (parsedState.currentScreen) {
          navigateToScreen(parsedState.currentScreen);
        }
      }
    } catch (error) {
      console.error('Error restoring navigation state:', error);
    }
  }, [navigateToScreen]);

  const value = {
    navigationState: state,
    navigateToScreen,
    goBack,
    resetToScreen,
    handleDeepLink,
    persistNavigationState,
    restoreNavigationState,
    setNavigationRef,
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