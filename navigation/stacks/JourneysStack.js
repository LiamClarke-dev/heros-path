import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../contexts/ThemeContext';
import PastJourneysScreen from '../../screens/PastJourneysScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for journey-related screens
 */
export function JourneysStack() {
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
        name="JourneysMain" 
        component={PastJourneysScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}