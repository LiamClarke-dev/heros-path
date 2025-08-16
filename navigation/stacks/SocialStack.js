import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../contexts/ThemeContext';
import { PlaceholderScreen } from '../../screens/PlaceholderScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for social-related screens
 */
export function SocialStack() {
  const { theme, navigationStyles } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: navigationStyles.header,
        headerTintColor: navigationStyles.headerTint,
        headerTitleStyle: navigationStyles.headerTitle,
        headerBackTitleVisible: false,
        cardStyle: navigationStyles.cardStyle,
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 300 } },
          close: { animation: 'timing', config: { duration: 250 } },
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