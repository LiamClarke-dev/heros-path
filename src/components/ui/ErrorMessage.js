/**
 * ErrorMessage Component - Themed Error Display
 * 
 * Provides consistent error messaging across the app
 * Supports different variants and retry functionality
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import Button from './Button';

/**
 * ErrorMessage Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Error message to display
 * @param {string} props.title - Optional error title
 * @param {string} props.variant - Error variant (error, warning, info)
 * @param {function} props.onRetry - Optional retry function
 * @param {string} props.retryText - Text for retry button
 * @param {boolean} props.showIcon - Whether to show error icon (future enhancement)
 * @param {Object} props.style - Additional container styles
 * @param {string} props.testID - Test identifier
 */
const ErrorMessage = ({
  message,
  title,
  variant = 'error',
  onRetry,
  retryText = 'Try Again',
  showIcon = false,
  style,
  testID = 'error-message',
  ...props
}) => {
  const { theme } = useTheme();

  // Variant-based colors
  const getVariantColors = () => {
    switch (variant) {
      case 'error':
        return {
          backgroundColor: `${theme.colors.error}15`, // 15% opacity
          borderColor: theme.colors.error,
          textColor: theme.colors.error,
        };
      case 'warning':
        return {
          backgroundColor: `${theme.colors.warning}15`,
          borderColor: theme.colors.warning,
          textColor: theme.colors.warning,
        };
      case 'info':
        return {
          backgroundColor: `${theme.colors.info}15`,
          borderColor: theme.colors.info,
          textColor: theme.colors.info,
        };
      default:
        return {
          backgroundColor: `${theme.colors.error}15`,
          borderColor: theme.colors.error,
          textColor: theme.colors.error,
        };
    }
  };

  const colors = getVariantColors();

  const containerStyles = [
    styles.container,
    {
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
    },
    style,
  ];

  const titleStyles = [
    theme.typography.label,
    {
      color: colors.textColor,
      marginBottom: title ? theme.spacing.xs : 0,
    },
  ];

  const messageStyles = [
    theme.typography.bodySmall,
    {
      color: theme.colors.text,
      lineHeight: 20,
    },
  ];

  return (
    <View style={containerStyles} testID={testID} {...props}>
      {title && (
        <Text style={titleStyles} testID={`${testID}-title`}>
          {title}
        </Text>
      )}
      
      <Text style={messageStyles} testID={`${testID}-text`}>
        {message}
      </Text>

      {onRetry && (
        <View style={styles.retryContainer}>
          <Button
            title={retryText}
            onPress={onRetry}
            variant="outline"
            size="small"
            style={[
              styles.retryButton,
              { marginTop: theme.spacing.sm },
            ]}
            testID={`${testID}-retry`}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Base container styles handled by dynamic styling
  },
  retryContainer: {
    alignItems: 'flex-start',
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
});

export default ErrorMessage;