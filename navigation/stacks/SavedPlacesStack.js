import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../contexts/ThemeContext';
import { PlaceholderScreen } from '../../screens/PlaceholderScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for saved places screens
 */
export function SavedPlacesStack() {
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
        name="SavedPlacesMain" 
        component={PlaceholderScreen}
        options={{ title: 'Saved Places' }}
        initialParams={{ screenName: 'Saved Places' }}
      />
    </Stack.Navigator>
  );
}