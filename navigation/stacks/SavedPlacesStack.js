import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../contexts/ThemeContext';
import { PlaceholderScreen } from '../../screens/PlaceholderScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for saved places screens
 */
export function SavedPlacesStack() {
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
        name="SavedPlacesMain" 
        component={PlaceholderScreen}
        options={{ title: 'Saved Places' }}
        initialParams={{ screenName: 'Saved Places' }}
      />
    </Stack.Navigator>
  );
}