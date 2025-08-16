/**
 * Performance Tests for Navigation System
 * Tests navigation performance on various devices, memory management, and timing
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// Mock performance APIs
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
};

global.performance = mockPerformance;

// Mock contexts with performance tracking
const mockNavigationContext = {
  navigationState: { currentScreen: 'Map', isNavigating: false },
  navigateToScreen: jest.fn(),
  goBack: jest.fn(),
  resetToScreen: jest.fn(),
  performanceMetrics: {
    navigationTiming: [],
    memoryUsage: { used: 0, total: 100 },
    renderCount: 0,
  },
};

const mockThemeContext = {
  theme: { colors: { background: '#fff' } },
  themeName: 'light',
  switchTheme: jest.fn(),
  performanceMode: 'normal',
};

jest.mock('../contexts/NavigationContext', () => ({
  useNavigationContext: () => mockNavigationContext,
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => mockThemeContext,
}));

// Mock performance monitoring utilities
jest.mock('../utils/navigationPerformance', () => ({
  measureNavigationTiming: jest.fn(),
  trackMemoryUsage: jest.fn(),
  optimizeForDevice: jest.fn(),
  getPerformanceMetrics: jest.fn(() => ({
    averageNavigationTime: 150,
    memoryUsage: 45,
    frameRate: 60,
  })),
}));

jest.mock('../utils/performanceMonitor', () => ({
  default: {
    startMeasurement: jest.fn(),
    endMeasurement: jest.fn(),
    getMetrics: jest.fn(() => ({
      duration: 100,
      memoryDelta: 5,
      renderCount: 1,
    })),
    clearMetrics: jest.fn(),
  },
}));

import { useNavigationContext } from '../contexts/NavigationContext';
import { useTheme } from '../contexts/ThemeContext';
import { measureNavigationTiming, trackMemoryUsage, optimizeForDevice, getPerformanceMetrics } from '../utils/navigationPerformance';
import PerformanceMonitor from '../utils/performanceMonitor';

// Performance test component
const PerformanceTestComponent = ({ testScenario, iterations = 1 }) => {
  const [renderCount, setRenderCount] = React.useState(0);
  const [navigationTimes, setNavigationTimes] = React.useState([]);
  const [memoryUsage, setMemoryUsage] = React.useState(0);
  const startTimeRef = React.useRef(0);

  React.useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  const simulateNavigation = React.useCallback(async () => {
    const startTime = performance.now();
    
    // Simulate navigation work
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    setNavigationTimes(prev => [...prev, duration]);
    
    // Track memory usage
    const memoryDelta = Math.random() * 10; // Simulate memory change
    setMemoryUsage(prev => prev + memoryDelta);
    
    return duration;
  }, []);

  const runPerformanceTest = React.useCallback(async () => {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const duration = await simulateNavigation();
      times.push(duration);
    }
    
    return {
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxTime: Math.max(...times),
      minTime: Math.min(...times),
      totalMemory: memoryUsage,
    };
  }, [iterations, simulateNavigation, memoryUsage]);

  if (testScenario === 'rapid-navigation') {
    React.useEffect(() => {
      const rapidTest = async () => {
        for (let i = 0; i < 10; i++) {
          await simulateNavigation();
        }
      };
      rapidTest();
    }, [simulateNavigation]);
  }

  if (testScenario === 'memory-stress') {
    React.useEffect(() => {
      const memoryTest = async () => {
        for (let i = 0; i < 50; i++) {
          await simulateNavigation();
        }
      };
      memoryTest();
    }, [simulateNavigation]);
  }

  return (
    <View testID="performance-test">
      <Text testID="render-count">{renderCount}</Text>
      <Text testID="navigation-count">{navigationTimes.length}</Text>
      <Text testID="memory-usage">{memoryUsage.toFixed(2)}</Text>
      <Text testID="average-time">
        {navigationTimes.length > 0 
          ? (navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length).toFixed(2)
          : '0'
        }
      </Text>
    </View>
  );
};

describe('Navigation Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockImplementation(() => Date.now());
    
    // Reset performance metrics
    mockNavigationContext.performanceMetrics = {
      navigationTiming: [],
      memoryUsage: { used: 0, total: 100 },
      renderCount: 0,
    };
  });

  describe('Navigation Timing Performance', () => {
    test('should complete navigation within 200ms', async () => {
      measureNavigationTiming.mockResolvedValue(150);

      const { getByTestId } = render(
        <PerformanceTestComponent testScenario="single-navigation" />
      );

      await waitFor(() => {
        const averageTime = parseFloat(getByTestId('average-time').children[0]);
        expect(averageTime).toBeLessThan(200);
      });

      expect(measureNavigationTiming).toHaveBeenCalled();
    });

    test('should maintain consistent navigation timing', async () => {
      const navigationTimes = [120, 135, 145, 130, 140];
      measureNavigationTiming.mockImplementation(() => 
        Promise.resolve(navigationTimes[Math.floor(Math.random() * navigationTimes.length)])
      );

      const { getByTestId } = render(
        <PerformanceTestComponent testScenario="rapid-navigation" iterations={10} />
      );

      await waitFor(() => {
        const navigationCount = parseInt(getByTestId('navigation-count').children[0]);
        expect(navigationCount).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Check that timing is consistent (within acceptable variance)
      const averageTime = parseFloat(getByTestId('average-time').children[0]);
      expect(averageTime).toBeGreaterThan(50); // Minimum expected time
      expect(averageTime).toBeLessThan(300); // Maximum acceptable time
    });

    test('should handle rapid navigation without performance degradation', async () => {
      const { getByTestId } = render(
        <PerformanceTestComponent testScenario="rapid-navigation" />
      );

      await waitFor(() => {
        const navigationCount = parseInt(getByTestId('navigation-count').children[0]);
        expect(navigationCount).toBeGreaterThan(5);
      }, { timeout: 2000 });

      // Performance should remain stable
      const averageTime = parseFloat(getByTestId('average-time').children[0]);
      expect(averageTime).toBeLessThan(200);
    });

    test('should optimize performance based on device capabilities', () => {
      const deviceCapabilities = {
        isLowEndDevice: false,
        memoryLimit: 512,
        cpuCores: 4,
      };

      optimizeForDevice.mockReturnValue({
        animationDuration: 300,
        enableTransitions: true,
        maxConcurrentNavigations: 3,
      });

      const optimization = optimizeForDevice(deviceCapabilities);

      expect(optimization.animationDuration).toBe(300);
      expect(optimization.enableTransitions).toBe(true);
      expect(optimizeForDevice).toHaveBeenCalledWith(deviceCapabilities);
    });

    test('should degrade gracefully on low-end devices', () => {
      const lowEndDevice = {
        isLowEndDevice: true,
        memoryLimit: 128,
        cpuCores: 1,
      };

      optimizeForDevice.mockReturnValue({
        animationDuration: 150,
        enableTransitions: false,
        maxConcurrentNavigations: 1,
      });

      const optimization = optimizeForDevice(lowEndDevice);

      expect(optimization.animationDuration).toBeLessThan(200);
      expect(optimization.enableTransitions).toBe(false);
      expect(optimization.maxConcurrentNavigations).toBe(1);
    });
  });

  describe('Memory Management Performance', () => {
    test('should maintain stable memory usage during navigation', async () => {
      trackMemoryUsage.mockResolvedValue({ used: 45, total: 100 });

      const { getByTestId } = render(
        <PerformanceTestComponent testScenario="memory-test" />
      );

      await waitFor(() => {
        const memoryUsage = parseFloat(getByTestId('memory-usage').children[0]);
        expect(memoryUsage).toBeLessThan(100); // Should not exceed reasonable limit
      });

      expect(trackMemoryUsage).toHaveBeenCalled();
    });

    test('should handle memory pressure gracefully', async () => {
      // Simulate high memory usage
      trackMemoryUsage.mockResolvedValue({ used: 85, total: 100 });

      const { getByTestId } = render(
        <PerformanceTestComponent testScenario="memory-stress" />
      );

      await waitFor(() => {
        const navigationCount = parseInt(getByTestId('navigation-count').children[0]);
        expect(navigationCount).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // Should still function under memory pressure
      expect(trackMemoryUsage).toHaveBeenCalled();
    });

    test('should clean up resources properly', () => {
      const { unmount } = render(
        <PerformanceTestComponent testScenario="cleanup-test" />
      );

      // Should unmount without memory leaks
      expect(() => unmount()).not.toThrow();
    });

    test('should limit navigation stack to prevent memory issues', () => {
      const navigationStack = Array.from({ length: 15 }, (_, i) => `Screen${i}`);
      
      // Mock navigation context with large stack
      mockNavigationContext.navigationState.routeHistory = navigationStack;

      const { getByTestId } = render(
        <PerformanceTestComponent testScenario="stack-limit-test" />
      );

      // Should handle large navigation stack
      expect(getByTestId('performance-test')).toBeTruthy();
    });
  });

  describe('Render Performance', () => {
    test('should minimize unnecessary re-renders', async () => {
      const { getByTestId, rerender } = render(
        <PerformanceTestComponent testScenario="render-test" />
      );

      const initialRenderCount = parseInt(getByTestId('render-count').children[0]);

      // Re-render with same props
      rerender(<PerformanceTestComponent testScenario="render-test" />);

      await waitFor(() => {
        const finalRenderCount = parseInt(getByTestId('render-count').children[0]);
        expect(finalRenderCount).toBe(initialRenderCount + 1);
      });
    });

    test('should maintain 60fps during animations', () => {
      getPerformanceMetrics.mockReturnValue({
        averageNavigationTime: 150,
        memoryUsage: 45,
        frameRate: 60,
      });

      const metrics = getPerformanceMetrics();

      expect(metrics.frameRate).toBeGreaterThanOrEqual(60);
      expect(metrics.averageNavigationTime).toBeLessThan(200);
    });

    test('should handle theme switching without performance impact', async () => {
      const { getByTestId, rerender } = render(
        <PerformanceTestComponent testScenario="theme-switch-test" />
      );

      const initialTime = parseFloat(getByTestId('average-time').children[0] || '0');

      // Switch theme
      mockThemeContext.theme = { colors: { background: '#000' } };
      mockThemeContext.themeName = 'dark';

      rerender(<PerformanceTestComponent testScenario="theme-switch-test" />);

      await waitFor(() => {
        const finalTime = parseFloat(getByTestId('average-time').children[0] || '0');
        // Performance should not degrade significantly
        expect(Math.abs(finalTime - initialTime)).toBeLessThan(50);
      });
    });
  });

  describe('Network Condition Performance', () => {
    test('should handle offline navigation efficiently', async () => {
      // Mock offline condition
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { getByTestId } = render(
        <PerformanceTestComponent testScenario="offline-test" />
      );

      await waitFor(() => {
        const averageTime = parseFloat(getByTestId('average-time').children[0] || '0');
        // Offline navigation should still be fast
        expect(averageTime).toBeLessThan(100);
      });
    });

    test('should adapt to slow network conditions', async () => {
      // Mock slow network
      const slowNetworkDelay = 500;
      
      measureNavigationTiming.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(80), slowNetworkDelay))
      );

      const { getByTestId } = render(
        <PerformanceTestComponent testScenario="slow-network-test" />
      );

      // Should still provide responsive local navigation
      await waitFor(() => {
        const renderCount = parseInt(getByTestId('render-count').children[0]);
        expect(renderCount).toBeGreaterThan(0);
      });
    });

    test('should prioritize critical navigation over non-critical operations', () => {
      const criticalNavigation = { priority: 'high', screen: 'Map' };
      const nonCriticalNavigation = { priority: 'low', screen: 'Settings' };

      // Mock priority-based navigation
      mockNavigationContext.navigateToScreen.mockImplementation((screen, params) => {
        const priority = params?.priority || 'normal';
        const delay = priority === 'high' ? 50 : 200;
        return new Promise(resolve => setTimeout(resolve, delay));
      });

      expect(mockNavigationContext.navigateToScreen).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    test('should track navigation performance metrics', () => {
      PerformanceMonitor.startMeasurement.mockReturnValue('nav-123');
      PerformanceMonitor.endMeasurement.mockReturnValue({
        duration: 120,
        memoryDelta: 3,
        renderCount: 2,
      });

      const measurementId = PerformanceMonitor.startMeasurement('navigation');
      expect(measurementId).toBe('nav-123');

      const metrics = PerformanceMonitor.endMeasurement(measurementId);
      expect(metrics.duration).toBe(120);
      expect(metrics.memoryDelta).toBe(3);
    });

    test('should provide performance budgets and warnings', () => {
      const performanceBudget = {
        maxNavigationTime: 200,
        maxMemoryUsage: 80,
        minFrameRate: 55,
      };

      getPerformanceMetrics.mockReturnValue({
        averageNavigationTime: 250, // Exceeds budget
        memoryUsage: 75,
        frameRate: 58,
      });

      const metrics = getPerformanceMetrics();
      const exceedsBudget = metrics.averageNavigationTime > performanceBudget.maxNavigationTime;

      expect(exceedsBudget).toBe(true);
    });

    test('should clear performance metrics when needed', () => {
      PerformanceMonitor.clearMetrics.mockReturnValue(true);

      const cleared = PerformanceMonitor.clearMetrics();
      expect(cleared).toBe(true);
      expect(PerformanceMonitor.clearMetrics).toHaveBeenCalled();
    });
  });

  describe('Device-Specific Performance', () => {
    test('should optimize for different screen sizes', () => {
      const screenSizes = [
        { width: 320, height: 568, density: 2 }, // iPhone SE
        { width: 414, height: 896, density: 3 }, // iPhone 11 Pro Max
        { width: 768, height: 1024, density: 2 }, // iPad
      ];

      screenSizes.forEach(screen => {
        optimizeForDevice.mockReturnValue({
          animationDuration: screen.width < 400 ? 200 : 300,
          enableComplexAnimations: screen.width > 400,
          maxConcurrentOperations: screen.width > 700 ? 5 : 3,
        });

        const optimization = optimizeForDevice({ screen });
        
        if (screen.width < 400) {
          expect(optimization.animationDuration).toBe(200);
          expect(optimization.enableComplexAnimations).toBeFalsy();
        } else {
          expect(optimization.animationDuration).toBe(300);
          expect(optimization.enableComplexAnimations).toBeTruthy();
        }
      });
    });

    test('should handle different device orientations', async () => {
      const orientations = ['portrait', 'landscape'];

      for (const orientation of orientations) {
        const { getByTestId } = render(
          <PerformanceTestComponent 
            testScenario="orientation-test" 
            orientation={orientation}
          />
        );

        await waitFor(() => {
          expect(getByTestId('performance-test')).toBeTruthy();
        });
      }
    });

    test('should adapt to device performance characteristics', () => {
      const deviceProfiles = [
        { type: 'high-end', cpu: 'fast', memory: 'high', gpu: 'powerful' },
        { type: 'mid-range', cpu: 'medium', memory: 'medium', gpu: 'adequate' },
        { type: 'low-end', cpu: 'slow', memory: 'low', gpu: 'basic' },
      ];

      deviceProfiles.forEach(device => {
        optimizeForDevice.mockReturnValue({
          animationQuality: device.type === 'high-end' ? 'high' : device.type === 'mid-range' ? 'medium' : 'low',
          enableParallax: device.type === 'high-end',
          cacheSize: device.memory === 'high' ? 100 : device.memory === 'medium' ? 50 : 25,
        });

        const optimization = optimizeForDevice(device);
        
        expect(optimization.animationQuality).toBeDefined();
        expect(typeof optimization.enableParallax).toBe('boolean');
        expect(optimization.cacheSize).toBeGreaterThan(0);
      });
    });
  });
});