/**
 * Journey History Screen - Placeholder
 * 
 * This is a placeholder screen for viewing past journeys.
 * Will be fully implemented in Task 11.1
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const JourneyHistoryScreen = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    status: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Journey History</Text>
      <Text style={styles.subtitle}>View your past adventures</Text>
      <Text style={styles.status}>History Screen - Coming Soon</Text>
    </View>
  );
};

export default JourneyHistoryScreen;