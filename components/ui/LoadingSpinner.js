/**
 * Loading Spinner Component
 * 
 * Simple loading spinner component for displaying loading states
 * with theme-aware styling.
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Loading Spinner Component
 * Displays a centered loading spinner with optional text
 */
const LoadingSpinner = React.memo(({
  text = 'Loading...',
  size = 'large',
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator
        size={size}
        color={theme.colors.primary}
      />
      {text && (
        <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
          {text}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '400',
  },
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;