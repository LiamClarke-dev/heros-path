/**
 * ScreenErrorBoundary component for Hero's Path
 * Handles screen-level errors with screen-specific recovery options
 * Requirements: 10.1, 10.2
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import NavigationErrorService from '../../services/NavigationErrorService';
import Logger from '../../utils/Logger';

class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isReloading: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const context = {
      screenName: this.props.screenName,
      route: this.props.route,
      params: this.props.params,
      errorInfo,
    };

    Logger.navigationError(error, context);
    
    this.setState({
      error,
      errorInfo,
    });

    // Report to error service
    NavigationErrorService.handleNavigationError(error, context);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReloadScreen = async () => {
    this.setState({ isReloading: true });

    try {
      // Attempt to reload the current screen
      const success = await NavigationErrorService.reloadCurrentScreen();
      
      if (success) {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isReloading: false,
        });
        
        Logger.info('Screen reload successful', { screen: this.props.screenName });
      } else {
        throw new Error('Screen reload failed');
      }
    } catch (reloadError) {
      Logger.error('Screen reload failed', reloadError);
      this.setState({ isReloading: false });
      
      // Fallback to navigation reset
      this.handleGoHome();
    }
  };

  handleGoHome = async () => {
    try {
      const success = await NavigationErrorService.navigateToFallback();
      
      if (success) {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
        });
      }
    } catch (error) {
      Logger.error('Failed to navigate to fallback', error);
    }
  };

  handleGoBack = () => {
    try {
      if (this.props.navigation?.canGoBack()) {
        this.props.navigation.goBack();
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
        });
      } else {
        this.handleGoHome();
      }
    } catch (error) {
      Logger.error('Failed to go back', error);
      this.handleGoHome();
    }
  };

  render() {
    if (this.state.hasError) {
      const theme = this.props.theme || {
        colors: {
          surface: '#FFFFFF',
          background: '#F8F9FA',
          text: '#2C3E50',
          textSecondary: '#7F8C8D',
          primary: '#3498DB',
          success: '#2ECC71',
          error: '#FF6B6B',
          warning: '#F39C12',
          border: '#E1E8ED',
        }
      };

      const screenName = this.props.screenName || 'Screen';
      const isReloadable = this.props.allowReload !== false;

      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.surface }]}>
              <Ionicons 
                name="alert-circle-outline" 
                size={64} 
                color={theme.colors.error} 
                style={styles.errorIcon}
              />
              
              <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
                {screenName} Error
              </Text>
              
              <Text style={[styles.errorMessage, { color: theme.colors.textSecondary }]}>
                This screen encountered an error and couldn't load properly. 
                You can try reloading the screen or navigate elsewhere.
              </Text>

              {this.props.screenName && (
                <View style={[styles.infoContainer, { backgroundColor: theme.colors.background }]}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                    Screen: {this.props.screenName}
                  </Text>
                  {this.props.route && (
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                      Route: {this.props.route}
                    </Text>
                  )}
                </View>
              )}
              
              {__DEV__ && this.state.error && (
                <View style={[styles.debugContainer, { backgroundColor: theme.colors.background }]}>
                  <Text style={[styles.debugTitle, { color: theme.colors.error }]}>
                    Debug Information:
                  </Text>
                  <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
                    {this.state.error.toString()}
                  </Text>
                  {this.state.error.stack && (
                    <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
                      Stack: {this.state.error.stack.substring(0, 200)}...
                    </Text>
                  )}
                </View>
              )}
              
              <View style={styles.buttonContainer}>
                {isReloadable && (
                  <TouchableOpacity 
                    style={[
                      styles.button, 
                      styles.primaryButton, 
                      { backgroundColor: theme.colors.primary },
                      this.state.isReloading && styles.disabledButton
                    ]} 
                    onPress={this.handleReloadScreen}
                    disabled={this.state.isReloading}
                  >
                    <Ionicons 
                      name={this.state.isReloading ? "hourglass-outline" : "refresh-outline"} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.buttonText}>
                      {this.state.isReloading ? 'Reloading...' : 'Reload Screen'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    styles.secondaryButton, 
                    { backgroundColor: theme.colors.success }
                  ]} 
                  onPress={this.handleGoBack}
                >
                  <Ionicons name="arrow-back-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Go Back</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    styles.tertiaryButton, 
                    { backgroundColor: theme.colors.warning }
                  ]} 
                  onPress={this.handleGoHome}
                >
                  <Ionicons name="home-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Home</Text>
                </TouchableOpacity>
              </View>

              {this.props.customActions && (
                <View style={styles.customActionsContainer}>
                  {this.props.customActions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.customActionButton,
                        { borderColor: theme.colors.border }
                      ]}
                      onPress={action.onPress}
                    >
                      {action.icon && (
                        <Ionicons 
                          name={action.icon} 
                          size={16} 
                          color={theme.colors.primary} 
                        />
                      )}
                      <Text style={[styles.customActionText, { color: theme.colors.primary }]}>
                        {action.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    maxWidth: 360,
    width: '100%',
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  infoContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  debugContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
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
    // backgroundColor set dynamically
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  customActionsContainer: {
    marginTop: 16,
    width: '100%',
    gap: 8,
  },
  customActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  customActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

// HOC to wrap screens with error boundary
export const withScreenErrorBoundary = (WrappedComponent, options = {}) => {
  return React.forwardRef((props, ref) => {
    const theme = useTheme?.() || {};
    
    return (
      <ScreenErrorBoundary
        screenName={options.screenName || WrappedComponent.displayName || WrappedComponent.name}
        route={props.route?.name}
        params={props.route?.params}
        navigation={props.navigation}
        theme={theme}
        allowReload={options.allowReload}
        customActions={options.customActions}
        onError={options.onError}
      >
        <WrappedComponent {...props} ref={ref} />
      </ScreenErrorBoundary>
    );
  });
};

export default ScreenErrorBoundary;