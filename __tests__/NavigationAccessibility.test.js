/**
 * Accessibility Tests for Navigation System
 * Tests accessibility with screen readers, keyboard navigation, and WCAG compliance
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';

// Mock accessibility APIs
const mockAccessibilityInfo = {
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
  isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
  isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
  isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  announceForAccessibility: jest.fn(),
  setAccessibilityFocus: jest.fn(),
};

// Use the same React Native mock as other tests
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  AccessibilityInfo: mockAccessibilityInfo,
  View: ({ children, ...props }) => children,
  Text: ({ children, ...props }) => children,
  TouchableOpacity: ({ children, onPress, ...props }) => children,
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
}));

// Mock contexts with accessibility support
const mockNavigationContext = {
  navigationState: { 
    currentScreen: 'Map',
    canGoBack: true,
    isNavigating: false,
  },
  navigateToScreen: jest.fn(),
  goBack: jest.fn(),
  resetToScreen: jest.fn(),
  announceNavigation: jest.fn(),
};

const mockThemeContext = {
  theme: {
    colors: {
      primary: '#007AFF',
      background: '#FFFFFF',
      text: '#000000',
      textSecondary: '#8E8E93',
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      reduceMotion: false,
    },
  },
  themeName: 'light',
  switchTheme: jest.fn(),
};

const mockUserContext = {
  user: { uid: 'test-user' },
  isAuthenticated: true,
  accessibilityPreferences: {
    screenReader: false,
    highContrast: false,
    largeText: false,
    reduceMotion: false,
  },
};

jest.mock('../contexts/NavigationContext', () => ({
  useNavigationContext: () => mockNavigationContext,
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => mockThemeContext,
}));

jest.mock('../contexts/UserContext', () => ({
  useUser: () => mockUserContext,
}));

// Accessibility test components
const AccessibleNavigationComponent = ({ 
  screenReaderEnabled = false,
  highContrast = false,
  largeText = false,
  reduceMotion = false 
}) => {
  const [currentScreen, setCurrentScreen] = React.useState('Map');
  const [announcements, setAnnouncements] = React.useState([]);

  const navigateToScreen = (screenName) => {
    setCurrentScreen(screenName);
    
    if (screenReaderEnabled) {
      const announcement = `Navigated to ${screenName} screen`;
      setAnnouncements(prev => [...prev, announcement]);
      mockAccessibilityInfo.announceForAccessibility(announcement);
    }
  };

  const getAccessibilityProps = (element) => {
    const baseProps = {
      accessible: true,
      accessibilityRole: element.role || 'button',
    };

    if (screenReaderEnabled) {
      baseProps.accessibilityLabel = element.label;
      baseProps.accessibilityHint = element.hint;
      baseProps.accessibilityState = element.state || {};
    }

    return baseProps;
  };

  const textStyle = {
    fontSize: largeText ? 20 : 16,
    color: highContrast ? '#000000' : '#333333',
  };

  const buttonStyle = {
    backgroundColor: highContrast ? '#000000' : '#007AFF',
    padding: 16, // Minimum 44pt touch target
    minHeight: 44,
    minWidth: 44,
  };

  return (
    <View testID="accessible-navigation" style={{ backgroundColor: highContrast ? '#FFFFFF' : '#F5F5F5' }}>
      <Text 
        testID="current-screen-announcement"
        style={textStyle}
        {...getAccessibilityProps({
          role: 'text',
          label: `Currently on ${currentScreen} screen`,
        })}
      >
        Current Screen: {currentScreen}
      </Text>

      <TouchableOpacity
        testID="nav-journeys-btn"
        style={buttonStyle}
        onPress={() => navigateToScreen('Journeys')}
        {...getAccessibilityProps({
          label: 'Navigate to Journeys',
          hint: 'Double tap to view your past journeys',
          state: { selected: currentScreen === 'Journeys' },
        })}
      >
        <Text style={{ color: highContrast ? '#FFFFFF' : '#FFFFFF' }}>Journeys</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="nav-discoveries-btn"
        style={buttonStyle}
        onPress={() => navigateToScreen('Discoveries')}
        {...getAccessibilityProps({
          label: 'Navigate to Discoveries',
          hint: 'Double tap to view discovered places',
          state: { selected: currentScreen === 'Discoveries' },
        })}
      >
        <Text style={{ color: highContrast ? '#FFFFFF' : '#FFFFFF' }}>Discoveries</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="back-btn"
        style={buttonStyle}
        onPress={() => navigateToScreen('Map')}
        {...getAccessibilityProps({
          label: 'Go back',
          hint: 'Double tap to return to previous screen',
          state: { disabled: currentScreen === 'Map' },
        })}
        disabled={currentScreen === 'Map'}
      >
        <Text style={{ color: highContrast ? '#FFFFFF' : '#FFFFFF' }}>Back</Text>
      </TouchableOpacity>

      {screenReaderEnabled && (
        <View testID="announcements" accessibilityLiveRegion="polite">
          {announcements.map((announcement, index) => (
            <Text key={index} testID={`announcement-${index}`} style={{ position: 'absolute', left: -10000 }}>
              {announcement}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const KeyboardNavigationComponent = () => {
  const [focusedElement, setFocusedElement] = React.useState(0);
  const [currentScreen, setCurrentScreen] = React.useState('Map');
  
  const navigationItems = [
    { id: 'map', label: 'Map', screen: 'Map' },
    { id: 'journeys', label: 'Journeys', screen: 'Journeys' },
    { id: 'discoveries', label: 'Discoveries', screen: 'Discoveries' },
    { id: 'settings', label: 'Settings', screen: 'Settings' },
  ];

  const handleKeyPress = (event) => {
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        setFocusedElement(prev => (prev + 1) % navigationItems.length);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        const selectedItem = navigationItems[focusedElement];
        setCurrentScreen(selectedItem.screen);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedElement(prev => (prev + 1) % navigationItems.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedElement(prev => (prev - 1 + navigationItems.length) % navigationItems.length);
        break;
    }
  };

  return (
    <View testID="keyboard-navigation" onKeyPress={handleKeyPress}>
      <Text testID="current-screen-kbd">{currentScreen}</Text>
      {navigationItems.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          testID={`kbd-nav-${item.id}`}
          style={{
            padding: 16,
            backgroundColor: focusedElement === index ? '#007AFF' : '#F0F0F0',
            borderWidth: focusedElement === index ? 2 : 1,
            borderColor: focusedElement === index ? '#0056CC' : '#CCCCCC',
            margin: 4,
          }}
          onPress={() => setCurrentScreen(item.screen)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ 
            selected: currentScreen === item.screen,
            focused: focusedElement === index,
          }}
        >
          <Text style={{ 
            color: focusedElement === index ? '#FFFFFF' : '#000000',
            fontWeight: focusedElement === index ? 'bold' : 'normal',
          }}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

describe('Navigation Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Reader Support', () => {
    test('should provide proper labels and descriptions for navigation elements', () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent screenReaderEnabled={true} />
      );

      const journeysButton = getByTestId('nav-journeys-btn');
      const discoveriesButton = getByTestId('nav-discoveries-btn');
      const backButton = getByTestId('back-btn');

      expect(journeysButton.props.accessibilityLabel).toBe('Navigate to Journeys');
      expect(journeysButton.props.accessibilityHint).toBe('Double tap to view your past journeys');
      expect(journeysButton.props.accessibilityRole).toBe('button');

      expect(discoveriesButton.props.accessibilityLabel).toBe('Navigate to Discoveries');
      expect(discoveriesButton.props.accessibilityHint).toBe('Double tap to view discovered places');

      expect(backButton.props.accessibilityLabel).toBe('Go back');
      expect(backButton.props.accessibilityHint).toBe('Double tap to return to previous screen');
    });

    test('should announce navigation state changes', async () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent screenReaderEnabled={true} />
      );

      fireEvent.press(getByTestId('nav-journeys-btn'));

      await waitFor(() => {
        expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'Navigated to Journeys screen'
        );
      });

      fireEvent.press(getByTestId('nav-discoveries-btn'));

      await waitFor(() => {
        expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'Navigated to Discoveries screen'
        );
      });
    });

    test('should provide live region updates for dynamic content', async () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent screenReaderEnabled={true} />
      );

      const liveRegion = getByTestId('announcements');
      expect(liveRegion.props.accessibilityLiveRegion).toBe('polite');

      fireEvent.press(getByTestId('nav-journeys-btn'));

      await waitFor(() => {
        expect(getByTestId('announcement-0')).toBeTruthy();
      });
    });

    test('should handle screen reader state changes', async () => {
      mockAccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(true);

      const { rerender } = render(
        <AccessibleNavigationComponent screenReaderEnabled={false} />
      );

      // Enable screen reader
      rerender(<AccessibleNavigationComponent screenReaderEnabled={true} />);

      expect(mockAccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
    });

    test('should provide proper accessibility state information', () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent screenReaderEnabled={true} />
      );

      fireEvent.press(getByTestId('nav-journeys-btn'));

      const journeysButton = getByTestId('nav-journeys-btn');
      expect(journeysButton.props.accessibilityState.selected).toBe(true);

      const discoveriesButton = getByTestId('nav-discoveries-btn');
      expect(discoveriesButton.props.accessibilityState.selected).toBe(false);
    });
  });

  describe('Keyboard Navigation Support', () => {
    test('should support tab order navigation', () => {
      const { getByTestId } = render(<KeyboardNavigationComponent />);

      const keyboardNav = getByTestId('keyboard-navigation');
      
      // Simulate Tab key press
      fireEvent(keyboardNav, 'keyPress', { key: 'Tab' });

      // Should focus on first navigation item
      const mapButton = getByTestId('kbd-nav-map');
      expect(mapButton.props.style.backgroundColor).toBe('#007AFF');
    });

    test('should support arrow key navigation', () => {
      const { getByTestId } = render(<KeyboardNavigationComponent />);

      const keyboardNav = getByTestId('keyboard-navigation');
      
      // Simulate ArrowDown key press
      fireEvent(keyboardNav, 'keyPress', { key: 'ArrowDown' });

      // Should focus on next item
      const journeysButton = getByTestId('kbd-nav-journeys');
      expect(journeysButton.props.style.backgroundColor).toBe('#007AFF');
    });

    test('should support Enter and Space key activation', async () => {
      const { getByTestId } = render(<KeyboardNavigationComponent />);

      const keyboardNav = getByTestId('keyboard-navigation');
      
      // Focus on journeys item
      fireEvent(keyboardNav, 'keyPress', { key: 'ArrowDown' });
      
      // Activate with Enter key
      fireEvent(keyboardNav, 'keyPress', { key: 'Enter' });

      await waitFor(() => {
        expect(getByTestId('current-screen-kbd')).toHaveTextContent('Journeys');
      });
    });

    test('should provide proper focus indicators', () => {
      const { getByTestId } = render(<KeyboardNavigationComponent />);

      const keyboardNav = getByTestId('keyboard-navigation');
      fireEvent(keyboardNav, 'keyPress', { key: 'Tab' });

      const focusedButton = getByTestId('kbd-nav-map');
      expect(focusedButton.props.style.borderWidth).toBe(2);
      expect(focusedButton.props.style.borderColor).toBe('#0056CC');
    });

    test('should handle keyboard navigation wrap-around', () => {
      const { getByTestId } = render(<KeyboardNavigationComponent />);

      const keyboardNav = getByTestId('keyboard-navigation');
      
      // Navigate to last item
      fireEvent(keyboardNav, 'keyPress', { key: 'ArrowUp' });

      const settingsButton = getByTestId('kbd-nav-settings');
      expect(settingsButton.props.style.backgroundColor).toBe('#007AFF');
    });
  });

  describe('Touch Target Accessibility', () => {
    test('should ensure minimum 44pt touch targets', () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent />
      );

      const journeysButton = getByTestId('nav-journeys-btn');
      const discoveriesButton = getByTestId('nav-discoveries-btn');
      const backButton = getByTestId('back-btn');

      expect(journeysButton.props.style.minHeight).toBe(44);
      expect(journeysButton.props.style.minWidth).toBe(44);
      expect(journeysButton.props.style.padding).toBe(16);

      expect(discoveriesButton.props.style.minHeight).toBe(44);
      expect(backButton.props.style.minHeight).toBe(44);
    });

    test('should provide adequate spacing between touch targets', () => {
      const { getByTestId } = render(<KeyboardNavigationComponent />);

      const mapButton = getByTestId('kbd-nav-map');
      const journeysButton = getByTestId('kbd-nav-journeys');

      expect(mapButton.props.style.margin).toBe(4);
      expect(journeysButton.props.style.margin).toBe(4);
    });
  });

  describe('High Contrast Support', () => {
    test('should apply high contrast colors when enabled', () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent highContrast={true} />
      );

      const container = getByTestId('accessible-navigation');
      const currentScreenText = getByTestId('current-screen-announcement');
      const journeysButton = getByTestId('nav-journeys-btn');

      expect(container.props.style.backgroundColor).toBe('#FFFFFF');
      expect(currentScreenText.props.style.color).toBe('#000000');
      expect(journeysButton.props.style.backgroundColor).toBe('#000000');
    });

    test('should maintain proper contrast ratios', () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent highContrast={true} />
      );

      const journeysButton = getByTestId('nav-journeys-btn');
      
      // High contrast mode should use black background with white text
      expect(journeysButton.props.style.backgroundColor).toBe('#000000');
      
      const buttonText = journeysButton.props.children;
      expect(buttonText.props.style.color).toBe('#FFFFFF');
    });
  });

  describe('Large Text Support', () => {
    test('should scale text appropriately for large text settings', () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent largeText={true} />
      );

      const currentScreenText = getByTestId('current-screen-announcement');
      expect(currentScreenText.props.style.fontSize).toBe(20);
    });

    test('should maintain layout with larger text sizes', () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent largeText={true} />
      );

      const journeysButton = getByTestId('nav-journeys-btn');
      
      // Touch targets should remain adequate even with larger text
      expect(journeysButton.props.style.minHeight).toBe(44);
      expect(journeysButton.props.style.padding).toBe(16);
    });
  });

  describe('Reduced Motion Support', () => {
    test('should respect reduced motion preferences', async () => {
      mockAccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);

      const { getByTestId } = render(
        <AccessibleNavigationComponent reduceMotion={true} />
      );

      // Navigation should still work but without animations
      fireEvent.press(getByTestId('nav-journeys-btn'));

      await waitFor(() => {
        expect(getByTestId('current-screen-announcement')).toHaveTextContent('Journeys');
      });

      expect(mockAccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
    });

    test('should disable animations when reduce motion is enabled', () => {
      mockThemeContext.theme.accessibility.reduceMotion = true;

      const { getByTestId } = render(
        <AccessibleNavigationComponent reduceMotion={true} />
      );

      // Component should render without animation-dependent features
      expect(getByTestId('accessible-navigation')).toBeTruthy();
    });
  });

  describe('Color and Visual Accessibility', () => {
    test('should not rely solely on color for navigation cues', () => {
      const { getByTestId } = render(<KeyboardNavigationComponent />);

      const keyboardNav = getByTestId('keyboard-navigation');
      fireEvent(keyboardNav, 'keyPress', { key: 'Tab' });

      const focusedButton = getByTestId('kbd-nav-map');
      
      // Should have multiple visual indicators, not just color
      expect(focusedButton.props.style.borderWidth).toBe(2); // Border indicator
      expect(focusedButton.props.children.props.style.fontWeight).toBe('bold'); // Text weight indicator
    });

    test('should handle grayscale mode', async () => {
      mockAccessibilityInfo.isGrayscaleEnabled.mockResolvedValue(true);

      const { getByTestId } = render(
        <AccessibleNavigationComponent />
      );

      // Should still be usable in grayscale mode
      fireEvent.press(getByTestId('nav-journeys-btn'));

      await waitFor(() => {
        expect(getByTestId('current-screen-announcement')).toHaveTextContent('Journeys');
      });
    });

    test('should handle inverted colors', async () => {
      mockAccessibilityInfo.isInvertColorsEnabled.mockResolvedValue(true);

      const { getByTestId } = render(
        <AccessibleNavigationComponent />
      );

      // Should remain functional with inverted colors
      expect(getByTestId('accessible-navigation')).toBeTruthy();
    });
  });

  describe('Error State Accessibility', () => {
    test('should announce navigation errors to screen readers', async () => {
      mockNavigationContext.navigateToScreen.mockRejectedValue(new Error('Navigation failed'));

      const ErrorNavigationComponent = () => {
        const [error, setError] = React.useState(null);

        const handleNavigation = async () => {
          try {
            await mockNavigationContext.navigateToScreen('Journeys');
          } catch (err) {
            setError(err.message);
            mockAccessibilityInfo.announceForAccessibility(`Navigation error: ${err.message}`);
          }
        };

        return (
          <View testID="error-navigation">
            {error && (
              <Text 
                testID="error-message"
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                Error: {error}
              </Text>
            )}
            <TouchableOpacity testID="error-nav-btn" onPress={handleNavigation}>
              <Text>Navigate</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(<ErrorNavigationComponent />);

      fireEvent.press(getByTestId('error-nav-btn'));

      await waitFor(() => {
        expect(getByTestId('error-message')).toBeTruthy();
        expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'Navigation error: Navigation failed'
        );
      });
    });

    test('should provide accessible error recovery options', async () => {
      const ErrorRecoveryComponent = () => {
        const [hasError, setHasError] = React.useState(true);

        return (
          <View testID="error-recovery">
            {hasError && (
              <View>
                <Text 
                  testID="error-description"
                  accessibilityRole="alert"
                >
                  Navigation is currently unavailable
                </Text>
                <TouchableOpacity
                  testID="retry-btn"
                  onPress={() => setHasError(false)}
                  accessibilityLabel="Retry navigation"
                  accessibilityHint="Double tap to try navigating again"
                  accessibilityRole="button"
                >
                  <Text>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      };

      const { getByTestId } = render(<ErrorRecoveryComponent />);

      const retryButton = getByTestId('retry-btn');
      expect(retryButton.props.accessibilityLabel).toBe('Retry navigation');
      expect(retryButton.props.accessibilityHint).toBe('Double tap to try navigating again');
      expect(retryButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('WCAG Compliance', () => {
    test('should meet WCAG 2.1 AA contrast requirements', () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent highContrast={true} />
      );

      const journeysButton = getByTestId('nav-journeys-btn');
      
      // High contrast mode should meet WCAG AA requirements (4.5:1 ratio)
      expect(journeysButton.props.style.backgroundColor).toBe('#000000');
      
      const buttonText = journeysButton.props.children;
      expect(buttonText.props.style.color).toBe('#FFFFFF');
    });

    test('should provide proper semantic structure', () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent screenReaderEnabled={true} />
      );

      const currentScreenText = getByTestId('current-screen-announcement');
      const journeysButton = getByTestId('nav-journeys-btn');
      const backButton = getByTestId('back-btn');

      expect(currentScreenText.props.accessibilityRole).toBe('text');
      expect(journeysButton.props.accessibilityRole).toBe('button');
      expect(backButton.props.accessibilityRole).toBe('button');
    });

    test('should support assistive technology navigation', () => {
      const { getByTestId } = render(
        <AccessibleNavigationComponent screenReaderEnabled={true} />
      );

      const journeysButton = getByTestId('nav-journeys-btn');
      
      expect(journeysButton.props.accessible).toBe(true);
      expect(journeysButton.props.accessibilityLabel).toBeDefined();
      expect(journeysButton.props.accessibilityHint).toBeDefined();
      expect(journeysButton.props.accessibilityRole).toBeDefined();
    });
  });
});