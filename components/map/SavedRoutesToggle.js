import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * SavedRoutesToggle Component
 * 
 * Handles saved routes visibility toggle with state visualization and interaction.
 * Includes routes loading states and user feedback.
 * 
 * Requirements addressed:
 * - 4.1: Extract saved routes visibility toggle
 * - 4.2: Implement toggle state visualization and interaction
 * - 4.4: Handle routes loading states and user feedback
 */
const SavedRoutesToggle = ({
  onPress,
  isVisible = false,
  isLoading = false,
  hasRoutes = false,
  isAuthenticated = false,
}) => {
  const { theme } = useTheme();

  // Don't render if user is not authenticated or has no routes
  if (!isAuthenticated || !hasRoutes) {
    return null;
  }

  /**
   * Get button text based on visibility state
   */
  const getButtonText = () => {
    if (isLoading) {
      return 'Loading...';
    }
    return isVisible ? 'Hide Routes' : 'Show Routes';
  };

  /**
   * Get button icon based on visibility state
   */
  const getButtonIcon = () => {
    if (isLoading) {
      return null; // Will show ActivityIndicator instead
    }
    return isVisible ? 'eye-off' : 'eye';
  };

  /**
   * Get button styles based on visibility state and theme
   */
  const getButtonStyles = () => {
    const baseStyle = [styles.savedRoutesButton];
    
    if (isVisible) {
      baseStyle.push(styles.savedRoutesButtonActive);
      baseStyle.push({ 
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
      });
    } else {
      baseStyle.push(styles.savedRoutesButtonInactive);
      baseStyle.push({ 
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.outline,
      });
    }

    if (isLoading) {
      baseStyle.push(styles.savedRoutesButtonLoading);
    }

    return baseStyle;
  };

  /**
   * Get text styles based on visibility state and theme
   */
  const getTextStyles = () => {
    const baseStyle = [styles.savedRoutesButtonText];
    
    if (isVisible) {
      baseStyle.push(styles.savedRoutesButtonTextActive);
      baseStyle.push({ color: theme.colors.onPrimary });
    } else {
      baseStyle.push(styles.savedRoutesButtonTextInactive);
      baseStyle.push({ color: theme.colors.onSurface });
    }

    return baseStyle;
  };

  /**
   * Get icon color based on visibility state and theme
   */
  const getIconColor = () => {
    if (isVisible) {
      return theme.colors.onPrimary;
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
          style={styles.savedRoutesButtonIcon}
        />
      );
    }

    return (
      <Ionicons
        name={getButtonIcon()}
        size={16}
        color={getIconColor()}
        style={styles.savedRoutesButtonIcon}
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
  savedRoutesButton: {
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
  savedRoutesButtonActive: {
    // Active state styles applied via theme colors
  },
  savedRoutesButtonInactive: {
    // Inactive state styles applied via theme colors
  },
  savedRoutesButtonLoading: {
    opacity: 0.7,
  },
  savedRoutesButtonIcon: {
    marginRight: 6,
  },
  savedRoutesButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  savedRoutesButtonTextActive: {
    // Active text styles applied via theme colors
  },
  savedRoutesButtonTextInactive: {
    // Inactive text styles applied via theme colors
  },
});

export default SavedRoutesToggle;