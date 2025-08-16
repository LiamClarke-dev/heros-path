/**
 * Performance monitoring utility for MapScreen refactoring validation
 * Measures rendering performance, memory usage, and component re-render frequency
 */

// React Native compatible performance API
const performance = {
  now: () => Date.now(),
};

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTimes: [],
      reRenderCounts: {},
      memoryUsage: [],
      componentMounts: {},
      hookExecutions: {},
    };
    this.isMonitoring = false;
    this.startTime = null;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    this.isMonitoring = true;
    this.startTime = performance.now();
    this.metrics = {
      renderTimes: [],
      reRenderCounts: {},
      memoryUsage: [],
      componentMounts: {},
      hookExecutions: {},
    };
    console.log('🔍 Performance monitoring started');
  }

  /**
   * Stop performance monitoring and return results
   */
  stopMonitoring() {
    this.isMonitoring = false;
    const totalTime = performance.now() - this.startTime;
    console.log('🔍 Performance monitoring stopped');
    return this.generateReport(totalTime);
  }

  /**
   * Record a component render time
   */
  recordRenderTime(componentName, startTime, endTime) {
    if (!this.isMonitoring) return;
    
    const renderTime = endTime - startTime;
    this.metrics.renderTimes.push({
      component: componentName,
      time: renderTime,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a component re-render
   */
  recordReRender(componentName) {
    if (!this.isMonitoring) return;
    
    if (!this.metrics.reRenderCounts[componentName]) {
      this.metrics.reRenderCounts[componentName] = 0;
    }
    this.metrics.reRenderCounts[componentName]++;
  }

  /**
   * Record memory usage (if available)
   */
  recordMemoryUsage() {
    if (!this.isMonitoring) return;
    
    // In React Native, we can't directly access memory usage
    // This is a placeholder for potential native module integration
    if (global.performance && global.performance.memory) {
      this.metrics.memoryUsage.push({
        used: global.performance.memory.usedJSHeapSize,
        total: global.performance.memory.totalJSHeapSize,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Record component mount/unmount
   */
  recordComponentMount(componentName, mounted = true) {
    if (!this.isMonitoring) return;
    
    if (!this.metrics.componentMounts[componentName]) {
      this.metrics.componentMounts[componentName] = { mounts: 0, unmounts: 0 };
    }
    
    if (mounted) {
      this.metrics.componentMounts[componentName].mounts++;
    } else {
      this.metrics.componentMounts[componentName].unmounts++;
    }
  }

  /**
   * Record hook execution
   */
  recordHookExecution(hookName, executionTime) {
    if (!this.isMonitoring) return;
    
    if (!this.metrics.hookExecutions[hookName]) {
      this.metrics.hookExecutions[hookName] = [];
    }
    this.metrics.hookExecutions[hookName].push({
      time: executionTime,
      timestamp: Date.now(),
    });
  }

  /**
   * Generate performance report
   */
  generateReport(totalTime) {
    const report = {
      totalMonitoringTime: totalTime,
      renderingPerformance: this.analyzeRenderTimes(),
      reRenderAnalysis: this.analyzeReRenders(),
      memoryAnalysis: this.analyzeMemoryUsage(),
      componentLifecycle: this.analyzeComponentLifecycle(),
      hookPerformance: this.analyzeHookPerformance(),
      optimizationGoals: this.checkOptimizationGoals(),
    };

    this.logReport(report);
    return report;
  }

  /**
   * Analyze render times
   */
  analyzeRenderTimes() {
    if (this.metrics.renderTimes.length === 0) {
      return { message: 'No render times recorded' };
    }

    const times = this.metrics.renderTimes.map(r => r.time);
    const componentGroups = this.metrics.renderTimes.reduce((acc, render) => {
      if (!acc[render.component]) acc[render.component] = [];
      acc[render.component].push(render.time);
      return acc;
    }, {});

    return {
      totalRenders: this.metrics.renderTimes.length,
      averageRenderTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxRenderTime: Math.max(...times),
      minRenderTime: Math.min(...times),
      componentBreakdown: Object.entries(componentGroups).map(([component, times]) => ({
        component,
        renders: times.length,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        maxTime: Math.max(...times),
      })),
    };
  }

  /**
   * Analyze re-render frequency
   */
  analyzeReRenders() {
    const totalReRenders = Object.values(this.metrics.reRenderCounts).reduce((a, b) => a + b, 0);
    const componentCount = Object.keys(this.metrics.reRenderCounts).length;

    return {
      totalReRenders,
      componentCount,
      averageReRendersPerComponent: componentCount > 0 ? totalReRenders / componentCount : 0,
      componentBreakdown: Object.entries(this.metrics.reRenderCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([component, count]) => ({ component, reRenders: count })),
    };
  }

  /**
   * Analyze memory usage
   */
  analyzeMemoryUsage() {
    if (this.metrics.memoryUsage.length === 0) {
      return { message: 'Memory usage data not available in React Native' };
    }

    const usedMemory = this.metrics.memoryUsage.map(m => m.used);
    return {
      samples: this.metrics.memoryUsage.length,
      averageUsed: usedMemory.reduce((a, b) => a + b, 0) / usedMemory.length,
      maxUsed: Math.max(...usedMemory),
      minUsed: Math.min(...usedMemory),
    };
  }

  /**
   * Analyze component lifecycle
   */
  analyzeComponentLifecycle() {
    return Object.entries(this.metrics.componentMounts).map(([component, counts]) => ({
      component,
      mounts: counts.mounts,
      unmounts: counts.unmounts,
      netMounted: counts.mounts - counts.unmounts,
    }));
  }

  /**
   * Analyze hook performance
   */
  analyzeHookPerformance() {
    return Object.entries(this.metrics.hookExecutions).map(([hook, executions]) => {
      const times = executions.map(e => e.time);
      return {
        hook,
        executions: executions.length,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        maxTime: Math.max(...times),
        totalTime: times.reduce((a, b) => a + b, 0),
      };
    });
  }

  /**
   * Check if optimization goals are met
   */
  checkOptimizationGoals() {
    const renderAnalysis = this.analyzeRenderTimes();
    const reRenderAnalysis = this.analyzeReRenders();

    const goals = {
      // Goal: Average render time under 16ms (60fps)
      renderTimeGoal: {
        target: 16,
        actual: renderAnalysis.averageRenderTime || 0,
        met: (renderAnalysis.averageRenderTime || 0) < 16,
      },
      // Goal: MapScreen component under 5 re-renders per minute
      mapScreenReRenderGoal: {
        target: 5,
        actual: this.metrics.reRenderCounts['MapScreen'] || 0,
        met: (this.metrics.reRenderCounts['MapScreen'] || 0) <= 5,
      },
      // Goal: No component should re-render more than 10 times
      excessiveReRenderGoal: {
        target: 10,
        violations: reRenderAnalysis.componentBreakdown.filter(c => c.reRenders > 10),
        met: reRenderAnalysis.componentBreakdown.every(c => c.reRenders <= 10),
      },
      // Goal: Hook executions should be efficient (under 5ms average)
      hookEfficiencyGoal: {
        target: 5,
        violations: this.analyzeHookPerformance().filter(h => h.averageTime > 5),
        met: this.analyzeHookPerformance().every(h => h.averageTime <= 5),
      },
    };

    return goals;
  }

  /**
   * Log performance report to console
   */
  logReport(report) {
    console.log('\n📊 PERFORMANCE REPORT');
    console.log('='.repeat(50));
    console.log(`Total monitoring time: ${report.totalMonitoringTime.toFixed(2)}ms`);
    
    console.log('\n🎨 RENDERING PERFORMANCE:');
    if (report.renderingPerformance.message) {
      console.log(`  ${report.renderingPerformance.message}`);
    } else {
      console.log(`  Total renders: ${report.renderingPerformance.totalRenders}`);
      console.log(`  Average render time: ${report.renderingPerformance.averageRenderTime.toFixed(2)}ms`);
      console.log(`  Max render time: ${report.renderingPerformance.maxRenderTime.toFixed(2)}ms`);
      console.log('  Component breakdown:');
      report.renderingPerformance.componentBreakdown.forEach(comp => {
        console.log(`    ${comp.component}: ${comp.renders} renders, ${comp.averageTime.toFixed(2)}ms avg`);
      });
    }

    console.log('\n🔄 RE-RENDER ANALYSIS:');
    console.log(`  Total re-renders: ${report.reRenderAnalysis.totalReRenders}`);
    console.log(`  Components monitored: ${report.reRenderAnalysis.componentCount}`);
    console.log(`  Average re-renders per component: ${report.reRenderAnalysis.averageReRendersPerComponent.toFixed(1)}`);
    console.log('  Component breakdown:');
    report.reRenderAnalysis.componentBreakdown.forEach(comp => {
      console.log(`    ${comp.component}: ${comp.reRenders} re-renders`);
    });

    console.log('\n🎯 OPTIMIZATION GOALS:');
    const goals = report.optimizationGoals;
    console.log(`  ✅ Render time goal (< ${goals.renderTimeGoal.target}ms): ${goals.renderTimeGoal.met ? 'MET' : 'NOT MET'} (${goals.renderTimeGoal.actual.toFixed(2)}ms)`);
    console.log(`  ✅ MapScreen re-render goal (≤ ${goals.mapScreenReRenderGoal.target}): ${goals.mapScreenReRenderGoal.met ? 'MET' : 'NOT MET'} (${goals.mapScreenReRenderGoal.actual})`);
    console.log(`  ✅ Excessive re-render goal (≤ ${goals.excessiveReRenderGoal.target}): ${goals.excessiveReRenderGoal.met ? 'MET' : 'NOT MET'}`);
    if (goals.excessiveReRenderGoal.violations.length > 0) {
      console.log('    Violations:');
      goals.excessiveReRenderGoal.violations.forEach(v => {
        console.log(`      ${v.component}: ${v.reRenders} re-renders`);
      });
    }
    console.log(`  ✅ Hook efficiency goal (< ${goals.hookEfficiencyGoal.target}ms): ${goals.hookEfficiencyGoal.met ? 'MET' : 'NOT MET'}`);
    if (goals.hookEfficiencyGoal.violations.length > 0) {
      console.log('    Violations:');
      goals.hookEfficiencyGoal.violations.forEach(v => {
        console.log(`      ${v.hook}: ${v.averageTime.toFixed(2)}ms avg`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

/**
 * React hook for monitoring component performance
 */
export const usePerformanceMonitor = (componentName) => {
  const React = require('react');
  
  // Track component mounts/unmounts
  React.useEffect(() => {
    performanceMonitor.recordComponentMount(componentName, true);
    return () => performanceMonitor.recordComponentMount(componentName, false);
  }, [componentName]);

  // Track re-renders
  React.useEffect(() => {
    performanceMonitor.recordReRender(componentName);
  });

  return {
    recordRenderTime: (startTime, endTime) => 
      performanceMonitor.recordRenderTime(componentName, startTime, endTime),
    recordHookExecution: (hookName, executionTime) =>
      performanceMonitor.recordHookExecution(hookName, executionTime),
  };
};

/**
 * Higher-order component for automatic performance monitoring
 */
export const withPerformanceMonitoring = (WrappedComponent, componentName) => {
  return React.forwardRef((props, ref) => {
    const startTime = performance.now();
    
    React.useEffect(() => {
      const endTime = performance.now();
      performanceMonitor.recordRenderTime(componentName, startTime, endTime);
    });

    usePerformanceMonitor(componentName);

    return React.createElement(WrappedComponent, { ...props, ref });
  });
};