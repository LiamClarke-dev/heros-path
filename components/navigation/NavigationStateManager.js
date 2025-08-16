/**
 * NavigationStateManager component for Hero's Path
 * Manages navigation state synchronization and provides navigation utilities
 * Requirements: 6.4, 6.5, 6.6
 */

import React, { useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useNavigationSync } from '../../hooks/useNavigationSync';
import { useNavigationContext } from '../../contexts/NavigationContext';
import { useUser } from '../../contexts/UserContext';

export const NavigationStateManager = ({ children }) => {
  const { 
    persistNavigationState, 
    restoreNavigationState,
    navigationState 
  } = useNavigationContext();
  
  const { isAuthenticated, loading: authLoading } = useUser();
  
  const {
    syncNavigationWithAuth,
    cleanupNavigationStack,
    navigationUIState
  } = useNavigationSync();

  /**
   * Handle app state changes for navigation persistence
   * Requirements: 6.7 - State persistence for app restart
   */
  const handleAppStateChange = useCallback((nextAppState) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App is going to background, persist navigation state
      persistNavigationState();
    } else if (nextAppState === 'active') {
      // App is becoming active, sync navigation state
      if (!authLoading) {
        syncNavigationWithAuth();
      }
    }
  }, [persistNavigationState, syncNavigationWithAuth, authLoading]);

  /**
   * Initialize navigation state on component mount
   */
  const initializeNavigationState = useCallback(async () => {
    try {
      // Restore previous navigation state
      const restoredScreen = await restoreNavigationState();
      
      if (restoredScreen) {
        console.log('Navigation state restored:', restoredScreen);
      }
      
      // Sync with current authentication state
      if (!authLoading) {
        syncNavigationWithAuth();
      }
      
    } catch (error) {
      console.error('Navigation state initialization error:', error);
    }
  }, [restoreNavigationState, syncNavigationWithAuth, authLoading]);

  /**
   * Handle navigation errors and recovery
   */
  const handleNavigationError = useCallback((error, errorInfo) => {
    console.error('Navigation error occurred:', error, errorInfo);
    
    // Log error for debugging
    if (__DEV__) {
      console.error('Navigation Error Stack:', error.stack);
      console.error('Navigation Error Info:', errorInfo);
    }
    
    // Attempt to recover by cleaning up navigation state
    cleanupNavigationStack();
    
    // Sync navigation to ensure we're in a valid state
    syncNavigationWithAuth();
  }, [cleanupNavigationStack, syncNavigationWithAuth]);

  // Initialize navigation state on mount
  useEffect(() => {
    initializeNavigationState();
  }, [initializeNavigationState]);

  // Set up app state listener for navigation persistence
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [handleAppStateChange]);

  // Sync navigation when authentication state changes
  useEffect(() => {
    if (!authLoading) {
      syncNavigationWithAuth();
    }
  }, [isAuthenticated, authLoading, syncNavigationWithAuth]);

  // Persist navigation state when it changes
  useEffect(() => {
    if (navigationState.currentScreen) {
      // Debounce persistence to avoid excessive writes
      const timeoutId = setTimeout(() => {
        persistNavigationState();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [navigationState.currentScreen, navigationState.routeHistory, persistNavigationState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Final persistence before unmount
      persistNavigationState();
      cleanupNavigationStack();
    };
  }, [persistNavigationState, cleanupNavigationStack]);

  // Provide navigation UI state to children through context if needed
  // For now, just render children as the state is available through hooks
  return (
    <>
      {children}
    </>
  );
};

export default NavigationStateManager;