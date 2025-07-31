/**
 * LoadingSpinner - Reusable loading spinner component
 * 
 * Single Responsibility: Loading state visualization
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export const LoadingSpinner = React.memo(({ 
  size = 'large', 
  text = null, 
  color = null 
}) => {
  const { theme } = useTheme();
  
  const spinnerColor = color || theme.colors.primary;

  const styles = StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    text: {
      marginTop: 12,
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';