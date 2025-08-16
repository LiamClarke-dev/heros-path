/**
 * Navigation Performance Integration
 * Integrates all performance optimization utilities for navigation
 */

import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { 
  devicePerformanceTier,
  navigationStackManager,
  NavigationPerformanceMonitor 
} from './navigationPerformance';
import { 
  responsivePerformanceManager,
  performanceDegradationHandler 
} from './responsivePerformanceHandler';
import { 
  navigationTimingTracker,
  navigationPerformanceAlerts 
} from './navigationTimingMonitor';
import { 
  performanceBudgetMonitor 
} from './performanceBudgetMonitor';
import { 
  navigationStateDebouncer,
  navigationHistoryManager 
} from './navigationStateOptimizer';

/**
 * Master performance coordinator
 */
export class NavigationPerformanceCoordinator {
  constructor() {
    this.isInitialized = false;
    this.appStateSubscription = null;
    this.performanceReport = null;
  }

  /**
   * Initialize all performance systems
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🚀 Initializing navigation performance systems...');

    try {
      // Initialize device performance tier
      await devicePerformanceTier.initialize();
      
      // Initialize responsive performance manager
      await responsivePerformanceManager.initialize();
      
      // Start performance monitoring
      performanceBudgetMonitor.startMonitoring();
      
      // Set up app state monitoring
      this.setupAppStateMonitoring();
      
      // Set up performance alerts
      this.setupPerformanceAlerts();
      
      this.isInitialized = true;
      console.log('✅ Navigation performance systems initialized');
      
      // Generate initial performance report
      this.generatePerformanceReport();
      
    } catch (error) {
      console.error('❌ Failed to initialize navigation performance systems:', error);
    }
  }

  /**
   * Set up app state monitoring for performance optimization
   */
  setupAppStateMonitoring() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        this.handleAppBackground();
      } else if (nextAppState === 'active') {
        this.handleAppForeground();
      }
    });
  }

  /**
   * Handle app going to background
   */
  handleAppBackground() {
    console.log('📱 App backgrounded - optimizing performance');
    
    // Flush pending navigation updates
    navigationStateDebouncer.flush();
    
    // Clear performance history to free memory
    performanceDegradationHandler.reset();
    
    // Stop intensive monitoring
    performanceBudgetMonitor.stopMonitoring();
    
    // Generate performance report
    this.generatePerformanceReport();
  }

  /**
   * Handle app coming to foreground
   */
  handleAppForeground() {
    console.log('📱 App foregrounded - resuming performance monitoring');
    
    // Resume performance monitoring
    performanceBudgetMonitor.startMonitoring();
    
    // Reset degradation handler
    performanceDegradationHandler.reset();
  }

  /**
   * Set up performance alerts
   */
  setupPerformanceAlerts() {
    // Listen for critical performance issues
    performanceBudgetMonitor.addListener((violation) => {
      if (violation.level === 'CRITICAL') {
        this.handleCriticalPerformanceIssue(violation);
      }
    });
    
    // Listen for navigation timing issues
    navigationTimingTracker.addListener((eventType, timing) => {
      if (timing.totalTime > 1000) { // More than 1 second
        console.warn(`🐌 Slow navigation detected: ${eventType} took ${timing.totalTime.toFixed(2)}ms`);
        this.handleSlowNavigation(eventType, timing);
      }
    });
  }

  /**
   * Handle critical performance issues
   */
  handleCriticalPerformanceIssue(violation) {
    console.error('🚨 Critical performance issue detected:', violation);
    
    // Apply emergency performance optimizations
    this.applyEmergencyOptimizations();
    
    // Log detailed performance state
    this.logPerformanceState();
  }

  /**
   * Handle slow navigation
   */
  handleSlowNavigation(eventType, timing) {
    // Record for degradation handler
    performanceDegradationHandler.recordPerformance(timing.totalTime);
    
    // Log timing breakdown
    console.log('⏱️ Navigation timing breakdown:', {
      eventType,
      totalTime: timing.totalTime,
      phases: timing.phases,
    });
  }

  /**
   * Apply emergency performance optimizations
   */
  applyEmergencyOptimizations() {
    console.log('🚨 Applying emergency performance optimizations');
    
    // Force maximum performance degradation
    performanceDegradationHandler.degradationLevel = 3;
    performanceDegradationHandler.applyDegradation();
    
    // Clear navigation history to free memory
    navigationHistoryManager.clear();
    
    // Clear performance metrics to free memory
    navigationStackManager.performanceMetrics = {
      navigationTimes: [],
      memoryUsage: [],
      stackSizes: [],
    };
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Log current performance state
   */
  logPerformanceState() {
    const state = {
      deviceTier: devicePerformanceTier.tier,
      screenSize: responsivePerformanceManager.screenSize,
      degradationLevel: performanceDegradationHandler.getDegradationLevel(),
      stackSize: navigationStackManager.stackHistory.length,
      historySize: navigationHistoryManager.getStats().totalEntries,
      performanceMetrics: navigationStackManager.getPerformanceMetrics(),
      budgetStats: performanceBudgetMonitor.getPerformanceStats(),
    };
    
    console.log('📊 Current performance state:', state);
    return state;
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      device: {
        tier: devicePerformanceTier.tier,
        capabilities: devicePerformanceTier.capabilities,
      },
      responsive: {
        screenSize: responsivePerformanceManager.screenSize,
        orientation: responsivePerformanceManager.orientation,
        performanceBudget: responsivePerformanceManager.getPerformanceBudget(),
      },
      navigation: {
        stackMetrics: navigationStackManager.getPerformanceMetrics(),
        historyStats: navigationHistoryManager.getStats(),
        degradationLevel: performanceDegradationHandler.getDegradationLevel(),
      },
      timing: {
        stats: navigationTimingTracker.getStats(),
        alerts: navigationPerformanceAlerts.getRecentAlerts(),
      },
      budget: performanceBudgetMonitor.exportReport(),
    };
    
    this.performanceReport = report;
    
    if (__DEV__) {
      console.log('📋 Performance report generated:', {
        overallScore: report.budget.summary.overallScore,
        totalViolations: report.budget.summary.totalViolations,
        degradationLevel: report.navigation.degradationLevel,
      });
    }
    
    return report;
  }

  /**
   * Get current performance report
   */
  getPerformanceReport() {
    return this.performanceReport || this.generatePerformanceReport();
  }

  /**
   * Optimize navigation for current conditions
   */
  optimizeForCurrentConditions() {
    const report = this.generatePerformanceReport();
    
    // Apply optimizations based on current performance
    if (report.budget.summary.overallScore < 70) {
      console.log('📈 Applying performance optimizations');
      
      // Increase degradation level
      const currentLevel = performanceDegradationHandler.getDegradationLevel();
      if (currentLevel < 2) {
        performanceDegradationHandler.degradationLevel = Math.min(3, currentLevel + 1);
        performanceDegradationHandler.applyDegradation();
      }
      
      // Clean up navigation history
      if (navigationHistoryManager.getStats().totalEntries > 20) {
        const entriesToRemove = navigationHistoryManager.history.length - 15;
        navigationHistoryManager.history.splice(0, entriesToRemove);
        navigationHistoryManager.currentIndex = Math.max(0, navigationHistoryManager.currentIndex - entriesToRemove);
      }
      
      // Clear old performance metrics
      navigationStackManager.performanceMetrics.navigationTimes = 
        navigationStackManager.performanceMetrics.navigationTimes.slice(-20);
    }
  }

  /**
   * Cleanup all performance systems
   */
  cleanup() {
    console.log('🧹 Cleaning up navigation performance systems');
    
    // Stop monitoring
    performanceBudgetMonitor.stopMonitoring();
    
    // Clear all data
    navigationHistoryManager.clear();
    navigationStateDebouncer.clear();
    performanceBudgetMonitor.clear();
    navigationTimingTracker.clearMetrics();
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    // Cleanup responsive manager
    responsivePerformanceManager.cleanup();
    
    this.isInitialized = false;
  }
}

