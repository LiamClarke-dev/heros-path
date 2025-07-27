import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../contexts/ThemeContext';
import MapScreen from '../../screens/MapScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for map-related screens
 */
export function MapStack() {
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
        name="MapMain" 
        component={MapScreen}
        options={{ 
          title: 'Map',
          headerShown: false, // Map screen handles its own header
        }}
      />
    </Stack.Navigator>
  );
}