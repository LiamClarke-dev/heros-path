/**
 * Navigation Performance Optimization Utilities
 * Provides lazy loading, memory management, and performance monitoring for navigation
 */

import React, { Suspense, lazy, useCallback, useMemo, useRef, useEffect } from 'react';
import { InteractionManager, DeviceInfo } from 'react-native';
import performanceMonitor from './performanceMonitor';

// Performance configuration based on device capabilities
const PERFORMANCE_CONFIG = {
  // Animation durations based on device performance
  ANIMATION_DURATION: {
    HIGH_END: 300,
    MID_RANGE: 250,
    LOW_END: 200,
  },
  
  // Memory management thresholds
  MEMORY_THRESHOLDS: {
    MAX_STACK_SIZE: 10,
    CLEANUP_THRESHOLD: 8,
    PRELOAD_LIMIT: 3,
  },
  
  // Performance monitoring intervals
  MONITORING: {
    RENDER_TIME_THRESHOLD: 16, // 60fps target
    MEMORY_CHECK_INTERVAL: 5000,
    PERFORMANCE_SAMPLE_SIZE: 100,
  },
};

/**
 * Device performance tier detection
 */
class DevicePerformanceTier {
  constructor() {
    this.tier = null;
    this.capabilities = null;
  }

  async initialize() {
    try {
      // Get device information
      const deviceInfo = {
        totalMemory: await DeviceInfo.getTotalMemory(),
        usedMemory: await DeviceInfo.getUsedMemory(),
        powerState: await DeviceInfo.getPowerState(),
        isLowRamDevice: await DeviceInfo.isLowRamDevice(),
      };

      this.capabilities = deviceInfo;
      this.tier = this.calculatePerformanceTier(deviceInfo);
      
      console.log(`📱 Device performance tier: ${this.tier}`, deviceInfo);
      return this.tier;
    } catch (error) {
      console.warn('Could not determine device performance tier:', error);
      this.tier = 'MID_RANGE'; // Safe default
      return this.tier;
    }
  }

  calculatePerformanceTier(deviceInfo) {
    const { totalMemory, isLowRamDevice } = deviceInfo;
    
    if (isLowRamDevice || totalMemory < 2 * 1024 * 1024 * 1024) { // < 2GB
      return 'LOW_END';
    } else if (totalMemory < 4 * 1024 * 1024 * 1024) { // < 4GB
      return 'MID_RANGE';
    } else {
      return 'HIGH_END';
    }
  }

  getAnimationDuration() {
    return PERFORMANCE_CONFIG.ANIMATION_DURATION[this.tier] || PERFORMANCE_CONFIG.ANIMATION_DURATION.MID_RANGE;
  }

  shouldReduceAnimations() {
    return this.tier === 'LOW_END';
  }

  getMaxStackSize() {
    const multiplier = this.tier === 'HIGH_END' ? 1.5 : this.tier === 'LOW_END' ? 0.7 : 1;
    return Math.floor(PERFORMANCE_CONFIG.MEMORY_THRESHOLDS.MAX_STACK_SIZE * multiplier);
  }
}

// Singleton instance
export const devicePerformanceTier = new DevicePerformanceTier();

/**
 * Lazy loading factory for navigation screens
 */
export const createLazyScreen = (importFunction, fallbackComponent = null) => {
  const LazyComponent = lazy(importFunction);
  
  return React.forwardRef((props, ref) => (
    <Suspense fallback={fallbackComponent || <NavigationLoadingScreen />}>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));
};

/**
 * Default loading screen for lazy-loaded navigation screens
 */
const NavigationLoadingScreen = React.memo(() => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
});

/**
 * Navigation stack memory manager
 */
export class NavigationStackManager {
  constructor() {
    this.stackHistory = [];
    this.preloadedScreens = new Map();
    this.performanceMetrics = {
      navigationTimes: [],
      memoryUsage: [],
      stackSizes: [],
    };
  }

  /**
   * Track navigation to a screen
   */
  trackNavigation(screenName, params = {}) {
    const navigationStart = performance.now();
    
    // Add to stack history
    this.stackHistory.push({
      screen: screenName,
      params,
      timestamp: Date.now(),
      navigationStart,
    });

    // Cleanup old entries if stack is too large
    this.cleanupStack();

    // Record performance metrics
    performanceMonitor.recordRenderTime('Navigation', navigationStart, performance.now());
    
    return navigationStart;
  }

  /**
   * Complete navigation timing
   */
  completeNavigation(navigationStart) {
    const navigationEnd = performance.now();
    const navigationTime = navigationEnd - navigationStart;
    
    this.performanceMetrics.navigationTimes.push({
      time: navigationTime,
      timestamp: Date.now(),
    });

    // Keep only recent metrics
    if (this.performanceMetrics.navigationTimes.length > PERFORMANCE_CONFIG.MONITORING.PERFORMANCE_SAMPLE_SIZE) {
      this.performanceMetrics.navigationTimes.shift();
    }

    console.log(`🧭 Navigation completed in ${navigationTime.toFixed(2)}ms`);
    return navigationTime;
  }

  /**
   * Clean up navigation stack to prevent memory issues
   */
  cleanupStack() {
    const maxSize = devicePerformanceTier.getMaxStackSize();
    
    if (this.stackHistory.length > maxSize) {
      const itemsToRemove = this.stackHistory.length - maxSize;
      this.stackHistory.splice(0, itemsToRemove);
      console.log(`🧹 Cleaned up ${itemsToRemove} navigation stack entries`);
    }
  }

