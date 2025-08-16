/**
 * NavigationErrorIntegration component for Hero's Path
 * Integrates all navigation error handling components and services
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ComprehensiveErrorBoundary from './ComprehensiveErrorBoundary';
import AuthErrorHandler from './AuthErrorHandler';
import OfflineNavigationHandler from './OfflineNavigationHandler';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import NavigationErrorService from '../../services/NavigationErrorService';
import NavigationStateRecovery from '../../services/NavigationStateRecovery';
import NavigationRetryService from '../../services/NavigationRetryService';
import Logger from '../../utils/Logger';

const NavigationErrorIntegration = ({ 
  children,
  level = 'navigation',
  screenName,
  componentName,
  requireAuth = false,
  allowedOfflineRoutes = ['Map', 'Settings', 'PastJourneys'],
  onError,
  onAuthError,
  onNetworkChange,
  customActions,
  allowReload = true,
  enableStateRecovery = true,
  enableRetryLogic = true,
}) => {
  const navigation = useNavigation();
  const navigationRef = useRef(navigation);
  const theme = useTheme();
  const { user, isAuthenticated } = useUser();

  // Initialize error services with navigation reference
  useEffect(() => {
    if (navigationRef.current) {
      NavigationErrorService.setNavigationRef(navigationRef);
      
      if (enableStateRecovery) {
        NavigationStateRecovery.setNavigationRef(navigationRef);
      }
      
      if (enableRetryLogic) {
        NavigationRetryService.setNavigationRef(navigationRef);
      }

      Logger.info('Navigation error services initialized', {
        screenName,
        componentName,
        level,
      });
    }
  }, [navigation, enableStateRecovery, enableRetryLogic, screenName, componentName, level]);

  // Save navigation state periodically for recovery
  useEffect(() => {
    if (!enableStateRecovery) return;

    const saveStateInterval = setInterval(async () => {
      try {
        const currentState = navigationRef.current?.getRootState();
        if (currentState) {
          await NavigationStateRecovery.saveNavigationState(currentState);
        }
      } catch (error) {
        Logger.error('Failed to save navigation state', error);
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveStateInterval);
  }, [enableStateRecovery]);

  // Handle comprehensive errors
  const handleComprehensiveError = (error, errorInfo, context) => {
    Logger.navigationError(error, {
      ...context,
      integration: 'NavigationErrorIntegration',
      user: user?.id,
      isAuthenticated,
    });

    // Create checkpoint before handling error
    if (enableStateRecovery) {
      NavigationStateRecovery.createCheckpoint('error_occurred');
    }

    if (onError) {
      onError(error, errorInfo, context);
    }
  };

  // Handle authentication errors
  const handleAuthError = (error, context) => {
    Logger.authError(error, {
      ...context,
      integration: 'NavigationErrorIntegration',
      requireAuth,
      currentUser: user?.id,
    });

    if (onAuthError) {
      onAuthError(error, context);
    }
  };

  // Handle authentication recovery
  const handleAuthRecovery = () => {
    Logger.info('Authentication recovered in navigation integration', {
      user: user?.id,
      screenName,
    });

    // Restore navigation state if needed
    if (enableStateRecovery) {
      NavigationStateRecovery.restoreFromCheckpoint('before_auth_error');
    }
  };

  // Handle network state changes
  const handleNetworkChange = (networkState) => {
    Logger.info('Network state changed in navigation integration', {
      isConnected: networkState.isConnected,
      type: networkState.type,
      screenName,
      componentName,
    });

    // Adjust retry strategies based on network state
    if (enableRetryLogic) {
      const retryStatus = NavigationRetryService.getRetryStatus();
      
      if (!networkState.isConnected && retryStatus.queueLength > 0) {
        Logger.info('Network disconnected - adjusting retry queue', {
          queueLength: retryStatus.queueLength,
        });
      }
    }

    if (onNetworkChange) {
      onNetworkChange(networkState);
    }
  };

  // Handle offline navigation attempts
  const handleOfflineNavigation = (routeName, allowedRoutes) => {
    Logger.warn('Offline navigation attempt in integration', {
      attemptedRoute: routeName,
      allowedRoutes,
      screenName,
    });

    // Create checkpoint before redirecting
    if (enableStateRecovery) {
      NavigationStateRecovery.createCheckpoint('offline_redirect');
    }
  };

  // Get current route information
  const getCurrentRoute = () => {
    try {
      return navigationRef.current?.getCurrentRoute();
    } catch (error) {
      Logger.error('Failed to get current route', error);
      return null;
    }
  };

  const currentRoute = getCurrentRoute();

  return (
    <ComprehensiveErrorBoundary
      level={level}
      screenName={screenName || currentRoute?.name}
      componentName={componentName}
      route={currentRoute}
      navigation={navigation}
      onError={handleComprehensiveError}
      customActions={customActions}
      allowReload={allowReload}
    >
      <AuthErrorHandler
        requireAuth={requireAuth}
        onAuthError={handleAuthError}
        onAuthRecovery={handleAuthRecovery}
        fallbackRoute={allowedOfflineRoutes[0]}
      >
        <OfflineNavigationHandler
          allowedOfflineRoutes={allowedOfflineRoutes}
          onOfflineNavigation={handleOfflineNavigation}
          onNetworkChange={handleNetworkChange}
          showOfflineWarnings={true}
        >
          {children}
        </OfflineNavigationHandler>
      </AuthErrorHandler>
    </ComprehensiveErrorBoundary>
  );
};

// HOC for easy integration with any component
export const withNavigationErrorIntegration = (WrappedComponent, options = {}) => {
  const ComponentWithErrorIntegration = React.forwardRef((props, ref) => {
    return (
      <NavigationErrorIntegration
        level={options.level || 'component'}
        screenName={options.screenName || props.route?.name}
        componentName={options.componentName || WrappedComponent.displayName || WrappedComponent.name}
        requireAuth={options.requireAuth}
        allowedOfflineRoutes={options.allowedOfflineRoutes}
        onError={options.onError}
        onAuthError={options.onAuthError}
        onNetworkChange={options.onNetworkChange}
        customActions={options.customActions}
        allowReload={options.allowReload}
        enableStateRecovery={options.enableStateRecovery}
        enableRetryLogic={options.enableRetryLogic}
      >
        <WrappedComponent {...props} ref={ref} />
      </NavigationErrorIntegration>
    );
  });

  ComponentWithErrorIntegration.displayName = `withNavigationErrorIntegration(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ComponentWithErrorIntegration;
};

// Hook for accessing navigation error integration features
export const useNavigationErrorIntegration = () => {
  const navigation = useNavigation();
  
  const createCheckpoint = async (label) => {
    try {
      return await NavigationStateRecovery.createCheckpoint(label);
    } catch (error) {
      Logger.error('Failed to create navigation checkpoint', error);
      return false;
    }
  };

  const recoverFromCheckpoint = async (label) => {
    try {
      return await NavigationStateRecovery.restoreFromCheckpoint(label);
    } catch (error) {
      Logger.error('Failed to recover from checkpoint', error);
      return false;
    }
  };

  const retryNavigation = async (routeName, params, options) => {
    try {
      return await NavigationRetryService.retryNavigate(routeName, params, options);
    } catch (error) {
      Logger.error('Failed to retry navigation', error);
      return null;
    }
  };

  const getErrorStats = () => {
    return {
      navigationErrors: NavigationErrorService.getErrorStats(),
      retryStatus: NavigationRetryService.getRetryStatus(),
      stateRecovery: NavigationStateRecovery.getStateStats(),
    };
  };

  return {
    navigation,
    createCheckpoint,
    recoverFromCheckpoint,
    retryNavigation,
    getErrorStats,
  };
};

export default NavigationErrorIntegration;