/**
 * Responsive Performance Handler
 * Adapts navigation performance based on device capabilities and screen size
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Dimensions, PixelRatio, Platform } from 'react-native';
import { devicePerformanceTier } from './navigationPerformance';

/**
 * Screen size categories
 */
export const SCREEN_SIZES = {
  SMALL: 'small',     // < 5.5" phones
  MEDIUM: 'medium',   // 5.5" - 6.5" phones
  LARGE: 'large',     // > 6.5" phones, small tablets
  XLARGE: 'xlarge',   // Large tablets
};

/**
 * Performance budgets based on device and screen size
 */
const PERFORMANCE_BUDGETS = {
  [SCREEN_SIZES.SMALL]: {
    LOW_END: {
      animationDuration: 150,
      maxConcurrentAnimations: 1,
      reducedMotion: true,
      simplifiedTransitions: true,
      preloadLimit: 1,
    },
    MID_RANGE: {
      animationDuration: 200,
      maxConcurrentAnimations: 2,
      reducedMotion: false,
      simplifiedTransitions: false,
      preloadLimit: 2,
    },
    HIGH_END: {
      animationDuration: 250,
      maxConcurrentAnimations: 3,
      reducedMotion: false,
      simplifiedTransitions: false,
      preloadLimit: 3,
    },
  },
  [SCREEN_SIZES.MEDIUM]: {
    LOW_END: {
      animationDuration: 200,
      maxConcurrentAnimations: 1,
      reducedMotion: true,
      simplifiedTransitions: true,
      preloadLimit: 2,
    },
    MID_RANGE: {
      animationDuration: 250,
      maxConcurrentAnimations: 2,
      reducedMotion: false,
      simplifiedTransitions: false,
      preloadLimit: 3,
    },
    HIGH_END: {
      animationDuration: 300,
      maxConcurrentAnimations: 4,
      reducedMotion: false,
      simplifiedTransitions: false,
      preloadLimit: 4,
    },
  },
  [SCREEN_SIZES.LARGE]: {
    LOW_END: {
      animationDuration: 250,
      maxConcurrentAnimations: 2,
      reducedMotion: false,
      simplifiedTransitions: true,
      preloadLimit: 2,
    },
    MID_RANGE: {
      animationDuration: 300,
      maxConcurrentAnimations: 3,
      reducedMotion: false,
      simplifiedTransitions: false,
      preloadLimit: 4,
    },
    HIGH_END: {
      animationDuration: 350,
      maxConcurrentAnimations: 5,
      reducedMotion: false,
      simplifiedTransitions: false,
      preloadLimit: 5,
    },
  },
  [SCREEN_SIZES.XLARGE]: {
    LOW_END: {
      animationDuration: 300,
      maxConcurrentAnimations: 2,
      reducedMotion: false,
      simplifiedTransitions: false,
      preloadLimit: 3,
    },
    MID_RANGE: {
      animationDuration: 350,
      maxConcurrentAnimations: 4,
      reducedMotion: false,
      simplifiedTransitions: false,
      preloadLimit: 5,
    },
    HIGH_END: {
      animationDuration: 400,
      maxConcurrentAnimations: 6,
      reducedMotion: false,
      simplifiedTransitions: false,
      preloadLimit: 6,
    },
  },
};

/**
 * Responsive performance manager
 */
