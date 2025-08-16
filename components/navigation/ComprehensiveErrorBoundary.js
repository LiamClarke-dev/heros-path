/**
 * ComprehensiveErrorBoundary component for Hero's Path
 * Combines all error handling strategies for navigation components
 * Requirements: 10.1, 10.2, 10.7
 */

import React from 'react';
import { View } from 'react-native';
import NavigationErrorBoundary from './NavigationErrorBoundary';
import ScreenErrorBoundary from './ScreenErrorBoundary';
import NetworkErrorHandler from './NetworkErrorHandler';
import { useTheme } from '../../contexts/ThemeContext';
import NavigationErrorService from '../../services/NavigationErrorService';
import Logger from '../../utils/Logger';

const ComprehensiveErrorBoundary = ({ 
  children, 
  level = 'navigation', // 'navigation', 'screen', 'component'
  screenName,
  componentName,
  route,
  navigation,
  onError,
  onNetworkChange,
  customActions,
  allowReload = true,
}) => {
  const theme = useTheme();

  const handleError = (error, errorInfo) => {
    // Log the error with context
    const context = {
      level,
      screenName,
      componentName,
      route: route?.name,
      params: route?.params,
      errorInfo,
    };

    Logger.navigationError(error, context);

    // Report to parent if callback provided
    if (onError) {
      onError(error, errorInfo, context);
    }
  };

  const handleNetworkChange = (networkState) => {
    Logger.info('Network state changed in error boundary', {
      level,
      screenName,
      componentName,
      networkState: {
        isConnected: networkState.isConnected,
        type: networkState.type,
      },
    });

    if (onNetworkChange) {
      onNetworkChange(networkState);
    }
  };

  // Choose the appropriate error boundary based on level
  const renderErrorBoundary = () => {
    switch (level) {
      case 'screen':
        return (
          <ScreenErrorBoundary
            screenName={screenName}
            route={route?.name}
            params={route?.params}
            navigation={navigation}
            theme={theme}
            allowReload={allowReload}
            customActions={customActions}
            onError={handleError}
          >
            {children}
          </ScreenErrorBoundary>
        );

      case 'component':
        return (
          <NavigationErrorBoundary
            componentName={componentName}
            currentRoute={route?.name}
            theme={theme}
            onError={handleError}
          >
            {children}
          </NavigationErrorBoundary>
        );

      case 'navigation':
      default:
        return (
          <NavigationErrorBoundary
            componentName={componentName || 'NavigationRoot'}
            currentRoute={route?.name}
            theme={theme}
            onError={handleError}
          >
            {children}
          </NavigationErrorBoundary>
        );
    }
  };

  return (
    <NetworkErrorHandler onNetworkChange={handleNetworkChange}>
      {renderErrorBoundary()}
    </NetworkErrorHandler>
  );
};

// HOC for easy wrapping of components
export const withComprehensiveErrorBoundary = (WrappedComponent, options = {}) => {
  const ComponentWithErrorBoundary = React.forwardRef((props, ref) => {
    const theme = useTheme();
    
    return (
      <ComprehensiveErrorBoundary
        level={options.level || 'component'}
        screenName={options.screenName || props.route?.name}
        componentName={options.componentName || WrappedComponent.displayName || WrappedComponent.name}
        route={props.route}
        navigation={props.navigation}
        theme={theme}
        onError={options.onError}
        onNetworkChange={options.onNetworkChange}
        customActions={options.customActions}
        allowReload={options.allowReload}
      >
        <WrappedComponent {...props} ref={ref} />
      </ComprehensiveErrorBoundary>
    );
  });

  ComponentWithErrorBoundary.displayName = `withComprehensiveErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ComponentWithErrorBoundary;
};

// Hook for accessing error boundary context
export const useErrorBoundary = () => {
  const throwError = (error) => {
    // This will be caught by the nearest error boundary
    throw error;
  };

  const reportError = (error, context = {}) => {
    Logger.navigationError(error, context);
    NavigationErrorService.handleNavigationError(error, context);
  };

  return {
    throwError,
    reportError,
  };
};

export default ComprehensiveErrorBoundary;