/**
 * NavigationRetryService for Hero's Path
 * Implements retry logic for failed navigation actions
 * Requirements: 10.6, 10.8
 */

import Logger from '../utils/Logger';

class NavigationRetryService {
  constructor() {
    this.navigationRef = null;
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.exponentialBackoff = true;
    this.isProcessingQueue = false;
  }

  /**
   * Set the navigation reference
   */
  setNavigationRef(ref) {
    this.navigationRef = ref;
  }

  /**
   * Add a navigation action to the retry queue
   */
  async retryNavigationAction(action, options = {}) {
    const retryItem = {
      id: Date.now() + Math.random(),
      action,
      options: {
        maxRetries: options.maxRetries || this.maxRetries,
        delay: options.delay || this.retryDelay,
        exponentialBackoff: options.exponentialBackoff !== false,
        onSuccess: options.onSuccess,
        onFailure: options.onFailure,
        context: options.context || {},
      },
      attempts: 0,
      lastError: null,
      createdAt: new Date().toISOString(),
    };

    this.retryQueue.push(retryItem);
    
    Logger.info('Navigation action added to retry queue', {
      id: retryItem.id,
      action: action.type || 'unknown',
      maxRetries: retryItem.options.maxRetries,
    });

    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.processRetryQueue();
    }

