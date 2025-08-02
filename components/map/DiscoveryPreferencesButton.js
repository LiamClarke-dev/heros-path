import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Discovery Preferences Button Component
 * 
 * Provides quick access to discovery preferences from the map screen.
 * Allows users to customize their discovery settings without leaving the map.
 * 
 * Responsibilities:
 * - Display preferences access button in map controls
 * - Handle navigation to discovery preferences screen
 * - Provide visual feedback for button interactions
 * 
 * Props:
 * - onPress: Callback function when button is pressed
 * - isAuthenticated: Whether user is authenticated (required for preferences)
 * 
 * Requirements Addressed:
 * - 1.1: Access to discovery preferences from map screen
 * - 1.4: Navigation to preferences screen
 * - 2.1: Quick access to rating preferences
 * - 2.4: Easy preference management during discovery
 * 
 * @see screens/DiscoveryPreferencesScreen.js for the preferences interface
 * @see hooks/useDiscoveryPreferences.js for preference management
 */
const DiscoveryPreferencesButton = React.memo(({ onPress, isAuthenticated }) => {
  const { theme } = useTheme();

  // Don't show button if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const styles = StyleSheet.create({
    button: {
      backgroundColor: theme.colors.surface,
      borderRadius: 25,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel="Discovery Preferences"
      accessibilityHint="Open discovery preferences to customize place types and rating filters"
    >
      <MaterialIcons 
        name="tune" 
        size={24} 
        color={theme.colors.primary} 
      />
    </TouchableOpacity>
  );
});

DiscoveryPreferencesButton.displayName = 'DiscoveryPreferencesButton';

export default DiscoveryPreferencesButton;