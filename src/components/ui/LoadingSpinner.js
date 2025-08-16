/**
 * LoadingSpinner Component - Themed Loading Indicator
 * 
 * Provides consistent loading states across the app
 * Supports different sizes and overlay modes
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * LoadingSpinner Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.size - Spinner size (small, medium, large)
 * @param {string} props.color - Spinner color (defaults to theme primary)
 * @param {string} props.message - Optional loading message
 * @param {boolean} props.overlay - Whether to show as full-screen overlay
 * @param {Object} props.style - Additional container styles
 * @param {string} props.testID - Test identifier
 */
const LoadingSpinner = ({
  size = 'medium',
  color,
  message,
  overlay = false,
  style,
  testID = 'loading-spinner',
  ...props
}) => {
  const { theme } = useTheme();

  // Size mapping
  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 'small';
      case 'medium':
        return 'large';
      case 'large':
        return 'large';
      default:
        return 'large';
    }
  };

  const spinnerColor = color || theme.colors.primary;

  const containerStyles = [
    overlay ? styles.overlay : styles.container,
    overlay && { backgroundColor: theme.colors.overlay },
    style,
  ];

  const contentStyles = [
    styles.content,
    {
      backgroundColor: overlay ? theme.colors.surface : 'transparent',
      borderRadius: overlay ? theme.borderRadius.lg : 0,
      padding: overlay ? theme.spacing.lg : 0,
    },
  ];

  return (
    <View style={containerStyles} testID={testID} {...props}>
      <View style={contentStyles}>
        <ActivityIndicator
          size={getSizeValue()}
          color={spinnerColor}
          testID={`${testID}-indicator`}
        />
        {message && (
          <Text
            style={[
              styles.message,
              theme.typography.body,
              { color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
            ]}
            testID={`${testID}-message`}
          >
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
  },
});

export default LoadingSpinner;