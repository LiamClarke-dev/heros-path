import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { signUpWithEmail, signInWithEmail } from '../firebase';
import Logger from '../utils/Logger';

/**
 * EmailAuthScreen - Email/password authentication screen
 * 
 * Features:
 * - Email and password input fields with validation
 * - Sign-up and sign-in functionality
 * - Form validation with real-time feedback
 * - Error handling and user feedback
 * - Theme integration
 * - Accessibility support
 * - Responsive design
 * 
 * Requirements implemented:
 * - 1.3: Email/password input form
 * - 1.4: Sign-up functionality for new users
 * - 1.5: Sign-in functionality for existing users
 * - 1.8: Form validation and error handling
 * - 5.3: Theme integration and user feedback
 */
export function EmailAuthScreen({ navigation }) {
  const { theme } = useTheme();
  const { loading: userLoading } = useUser();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  
  // Refs for input focus management
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const styles = createStyles(theme);

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - True if valid
   */
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {object} - Validation result with isValid and message
   */
  const validatePassword = (password) => {
    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters' };
    }
    return { isValid: true, message: '' };
  };

  /**
   * Validate form fields in real-time
   * Implements requirement 1.8 - form validation
   */
  const validateFields = () => {
    const errors = {};

    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.message;
      }
    }

    // Confirm password validation (only for sign-up)
    if (isSignUp) {
      if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   * Implements requirements 1.4 (sign-up) and 1.5 (sign-in)
   */
  const handleSubmit = async () => {
    try {
      // Clear previous errors
      setError(null);
      
      // Validate form
      if (!validateFields()) {
        Logger.warn('Form validation failed');
        return;
      }

      setLoading(true);
      
      if (isSignUp) {
        Logger.info('User attempting to sign up with email:', email);
        await signUpWithEmail(email, password);
        Logger.info('Sign up successful');
        
        // Show success message
        Alert.alert(
          'Account Created',
          'Your account has been created successfully!',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Logger.info('User attempting to sign in with email:', email);
        await signInWithEmail(email, password);
        Logger.info('Sign in successful');
      }
      
      // Navigation will be handled automatically by AuthNavigator
      // when authentication state changes
      
    } catch (error) {
      Logger.error(`${isSignUp ? 'Sign up' : 'Sign in'} failed:`, error.message);
      setError(error.message);
      
      // Show user-friendly error alert
      Alert.alert(
        `${isSignUp ? 'Sign Up' : 'Sign In'} Failed`,
        error.message,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle between sign-up and sign-in modes
   */
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setFieldErrors({});
    setConfirmPassword('');
    Logger.info(`Switched to ${!isSignUp ? 'sign-up' : 'sign-in'} mode`);
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Handle input change with validation
   */
  const handleEmailChange = (text) => {
    setEmail(text);
    if (fieldErrors.email) {
      // Clear error when user starts typing
      setFieldErrors(prev => ({ ...prev, email: null }));
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: null }));
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    if (fieldErrors.confirmPassword) {
      setFieldErrors(prev => ({ ...prev, confirmPassword: null }));
    }
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
            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp 
                ? 'Join Hero\'s Path and start your adventure'
                : 'Sign in to continue your journey'
              }
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

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[
                  styles.textInput,
                  fieldErrors.email && styles.inputError
                ]}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                accessibilityLabel="Email input"
                accessibilityHint="Enter your email address"
              />
              {fieldErrors.email && (
                <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                ref={passwordRef}
                style={[
                  styles.textInput,
                  fieldErrors.password && styles.inputError
                ]}
                value={password}
                onChangeText={handlePasswordChange}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                returnKeyType={isSignUp ? "next" : "done"}
                onSubmitEditing={() => {
                  if (isSignUp) {
                    confirmPasswordRef.current?.focus();
                  } else {
                    handleSubmit();
                  }
                }}
                accessibilityLabel="Password input"
                accessibilityHint="Enter your password"
              />
              {fieldErrors.password && (
                <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
              )}
            </View>

            {/* Confirm Password Input (Sign-up only) */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  ref={confirmPasswordRef}
                  style={[
                    styles.textInput,
                    fieldErrors.confirmPassword && styles.inputError
                  ]}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder="Confirm your password"
                  placeholderTextColor={theme.colors.textSecondary}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  accessibilityLabel="Confirm password input"
                  accessibilityHint="Re-enter your password to confirm"
                />
                {fieldErrors.confirmPassword && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
                )}
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.buttonDisabled
              ]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityLabel={isSignUp ? "Create account" : "Sign in"}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
            >
              {loading ? (
                <ActivityIndicator 
                  size="small" 
                  color="#FFFFFF" 
                  style={styles.buttonLoader}
                />
              ) : null}
              <Text style={styles.submitButtonText}>
                {loading 
                  ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                  : (isSignUp ? 'Create Account' : 'Sign In')
                }
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account?' : 'Don\'t have an account?'}
            </Text>
            <TouchableOpacity
              onPress={toggleMode}
              style={styles.toggleButton}
              accessibilityLabel={isSignUp ? "Switch to sign in" : "Switch to sign up"}
              accessibilityRole="button"
            >
              <Text style={styles.toggleButtonText}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
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
    marginBottom: 32,
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
  formContainer: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 48,
  },
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  fieldErrorText: {
    fontSize: 14,
    color: theme.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLoader: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
  },
  toggleText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  toggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});