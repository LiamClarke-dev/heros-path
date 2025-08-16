/**
 * Button Component - Themed Button with Multiple Variants
 * 
 * Provides consistent button styling across the app
 * Supports multiple variants, sizes, and states
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Button Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Button text
 * @param {function} props.onPress - Press handler
 * @param {string} props.variant - Button variant (primary, secondary, outline, ghost)
 * @param {string} props.size - Button size (small, medium, large)
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {boolean} props.loading - Whether to show loading spinner
 * @param {Object} props.style - Additional button styles
 * @param {Object} props.textStyle - Additional text styles
 * @param {string} props.testID - Test identifier
 */
const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  testID,
  ...props
}) => {
  const { theme } = useTheme();

  // Button variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
          borderWidth: 1,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary,
          borderColor: theme.colors.secondary,
          borderWidth: 1,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: theme.colors.primary,
          borderWidth: 1,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 1,
        };
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          borderColor: theme.colors.success,
          borderWidth: 1,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error,
          borderColor: theme.colors.error,
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
          borderWidth: 1,
        };
    }
  };

  // Text color based on variant
  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'success':
      case 'error':
        return theme.colors.textInverse;
      case 'outline':
      case 'ghost':
        return theme.colors.primary;
      default:
        return theme.colors.textInverse;
    }
  };

  // Size-based styles
  const getSizeStyles = () => {
    const sizeConfig = theme.components.button;
    return {
      height: sizeConfig.height[size],
      paddingHorizontal: sizeConfig.paddingHorizontal[size],
    };
  };

  const buttonStyles = [
    styles.base,
    getVariantStyles(),
    getSizeStyles(),
    {
      borderRadius: theme.borderRadius.md,
    },
    disabled && styles.disabled,
    style,
  ];

  const buttonTextStyles = [
    theme.typography.button,
    {
      color: getTextColor(),
    },
    disabled && styles.disabledText,
    textStyle,
  ];

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      disabled={disabled || loading}
      testID={testID}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          testID={`${testID}-loading`}
        />
      ) : (
        <Text style={buttonTextStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});

export default Button;