    return retryItem.id;
  }

  /**
   * Process the retry queue
   */
  async processRetryQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    try {
      while (this.retryQueue.length > 0) {
        const item = this.retryQueue[0];
        
        try {
          const success = await this.executeNavigationAction(item);
          
          if (success) {
            // Remove successful item from queue
            this.retryQueue.shift();
            
            Logger.info('Navigation action succeeded', {
              id: item.id,
              attempts: item.attempts,
            });

            // Call success callback
            if (item.options.onSuccess) {
              item.options.onSuccess(item);
            }
          } else {
            // Check if we should retry
            if (item.attempts >= item.options.maxRetries) {
              // Max retries reached, remove from queue
              this.retryQueue.shift();
              
              Logger.error('Navigation action failed after max retries', {
                id: item.id,
                attempts: item.attempts,
                lastError: item.lastError?.message,
              });

              // Call failure callback
              if (item.options.onFailure) {
                item.options.onFailure(item);
              }
            } else {
              // Wait before next retry
              const delay = this.calculateRetryDelay(item);
              await this.sleep(delay);
            }
          }
        } catch (error) {
          Logger.error('Error processing retry queue item', error);
          
          // Remove problematic item to prevent infinite loop
          this.retryQueue.shift();
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Execute a navigation action
   */
  async executeNavigationAction(item) {
    if (!this.navigationRef?.current) {
      item.lastError = new Error('Navigation reference not available');
      return false;
    }

    item.attempts++;
    
    try {
      Logger.debug('Executing navigation action', {
        id: item.id,
        attempt: item.attempts,
        action: item.action.type || 'unknown',
      });

      const { action } = item;
      
      // Execute different types of navigation actions
      switch (action.type) {
        case 'NAVIGATE':
          this.navigationRef.current.navigate(action.payload.name, action.payload.params);
          break;
          
        case 'RESET':
          this.navigationRef.current.dispatch(action);
          break;
          
        case 'GO_BACK':
          if (this.navigationRef.current.canGoBack()) {
            this.navigationRef.current.goBack();
          } else {
            throw new Error('Cannot go back');
          }
          break;
          
        case 'PUSH':
          this.navigationRef.current.dispatch(action);
          break;
          
        case 'POP':
          this.navigationRef.current.dispatch(action);
          break;
          
        case 'CUSTOM':
          if (typeof action.execute === 'function') {
            await action.execute(this.navigationRef.current);
          } else {
            throw new Error('Custom action missing execute function');
          }
          break;
          
        default:
          // Try to dispatch the action directly
          this.navigationRef.current.dispatch(action);
      }

      // Wait a bit to ensure navigation completed
      await this.sleep(100);
      
      // Verify navigation succeeded (basic check)
      const currentState = this.navigationRef.current.getRootState();
      if (!currentState || !currentState.routes || currentState.routes.length === 0) {
        throw new Error('Navigation resulted in invalid state');
      }

      return true;
    } catch (error) {
      item.lastError = error;
      
      Logger.warn('Navigation action failed', {
        id: item.id,
        attempt: item.attempts,
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(item) {
    const baseDelay = item.options.delay;
    
    if (!item.options.exponentialBackoff) {
      return baseDelay;
    }

    // Exponential backoff: delay * (2 ^ (attempts - 1))
    const exponentialDelay = baseDelay * Math.pow(2, item.attempts - 1);
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;
    
    // Cap at 30 seconds
    return Math.min(exponentialDelay + jitter, 30000);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel a retry item
   */
  cancelRetry(id) {
    const index = this.retryQueue.findIndex(item => item.id === id);
    
    if (index !== -1) {
      const item = this.retryQueue.splice(index, 1)[0];
      
      Logger.info('Navigation retry cancelled', {
        id: item.id,
        attempts: item.attempts,
      });

      return true;
    }
    
    return false;
  }

  /**
   * Clear all retry items
   */
  clearRetryQueue() {
    const count = this.retryQueue.length;
    this.retryQueue = [];
    
    Logger.info('Navigation retry queue cleared', { count });
    
    return count;
  }

  /**
   * Get retry queue status
   */
  getRetryStatus() {
    return {
      queueLength: this.retryQueue.length,
      isProcessing: this.isProcessingQueue,
      items: this.retryQueue.map(item => ({
        id: item.id,
        attempts: item.attempts,
        maxRetries: item.options.maxRetries,
        createdAt: item.createdAt,
        lastError: item.lastError?.message,
      })),
    };
  }

  /**
   * Retry navigation with common patterns
   */
  async retryNavigate(routeName, params = {}, options = {}) {
    const action = {
      type: 'NAVIGATE',
      payload: { name: routeName, params },
    };

    return this.retryNavigationAction(action, {
      ...options,
      context: { routeName, params },
    });
  }

  /**
   * Retry going back
   */
  async retryGoBack(options = {}) {
    const action = {
      type: 'GO_BACK',
    };

    return this.retryNavigationAction(action, options);
  }

  /**
   * Retry navigation reset
   */
  async retryReset(resetAction, options = {}) {
    return this.retryNavigationAction(resetAction, options);
  }

  /**
   * Retry custom navigation action
   */
  async retryCustomAction(executeFunction, options = {}) {
    const action = {
      type: 'CUSTOM',
      execute: executeFunction,
    };

    return this.retryNavigationAction(action, options);
  }

  /**
   * Handle network-related navigation failures
   */
  async handleNetworkNavigationFailure(action, networkState, options = {}) {
    // Adjust retry strategy based on network state
    const networkOptions = {
      ...options,
      maxRetries: networkState.isConnected ? (options.maxRetries || 3) : 1,
      delay: networkState.isConnected ? (options.delay || 1000) : 5000,
      context: {
        ...options.context,
        networkState: {
          isConnected: networkState.isConnected,
          type: networkState.type,
        },
      },
    };

    Logger.info('Handling network navigation failure', {
      isConnected: networkState.isConnected,
      networkType: networkState.type,
      maxRetries: networkOptions.maxRetries,
    });

    return this.retryNavigationAction(action, networkOptions);
  }

  /**
   * Handle authentication-related navigation failures
   */
  async handleAuthNavigationFailure(action, authState, options = {}) {
    // Don't retry if user is not authenticated and action requires auth
    if (!authState.isAuthenticated && options.requiresAuth) {
      Logger.warn('Skipping retry for auth-required action - user not authenticated');
      
      if (options.onFailure) {
        options.onFailure({
          action,
          error: new Error('Authentication required'),
        });
      }
      
      return null;
    }

    const authOptions = {
      ...options,
      maxRetries: authState.isAuthenticated ? (options.maxRetries || 2) : 0,
      context: {
        ...options.context,
        authState: {
          isAuthenticated: authState.isAuthenticated,
          user: authState.user?.id,
        },
      },
    };

    return this.retryNavigationAction(action, authOptions);
  }
}

// Create singleton instance
const navigationRetryService = new NavigationRetryService();

export default navigationRetryService;