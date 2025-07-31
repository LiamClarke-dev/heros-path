/**
 * LoadingSpinner - Reusable loading spinner component
 * 
 * Single Responsibility: Loading state visualization
 * Requirements: General UI component
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export const LoadingSpinner = React.memo(({ 
  size = 'large', 
  color, 
  style,
  containerStyle 
}) => {
  const { theme } = useTheme();
  
  const spinnerColor = color || theme.colors.primary;

  const styles = StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <ActivityIndicator 
        size={size} 
        color={spinnerColor} 
        style={style}
      />
    </View>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';