import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { signInWithGoogle } from '../firebase';
import Logger from '../utils/Logger';

/**
 * SignInScreen - Primary authentication screen
 * 
 * Features:
 * - Google Sign-In button with proper OAuth flow
 * - Navigation to email authentication screen
 * - Loading states and error handling
 * - Theme integration with light, dark, and adventure themes
 * - Accessibility support
 * - Responsive design for different screen sizes
 * 
 * Requirements implemented:
 * - 1.1: Display sign-in options including Google authentication and email/password
 * - 1.2: Google OAuth flow initiation
 * - 5.1: Loading states and error handling
 * - 5.3: Theme integration
 */
export function SignInScreen({ navigation }) {
  const { theme } = useTheme();
  const { loading: userLoading } = useUser();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  const styles = createStyles(theme);

  /**
   * Handle Google Sign-In
   * Implements Google OAuth flow as per requirement 1.2
   */
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      
      Logger.info('User initiated Google sign-in');
      
      // Call Firebase Google sign-in function
      await signInWithGoogle();
      
      Logger.info('Google sign-in completed successfully');
      // Navigation will be handled automatically by AuthNavigator
      // when authentication state changes
      
    } catch (error) {
      Logger.error('Google sign-in failed:', error.message);
      setError(error.message);
      
      // Show user-friendly error alert
      Alert.alert(
        'Sign In Failed',
        error.message,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  /**
   * Navigate to email authentication screen
   * Implements requirement 1.3 navigation
   */
  const handleEmailSignIn = () => {
    try {
      Logger.info('User navigating to email authentication');
      navigation.navigate('EmailAuth');
    } catch (error) {
      Logger.error('Navigation to email auth failed:', error);
      setError('Navigation failed. Please try again.');
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  // Show loading if user context is still initializing
  if (userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Welcome to Hero's Path</Text>
            <Text style={styles.subtitle}>
              Transform your walks into adventures of discovery
            </Text>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                onPress={clearError}
                style={styles.errorDismiss}
                accessibilityLabel="Dismiss error"
                accessibilityRole="button"
              >
                <Text style={styles.errorDismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Authentication Options */}
          <View style={styles.authContainer}>
            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                googleLoading && styles.buttonDisabled
              ]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              accessibilityLabel="Sign in with Google"
              accessibilityRole="button"
              accessibilityState={{ disabled: googleLoading }}
            >
              {googleLoading ? (
                <ActivityIndicator 
                  size="small" 
                  color={theme.colors.text} 
                  style={styles.buttonLoader}
                />
              ) : (
                <Text style={styles.googleButtonText}>🔍</Text>
              )}
              <Text style={styles.googleButtonLabel}>
                {googleLoading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Sign-In Button */}
            <TouchableOpacity
              style={styles.emailButton}
              onPress={handleEmailSignIn}
              accessibilityLabel="Sign in with email"
              accessibilityRole="button"
            >
              <Text style={styles.emailButtonText}>📧</Text>
              <Text style={styles.emailButtonLabel}>Continue with Email</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Create theme-aware styles
 * Implements requirement 5.3 - theme integration
 */
const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  errorContainer: {
    backgroundColor: theme.colors.error + '15', // 15% opacity
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
    lineHeight: 20,
  },
  errorDismiss: {
    marginLeft: 12,
    padding: 4,
  },
  errorDismissText: {
    fontSize: 16,
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  authContainer: {
    marginBottom: 32,
  },
  googleButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLoader: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 20,
    marginRight: 12,
  },
  googleButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  emailButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emailButtonText: {
    fontSize: 20,
    marginRight: 12,
  },
  emailButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerContainer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});