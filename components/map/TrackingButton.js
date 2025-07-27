import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * TrackingButton Component
 * 
 * Handles journey tracking button logic with tracking state visualization and user feedback.
 * Includes authentication checks and proper button interactions.
 * 
 * Requirements addressed:
 * - 4.1: Extract journey tracking button logic
 * - 4.2: Implement tracking state visualization and user feedback
 * - 4.4: Handle authentication checks and button interactions
 */
const TrackingButton = ({
  onPress,
  isTracking = false,
  isAuthenticated = false,
  journeyStartTime = null,
}) => {
  const { theme } = useTheme();

  /**
   * Handle button press with authentication check
   */
  const handlePress = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to track your journeys.',
        [{ text: 'OK' }]
      );
      return;
    }

    onPress();
  };

  /**
   * Get button text based on tracking state
   */
  const getButtonText = () => {
    if (isTracking) {
      return 'Stop';
    }
    return 'Start';
  };

  /**
   * Get button icon based on tracking state
   */
  const getButtonIcon = () => {
    if (isTracking) {
      return 'stop';
    }
    return 'play';
  };

  /**
   * Get button styles based on tracking state and theme
   */
  const getButtonStyles = () => {
    const baseStyle = [styles.trackingButton];
    
    if (isTracking) {
      baseStyle.push(styles.trackingButtonActive);
      baseStyle.push({ backgroundColor: theme.colors.error });
    } else {
      baseStyle.push(styles.trackingButtonInactive);
      baseStyle.push({ backgroundColor: theme.colors.primary });
    }

    if (!isAuthenticated) {
      baseStyle.push(styles.trackingButtonDisabled);
      baseStyle.push({ backgroundColor: theme.colors.disabled });
    }

    return baseStyle;
  };

  /**
   * Get text styles based on tracking state and theme
   */
  const getTextStyles = () => {
    const baseStyle = [styles.trackingButtonText];
    
    if (isTracking) {
      baseStyle.push(styles.trackingButtonTextActive);
    } else {
      baseStyle.push(styles.trackingButtonTextInactive);
    }

    baseStyle.push({ color: theme.colors.onPrimary });

    return baseStyle;
  };

  /**
   * Get icon color based on theme
   */
  const getIconColor = () => {
    return theme.colors.onPrimary;
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!isAuthenticated}
    >
      <Ionicons
        name={getButtonIcon()}
        size={24}
        color={getIconColor()}
        style={styles.trackingButtonIcon}
      />
      <Text style={getTextStyles()}>
        {getButtonText()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  trackingButtonActive: {
    // Active state styles applied via theme colors
  },
  trackingButtonInactive: {
    // Inactive state styles applied via theme colors
  },
  trackingButtonDisabled: {
    opacity: 0.6,
  },
  trackingButtonIcon: {
    marginRight: 8,
  },
  trackingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackingButtonTextActive: {
    // Active text styles applied via theme colors
  },
  trackingButtonTextInactive: {
    // Inactive text styles applied via theme colors
  },
});

export default TrackingButton;