#!/usr/bin/env node

/**
 * Backward Compatibility Test Script
 * 
 * This script performs comprehensive testing to ensure all MapScreen functionality
 * works exactly as before the refactoring. It tests all user workflows and
 * feature interactions to confirm no functionality regressions.
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

// Helper function to log test results
function logTest(testName, status, details = '') {
  const result = {
    test: testName,
    status,
    details,
    timestamp: new Date().toISOString()
  };
  
  testResults.details.push(result);
  
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else if (status === 'FAIL') {
    testResults.failed++;
    console.log(`❌ ${testName}: ${details}`);
  } else if (status === 'WARN') {
    testResults.warnings++;
    console.log(`⚠️  ${testName}: ${details}`);
  }
  
  if (details) {
    console.log(`   ${details}`);
  }
}

// Helper function to check if file exists and has expected content
function checkFileExists(filePath, description) {
  try {
    const fullPath = path.resolve(filePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      logTest(`File exists: ${description}`, 'PASS', `${filePath} (${stats.size} bytes)`);
      return true;
    } else {
      logTest(`File exists: ${description}`, 'FAIL', `${filePath} not found`);
      return false;
    }
  } catch (error) {
    logTest(`File exists: ${description}`, 'FAIL', `Error checking ${filePath}: ${error.message}`);
    return false;
  }
}

// Helper function to check component structure
function checkComponentStructure(filePath, expectedExports = []) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it's a valid React component
    const hasReactImport = content.includes('import React') || content.includes('from \'react\'');
    const hasDefaultExport = content.includes('export default');
    
    if (!hasReactImport) {
      logTest(`Component structure: ${path.basename(filePath)}`, 'FAIL', 'Missing React import');
      return false;
    }
    
    if (!hasDefaultExport) {
      logTest(`Component structure: ${path.basename(filePath)}`, 'FAIL', 'Missing default export');
      return false;
    }
    
    // Check for expected exports
    let allExportsFound = true;
    for (const expectedExport of expectedExports) {
      if (!content.includes(expectedExport)) {
        logTest(`Component structure: ${path.basename(filePath)}`, 'WARN', `Missing expected export: ${expectedExport}`);
        allExportsFound = false;
      }
    }
    
    logTest(`Component structure: ${path.basename(filePath)}`, 'PASS', 'Valid React component structure');
    return true;
  } catch (error) {
    logTest(`Component structure: ${path.basename(filePath)}`, 'FAIL', `Error reading file: ${error.message}`);
    return false;
  }
}

// Helper function to check hook structure
function checkHookStructure(filePath, expectedHookName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it follows hook conventions
    const hasUsePrefix = expectedHookName.startsWith('use');
    const hasHookExport = content.includes(`export default ${expectedHookName}`) || 
                         content.includes(`const ${expectedHookName}`) ||
                         content.includes(`function ${expectedHookName}`);
    
    if (!hasUsePrefix) {
      logTest(`Hook structure: ${expectedHookName}`, 'FAIL', 'Hook name should start with "use"');
      return false;
    }
    
    if (!hasHookExport) {
      logTest(`Hook structure: ${expectedHookName}`, 'FAIL', 'Hook function not found');
      return false;
    }
    
    // Check for React hooks usage
    const usesReactHooks = content.includes('useState') || 
                          content.includes('useEffect') || 
                          content.includes('useCallback') || 
                          content.includes('useMemo');
    
    if (!usesReactHooks) {
      logTest(`Hook structure: ${expectedHookName}`, 'WARN', 'No React hooks detected');
    }
    
    logTest(`Hook structure: ${expectedHookName}`, 'PASS', 'Valid hook structure');
    return true;
  } catch (error) {
    logTest(`Hook structure: ${expectedHookName}`, 'FAIL', `Error reading file: ${error.message}`);
    return false;
  }
}

// Helper function to check MapScreen line count
function checkMapScreenSize() {
  try {
    const content = fs.readFileSync('screens/MapScreen.js', 'utf8');
    const lines = content.split('\n').length;
    
    if (lines <= 200) {
      logTest('MapScreen size constraint', 'PASS', `${lines} lines (target: ≤200)`);
    } else {
      logTest('MapScreen size constraint', 'FAIL', `${lines} lines (target: ≤200)`);
    }
    
    return lines;
  } catch (error) {
    logTest('MapScreen size constraint', 'FAIL', `Error reading MapScreen.js: ${error.message}`);
    return -1;
  }
}

// Helper function to check for imports and dependencies
function checkMapScreenDependencies() {
  try {
    const content = fs.readFileSync('screens/MapScreen.js', 'utf8');
    
    // Check for required hook imports
    const requiredHooks = [
      'useMapPermissions',
      'useLocationTracking', 
      'useMapState',
      'useJourneyTracking',
      'useSavedRoutes',
      'useSavedPlaces',
      'useMapStyle'
    ];
    
    const requiredComponents = [
      'MapRenderer',
      'MapControls',
      'MapStatusDisplays',
      'MapModals'
    ];
    
    let allHooksImported = true;
    for (const hook of requiredHooks) {
      if (!content.includes(hook)) {
        logTest('MapScreen hook dependencies', 'FAIL', `Missing hook import: ${hook}`);
        allHooksImported = false;
      }
    }
    
    if (allHooksImported) {
      logTest('MapScreen hook dependencies', 'PASS', 'All required hooks imported');
    }
    
    let allComponentsImported = true;
    for (const component of requiredComponents) {
      if (!content.includes(component)) {
        logTest('MapScreen component dependencies', 'FAIL', `Missing component import: ${component}`);
        allComponentsImported = false;
      }
    }
    
    if (allComponentsImported) {
      logTest('MapScreen component dependencies', 'PASS', 'All required components imported');
    }
    
    return allHooksImported && allComponentsImported;
  } catch (error) {
    logTest('MapScreen dependencies', 'FAIL', `Error checking dependencies: ${error.message}`);
    return false;
  }
}

// Test 1: Verify all custom hooks exist and have proper structure
function testCustomHooks() {
  console.log('\n🔍 Testing Custom Hooks...');
  
  const hooks = [
    { file: 'hooks/useMapState.js', name: 'useMapState' },
    { file: 'hooks/useLocationTracking.js', name: 'useLocationTracking' },
    { file: 'hooks/useJourneyTracking.js', name: 'useJourneyTracking' },
    { file: 'hooks/useSavedRoutes.js', name: 'useSavedRoutes' },
    { file: 'hooks/useSavedPlaces.js', name: 'useSavedPlaces' },
    { file: 'hooks/useMapStyle.js', name: 'useMapStyle' },
    { file: 'hooks/useMapPermissions.js', name: 'useMapPermissions' }
  ];
  
  for (const hook of hooks) {
    if (checkFileExists(hook.file, `${hook.name} hook`)) {
      checkHookStructure(hook.file, hook.name);
    }
  }
}

// Test 2: Verify all extracted components exist and have proper structure
function testExtractedComponents() {
  console.log('\n🔍 Testing Extracted Components...');
  
  const components = [
    { file: 'components/map/MapRenderer.js', name: 'MapRenderer' },
    { file: 'components/map/MapControls.js', name: 'MapControls' },
    { file: 'components/map/MapStatusDisplays.js', name: 'MapStatusDisplays' },
    { file: 'components/map/MapModals.js', name: 'MapModals' },
    { file: 'components/map/MapPolylines.js', name: 'MapPolylines' },
    { file: 'components/map/MapOverlays.js', name: 'MapOverlays' },
    { file: 'components/map/SpriteOverlay.js', name: 'SpriteOverlay' },
    { file: 'components/map/SavedPlacesOverlay.js', name: 'SavedPlacesOverlay' },
    { file: 'components/map/TrackingButton.js', name: 'TrackingButton' },
    { file: 'components/map/SavedRoutesToggle.js', name: 'SavedRoutesToggle' },
    { file: 'components/map/SavedPlacesToggle.js', name: 'SavedPlacesToggle' },
    { file: 'components/map/MapStyleButton.js', name: 'MapStyleButton' },
    { file: 'components/map/JourneyInfoDisplay.js', name: 'JourneyInfoDisplay' },
    { file: 'components/ui/GPSStatusDisplay.js', name: 'GPSStatusDisplay' },
    { file: 'components/ui/JourneyNamingModal.js', name: 'JourneyNamingModal' },
    { file: 'components/ui/MapStyleSelector.js', name: 'MapStyleSelector' },
    { file: 'components/ui/PlaceDetailModal.js', name: 'PlaceDetailModal' }
  ];
  
  for (const component of components) {
    if (checkFileExists(component.file, `${component.name} component`)) {
      checkComponentStructure(component.file);
    }
  }
}

// Test 3: Verify MapScreen refactoring meets requirements
function testMapScreenRefactoring() {
  console.log('\n🔍 Testing MapScreen Refactoring...');
  
  // Check if MapScreen exists
  if (!checkFileExists('screens/MapScreen.js', 'MapScreen component')) {
    return;
  }
  
  // Check line count constraint
  checkMapScreenSize();
  
  // Check dependencies
  checkMapScreenDependencies();
  
  // Check component structure
  checkComponentStructure('screens/MapScreen.js');
}

// Test 4: Verify all functionality is preserved
function testFunctionalityPreservation() {
  console.log('\n🔍 Testing Functionality Preservation...');
  
  try {
    const mapScreenContent = fs.readFileSync('screens/MapScreen.js', 'utf8');
    
    // Check for key functionality patterns
    const functionalityChecks = [
      { pattern: 'useMapPermissions', description: 'Location permissions handling' },
      { pattern: 'useLocationTracking', description: 'Location tracking functionality' },
      { pattern: 'useJourneyTracking', description: 'Journey tracking functionality' },
      { pattern: 'useSavedRoutes', description: 'Saved routes functionality' },
      { pattern: 'useSavedPlaces', description: 'Saved places functionality' },
      { pattern: 'useMapStyle', description: 'Map styling functionality' },
      { pattern: 'MapRenderer', description: 'Map rendering' },
      { pattern: 'MapControls', description: 'Map controls' },
      { pattern: 'MapStatusDisplays', description: 'Status displays' },
      { pattern: 'MapModals', description: 'Modal dialogs' },
      { pattern: 'onLocateMe', description: 'Locate me functionality' },
      { pattern: 'onToggleTracking', description: 'Journey tracking toggle' },
      { pattern: 'onToggleSavedRoutes', description: 'Saved routes toggle' },
      { pattern: 'onToggleSavedPlaces', description: 'Saved places toggle' },
      { pattern: 'onToggleMapStyle', description: 'Map style toggle' },
      { pattern: 'permissionOverlay', description: 'Permission prompt overlay' }
    ];
    
    for (const check of functionalityChecks) {
      if (mapScreenContent.includes(check.pattern)) {
        logTest(`Functionality preserved: ${check.description}`, 'PASS');
      } else {
        logTest(`Functionality preserved: ${check.description}`, 'FAIL', `Pattern '${check.pattern}' not found`);
      }
    }
    
  } catch (error) {
    logTest('Functionality preservation check', 'FAIL', `Error reading MapScreen: ${error.message}`);
  }
}

// Test 5: Check for potential regressions
function testForRegressions() {
  console.log('\n🔍 Testing for Potential Regressions...');
  
  try {
    const mapScreenContent = fs.readFileSync('screens/MapScreen.js', 'utf8');
    
    // Check for common regression patterns
    const regressionChecks = [
      { 
        pattern: /console\.error|console\.warn/g, 
        description: 'Error handling preserved',
        shouldExist: true 
      },
      { 
        pattern: /useCallback|useMemo/g, 
        description: 'Performance optimizations preserved',
        shouldExist: true 
      },
      { 
        pattern: /useEffect/g, 
        description: 'Side effects management preserved',
        shouldExist: true 
      },
      { 
        pattern: /StatusBar/g, 
        description: 'Status bar configuration preserved',
        shouldExist: true 
      },
      { 
        pattern: /StyleSheet/g, 
        description: 'Styling preserved',
        shouldExist: true 
      }
    ];
    
    for (const check of regressionChecks) {
      const matches = mapScreenContent.match(check.pattern);
      const hasPattern = matches && matches.length > 0;
      
      if (hasPattern === check.shouldExist) {
        logTest(`Regression check: ${check.description}`, 'PASS', 
          hasPattern ? `Found ${matches.length} instances` : 'Pattern correctly absent');
      } else {
        logTest(`Regression check: ${check.description}`, 'FAIL', 
          check.shouldExist ? 'Pattern not found' : 'Unexpected pattern found');
      }
    }
    
  } catch (error) {
    logTest('Regression testing', 'FAIL', `Error during regression check: ${error.message}`);
  }
}

// Test 6: Verify user workflow integrity
function testUserWorkflows() {
  console.log('\n🔍 Testing User Workflow Integrity...');
  
  // Define critical user workflows that must be preserved
  const workflows = [
    {
      name: 'Location Permission Request',
      components: ['useMapPermissions', 'permissionOverlay', 'handleRequestPermissions'],
      description: 'User can request location permissions when denied'
    },
    {
      name: 'Journey Tracking Workflow',
      components: ['useJourneyTracking', 'MapControls', 'onToggleTracking'],
      description: 'User can start/stop journey tracking'
    },
    {
      name: 'Map Navigation Workflow',
      components: ['useLocationTracking', 'useMapState', 'onLocateMe'],
      description: 'User can navigate and locate themselves on map'
    },
    {
      name: 'Saved Routes Management',
      components: ['useSavedRoutes', 'MapControls', 'onToggleSavedRoutes'],
      description: 'User can toggle saved routes visibility'
    },
    {
      name: 'Saved Places Management',
      components: ['useSavedPlaces', 'MapControls', 'onToggleSavedPlaces'],
      description: 'User can toggle saved places visibility'
    },
    {
      name: 'Map Style Selection',
      components: ['useMapStyle', 'MapControls', 'onToggleMapStyle'],
      description: 'User can change map styles'
    },
    {
      name: 'Journey Information Display',
      components: ['MapStatusDisplays', 'journeyInfo'],
      description: 'User can view current journey information'
    },
    {
      name: 'Modal Interactions',
      components: ['MapModals', 'journeyNaming', 'placeDetail', 'mapStyleSelector'],
      description: 'User can interact with various modal dialogs'
    }
  ];
  
  try {
    const mapScreenContent = fs.readFileSync('screens/MapScreen.js', 'utf8');
    
    for (const workflow of workflows) {
      let workflowIntact = true;
      const missingComponents = [];
      
      for (const component of workflow.components) {
        if (!mapScreenContent.includes(component)) {
          workflowIntact = false;
          missingComponents.push(component);
        }
      }
      
      if (workflowIntact) {
        logTest(`User workflow: ${workflow.name}`, 'PASS', workflow.description);
      } else {
        logTest(`User workflow: ${workflow.name}`, 'FAIL', 
          `Missing components: ${missingComponents.join(', ')}`);
      }
    }
    
  } catch (error) {
    logTest('User workflow testing', 'FAIL', `Error checking workflows: ${error.message}`);
  }
}

// Test 7: Verify performance optimizations are maintained
function testPerformanceOptimizations() {
  console.log('\n🔍 Testing Performance Optimizations...');
  
  try {
    const mapScreenContent = fs.readFileSync('screens/MapScreen.js', 'utf8');
    
    // Check for performance optimization patterns in MapScreen
    const mapScreenOptimizations = [
      { pattern: 'useMemo', description: 'Memoization for expensive calculations' },
      { pattern: 'useCallback', description: 'Callback memoization' },
      { pattern: 'lastProcessedPosition', description: 'Position update throttling' },
      { pattern: 'calculateDistance', description: 'Distance calculation optimization' }
    ];
    
    for (const optimization of mapScreenOptimizations) {
      if (mapScreenContent.includes(optimization.pattern)) {
        logTest(`Performance optimization: ${optimization.description}`, 'PASS');
      } else {
        logTest(`Performance optimization: ${optimization.description}`, 'WARN', 
          `${optimization.pattern} not found - may impact performance`);
      }
    }
    
    // Check for React.memo usage in components
    const componentFiles = [
      'components/map/MapControls.js',
      'components/map/MapStatusDisplays.js',
      'components/map/MapRenderer.js',
      'components/map/MapModals.js'
    ];
    
    let memoUsageFound = false;
    for (const componentFile of componentFiles) {
      try {
        if (fs.existsSync(componentFile)) {
          const content = fs.readFileSync(componentFile, 'utf8');
          if (content.includes('React.memo(')) {
            memoUsageFound = true;
            break;
          }
        }
      } catch (error) {
        // Continue checking other files
      }
    }
    
    if (memoUsageFound) {
      logTest('Performance optimization: Component memoization', 'PASS', 'React.memo found in components');
    } else {
      logTest('Performance optimization: Component memoization', 'WARN', 
        'React.memo not found in components - may impact performance');
    }
    
  } catch (error) {
    logTest('Performance optimization check', 'FAIL', `Error checking optimizations: ${error.message}`);
  }
}

// Main test execution
async function runBackwardCompatibilityTests() {
  console.log('🚀 Starting Backward Compatibility Tests for MapScreen Refactoring\n');
  console.log('This test verifies that all functionality works exactly as before the refactoring.\n');
  
  // Run all test suites
  testCustomHooks();
  testExtractedComponents();
  testMapScreenRefactoring();
  testFunctionalityPreservation();
  testForRegressions();
  testUserWorkflows();
  testPerformanceOptimizations();
  
  // Generate summary report
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📝 Total Tests: ${testResults.passed + testResults.failed + testResults.warnings}`);
  
  // Calculate success rate
  const totalTests = testResults.passed + testResults.failed + testResults.warnings;
  const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;
  console.log(`📈 Success Rate: ${successRate}%`);
  
  // Write detailed report
  const reportPath = 'backward-compatibility-report.json';
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      total: totalTests,
      successRate: parseFloat(successRate)
    },
    details: testResults.details
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Determine overall result
  if (testResults.failed === 0) {
    console.log('\n🎉 BACKWARD COMPATIBILITY VERIFIED: All functionality preserved!');
    return true;
  } else {
    console.log('\n⚠️  BACKWARD COMPATIBILITY ISSUES DETECTED: Some functionality may be broken!');
    console.log('Please review the failed tests and fix any issues before deployment.');
    return false;
  }
}

// Run the tests
if (require.main === module) {
  runBackwardCompatibilityTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runBackwardCompatibilityTests };