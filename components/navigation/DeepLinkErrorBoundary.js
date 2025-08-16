/**
 * Deep Link Error Boundary
 * Catches and handles errors related to deep link processing
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

class DeepLinkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('Deep Link Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Report error to analytics service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <DeepLinkErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={() => {
            this.setState({ hasError: false, error: null, errorInfo: null });
            if (this.props.onRetry) {
              this.props.onRetry();
            }
          }}
          onGoHome={() => {
            this.setState({ hasError: false, error: null, errorInfo: null });
            if (this.props.onGoHome) {
              this.props.onGoHome();
            }
          }}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Fallback component displayed when deep link errors occur
 */
function DeepLinkErrorFallback({ error, errorInfo, onRetry, onGoHome }) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      // Default navigation to home
      navigation.navigate('Main', {
        screen: 'CoreFeatures',
        params: { screen: 'Map' },
      });
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.error + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    message: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 30,
      lineHeight: 22,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 15,
    },
    button: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      minWidth: 100,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
    },
    secondaryButtonText: {
      color: theme.colors.text,
    },
    errorDetails: {
      marginTop: 30,
      padding: 15,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.error,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontFamily: 'monospace',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name="link-outline" 
          size={40} 
          color={theme.colors.error} 
        />
      </View>
      
      <Text style={styles.title}>Link Error</Text>
      
      <Text style={styles.message}>
        We couldn't process this link. It might be invalid or expired.
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]}
          onPress={handleGoHome}
        >
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            Go Home
          </Text>
        </TouchableOpacity>
        
        {onRetry && (
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={onRetry}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Try Again
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {__DEV__ && error && (
        <View style={styles.errorDetails}>
          <Text style={styles.errorText}>
            {error.toString()}
          </Text>
          {errorInfo && (
            <Text style={[styles.errorText, { marginTop: 10 }]}>
              {errorInfo.componentStack}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default DeepLinkErrorBoundary;