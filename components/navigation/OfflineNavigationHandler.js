/**
 * OfflineNavigationHandler component for Hero's Path
 * Handles navigation limitations and functionality when offline
 * Requirements: 10.3, 10.8
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Logger from '../../utils/Logger';

const OfflineNavigationHandler = ({ 
  children, 
  allowedOfflineRoutes = ['Map', 'Settings', 'PastJourneys'],
  onOfflineNavigation,
  showOfflineWarnings = true,
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState('unknown');
  const [offlineAttempts, setOfflineAttempts] = useState([]);
  
  const theme = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      setNetworkType(state.type);

      Logger.info('Network state changed in offline handler', {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });
    });

    return () => unsubscribe();
  }, []);

  // Monitor navigation state changes when offline
  useFocusEffect(
    useCallback(() => {
      if (!isConnected) {
        const currentRoute = navigation.getState()?.routes?.slice(-1)[0];
        
        if (currentRoute && !isRouteAllowedOffline(currentRoute.name)) {
          handleOfflineNavigationAttempt(currentRoute.name);
        }
      }
    }, [isConnected, navigation])
  );

  const isRouteAllowedOffline = (routeName) => {
    return allowedOfflineRoutes.includes(routeName);
  };

  const handleOfflineNavigationAttempt = useCallback((routeName) => {
    const attempt = {
      routeName,
      timestamp: new Date().toISOString(),
      id: Date.now(),
    };

    setOfflineAttempts(prev => [...prev, attempt]);

    Logger.warn('Offline navigation attempt blocked', {
      routeName,
      allowedRoutes: allowedOfflineRoutes,
    });

    if (onOfflineNavigation) {
      onOfflineNavigation(routeName, allowedOfflineRoutes);
    }

    if (showOfflineWarnings) {
      showOfflineNavigationWarning(routeName);
    }

    // Redirect to an allowed offline route
    redirectToOfflineRoute();
  }, [allowedOfflineRoutes, onOfflineNavigation, showOfflineWarnings]);

  const showOfflineNavigationWarning = (routeName) => {
    Alert.alert(
      'Offline Mode',
      `The ${routeName} screen requires an internet connection. You've been redirected to an available offline feature.`,
      [
        {
          text: 'OK',
          style: 'default',
        },
        {
          text: 'View Offline Features',
          onPress: showOfflineFeatures,
        },
      ]
    );
  };

  const showOfflineFeatures = () => {
    const offlineFeaturesList = allowedOfflineRoutes
      .map(route => `• ${route}`)
      .join('\n');

    Alert.alert(
      'Available Offline Features',
      `While offline, you can access:\n\n${offlineFeaturesList}\n\nOther features will be available when you reconnect to the internet.`,
      [{ text: 'OK' }]
    );
  };

  const redirectToOfflineRoute = () => {
    try {
      // Try to navigate to the first allowed offline route
      const fallbackRoute = allowedOfflineRoutes[0];
      
      if (fallbackRoute && navigation.navigate) {
        navigation.navigate(fallbackRoute);
        
        Logger.info('Redirected to offline route', {
          route: fallbackRoute,
          reason: 'offline_navigation_blocked',
        });
      }
    } catch (error) {
      Logger.error('Failed to redirect to offline route', error);
    }
  };

  // Intercept navigation actions when offline
  const interceptNavigation = useCallback((action) => {
    if (!isConnected) {
      const targetRoute = action.payload?.name || action.routeName;
      
      if (targetRoute && !isRouteAllowedOffline(targetRoute)) {
        Logger.warn('Navigation intercepted - offline restriction', {
          targetRoute,
          action: action.type,
        });

        handleOfflineNavigationAttempt(targetRoute);
        return false; // Block the navigation
      }
    }
    
    return true; // Allow the navigation
  }, [isConnected, handleOfflineNavigationAttempt]);

  // Enhanced navigation methods that respect offline limitations
  const enhancedNavigation = {
    ...navigation,
    navigate: (name, params) => {
      if (!isConnected && !isRouteAllowedOffline(name)) {
        handleOfflineNavigationAttempt(name);
        return;
      }
      
      return navigation.navigate(name, params);
    },
    push: (name, params) => {
      if (!isConnected && !isRouteAllowedOffline(name)) {
        handleOfflineNavigationAttempt(name);
        return;
      }
      
      return navigation.push(name, params);
    },
    replace: (name, params) => {
      if (!isConnected && !isRouteAllowedOffline(name)) {
        handleOfflineNavigationAttempt(name);
        return;
      }
      
      return navigation.replace(name, params);
    },
  };

  const getOfflineStatus = () => {
    return {
      isConnected,
      networkType,
      allowedRoutes: allowedOfflineRoutes,
      blockedAttempts: offlineAttempts.length,
      recentAttempts: offlineAttempts.slice(-5),
    };
  };

  // Provide enhanced navigation context to children
  const contextValue = {
    navigation: enhancedNavigation,
    isOffline: !isConnected,
    networkType,
    allowedOfflineRoutes,
    isRouteAllowedOffline,
    getOfflineStatus,
  };

  return (
    <OfflineNavigationContext.Provider value={contextValue}>
      <View style={styles.container}>
        {children}
        
        {/* Offline Status Indicator */}
        {!isConnected && (
          <View style={[styles.offlineIndicator, { backgroundColor: theme.colors.error }]}>
            <Text style={styles.offlineText}>
              Offline Mode - Limited Features Available
            </Text>
          </View>
        )}
      </View>
    </OfflineNavigationContext.Provider>
  );
};

// Context for accessing offline navigation state
const OfflineNavigationContext = React.createContext(null);

export const useOfflineNavigation = () => {
  const context = React.useContext(OfflineNavigationContext);
  
  if (!context) {
    throw new Error('useOfflineNavigation must be used within OfflineNavigationHandler');
  }
  
  return context;
};

// HOC for wrapping screens with offline navigation handling
export const withOfflineNavigation = (WrappedComponent, options = {}) => {
  return React.forwardRef((props, ref) => {
    return (
      <OfflineNavigationHandler
        allowedOfflineRoutes={options.allowedOfflineRoutes}
        onOfflineNavigation={options.onOfflineNavigation}
        showOfflineWarnings={options.showOfflineWarnings}
      >
        <WrappedComponent {...props} ref={ref} />
      </OfflineNavigationHandler>
    );
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default OfflineNavigationHandler;