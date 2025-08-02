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
        headerStyle: {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="DiscoveryPreferences" 
        component={DiscoveryPreferencesScreen}
        options={{ title: 'Discovery Preferences' }}
      />
    </Stack.Navigator>
  );
}