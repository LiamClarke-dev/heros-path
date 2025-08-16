/**
 * Sign In Screen - Placeholder
 * 
 * This is a placeholder screen for the authentication flow.
 * Will be fully implemented in Task 4.3
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const SignInScreen = () => {
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
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hero's Path MVP</Text>
      <Text style={styles.subtitle}>Sign In Screen - Coming Soon</Text>
    </View>
  );
};

export default SignInScreen;