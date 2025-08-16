/**
 * App Navigator - Root Navigation Component
 * 
 * Handles the main navigation structure for the app.
 * Starts with simple stack navigation - can upgrade to drawer later if needed.
 * Follows ADR-007: Stack Navigation First
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';

// Import screens
import SignInScreen from '../screens/SignInScreen';
import MapScreen from '../screens/MapScreen';
import JourneyHistoryScreen from '../screens/JourneyHistoryScreen';

const Stack = createStackNavigator();

/**
 * Authentication Navigator
 * 
 * Handles navigation for unauthenticated users
 */
const AuthNavigator = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Custom headers will be added in individual screens
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
    </Stack.Navigator>
  );
};

/**
 * Main Navigator
 * 
 * Handles navigation for authenticated users
 * Simple stack navigation for MVP - can upgrade to drawer/tab navigation later
 */
const MainNavigator = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTitleStyle: {
          ...theme.typography.h3,
          color: theme.colors.text,
        },
        headerTintColor: theme.colors.primary,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          title: 'Hero\'s Path',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="JourneyHistory" 
        component={JourneyHistoryScreen}
        options={{
          title: 'Journey History',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

/**
 * Root App Navigator
 * 
 * Determines which navigator to show based on authentication state
 * For now, shows MainNavigator (auth will be implemented in Task 4)
 */
const AppNavigator = () => {
  const { theme } = useTheme();
  
  // TODO: Replace with actual authentication state from Task 4
  // const { user, loading } = useAuth();
  const user = true; // Temporary - show main app for navigation testing
  const loading = false;

  // Loading state (will be implemented with actual auth)
  if (loading) {
    return null; // TODO: Add loading screen component in Task 3.3
  }

  return (
    <NavigationContainer
      theme={{
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.error,
        },
      }}
    >
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;