/**
 * Performance Budget Monitor
 * Monitors and enforces performance budgets for navigation
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { responsivePerformanceManager, performanceDegradationHandler } from './responsivePerformanceHandler';
import { navigationTimingTracker } from './navigationTimingMonitor';

/**
 * Performance budget definitions
 */
export const PERFORMANCE_BUDGETS = {
  // Navigation timing budgets (in milliseconds)
  NAVIGATION: {
    TARGET: 200,      // Target navigation time
    WARNING: 500,     // Warning threshold
    CRITICAL: 1000,   // Critical threshold
  },
  
  // Screen load timing budgets
  SCREEN_LOAD: {
    TARGET: 500,      // Target screen load time
    WARNING: 1000,    // Warning threshold
    CRITICAL: 2000,   // Critical threshold
  },
  
  // Transition timing budgets
  TRANSITION: {
    TARGET: 300,      // Target transition time
    WARNING: 600,     // Warning threshold
    CRITICAL: 1000,   // Critical threshold
  },
  
  // Memory usage budgets (in MB)
  MEMORY: {
    TARGET: 50,       // Target memory usage
    WARNING: 100,     // Warning threshold
    CRITICAL: 200,    // Critical threshold
  },
  
  // Frame rate budgets (in FPS)
  FRAME_RATE: {
    TARGET: 60,       // Target frame rate
    WARNING: 45,      // Warning threshold
    CRITICAL: 30,     // Critical threshold
  },
};

/**
 * Performance budget monitor
 */
export class PerformanceBudgetMonitor {
  constructor() {
    this.budgets = { ...PERFORMANCE_BUDGETS };
    this.violations = [];
    this.metrics = {
      navigation: [],
      screenLoad: [],
      transition: [],
      memory: [],
      frameRate: [],
    };
    this.listeners = new Set();
    this.isMonitoring = false;
  }

  /**
   * Start monitoring performance budgets
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('📊 Performance budget monitoring started');
    
    // Listen to navigation timing events
    this.removeTimingListener = navigationTimingTracker.addListener((eventType, timing) => {
      this.checkBudget(eventType, timing.totalTime);
    });
    
    // Start periodic memory monitoring
    this.startMemoryMonitoring();
    
    // Start frame rate monitoring
    this.startFrameRateMonitoring();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('📊 Performance budget monitoring stopped');
    
    if (this.removeTimingListener) {
      this.removeTimingListener();
    }
    
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    
    if (this.frameRateInterval) {
      clearInterval(this.frameRateInterval);
    }
  }

  /**
   * Check if a measurement violates the budget
   */
  checkBudget(metricType, value) {
    const budget = this.getBudgetForMetric(metricType);
    if (!budget) return;

    // Record the metric
    this.recordMetric(metricType, value);

    // Check for violations
    let violationLevel = null;
    if (value > budget.CRITICAL) {
      violationLevel = 'CRITICAL';
    } else if (value > budget.WARNING) {
      violationLevel = 'WARNING';
    } else if (value > budget.TARGET) {
      violationLevel = 'TARGET_EXCEEDED';
    }

    if (violationLevel) {
      this.recordViolation(metricType, value, violationLevel, budget);
    }
  }

  /**
   * Get budget for a specific metric type
   */
  getBudgetForMetric(metricType) {
    const budgetMap = {
      navigation: this.budgets.NAVIGATION,
      screenLoad: this.budgets.SCREEN_LOAD,
      transition: this.budgets.TRANSITION,
      memory: this.budgets.MEMORY,
      frameRate: this.budgets.FRAME_RATE,
    };
    
    return budgetMap[metricType];
  }

  /**
   * Record a performance metric
   */
  recordMetric(metricType, value) {
    if (!this.metrics[metricType]) {
      this.metrics[metricType] = [];
    }

    this.metrics[metricType].push({
      value,
      timestamp: Date.now(),
    });

    // Keep only recent metrics
    if (this.metrics[metricType].length > 100) {
      this.metrics[metricType] = this.metrics[metricType].slice(-50);
    }
  }

