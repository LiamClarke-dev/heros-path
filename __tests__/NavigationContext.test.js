/**
 * Unit Tests for NavigationContext
 * Tests NavigationContext state management, navigation functions, and deep link handling
 * Requirements: 6.1, 6.2, 6.3, 6.7, 5.1, 5.2, 5.3, 5.4
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import components to test
import { 
  NavigationProvider, 
  useNavigationContext, 
  useNavigation, 
  useNavigationHistory, 
  useDeepLinking 
} from '../contexts/NavigationContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <NavigationProvider>
    {children}
  </NavigationProvider>
);

describe('NavigationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.removeItem.mockResolvedValue();
  });

  describe('Provider Initialization', () => {
    test('should provide navigation context with default state', () => {
      let contextValue;
      
      const TestComponent = () => {
        contextValue = useNavigationContext();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(contextValue).toBeDefined();
      expect(contextValue.navigationState.currentScreen).toBeNull();
      expect(contextValue.navigationState.previousScreen).toBeNull();
      expect(contextValue.navigationState.canGoBack).toBe(false);
      expect(contextValue.navigationState.routeHistory).toEqual([]);
      expect(contextValue.navigationState.isNavigating).toBe(false);
      expect(contextValue.navigationState.navigationQueue).toEqual([]);
    });

    test('should provide all required navigation functions', () => {
      let contextValue;
      
      const TestComponent = () => {
        contextValue = useNavigationContext();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(typeof contextValue.navigateToScreen).toBe('function');
      expect(typeof contextValue.goBack).toBe('function');
      expect(typeof contextValue.resetToScreen).toBe('function');
      expect(typeof contextValue.handleDeepLink).toBe('function');
      expect(typeof contextValue.setNavigationRef).toBe('function');
      expect(typeof contextValue.persistNavigationState).toBe('function');
      expect(typeof contextValue.restoreNavigationState).toBe('function');
    });

    test('should throw error when used outside provider', () => {
      const TestComponent = () => {
        try {
          useNavigationContext();
          return <Text>Should not reach here</Text>;
        } catch (error) {
          return <Text>Error: {error.message}</Text>;
        }
      };

      const { getByText } = render(<TestComponent />);
      expect(getByText(/Error:/)).toBeTruthy();
      expect(getByText(/must be used within NavigationProvider/)).toBeTruthy();
    });
  });

  describe('Navigation Reference Management', () => {
    test('should set navigation reference correctly', () => {
      let contextValue;
      const mockNavigationRef = {
        navigate: jest.fn(),
        canGoBack: jest.fn(() => true),
        getCurrentRoute: jest.fn(() => ({ name: 'TestScreen' })),
        addListener: jest.fn(() => jest.fn()),
      };
      
      const TestComponent = () => {
        contextValue = useNavigationContext();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      act(() => {
        contextValue.setNavigationRef(mockNavigationRef);
      });

      expect(contextValue.navigationState.navigationRef).toBe(mockNavigationRef);
    });

    test('should set up navigation state listener when ref is provided', () => {
      let contextValue;
      const mockUnsubscribe = jest.fn();
      const mockNavigationRef = {
        navigate: jest.fn(),
        canGoBack: jest.fn(() => true),
        getCurrentRoute: jest.fn(() => ({ name: 'TestScreen' })),
        addListener: jest.fn(() => mockUnsubscribe),
      };
      
      const TestComponent = () => {
        contextValue = useNavigationContext();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      act(() => {
        const unsubscribe = contextValue.setNavigationRef(mockNavigationRef);
        expect(mockNavigationRef.addListener).toHaveBeenCalledWith('state', expect.any(Function));
        expect(unsubscribe).toBe(mockUnsubscribe);
      });
    });
  });

  describe('Navigation Functions', () => {
    let contextValue;
    let mockNavigationRef;

    beforeEach(() => {
      mockNavigationRef = {
        navigate: jest.fn(),
        canGoBack: jest.fn(() => true),
        goBack: jest.fn(),
        reset: jest.fn(),
        getCurrentRoute: jest.fn(() => ({ name: 'TestScreen' })),
        getState: jest.fn(() => ({ routes: [{ name: 'TestScreen' }], index: 0 })),
        addListener: jest.fn(() => jest.fn()),
      };

      const TestComponent = () => {
        contextValue = useNavigationContext();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      act(() => {
        contextValue.setNavigationRef(mockNavigationRef);
      });
    });

    test('should navigate to screen successfully', async () => {
      await act(async () => {
        contextValue.navigateToScreen('TestScreen', { param: 'value' });
      });

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('TestScreen', { param: 'value' });
    });

    test('should queue navigation when already navigating', async () => {
      // Set navigating state
      await act(async () => {
        contextValue.navigateToScreen('FirstScreen');
      });

      // Try to navigate again immediately
      await act(async () => {
        contextValue.navigateToScreen('SecondScreen');
      });

      // Should queue the second navigation
      expect(contextValue.navigationState.navigationQueue.length).toBeGreaterThan(0);
    });

    test('should handle navigation errors gracefully', async () => {
      mockNavigationRef.navigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      await act(async () => {
        contextValue.navigateToScreen('TestScreen');
      });

      // Should not crash and should reset navigation flag
      expect(contextValue.navigationState.isNavigating).toBe(false);
    });

    test('should go back successfully', async () => {
      await act(async () => {
        contextValue.goBack();
      });

      expect(mockNavigationRef.goBack).toHaveBeenCalled();
    });

    test('should reset to login when cannot go back', async () => {
      mockNavigationRef.canGoBack.mockReturnValue(false);

      await act(async () => {
        contextValue.goBack();
      });

      expect(mockNavigationRef.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    });

    test('should reset to specific screen', async () => {
      await act(async () => {
        contextValue.resetToScreen('Map', { param: 'value' });
      });

      expect(mockNavigationRef.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Map', params: { param: 'value' } }],
      });
    });
  });

  describe('Deep Link Handling', () => {
    let contextValue;
    let mockNavigationRef;

    beforeEach(() => {
      mockNavigationRef = {
        navigate: jest.fn(),
        canGoBack: jest.fn(() => true),
        goBack: jest.fn(),
        reset: jest.fn(),
        getCurrentRoute: jest.fn(() => ({ name: 'TestScreen' })),
        getState: jest.fn(() => ({ routes: [{ name: 'TestScreen' }], index: 0 })),
        addListener: jest.fn(() => jest.fn()),
      };

      const TestComponent = () => {
        contextValue = useNavigationContext();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      act(() => {
        contextValue.setNavigationRef(mockNavigationRef);
      });
    });

    test('should handle map deep link', async () => {
      await act(async () => {
        contextValue.handleDeepLink('com.liamclarke.herospath://map', { param: 'value' });
      });

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Map', { param: 'value' });
      expect(contextValue.navigationState.deepLinkData).toEqual({
        url: 'com.liamclarke.herospath://map',
        params: { param: 'value' },
      });
    });

    test('should handle journeys deep link', async () => {
      await act(async () => {
        contextValue.handleDeepLink('com.liamclarke.herospath://journeys');
      });

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Journeys', {});
    });

    test('should handle discoveries deep link', async () => {
      await act(async () => {
        contextValue.handleDeepLink('com.liamclarke.herospath://discoveries');
      });

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Discoveries', {});
    });

    test('should handle saved places deep link', async () => {
      await act(async () => {
        contextValue.handleDeepLink('com.liamclarke.herospath://saved-places');
      });

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('SavedPlaces', {});
    });

    test('should default to map for unknown deep links', async () => {
      await act(async () => {
        contextValue.handleDeepLink('com.liamclarke.herospath://unknown');
      });

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Map');
    });

    test('should handle deep link navigation errors', async () => {
      mockNavigationRef.navigate.mockImplementation(() => {
        throw new Error('Deep link navigation failed');
      });

      await act(async () => {
        contextValue.handleDeepLink('com.liamclarke.herospath://map');
      });

      // Should fallback to map navigation
      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Map');
    });
  });

  describe('State Persistence', () => {
    let contextValue;

    beforeEach(() => {
      const TestComponent = () => {
        contextValue = useNavigationContext();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );
    });

    test('should persist navigation state', async () => {
      await act(async () => {
        await contextValue.persistNavigationState();
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'herospath_navigation_state',
        expect.stringContaining('"currentScreen":null')
      );
    });

    test('should restore navigation state', async () => {
      const savedState = {
        currentScreen: 'Map',
        routeHistory: ['Login', 'Map'],
        lastNavigationTime: Date.now(),
        timestamp: Date.now(),
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedState));

      await act(async () => {
        const restoredScreen = await contextValue.restoreNavigationState();
        expect(restoredScreen).toBe('Map');
      });

      expect(contextValue.navigationState.currentScreen).toBe('Map');
      expect(contextValue.navigationState.routeHistory).toEqual(['Login', 'Map']);
    });

    test('should reject old navigation state', async () => {
      const oldState = {
        currentScreen: 'Map',
        routeHistory: ['Login', 'Map'],
        lastNavigationTime: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        timestamp: Date.now() - (25 * 60 * 60 * 1000),
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(oldState));

      await act(async () => {
        const restoredScreen = await contextValue.restoreNavigationState();
        expect(restoredScreen).toBeNull();
      });

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('herospath_navigation_state');
    });

    test('should handle restore errors gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await act(async () => {
        const restoredScreen = await contextValue.restoreNavigationState();
        expect(restoredScreen).toBeNull();
      });

      // Should not crash
      expect(contextValue.navigationState.currentScreen).toBeNull();
    });
  });

  describe('Navigation History', () => {
    let contextValue;
    let mockNavigationRef;

    beforeEach(() => {
      mockNavigationRef = {
        navigate: jest.fn(),
        canGoBack: jest.fn(() => true),
        getCurrentRoute: jest.fn(() => ({ name: 'TestScreen' })),
        getState: jest.fn(() => ({ routes: [{ name: 'TestScreen' }], index: 0 })),
        addListener: jest.fn(() => jest.fn()),
      };

      const TestComponent = () => {
        contextValue = useNavigationContext();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      act(() => {
        contextValue.setNavigationRef(mockNavigationRef);
      });
    });

    test('should track navigation history', async () => {
      await act(async () => {
        contextValue.navigateToScreen('Screen1');
      });

      await act(async () => {
        contextValue.navigateToScreen('Screen2');
      });

      expect(contextValue.navigationState.routeHistory).toContain('Screen1');
      expect(contextValue.navigationState.routeHistory).toContain('Screen2');
    });

    test('should limit history length', async () => {
      // Navigate to more than MAX_HISTORY_LENGTH screens
      for (let i = 0; i < 25; i++) {
        await act(async () => {
          contextValue.navigateToScreen(`Screen${i}`);
        });
      }

      expect(contextValue.navigationState.routeHistory.length).toBeLessThanOrEqual(20);
    });

    test('should clear navigation history', async () => {
      await act(async () => {
        contextValue.navigateToScreen('Screen1');
        contextValue.navigateToScreen('Screen2');
      });

      expect(contextValue.navigationState.routeHistory.length).toBeGreaterThan(0);

      await act(async () => {
        contextValue.clearNavigationHistory();
      });

      expect(contextValue.navigationState.routeHistory).toEqual([]);
      expect(contextValue.navigationState.previousScreen).toBeNull();
    });
  });
});

describe('Navigation Hooks', () => {
  describe('useNavigation Hook', () => {
    test('should provide navigation utilities', () => {
      let hookValue;
      
      const TestComponent = () => {
        hookValue = useNavigation();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(hookValue).toBeDefined();
      expect(typeof hookValue.navigate).toBe('function');
      expect(typeof hookValue.goBack).toBe('function');
      expect(typeof hookValue.reset).toBe('function');
      expect(typeof hookValue.canGoBack).toBe('boolean');
      expect(hookValue.currentScreen).toBeNull();
      expect(hookValue.previousScreen).toBeNull();
      expect(typeof hookValue.isNavigating).toBe('boolean');
    });
  });

  describe('useNavigationHistory Hook', () => {
    test('should provide history utilities', () => {
      let hookValue;
      
      const TestComponent = () => {
        hookValue = useNavigationHistory();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(hookValue).toBeDefined();
      expect(Array.isArray(hookValue.history)).toBe(true);
      expect(typeof hookValue.clearHistory).toBe('function');
      expect(typeof hookValue.getState).toBe('function');
    });
  });

  describe('useDeepLinking Hook', () => {
    test('should provide deep linking utilities', () => {
      let hookValue;
      
      const TestComponent = () => {
        hookValue = useDeepLinking();
        return <Text>Test</Text>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(hookValue).toBeDefined();
      expect(typeof hookValue.handleDeepLink).toBe('function');
      expect(hookValue.deepLinkData).toBeNull();
    });
  });
});