/**
 * Centralized error handling utility for Hero's Path MVP
 */

import { ERROR_MESSAGES } from './constants';

/**
 * Error types for categorization
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  LOCATION: 'LOCATION',
  PERMISSION: 'PERMISSION',
  VALIDATION: 'VALIDATION',
  FIREBASE: 'FIREBASE',
  API: 'API',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Custom error class for app-specific errors
 */
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, originalError = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Main error handler class
 */
export class ErrorHandler {
  /**
   * Handle authentication errors
   * @param {Error} error - Original error
   * @returns {AppError} Processed error
   */
  static handleAuthError(error) {
    console.error('Authentication Error:', error);

    let message = ERROR_MESSAGES.AUTHENTICATION_FAILED;
    let type = ERROR_TYPES.AUTHENTICATION;

    // Handle specific Firebase Auth errors
    if (error.code) {
      switch (error.code) {
        case 'auth/user-cancelled':
          message = 'Sign-in was cancelled. Please try again.';
          break;
        case 'auth/network-request-failed':
          message = ERROR_MESSAGES.NETWORK_ERROR;
          type = ERROR_TYPES.NETWORK;
          break;
        case 'auth/too-many-requests':
          message = 'Too many sign-in attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled. Please contact support.';
          break;
        default:
          message = error.message || ERROR_MESSAGES.AUTHENTICATION_FAILED;
      }
    }

    return new AppError(message, type, error);
  }

  /**
   * Handle location and GPS errors
   * @param {Error} error - Original error
   * @returns {AppError} Processed error
   */
  static handleLocationError(error) {
    console.error('Location Error:', error);

    let message = ERROR_MESSAGES.GPS_UNAVAILABLE;
    let type = ERROR_TYPES.LOCATION;

    // Handle Expo Location errors
    if (error.code) {
      switch (error.code) {
        case 'E_LOCATION_SERVICES_DISABLED':
          message =
            'Location services are disabled. Please enable them in settings.';
          break;
        case 'E_LOCATION_UNAVAILABLE':
          message = 'Location is temporarily unavailable. Please try again.';
          break;
        case 'E_LOCATION_TIMEOUT':
          message = 'Location request timed out. Please try again.';
          break;
        case 'E_LOCATION_PERMISSION_DENIED':
          message = ERROR_MESSAGES.LOCATION_PERMISSION_DENIED;
          type = ERROR_TYPES.PERMISSION;
          break;
        default:
          message = error.message || ERROR_MESSAGES.GPS_UNAVAILABLE;
      }
    }

    return new AppError(message, type, error);
  }

  /**
   * Handle network and API errors
   * @param {Error} error - Original error
   * @returns {AppError} Processed error
   */
  static handleNetworkError(error) {
    console.error('Network Error:', error);

    let message = ERROR_MESSAGES.NETWORK_ERROR;
    let type = ERROR_TYPES.NETWORK;

    // Handle specific network errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      switch (status) {
        case 400:
          message = 'Invalid request. Please check your input.';
          type = ERROR_TYPES.VALIDATION;
          break;
        case 401:
          message = 'Authentication required. Please sign in again.';
          type = ERROR_TYPES.AUTHENTICATION;
          break;
        case 403:
          message = 'Access denied. Please check your permissions.';
          type = ERROR_TYPES.PERMISSION;
          break;
        case 404:
          message = 'Requested resource not found.';
          break;
        case 429:
          message = 'Too many requests. Please try again later.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        default:
          message = `Server error (${status}). Please try again.`;
      }
    } else if (error.request) {
      // Network request failed
      message = ERROR_MESSAGES.NETWORK_ERROR;
    } else {
      // Request setup error
      message = error.message || ERROR_MESSAGES.GENERIC_ERROR;
    }

    return new AppError(message, type, error);
  }

  /**
   * Handle Firebase/Firestore errors
   * @param {Error} error - Original error
   * @returns {AppError} Processed error
   */
  static handleFirebaseError(error) {
    console.error('Firebase Error:', error);

    let message = ERROR_MESSAGES.GENERIC_ERROR;
    let type = ERROR_TYPES.FIREBASE;

    // Handle specific Firebase errors
    if (error.code) {
      switch (error.code) {
        case 'permission-denied':
          message = 'Access denied. Please check your permissions.';
          type = ERROR_TYPES.PERMISSION;
          break;
        case 'unavailable':
          message = 'Service temporarily unavailable. Please try again.';
          type = ERROR_TYPES.NETWORK;
          break;
        case 'deadline-exceeded':
          message = 'Request timed out. Please try again.';
          type = ERROR_TYPES.NETWORK;
          break;
        case 'resource-exhausted':
          message = 'Service quota exceeded. Please try again later.';
          break;
        case 'unauthenticated':
          message = 'Authentication required. Please sign in again.';
          type = ERROR_TYPES.AUTHENTICATION;
          break;
        default:
          message = error.message || ERROR_MESSAGES.GENERIC_ERROR;
      }
    }

    return new AppError(message, type, error);
  }

  /**
   * Handle Google Places API errors
   * @param {Error} error - Original error
   * @returns {AppError} Processed error
   */
  static handlePlacesError(error) {
    console.error('Places API Error:', error);

    let message = ERROR_MESSAGES.PLACES_SEARCH_FAILED;
    let type = ERROR_TYPES.API;

    // Handle Google Places API specific errors
    if (error.response && error.response.data) {
      const { status } = error.response.data;
      switch (status) {
        case 'ZERO_RESULTS':
          message = 'No places found in this area.';
          break;
        case 'OVER_QUERY_LIMIT':
          message = 'Search limit exceeded. Please try again later.';
          break;
        case 'REQUEST_DENIED':
          message = 'Places search not available. Please try again.';
          type = ERROR_TYPES.PERMISSION;
          break;
        case 'INVALID_REQUEST':
          message = 'Invalid search request. Please try again.';
          type = ERROR_TYPES.VALIDATION;
          break;
        default:
          message = ERROR_MESSAGES.PLACES_SEARCH_FAILED;
      }
    }

    return new AppError(message, type, error);
  }

  /**
   * Handle validation errors
   * @param {string} field - Field that failed validation
   * @param {string} reason - Reason for validation failure
   * @returns {AppError} Processed error
   */
  static handleValidationError(field, reason) {
    const message = `${field}: ${reason}`;
    console.error('Validation Error:', message);
    return new AppError(message, ERROR_TYPES.VALIDATION);
  }

  /**
   * Generic error handler for unknown errors
   * @param {Error} error - Original error
   * @returns {AppError} Processed error
   */
  static handleGenericError(error) {
    console.error('Generic Error:', error);
    const message = error.message || ERROR_MESSAGES.GENERIC_ERROR;
    return new AppError(message, ERROR_TYPES.UNKNOWN, error);
  }

  /**
   * Log error for debugging and analytics
   * @param {AppError} error - Processed error
   * @param {Object} context - Additional context
   */
  static logError(error, context = {}) {
    const errorLog = {
      message: error.message,
      type: error.type,
      timestamp: error.timestamp,
      context,
      stack: error.stack,
      originalError: error.originalError,
    };

    // In development, log to console
    if (__DEV__) {
      console.error('Error Log:', errorLog);
    }

    // In production, send to analytics service
    // TODO: Implement analytics service integration
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Any error object
   * @returns {string} User-friendly message
   */
  static getUserMessage(error) {
    if (error instanceof AppError) {
      return error.message;
    }

    // Handle common error patterns
    if (error.message && error.message.includes('Network')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }

    return ERROR_MESSAGES.GENERIC_ERROR;
  }
}
