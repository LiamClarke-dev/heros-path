/**
 * NavigationErrorBoundary component for Hero's Path
 * Handles navigation-related errors and provides fallback UI
 * Requirements: 10.1, 10.2, 10.7
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import NavigationErrorService from '../../services/NavigationErrorService';
import Logger from '../../utils/Logger';

class NavigationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error using our centralized logging
    Logger.navigationError(error, {
      errorInfo,
      component: this.props.componentName || 'NavigationErrorBoundary',
      route: this.props.currentRoute,
      retryCount: this.state.retryCount,
    });
    
    this.setState({
      error,
      errorInfo,
    });

    // Handle the error through our error service
    const context = {
      componentName: this.props.componentName,
      currentRoute: this.props.currentRoute,
      errorInfo,
    };

    NavigationErrorService.handleNavigationError(error, context);

    // Report error to parent component if callback provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = async () => {
    this.setState({ 
      isRecovering: true,
      retryCount: this.state.retryCount + 1,
    });

    try {
      // Attempt recovery through error service
      const context = {
        componentName: this.props.componentName,
        currentRoute: this.props.currentRoute,
        action: 'retry',
        retryCount: this.state.retryCount + 1,
      };

      const recoveryStrategy = NavigationErrorService.handleNavigationError(
        this.state.error, 
        context
      );

      if (typeof recoveryStrategy === 'function') {
        const success = await recoveryStrategy();
        
        if (success) {
          // Reset error state on successful recovery
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            isRecovering: false,
          });

          Logger.info('Navigation error recovery successful');
          
          // Call retry callback if provided
          if (this.props.onRetry) {
            this.props.onRetry();
          }
          return;
        }
      }

      // If recovery failed, show user feedback
      Alert.alert(
        'Recovery Failed',
        'Unable to recover from the error. Please try resetting the navigation.',
        [{ text: 'OK' }]
      );
      
    } catch (recoveryError) {
      Logger.error('Navigation error recovery failed', recoveryError);
      Alert.alert(
        'Recovery Error',
        'An error occurred while trying to recover. Please restart the app.',
        [{ text: 'OK' }]
      );
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  handleReset = async () => {
    this.setState({ isRecovering: true });

    try {
      // Reset navigation through error service
      const success = await NavigationErrorService.resetNavigationStack();
      
      if (success) {
        // Reset error state
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: 0,
          isRecovering: false,
        });

        Logger.info('Navigation reset successful');

        // Call reset callback if provided
        if (this.props.onReset) {
          this.props.onReset();
        }
      } else {
        throw new Error('Navigation reset failed');
      }
    } catch (resetError) {
      Logger.error('Navigation reset failed', resetError);
      Alert.alert(
        'Reset Failed',
        'Unable to reset navigation. Please restart the app.',
        [{ text: 'OK' }]
      );
      this.setState({ isRecovering: false });
    }
  };

  handleReportError = () => {
    const errorReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      errorInfo: this.state.errorInfo,
      component: this.props.componentName,
      route: this.props.currentRoute,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
    };

    // In a real app, you might send this to a crash reporting service
    Logger.error('User reported navigation error', errorReport);
    
    Alert.alert(
      'Error Reported',
      'Thank you for reporting this error. Our team will investigate.',
      [{ text: 'OK' }]
    );
  };

  render() {
    if (this.state.hasError) {
      // Get theme from props or use default
      const theme = this.props.theme || {
        colors: {
          surface: '#FFFFFF',
          background: '#F8F9FA',
          text: '#2C3E50',
          textSecondary: '#7F8C8D',
          primary: '#3498DB',
          success: '#2ECC71',
          error: '#FF6B6B',
          border: '#E1E8ED',
        }
      };

      // Render fallback UI
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.surface }]}>
            <Ionicons 
              name="warning-outline" 
              size={64} 
              color={theme.colors.error} 
              style={styles.errorIcon}
            />
            
            <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
              Navigation Error
            </Text>
            
            <Text style={[styles.errorMessage, { color: theme.colors.textSecondary }]}>
              Something went wrong with navigation. Don't worry, we can fix this!
            </Text>

            {this.state.retryCount > 0 && (
              <Text style={[styles.retryInfo, { color: theme.colors.textSecondary }]}>
                Retry attempts: {this.state.retryCount}
              </Text>
            )}
            
            {__DEV__ && this.state.error && (
              <View style={[styles.debugContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.debugTitle, { color: theme.colors.error }]}>Debug Info:</Text>
                <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
                    Component Stack: {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.retryButton, 
                  { backgroundColor: theme.colors.primary },
                  this.state.isRecovering && styles.disabledButton
                ]} 
                onPress={this.handleRetry}
                disabled={this.state.isRecovering}
              >
                <Ionicons 
                  name={this.state.isRecovering ? "hourglass-outline" : "refresh-outline"} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.buttonText}>
                  {this.state.isRecovering ? 'Recovering...' : 'Try Again'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.resetButton, 
                  { backgroundColor: theme.colors.success },
                  this.state.isRecovering && styles.disabledButton
                ]} 
                onPress={this.handleReset}
                disabled={this.state.isRecovering}
              >
                <Ionicons name="home-outline" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Go Home</Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && (
              <TouchableOpacity 
                style={[styles.reportButton, { borderColor: theme.colors.border }]} 
                onPress={this.handleReportError}
              >
                <Ionicons name="bug-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.reportButtonText, { color: theme.colors.textSecondary }]}>
                  Report Error
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 320,
    width: '100%',
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  retryInfo: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  debugContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  retryButton: {
    // backgroundColor set dynamically
  },
  resetButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default NavigationErrorBoundary;