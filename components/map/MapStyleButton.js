import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * MapStyleButton Component
 * 
 * Handles map style selector button with style selector modal trigger.
 * Includes current style indication and user interaction.
 * 
 * Requirements addressed:
 * - 4.1: Extract map style selector button
 * - 4.2: Implement style selector modal trigger
 * - 4.4: Handle current style indication and user interaction
 */
const MapStyleButton = ({
  onPress,
  currentStyle = 'standard',
  isVisible = false,
}) => {
  const { theme } = useTheme();

  /**
   * Get button icon based on current map style
   */
  const getButtonIcon = () => {
    switch (currentStyle) {
      case 'satellite':
        return 'satellite';
      case 'terrain':
        return 'earth';
      case 'night':
        return 'moon';
      case 'adventure':
        return 'compass';
      case 'standard':
      default:
        return 'map';
    }
  };

  /**
   * Get button styles based on selector visibility and theme
   */
  const getButtonStyles = () => {
    const baseStyle = [styles.mapStyleButton];
    
    baseStyle.push({ 
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outline,
    });

    if (isVisible) {
      baseStyle.push(styles.mapStyleButtonActive);
      baseStyle.push({ 
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
      });
    }

    return baseStyle;
  };

  /**
   * Get icon color based on selector visibility and theme
   */
  const getIconColor = () => {
    if (isVisible) {
      return theme.colors.onPrimary;
    }
    return theme.colors.onSurface;
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={getButtonIcon()}
        size={20}
        color={getIconColor()}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  mapStyleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  mapStyleButtonActive: {
    // Active state styles applied via theme colors
  },
});

export default MapStyleButton;