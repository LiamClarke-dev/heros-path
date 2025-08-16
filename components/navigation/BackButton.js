import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * BackButton component with proper navigation logic
 * Provides consistent back navigation behavior across the app
 * Requirements: 1.5, 1.6 - Consistent header actions and navigation controls
 */
export function BackButton({ 
  onPress,
  icon,
  color,
  size = 24,
  style,
  disabled = false,
  accessibilityLabel = 'Go back',
  testID = 'back-button'
}) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };
  
  const getBackIcon = () => {
    if (icon) return icon;
    
    // Use platform-appropriate back icon
    if (Platform.OS === 'ios') {
      return 'chevron-back';
    } else {
      return 'arrow-back';
    }
  };
  
  const iconColor = color || theme.colors.text;
  
  const styles = StyleSheet.create({
    button: {
      padding: 8,
      borderRadius: 6,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: disabled ? 0.5 : 1,
    },
  });
  
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      disabled={disabled || !navigation.canGoBack()}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Navigates to the previous screen"
      testID={testID}
    >
      <Ionicons 
        name={getBackIcon()} 
        size={size} 
        color={iconColor} 
      />
    </TouchableOpacity>
  );
}

/**
 * HeaderBackButton component specifically for navigation headers
 */
export function HeaderBackButton({ 
  onPress,
  tintColor,
  canGoBack = true,
  style 
}) {
  const { theme } = useTheme();
  
  if (!canGoBack) {
    return null;
  }
  
  return (
    <BackButton
      onPress={onPress}
      color={tintColor || theme.colors.text}
      style={[{ marginLeft: Platform.OS === 'ios' ? 8 : 4 }, style]}
      accessibilityLabel="Navigate back"
      testID="header-back-button"
    />
  );
}

/**
 * CloseButton component for modal screens
 */
export function CloseButton({ 
  onPress,
  color,
  size = 24,
  style,
  accessibilityLabel = 'Close'
}) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };
  
  const iconColor = color || theme.colors.text;
  
  const styles = StyleSheet.create({
    button: {
      padding: 8,
      borderRadius: 6,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
  
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Closes the current screen"
      testID="close-button"
    >
      <Ionicons 
        name={Platform.OS === 'ios' ? 'close' : 'close'} 
        size={size} 
        color={iconColor} 
      />
    </TouchableOpacity>
  );
}