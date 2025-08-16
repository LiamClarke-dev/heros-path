/**
 * Navigation Timing Monitor
 * Monitors and reports navigation performance metrics in real-time
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import performanceMonitor from './performanceMonitor';

/**
 * Navigation timing tracker
 */
export class NavigationTimingTracker {
  constructor() {
    this.timings = new Map();
    this.metrics = {
      navigationTimes: [],
      screenLoadTimes: [],
      transitionTimes: [],
      renderTimes: [],
    };
    this.listeners = new Set();
  }

  /**
   * Start timing a navigation event
   */
  startTiming(eventType, eventId) {
    const startTime = performance.now();
    this.timings.set(`${eventType}_${eventId}`, {
      type: eventType,
      id: eventId,
      startTime,
      phases: {},
    });
    
    console.log(`⏱️ Started timing ${eventType} (${eventId})`);
    return startTime;
  }

  /**
   * Mark a phase in the navigation timing
   */
  markPhase(eventType, eventId, phaseName) {
    const key = `${eventType}_${eventId}`;
    const timing = this.timings.get(key);
    
    if (timing) {
      timing.phases[phaseName] = performance.now() - timing.startTime;
      console.log(`📍 ${eventType} (${eventId}) - ${phaseName}: ${timing.phases[phaseName].toFixed(2)}ms`);
    }
  }

  /**
   * End timing and record metrics
   */
  endTiming(eventType, eventId) {
    const key = `${eventType}_${eventId}`;
    const timing = this.timings.get(key);
    
    if (timing) {
      const totalTime = performance.now() - timing.startTime;
      timing.totalTime = totalTime;
      timing.endTime = performance.now();
      
      // Store in appropriate metrics array
      switch (eventType) {
        case 'navigation':
          this.metrics.navigationTimes.push(timing);
          break;
        case 'screenLoad':
          this.metrics.screenLoadTimes.push(timing);
          break;
        case 'transition':
          this.metrics.transitionTimes.push(timing);
          break;
        case 'render':
          this.metrics.renderTimes.push(timing);
          break;
      }

      // Limit stored metrics to prevent memory issues
      Object.keys(this.metrics).forEach(key => {
        if (this.metrics[key].length > 100) {
          this.metrics[key] = this.metrics[key].slice(-50); // Keep last 50
        }
      });

      // Notify listeners
      this.notifyListeners(eventType, timing);
      
      // Clean up
      this.timings.delete(key);
      
      console.log(`✅ Completed ${eventType} (${eventId}) in ${totalTime.toFixed(2)}ms`);
      return timing;
    }
    
    return null;
  }

  /**
   * Add a listener for timing events
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of a timing event
   */
  notifyListeners(eventType, timing) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, timing);
      } catch (error) {
        console.error('Error in navigation timing listener:', error);
      }
    });
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const stats = {};
    
    Object.keys(this.metrics).forEach(key => {
      const timings = this.metrics[key];
      if (timings.length > 0) {
        const times = timings.map(t => t.totalTime);
        stats[key] = {
          count: timings.length,
          average: times.reduce((a, b) => a + b, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          recent: timings.slice(-10).map(t => ({
            id: t.id,
            time: t.totalTime,
            phases: t.phases,
          })),
        };
      } else {
        stats[key] = {
          count: 0,
          average: 0,
          min: 0,
          max: 0,
          recent: [],
        };
      }
    });
    
    return stats;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = {
      navigationTimes: [],
      screenLoadTimes: [],
      transitionTimes: [],
      renderTimes: [],
    };
    this.timings.clear();
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      stats: this.getStats(),
    };
  }
}

// Global timing tracker instance
export const navigationTimingTracker = new NavigationTimingTracker();

/**
 * Hook for tracking navigation timing
 */
export const useNavigationTiming = (screenName) => {
  const timingIdRef = useRef(null);
  const mountTimeRef = useRef(performance.now());

  // Start timing on mount
  useEffect(() => {
    const timingId = `${screenName}_${Date.now()}`;
    timingIdRef.current = timingId;
    
    navigationTimingTracker.startTiming('screenLoad', timingId);
    navigationTimingTracker.markPhase('screenLoad', timingId, 'componentMount');
    
    return () => {
      if (timingIdRef.current) {
        navigationTimingTracker.markPhase('screenLoad', timingIdRef.current, 'componentUnmount');
        navigationTimingTracker.endTiming('screenLoad', timingIdRef.current);
      }
    };
  }, [screenName]);

  // Mark render complete
  useEffect(() => {
    if (timingIdRef.current) {
      navigationTimingTracker.markPhase('screenLoad', timingIdRef.current, 'renderComplete');
    }
  });

  const markPhase = (phaseName) => {
    if (timingIdRef.current) {
      navigationTimingTracker.markPhase('screenLoad', timingIdRef.current, phaseName);
    }
  };

  const markDataLoaded = () => markPhase('dataLoaded');
  const markInteractive = () => markPhase('interactive');
  const markFullyLoaded = () => markPhase('fullyLoaded');

  return {
    markPhase,
    markDataLoaded,
    markInteractive,
    markFullyLoaded,
    timingId: timingIdRef.current,
  };
};

/**
 * Hook for tracking navigation transitions
 */
