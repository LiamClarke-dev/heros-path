/**
 * Navigation State Optimization Utilities
 * Optimizes navigation state updates and prevents unnecessary re-renders
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { InteractionManager, View, Text } from 'react-native';
import { navigationStackManager } from './navigationPerformance';

/**
 * Debounced navigation state updates to prevent excessive re-renders
 */
export class NavigationStateDebouncer {
  constructor(delay = 100) {
    this.delay = delay;
    this.timeouts = new Map();
    this.pendingUpdates = new Map();
  }

  /**
   * Debounce a navigation state update
   */
  debounceUpdate(key, updateFunction, immediate = false) {
    if (immediate) {
      updateFunction();
      return;
    }

    // Clear existing timeout for this key
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }

    // Store the pending update
    this.pendingUpdates.set(key, updateFunction);

    // Set new timeout
    const timeout = setTimeout(() => {
      const pendingUpdate = this.pendingUpdates.get(key);
      if (pendingUpdate) {
        pendingUpdate();
        this.pendingUpdates.delete(key);
      }
      this.timeouts.delete(key);
    }, this.delay);

    this.timeouts.set(key, timeout);
  }

  /**
   * Flush all pending updates immediately
   */
  flush() {
    this.pendingUpdates.forEach((updateFunction, key) => {
      updateFunction();
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
        this.timeouts.delete(key);
      }
    });
    this.pendingUpdates.clear();
  }

  /**
   * Clear all pending updates
   */
  clear() {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    this.pendingUpdates.clear();
  }
}

// Global debouncer instance
export const navigationStateDebouncer = new NavigationStateDebouncer(50);

/**
 * Optimized navigation state hook with memoization and debouncing
 */
export const useOptimizedNavigationState = (initialState = {}) => {
  const stateRef = useRef(initialState);
  const [state, setState] = React.useState(initialState);
  const updateCountRef = useRef(0);

  // Memoized state update function
  const updateState = useCallback((updates, immediate = false) => {
    const newState = typeof updates === 'function' 
      ? updates(stateRef.current) 
      : { ...stateRef.current, ...updates };

    // Check if state actually changed
    if (JSON.stringify(newState) === JSON.stringify(stateRef.current)) {
      return; // No change, skip update
    }

    stateRef.current = newState;
    updateCountRef.current++;

    // Debounce the state update to prevent excessive re-renders
    navigationStateDebouncer.debounceUpdate(
      'navigationState',
      () => setState(newState),
      immediate
    );
  }, []);

  // Memoized state selectors to prevent unnecessary re-renders
  const selectors = useMemo(() => ({
    getCurrentScreen: () => state.currentScreen,
    getPreviousScreen: () => state.previousScreen,
    getCanGoBack: () => state.canGoBack,
    getParams: () => state.params,
    getRouteHistory: () => state.routeHistory || [],
  }), [state]);

  // Performance metrics
  const getMetrics = useCallback(() => ({
    updateCount: updateCountRef.current,
    currentStateSize: JSON.stringify(state).length,
    lastUpdate: Date.now(),
  }), [state]);

  return {
    state,
    updateState,
    selectors,
    getMetrics,
  };
};

/**
 * Navigation render optimization hook
 * Prevents unnecessary re-renders of navigation components
 */
export const useNavigationRenderOptimization = (componentName) => {
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const propsRef = useRef({});

  // Track render count
  useEffect(() => {
    renderCountRef.current++;
    lastRenderTime.current = Date.now();
  });

  // Memoized props comparison
  const shouldUpdate = useCallback((nextProps) => {
    const currentProps = propsRef.current;
    
    // Shallow comparison of props
    const propsChanged = Object.keys(nextProps).some(key => 
      nextProps[key] !== currentProps[key]
    ) || Object.keys(currentProps).some(key => 
      !(key in nextProps)
    );

    propsRef.current = nextProps;
    return propsChanged;
  }, []);

  // Performance warning for excessive re-renders
  useEffect(() => {
    if (renderCountRef.current > 10) {
      const timeSinceLastRender = Date.now() - lastRenderTime.current;
      if (timeSinceLastRender < 1000) { // More than 10 renders in 1 second
        console.warn(`⚠️ Excessive re-renders detected for ${componentName}: ${renderCountRef.current} renders`);
      }
    }
  });

  return {
    renderCount: renderCountRef.current,
    shouldUpdate,
    lastRenderTime: lastRenderTime.current,
  };
};

/**
 * Memory-efficient navigation history manager
 */