export class ResponsivePerformanceManager {
  constructor() {
    this.screenSize = null;
    this.deviceTier = null;
    this.performanceBudget = null;
    this.orientation = null;
    this.listeners = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize the performance manager
   */
  async initialize() {
    if (this.isInitialized) return;

    // Get device performance tier
    this.deviceTier = await devicePerformanceTier.initialize();
    
    // Get initial screen dimensions
    this.updateScreenInfo();
    
    // Listen for orientation changes
    this.dimensionsSubscription = Dimensions.addEventListener('change', ({ window }) => {
      this.updateScreenInfo(window);
      this.notifyListeners();
    });

    this.isInitialized = true;
    console.log(`📱 Responsive performance initialized: ${this.screenSize} ${this.deviceTier}`);
  }

  /**
   * Update screen size and orientation information
   */
  updateScreenInfo(dimensions = null) {
    const { width, height } = dimensions || Dimensions.get('window');
    const pixelRatio = PixelRatio.get();
    
    // Calculate physical screen size in inches (approximate)
    const physicalWidth = width / (pixelRatio * 160); // 160 DPI baseline
    const physicalHeight = height / (pixelRatio * 160);
    const diagonalInches = Math.sqrt(physicalWidth * physicalWidth + physicalHeight * physicalHeight);
    
    // Determine screen size category
    if (diagonalInches < 5.5) {
      this.screenSize = SCREEN_SIZES.SMALL;
    } else if (diagonalInches < 6.5) {
      this.screenSize = SCREEN_SIZES.MEDIUM;
    } else if (diagonalInches < 9) {
      this.screenSize = SCREEN_SIZES.LARGE;
    } else {
      this.screenSize = SCREEN_SIZES.XLARGE;
    }
    
    // Determine orientation
    this.orientation = width > height ? 'landscape' : 'portrait';
    
    // Update performance budget
    this.updatePerformanceBudget();
  }

  /**
   * Update performance budget based on current screen size and device tier
   */
  updatePerformanceBudget() {
    if (!this.screenSize || !this.deviceTier) return;
    
    const budget = PERFORMANCE_BUDGETS[this.screenSize]?.[this.deviceTier];
    if (budget) {
      this.performanceBudget = { ...budget };
      
      // Apply orientation-specific adjustments
      if (this.orientation === 'landscape') {
        // Slightly increase animation duration for landscape
        this.performanceBudget.animationDuration *= 1.1;
        // Increase preload limit for landscape (more screen real estate)
        this.performanceBudget.preloadLimit += 1;
      }
      
      console.log(`📊 Performance budget updated:`, this.performanceBudget);
    }
  }

  /**
   * Get current performance budget
   */
  getPerformanceBudget() {
    return this.performanceBudget || PERFORMANCE_BUDGETS[SCREEN_SIZES.MEDIUM].MID_RANGE;
  }

  /**
   * Get adaptive animation configuration
   */
  getAdaptiveAnimationConfig() {
    const budget = this.getPerformanceBudget();
    
    const baseConfig = {
      transitionSpec: {
        open: {
          animation: 'timing',
          config: {
            duration: budget.animationDuration,
            useNativeDriver: true,
          },
        },
        close: {
          animation: 'timing',
          config: {
            duration: budget.animationDuration * 0.8,
            useNativeDriver: true,
          },
        },
      },
    };

    // Apply simplified transitions for low-end devices or when reduced motion is enabled
    if (budget.simplifiedTransitions || budget.reducedMotion) {
      baseConfig.cardStyleInterpolator = ({ current }) => ({
        cardStyle: {
          opacity: current.progress,
        },
      });
    }

    return baseConfig;
  }

  /**
   * Get responsive layout configuration
   */
  getResponsiveLayoutConfig() {
    const budget = this.getPerformanceBudget();
    
    return {
      screenSize: this.screenSize,
      orientation: this.orientation,
      deviceTier: this.deviceTier,
      
      // Tab bar configuration
      tabBar: {
        height: this.screenSize === SCREEN_SIZES.SMALL ? 60 : 70,
        iconSize: this.screenSize === SCREEN_SIZES.SMALL ? 20 : 24,
        fontSize: this.screenSize === SCREEN_SIZES.SMALL ? 10 : 12,
        showLabels: this.screenSize !== SCREEN_SIZES.SMALL,
      },
      
      // Drawer configuration
      drawer: {
        width: this.screenSize === SCREEN_SIZES.SMALL ? '75%' : '80%',
        type: this.orientation === 'landscape' && this.screenSize === SCREEN_SIZES.XLARGE ? 'permanent' : 'slide',
      },
      
      // Performance settings
      performance: {
        ...budget,
        enableHaptics: this.deviceTier !== 'LOW_END',
        enableShadows: this.deviceTier === 'HIGH_END',
        enableBlur: this.deviceTier === 'HIGH_END' && this.screenSize !== SCREEN_SIZES.SMALL,
      },
    };
  }

  /**
   * Add listener for configuration changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of configuration changes
   */
  notifyListeners() {
    const config = this.getResponsiveLayoutConfig();
    this.listeners.forEach(callback => {
      try {
        callback(config);
      } catch (error) {
        console.error('Error in responsive performance listener:', error);
      }
    });
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.dimensionsSubscription) {
      this.dimensionsSubscription?.remove();
    }
    this.listeners.clear();
  }
}

// Global instance
export const responsivePerformanceManager = new ResponsivePerformanceManager();

/**
 * Hook for responsive performance configuration
 */
export const useResponsivePerformance = () => {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // Initialize if not already done
    if (!responsivePerformanceManager.isInitialized) {
      responsivePerformanceManager.initialize().then(() => {
        setConfig(responsivePerformanceManager.getResponsiveLayoutConfig());
      });
    } else {
      setConfig(responsivePerformanceManager.getResponsiveLayoutConfig());
    }

    // Listen for changes
    const removeListener = responsivePerformanceManager.addListener(setConfig);
    
    return removeListener;
  }, []);

  const getAnimationConfig = useCallback(() => {
    return responsivePerformanceManager.getAdaptiveAnimationConfig();
  }, []);

  const getPerformanceBudget = useCallback(() => {
    return responsivePerformanceManager.getPerformanceBudget();
  }, []);

  return {
    config,
    getAnimationConfig,
    getPerformanceBudget,
    isInitialized: responsivePerformanceManager.isInitialized,
  };
};

