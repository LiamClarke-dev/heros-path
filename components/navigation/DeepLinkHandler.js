/**
 * Deep Link Handler Component
 * Manages deep link processing and navigation logic
 */

import React, { useEffect, useState } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUser } from '../../contexts/UserContext';
import { useDeepLinking } from '../../hooks/useDeepLinking';
import { DeepLinkAuthPrompt, useDeepLinkAuthPrompt } from './DeepLinkAuthPrompt';
import DeepLinkService from '../../services/DeepLinkService';

/**
 * Deep Link Handler Component
 * Handles deep link processing, authentication, and navigation
 */
export function DeepLinkHandler({ children }) {
  const navigation = useNavigation();
  const { user, isLoading } = useUser();
  const { processDeepLink } = useDeepLinking();
  const {
    promptState,
    showPrompt,
    hidePrompt,
    handleSignIn,
    handleCancel,
  } = useDeepLinkAuthPrompt();

  const [pendingDeepLink, setPendingDeepLink] = useState(null);

  // Handle deep link processing
  const handleDeepLink = async (url) => {
    try {
      const result = await processDeepLink(url);
      
      if (!result.success) {
        if (result.requiresAuth && !user) {
          // Show authentication prompt
          showPrompt(
            'Please sign in to access this content',
            result.pendingDeepLink
          );
          setPendingDeepLink(result.pendingDeepLink);
        }
        // Other errors are handled by the DeepLinkService
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  // Process pending deep link after authentication
  useEffect(() => {
    if (user && pendingDeepLink && !isLoading) {
      const processPending = async () => {
        try {
          await DeepLinkService.processPendingDeepLink(pendingDeepLink);
          setPendingDeepLink(null);
        } catch (error) {
          console.error('Error processing pending deep link:', error);
          setPendingDeepLink(null);
        }
      };

      // Small delay to ensure navigation is ready
      const timer = setTimeout(processPending, 500);
      return () => clearTimeout(timer);
    }
  }, [user, pendingDeepLink, isLoading]);

  // Handle authentication prompt actions
  const handleAuthSignIn = (pendingLink) => {
    setPendingDeepLink(pendingLink);
    navigation.navigate('Auth', {
      screen: 'Login',
      params: {
        returnTo: pendingLink,
        message: 'Please sign in to access this content',
      },
    });
  };

  const handleAuthCancel = () => {
    setPendingDeepLink(null);
    navigation.navigate('Main', {
      screen: 'CoreFeatures',
      params: { screen: 'Map' },
    });
  };

  return (
    <>
      {children}
      <DeepLinkAuthPrompt
        visible={promptState.visible}
        message={promptState.message}
        pendingDeepLink={promptState.pendingDeepLink}
        onSignIn={handleAuthSignIn}
        onCancel={handleAuthCancel}
      />
    </>
  );
}

/**
 * Hook for handling deep link navigation in screens
 * @returns {Object} Deep link navigation utilities
 */
export function useDeepLinkNavigation() {
  const navigation = useNavigation();
  const { generateShareableLink } = useDeepLinking();

  /**
   * Navigate to a screen with deep link support
   * @param {string} screen - Target screen name
   * @param {Object} params - Navigation parameters
   * @param {Object} options - Navigation options
   */
  const navigateWithDeepLink = (screen, params = {}, options = {}) => {
    try {
      // Generate deep link for sharing if needed
      const deepLink = generateShareableLink(screen, params);
      
      // Perform navigation
      switch (screen) {
        case 'JourneyDetails':
          navigation.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'Journeys',
              params: {
                screen: 'JourneyDetails',
                params,
              },
            },
          });
          break;

        case 'PlaceDetails':
          navigation.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'Map',
              params: {
                screen: 'PlaceDetails',
                params,
              },
            },
          });
          break;

        case 'DiscoveryDetails':
          navigation.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'Discoveries',
              params: {
                screen: 'DiscoveryDetails',
                params,
              },
            },
          });
          break;

        case 'SavedPlaceDetails':
          navigation.navigate('Main', {
            screen: 'CoreFeatures',
            params: {
              screen: 'SavedPlaces',
              params: {
                screen: 'SavedPlaceDetails',
                params,
              },
            },
          });
          break;

        case 'ShareJourney':
          navigation.navigate('Main', {
            screen: 'Social',
            params: {
              screen: 'ShareJourney',
              params,
            },
          });
          break;

        case 'UserProfile':
          navigation.navigate('Main', {
            screen: 'Social',
            params: {
              screen: 'UserProfile',
              params,
            },
          });
          break;

        default:
          console.warn(`Unknown screen for deep link navigation: ${screen}`);
      }

      return {
        success: true,
        deepLink,
      };
    } catch (error) {
      console.error('Error in deep link navigation:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  /**
   * Create a navigation stack for deep-linked content
   * @param {string} targetScreen - The target screen
   * @param {Object} params - Screen parameters
   * @returns {Array} Navigation stack
   */
  const createDeepLinkStack = (targetScreen, params = {}) => {
    const stacks = {
      'JourneyDetails': [
        { screen: 'Main' },
        { screen: 'CoreFeatures' },
        { screen: 'Journeys' },
        { screen: 'JourneyDetails', params },
      ],
      'PlaceDetails': [
        { screen: 'Main' },
        { screen: 'CoreFeatures' },
        { screen: 'Map' },
        { screen: 'PlaceDetails', params },
      ],
      'DiscoveryDetails': [
        { screen: 'Main' },
        { screen: 'CoreFeatures' },
        { screen: 'Discoveries' },
        { screen: 'DiscoveryDetails', params },
      ],
      'SavedPlaceDetails': [
        { screen: 'Main' },
        { screen: 'CoreFeatures' },
        { screen: 'SavedPlaces' },
        { screen: 'SavedPlaceDetails', params },
      ],
      'ShareJourney': [
        { screen: 'Main' },
        { screen: 'Social' },
        { screen: 'ShareJourney', params },
      ],
      'UserProfile': [
        { screen: 'Main' },
        { screen: 'Social' },
        { screen: 'UserProfile', params },
      ],
    };

    return stacks[targetScreen] || [{ screen: 'Main' }];
  };

  return {
    navigateWithDeepLink,
    createDeepLinkStack,
  };
}

/**
 * Hook for managing deep link state in screens
 * @returns {Object} Deep link state utilities
 */
export function useDeepLinkState() {
  const [deepLinkData, setDeepLinkData] = useState(null);
  const [isFromDeepLink, setIsFromDeepLink] = useState(false);

  // Check if current screen was accessed via deep link
  useFocusEffect(
    React.useCallback(() => {
      // This would be set by the navigation params
      const checkDeepLinkOrigin = () => {
        // Implementation would check navigation state
        // For now, we'll use a simple approach
        setIsFromDeepLink(deepLinkData !== null);
      };

      checkDeepLinkOrigin();
    }, [deepLinkData])
  );

  /**
   * Set deep link data for the current screen
   * @param {Object} data - Deep link data
   */
  const setDeepLink = (data) => {
    setDeepLinkData(data);
    setIsFromDeepLink(true);
  };

  /**
   * Clear deep link data
   */
  const clearDeepLink = () => {
    setDeepLinkData(null);
    setIsFromDeepLink(false);
  };

  return {
    deepLinkData,
    isFromDeepLink,
    setDeepLink,
    clearDeepLink,
  };
}