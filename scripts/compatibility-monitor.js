#!/usr/bin/env node

/**
 * HyperFixi Compatibility Monitoring Script
 * Automated testing and improvement tracking system
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

class CompatibilityMonitor {
  constructor() {
    this.metricsFile = join(process.cwd(), 'metrics/compatibility-history.json');
    this.thresholds = {
      expressionCompatibility: 85,
      commandCompatibility: 70,
      overallCompatibility: 85,
      testPassRate: 100
    };
  }

  async runCompatibilityTests() {
    console.log('🧪 Running compatibility test suite...');
    
    const results = {
      timestamp: new Date().toISOString(),
      expressionTests: await this.runTestCategory('Expression Tests'),
      commandTests: await this.runTestCategory('Command Tests'),
      coreTests: await this.runCoreTests(),
      performance: await this.runPerformanceTests()
    };

    return results;
  }

  async runTestCategory(category) {
    try {
      const output = execSync(`npx playwright test --grep "${category}"`, { 
        encoding: 'utf8',
        cwd: 'packages/core' 
      });
      
      // Parse Playwright output for pass/fail counts
      const passMatch = output.match(/(\d+) passed/);
      const failMatch = output.match(/(\d+) failed/);
      
      const passed = passMatch ? parseInt(passMatch[1]) : 0;
      const failed = failMatch ? parseInt(failMatch[1]) : 0;
      const total = passed + failed;
      
      return {
        category,
        passed,
        failed,
        total,
        compatibility: total > 0 ? (passed / total) * 100 : 0
      };
    } catch (error) {
      console.warn(`Warning: ${category} tests failed to run:`, error.message);
      return { category, passed: 0, failed: 0, total: 0, compatibility: 0 };
    }
  }

  async runCoreTests() {
    try {
      // Test specific expression categories to get meaningful data
      const expressionTestResult = await this.runExpressionTests();
      const commandTestResult = await this.runCommandTests();
      
      return {
        total: expressionTestResult.total + commandTestResult.total,
        passed: expressionTestResult.passed + commandTestResult.passed,
        passRate: expressionTestResult.total + commandTestResult.total > 0 ? 
          ((expressionTestResult.passed + commandTestResult.passed) / (expressionTestResult.total + commandTestResult.total)) * 100 : 0,
        expressionTests: expressionTestResult,
        commandTests: commandTestResult
      };
    } catch (error) {
      return { total: 0, passed: 0, passRate: 0, error: error.message };
    }
  }

  async runExpressionTests() {
    try {
      const output = execSync('cd packages/core && npm test src/expressions/conversion/index.test.ts', {
        encoding: 'utf8',
        timeout: 30000,
        shell: true
      });
      
      // Count test results
      const passMatches = output.match(/✓/g);
      const failMatches = output.match(/×/g);
      
      const passed = passMatches ? passMatches.length : 0;
      const failed = failMatches ? failMatches.length : 0;
      
      return {
        category: 'expressions',
        passed,
        failed,
        total: passed + failed,
        compatibility: passed + failed > 0 ? (passed / (passed + failed)) * 100 : 0
      };
    } catch (error) {
      return { category: 'expressions', passed: 0, failed: 1, total: 1, compatibility: 0 };
    }
  }

  async runCommandTests() {
    try {
      const output = execSync('cd packages/core && npm test src/commands/data/set.test.ts', {
        encoding: 'utf8',
        timeout: 30000,
        shell: true
      });
      
      // Count test results
      const passMatches = output.match(/✓/g);
      const failMatches = output.match(/×/g);
      
      const passed = passMatches ? passMatches.length : 0;
      const failed = failMatches ? failMatches.length : 0;
      
      return {
        category: 'commands',
        passed,
        failed,
        total: passed + failed,
        compatibility: passed + failed > 0 ? (passed / (passed + failed)) * 100 : 0
      };
    } catch (error) {
      return { category: 'commands', passed: 0, failed: 1, total: 1, compatibility: 0 };
    }
  }

  async runPerformanceTests() {
    // Placeholder for performance benchmarks
    return {
      expressionEvalTime: '< 1ms',
      memoryUsage: 'baseline',
      bundleSize: 'optimized'
    };
  }

  analyzeGaps(results) {
    const gaps = [];
    
    if (results.expressionTests.compatibility < this.thresholds.expressionCompatibility) {
      gaps.push({
        area: 'expressions',
        current: results.expressionTests.compatibility,
        target: this.thresholds.expressionCompatibility,
        priority: 'high'
      });
    }
    
    if (results.commandTests.compatibility < this.thresholds.commandCompatibility) {
      gaps.push({
        area: 'commands', 
        current: results.commandTests.compatibility,
        target: this.thresholds.commandCompatibility,
        priority: 'medium'
      });
    }

    return gaps;
  }

  saveMetrics(results) {
    let history = [];
    
    if (existsSync(this.metricsFile)) {
      try {
        history = JSON.parse(readFileSync(this.metricsFile, 'utf8'));
      } catch (error) {
        console.warn('Could not read existing metrics, starting fresh');
      }
    }
    
    history.push(results);
    
    // Keep only last 30 days of metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    history = history.filter(entry => new Date(entry.timestamp) > thirtyDaysAgo);
    
    writeFileSync(this.metricsFile, JSON.stringify(history, null, 2));
    console.log(`📊 Metrics saved to ${this.metricsFile}`);
  }

  generateReport(results, gaps) {
    console.log('\n=== HyperFixi Compatibility Report ===');
    console.log(`🗓️  Generated: ${results.timestamp}`);
    console.log(`\n📈 Compatibility Scores:`);
    console.log(`   Expression Tests: ${results.expressionTests.compatibility.toFixed(1)}%`);
    console.log(`   Command Tests: ${results.commandTests.compatibility.toFixed(1)}%`);
    console.log(`   Core Test Pass Rate: ${results.coreTests.passRate}%`);
    
    if (gaps.length > 0) {
      console.log(`\n🎯 Improvement Targets:`);
      gaps.forEach(gap => {
        console.log(`   ${gap.area}: ${gap.current.toFixed(1)}% → ${gap.target}% (${gap.priority} priority)`);
      });
    } else {
      console.log(`\n✅ All compatibility targets met!`);
    }
    
    console.log('\n🔄 Next Steps:');
    console.log('   1. Focus on highest priority gaps');
    console.log('   2. Run targeted test improvements');
    console.log('   3. Verify no regressions in core functionality');
  }
}

// Main execution
async function main() {
  const monitor = new CompatibilityMonitor();
  
  try {
    console.log('🚀 Starting HyperFixi compatibility monitoring...\n');
    
    const results = await monitor.runCompatibilityTests();
    const gaps = monitor.analyzeGaps(results);
    
    monitor.saveMetrics(results);
    monitor.generateReport(results, gaps);
    
    // Exit with error code if critical gaps exist
    const criticalGaps = gaps.filter(gap => gap.priority === 'high');
    process.exit(criticalGaps.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}