import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * SavedPlacesToggle Component
 * 
 * Handles saved places visibility toggle with state visualization and interaction.
 * Includes places loading states and user feedback.
 * 
 * Requirements addressed:
 * - 4.1: Extract saved places visibility toggle
 * - 4.2: Implement toggle state visualization and interaction
 * - 4.4: Handle places loading states and user feedback
 */
const SavedPlacesToggle = ({
  onPress,
  isVisible = false,
  isLoading = false,
  hasPlaces = false,
  isAuthenticated = false,
}) => {
  const { theme } = useTheme();

  // Don't render if user is not authenticated or has no places
  if (!isAuthenticated || !hasPlaces) {
    return null;
  }

  /**
   * Get button text based on visibility state
   */
  const getButtonText = () => {
    if (isLoading) {
      return 'Loading...';
    }
    return isVisible ? 'Hide Places' : 'Show Places';
  };

  /**
   * Get button icon based on visibility state
   */
  const getButtonIcon = () => {
    if (isLoading) {
      return null; // Will show ActivityIndicator instead
    }
    return isVisible ? 'location-off' : 'location';
  };

  /**
   * Get button styles based on visibility state and theme
   */
  const getButtonStyles = () => {
    const baseStyle = [styles.savedPlacesButton];
    
    if (isVisible) {
      baseStyle.push(styles.savedPlacesButtonActive);
      baseStyle.push({ 
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
      });
    } else {
      baseStyle.push(styles.savedPlacesButtonInactive);
      baseStyle.push({ 
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.outline,
      });
    }

    if (isLoading) {
      baseStyle.push(styles.savedPlacesButtonLoading);
    }

    return baseStyle;
  };

  /**
   * Get text styles based on visibility state and theme
   */
  const getTextStyles = () => {
    const baseStyle = [styles.savedPlacesButtonText];
    
    if (isVisible) {
      baseStyle.push(styles.savedPlacesButtonTextActive);
      baseStyle.push({ color: theme.colors.onSecondary });
    } else {
      baseStyle.push(styles.savedPlacesButtonTextInactive);
      baseStyle.push({ color: theme.colors.onSurface });
    }

    return baseStyle;
  };

  /**
   * Get icon color based on visibility state and theme
   */
  const getIconColor = () => {
    if (isVisible) {
      return theme.colors.onSecondary;
    }
    return theme.colors.onSurface;
  };

  /**
   * Render loading indicator or icon
   */
  const renderIcon = () => {
    if (isLoading) {
      return (
        <ActivityIndicator
          size="small"
          color={getIconColor()}
          style={styles.savedPlacesButtonIcon}
        />
      );
    }

    return (
      <Ionicons
        name={getButtonIcon()}
        size={16}
        color={getIconColor()}
        style={styles.savedPlacesButtonIcon}
      />
    );
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      {renderIcon()}
      <Text style={getTextStyles()}>
        {getButtonText()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  savedPlacesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    minWidth: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  savedPlacesButtonActive: {
    // Active state styles applied via theme colors
  },
  savedPlacesButtonInactive: {
    // Inactive state styles applied via theme colors
  },
  savedPlacesButtonLoading: {
    opacity: 0.7,
  },
  savedPlacesButtonIcon: {
    marginRight: 6,
  },
  savedPlacesButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  savedPlacesButtonTextActive: {
    // Active text styles applied via theme colors
  },
  savedPlacesButtonTextInactive: {
    // Inactive text styles applied via theme colors
  },
});

export default SavedPlacesToggle;