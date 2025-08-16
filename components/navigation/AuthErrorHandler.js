/**
 * AuthErrorHandler component for Hero's Path
 * Handles authentication-related errors during navigation
 * Requirements: 10.4, 10.5, 10.6
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import NavigationErrorService from '../../services/NavigationErrorService';
import Logger from '../../utils/Logger';

const AuthErrorHandler = ({ 
  children, 
  onAuthError, 
  onAuthRecovery,
  requireAuth = false,
  fallbackRoute = 'Map',
}) => {
  const [authError, setAuthError] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const theme = useTheme();
  const { user, isAuthenticated, signOut, refreshAuth } = useUser();

  // Monitor authentication state changes
  useEffect(() => {
    if (requireAuth && !isAuthenticated && !authError) {
      handleAuthRequired();
    }
  }, [isAuthenticated, requireAuth, authError]);

  const handleAuthRequired = useCallback(() => {
    const error = new Error('Authentication required');
    setAuthError(error);
    setShowAuthModal(true);
    
    Logger.authError(error, {
      requireAuth,
      isAuthenticated,
      fallbackRoute,
    });

    if (onAuthError) {
      onAuthError(error);
    }
  }, [requireAuth, isAuthenticated, fallbackRoute, onAuthError]);

  const handleAuthError = useCallback((error, context = {}) => {
    setAuthError(error);
    setShowAuthModal(true);
    setRetryCount(prev => prev + 1);

    Logger.authError(error, {
      ...context,
      retryCount: retryCount + 1,
      requireAuth,
      isAuthenticated,
    });

    // Handle through navigation error service
    NavigationErrorService.handleAuthError(error, context);

    if (onAuthError) {
      onAuthError(error, context);
    }
  }, [retryCount, requireAuth, isAuthenticated, onAuthError]);

  const handleRetryAuth = useCallback(async () => {
    setIsRecovering(true);
    
    try {
      Logger.info('Attempting authentication retry', { attempt: retryCount + 1 });
      
      // Try to refresh authentication
      if (refreshAuth) {
        await refreshAuth();
        
        if (isAuthenticated) {
          // Success - clear error state
          setAuthError(null);
          setShowAuthModal(false);
          setRetryCount(0);
          
          Logger.info('Authentication retry successful');
          
          if (onAuthRecovery) {
            onAuthRecovery();
          }
          
          return;
        }
      }
      
      // If refresh failed, redirect to auth flow
      handleRedirectToAuth();
      
    } catch (error) {
      Logger.error('Authentication retry failed', error);
      Alert.alert(
        'Authentication Failed',
        'Unable to restore your session. Please sign in again.',
        [{ text: 'OK', onPress: handleRedirectToAuth }]
      );
    } finally {
      setIsRecovering(false);
    }
  }, [retryCount, isAuthenticated, refreshAuth, onAuthRecovery]);

  const handleRedirectToAuth = useCallback(() => {
    setAuthError(null);
    setShowAuthModal(false);
    setRetryCount(0);
    
    Logger.info('Redirecting to authentication flow');
    
    // Navigate to auth flow through error service
    NavigationErrorService.handleAuthError(
      new Error('Redirecting to authentication'),
      { action: 'redirect' }
    );
  }, []);

  const handleContinueWithoutAuth = useCallback(() => {
    if (!requireAuth) {
      setAuthError(null);
      setShowAuthModal(false);
      setRetryCount(0);
      
      Logger.info('Continuing without authentication');
      
      // Navigate to fallback route
      NavigationErrorService.navigateToFallback();
    } else {
      Alert.alert(
        'Authentication Required',
        'This feature requires you to be signed in. Please authenticate to continue.',
        [
          { text: 'Sign In', onPress: handleRedirectToAuth },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  }, [requireAuth]);

  const handleSignOut = useCallback(async () => {
    try {
      setIsRecovering(true);
      
      Logger.info('User initiated sign out from auth error handler');
      
      if (signOut) {
        await signOut();
      }
      
      setAuthError(null);
      setShowAuthModal(false);
      setRetryCount(0);
      
      // Navigate to appropriate route after sign out
      NavigationErrorService.navigateToFallback();
      
    } catch (error) {
      Logger.error('Sign out failed', error);
      Alert.alert(
        'Sign Out Failed',
        'Unable to sign out properly. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRecovering(false);
    }
  }, [signOut]);

  const getAuthErrorMessage = () => {
    if (!authError) return '';
    
    if (authError.message.includes('expired')) {
      return 'Your session has expired. Please sign in again to continue.';
    }
    
    if (authError.message.includes('invalid')) {
      return 'Your authentication is invalid. Please sign in again.';
    }
    
    if (authError.message.includes('required')) {
      return 'This feature requires authentication. Please sign in to continue.';
    }
    
    return 'An authentication error occurred. Please try signing in again.';
  };

  const getAuthErrorIcon = () => {
    if (!authError) return 'person-outline';
    
    if (authError.message.includes('expired')) {
      return 'time-outline';
    }
    
    if (authError.message.includes('invalid')) {
      return 'warning-outline';
    }
    
    return 'lock-closed-outline';
  };

  // Expose error handler to children through context if needed
  const contextValue = {
    handleAuthError,
    isAuthError: !!authError,
    retryCount,
  };

  return (
    <View style={styles.container}>
      {children}
      
      {/* Authentication Error Modal */}
      <Modal
        visible={showAuthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !requireAuth && setShowAuthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Ionicons 
              name={getAuthErrorIcon()} 
              size={64} 
              color={theme.colors.warning} 
              style={styles.modalIcon}
            />
            
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Authentication {requireAuth ? 'Required' : 'Error'}
            </Text>
            
            <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>
              {getAuthErrorMessage()}
            </Text>

            {retryCount > 0 && (
              <View style={[styles.retryInfo, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.retryText, { color: theme.colors.textSecondary }]}>
                  Retry attempts: {retryCount}
                </Text>
              </View>
            )}

            {user && (
              <View style={[styles.userInfo, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.userInfoText, { color: theme.colors.textSecondary }]}>
                  Current user: {user.email || user.displayName || 'Unknown'}
                </Text>
              </View>
            )}
            
            <View style={styles.buttonContainer}>
              {isAuthenticated ? (
                <>
                  <TouchableOpacity 
                    style={[
                      styles.button, 
                      styles.primaryButton, 
                      { backgroundColor: theme.colors.primary },
                      isRecovering && styles.disabledButton
                    ]}
                    onPress={handleRetryAuth}
                    disabled={isRecovering}
                  >
                    <Ionicons 
                      name={isRecovering ? "hourglass-outline" : "refresh-outline"} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.buttonText}>
                      {isRecovering ? 'Retrying...' : 'Retry'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.button, 
                      styles.secondaryButton, 
                      { backgroundColor: theme.colors.error },
                      isRecovering && styles.disabledButton
                    ]}
                    onPress={handleSignOut}
                    disabled={isRecovering}
                  >
                    <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Sign Out</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleRedirectToAuth}
                  >
                    <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Sign In</Text>
                  </TouchableOpacity>
                  
                  {!requireAuth && (
                    <TouchableOpacity 
                      style={[
                        styles.button, 
                        styles.tertiaryButton, 
                        { borderColor: theme.colors.border }
                      ]}
                      onPress={handleContinueWithoutAuth}
                    >
                      <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                        Continue Without Auth
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 340,
    width: '100%',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryInfo: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  retryText: {
    fontSize: 14,
    textAlign: 'center',
  },
  userInfo: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  userInfoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    // backgroundColor set dynamically
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AuthErrorHandler;