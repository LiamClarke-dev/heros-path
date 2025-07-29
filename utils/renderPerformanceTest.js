/**
 * Runtime performance testing utility for MapScreen
 * Tests component re-render frequency and performance during typical usage
 */

import React, { useEffect, useRef, useState } from 'react';
import performanceMonitor from './performanceMonitor';

/**
 * Performance test scenarios for MapScreen
 */
export const PERFORMANCE_TEST_SCENARIOS = {
  INITIAL_LOAD: 'initial_load',
  LOCATION_UPDATES: 'location_updates', 
  JOURNEY_TRACKING: 'journey_tracking',
  SAVED_PLACES_TOGGLE: 'saved_places_toggle',
  MAP_STYLE_CHANGE: 'map_style_change',
  PERMISSION_HANDLING: 'permission_handling',
};

/**
 * Performance test runner component
 */
export const PerformanceTestRunner = ({ children, testScenario, onTestComplete }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const testStartTime = useRef(null);
  const renderCount = useRef(0);
  const lastRenderTime = useRef(null);

  // Track renders
  useEffect(() => {
    renderCount.current++;
    const now = performance.now();
    
    if (lastRenderTime.current) {
      const timeSinceLastRender = now - lastRenderTime.current;
      performanceMonitor.recordRenderTime('PerformanceTestRunner', lastRenderTime.current, now);
    }
    
    lastRenderTime.current = now;
  });

  // Start test
  const startTest = () => {
    console.log(`🧪 Starting performance test: ${testScenario}`);
    setIsRunning(true);
    testStartTime.current = performance.now();
    renderCount.current = 0;
    performanceMonitor.startMonitoring();
  };

  // Stop test
  const stopTest = () => {
    if (!isRunning) return;
    
    const testDuration = performance.now() - testStartTime.current;
    const results = performanceMonitor.stopMonitoring();
    
    const testResults = {
      scenario: testScenario,
      duration: testDuration,
      renderCount: renderCount.current,
      averageRenderTime: testDuration / renderCount.current,
      performanceReport: results,
    };
    
    setTestResults(testResults);
    setIsRunning(false);
    
    console.log(`✅ Test completed: ${testScenario}`);
    console.log(`   Duration: ${testDuration.toFixed(2)}ms`);
    console.log(`   Renders: ${renderCount.current}`);
    console.log(`   Avg render time: ${(testDuration / renderCount.current).toFixed(2)}ms`);
    
    if (onTestComplete) {
      onTestComplete(testResults);
    }
  };

  // Auto-stop test after 10 seconds
  useEffect(() => {
    if (isRunning) {
      const timeout = setTimeout(stopTest, 10000);
      return () => clearTimeout(timeout);
    }
  }, [isRunning]);

  return (
    <>
      {children}
      {!isRunning && !testResults && (
        <TestControlPanel onStartTest={startTest} scenario={testScenario} />
      )}
      {isRunning && (
        <TestRunningIndicator scenario={testScenario} onStopTest={stopTest} />
      )}
      {testResults && (
        <TestResultsDisplay results={testResults} onReset={() => setTestResults(null)} />
      )}
    </>
  );
};

/**
 * Test control panel component
 */
const TestControlPanel = ({ onStartTest, scenario }) => (
  <div style={styles.testPanel}>
    <h3>Performance Test: {scenario}</h3>
    <button onClick={onStartTest} style={styles.button}>
      Start Test
    </button>
  </div>
);

/**
 * Test running indicator
 */
const TestRunningIndicator = ({ scenario, onStopTest }) => (
  <div style={styles.testPanel}>
    <h3>🧪 Running Test: {scenario}</h3>
    <p>Monitoring performance... Test will auto-stop in 10 seconds.</p>
    <button onClick={onStopTest} style={styles.button}>
      Stop Test Now
    </button>
  </div>
);

/**
 * Test results display
 */
