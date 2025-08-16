/**
 * Protected Route Component
 * Handles authentication requirements for deep-linked routes
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DeepLinkAuthPrompt } from './DeepLinkAuthPrompt';

/**
 * Protected Route Wrapper
 * Ensures user is authenticated before rendering protected content
 * @param {Object} props - Component props
 * @param {React.Component} props.children - Child components to render when authenticated
 * @param {boolean} props.requiresAuth - Whether authentication is required
 * @param {string} props.fallbackScreen - Screen to navigate to if not authenticated
 * @param {string} props.authMessage - Custom message for authentication prompt
 */
export function ProtectedRoute({ 
  children, 
  requiresAuth = true, 
  fallbackScreen = 'Map',
  authMessage = null 
}) {
  const { user, isLoading } = useUser();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);

  useEffect(() => {
    if (!requiresAuth) {
      return; // No authentication required
    }

    if (isLoading) {
      return; // Still checking authentication status
    }

    if (!user) {
      // User is not authenticated, show prompt or redirect
      const routeData = {
        screen: route.name,
        params: route.params,
        timestamp: Date.now(),
      };
      
      setPendingRoute(routeData);
      setShowAuthPrompt(true);
    } else {
      // User is authenticated, clear any pending state
      setShowAuthPrompt(false);
      setPendingRoute(null);
    }
  }, [user, isLoading, requiresAuth, route.name, route.params]);

  const handleSignIn = () => {
    setShowAuthPrompt(false);
    navigation.navigate('Auth', {
      screen: 'Login',
      params: {
        returnTo: pendingRoute,
        message: authMessage || 'Please sign in to access this content',
      },
    });
  };

  const handleCancel = () => {
    setShowAuthPrompt(false);
    setPendingRoute(null);
    
    // Navigate to fallback screen
    navigation.navigate('Main', {
      screen: 'CoreFeatures',
      params: { screen: fallbackScreen },
    });
  };

  // Show loading while checking authentication
  if (requiresAuth && isLoading) {
    return <LoadingScreen />;
  }

  // Show authentication prompt if needed
  if (requiresAuth && !user && showAuthPrompt) {
    return (
      <DeepLinkAuthPrompt
        visible={true}
        message={authMessage}
        pendingDeepLink={pendingRoute}
        onSignIn={handleSignIn}
        onCancel={handleCancel}
      />
    );
  }

  // Render children if authenticated or authentication not required
  if (!requiresAuth || user) {
    return children;
  }

  // Fallback: redirect to home
  useEffect(() => {
    handleCancel();
  }, []);

  return null;
}

/**
 * Loading screen component
 */
function LoadingScreen() {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    text: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

/**
 * Hook for managing protected route state
 * @param {boolean} requiresAuth - Whether the current route requires authentication
 * @returns {Object} Protected route utilities
 */
export function useProtectedRoute(requiresAuth = true) {
  const { user, isLoading } = useUser();
  const navigation = useNavigation();
  const route = useRoute();

  const [authenticationRequired, setAuthenticationRequired] = useState(false);

  useEffect(() => {
    if (!requiresAuth) {
      setAuthenticationRequired(false);
      return;
    }

    if (isLoading) {
      return;
    }

    setAuthenticationRequired(!user);
  }, [user, isLoading, requiresAuth]);

  /**
   * Navigate to authentication screen with return route
   * @param {string} message - Custom authentication message
   */
  const requireAuthentication = (message = null) => {
    const returnRoute = {
      screen: route.name,
      params: route.params,
      timestamp: Date.now(),
    };

    navigation.navigate('Auth', {
      screen: 'Login',
      params: {
        returnTo: returnRoute,
        message: message || 'Please sign in to continue',
      },
    });
  };

  /**
   * Check if user has permission for specific action
   * @param {string} permission - Permission to check
   * @returns {boolean} Whether user has permission
   */
  const hasPermission = (permission) => {
    if (!user) return false;

    // Basic permission checking - can be extended
    const userPermissions = user.permissions || [];
    return userPermissions.includes(permission) || user.role === 'admin';
  };

  return {
    isAuthenticated: !!user,
    isLoading,
    authenticationRequired,
    requireAuthentication,
    hasPermission,
    user,
  };
}

/**
 * Higher-order component for protecting routes
 * @param {React.Component} Component - Component to protect
 * @param {Object} options - Protection options
 * @returns {React.Component} Protected component
 */
export function withProtectedRoute(Component, options = {}) {
  const {
    requiresAuth = true,
    fallbackScreen = 'Map',
    authMessage = null,
    permissions = [],
  } = options;

  return function ProtectedComponent(props) {
    const { user } = useUser();

    // Check permissions if user is authenticated
    const hasRequiredPermissions = () => {
      if (permissions.length === 0) return true;
      if (!user) return false;

      const userPermissions = user.permissions || [];
      return permissions.every(permission => 
        userPermissions.includes(permission) || user.role === 'admin'
      );
    };

    return (
      <ProtectedRoute
        requiresAuth={requiresAuth}
        fallbackScreen={fallbackScreen}
        authMessage={authMessage}
      >
        {hasRequiredPermissions() ? (
          <Component {...props} />
        ) : (
          <PermissionDeniedScreen requiredPermissions={permissions} />
        )}
      </ProtectedRoute>
    );
  };
}

/**
 * Permission denied screen
 */
function PermissionDeniedScreen({ requiredPermissions }) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    message: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    permissions: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.message}>
        You don't have permission to access this content.
      </Text>
      {requiredPermissions.length > 0 && (
        <Text style={styles.permissions}>
          Required permissions: {requiredPermissions.join(', ')}
        </Text>
      )}
    </View>
  );
}