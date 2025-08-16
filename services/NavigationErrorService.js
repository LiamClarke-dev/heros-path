/**
 * NavigationErrorService for Hero's Path
 * Handles navigation error recovery and fallback strategies
 * Requirements: 10.1, 10.2, 10.5, 10.6
 */

import { CommonActions, StackActions } from '@react-navigation/native';
import Logger from '../utils/Logger';
import NavigationStateRecovery from './NavigationStateRecovery';
import NavigationRetryService from './NavigationRetryService';

class NavigationErrorService {
  constructor() {
    this.navigationRef = null;
    this.errorCount = 0;
    this.maxRetries = 3;
    this.fallbackRoutes = ['Map', 'Home'];
    this.errorHistory = [];
  }

  /**
   * Set the navigation reference
   */
  setNavigationRef(ref) {
    this.navigationRef = ref;
    
    // Also set reference for related services
    NavigationStateRecovery.setNavigationRef(ref);
    NavigationRetryService.setNavigationRef(ref);
  }

  /**
   * Handle navigation errors with recovery strategies
   */
  handleNavigationError(error, context = {}) {
    this.errorCount++;
    const errorData = {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      errorCount: this.errorCount,
    };

    this.errorHistory.push(errorData);
    Logger.navigationError(error, context);

    // Determine recovery strategy based on error type and count
    return this.determineRecoveryStrategy(error, context);
  }

  /**
   * Determine the best recovery strategy
   */
  determineRecoveryStrategy(error, context) {
    const strategies = {
      retry: () => this.retryNavigation(context),
      fallback: () => this.navigateToFallback(),
      reset: () => this.resetNavigationStack(),
      reload: () => this.reloadCurrentScreen(),
    };

    // Strategy selection based on error type and count
    if (this.errorCount <= this.maxRetries) {
      if (error.message.includes('navigate') || error.message.includes('route')) {
        return strategies.retry;
      }
      if (error.message.includes('stack') || error.message.includes('state')) {
        return strategies.fallback;
      }
    }

    // If retries exceeded or critical error, reset
    if (this.errorCount > this.maxRetries) {
      return strategies.reset;
    }

    return strategies.fallback;
  }

  /**
   * Retry the last navigation action
   */
  async retryNavigation(context) {
    try {
      if (!this.navigationRef?.current) {
        throw new Error('Navigation reference not available');
      }

      Logger.info('Retrying navigation', context);

      if (context.action && context.params) {
        // Retry the specific navigation action
        this.navigationRef.current.navigate(context.action, context.params);
      } else if (context.routeName) {
        // Navigate to the intended route
        this.navigationRef.current.navigate(context.routeName);
      } else {
        // Fallback to safe navigation
        return this.navigateToFallback();
      }

      // Reset error count on successful retry
      this.errorCount = 0;
      Logger.info('Navigation retry successful');
      return true;
    } catch (retryError) {
      Logger.error('Navigation retry failed', retryError);
      return this.navigateToFallback();
    }
  }

  /**
   * Navigate to a fallback route
   */
  async navigateToFallback() {
    try {
      if (!this.navigationRef?.current) {
        Logger.error('Navigation reference not available for fallback');
        return false;
      }

      // Try fallback routes in order
      for (const route of this.fallbackRoutes) {
        try {
          Logger.info(`Attempting fallback navigation to ${route}`);
          this.navigationRef.current.navigate(route);
          this.errorCount = 0;
          Logger.info(`Fallback navigation to ${route} successful`);
          return true;
        } catch (fallbackError) {
          Logger.warn(`Fallback to ${route} failed`, fallbackError);
          continue;
        }
      }

      // If all fallbacks fail, reset the stack
      return this.resetNavigationStack();
    } catch (error) {
      Logger.error('Fallback navigation failed', error);
      return false;
    }
  }