// Global coordinator instance
export const navigationPerformanceCoordinator = new NavigationPerformanceCoordinator();

/**
 * Hook for navigation performance integration
 */
export const useNavigationPerformanceIntegration = () => {
  useEffect(() => {
    // Initialize performance systems
    navigationPerformanceCoordinator.initialize();
    
    // Set up periodic optimization
    const optimizationInterval = setInterval(() => {
      navigationPerformanceCoordinator.optimizeForCurrentConditions();
    }, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(optimizationInterval);
      navigationPerformanceCoordinator.cleanup();
    };
  }, []);

  return {
    getPerformanceReport: navigationPerformanceCoordinator.getPerformanceReport.bind(navigationPerformanceCoordinator),
    optimizeForCurrentConditions: navigationPerformanceCoordinator.optimizeForCurrentConditions.bind(navigationPerformanceCoordinator),
    logPerformanceState: navigationPerformanceCoordinator.logPerformanceState.bind(navigationPerformanceCoordinator),
  };
};

/**
 * Performance integration provider component
 */
export const NavigationPerformanceProvider = React.memo(({ children }) => {
  useNavigationPerformanceIntegration();
  
  return (
    <>
      {children}
      {__DEV__ && <NavigationPerformanceMonitor />}
    </>
  );
});

export default {
  NavigationPerformanceCoordinator,
  navigationPerformanceCoordinator,
  useNavigationPerformanceIntegration,
  NavigationPerformanceProvider,
};