/**
 * Google OAuth Configuration Helper
 * Provides platform-specific configuration and troubleshooting for Google OAuth
 */

import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
} from '../config';
import Logger from './Logger';

/**
 * Get the appropriate Google OAuth client ID for the current platform
 * @returns {string} Client ID for the current platform
 */
export const getGoogleClientId = () => {
  const webClientId = GOOGLE_WEB_CLIENT_ID;
  const iosClientId = GOOGLE_IOS_CLIENT_ID;
  const androidClientId = GOOGLE_ANDROID_CLIENT_ID;

  // For Expo development builds, use platform-specific client IDs
  // This follows Expo's recommended approach for Google authentication
  let clientId;
  
  if (Platform.OS === 'ios' && iosClientId) {
    clientId = iosClientId;
    Logger.debug('Using iOS client ID for development build');
  } else if (Platform.OS === 'android' && androidClientId) {
    clientId = androidClientId;
    Logger.debug('Using Android client ID for development build');
  } else {
    // Fallback to web client ID
    clientId = webClientId;
    Logger.debug('Using web client ID as fallback');
  }

  Logger.debug('Selected Google Client ID for platform:', Platform.OS, clientId ? 'SET' : 'EMPTY');
  Logger.debug('Available client IDs:', {
    web: webClientId ? 'SET' : 'EMPTY',
    ios: iosClientId ? 'SET' : 'EMPTY',
    android: androidClientId ? 'SET' : 'EMPTY',
  });

  return clientId;
};

/**
 * Generate the appropriate redirect URI for Google OAuth
 * @returns {string} Redirect URI
 */
export const getGoogleRedirectUri = () => {
  // For development builds with platform-specific client IDs,
  // use the custom scheme redirect URI
  let redirectUri;
  
  try {
    // Use the custom scheme for development builds
    redirectUri = AuthSession.makeRedirectUri({
      scheme: 'com.liamclarke.herospath',
      useProxy: false, // Don't use proxy for platform-specific client IDs
    });
    
    Logger.debug('Using custom scheme redirect URI for development build');
  } catch (error) {
    Logger.warn('Failed to generate custom scheme redirect URI:', error);
    // Fallback to the custom scheme manually
    redirectUri = 'com.liamclarke.herospath://';
  }

  Logger.debug('Generated redirect URI:', redirectUri);
  return redirectUri;
};

/**
 * Validate Google OAuth configuration
 * @throws {Error} If configuration is invalid
 */
export const validateGoogleOAuthConfig = () => {
  const clientId = getGoogleClientId();

  if (!clientId) {
    const missingIds = [];
    if (!GOOGLE_WEB_CLIENT_ID) missingIds.push('GOOGLE_WEB_CLIENT_ID');
    if (!GOOGLE_IOS_CLIENT_ID && Platform.OS === 'ios') missingIds.push('GOOGLE_IOS_CLIENT_ID');
    if (!GOOGLE_ANDROID_CLIENT_ID && Platform.OS === 'android') missingIds.push('GOOGLE_ANDROID_CLIENT_ID');

    throw new Error(`Missing Google OAuth configuration: ${missingIds.join(', ')}`);
  }

  Logger.debug('Google OAuth configuration validation passed');
  return true;
};

/**
 * Get OAuth request configuration for authorization code flow
 * @returns {Object} AuthRequest configuration
 */
export const getAuthCodeFlowConfig = () => {
  const clientId = getGoogleClientId();
  const redirectUri = getGoogleRedirectUri();

  return {
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: false, // Disable PKCE for iOS client to avoid code verifier issues
    additionalParameters: {
      'access_type': 'offline',
      'prompt': 'select_account', // Always show account selection
    },
  };
};

/**
 * Get OAuth request configuration for implicit flow (fallback)
 * @returns {Object} AuthRequest configuration
 */
export const getImplicitFlowConfig = () => {
  const clientId = getGoogleClientId();
  const redirectUri = getGoogleRedirectUri();

  return {
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    usePKCE: false,
    additionalParameters: {
      'nonce': Math.random().toString(36).substring(2, 15),
      'prompt': 'select_account',
      'include_granted_scopes': 'true',
      'response_mode': 'fragment',
    },
  };
};

/**
 * Get OAuth endpoints for Google
 * @returns {Object} OAuth endpoints
 */
export const getGoogleOAuthEndpoints = () => {
  return {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };
};

/**
 * Troubleshoot common Google OAuth issues
 * @param {Error} error - The error that occurred
 * @returns {string} User-friendly error message with troubleshooting info
 */
export const troubleshootGoogleOAuthError = (error) => {
  const errorMessage = error.message || '';
  const errorCode = error.code || '';

  Logger.error('Google OAuth error details:', {
    message: errorMessage,
    code: errorCode,
    platform: Platform.OS,
  });

  // Common error patterns and solutions
  if (errorMessage.includes('Custom scheme URIs are not allowed')) {
    return 'OAuth client configuration error. The web client ID cannot be used with custom schemes. Please ensure iOS/Android client IDs are configured.';
  }

  if (errorMessage.includes('unsupported_response_type')) {
    return 'OAuth response type not supported. This may be a configuration issue with the Google OAuth client.';
  }

  if (errorMessage.includes('invalid_request') || errorMessage.includes('400')) {
    return 'OAuth configuration error. The redirect URI may not be properly configured in Google Console. Please contact support.';
  }

  if (errorMessage.includes('invalid_client')) {
    return 'Invalid Google Client ID. Please check your OAuth configuration.';
  }

  if (errorMessage.includes('redirect_uri_mismatch')) {
    return 'Redirect URI mismatch. The redirect URI must be registered in Google Console.';
  }

  if (errorMessage.includes('access_denied')) {
    return 'Access denied. Please ensure you grant the necessary permissions.';
  }

  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (errorMessage.includes('cancelled')) {
    return 'Google sign-in was cancelled';
  }

  if (errorMessage.includes('code verifier') || errorMessage.includes('PKCE')) {
    return 'OAuth code verification error. This is a configuration issue that needs to be resolved.';
  }

  // Generic error with troubleshooting info
  return `Google sign-in failed: ${errorMessage}. Please try again or contact support if the issue persists.`;
};

/**
 * Log OAuth configuration for debugging
 */
export const logOAuthDebugInfo = () => {
  if (__DEV__) {
    Logger.debug('Google OAuth Debug Info:', {
      platform: Platform.OS,
      webClientId: GOOGLE_WEB_CLIENT_ID ? 'SET' : 'EMPTY',
      iosClientId: GOOGLE_IOS_CLIENT_ID ? 'SET' : 'EMPTY',
      androidClientId: GOOGLE_ANDROID_CLIENT_ID ? 'SET' : 'EMPTY',
      redirectUri: getGoogleRedirectUri(),
      scheme: 'com.liamclarke.herospath',
    });
  }
};