  /**
   * Reset the navigation stack to a known good state
   */
  async resetNavigationStack() {
    try {
      if (!this.navigationRef?.current) {
        Logger.error('Navigation reference not available for reset');
        return false;
      }

      Logger.info('Resetting navigation stack');

      // Reset to the initial route
      this.navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Map' }],
        })
      );

      this.errorCount = 0;
      Logger.info('Navigation stack reset successful');
      return true;
    } catch (error) {
      Logger.error('Navigation stack reset failed', error);
      return false;
    }
  }

  /**
   * Reload the current screen
   */
  async reloadCurrentScreen() {
    try {
      if (!this.navigationRef?.current) {
        Logger.error('Navigation reference not available for reload');
        return false;
      }

      const currentRoute = this.navigationRef.current.getCurrentRoute();
      if (!currentRoute) {
        return this.navigateToFallback();
      }

      Logger.info('Reloading current screen', { route: currentRoute.name });

      // Pop and push the same route to reload it
      this.navigationRef.current.dispatch(StackActions.pop());
      this.navigationRef.current.navigate(currentRoute.name, currentRoute.params);

      this.errorCount = 0;
      Logger.info('Screen reload successful');
      return true;
    } catch (error) {
      Logger.error('Screen reload failed', error);
      return this.navigateToFallback();
    }
  }

  /**
   * Check if navigation is in a recoverable state
   */
  isNavigationHealthy() {
    try {
      if (!this.navigationRef?.current) {
        return false;
      }

      const state = this.navigationRef.current.getRootState();
      return state && state.routes && state.routes.length > 0;
    } catch (error) {
      Logger.error('Navigation health check failed', error);
      return false;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: this.errorHistory.length,
      currentErrorCount: this.errorCount,
      recentErrors: this.errorHistory.slice(-10),
      isHealthy: this.isNavigationHealthy(),
    };
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.errorCount = 0;
    Logger.info('Navigation error history cleared');
  }

  /**
   * Handle authentication errors during navigation
   */
  handleAuthError(error, context = {}) {
    Logger.authError(error, context);

    try {
      if (!this.navigationRef?.current) {
        return false;
      }

      // Navigate to authentication flow
      this.navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        })
      );

      Logger.info('Redirected to authentication due to auth error');
      return true;
    } catch (navError) {
      Logger.error('Failed to redirect to authentication', navError);
      return false;
    }
  }

  /**
   * Handle network errors during navigation
   */
  handleNetworkError(error, context = {}) {
    Logger.networkError(error, context);

    // For network errors, we typically don't need to change navigation
    // but we should inform the user and possibly limit functionality
    return {
      shouldShowOfflineMessage: true,
      shouldLimitNavigation: true,
      allowedRoutes: ['Map', 'Settings', 'PastJourneys'], // Basic offline functionality
    };
  }

  /**
   * Recover navigation state from corruption
   */
  async recoverNavigationState() {
    try {
      Logger.info('Attempting navigation state recovery');
      
      const success = await NavigationStateRecovery.recoverNavigationState();
      
      if (success) {
        this.errorCount = 0;
        Logger.info('Navigation state recovery successful');
        return true;
      } else {
        Logger.warn('Navigation state recovery failed, using fallback');
        return this.resetNavigationStack();
      }
    } catch (error) {
      Logger.error('Navigation state recovery error', error);
      return this.resetNavigationStack();
    }
  }

  /**
   * Handle navigation state corruption
   */
  async handleStateCorruption(error, currentState) {
    Logger.error('Navigation state corruption detected', {
      error: error.message,
      currentState,
    });

    return NavigationStateRecovery.handleStateCorruption(error, currentState);
  }

  /**
   * Create navigation checkpoint
   */
  async createNavigationCheckpoint(label = 'error_recovery') {
    try {
      return await NavigationStateRecovery.createCheckpoint(label);
    } catch (error) {
      Logger.error('Failed to create navigation checkpoint', error);
      return false;
    }
  }

  /**
   * Retry navigation action with exponential backoff
   */
  async retryNavigationAction(action, options = {}) {
    try {
      return await NavigationRetryService.retryNavigationAction(action, {
        ...options,
        context: {
          ...options.context,
          errorService: 'NavigationErrorService',
        },
      });
    } catch (error) {
      Logger.error('Navigation retry failed', error);
      return null;
    }
  }

  /**
   * Handle navigation with retry logic
   */
  async navigateWithRetry(routeName, params = {}, options = {}) {
    try {
      return await NavigationRetryService.retryNavigate(routeName, params, {
        ...options,
        onFailure: (item) => {
          Logger.error('Navigation with retry failed', {
            routeName,
            attempts: item.attempts,
            error: item.lastError?.message,
          });
          
          // Fallback to safe navigation
          this.navigateToFallback();
        },
      });
    } catch (error) {
      Logger.error('Navigate with retry error', error);
      return this.navigateToFallback();
    }
  }
}

// Create singleton instance
const navigationErrorService = new NavigationErrorService();

export default navigationErrorService;