const TestResultsDisplay = ({ results, onReset }) => (
  <div style={styles.testPanel}>
    <h3>📊 Test Results: {results.scenario}</h3>
    <div style={styles.results}>
      <p><strong>Duration:</strong> {results.duration.toFixed(2)}ms</p>
      <p><strong>Total Renders:</strong> {results.renderCount}</p>
      <p><strong>Average Render Time:</strong> {results.averageRenderTime.toFixed(2)}ms</p>
      
      <h4>Performance Goals:</h4>
      <ul>
        <li style={{ color: results.averageRenderTime < 16 ? 'green' : 'red' }}>
          ✓ Render time &lt; 16ms: {results.averageRenderTime < 16 ? 'PASS' : 'FAIL'}
        </li>
        <li style={{ color: results.renderCount < 50 ? 'green' : 'red' }}>
          ✓ Render count &lt; 50: {results.renderCount < 50 ? 'PASS' : 'FAIL'}
        </li>
      </ul>
      
      {results.performanceReport.optimizationGoals && (
        <>
          <h4>Optimization Goals:</h4>
          <ul>
            <li style={{ color: results.performanceReport.optimizationGoals.renderTimeGoal.met ? 'green' : 'red' }}>
              Render Time Goal: {results.performanceReport.optimizationGoals.renderTimeGoal.met ? 'MET' : 'NOT MET'}
            </li>
            <li style={{ color: results.performanceReport.optimizationGoals.mapScreenReRenderGoal.met ? 'green' : 'red' }}>
              MapScreen Re-render Goal: {results.performanceReport.optimizationGoals.mapScreenReRenderGoal.met ? 'MET' : 'NOT MET'}
            </li>
          </ul>
        </>
      )}
    </div>
    
    <button onClick={onReset} style={styles.button}>
      Run Another Test
    </button>
  </div>
);

/**
 * Automated performance test suite
 */
export class AutomatedPerformanceTest {
  constructor() {
    this.results = [];
    this.currentTest = null;
  }