  /**
   * Record a budget violation
   */
  recordViolation(metricType, value, level, budget) {
    const violation = {
      metricType,
      value,
      level,
      budget,
      timestamp: Date.now(),
      id: `${metricType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.violations.push(violation);

    // Keep only recent violations
    if (this.violations.length > 50) {
      this.violations = this.violations.slice(-25);
    }

    // Log the violation
    const emoji = level === 'CRITICAL' ? '🚨' : level === 'WARNING' ? '⚠️' : '📈';
    console.warn(`${emoji} Performance budget violation: ${metricType} = ${value.toFixed(2)}ms (${level})`);

    // Notify listeners
    this.notifyListeners(violation);

    // Trigger performance degradation if critical
    if (level === 'CRITICAL') {
      performanceDegradationHandler.recordPerformance(value);
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    // Note: React Native doesn't provide direct memory access
    // This is a placeholder for potential native module integration
    this.memoryInterval = setInterval(() => {
      // Simulate memory monitoring
      if (global.performance && global.performance.memory) {
        const memoryUsage = global.performance.memory.usedJSHeapSize / (1024 * 1024); // MB
        this.checkBudget('memory', memoryUsage);
      }
    }, 5000);
  }

  /**
   * Start frame rate monitoring
   */
  startFrameRateMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFrameRate = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) { // Every second
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        // Check against budget (lower is worse for FPS)
        const budget = this.budgets.FRAME_RATE;
        let violationLevel = null;
        
        if (fps < budget.CRITICAL) {
          violationLevel = 'CRITICAL';
        } else if (fps < budget.WARNING) {
          violationLevel = 'WARNING';
        } else if (fps < budget.TARGET) {
          violationLevel = 'TARGET_EXCEEDED';
        }

        this.recordMetric('frameRate', fps);
        
        if (violationLevel) {
          this.recordViolation('frameRate', fps, violationLevel, budget);
        }
      }
      
      if (this.isMonitoring) {
        requestAnimationFrame(measureFrameRate);
      }
    };

    requestAnimationFrame(measureFrameRate);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const stats = {};
    
    Object.keys(this.metrics).forEach(metricType => {
      const metrics = this.metrics[metricType];
      if (metrics.length > 0) {
        const values = metrics.map(m => m.value);
        const budget = this.getBudgetForMetric(metricType);
        
        stats[metricType] = {
          count: metrics.length,
          average: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          latest: values[values.length - 1],
          budget,
          violations: this.violations.filter(v => v.metricType === metricType).length,
          budgetCompliance: this.calculateBudgetCompliance(metricType, values, budget),
        };
      }
    });
    
    return stats;
  }

  /**
   * Calculate budget compliance percentage
   */
  calculateBudgetCompliance(metricType, values, budget) {
    if (!budget || values.length === 0) return 100;
    
    const targetValue = metricType === 'frameRate' ? budget.TARGET : budget.TARGET;
    let compliantCount = 0;
    
    values.forEach(value => {
      if (metricType === 'frameRate') {
        // For frame rate, higher is better
        if (value >= targetValue) compliantCount++;
      } else {
        // For timing metrics, lower is better
        if (value <= targetValue) compliantCount++;
      }
    });
    
    return Math.round((compliantCount / values.length) * 100);
  }

  /**
   * Get recent violations
   */
  getRecentViolations(limit = 10) {
    return this.violations.slice(-limit);
  }

  /**
   * Add listener for budget violations
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners of violations
   */
  notifyListeners(violation) {
    this.listeners.forEach(callback => {
      try {
        callback(violation);
      } catch (error) {
        console.error('Error in performance budget listener:', error);
      }
    });
  }

  /**
   * Update budget thresholds
   */
  updateBudgets(newBudgets) {
    this.budgets = { ...this.budgets, ...newBudgets };
    console.log('📊 Performance budgets updated:', this.budgets);
  }

  /**
   * Clear all metrics and violations
   */
  clear() {
    this.metrics = {
      navigation: [],
      screenLoad: [],
      transition: [],
      memory: [],
      frameRate: [],
    };
    this.violations = [];
  }

  /**
   * Export performance report
   */
  exportReport() {
    return {
      timestamp: new Date().toISOString(),
      budgets: this.budgets,
      stats: this.getPerformanceStats(),
      violations: this.violations,
      summary: this.generateSummary(),
    };
  }

  /**
   * Generate performance summary
   */
  generateSummary() {
    const stats = this.getPerformanceStats();
    const totalViolations = this.violations.length;
    const criticalViolations = this.violations.filter(v => v.level === 'CRITICAL').length;
    
    let overallScore = 100;
    Object.values(stats).forEach(stat => {
      if (stat.budgetCompliance < overallScore) {
        overallScore = stat.budgetCompliance;
      }
    });
    
    return {
      overallScore,
      totalViolations,
      criticalViolations,
      worstPerformingMetric: this.getWorstPerformingMetric(stats),
      recommendations: this.generateRecommendations(stats),
    };
  }

  /**
   * Get worst performing metric
   */
  getWorstPerformingMetric(stats) {
    let worstMetric = null;
    let lowestCompliance = 100;
    
    Object.entries(stats).forEach(([metricType, stat]) => {
      if (stat.budgetCompliance < lowestCompliance) {
        lowestCompliance = stat.budgetCompliance;
        worstMetric = metricType;
      }
    });
    
    return worstMetric;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    Object.entries(stats).forEach(([metricType, stat]) => {
      if (stat.budgetCompliance < 80) {
        switch (metricType) {
          case 'navigation':
            recommendations.push('Consider lazy loading screens and optimizing navigation state updates');
            break;
          case 'screenLoad':
            recommendations.push('Implement screen preloading and reduce initial render complexity');
            break;
          case 'transition':
            recommendations.push('Simplify animations and use native driver for transitions');
            break;
          case 'memory':
            recommendations.push('Implement memory cleanup and reduce navigation stack size');
            break;
          case 'frameRate':
            recommendations.push('Reduce animation complexity and optimize re-renders');
            break;
        }
      }
    });
    
    return recommendations;
  }
}

// Global monitor instance
export const performanceBudgetMonitor = new PerformanceBudgetMonitor();

/**
 * Hook for performance budget monitoring
 */
export const usePerformanceBudgetMonitor = () => {
  const [stats, setStats] = useState(null);
  const [violations, setViolations] = useState([]);

  useEffect(() => {
    // Start monitoring
    performanceBudgetMonitor.startMonitoring();

    // Update stats periodically
    const interval = setInterval(() => {
      setStats(performanceBudgetMonitor.getPerformanceStats());
      setViolations(performanceBudgetMonitor.getRecentViolations());
    }, 2000);

    // Listen for violations
    const removeListener = performanceBudgetMonitor.addListener((violation) => {
      setViolations(prev => [...prev.slice(-9), violation]);
    });

    return () => {
      clearInterval(interval);
      removeListener();
      performanceBudgetMonitor.stopMonitoring();
    };
  }, []);

  return {
    stats,
    violations,
    exportReport: performanceBudgetMonitor.exportReport.bind(performanceBudgetMonitor),
    updateBudgets: performanceBudgetMonitor.updateBudgets.bind(performanceBudgetMonitor),
  };
};

/**
 * Performance budget monitor component
 */
export const PerformanceBudgetMonitorComponent = React.memo(() => {
  const { stats, violations } = usePerformanceBudgetMonitor();
  const [isVisible, setIsVisible] = useState(__DEV__);

  if (!isVisible || !stats) return null;

  const getComplianceColor = (compliance) => {
    if (compliance >= 90) return '#4CAF50'; // Green
    if (compliance >= 70) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getViolationColor = (level) => {
    switch (level) {
      case 'CRITICAL': return '#F44336';
      case 'WARNING': return '#FF9800';
      case 'TARGET_EXCEEDED': return '#2196F3';
      default: return '#666666';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Budget</Text>
      
      {/* Overall compliance */}
      <View style={styles.overallSection}>
        <Text style={styles.overallLabel}>Overall:</Text>
        <Text style={[styles.overallValue, { 
          color: getComplianceColor(Math.min(...Object.values(stats).map(s => s.budgetCompliance))) 
        }]}>
          {Math.min(...Object.values(stats).map(s => s.budgetCompliance))}%
        </Text>
      </View>

      {/* Individual metrics */}
      {Object.entries(stats).map(([metricType, stat]) => (
        <View key={metricType} style={styles.metricRow}>
          <Text style={styles.metricLabel}>
            {metricType.charAt(0).toUpperCase() + metricType.slice(1)}:
          </Text>
          <Text style={[styles.metricValue, { color: getComplianceColor(stat.budgetCompliance) }]}>
            {stat.budgetCompliance}%
          </Text>
          {stat.violations > 0 && (
            <Text style={styles.violationCount}>({stat.violations})</Text>
          )}
        </View>
      ))}

      {/* Recent violations */}
      {violations.length > 0 && (
        <View style={styles.violationsSection}>
          <Text style={styles.violationsTitle}>Recent:</Text>
          {violations.slice(-3).map((violation, index) => (
            <Text key={index} style={[styles.violationItem, { 
              color: getViolationColor(violation.level) 
            }]}>
              {violation.metricType}: {violation.value.toFixed(0)}
              {violation.metricType === 'frameRate' ? 'fps' : 'ms'}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 250,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 8,
    borderRadius: 6,
    zIndex: 9996,
    minWidth: 140,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  overallSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  overallLabel: {
    color: '#CCCCCC',
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
  },
  overallValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricLabel: {
    color: '#CCCCCC',
    fontSize: 8,
    flex: 1,
  },
  metricValue: {
    fontSize: 9,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'right',
  },
  violationCount: {
    color: '#FF5722',
    fontSize: 7,
    marginLeft: 4,
  },
  violationsSection: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  violationsTitle: {
    color: '#CCCCCC',
    fontSize: 8,
    marginBottom: 2,
  },
  violationItem: {
    fontSize: 7,
    marginBottom: 1,
  },
});

export default {
  PerformanceBudgetMonitor,
  performanceBudgetMonitor,
  usePerformanceBudgetMonitor,
  PerformanceBudgetMonitorComponent,
  PERFORMANCE_BUDGETS,
};