import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for authentication screens
 */
export function AuthStack() {
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
        name="Login" 
        component={PlaceholderScreen}
        options={{ title: 'Sign In' }}
        initialParams={{ screenName: 'Login' }}
      />
      <Stack.Screen 
        name="Signup" 
        component={PlaceholderScreen}
        options={{ title: 'Sign Up' }}
        initialParams={{ screenName: 'Sign Up' }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={PlaceholderScreen}
        options={{ title: 'Reset Password' }}
        initialParams={{ screenName: 'Forgot Password' }}
      />
    </Stack.Navigator>
  );
}