import React from 'react';
import { render } from '@testing-library/react-native';

// Mock NavigationContainer for testing
const MockNavigationContainer = ({ children }) => children;

// Mock theme provider for testing
const MockThemeProvider = ({ children }) => {
  const mockTheme = {
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      background: '#FFFFFF',
      surface: '#F2F2F7',
      text: '#000000',
      textSecondary: '#8E8E93',
      border: '#C6C6C8',
      overlay: 'rgba(0, 0, 0, 0.4)',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    typography: {
      h1: { fontSize: 28, fontWeight: 'bold' },
      h2: { fontSize: 22, fontWeight: 'bold' },
      body: { fontSize: 16, fontWeight: 'normal' },
      caption: { fontSize: 14, fontWeight: 'normal' },
    },
    borderRadius: 8,
    shadow: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  };

  return React.createElement(
    'ThemeProvider',
    { value: { theme: mockTheme } },
    children
  );
};

// Mock user provider for testing
const MockUserProvider = ({ children, user = null, loading = false }) => {
  const mockUserContext = {
    user,
    loading,
    signIn: jest.fn(),
    signOut: jest.fn(),
  };

  return React.createElement(
    'UserProvider',
    { value: mockUserContext },
    children
  );
};

// Custom render function that includes providers
export const renderWithProviders = (
  ui,
  {
    user = null,
    loading = false,
    navigationOptions = {},
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <MockThemeProvider>
      <MockUserProvider user={user} loading={loading}>
        <MockNavigationContainer {...navigationOptions}>
          {children}
        </MockNavigationContainer>
      </MockUserProvider>
    </MockThemeProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock user data factory
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  ...overrides,
});

// Mock journey data factory
export const createMockJourney = (overrides = {}) => ({
  id: 'test-journey-id',
  userId: 'test-user-id',
  name: 'Test Journey',
  path: [
    {
      latitude: 37.7749,
      longitude: -122.4194,
      timestamp: '2024-01-01T09:00:00Z',
    },
    {
      latitude: 37.775,
      longitude: -122.4195,
      timestamp: '2024-01-01T09:01:00Z',
    },
  ],
  distance: 1500,
  duration: 1800,
  startTime: '2024-01-01T09:00:00Z',
  endTime: '2024-01-01T09:30:00Z',
  createdAt: '2024-01-01T09:30:00Z',
  discoveredPlaces: [],
  ...overrides,
});

// Mock place data factory
export const createMockPlace = (overrides = {}) => ({
  id: 'test-place-id',
  placeId: 'google-place-id',
  name: 'Test Coffee Shop',
  category: 'restaurant',
  coordinate: { latitude: 37.7749, longitude: -122.4194 },
  rating: 4.5,
  savedAt: '2024-01-01T09:30:00Z',
  ...overrides,
});

// Mock location data factory
export const createMockLocation = (overrides = {}) => ({
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 0,
    accuracy: 5,
    altitudeAccuracy: 5,
    heading: 0,
    speed: 0,
  },
  timestamp: Date.now(),
  ...overrides,
});

// Test helpers
export const waitForAsync = (ms = 0) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = () => new Promise(setImmediate);

// Re-export everything from React Testing Library
export * from '@testing-library/react-native';
