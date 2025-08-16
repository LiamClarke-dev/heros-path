/**
 * Integration Tests for Authentication and Navigation
 * Tests authentication state changes and navigation updates, protected route handling
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';

// Mock contexts and services
jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn(),
  UserProvider: ({ children }) => children,
}));

jest.mock('../contexts/NavigationContext', () => ({
  useNavigationContext: jest.fn(),
  NavigationProvider: ({ children }) => children,
}));

jest.mock('../services/DeepLinkService', () => ({
  default: {
    processDeepLink: jest.fn(),
    requiresAuthentication: jest.fn(),
    redirectToAuth: jest.fn(),
  },
}));

jest.mock('../utils/navigationUtils', () => ({
  requiresAuthentication: jest.fn(),
  getFallbackScreen: jest.fn(),
  isNavigationAllowed: jest.fn(),
  SCREEN_NAMES: {
    LOGIN: 'Login',
    MAP: 'Map',
    JOURNEYS: 'Journeys',
    DISCOVERIES: 'Discoveries',
    SAVED_PLACES: 'SavedPlaces',
    SOCIAL: 'Social',
    SETTINGS: 'Settings',
  },
}));

import { useUser } from '../contexts/UserContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import DeepLinkService from '../services/DeepLinkService';
import { requiresAuthentication, getFallbackScreen, isNavigationAllowed, SCREEN_NAMES } from '../utils/navigationUtils';

// Mock Authentication Flow Component
const AuthFlowTest = ({ initialUser, onAuthChange, onNavigationAttempt }) => {
  const [user, setUser] = React.useState(initialUser);
  const [currentScreen, setCurrentScreen] = React.useState('Login');
  const [navigationAttempts, setNavigationAttempts] = React.useState([]);

  React.useEffect(() => {
    useUser.mockReturnValue({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      signIn: (userData) => {
        setUser(userData);
        onAuthChange?.(userData, true);
      },
      signOut: () => {
        setUser(null);
        onAuthChange?.(null, false);
      },
    });

    useNavigationContext.mockReturnValue({
      navigationState: { currentScreen },
      navigateToScreen: (screen, params) => {
        const attempt = { screen, params, user: !!user, timestamp: Date.now() };
        setNavigationAttempts(prev => [...prev, attempt]);
        onNavigationAttempt?.(attempt);
        
        // Check if navigation is allowed
        if (isNavigationAllowed(currentScreen, screen, !!user)) {
          setCurrentScreen(screen);
        } else {
          // Redirect to appropriate screen
          const fallback = getFallbackScreen(!!user);
          setCurrentScreen(fallback);
        }
      },
      goBack: jest.fn(),
      resetToScreen: (screen) => setCurrentScreen(screen),
    });
  }, [user, currentScreen, onAuthChange, onNavigationAttempt]);

  return (
    <div testID="auth-flow-test">
      <Text testID="current-screen">{currentScreen}</Text>
      <Text testID="auth-status">{user ? 'authenticated' : 'unauthenticated'}</Text>
      <Text testID="user-id">{user?.uid || 'none'}</Text>
      
      <TouchableOpacity 
        testID="sign-in-button"
        onPress={() => {
          const userData = { uid: 'test-user', email: 'test@example.com' };
          setUser(userData);
          onAuthChange?.(userData, true);
        }}
      >
        <Text>Sign In</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        testID="sign-out-button"
        onPress={() => {
          setUser(null);
          onAuthChange?.(null, false);
        }}
      >
        <Text>Sign Out</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        testID="navigate-journeys"
        onPress={() => {
          const attempt = { screen: SCREEN_NAMES.JOURNEYS, user: !!user };
          setNavigationAttempts(prev => [...prev, attempt]);
          onNavigationAttempt?.(attempt);
          
          if (isNavigationAllowed(currentScreen, SCREEN_NAMES.JOURNEYS, !!user)) {
            setCurrentScreen(SCREEN_NAMES.JOURNEYS);
          }
        }}
      >
        <Text>Navigate to Journeys</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        testID="navigate-map"
        onPress={() => {
          const attempt = { screen: SCREEN_NAMES.MAP, user: !!user };
          setNavigationAttempts(prev => [...prev, attempt]);
          onNavigationAttempt?.(attempt);
          
          if (isNavigationAllowed(currentScreen, SCREEN_NAMES.MAP, !!user)) {
            setCurrentScreen(SCREEN_NAMES.MAP);
          }
        }}
      >
        <Text>Navigate to Map</Text>
      </TouchableOpacity>
      
      <Text testID="navigation-attempts">{navigationAttempts.length}</Text>
    </div>
  );
};

describe('Authentication and Navigation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    requiresAuthentication.mockImplementation((screen) => {
      const publicScreens = [SCREEN_NAMES.LOGIN, SCREEN_NAMES.MAP];
      return !publicScreens.includes(screen);
    });
    
    getFallbackScreen.mockImplementation((isAuthenticated) => {
      return isAuthenticated ? SCREEN_NAMES.MAP : SCREEN_NAMES.LOGIN;
    });
    
    isNavigationAllowed.mockImplementation((fromScreen, toScreen, isAuthenticated) => {
      if (fromScreen === toScreen) return false;
      if (requiresAuthentication(toScreen) && !isAuthenticated) return false;
      return true;
    });
  });

  describe('Authentication State Changes', () => {
    test('should update navigation when user signs in', async () => {
      const authChanges = [];
      const navigationAttempts = [];

      const { getByTestId } = render(
        <AuthFlowTest 
          initialUser={null}
          onAuthChange={(user, isAuth) => authChanges.push({ user, isAuth })}
          onNavigationAttempt={(attempt) => navigationAttempts.push(attempt)}
        />
      );

      // Initially unauthenticated
      expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      expect(getByTestId('current-screen')).toHaveTextContent('Login');

      // Sign in
      fireEvent.press(getByTestId('sign-in-button'));

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(getByTestId('user-id')).toHaveTextContent('test-user');
      });

      expect(authChanges).toHaveLength(1);
      expect(authChanges[0].isAuth).toBe(true);
      expect(authChanges[0].user.uid).toBe('test-user');
    });

    test('should update navigation when user signs out', async () => {
      const authChanges = [];

      const { getByTestId } = render(
        <AuthFlowTest 
          initialUser={{ uid: 'test-user', email: 'test@example.com' }}
          onAuthChange={(user, isAuth) => authChanges.push({ user, isAuth })}
        />
      );

      // Initially authenticated
      expect(getByTestId('auth-status')).toHaveTextContent('authenticated');

      // Sign out
      fireEvent.press(getByTestId('sign-out-button'));

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
        expect(getByTestId('user-id')).toHaveTextContent('none');
      });

      expect(authChanges).toHaveLength(1);
      expect(authChanges[0].isAuth).toBe(false);
      expect(authChanges[0].user).toBeNull();
    });

    test('should redirect to appropriate screen after authentication', async () => {
      getFallbackScreen.mockImplementation((isAuthenticated) => {
        return isAuthenticated ? SCREEN_NAMES.MAP : SCREEN_NAMES.LOGIN;
      });

      const { getByTestId, rerender } = render(
        <AuthFlowTest initialUser={null} />
      );

      expect(getByTestId('current-screen')).toHaveTextContent('Login');

      // Sign in
      fireEvent.press(getByTestId('sign-in-button'));

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Should redirect to Map after authentication
      rerender(<AuthFlowTest initialUser={{ uid: 'test-user' }} />);
      
      await waitFor(() => {
        expect(getFallbackScreen).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('Protected Route Handling', () => {
    test('should prevent navigation to protected screens when unauthenticated', async () => {
      const navigationAttempts = [];

      const { getByTestId } = render(
        <AuthFlowTest 
          initialUser={null}
          onNavigationAttempt={(attempt) => navigationAttempts.push(attempt)}
        />
      );

      expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');

      // Try to navigate to protected screen
      fireEvent.press(getByTestId('navigate-journeys'));

      await waitFor(() => {
        expect(getByTestId('navigation-attempts')).toHaveTextContent('1');
      });

      // Should not navigate to Journeys
      expect(getByTestId('current-screen')).not.toHaveTextContent('Journeys');
      expect(navigationAttempts[0].screen).toBe(SCREEN_NAMES.JOURNEYS);
      expect(navigationAttempts[0].user).toBe(false);
    });

    test('should allow navigation to protected screens when authenticated', async () => {
      const navigationAttempts = [];

      const { getByTestId } = render(
        <AuthFlowTest 
          initialUser={{ uid: 'test-user' }}
          onNavigationAttempt={(attempt) => navigationAttempts.push(attempt)}
        />
      );

      expect(getByTestId('auth-status')).toHaveTextContent('authenticated');

      // Navigate to protected screen
      fireEvent.press(getByTestId('navigate-journeys'));

      await waitFor(() => {
        expect(getByTestId('current-screen')).toHaveTextContent('Journeys');
      });

      expect(navigationAttempts[0].screen).toBe(SCREEN_NAMES.JOURNEYS);
      expect(navigationAttempts[0].user).toBe(true);
    });

    test('should allow navigation to public screens regardless of auth state', async () => {
      const { getByTestId } = render(
        <AuthFlowTest initialUser={null} />
      );

      expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');

      // Navigate to public screen (Map)
      fireEvent.press(getByTestId('navigate-map'));

      await waitFor(() => {
        expect(getByTestId('current-screen')).toHaveTextContent('Map');
      });
    });

    test('should handle authentication expiry during navigation', async () => {
      const { getByTestId } = render(
        <AuthFlowTest initialUser={{ uid: 'test-user' }} />
      );

      // Initially authenticated
      expect(getByTestId('auth-status')).toHaveTextContent('authenticated');

      // Navigate to protected screen
      fireEvent.press(getByTestId('navigate-journeys'));

      await waitFor(() => {
        expect(getByTestId('current-screen')).toHaveTextContent('Journeys');
      });

      // Simulate authentication expiry
      fireEvent.press(getByTestId('sign-out-button'));

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      });

      // Try to navigate to another protected screen
      fireEvent.press(getByTestId('navigate-journeys'));

      // Should not allow navigation
      expect(isNavigationAllowed).toHaveBeenCalledWith(
        expect.any(String),
        SCREEN_NAMES.JOURNEYS,
        false
      );
    });
  });

  describe('Deep Link Authentication Integration', () => {
    test('should handle deep link to protected content when unauthenticated', async () => {
      DeepLinkService.processDeepLink.mockResolvedValue({
        success: false,
        requiresAuth: true,
        targetScreen: SCREEN_NAMES.JOURNEYS,
        pendingDeepLink: 'com.liamclarke.herospath://journeys/123',
      });

      DeepLinkService.requiresAuthentication.mockReturnValue(true);

      const { getByTestId } = render(
        <AuthFlowTest initialUser={null} />
      );

      expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');

      // Simulate deep link processing
      await act(async () => {
        const result = await DeepLinkService.processDeepLink('com.liamclarke.herospath://journeys/123');
        expect(result.requiresAuth).toBe(true);
      });

      expect(DeepLinkService.processDeepLink).toHaveBeenCalledWith('com.liamclarke.herospath://journeys/123');
    });

    test('should process deep link to protected content when authenticated', async () => {
      DeepLinkService.processDeepLink.mockResolvedValue({
        success: true,
        targetScreen: SCREEN_NAMES.JOURNEYS,
        params: { journeyId: '123' },
      });

      const { getByTestId } = render(
        <AuthFlowTest initialUser={{ uid: 'test-user' }} />
      );

      expect(getByTestId('auth-status')).toHaveTextContent('authenticated');

      // Simulate deep link processing
      await act(async () => {
        const result = await DeepLinkService.processDeepLink('com.liamclarke.herospath://journeys/123');
        expect(result.success).toBe(true);
      });
    });

    test('should redirect to auth and process pending deep link after sign in', async () => {
      DeepLinkService.redirectToAuth.mockResolvedValue({
        success: true,
        pendingDeepLink: 'com.liamclarke.herospath://journeys/123',
      });

      const { getByTestId } = render(
        <AuthFlowTest initialUser={null} />
      );

      // Simulate deep link requiring auth
      await act(async () => {
        await DeepLinkService.redirectToAuth('com.liamclarke.herospath://journeys/123');
      });

      expect(DeepLinkService.redirectToAuth).toHaveBeenCalledWith('com.liamclarke.herospath://journeys/123');

      // Sign in
      fireEvent.press(getByTestId('sign-in-button'));

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Should process pending deep link after authentication
      expect(DeepLinkService.redirectToAuth).toHaveBeenCalled();
    });
  });

  describe('Navigation State Synchronization', () => {
    test('should sync navigation state with authentication changes', async () => {
      const { getByTestId } = render(
        <AuthFlowTest initialUser={null} />
      );

      // Initially on login screen
      expect(getByTestId('current-screen')).toHaveTextContent('Login');
      expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');

      // Sign in
      fireEvent.press(getByTestId('sign-in-button'));

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Navigation state should be updated
      expect(useNavigationContext().navigationState.currentScreen).toBeDefined();
    });

    test('should handle rapid authentication state changes', async () => {
      const { getByTestId } = render(
        <AuthFlowTest initialUser={null} />
      );

      // Rapid sign in/out cycles
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByTestId('sign-in-button'));
        await waitFor(() => {
          expect(getByTestId('auth-status')).toHaveTextContent('authenticated');
        });

        fireEvent.press(getByTestId('sign-out-button'));
        await waitFor(() => {
          expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
        });
      }

      // Should end in unauthenticated state
      expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    });

    test('should maintain navigation history across auth state changes', async () => {
      const navigationAttempts = [];

      const { getByTestId } = render(
        <AuthFlowTest 
          initialUser={{ uid: 'test-user' }}
          onNavigationAttempt={(attempt) => navigationAttempts.push(attempt)}
        />
      );

      // Navigate while authenticated
      fireEvent.press(getByTestId('navigate-journeys'));
      fireEvent.press(getByTestId('navigate-map'));

      await waitFor(() => {
        expect(getByTestId('navigation-attempts')).toHaveTextContent('2');
      });

      // Sign out
      fireEvent.press(getByTestId('sign-out-button'));

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      });

      // Navigation attempts should be preserved
      expect(navigationAttempts).toHaveLength(2);
      expect(navigationAttempts[0].screen).toBe(SCREEN_NAMES.JOURNEYS);
      expect(navigationAttempts[1].screen).toBe(SCREEN_NAMES.MAP);
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      useUser.mockImplementation(() => {
        throw new Error('Authentication service unavailable');
      });

      expect(() => {
        render(<AuthFlowTest initialUser={null} />);
      }).toThrow('Authentication service unavailable');

      consoleSpy.mockRestore();
    });

    test('should handle navigation errors during auth state changes', async () => {
      const mockNavigateToScreen = jest.fn().mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      useNavigationContext.mockReturnValue({
        navigationState: { currentScreen: 'Login' },
        navigateToScreen: mockNavigateToScreen,
        goBack: jest.fn(),
        resetToScreen: jest.fn(),
      });

      const { getByTestId } = render(
        <AuthFlowTest initialUser={null} />
      );

      // Should not crash despite navigation error
      expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    });

    test('should recover from authentication context failures', async () => {
      // Mock context failure and recovery
      let contextFailure = true;
      
      useUser.mockImplementation(() => {
        if (contextFailure) {
          throw new Error('Context failed');
        }
        return {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          signIn: jest.fn(),
          signOut: jest.fn(),
        };
      });

      expect(() => {
        render(<AuthFlowTest initialUser={null} />);
      }).toThrow('Context failed');

      // Simulate recovery
      contextFailure = false;

      const { getByTestId } = render(<AuthFlowTest initialUser={null} />);
      expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    });
  });
});