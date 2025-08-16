import React, { useRef, useEffect } from 'react';
import { NavigationContainer as RNNavigationContainer } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import { useUser } from '../contexts/UserContext';
import { AuthNavigator } from './AuthNavigator';
import { DEEP_LINK_PREFIXES, DEEP_LINK_CONFIG } from '../utils/deepLinkConfig';
import DeepLinkService from '../services/DeepLinkService';
// Performance monitoring temporarily disabled for initial navigation integration
// import { 
//   devicePerformanceTier, 
//   NavigationPerformanceMonitor,
//   navigationStackManager 
// } from '../utils/navigationPerformance';
// import { 
//   navigationTimingTracker,
//   NavigationTimingMonitor 
// } from '../utils/navigationTimingMonitor';
// import { NavigationStatePerformanceMonitor } from '../utils/navigationStateOptimizer';
// import { PerformanceBudgetMonitorComponent } from '../utils/performanceBudgetMonitor';
// import { NavigationPerformanceProvider } from '../utils/navigationPerformanceIntegration';

/**
 * Root navigation container that wraps the entire navigation tree
 * Provides navigation context, theme integration, and deep linking support
 */
export function NavigationContainer() {
  const { navigationTheme } = useTheme();
  const { setNavigationRef } = useNavigationContext();
  const userContext = useUser();
  const navigationRef = useRef();

  useEffect(() => {
    if (navigationRef.current) {
      setNavigationRef(navigationRef.current);
      
      // Initialize deep link service
      DeepLinkService.initialize(navigationRef, userContext);
      
      // Performance monitoring temporarily disabled
      // devicePerformanceTier.initialize().then(tier => {
      //   console.log(`📱 Navigation optimized for ${tier} device`);
      // });
    }

    // Cleanup on unmount
    return () => {
      DeepLinkService.cleanup();
    };
  }, [setNavigationRef, userContext]);
  
  // Enhanced deep linking configuration
  const linking = {
    prefixes: DEEP_LINK_PREFIXES,
    config: DEEP_LINK_CONFIG,
    
    // Custom URL parsing for better parameter handling
    getPathFromState: (state, config) => {
      // Use default implementation but add custom logic if needed
      return state;
    },
    
    // Custom state parsing for deep link URLs
    getStateFromPath: (path, config) => {
      // Use default implementation but add validation
      return path;
    },
  };
  
  return (
    <RNNavigationContainer 
      ref={navigationRef}
      theme={navigationTheme} 
      linking={linking}
      onReady={() => {
        console.log('Navigation container ready');
        // navigationTimingTracker.markPhase('navigation', 'container_ready', 'ready');
      }}
      onStateChange={(state) => {
        // Track navigation state changes for analytics and performance
        const currentRoute = state?.routes?.[state.index];
        if (currentRoute) {
          // navigationStackManager.trackNavigation(currentRoute.name, currentRoute.params);
          console.log('Navigation to:', currentRoute.name);
        }
        console.log('Navigation state changed:', state);
      }}
    >
      <AuthNavigator />
    </RNNavigationContainer>
  );
}