export class NavigationHistoryManager {
  constructor(maxHistorySize = 50) {
    this.maxHistorySize = maxHistorySize;
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Add a navigation entry to history
   */
  addEntry(screen, params = {}) {
    const entry = {
      screen,
      params,
      timestamp: Date.now(),
      id: `${screen}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Remove any entries after current index (when navigating from middle of history)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new entry
    this.history.push(entry);
    this.currentIndex = this.history.length - 1;

    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      const itemsToRemove = this.history.length - this.maxHistorySize;
      this.history.splice(0, itemsToRemove);
      this.currentIndex -= itemsToRemove;
    }

    return entry;
  }

  /**
   * Get the previous navigation entry
   */
  getPrevious() {
    if (this.currentIndex > 0) {
      return this.history[this.currentIndex - 1];
    }
    return null;
  }

  /**
   * Get the next navigation entry
   */
  getNext() {
    if (this.currentIndex < this.history.length - 1) {
      return this.history[this.currentIndex + 1];
    }
    return null;
  }

  /**
   * Navigate back in history
   */
  goBack() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * Navigate forward in history
   */
  goForward() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * Get current navigation entry
   */
  getCurrent() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * Clear navigation history
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Get history statistics
   */
  getStats() {
    return {
      totalEntries: this.history.length,
      currentIndex: this.currentIndex,
      canGoBack: this.currentIndex > 0,
      canGoForward: this.currentIndex < this.history.length - 1,
      memoryUsage: JSON.stringify(this.history).length,
    };
  }
}

// Global history manager instance
export const navigationHistoryManager = new NavigationHistoryManager();

/**
 * Batch navigation updates to improve performance
 */
export class NavigationUpdateBatcher {
  constructor(batchSize = 10, flushInterval = 100) {
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.pendingUpdates = [];
    this.flushTimeout = null;
  }

  /**
   * Add an update to the batch
   */
  addUpdate(updateFunction) {
    this.pendingUpdates.push(updateFunction);

    // Auto-flush if batch is full
    if (this.pendingUpdates.length >= this.batchSize) {
      this.flush();
      return;
    }

    // Schedule flush if not already scheduled
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => {
        this.flush();
      }, this.flushInterval);
    }
  }

  /**
   * Flush all pending updates
   */
  flush() {
    if (this.pendingUpdates.length === 0) return;

    // Clear timeout
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Execute all updates in a single batch
    InteractionManager.runAfterInteractions(() => {
      const updates = [...this.pendingUpdates];
      this.pendingUpdates = [];

      updates.forEach(updateFunction => {
        try {
          updateFunction();
        } catch (error) {
          console.error('Error executing batched navigation update:', error);
        }
      });

      console.log(`📦 Flushed ${updates.length} navigation updates`);
    });
  }

  /**
   * Clear all pending updates
   */
  clear() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    this.pendingUpdates = [];
  }
}

// Global update batcher instance
export const navigationUpdateBatcher = new NavigationUpdateBatcher();

/**
 * Hook for batched navigation updates
 */
export const useBatchedNavigationUpdates = () => {
  const batchUpdate = useCallback((updateFunction) => {
    navigationUpdateBatcher.addUpdate(updateFunction);
  }, []);

  const flushUpdates = useCallback(() => {
    navigationUpdateBatcher.flush();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      navigationUpdateBatcher.clear();
    };
  }, []);

  return {
    batchUpdate,
    flushUpdates,
  };
};

/**
 * Performance monitoring for navigation state
 */
export const NavigationStatePerformanceMonitor = React.memo(() => {
  const [metrics, setMetrics] = React.useState({
    stateUpdates: 0,
    averageUpdateTime: 0,
    memoryUsage: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const historyStats = navigationHistoryManager.getStats();
      const stackMetrics = navigationStackManager.getPerformanceMetrics();
      
      setMetrics({
        stateUpdates: stackMetrics.totalNavigations,
        averageUpdateTime: stackMetrics.averageNavigationTime,
        memoryUsage: historyStats.memoryUsage,
        historySize: historyStats.totalEntries,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!__DEV__) return null; // Only show in development

  return (
    <View style={monitorStyles.container}>
      <Text style={monitorStyles.title}>Nav State Performance</Text>
      <Text style={monitorStyles.metric}>Updates: {metrics.stateUpdates}</Text>
      <Text style={monitorStyles.metric}>Avg Time: {metrics.averageUpdateTime?.toFixed(1)}ms</Text>
      <Text style={monitorStyles.metric}>Memory: {(metrics.memoryUsage / 1024).toFixed(1)}KB</Text>
      <Text style={monitorStyles.metric}>History: {metrics.historySize}</Text>
    </View>
  );
});

const monitorStyles = {
  container: {
    position: 'absolute',
    top: 150,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 9998,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metric: {
    color: '#FFFFFF',
    fontSize: 9,
  },
};

export default {
  NavigationStateDebouncer,
  useOptimizedNavigationState,
  useNavigationRenderOptimization,
  NavigationHistoryManager,
  NavigationUpdateBatcher,
  useBatchedNavigationUpdates,
  NavigationStatePerformanceMonitor,
  navigationStateDebouncer,
  navigationHistoryManager,
  navigationUpdateBatcher,
};