  /**
   * Run all performance test scenarios
   */
  async runAllTests() {
    console.log('🚀 Starting automated performance test suite');
    
    const scenarios = Object.values(PERFORMANCE_TEST_SCENARIOS);
    
    for (const scenario of scenarios) {
      await this.runScenarioTest(scenario);
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return this.generateTestReport();
  }

  /**
   * Run a specific scenario test
   */
  async runScenarioTest(scenario) {
    return new Promise((resolve) => {
      console.log(`🧪 Testing scenario: ${scenario}`);
      
      performanceMonitor.startMonitoring();
      const startTime = performance.now();
      
      // Simulate scenario-specific actions
      this.simulateScenario(scenario);
      
      // Run test for 5 seconds
      setTimeout(() => {
        const endTime = performance.now();
        const results = performanceMonitor.stopMonitoring();
        
        const testResult = {
          scenario,
          duration: endTime - startTime,
          performanceReport: results,
          timestamp: new Date().toISOString(),
        };
        
        this.results.push(testResult);
        console.log(`✅ Completed scenario: ${scenario}`);
        resolve(testResult);
      }, 5000);
    });
  }

  /**
   * Simulate different usage scenarios
   */
  simulateScenario(scenario) {
    switch (scenario) {
      case PERFORMANCE_TEST_SCENARIOS.INITIAL_LOAD:
        // Simulate initial component mounting
        this.simulateInitialLoad();
        break;
        
      case PERFORMANCE_TEST_SCENARIOS.LOCATION_UPDATES:
        // Simulate frequent location updates
        this.simulateLocationUpdates();
        break;
        
      case PERFORMANCE_TEST_SCENARIOS.JOURNEY_TRACKING:
        // Simulate journey start/stop
        this.simulateJourneyTracking();
        break;
        
      case PERFORMANCE_TEST_SCENARIOS.SAVED_PLACES_TOGGLE:
        // Simulate toggling saved places visibility
        this.simulateSavedPlacesToggle();
        break;
        
      case PERFORMANCE_TEST_SCENARIOS.MAP_STYLE_CHANGE:
        // Simulate map style changes
        this.simulateMapStyleChange();
        break;
        
      case PERFORMANCE_TEST_SCENARIOS.PERMISSION_HANDLING:
        // Simulate permission requests
        this.simulatePermissionHandling();
        break;
    }
  }

  simulateInitialLoad() {
    // Record component mounts
    performanceMonitor.recordComponentMount('MapScreen', true);
    performanceMonitor.recordComponentMount('MapRenderer', true);
    performanceMonitor.recordComponentMount('MapControls', true);
    performanceMonitor.recordComponentMount('MapStatusDisplays', true);
  }

  simulateLocationUpdates() {
    // Simulate location updates every 100ms
    let updateCount = 0;
    const interval = setInterval(() => {
      performanceMonitor.recordReRender('MapRenderer');
      performanceMonitor.recordReRender('SpriteOverlay');
      updateCount++;
      
      if (updateCount >= 40) { // 4 seconds of updates
        clearInterval(interval);
      }
    }, 100);
  }

  simulateJourneyTracking() {
    // Simulate journey start
    setTimeout(() => {
      performanceMonitor.recordReRender('MapScreen');
      performanceMonitor.recordReRender('TrackingButton');
      performanceMonitor.recordReRender('JourneyInfoDisplay');
    }, 1000);
    
    // Simulate journey stop
    setTimeout(() => {
      performanceMonitor.recordReRender('MapScreen');
      performanceMonitor.recordReRender('TrackingButton');
      performanceMonitor.recordReRender('MapModals');
    }, 3000);
  }

  simulateSavedPlacesToggle() {
    // Simulate toggling every 500ms
    let toggleCount = 0;
    const interval = setInterval(() => {
      performanceMonitor.recordReRender('SavedPlacesToggle');
      performanceMonitor.recordReRender('MapRenderer');
      performanceMonitor.recordReRender('SavedPlacesOverlay');
      toggleCount++;
      
      if (toggleCount >= 8) {
        clearInterval(interval);
      }
    }, 500);
  }

  simulateMapStyleChange() {
    // Simulate style changes
    setTimeout(() => {
      performanceMonitor.recordReRender('MapStyleButton');
      performanceMonitor.recordReRender('MapModals');
    }, 1000);
    
    setTimeout(() => {
      performanceMonitor.recordReRender('MapRenderer');
      performanceMonitor.recordReRender('MapScreen');
    }, 2000);
  }

  simulatePermissionHandling() {
    // Simulate permission request flow
    setTimeout(() => {
      performanceMonitor.recordReRender('MapScreen');
    }, 500);
    
    setTimeout(() => {
      performanceMonitor.recordReRender('MapScreen');
      performanceMonitor.recordReRender('MapControls');
    }, 2000);
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      scenarios: this.results,
      summary: this.generateSummary(),
      recommendations: this.generateRecommendations(),
    };
    
    console.log('\n📊 AUTOMATED PERFORMANCE TEST REPORT');
    console.log('=' .repeat(60));
    console.log(`Total scenarios tested: ${report.totalTests}`);
    console.log(`Overall performance score: ${report.summary.overallScore}/100`);
    
    report.scenarios.forEach(scenario => {
      const goals = scenario.performanceReport.optimizationGoals;
      console.log(`\n${scenario.scenario}:`);
      console.log(`  Duration: ${scenario.duration.toFixed(2)}ms`);
      if (goals) {
        console.log(`  Render time goal: ${goals.renderTimeGoal.met ? '✅' : '❌'}`);
        console.log(`  Re-render goal: ${goals.mapScreenReRenderGoal.met ? '✅' : '❌'}`);
      }
    });
    
    return report;
  }

  generateSummary() {
    const totalScenarios = this.results.length;
    let passedGoals = 0;
    
    this.results.forEach(result => {
      const goals = result.performanceReport.optimizationGoals;
      if (goals) {
        if (goals.renderTimeGoal.met && goals.mapScreenReRenderGoal.met) {
          passedGoals++;
        }
      }
    });
    
    return {
      totalScenarios,
      passedGoals,
      overallScore: Math.floor((passedGoals / totalScenarios) * 100),
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    this.results.forEach(result => {
      const goals = result.performanceReport.optimizationGoals;
      if (goals) {
        if (!goals.renderTimeGoal.met) {
          recommendations.push(`${result.scenario}: Optimize render time (current: ${goals.renderTimeGoal.actual.toFixed(2)}ms)`);
        }
        if (!goals.mapScreenReRenderGoal.met) {
          recommendations.push(`${result.scenario}: Reduce MapScreen re-renders (current: ${goals.mapScreenReRenderGoal.actual})`);
        }
      }
    });
    
    return recommendations;
  }
}

// Styles for test components
const styles = {
  testPanel: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 9999,
    minWidth: '300px',
  },
  button: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '10px',
  },
  results: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
};

export default AutomatedPerformanceTest;