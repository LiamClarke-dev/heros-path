import React, { useRef, useEffect } from 'react';
import { NavigationContainer as RNNavigationContainer } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import { AuthNavigator } from './AuthNavigator';

/**
 * Root navigation container that wraps the entire navigation tree
 * Provides navigation context and theme integration
 */
export function NavigationContainer() {
  const { navigationTheme } = useTheme();
  const { setNavigationRef } = useNavigationContext();
  const navigationRef = useRef();

  useEffect(() => {
    if (navigationRef.current) {
      setNavigationRef(navigationRef.current);
    }
  }, [setNavigationRef]);
  
  // Deep linking configuration
  const linking = {
    prefixes: ['com.liamclarke.herospath://', 'https://herospath.app'],
    config: {
      screens: {
        Main: {
          screens: {
            CoreFeatures: {
              screens: {
                Map: 'map',
                Journeys: 'journeys',
                Discoveries: 'discoveries',
                SavedPlaces: 'saved-places',
              },
            },
            Social: 'social',
            Settings: 'settings',
          },
        },
        Auth: {
          screens: {
            Login: 'login',
            Signup: 'signup',
            ForgotPassword: 'forgot-password',
          },
        },
      },
    },
  };
  
  return (
    <RNNavigationContainer 
      ref={navigationRef}
      theme={navigationTheme} 
      linking={linking}
    >
      <AuthNavigator />
    </RNNavigationContainer>
  );
}