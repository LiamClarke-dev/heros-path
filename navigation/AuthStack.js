import React, { useEffect } from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { Platform, BackHandler } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { Logger } from '../utils/Logger';

const Stack = createStackNavigator();

/**
 * Stack navigator for authentication screens
 * Handles navigation between login/signup screens with proper back button handling
 * Integrates with UserContext for authentication state management
 */
export function AuthStack() {
  const { theme } = useTheme();
  const { isAuthenticated } = useUser();

  // Handle Android back button in auth flow
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Allow back navigation within auth stack, but prevent going back to main app
        // if user somehow ended up in auth stack while authenticated
        if (isAuthenticated) {
          Logger.log('AuthStack', 'Preventing back navigation while authenticated');
          return true; // Prevent default back behavior
        }
        return false; // Allow default back behavior
      });

      return () => backHandler.remove();
    }
  }, [isAuthenticated]);

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
          color: theme.colors.text,
        },
        headerBackTitleVisible: false,
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
        headerRightContainerStyle: {
          paddingRight: 16,
        },
        // Smooth transitions between auth screens
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
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
              duration: 250,
            },
          },
        },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={PlaceholderScreen}
        options={{ 
          title: 'Sign In',
          headerLeft: null, // No back button on login screen
        }}
        initialParams={{ 
          screenName: 'Login',
        }}
      />
      <Stack.Screen 
        name="Signup" 
        component={PlaceholderScreen}
        options={{ 
          title: 'Create Account',
          headerBackTitle: 'Sign In',
        }}
        initialParams={{ 
          screenName: 'Sign Up',
        }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={PlaceholderScreen}
        options={{ 
          title: 'Reset Password',
          headerBackTitle: 'Sign In',
        }}
        initialParams={{ 
          screenName: 'Reset Password',
        }}
      />
    </Stack.Navigator>
  );
}