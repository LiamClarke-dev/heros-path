import { useCallback, useEffect, useRef } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useNavigationContext } from '../contexts/NavigationContext';

/**
 * Custom hook for managing map screen navigation integration
 * Handles navigation state synchronization and screen focus events
 * 
 * @returns {Object} Navigation utilities and state
 */
const useMapNavigation = () => {
  const navigation = useNavigation();
  const { navigationState, navigateToScreen } = useNavigationContext();
  const screenFocusedRef = useRef(false);

  // Handle screen focus/unfocus events
  useFocusEffect(
    useCallback(() => {
      screenFocusedRef.current = true;
      console.log('MapScreen focused - navigation state updated');
      
      return () => {
        screenFocusedRef.current = false;
        console.log('MapScreen unfocused - maintaining background state');
      };
    }, [])
  );

  // Navigation utilities with context tracking
  const navigateToJourneys = useCallback((context = null) => {
    console.log('Navigating to Journeys', context ? `from ${context}` : '');
    navigateToScreen('Journeys');
  }, [navigateToScreen]);

  const navigateToDiscoveries = useCallback((context = null) => {
    console.log('Navigating to Discoveries', context ? `from ${context}` : '');
    navigateToScreen('Discoveries');
  }, [navigateToScreen]);

  const navigateToSavedPlaces = useCallback((context = null) => {
    console.log('Navigating to Saved Places', context ? `from ${context}` : '');
    navigateToScreen('SavedPlaces');
  }, [navigateToScreen]);

  const navigateToSettings = useCallback((screen = null) => {
    if (screen) {
      navigation.navigate('Settings', { screen });
    } else {
      navigateToScreen('Settings');
    }
  }, [navigation, navigateToScreen]);

  const openDrawer = useCallback(() => {
    navigation.openDrawer();
  }, [navigation]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // Navigation state helpers
  const isScreenFocused = screenFocusedRef.current;
  const canGoBack = navigation.canGoBack();
  const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];

  return {
    // Navigation actions
    navigateToJourneys,
    navigateToDiscoveries,
    navigateToSavedPlaces,
    navigateToSettings,
    openDrawer,
    goBack,
    
    // Navigation state
    isScreenFocused,
    canGoBack,
    currentRoute,
    navigationState,
    
    // Raw navigation object for advanced usage
    navigation,
  };
};

export default useMapNavigation;