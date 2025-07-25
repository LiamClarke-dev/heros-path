import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../contexts/ThemeContext';
import { PlaceholderScreen } from '../../screens/PlaceholderScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for social-related screens
 */
export function SocialStack() {
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
        name="SocialMain" 
        component={PlaceholderScreen}
        options={{ title: 'Social' }}
        initialParams={{ screenName: 'Social' }}
      />
    </Stack.Navigator>
  );
}