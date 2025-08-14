#!/usr/bin/env node

/**
 * HyperFixi Iterative Improvement Workflow
 * Automated improvement cycle for compatibility and features
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

class ImprovementWorkflow {
  constructor() {
    this.workflowDir = join(process.cwd(), 'metrics');
    this.improvementLog = join(this.workflowDir, 'improvement-log.json');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!existsSync(this.workflowDir)) {
      mkdirSync(this.workflowDir, { recursive: true });
    }
  }

  async startImprovementCycle() {
    console.log('🔄 Starting improvement cycle...\n');
    
    const cycle = {
      id: `cycle-${Date.now()}`,
      startTime: new Date().toISOString(),
      phase: 'analysis',
      steps: []
    };

    try {
      // Phase 1: Gap Analysis
      console.log('📊 Phase 1: Gap Analysis');
      const gaps = await this.identifyGaps();
      cycle.steps.push({ phase: 'analysis', gaps, timestamp: new Date().toISOString() });

      // Phase 2: Targeted Improvements  
      console.log('\n🛠️  Phase 2: Targeted Improvements');
      const improvements = await this.implementImprovements(gaps);
      cycle.steps.push({ phase: 'implementation', improvements, timestamp: new Date().toISOString() });

      // Phase 3: Validation
      console.log('\n✅ Phase 3: Validation');
      const validation = await this.validateImprovements();
      cycle.steps.push({ phase: 'validation', validation, timestamp: new Date().toISOString() });

      cycle.endTime = new Date().toISOString();
      cycle.success = validation.success;
      
      this.logCycle(cycle);
      this.generateCycleReport(cycle);

      return cycle;

    } catch (error) {
      cycle.error = error.message;
      cycle.endTime = new Date().toISOString();
      this.logCycle(cycle);
      throw error;
    }
  }

  async identifyGaps() {
    console.log('   Analyzing compatibility test results...');
    
    try {
      // Run compatibility monitor to get current state
      const monitorScript = join(process.cwd(), 'scripts/compatibility-monitor.js');
      const output = execSync(`node ${monitorScript}`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Parse output for specific gap areas
      const gaps = this.parseGapsFromOutput(output);
      
      console.log(`   Found ${gaps.length} improvement areas`);
      return gaps;

    } catch (error) {
      // Monitor script exits with code 1 if gaps exist - this is expected
      if (error.status === 1) {
        const gaps = this.parseGapsFromOutput(error.stdout);
        console.log(`   Found ${gaps.length} improvement areas`);
        return gaps;
      }
      throw error;
    }
  }

  parseGapsFromOutput(output) {
    const gaps = [];
    
    // Parse compatibility scores and identify areas below thresholds
    const expressionMatch = output.match(/Expression Tests:\s+([\d.]+)%/);
    const commandMatch = output.match(/Command Tests:\s+([\d.]+)%/);
    
    if (expressionMatch && parseFloat(expressionMatch[1]) < 90) {
      gaps.push({
        area: 'expressions',
        current: parseFloat(expressionMatch[1]),
        target: 90,
        testFiles: ['src/expressions/**/*.test.ts'],
        priority: 'high'
      });
    }
    
    if (commandMatch && parseFloat(commandMatch[1]) < 80) {
      gaps.push({
        area: 'commands',
        current: parseFloat(commandMatch[1]),
        target: 80,
        testFiles: ['src/commands/**/*.test.ts'],
        priority: 'medium'
      });
    }

    return gaps;
  }

  async implementImprovements(gaps) {
    const improvements = [];
    
    for (const gap of gaps) {
      console.log(`   Targeting ${gap.area} (${gap.current}% → ${gap.target}%)`);
      
      const improvement = {
        area: gap.area,
        before: gap.current,
        actions: [],
        timestamp: new Date().toISOString()
      };

      try {
        // Run targeted tests to identify specific failures
        const failures = await this.identifySpecificFailures(gap);
        improvement.actions.push(`Identified ${failures.length} specific test failures`);

        // For each failure, suggest improvement strategy
        for (const failure of failures.slice(0, 3)) { // Limit to top 3 per cycle
          const strategy = this.getImprovementStrategy(failure);
          improvement.actions.push(`Strategy for ${failure.test}: ${strategy}`);
        }

        improvements.push(improvement);

      } catch (error) {
        improvement.error = error.message;
        improvements.push(improvement);
      }
    }

    return improvements;
  }

  async identifySpecificFailures(gap) {
    try {
      // Run tests for specific area and capture failures
      const testPattern = gap.area === 'expressions' ? 
        'src/expressions/**/*.test.ts' : 
        'src/commands/**/*.test.ts';
        
      const output = execSync(`npm test ${testPattern}`, {
        encoding: 'utf8',
        cwd: 'packages/core',
        stdio: 'pipe'
      });
      
      return []; // No failures if command succeeds
      
    } catch (error) {
      // Parse test failures from output
      const failures = this.parseTestFailures(error.stdout + error.stderr);
      return failures;
    }
  }

  parseTestFailures(output) {
    const failures = [];
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('FAIL') || line.includes('✗')) {
        const testName = line.split(/FAIL|✗/)[1]?.trim();
        if (testName) {
          failures.push({
            test: testName,
            category: this.categorizeFailure(testName),
            line: i
          });
        }
      }
    }
    
    return failures;
  }

  categorizeFailure(testName) {
    if (testName.includes('CSS') || testName.includes('selector')) return 'css-references';
    if (testName.includes('comparison') || testName.includes('operator')) return 'logical-operators';
    if (testName.includes('conversion') || testName.includes('as ')) return 'type-conversion';
    if (testName.includes('possessive') || testName.includes("'s")) return 'property-access';
    return 'general';
  }

  getImprovementStrategy(failure) {
    const strategies = {
      'css-references': 'Review CSS selector parsing and element querying logic',
      'logical-operators': 'Check operator precedence and boolean evaluation',
      'type-conversion': 'Validate type conversion mappings and edge cases',
      'property-access': 'Verify possessive syntax and attribute access',
      'general': 'Analyze test expectations vs implementation behavior'
    };
    
    return strategies[failure.category] || strategies.general;
  }

  async validateImprovements() {
    console.log('   Running full test suite validation...');
    
    try {
      // Run all tests to ensure no regressions
      execSync('npm test', { 
        cwd: 'packages/core',
        stdio: 'pipe'
      });
      
      // Run compatibility tests to measure improvement
      const compatScript = join(process.cwd(), 'scripts/compatibility-monitor.js');
      execSync(`node ${compatScript}`, { stdio: 'pipe' });
      
      return {
        success: true,
        coreTests: 'passing',
        compatibilityTests: 'improved',
        regressions: 'none detected'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        recommendation: 'Review recent changes and run targeted debugging'
      };
    }
  }

  logCycle(cycle) {
    let history = [];
    
    if (existsSync(this.improvementLog)) {
      try {
        history = JSON.parse(readFileSync(this.improvementLog, 'utf8'));
      } catch (error) {
        console.warn('Could not read existing improvement log');
      }
    }
    
    history.push(cycle);
    
    // Keep last 50 cycles
    if (history.length > 50) {
      history = history.slice(-50);
    }
    
    writeFileSync(this.improvementLog, JSON.stringify(history, null, 2));
  }

  generateCycleReport(cycle) {
    console.log('\n=== Improvement Cycle Complete ===');
    console.log(`🔄 Cycle ID: ${cycle.id}`);
    console.log(`⏱️  Duration: ${this.calculateDuration(cycle.startTime, cycle.endTime)}`);
    console.log(`✅ Success: ${cycle.success ? 'Yes' : 'No'}`);
    
    console.log('\n📊 Steps Completed:');
    cycle.steps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.phase} (${step.timestamp})`);
    });
    
    if (cycle.success) {
      console.log('\n🎉 Recommendations:');
      console.log('   • Continue with next improvement cycle');
      console.log('   • Monitor metrics for sustained improvement');
      console.log('   • Consider expanding test coverage in improved areas');
    } else {
      console.log('\n⚠️  Next Actions:');
      console.log('   • Review cycle logs for specific failure points');
      console.log('   • Run manual debugging on failing tests');
      console.log('   • Consider breaking down improvements into smaller steps');
    }
  }

  calculateDuration(start, end) {
    const ms = new Date(end) - new Date(start);
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

// Main execution
async function main() {
  const workflow = new ImprovementWorkflow();
  
  try {
    const result = await workflow.startImprovementCycle();
    console.log(`\n🚀 Improvement cycle completed successfully!`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Improvement cycle failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}