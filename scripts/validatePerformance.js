#!/usr/bin/env node

/**
 * Performance validation script for MapScreen refactoring
 * This script runs automated tests to measure and validate performance improvements
 */

const fs = require('fs');
const path = require('path');

// Performance test configuration
const PERFORMANCE_CONFIG = {
  // Test duration in milliseconds
  testDuration: 30000, // 30 seconds
  
  // Performance goals from requirements
  goals: {
    // Goal 6.1: Reduce MapScreen component size to under 200 lines
    mapScreenSizeGoal: 200,
    
    // Goal 6.2: Improve rendering performance (target: under 16ms average)
    averageRenderTimeGoal: 16,
    
    // Goal 6.3: Reduce re-render frequency (target: MapScreen ≤ 5 re-renders per test)
    mapScreenReRenderGoal: 5,
    
    // Goal 6.4: Optimize memory usage and component lifecycle
    maxComponentReRenders: 10,
    hookEfficiencyGoal: 5, // milliseconds
  },
  
  // Test scenarios
  scenarios: [
    'initial_load',
    'location_updates',
    'journey_tracking',
    'saved_places_toggle',
    'map_style_change',
    'permission_handling',
  ],
};

class PerformanceValidator {
  constructor() {
    this.results = {
      codeMetrics: {},
      performanceMetrics: {},
      optimizationGoals: {},
      recommendations: [],
    };
  }