/**
 * Hook for adaptive screen size
 */
export const useAdaptiveScreenSize = () => {
  const { config } = useResponsivePerformance();
  
  const screenSize = config?.screenSize || SCREEN_SIZES.MEDIUM;
  const orientation = config?.orientation || 'portrait';
  const deviceTier = config?.deviceTier || 'MID_RANGE';

  const isSmallScreen = screenSize === SCREEN_SIZES.SMALL;
  const isLargeScreen = screenSize === SCREEN_SIZES.LARGE || screenSize === SCREEN_SIZES.XLARGE;
  const isLandscape = orientation === 'landscape';
  const isLowEndDevice = deviceTier === 'LOW_END';

  return {
    screenSize,
    orientation,
    deviceTier,
    isSmallScreen,
    isLargeScreen,
    isLandscape,
    isLowEndDevice,
    config,
  };
};

/**
 * Performance degradation handler
 */
export class PerformanceDegradationHandler {
  constructor() {
    this.performanceHistory = [];
    this.degradationLevel = 0; // 0 = no degradation, 3 = maximum degradation
    this.thresholds = {
      WARNING: 500,    // 500ms navigation time
      MODERATE: 1000,  // 1s navigation time
      SEVERE: 2000,    // 2s navigation time
    };
  }

  /**
   * Record a performance measurement
   */
  recordPerformance(navigationTime) {
    this.performanceHistory.push({
      time: navigationTime,
      timestamp: Date.now(),
    });

    // Keep only recent measurements
    if (this.performanceHistory.length > 20) {
      this.performanceHistory = this.performanceHistory.slice(-10);
    }

    // Update degradation level
    this.updateDegradationLevel();
  }

  /**
   * Update performance degradation level
   */
  updateDegradationLevel() {
    if (this.performanceHistory.length < 3) return;

    const recentTimes = this.performanceHistory.slice(-5).map(p => p.time);
    const averageTime = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;

    let newLevel = 0;
    if (averageTime > this.thresholds.SEVERE) {
      newLevel = 3;
    } else if (averageTime > this.thresholds.MODERATE) {
      newLevel = 2;
    } else if (averageTime > this.thresholds.WARNING) {
      newLevel = 1;
    }

    if (newLevel !== this.degradationLevel) {
      this.degradationLevel = newLevel;
      this.applyDegradation();
      console.log(`⚠️ Performance degradation level changed to: ${newLevel}`);
    }
  }

  /**
   * Apply performance degradation measures
   */
  applyDegradation() {
    const budget = responsivePerformanceManager.getPerformanceBudget();
    
    switch (this.degradationLevel) {
      case 1: // Warning level
        budget.animationDuration *= 0.8;
        budget.maxConcurrentAnimations = Math.max(1, budget.maxConcurrentAnimations - 1);
        break;
        
      case 2: // Moderate degradation
        budget.animationDuration *= 0.6;
        budget.maxConcurrentAnimations = 1;
        budget.simplifiedTransitions = true;
        budget.preloadLimit = Math.max(1, budget.preloadLimit - 1);
        break;
        
      case 3: // Severe degradation
        budget.animationDuration *= 0.4;
        budget.maxConcurrentAnimations = 1;
        budget.simplifiedTransitions = true;
        budget.reducedMotion = true;
        budget.preloadLimit = 1;
        break;
        
      default: // No degradation
        // Reset to original budget
        responsivePerformanceManager.updatePerformanceBudget();
        break;
    }
  }

  /**
   * Get current degradation level
   */
  getDegradationLevel() {
    return this.degradationLevel;
  }

  /**
   * Reset degradation
   */
  reset() {
    this.performanceHistory = [];
    this.degradationLevel = 0;
    responsivePerformanceManager.updatePerformanceBudget();
  }
}

// Global degradation handler
export const performanceDegradationHandler = new PerformanceDegradationHandler();

/**
 * Responsive navigation component wrapper
 */
export const withResponsivePerformance = (WrappedComponent, componentName) => {
  return React.memo(React.forwardRef((props, ref) => {
    const { config, getAnimationConfig } = useResponsivePerformance();
    const renderStartTime = useRef(performance.now());

    // Track render performance
    useEffect(() => {
      const renderTime = performance.now() - renderStartTime.current;
      performanceDegradationHandler.recordPerformance(renderTime);
    });

    // Don't render until configuration is ready
    if (!config) {
      return null; // Or a loading placeholder
    }

    return (
      <WrappedComponent 
        {...props} 
        ref={ref}
        responsiveConfig={config}
        animationConfig={getAnimationConfig()}
      />
    );
  }));
};

export default {
  ResponsivePerformanceManager,
  responsivePerformanceManager,
  useResponsivePerformance,
  useAdaptiveScreenSize,
  PerformanceDegradationHandler,
  performanceDegradationHandler,
  withResponsivePerformance,
  SCREEN_SIZES,
};