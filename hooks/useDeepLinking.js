/**
 * Deep Linking Hook
 * Provides deep linking functionality to React components
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import DeepLinkService from '../services/DeepLinkService';
import { parseDeepLink } from '../utils/deepLinkConfig';

/**
 * Hook for deep linking functionality
 * @returns {Object} Deep linking utilities and state
 */
export function useDeepLinking() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedLink, setLastProcessedLink] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Process a deep link URL
   * @param {string} url - The deep link URL to process
   * @returns {Promise<Object>} Processing result
   */
  const processDeepLink = useCallback(async (url) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await DeepLinkService.processDeepLink(url);
      
      setLastProcessedLink({
        url,
        result,
        timestamp: Date.now(),
      });

      if (!result.success) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const error = `Failed to process deep link: ${err.message}`;
      setError(error);
      return {
        success: false,
        error,
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Generate a shareable deep link
   * @param {string} screen - Target screen name
   * @param {Object} params - Screen parameters
   * @param {Object} options - Generation options
   * @returns {string} Generated deep link URL
   */
  const generateShareableLink = useCallback((screen, params = {}, options = {}) => {
    try {
      return DeepLinkService.generateShareableLink(screen, params, options);
    } catch (err) {
      setError(`Failed to generate link: ${err.message}`);
      return null;
    }
  }, []);

  /**
   * Parse a deep link URL without processing it
   * @param {string} url - The deep link URL to parse
   * @returns {Object} Parsed deep link information
   */
  const parseUrl = useCallback((url) => {
    try {
      return parseDeepLink(url);
    } catch (err) {
      setError(`Failed to parse URL: ${err.message}`);
      return {
        isValid: false,
        error: err.message,
      };
    }
  }, []);

  /**
   * Check if a URL can be handled as a deep link
   * @param {string} url - The URL to check
   * @returns {Promise<boolean>} Whether the URL can be handled
   */
  const canHandleUrl = useCallback(async (url) => {
    try {
      return await Linking.canOpenURL(url);
    } catch (err) {
      setError(`Failed to check URL capability: ${err.message}`);
      return false;
    }
  }, []);

  /**
   * Open a URL externally (outside the app)
   * @param {string} url - The URL to open
   * @returns {Promise<boolean>} Whether the URL was opened successfully
   */
  const openExternalUrl = useCallback(async (url) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        setError(`Cannot open URL: ${url}`);
        return false;
      }
    } catch (err) {
      setError(`Failed to open URL: ${err.message}`);
      return false;
    }
  }, []);

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get the initial deep link URL when the app was opened
   * @returns {Promise<string|null>} Initial URL or null
   */
  const getInitialUrl = useCallback(async () => {
    try {
      return await Linking.getInitialURL();
    } catch (err) {
      setError(`Failed to get initial URL: ${err.message}`);
      return null;
    }
  }, []);

  return {
    // State
    isProcessing,
    lastProcessedLink,
    error,

    // Actions
    processDeepLink,
    generateShareableLink,
    parseUrl,
    canHandleUrl,
    openExternalUrl,
    clearError,
    getInitialUrl,
  };
}

/**
 * Hook for listening to deep link events
 * @param {Function} onDeepLink - Callback function for deep link events
 * @returns {Object} Deep link listener utilities
 */
export function useDeepLinkListener(onDeepLink) {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!onDeepLink || typeof onDeepLink !== 'function') {
      return;
    }

    setIsListening(true);

    const handleDeepLink = (event) => {
      if (event?.url) {
        onDeepLink(event.url);
      }
    };

    // Add listener for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle initial deep link if app was opened from one
    const handleInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          onDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('Error handling initial deep link:', error);
      }
    };

    handleInitialUrl();

    return () => {
      setIsListening(false);
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, [onDeepLink]);

  return {
    isListening,
  };
}

/**
 * Hook for sharing functionality with deep links
 * @returns {Object} Sharing utilities
 */
export function useDeepLinkSharing() {
  const { generateShareableLink, openExternalUrl } = useDeepLinking();
  const [isSharing, setIsSharing] = useState(false);

  /**
   * Share a journey via deep link
   * @param {string} journeyId - The journey ID to share
   * @param {Object} options - Sharing options
   * @returns {Promise<Object>} Sharing result
   */
  const shareJourney = useCallback(async (journeyId, options = {}) => {
    setIsSharing(true);

    try {
      const shareUrl = generateShareableLink('ShareJourney', { journeyId }, options);
      
      if (!shareUrl) {
        return {
          success: false,
          error: 'Failed to generate share URL',
        };
      }

      // Here you could integrate with React Native's Share API
      // For now, we'll just return the URL
      return {
        success: true,
        shareUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsSharing(false);
    }
  }, [generateShareableLink]);

  /**
   * Share a place via deep link
   * @param {string} placeId - The place ID to share
   * @param {Object} options - Sharing options
   * @returns {Promise<Object>} Sharing result
   */
  const sharePlace = useCallback(async (placeId, options = {}) => {
    setIsSharing(true);

    try {
      const shareUrl = generateShareableLink('PlaceDetails', { placeId }, options);
      
      if (!shareUrl) {
        return {
          success: false,
          error: 'Failed to generate share URL',
        };
      }

      return {
        success: true,
        shareUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsSharing(false);
    }
  }, [generateShareableLink]);

  /**
   * Share a discovery via deep link
   * @param {string} discoveryId - The discovery ID to share
   * @param {Object} options - Sharing options
   * @returns {Promise<Object>} Sharing result
   */
  const shareDiscovery = useCallback(async (discoveryId, options = {}) => {
    setIsSharing(true);

    try {
      const shareUrl = generateShareableLink('DiscoveryDetails', { discoveryId }, options);
      
      if (!shareUrl) {
        return {
          success: false,
          error: 'Failed to generate share URL',
        };
      }

      return {
        success: true,
        shareUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsSharing(false);
    }
  }, [generateShareableLink]);

  return {
    isSharing,
    shareJourney,
    sharePlace,
    shareDiscovery,
  };
}