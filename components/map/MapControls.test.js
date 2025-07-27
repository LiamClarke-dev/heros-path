import React from 'react';
import { render } from '@testing-library/react-native';
import MapControls from './MapControls';

// Mock the theme context
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#007AFF',
        secondary: '#FF9500',
        surface: '#FFFFFF',
        onPrimary: '#FFFFFF',
        onSecondary: '#FFFFFF',
        onSurface: '#000000',
        outline: '#C7C7CC',
        error: '#FF3B30',
        disabled: '#C7C7CC',
      },
    },
  }),
}));

describe('MapControls', () => {
  const defaultProps = {
    trackingState: {
      isTracking: false,
      isAuthenticated: true,
      journeyStartTime: null,
    },
    savedRoutesState: {
      isVisible: false,
      isLoading: false,
      hasRoutes: true,
    },
    savedPlacesState: {
      isVisible: false,
      isLoading: false,
      hasPlaces: true,
    },
    mapStyleState: {
      currentStyle: 'standard',
      selectorVisible: false,
    },
    permissions: {
      granted: true,
    },
    onToggleTracking: jest.fn(),
    onToggleSavedRoutes: jest.fn(),
    onToggleSavedPlaces: jest.fn(),
    onToggleMapStyle: jest.fn(),
  };

  it('renders without crashing when permissions are granted', () => {
    const { getByText } = render(<MapControls {...defaultProps} />);
    expect(getByText('Start')).toBeTruthy();
  });

  it('does not render when permissions are not granted', () => {
    const props = {
      ...defaultProps,
      permissions: { granted: false },
    };
    const { queryByText } = render(<MapControls {...props} />);
    expect(queryByText('Start')).toBeNull();
  });

  it('shows tracking button with correct text when not tracking', () => {
    const { getByText } = render(<MapControls {...defaultProps} />);
    expect(getByText('Start')).toBeTruthy();
  });

  it('shows tracking button with correct text when tracking', () => {
    const props = {
      ...defaultProps,
      trackingState: {
        ...defaultProps.trackingState,
        isTracking: true,
      },
    };
    const { getByText } = render(<MapControls {...props} />);
    expect(getByText('Stop')).toBeTruthy();
  });

  it('shows saved routes toggle when user has routes', () => {
    const { getByText } = render(<MapControls {...defaultProps} />);
    expect(getByText('Show Routes')).toBeTruthy();
  });

  it('shows saved places toggle when user has places', () => {
    const { getByText } = render(<MapControls {...defaultProps} />);
    expect(getByText('Show Places')).toBeTruthy();
  });
});