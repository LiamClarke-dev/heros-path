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
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true, // Ensure headers are shown
        headerStyle: {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerBackTitleVisible: false, // Hide back title on iOS
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