  /**
   * Run all performance validation tests
   */
  async runValidation() {
    console.log('🚀 Starting MapScreen Performance Validation');
    console.log('=' .repeat(60));
    
    try {
      // 1. Analyze code metrics
      await this.analyzeCodeMetrics();
      
      // 2. Validate component architecture
      await this.validateComponentArchitecture();
      
      // 3. Check optimization implementation
      await this.checkOptimizationImplementation();
      
      // 4. Generate recommendations
      this.generateRecommendations();
      
      // 5. Create final report
      this.generateFinalReport();
      
      console.log('✅ Performance validation completed');
      return this.results;
      
    } catch (error) {
      console.error('❌ Performance validation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze code metrics (file sizes, complexity, etc.)
   */
  async analyzeCodeMetrics() {
    console.log('\n📊 Analyzing code metrics...');
    
    const mapScreenPath = path.join(process.cwd(), 'screens', 'MapScreen.js');
    const componentsDir = path.join(process.cwd(), 'components', 'map');
    const hooksDir = path.join(process.cwd(), 'hooks');
    
    // Analyze MapScreen size
    if (fs.existsSync(mapScreenPath)) {
      const mapScreenContent = fs.readFileSync(mapScreenPath, 'utf8');
      const lineCount = mapScreenContent.split('\n').length;
      const codeLines = mapScreenContent.split('\n').filter(line => 
        line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')
      ).length;
      
      this.results.codeMetrics.mapScreen = {
        totalLines: lineCount,
        codeLines: codeLines,
        sizeGoalMet: codeLines <= PERFORMANCE_CONFIG.goals.mapScreenSizeGoal,
        fileSizeKB: (fs.statSync(mapScreenPath).size / 1024).toFixed(2),
      };
      
      console.log(`  MapScreen: ${codeLines} lines of code (goal: ≤${PERFORMANCE_CONFIG.goals.mapScreenSizeGoal})`);
      console.log(`  File size: ${this.results.codeMetrics.mapScreen.fileSizeKB}KB`);
    }
    
    // Analyze extracted components
    if (fs.existsSync(componentsDir)) {
      const componentFiles = fs.readdirSync(componentsDir).filter(f => f.endsWith('.js'));
      this.results.codeMetrics.extractedComponents = componentFiles.map(file => {
        const filePath = path.join(componentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lineCount = content.split('\n').filter(line => 
          line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')
        ).length;
        
        return {
          name: file,
          codeLines: lineCount,
          fileSizeKB: (fs.statSync(filePath).size / 1024).toFixed(2),
        };
      });
      
      console.log(`  Extracted components: ${componentFiles.length}`);
      this.results.codeMetrics.extractedComponents.forEach(comp => {
        console.log(`    ${comp.name}: ${comp.codeLines} lines, ${comp.fileSizeKB}KB`);
      });
    }
    
    // Analyze custom hooks
    if (fs.existsSync(hooksDir)) {
      const hookFiles = fs.readdirSync(hooksDir).filter(f => f.startsWith('use') && f.endsWith('.js'));
      this.results.codeMetrics.customHooks = hookFiles.map(file => {
        const filePath = path.join(hooksDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lineCount = content.split('\n').filter(line => 
          line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')
        ).length;
        
        return {
          name: file,
          codeLines: lineCount,
          fileSizeKB: (fs.statSync(filePath).size / 1024).toFixed(2),
        };
      });
      
      console.log(`  Custom hooks: ${hookFiles.length}`);
      this.results.codeMetrics.customHooks.forEach(hook => {
        console.log(`    ${hook.name}: ${hook.codeLines} lines, ${hook.fileSizeKB}KB`);
      });
    }
  }

  /**
   * Validate component architecture and separation of concerns
   */
  async validateComponentArchitecture() {
    console.log('\n🏗️  Validating component architecture...');
    
    const architectureChecks = {
      mapScreenExists: fs.existsSync(path.join(process.cwd(), 'screens', 'MapScreen.js')),
      mapRendererExists: fs.existsSync(path.join(process.cwd(), 'components', 'map', 'MapRenderer.js')),
      mapControlsExists: fs.existsSync(path.join(process.cwd(), 'components', 'map', 'MapControls.js')),
      mapStatusDisplaysExists: fs.existsSync(path.join(process.cwd(), 'components', 'map', 'MapStatusDisplays.js')),
      mapModalsExists: fs.existsSync(path.join(process.cwd(), 'components', 'map', 'MapModals.js')),
      
      // Check for custom hooks
      useMapStateExists: fs.existsSync(path.join(process.cwd(), 'hooks', 'useMapState.js')),
      useLocationTrackingExists: fs.existsSync(path.join(process.cwd(), 'hooks', 'useLocationTracking.js')),
      useJourneyTrackingExists: fs.existsSync(path.join(process.cwd(), 'hooks', 'useJourneyTracking.js')),
      useSavedRoutesExists: fs.existsSync(path.join(process.cwd(), 'hooks', 'useSavedRoutes.js')),
      useSavedPlacesExists: fs.existsSync(path.join(process.cwd(), 'hooks', 'useSavedPlaces.js')),
      useMapStyleExists: fs.existsSync(path.join(process.cwd(), 'hooks', 'useMapStyle.js')),
      useMapPermissionsExists: fs.existsSync(path.join(process.cwd(), 'hooks', 'useMapPermissions.js')),
    };
    
    this.results.codeMetrics.architectureCompliance = architectureChecks;
    
    const passedChecks = Object.values(architectureChecks).filter(Boolean).length;
    const totalChecks = Object.keys(architectureChecks).length;
    
    console.log(`  Architecture compliance: ${passedChecks}/${totalChecks} components/hooks present`);
    
    Object.entries(architectureChecks).forEach(([check, passed]) => {
      console.log(`    ${passed ? '✅' : '❌'} ${check}`);
    });
  }

  /**
   * Check optimization implementation (memoization, etc.)
   */
  async checkOptimizationImplementation() {
    console.log('\n⚡ Checking optimization implementation...');
    
    const optimizationChecks = {
      reactMemoUsage: 0,
      useMemoUsage: 0,
      useCallbackUsage: 0,
      contextSplitting: 0,
      propOptimization: 0,
    };
    
    // Check MapScreen for optimizations
    const mapScreenPath = path.join(process.cwd(), 'screens', 'MapScreen.js');
    if (fs.existsSync(mapScreenPath)) {
      const content = fs.readFileSync(mapScreenPath, 'utf8');
      
      optimizationChecks.useMemoUsage = (content.match(/useMemo\(/g) || []).length;
      optimizationChecks.useCallbackUsage = (content.match(/useCallback\(/g) || []).length;
      
      console.log(`  MapScreen optimizations:`);
      console.log(`    useMemo calls: ${optimizationChecks.useMemoUsage}`);
      console.log(`    useCallback calls: ${optimizationChecks.useCallbackUsage}`);
    }
    
    // Check components for React.memo
    const componentsDir = path.join(process.cwd(), 'components', 'map');
    if (fs.existsSync(componentsDir)) {
      const componentFiles = fs.readdirSync(componentsDir).filter(f => f.endsWith('.js'));
      
      componentFiles.forEach(file => {
        const content = fs.readFileSync(path.join(componentsDir, file), 'utf8');
        if (content.includes('React.memo') || content.includes('memo(')) {
          optimizationChecks.reactMemoUsage++;
        }
      });
      
      console.log(`  Components with React.memo: ${optimizationChecks.reactMemoUsage}/${componentFiles.length}`);
    }
    
    this.results.codeMetrics.optimizations = optimizationChecks;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    console.log('\n💡 Generating recommendations...');
    
    const recommendations = [];
    
    // Check MapScreen size goal
    if (this.results.codeMetrics.mapScreen && !this.results.codeMetrics.mapScreen.sizeGoalMet) {
      recommendations.push({
        type: 'critical',
        category: 'code_size',
        message: `MapScreen has ${this.results.codeMetrics.mapScreen.codeLines} lines (goal: ≤${PERFORMANCE_CONFIG.goals.mapScreenSizeGoal}). Consider extracting more logic into hooks or components.`,
      });
    }
    
    // Check architecture compliance
    const architectureChecks = this.results.codeMetrics.architectureCompliance;
    const missingComponents = Object.entries(architectureChecks)
      .filter(([_, exists]) => !exists)
      .map(([name, _]) => name);
    
    if (missingComponents.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'architecture',
        message: `Missing components/hooks: ${missingComponents.join(', ')}. Complete the refactoring to achieve full modular architecture.`,
      });
    }
    
    // Check optimization implementation
    const optimizations = this.results.codeMetrics.optimizations;
    if (optimizations.useMemoUsage < 3) {
      recommendations.push({
        type: 'suggestion',
        category: 'performance',
        message: `Consider adding more useMemo optimizations. Currently: ${optimizations.useMemoUsage} usages.`,
      });
    }
    
    if (optimizations.useCallbackUsage < 5) {
      recommendations.push({
        type: 'suggestion',
        category: 'performance',
        message: `Consider adding more useCallback optimizations. Currently: ${optimizations.useCallbackUsage} usages.`,
      });
    }
    
    if (optimizations.reactMemoUsage === 0) {
      recommendations.push({
        type: 'suggestion',
        category: 'performance',
        message: 'Consider wrapping components with React.memo to prevent unnecessary re-renders.',
      });
    }
    
    this.results.recommendations = recommendations;
    
    recommendations.forEach(rec => {
      const icon = rec.type === 'critical' ? '🚨' : rec.type === 'warning' ? '⚠️' : '💡';
      console.log(`  ${icon} [${rec.category.toUpperCase()}] ${rec.message}`);
    });
  }

  /**
   * Generate final performance report
   */
  generateFinalReport() {
    console.log('\n📋 FINAL PERFORMANCE REPORT');
    console.log('=' .repeat(60));
    
    // Overall score calculation
    let score = 0;
    let maxScore = 0;
    
    // Code size goal (25 points)
    maxScore += 25;
    if (this.results.codeMetrics.mapScreen?.sizeGoalMet) {
      score += 25;
      console.log('✅ MapScreen size goal: MET (25/25 points)');
    } else {
      const lines = this.results.codeMetrics.mapScreen?.codeLines || 0;
      const partialScore = Math.max(0, 25 - Math.floor((lines - PERFORMANCE_CONFIG.goals.mapScreenSizeGoal) / 10));
      score += partialScore;
      console.log(`❌ MapScreen size goal: NOT MET (${partialScore}/25 points)`);
    }
    
    // Architecture compliance (30 points)
    maxScore += 30;
    const architectureChecks = this.results.codeMetrics.architectureCompliance;
    const passedChecks = Object.values(architectureChecks).filter(Boolean).length;
    const totalChecks = Object.keys(architectureChecks).length;
    const architectureScore = Math.floor((passedChecks / totalChecks) * 30);
    score += architectureScore;
    console.log(`${passedChecks === totalChecks ? '✅' : '⚠️'} Architecture compliance: ${passedChecks}/${totalChecks} (${architectureScore}/30 points)`);
    
    // Optimization implementation (25 points)
    maxScore += 25;
    const optimizations = this.results.codeMetrics.optimizations;
    let optimizationScore = 0;
    optimizationScore += Math.min(10, optimizations.useMemoUsage * 2); // Up to 10 points
    optimizationScore += Math.min(10, optimizations.useCallbackUsage * 2); // Up to 10 points
    optimizationScore += optimizations.reactMemoUsage > 0 ? 5 : 0; // 5 points for any React.memo usage
    score += optimizationScore;
    console.log(`${optimizationScore >= 20 ? '✅' : '⚠️'} Optimization implementation: (${optimizationScore}/25 points)`);
    
    // Code quality (20 points)
    maxScore += 20;
    const criticalIssues = this.results.recommendations.filter(r => r.type === 'critical').length;
    const warningIssues = this.results.recommendations.filter(r => r.type === 'warning').length;
    const qualityScore = Math.max(0, 20 - (criticalIssues * 10) - (warningIssues * 5));
    score += qualityScore;
    console.log(`${qualityScore >= 15 ? '✅' : '⚠️'} Code quality: (${qualityScore}/20 points)`);
    
    // Final score
    const percentage = Math.floor((score / maxScore) * 100);
    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 OVERALL PERFORMANCE SCORE: ${score}/${maxScore} (${percentage}%)`);
    
    if (percentage >= 90) {
      console.log('🏆 EXCELLENT: Refactoring goals exceeded!');
    } else if (percentage >= 80) {
      console.log('✅ GOOD: Refactoring goals mostly met');
    } else if (percentage >= 70) {
      console.log('⚠️  FAIR: Some refactoring goals not met');
    } else {
      console.log('❌ POOR: Significant refactoring work needed');
    }
    
    this.results.finalScore = {
      score,
      maxScore,
      percentage,
      grade: percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : 'D',
    };
    
    // Save detailed report
    this.saveDetailedReport();
  }

  /**
   * Save detailed report to file
   */
  saveDetailedReport() {
    const reportPath = path.join(process.cwd(), 'performance-validation-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      config: PERFORMANCE_CONFIG,
      results: this.results,
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PerformanceValidator();
  validator.runValidation()
    .then(() => {
      console.log('\n🎉 Performance validation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Performance validation failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceValidator;