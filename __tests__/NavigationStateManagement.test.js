/**
 * Tests for Navigation State Management
 * Tests NavigationContext, useNavigationSync, and related functionality
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

// Mock Firebase
jest.mock('../firebase', () => ({
  onAuthStateChange: jest.fn(() => jest.fn()),
  signOutUser: jest.fn(() => Promise.resolve()),
}));

// Mock services
jest.mock('../services/UserProfileService', () => ({
  default: {
    createOrUpdateProfile: jest.fn(() => Promise.resolve({})),
    readProfile: jest.fn(() => Promise.resolve({})),
    profileExists: jest.fn(() => Promise.resolve(true)),
  },
}));

jest.mock('../utils/Logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import components to test
import { NavigationProvider, useNavigationContext } from '../contexts/NavigationContext';
import NavigationStateManager from '../components/navigation/NavigationStateManager';
import { SCREEN_NAMES, parseDeepLink, generateDeepLink } from '../utils/navigationUtils';

// Test wrapper component
const TestWrapper = ({ children }) => {
  return (
    <NavigationProvider>
      {children}
    </NavigationProvider>
  );
};

describe('NavigationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should provide navigation context', () => {
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
    expect(contextValue.navigationState).toBeDefined();
    expect(contextValue.navigateToScreen).toBeDefined();
    expect(contextValue.goBack).toBeDefined();
    expect(contextValue.setNavigationRef).toBeDefined();
  });

  test('should initialize with correct default state', () => {
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

    expect(contextValue.navigationState.currentScreen).toBeNull();
    expect(contextValue.navigationState.previousScreen).toBeNull();
    expect(contextValue.navigationState.canGoBack).toBe(false);
    expect(contextValue.navigationState.routeHistory).toEqual([]);
    expect(contextValue.navigationState.isNavigating).toBe(false);
    expect(contextValue.navigationState.navigationQueue).toEqual([]);
  });
});

describe('Navigation Utils', () => {
  test('should parse deep links correctly', () => {
    const testCases = [
      {
        url: 'com.liamclarke.herospath://map',
        expected: { screen: SCREEN_NAMES.MAP, params: {} }
      },
      {
        url: 'com.liamclarke.herospath://journeys',
        expected: { screen: SCREEN_NAMES.JOURNEYS, params: {} }
      },
      {
        url: 'com.liamclarke.herospath://discoveries',
        expected: { screen: SCREEN_NAMES.DISCOVERIES, params: {} }
      }
    ];

    testCases.forEach(({ url, expected }) => {
      const result = parseDeepLink(url);
      expect(result.screen).toBe(expected.screen);
      expect(result.params).toEqual(expected.params);
    });
  });

  test('should generate deep links correctly', () => {
    const testCases = [
      {
        screen: SCREEN_NAMES.MAP,
        expected: 'com.liamclarke.herospath://map'
      },
      {
        screen: SCREEN_NAMES.JOURNEYS,
        expected: 'com.liamclarke.herospath://journeys'
      },
      {
        screen: SCREEN_NAMES.JOURNEY_DETAIL,
        params: { journeyId: '123' },
        expected: 'com.liamclarke.herospath://journeys/123'
      }
    ];

    testCases.forEach(({ screen, params = {}, expected }) => {
      const result = generateDeepLink(screen, params);
      expect(result).toBe(expected);
    });
  });

  test('should handle invalid deep links gracefully', () => {
    const invalidUrls = [
      'invalid://url',
      'not-a-url',
      '',
      null,
      undefined
    ];

    invalidUrls.forEach(url => {
      const result = parseDeepLink(url);
      expect(result.screen).toBe(SCREEN_NAMES.MAP); // Should fallback to Map
    });
  });
});

describe('NavigationStateManager', () => {
  test('should render children without errors', () => {
    const TestChild = () => <Text>Test Child</Text>;
    
    const { getByText } = render(
      <TestWrapper>
        <NavigationStateManager>
          <TestChild />
        </NavigationStateManager>
      </TestWrapper>
    );

    expect(getByText('Test Child')).toBeTruthy();
  });
});

describe('Screen Names Constants', () => {
  test('should have all required screen names defined', () => {
    expect(SCREEN_NAMES.MAP).toBe('Map');
    expect(SCREEN_NAMES.JOURNEYS).toBe('Journeys');
    expect(SCREEN_NAMES.DISCOVERIES).toBe('Discoveries');
    expect(SCREEN_NAMES.SAVED_PLACES).toBe('SavedPlaces');
    expect(SCREEN_NAMES.SOCIAL).toBe('Social');
    expect(SCREEN_NAMES.SETTINGS).toBe('Settings');
    expect(SCREEN_NAMES.LOGIN).toBe('Login');
    expect(SCREEN_NAMES.SIGNUP).toBe('Signup');
  });
});

describe('Navigation Context Error Handling', () => {
  test('should throw error when used outside provider', () => {
    const TestComponent = () => {
      try {
        useNavigationContext();
        return <Text>Should not reach here</Text>;
      } catch (error) {
        return <Text>Error caught: {error.message}</Text>;
      }
    };

    const { getByText } = render(<TestComponent />);
    expect(getByText(/Error caught:/)).toBeTruthy();
  });
});