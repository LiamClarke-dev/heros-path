import React, { useEffect, useRef } from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { Animated } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { MainNavigator } from './MainNavigator';
import { AuthStack } from './AuthStack';
import { LoadingScreen } from '../screens/LoadingScreen';
import Logger from '../utils/Logger';

const Stack = createStackNavigator();

/**
 * Authentication-based navigation router
 * Determines whether to show authenticated or unauthenticated navigation flows
 * Handles smooth transitions between auth states and loading states
 */
export function AuthNavigator() {
  const { user, isLoading, isAuthenticated } = useUser();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const previousAuthState = useRef(isAuthenticated);

  // Handle authentication state changes with smooth transitions
  useEffect(() => {
    if (previousAuthState.current !== isAuthenticated && !isLoading) {
      Logger.info('AuthNavigator', `Authentication state changed: ${previousAuthState.current} -> ${isAuthenticated}`);
      
      // Fade out and in for smooth transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      previousAuthState.current = isAuthenticated;
    }
  }, [isAuthenticated, isLoading, fadeAnim]);

  // Show loading screen during authentication checks
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          // Smooth transitions between auth states
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 300,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 200,
              },
            },
          },
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen 
            name="Main" 
            component={MainNavigator}
            options={{
              animationEnabled: true,
              gestureEnabled: false, // Prevent swipe back to auth
            }}
          />
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthStack}
            options={{
              animationEnabled: true,
              gestureEnabled: true,
            }}
          />
        )}
      </Stack.Navigator>
    </Animated.View>
  );
}