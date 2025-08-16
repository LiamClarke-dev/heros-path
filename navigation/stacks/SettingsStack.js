import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../contexts/ThemeContext';
import SettingsScreen from '../../screens/SettingsScreen';
import DiscoveryPreferencesScreen from '../../screens/DiscoveryPreferencesScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for settings-related screens
 */
export function SettingsStack() {
  const { theme, navigationStyles } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true, // Ensure headers are shown
        headerStyle: navigationStyles.header,
        headerTintColor: navigationStyles.headerTint,
        headerTitleStyle: navigationStyles.headerTitle,
        headerBackTitleVisible: false, // Hide back title on iOS
        cardStyle: navigationStyles.cardStyle,
        // Enhanced transition animations
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 250,
            },
          },
        },
      }}
    >
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen}
        options={{ 
          title: 'Settings',
          headerShown: false, // Settings screen doesn't need header (accessed via drawer)
        }}
      />
      <Stack.Screen 
        name="DiscoveryPreferences" 
        component={DiscoveryPreferencesScreen}
        options={{ 
          title: 'Discovery Preferences',
          headerShown: true, // Show header with back button for preferences
        }}
      />
    </Stack.Navigator>
  );
}