#!/usr/bin/env node

/**
 * Comprehensive Compatibility Report Generator
 * 
 * This script generates a comprehensive report combining all backward compatibility
 * test results to provide a complete assessment of the MapScreen refactoring.
 */

const fs = require('fs');
const path = require('path');

function generateComprehensiveReport() {
  console.log('📊 Generating Comprehensive Backward Compatibility Report\n');
  
  const reports = [];
  const reportFiles = [
    { file: 'backward-compatibility-report.json', name: 'Structural Compatibility' },
    { file: 'functional-compatibility-report.json', name: 'Functional Compatibility' },
    { file: 'user-workflow-report.json', name: 'User Workflow Compatibility' }
  ];
  
  // Load all report files
  for (const reportFile of reportFiles) {
    try {
      if (fs.existsSync(reportFile.file)) {
        const content = JSON.parse(fs.readFileSync(reportFile.file, 'utf8'));
        reports.push({
          name: reportFile.name,
          data: content
        });
        console.log(`✅ Loaded ${reportFile.name} report`);
      } else {
        console.log(`⚠️  ${reportFile.name} report not found: ${reportFile.file}`);
      }
    } catch (error) {
      console.log(`❌ Error loading ${reportFile.name}: ${error.message}`);
    }
  }
  
  if (reports.length === 0) {
    console.log('❌ No reports found. Please run the compatibility tests first.');
    return false;
  }
  
  // Calculate overall statistics
  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;
  let totalTests = 0;
  
  console.log('\n📈 Individual Report Summary:');
  console.log('=============================');
  
  for (const report of reports) {
    const summary = report.data.summary;
    totalPassed += summary.passed;
    totalFailed += summary.failed;
    totalWarnings += summary.warnings;
    totalTests += summary.total;
    
    console.log(`\n${report.name}:`);
    console.log(`  ✅ Passed: ${summary.passed}`);
    console.log(`  ❌ Failed: ${summary.failed}`);
    console.log(`  ⚠️  Warnings: ${summary.warnings}`);
    console.log(`  📊 Success Rate: ${summary.successRate}%`);
  }
  
  // Calculate overall success rate
  const overallSuccessRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  
  console.log('\n🎯 Overall Compatibility Summary:');
  console.log('=================================');
  console.log(`✅ Total Passed: ${totalPassed}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log(`⚠️  Total Warnings: ${totalWarnings}`);
  console.log(`📝 Total Tests: ${totalTests}`);
  console.log(`📈 Overall Success Rate: ${overallSuccessRate}%`);
  
  // Determine compatibility status
  let compatibilityStatus;
  let statusMessage;
  let recommendations = [];
  
  if (totalFailed === 0 && totalWarnings === 0) {
    compatibilityStatus = 'FULLY_COMPATIBLE';
    statusMessage = '🎉 PERFECT BACKWARD COMPATIBILITY';
    recommendations.push('✅ Ready for deployment');
    recommendations.push('✅ All functionality preserved');
    recommendations.push('✅ No user impact expected');
  } else if (totalFailed === 0 && totalWarnings > 0) {
    compatibilityStatus = 'COMPATIBLE_WITH_WARNINGS';
    statusMessage = '✅ BACKWARD COMPATIBLE (with minor warnings)';
    recommendations.push('✅ Safe for deployment');
    recommendations.push('⚠️  Review warnings for potential improvements');
    recommendations.push('✅ No breaking changes detected');
  } else if (totalFailed <= 2 && parseFloat(overallSuccessRate) >= 95) {
    compatibilityStatus = 'MOSTLY_COMPATIBLE';
    statusMessage = '⚠️  MOSTLY BACKWARD COMPATIBLE';
    recommendations.push('⚠️  Review failed tests before deployment');
    recommendations.push('✅ Core functionality preserved');
    recommendations.push('🔧 Minor fixes may be needed');
  } else {
    compatibilityStatus = 'COMPATIBILITY_ISSUES';
    statusMessage = '❌ BACKWARD COMPATIBILITY ISSUES DETECTED';
    recommendations.push('❌ Do not deploy until issues are resolved');
    recommendations.push('🔧 Significant fixes required');
    recommendations.push('⚠️  User experience may be impacted');
  }
  
  console.log(`\n${statusMessage}`);
  console.log('\n📋 Recommendations:');
  for (const recommendation of recommendations) {
    console.log(`  ${recommendation}`);
  }
  
  // Identify specific issues
  const issues = [];
  const warnings = [];
  
  for (const report of reports) {
    for (const detail of report.data.details) {
      if (detail.status === 'FAIL') {
        issues.push({
          category: report.name,
          test: detail.test,
          details: detail.details
        });
      } else if (detail.status === 'WARN') {
        warnings.push({
          category: report.name,
          test: detail.test,
          details: detail.details
        });
      }
    }
  }
  
  if (issues.length > 0) {
    console.log('\n🚨 Critical Issues to Address:');
    console.log('==============================');
    for (const issue of issues) {
      console.log(`❌ [${issue.category}] ${issue.test}`);
      if (issue.details) {
        console.log(`   ${issue.details}`);
      }
    }
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings to Review:');
    console.log('=======================');
    for (const warning of warnings) {
      console.log(`⚠️  [${warning.category}] ${warning.test}`);
      if (warning.details) {
        console.log(`   ${warning.details}`);
      }
    }
  }
  
  // Generate comprehensive report
  const comprehensiveReport = {
    timestamp: new Date().toISOString(),
    compatibilityStatus,
    overallSummary: {
      passed: totalPassed,
      failed: totalFailed,
      warnings: totalWarnings,
      total: totalTests,
      successRate: parseFloat(overallSuccessRate)
    },
    individualReports: reports.map(r => ({
      name: r.name,
      summary: r.data.summary,
      timestamp: r.data.timestamp
    })),
    issues,
    warnings,
    recommendations,
    conclusion: {
      readyForDeployment: totalFailed === 0,
      userImpact: totalFailed === 0 ? 'None' : totalFailed <= 2 ? 'Minimal' : 'Significant',
      nextSteps: totalFailed === 0 ? 
        'Refactoring complete - ready for deployment' : 
        'Address failed tests before deployment'
    }
  };
  
  // Save comprehensive report
  const reportPath = 'comprehensive-compatibility-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(comprehensiveReport, null, 2));
  console.log(`\n📄 Comprehensive report saved to: ${reportPath}`);
  
  // Final assessment
  console.log('\n🎯 Final Assessment:');
  console.log('===================');
  console.log(`Status: ${compatibilityStatus}`);
  console.log(`Ready for Deployment: ${comprehensiveReport.conclusion.readyForDeployment ? 'YES' : 'NO'}`);
  console.log(`User Impact: ${comprehensiveReport.conclusion.userImpact}`);
  console.log(`Next Steps: ${comprehensiveReport.conclusion.nextSteps}`);
  
  return comprehensiveReport.conclusion.readyForDeployment;
}

// Run the report generation
if (require.main === module) {
  const success = generateComprehensiveReport();
  process.exit(success ? 0 : 1);
}

module.exports = { generateComprehensiveReport };