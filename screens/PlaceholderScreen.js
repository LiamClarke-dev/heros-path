import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Placeholder screen for features not yet implemented
 * Shows navigation options for auth screens
 */
export function PlaceholderScreen({ route }) {
  const { theme } = useTheme();
  const navigation = useNavigation();
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
      marginBottom: 32,
    },
    navigationSection: {
      width: '100%',
      maxWidth: 300,
    },
    navigationTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    navButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginBottom: 12,
      minHeight: 44, // Accessibility requirement
    },
    navButtonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    navButtonText: {
      color: theme.colors.surface,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    navButtonTextSecondary: {
      color: theme.colors.primary,
    },
  });
  
  const navigateToLogin = () => navigation.navigate('Login');
  const navigateToSignup = () => navigation.navigate('Signup');
  const navigateToForgotPassword = () => navigation.navigate('ForgotPassword');
  
  const renderAuthNavigation = () => {
    if (screenName === 'Login') {
      return (
        <View style={styles.navigationSection}>
          <Text style={styles.navigationTitle}>Authentication Navigation</Text>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={navigateToSignup}
            accessibilityLabel="Navigate to Sign Up"
            accessibilityRole="button"
          >
            <Text style={styles.navButtonText}>Go to Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navButton, styles.navButtonSecondary]} 
            onPress={navigateToForgotPassword}
            accessibilityLabel="Navigate to Forgot Password"
            accessibilityRole="button"
          >
            <Text style={[styles.navButtonText, styles.navButtonTextSecondary]}>
              Forgot Password
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (screenName === 'Sign Up') {
      return (
        <View style={styles.navigationSection}>
          <Text style={styles.navigationTitle}>Authentication Navigation</Text>
          <TouchableOpacity 
            style={[styles.navButton, styles.navButtonSecondary]} 
            onPress={navigateToLogin}
            accessibilityLabel="Navigate to Sign In"
            accessibilityRole="button"
          >
            <Text style={[styles.navButtonText, styles.navButtonTextSecondary]}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (screenName === 'Reset Password') {
      return (
        <View style={styles.navigationSection}>
          <Text style={styles.navigationTitle}>Authentication Navigation</Text>
          <TouchableOpacity 
            style={[styles.navButton, styles.navButtonSecondary]} 
            onPress={navigateToLogin}
            accessibilityLabel="Navigate to Sign In"
            accessibilityRole="button"
          >
            <Text style={[styles.navButtonText, styles.navButtonTextSecondary]}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{screenName}</Text>
      <Text style={styles.subtitle}>
        This screen will be implemented in a future task.{'\n'}
        Navigation infrastructure is now in place!
      </Text>
      {renderAuthNavigation()}
    </View>
  );
}