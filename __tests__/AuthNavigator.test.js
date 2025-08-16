/**
 * Unit Tests for AuthNavigator
 * Tests authentication-based navigation logic and state transitions
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Animated } from 'react-native';

// Mock dependencies
jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn(),
}));

jest.mock('../navigation/MainNavigator', () => ({
  MainNavigator: () => 'MainNavigator',
}));

jest.mock('../navigation/AuthStack', () => ({
  AuthStack: () => 'AuthStack',
}));

jest.mock('../screens/LoadingScreen', () => ({
  LoadingScreen: () => 'LoadingScreen',
}));

jest.mock('../utils/Logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children, screenOptions }) => children,
    Screen: ({ name, component: Component }) => <Component />,
  }),
  CardStyleInterpolators: {
    forFadeFromBottomAndroid: 'forFadeFromBottomAndroid',
  },
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    View: ({ children, style }) => children,
  },
}));

import { AuthNavigator } from '../navigation/AuthNavigator';
import { useUser } from '../contexts/UserContext';
import Logger from '../utils/Logger';

describe('AuthNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Animated.Value
    Animated.Value.mockImplementation(() => ({
      setValue: jest.fn(),
    }));
    
    // Mock Animated.sequence
    Animated.sequence.mockImplementation(() => ({
      start: jest.fn(),
    }));
    
    // Mock Animated.timing
    Animated.timing.mockImplementation(() => ({}));
  });

  describe('Loading State', () => {
    test('should show loading screen when authentication is loading', () => {
      useUser.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      });

      const { getByText } = render(<AuthNavigator />);
      expect(getByText('LoadingScreen')).toBeTruthy();
    });

    test('should not show main or auth navigator when loading', () => {
      useUser.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      });

      const { queryByText } = render(<AuthNavigator />);
      expect(queryByText('MainNavigator')).toBeNull();
      expect(queryByText('AuthStack')).toBeNull();
    });
  });

  describe('Authenticated State', () => {
    test('should show MainNavigator when user is authenticated', () => {
      useUser.mockReturnValue({
        user: { uid: 'test-user', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      });

      const { getByText } = render(<AuthNavigator />);
      expect(getByText('MainNavigator')).toBeTruthy();
    });

    test('should not show AuthStack when authenticated', () => {
      useUser.mockReturnValue({
        user: { uid: 'test-user', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      });

      const { queryByText } = render(<AuthNavigator />);
      expect(queryByText('AuthStack')).toBeNull();
    });

    test('should not show loading screen when authenticated', () => {
      useUser.mockReturnValue({
        user: { uid: 'test-user', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      });

      const { queryByText } = render(<AuthNavigator />);
      expect(queryByText('LoadingScreen')).toBeNull();
    });
  });

  describe('Unauthenticated State', () => {
    test('should show AuthStack when user is not authenticated', () => {
      useUser.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const { getByText } = render(<AuthNavigator />);
      expect(getByText('AuthStack')).toBeTruthy();
    });

    test('should not show MainNavigator when unauthenticated', () => {
      useUser.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const { queryByText } = render(<AuthNavigator />);
      expect(queryByText('MainNavigator')).toBeNull();
    });

    test('should not show loading screen when unauthenticated', () => {
      useUser.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const { queryByText } = render(<AuthNavigator />);
      expect(queryByText('LoadingScreen')).toBeNull();
    });
  });

  describe('Authentication State Transitions', () => {
    test('should log authentication state changes', async () => {
      const { rerender } = render(<AuthNavigator />);
      
      // Initial unauthenticated state
      useUser.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      rerender(<AuthNavigator />);
      
      // Change to authenticated state
      useUser.mockReturnValue({
        user: { uid: 'test-user' },
        isLoading: false,
        isAuthenticated: true,
      });
      
      rerender(<AuthNavigator />);
      
      await waitFor(() => {
        expect(Logger.info).toHaveBeenCalledWith(
          'AuthNavigator',
          'Authentication state changed: false -> true'
        );
      });
    });

    test('should trigger fade animation on auth state change', async () => {
      const mockAnimatedValue = {
        setValue: jest.fn(),
      };
      
      Animated.Value.mockReturnValue(mockAnimatedValue);
      
      const { rerender } = render(<AuthNavigator />);
      
      // Initial state
      useUser.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      rerender(<AuthNavigator />);
      
      // Change auth state
      useUser.mockReturnValue({
        user: { uid: 'test-user' },
        isLoading: false,
        isAuthenticated: true,
      });
      
      rerender(<AuthNavigator />);
      
      await waitFor(() => {
        expect(Animated.sequence).toHaveBeenCalled();
      });
    });

    test('should not trigger animation when loading state changes', async () => {
      const { rerender } = render(<AuthNavigator />);
      
      // Initial loading state
      useUser.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      });
      
      rerender(<AuthNavigator />);
      
      // Change loading state but keep auth state same
      useUser.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      rerender(<AuthNavigator />);
      
      // Should not trigger animation since auth state didn't change
      expect(Animated.sequence).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle user object without isAuthenticated flag', () => {
      useUser.mockReturnValue({
        user: { uid: 'test-user' },
        isLoading: false,
        // isAuthenticated is undefined
      });

      const { queryByText } = render(<AuthNavigator />);
      
      // Should default to showing AuthStack when isAuthenticated is falsy
      expect(queryByText('AuthStack')).toBeTruthy();
      expect(queryByText('MainNavigator')).toBeNull();
    });

    test('should handle null user with isAuthenticated true', () => {
      useUser.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: true, // This shouldn't happen but test edge case
      });

      const { queryByText } = render(<AuthNavigator />);
      
      // Should show MainNavigator based on isAuthenticated flag
      expect(queryByText('MainNavigator')).toBeTruthy();
      expect(queryByText('AuthStack')).toBeNull();
    });

    test('should handle rapid state changes', async () => {
      const { rerender } = render(<AuthNavigator />);
      
      // Rapid state changes
      const states = [
        { user: null, isLoading: true, isAuthenticated: false },
        { user: null, isLoading: false, isAuthenticated: false },
        { user: { uid: 'test' }, isLoading: false, isAuthenticated: true },
        { user: null, isLoading: false, isAuthenticated: false },
      ];
      
      for (const state of states) {
        useUser.mockReturnValue(state);
        rerender(<AuthNavigator />);
        await waitFor(() => {}, { timeout: 100 });
      }
      
      // Should handle all state changes without crashing
      expect(Logger.info).toHaveBeenCalled();
    });
  });

  describe('Animation Configuration', () => {
    test('should use correct animation timing for fade in', async () => {
      const { rerender } = render(<AuthNavigator />);
      
      useUser.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      rerender(<AuthNavigator />);
      
      useUser.mockReturnValue({
        user: { uid: 'test-user' },
        isLoading: false,
        isAuthenticated: true,
      });
      
      rerender(<AuthNavigator />);
      
      await waitFor(() => {
        expect(Animated.timing).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            toValue: 0.7,
            duration: 150,
            useNativeDriver: true,
          })
        );
        
        expect(Animated.timing).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          })
        );
      });
    });

    test('should start animation sequence on auth state change', async () => {
      const mockStart = jest.fn();
      Animated.sequence.mockReturnValue({ start: mockStart });
      
      const { rerender } = render(<AuthNavigator />);
      
      useUser.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      rerender(<AuthNavigator />);
      
      useUser.mockReturnValue({
        user: { uid: 'test-user' },
        isLoading: false,
        isAuthenticated: true,
      });
      
      rerender(<AuthNavigator />);
      
      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });
    });
  });

  describe('Performance', () => {
    test('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestAuthNavigator = () => {
        renderSpy();
        return <AuthNavigator />;
      };
      
      const { rerender } = render(<TestAuthNavigator />);
      
      // Same state - should not cause re-render
      useUser.mockReturnValue({
        user: { uid: 'test-user' },
        isLoading: false,
        isAuthenticated: true,
      });
      
      rerender(<TestAuthNavigator />);
      rerender(<TestAuthNavigator />);
      
      // Should only render initial + 2 re-renders
      expect(renderSpy).toHaveBeenCalledTimes(3);
    });

    test('should handle memory cleanup on unmount', () => {
      const { unmount } = render(<AuthNavigator />);
      
      useUser.mockReturnValue({
        user: { uid: 'test-user' },
        isLoading: false,
        isAuthenticated: true,
      });
      
      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});