export const useNavigationTransitionTiming = () => {
  const activeTransitions = useRef(new Map());

  const startTransition = (fromScreen, toScreen) => {
    const transitionId = `${fromScreen}_to_${toScreen}_${Date.now()}`;
    navigationTimingTracker.startTiming('transition', transitionId);
    activeTransitions.current.set(transitionId, { fromScreen, toScreen });
    return transitionId;
  };

  const markTransitionPhase = (transitionId, phaseName) => {
    navigationTimingTracker.markPhase('transition', transitionId, phaseName);
  };

  const endTransition = (transitionId) => {
    navigationTimingTracker.endTiming('transition', transitionId);
    activeTransitions.current.delete(transitionId);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeTransitions.current.forEach((_, transitionId) => {
        navigationTimingTracker.endTiming('transition', transitionId);
      });
      activeTransitions.current.clear();
    };
  }, []);

  return {
    startTransition,
    markTransitionPhase,
    endTransition,
  };
};

/**
 * Real-time navigation performance monitor component
 */
export const NavigationTimingMonitor = React.memo(() => {
  const [stats, setStats] = useState(null);
  const [isVisible, setIsVisible] = useState(__DEV__);

  useEffect(() => {
    if (!isVisible) return;

    // Update stats every 2 seconds
    const interval = setInterval(() => {
      const currentStats = navigationTimingTracker.getStats();
      setStats(currentStats);
    }, 2000);

    // Listen for timing events for real-time updates
    const removeListener = navigationTimingTracker.addListener((eventType, timing) => {
      // Trigger immediate stats update for important events
      if (eventType === 'navigation' || eventType === 'screenLoad') {
        const currentStats = navigationTimingTracker.getStats();
        setStats(currentStats);
      }
    });

    return () => {
      clearInterval(interval);
      removeListener();
    };
  }, [isVisible]);

  if (!isVisible || !stats) return null;

  const getStatusColor = (average, threshold = 300) => {
    if (average < threshold * 0.5) return '#4CAF50'; // Green
    if (average < threshold) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigation Timing</Text>
      
      {/* Navigation Times */}
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>Nav:</Text>
        <Text style={[styles.metricValue, { color: getStatusColor(stats.navigationTimes.average) }]}>
          {stats.navigationTimes.average.toFixed(0)}ms
        </Text>
        <Text style={styles.metricCount}>({stats.navigationTimes.count})</Text>
      </View>

      {/* Screen Load Times */}
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>Load:</Text>
        <Text style={[styles.metricValue, { color: getStatusColor(stats.screenLoadTimes.average) }]}>
          {stats.screenLoadTimes.average.toFixed(0)}ms
        </Text>
        <Text style={styles.metricCount}>({stats.screenLoadTimes.count})</Text>
      </View>

      {/* Transition Times */}
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>Trans:</Text>
        <Text style={[styles.metricValue, { color: getStatusColor(stats.transitionTimes.average) }]}>
          {stats.transitionTimes.average.toFixed(0)}ms
        </Text>
        <Text style={styles.metricCount}>({stats.transitionTimes.count})</Text>
      </View>

      {/* Recent Performance */}
      {stats.navigationTimes.recent.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent:</Text>
          {stats.navigationTimes.recent.slice(-3).map((timing, index) => (
            <Text key={index} style={styles.recentItem}>
              {timing.id.split('_')[0]}: {timing.time.toFixed(0)}ms
            </Text>
          ))}
        </View>
      )}
    </View>
  );
});

/**
 * Navigation performance alert system
 */
export class NavigationPerformanceAlerts {
  constructor() {
    this.thresholds = {
      navigation: 500, // 500ms for navigation
      screenLoad: 1000, // 1s for screen load
      transition: 300, // 300ms for transitions
      render: 100, // 100ms for renders
    };
    this.alertHistory = [];
  }

  /**
   * Check if timing exceeds thresholds and create alerts
   */
  checkTiming(eventType, timing) {
    const threshold = this.thresholds[eventType];
    if (!threshold) return null;

    if (timing.totalTime > threshold) {
      const alert = {
        type: 'SLOW_NAVIGATION',
        eventType,
        timing: timing.totalTime,
        threshold,
        screen: timing.id,
        timestamp: Date.now(),
        phases: timing.phases,
      };

      this.alertHistory.push(alert);
      
      // Keep only recent alerts
      if (this.alertHistory.length > 50) {
        this.alertHistory = this.alertHistory.slice(-25);
      }

      console.warn(`🐌 Slow ${eventType} detected:`, alert);
      return alert;
    }

    return null;
  }

  /**
   * Get recent performance alerts
   */
  getRecentAlerts(limit = 10) {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Clear alert history
   */
  clearAlerts() {
    this.alertHistory = [];
  }
}

// Global alerts instance
export const navigationPerformanceAlerts = new NavigationPerformanceAlerts();

// Set up automatic alert checking
navigationTimingTracker.addListener((eventType, timing) => {
  navigationPerformanceAlerts.checkTiming(eventType, timing);
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 200,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 8,
    borderRadius: 6,
    zIndex: 9997,
    minWidth: 120,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricLabel: {
    color: '#CCCCCC',
    fontSize: 9,
    width: 30,
  },
  metricValue: {
    fontSize: 9,
    fontWeight: 'bold',
    width: 35,
    textAlign: 'right',
  },
  metricCount: {
    color: '#888888',
    fontSize: 8,
    marginLeft: 4,
  },
  recentSection: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  recentTitle: {
    color: '#CCCCCC',
    fontSize: 8,
    marginBottom: 2,
  },
  recentItem: {
    color: '#AAAAAA',
    fontSize: 7,
    marginBottom: 1,
  },
});

export default {
  NavigationTimingTracker,
  navigationTimingTracker,
  useNavigationTiming,
  useNavigationTransitionTiming,
  NavigationTimingMonitor,
  NavigationPerformanceAlerts,
  navigationPerformanceAlerts,
};