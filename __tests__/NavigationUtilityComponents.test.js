import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#007AFF',
        secondary: '#5856D6',
        background: '#FFFFFF',
        surface: '#F2F2F7',
        text: '#000000',
        textSecondary: '#8E8E93',
        border: '#C6C6C8',
        error: '#FF3B30',
        warning: '#FF9500',
        success: '#34C759',
      },
    },
    navigationStyles: {
      contrastRatios: {
        textOnPrimary: 5.0,
      },
    },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    canGoBack: () => true,
  }),
}));

import { 
  NavigationBadge, 
  BadgeWrapper,
  LoadingOverlay,
  NavigationLoadingOverlay
} from '../components/navigation';

describe('NavigationBadge', () => {
  it('renders badge with count', () => {
    const { getByText } = render(
      <NavigationBadge count={5} />
    );
    
    expect(getByText('5')).toBeTruthy();
  });
  
  it('does not render when count is 0 and showZero is false', () => {
    const { queryByTestId } = render(
      <NavigationBadge count={0} testID="badge" />
    );
    
    expect(queryByTestId('badge')).toBeNull();
  });
  
  it('renders when count is 0 and showZero is true', () => {
    const { getByText } = render(
      <NavigationBadge count={0} showZero={true} />
    );
    
    expect(getByText('0')).toBeTruthy();
  });
  
  it('shows 99+ for counts over maxCount', () => {
    const { getByText } = render(
      <NavigationBadge count={150} maxCount={99} />
    );
    
    expect(getByText('99+')).toBeTruthy();
  });
});

describe('BadgeWrapper', () => {
  it('wraps children with badge', () => {
    const { getByText, getByTestId } = render(
      <BadgeWrapper badgeCount={3} badgeProps={{ testID: 'badge' }}>
        <View />
      </BadgeWrapper>
    );
    
    expect(getByTestId('badge')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });
});

describe('LoadingOverlay', () => {
  it('renders when visible is true', () => {
    const { getByTestId } = render(
      <LoadingOverlay visible={true} message="Loading..." />
    );
    
    expect(getByTestId('loading-overlay')).toBeTruthy();
    expect(getByTestId('loading-overlay-text')).toBeTruthy();
    expect(getByTestId('loading-overlay-spinner')).toBeTruthy();
  });
  
  it('does not render when visible is false', () => {
    const { queryByTestId } = render(
      <LoadingOverlay visible={false} />
    );
    
    expect(queryByTestId('loading-overlay')).toBeNull();
  });
  
  it('renders without spinner when showSpinner is false', () => {
    const { getByTestId, queryByTestId } = render(
      <LoadingOverlay visible={true} showSpinner={false} message="Loading..." />
    );
    
    expect(getByTestId('loading-overlay')).toBeTruthy();
    expect(getByTestId('loading-overlay-text')).toBeTruthy();
    expect(queryByTestId('loading-overlay-spinner')).toBeNull();
  });
});

describe('NavigationLoadingOverlay', () => {
  it('renders with default navigation message', () => {
    const { getByText } = render(
      <NavigationLoadingOverlay visible={true} />
    );
    
    expect(getByText('Navigating...')).toBeTruthy();
  });
});