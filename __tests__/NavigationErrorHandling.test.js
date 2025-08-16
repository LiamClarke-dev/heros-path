/**
 * Tests for Navigation Error Handling services
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

import NavigationErrorService from '../services/NavigationErrorService';
import NavigationStateRecovery from '../services/NavigationStateRecovery';
import NavigationRetryService from '../services/NavigationRetryService';
import Logger from '../utils/Logger';

// Mock dependencies
jest.mock('../utils/Logger', () => ({
  navigationError: jest.fn(),
  authError: jest.fn(),
  networkError: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Focus on service testing without React Native components

describe('NavigationErrorService', () => {
  let mockNavigationRef;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigationRef = {
      current: {
        navigate: jest.fn(),
        dispatch: jest.fn(),
        canGoBack: jest.fn(() => true),
        goBack: jest.fn(),
        getCurrentRoute: jest.fn(() => ({ name: 'TestRoute' })),
        getRootState: jest.fn(() => ({
          routes: [{ name: 'TestRoute' }],
          index: 0,
        })),
      },
    };
    NavigationErrorService.setNavigationRef(mockNavigationRef);
  });

  it('should handle navigation errors', () => {
    const error = new Error('Navigation failed');
    const context = { routeName: 'TestRoute' };

    const result = NavigationErrorService.handleNavigationError(error, context);

    expect(Logger.navigationError).toHaveBeenCalledWith(error, context);
    expect(typeof result).toBe('function');
  });

  it('should retry navigation successfully', async () => {
    const context = { routeName: 'TestRoute' };
    
    const success = await NavigationErrorService.retryNavigation(context);

    expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('TestRoute');
    expect(success).toBe(true);
  });

  it('should navigate to fallback when retry fails', async () => {
    mockNavigationRef.current.navigate.mockImplementation(() => {
      throw new Error('Navigation failed');
    });

    const success = await NavigationErrorService.navigateToFallback();

    expect(success).toBe(true);
  });

  it('should reset navigation stack', async () => {
    const success = await NavigationErrorService.resetNavigationStack();

    expect(mockNavigationRef.current.dispatch).toHaveBeenCalled();
    expect(success).toBe(true);
  });

  it('should handle authentication errors', () => {
    const error = new Error('Auth failed');
    const context = { user: 'testUser' };

    const success = NavigationErrorService.handleAuthError(error, context);

    expect(Logger.authError).toHaveBeenCalledWith(error, context);
    expect(mockNavigationRef.current.dispatch).toHaveBeenCalled();
    expect(success).toBe(true);
  });

  it('should handle network errors', () => {
    const error = new Error('Network failed');
    const context = { networkType: 'wifi' };

    const result = NavigationErrorService.handleNetworkError(error, context);

    expect(Logger.networkError).toHaveBeenCalledWith(error, context);
    expect(result).toEqual({
      shouldShowOfflineMessage: true,
      shouldLimitNavigation: true,
      allowedRoutes: ['Map', 'Settings', 'PastJourneys'],
    });
  });
});

describe('NavigationStateRecovery', () => {
  let mockNavigationRef;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigationRef = {
      current: {
        dispatch: jest.fn(),
        getRootState: jest.fn(() => ({
          routes: [{ name: 'TestRoute', key: 'test-key' }],
          index: 0,
        })),
      },
    };
    NavigationStateRecovery.setNavigationRef(mockNavigationRef);
  });

  it('should save navigation state', async () => {
    const state = {
      routes: [{ name: 'TestRoute', key: 'test-key' }],
      index: 0,
    };

    const success = await NavigationStateRecovery.saveNavigationState(state);

    expect(success).toBe(true);
  });

  it('should validate navigation state', () => {
    const validState = {
      routes: [{ name: 'TestRoute', key: 'test-key' }],
      index: 0,
    };

    const isValid = NavigationStateRecovery.validateNavigationState(validState);

    expect(isValid).toBe(true);
  });

  it('should reject invalid navigation state', () => {
    const invalidState = {
      routes: [],
      index: 0,
    };

    const isValid = NavigationStateRecovery.validateNavigationState(invalidState);

    expect(isValid).toBe(false);
  });

  it('should reset to default state when recovery fails', async () => {
    const success = await NavigationStateRecovery.resetToDefaultState();

    expect(mockNavigationRef.current.dispatch).toHaveBeenCalled();
    expect(success).toBe(true);
  });
});

describe('NavigationRetryService', () => {
  let mockNavigationRef;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigationRef = {
      current: {
        navigate: jest.fn(),
        dispatch: jest.fn(),
        canGoBack: jest.fn(() => true),
        goBack: jest.fn(),
        getRootState: jest.fn(() => ({
          routes: [{ name: 'TestRoute' }],
          index: 0,
        })),
      },
    };
    NavigationRetryService.setNavigationRef(mockNavigationRef);
  });

  it('should add navigation action to retry queue', async () => {
    const action = {
      type: 'NAVIGATE',
      payload: { name: 'TestRoute' },
    };

    const retryId = await NavigationRetryService.retryNavigationAction(action);

    expect(typeof retryId).toBe('number');
    
    const status = NavigationRetryService.getRetryStatus();
    expect(status.queueLength).toBe(1);
  });

  it('should execute navigation actions successfully', async () => {
    const action = {
      type: 'NAVIGATE',
      payload: { name: 'TestRoute' },
    };

    await NavigationRetryService.retryNavigationAction(action);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('TestRoute', undefined);
  });

  it('should retry failed navigation actions', async () => {
    mockNavigationRef.current.navigate
      .mockImplementationOnce(() => {
        throw new Error('First attempt failed');
      })
      .mockImplementationOnce(() => {
        // Second attempt succeeds
      });

    const action = {
      type: 'NAVIGATE',
      payload: { name: 'TestRoute' },
    };

    await NavigationRetryService.retryNavigationAction(action, {
      maxRetries: 2,
      delay: 10, // Short delay for testing
    });

    // Wait for processing and retries
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(mockNavigationRef.current.navigate).toHaveBeenCalledTimes(2);
  });

  it('should handle custom navigation actions', async () => {
    const customExecute = jest.fn();
    const action = {
      type: 'CUSTOM',
      execute: customExecute,
    };

    await NavigationRetryService.retryNavigationAction(action);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(customExecute).toHaveBeenCalledWith(mockNavigationRef.current);
  });

  it('should calculate exponential backoff delay', () => {
    const item = {
      attempts: 3,
      options: {
        delay: 1000,
        exponentialBackoff: true,
      },
    };

    const delay = NavigationRetryService.calculateRetryDelay(item);

    // Should be 1000 * 2^(3-1) = 4000ms (plus jitter)
    expect(delay).toBeGreaterThan(4000);
    expect(delay).toBeLessThan(5000);
  });

  it('should clear retry queue', () => {
    // Add some items to queue
    NavigationRetryService.retryNavigationAction({ type: 'NAVIGATE', payload: { name: 'Route1' } });
    NavigationRetryService.retryNavigationAction({ type: 'NAVIGATE', payload: { name: 'Route2' } });

    const clearedCount = NavigationRetryService.clearRetryQueue();

    expect(clearedCount).toBe(2);
    
    const status = NavigationRetryService.getRetryStatus();
    expect(status.queueLength).toBe(0);
  });
});

describe('Error Integration', () => {
  it('should integrate all error handling services', () => {
    const mockNavigationRef = {
      current: {
        navigate: jest.fn(),
        dispatch: jest.fn(),
        getRootState: jest.fn(() => ({ routes: [], index: 0 })),
      },
    };

    // Test that all services can be initialized together
    NavigationErrorService.setNavigationRef(mockNavigationRef);
    NavigationStateRecovery.setNavigationRef(mockNavigationRef);
    NavigationRetryService.setNavigationRef(mockNavigationRef);

    expect(NavigationErrorService.navigationRef).toBe(mockNavigationRef);
    expect(NavigationStateRecovery.navigationRef).toBe(mockNavigationRef);
    expect(NavigationRetryService.navigationRef).toBe(mockNavigationRef);
  });

  it('should handle cascading errors gracefully', async () => {
    const mockNavigationRef = {
      current: {
        navigate: jest.fn(() => {
          throw new Error('Navigation failed');
        }),
        dispatch: jest.fn(() => {
          throw new Error('Dispatch failed');
        }),
        getRootState: jest.fn(() => ({ routes: [], index: 0 })),
      },
    };

    NavigationErrorService.setNavigationRef(mockNavigationRef);

    // This should not throw, but handle errors gracefully
    const result = await NavigationErrorService.navigateToFallback();

    expect(result).toBe(false); // Should fail gracefully
    expect(Logger.error).toHaveBeenCalled();
  });
});