  /**
   * Preload a screen for faster navigation
   */
  preloadScreen(screenName, importFunction) {
    if (this.preloadedScreens.has(screenName)) {
      return this.preloadedScreens.get(screenName);
    }

    if (this.preloadedScreens.size >= PERFORMANCE_CONFIG.MEMORY_THRESHOLDS.PRELOAD_LIMIT) {
      // Remove oldest preloaded screen
      const oldestKey = this.preloadedScreens.keys().next().value;
      this.preloadedScreens.delete(oldestKey);
    }

    const preloadPromise = importFunction();
    this.preloadedScreens.set(screenName, preloadPromise);
    
    console.log(`⚡ Preloading screen: ${screenName}`);
    return preloadPromise;
  }

  /**
   * Get navigation performance metrics
   */
  getPerformanceMetrics() {
    const navigationTimes = this.performanceMetrics.navigationTimes.map(n => n.time);
    
    if (navigationTimes.length === 0) {
      return {
        averageNavigationTime: 0,
        maxNavigationTime: 0,
        minNavigationTime: 0,
        totalNavigations: 0,
        performanceScore: 100,
      };
    }

    const average = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
    const max = Math.max(...navigationTimes);
    const min = Math.min(...navigationTimes);
    
    // Calculate performance score (0-100)
    const targetTime = PERFORMANCE_CONFIG.MONITORING.RENDER_TIME_THRESHOLD;
    const performanceScore = Math.max(0, Math.min(100, 100 - ((average - targetTime) / targetTime) * 50));

    return {
      averageNavigationTime: average,
      maxNavigationTime: max,
      minNavigationTime: min,
      totalNavigations: navigationTimes.length,
      performanceScore: Math.round(performanceScore),
      stackSize: this.stackHistory.length,
      preloadedScreens: this.preloadedScreens.size,
    };
  }
}

// Singleton instance
export const navigationStackManager = new NavigationStackManager();

/**
 * Performance-optimized navigation hook
 */
export const useOptimizedNavigation = () => {
  const navigationTimingRef = useRef(null);
  
  const navigate = useCallback((screenName, params = {}) => {
    // Use InteractionManager to ensure smooth animations
    InteractionManager.runAfterInteractions(() => {
      const navigationStart = navigationStackManager.trackNavigation(screenName, params);
      navigationTimingRef.current = navigationStart;
    });
  }, []);

  const completeNavigation = useCallback(() => {
    if (navigationTimingRef.current) {
      navigationStackManager.completeNavigation(navigationTimingRef.current);
      navigationTimingRef.current = null;
    }
  }, []);

  return {
    navigate,
    completeNavigation,
    getMetrics: navigationStackManager.getPerformanceMetrics.bind(navigationStackManager),
  };
};

/**
 * Memory-efficient screen component wrapper
 */
export const withNavigationPerformance = (WrappedComponent, screenName) => {
  return React.memo(React.forwardRef((props, ref) => {
    const renderStartTime = useRef(performance.now());
    const { completeNavigation } = useOptimizedNavigation();

    // Track component mount
    useEffect(() => {
      performanceMonitor.recordComponentMount(screenName, true);
      
      // Complete navigation timing
      completeNavigation();
      
      return () => {
        performanceMonitor.recordComponentMount(screenName, false);
      };
    }, [completeNavigation]);

    // Track render performance
    useEffect(() => {
      const renderTime = performance.now() - renderStartTime.current;
      performanceMonitor.recordRenderTime(screenName, renderStartTime.current, performance.now());
      
      if (renderTime > PERFORMANCE_CONFIG.MONITORING.RENDER_TIME_THRESHOLD) {
        console.warn(`⚠️ Slow render detected for ${screenName}: ${renderTime.toFixed(2)}ms`);
      }
    });

    return <WrappedComponent {...props} ref={ref} />;
  }));
};

/**
 * Navigation performance monitoring component
 */
export const NavigationPerformanceMonitor = React.memo(() => {
  const [metrics, setMetrics] = React.useState(null);
  const [isVisible, setIsVisible] = React.useState(__DEV__); // Only show in development

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const currentMetrics = navigationStackManager.getPerformanceMetrics();
      setMetrics(currentMetrics);
    }, PERFORMANCE_CONFIG.MONITORING.MEMORY_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible || !metrics) return null;

  return (
    <View style={styles.performanceMonitor}>
      <Text style={styles.performanceTitle}>Navigation Performance</Text>
      <Text style={styles.performanceText}>
        Avg: {metrics.averageNavigationTime.toFixed(1)}ms
      </Text>
      <Text style={styles.performanceText}>
        Score: {metrics.performanceScore}/100
      </Text>
      <Text style={styles.performanceText}>
        Stack: {metrics.stackSize}/{devicePerformanceTier.getMaxStackSize()}
      </Text>
    </View>
  );
});

/**
 * Adaptive animation configuration based on device performance
 */
export const getAdaptiveAnimationConfig = () => {
  const duration = devicePerformanceTier.getAnimationDuration();
  const shouldReduce = devicePerformanceTier.shouldReduceAnimations();

  return {
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration,
          useNativeDriver: true,
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: duration * 0.8, // Slightly faster close
          useNativeDriver: true,
        },
      },
    },
    cardStyleInterpolator: shouldReduce 
      ? ({ current }) => ({
          cardStyle: {
            opacity: current.progress,
          },
        })
      : undefined, // Use default slide animation for better devices
  };
};

// Styles
const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  performanceMonitor: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 9999,
  },
  performanceTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  performanceText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
};

export default {
  createLazyScreen,
  withNavigationPerformance,
  useOptimizedNavigation,
  getAdaptiveAnimationConfig,
  navigationStackManager,
  devicePerformanceTier,
  NavigationPerformanceMonitor,
};