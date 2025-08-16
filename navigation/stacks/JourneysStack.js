import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../contexts/ThemeContext';
import PastJourneysScreen from '../../screens/PastJourneysScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for journey-related screens
 */
export function JourneysStack() {
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
        name="JourneysMain" 
        component={PastJourneysScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}