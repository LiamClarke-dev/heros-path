import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useUser } from '../contexts/UserContext';
import { MainNavigator } from './MainNavigator';
import { AuthStack } from './AuthStack';
import { LoadingScreen } from '../screens/LoadingScreen';

const Stack = createStackNavigator();

/**
 * Authentication-based navigation router
 * Determines whether to show authenticated or unauthenticated navigation flows
 */
export function AuthNavigator() {
  const { user, isLoading } = useUser();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}