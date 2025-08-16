/**
 * Deep Link Authentication Prompt
 * Displays authentication prompt when deep links require user login
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

/**
 * Authentication prompt component for deep links
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the prompt is visible
 * @param {string} props.message - Custom message to display
 * @param {Object} props.pendingDeepLink - Deep link waiting for authentication
 * @param {Function} props.onSignIn - Callback for sign in action
 * @param {Function} props.onCancel - Callback for cancel action
 */
export function DeepLinkAuthPrompt({ 
  visible, 
  message, 
  pendingDeepLink, 
  onSignIn, 
  onCancel 
}) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn(pendingDeepLink);
    } else {
      // Default navigation to login
      navigation.navigate('Auth', {
        screen: 'Login',
        params: { 
          returnTo: pendingDeepLink,
          message: message || 'Please sign in to access this content'
        },
      });
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Default navigation to home
      navigation.navigate('Main', {
        screen: 'CoreFeatures',
        params: { screen: 'Map' },
      });
    }
  };

  const getContentDescription = () => {
    if (!pendingDeepLink?.screen) {
      return 'this content';
    }

    const screenDescriptions = {
      'JourneyDetails': 'this journey',
      'Journeys': 'your journeys',
      'DiscoveryDetails': 'this discovery',
      'Discoveries': 'your discoveries',
      'SavedPlaceDetails': 'this saved place',
      'SavedPlaces': 'your saved places',
      'Social': 'social features',
      'ShareJourney': 'journey sharing',
      'UserProfile': 'user profiles',
      'Settings': 'settings',
    };

    return screenDescriptions[pendingDeepLink.screen] || 'this content';
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
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
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="lock-closed" 
              size={28} 
              color={theme.colors.primary} 
            />
          </View>
          
          <Text style={styles.title}>Sign In Required</Text>
          
          <Text style={styles.message}>
            {message || `You need to sign in to access ${getContentDescription()}.`}
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={handleCancel}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]}
              onPress={handleSignIn}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Hook for managing deep link authentication prompts
 * @returns {Object} Authentication prompt utilities
 */
export function useDeepLinkAuthPrompt() {
  const [promptState, setPromptState] = React.useState({
    visible: false,
    message: null,
    pendingDeepLink: null,
  });

  const showPrompt = React.useCallback((message, pendingDeepLink) => {
    setPromptState({
      visible: true,
      message,
      pendingDeepLink,
    });
  }, []);

  const hidePrompt = React.useCallback(() => {
    setPromptState({
      visible: false,
      message: null,
      pendingDeepLink: null,
    });
  }, []);

  const handleSignIn = React.useCallback((pendingDeepLink) => {
    hidePrompt();
    // The actual sign-in navigation will be handled by the component
  }, [hidePrompt]);

  const handleCancel = React.useCallback(() => {
    hidePrompt();
  }, [hidePrompt]);

  return {
    promptState,
    showPrompt,
    hidePrompt,
    handleSignIn,
    handleCancel,
  };
}