import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Theme-aware navigation button component
 * Provides consistent styling and accessibility across navigation elements
 */
export function NavigationButton({ 
  onPress, 
  title, 
  icon, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  ...props 
}) {
  const { theme, navigationStyles } = useTheme();
  
  const getButtonStyle = () => {
    const baseStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      paddingHorizontal: size === 'small' ? 12 : size === 'large' ? 20 : 16,
      paddingVertical: size === 'small' ? 8 : size === 'large' ? 14 : 10,
      minHeight: 44, // Accessibility minimum touch target
    };
    
    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      default:
        return baseStyle;
    }
  };
  
  const getTextStyle = () => {
    const baseStyle = {
      fontSize: size === 'small' ? 14 : size === 'large' ? 18 : 16,
      fontWeight: '600',
      marginLeft: icon ? 8 : 0,
    };
    
    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          color: navigationStyles.contrastRatios.textOnPrimary > 4.5 ? '#FFFFFF' : theme.colors.text,
        };
      case 'secondary':
        return {
          ...baseStyle,
          color: theme.colors.text,
        };
      case 'ghost':
        return {
          ...baseStyle,
          color: theme.colors.primary,
        };
      default:
        return {
          ...baseStyle,
          color: theme.colors.text,
        };
    }
  };
  
  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return navigationStyles.contrastRatios.textOnPrimary > 4.5 ? '#FFFFFF' : theme.colors.text;
      case 'secondary':
        return theme.colors.text;
      case 'ghost':
        return theme.colors.primary;
      default:
        return theme.colors.text;
    }
  };
  
  const iconSize = size === 'small' ? 18 : size === 'large' ? 24 : 20;
  
  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        disabled && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      {...props}
    >
      {icon && (
        <Ionicons 
          name={icon} 
          size={iconSize} 
          color={getIconColor()} 
        />
      )}
      {title && (
        <Text style={getTextStyle()}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Theme-aware header button for navigation headers
 */
export function HeaderButton({ onPress, icon, accessibilityLabel, style }) {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        {
          padding: 8,
          borderRadius: 6,
          minWidth: 44,
          minHeight: 44,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons 
        name={icon} 
        size={24} 
        color={theme.colors.text} 
      />
    </TouchableOpacity>
  );
}