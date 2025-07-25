import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Placeholder screen for features not yet implemented
 */
export function PlaceholderScreen({ route }) {
  const { theme } = useTheme();
  const screenName = route?.params?.screenName || 'Screen';
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{screenName}</Text>
      <Text style={styles.subtitle}>
        This screen will be implemented in a future task.{'\n'}
        Navigation infrastructure is now in place!
      </Text>
    </View>
  );
}