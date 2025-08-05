#!/usr/bin/env node

/**
 * Automated Test Runner - Entry Point
 * 
 * Provides multiple test execution modes:
 * 1. Quick mode: Run unified test suite and save results
 * 2. Watch mode: Continuous testing with file watching
 * 3. Server mode: Start test server with WebSocket dashboard (requires additional deps)
 * 4. Analysis mode: Load and analyze previous test results
 * 
 * Usage:
 *   npm run test:auto           # Quick unified test run
 *   npm run test:auto -- --watch    # Watch mode
 *   npm run test:auto -- --analyze  # Analyze previous results
 *   npm run test:auto -- --help     # Help
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import UnifiedTestRunner from './unified-test-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function showHelp() {
    console.log(`
🧪 HyperFixi Automated Test System

This system eliminates manual intervention in testing by providing:
- Automated test execution across multiple test types
- Real-time result aggregation and analysis
- File watching for continuous testing
- Structured JSON output for programmatic analysis

Usage:
  node run-automated-tests.js [options]

Options:
  --quick              Run all tests once and exit (default)
  --watch              Watch files and re-run tests on changes
  --analyze            Analyze previous test results
  --suite=SUITE        Run specific test suite (nodeCompilation, browserCompatibility, unitTests, expresssionTests)
  --json               Output detailed JSON results
  --output=FILE        Save results to specific file (default: test-results.json)
  --help               Show this help

Examples:
  node run-automated-tests.js --quick
  node run-automated-tests.js --watch --suite=nodeCompilation
  node run-automated-tests.js --analyze
  node run-automated-tests.js --json --output=my-results.json

Available Test Suites:
  - nodeCompilation: Node.js compilation tests for core patterns
  - browserCompatibility: Official _hyperscript compatibility tests
  - unitTests: Vitest unit test suite
  - expresssionTests: Expression system specific tests
  - all: Run all suites (default)

Features:
✅ No manual copy/paste of console output
✅ Structured JSON results for analysis
✅ Consolidated reporting from scattered test files
✅ File watching for automated iteration
✅ Works with existing project dependencies
✅ Programmatic result access for CI/CD
`);
}

function analyzeResults() {
    const resultsFile = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'test-results.json';
    const resultsPath = path.join(process.cwd(), resultsFile);
    
    if (!fs.existsSync(resultsPath)) {
        console.log(`❌ No results file found at ${resultsPath}`);
        console.log('Run tests first to generate results');
        return;
    }

    try {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        console.log('📊 Test Results Analysis');
        console.log('=' .repeat(50));
        
        // Summary
        const summary = results.summary;
        console.log(`\nOverall Results:`);
        console.log(`  Total Tests: ${summary.total}`);
        console.log(`  Passed: ${summary.passed} (${summary.successRate}%)`);
        console.log(`  Failed: ${summary.failed}`);
        console.log(`  Duration: ${Math.round(summary.duration / 1000)}s`);
        console.log(`  Run Date: ${new Date(summary.timestamp).toLocaleString()}`);
        
        // Suite breakdown
        console.log(`\nSuite Breakdown:`);
        Object.entries(results.suites || {}).forEach(([suite, data]) => {
            console.log(`  ${suite}: ${data.passed}/${data.total} (${data.successRate}%)`);
        });
        
        // Recent failures
        const failures = results.results.filter(r => r.result === 'FAIL');
        if (failures.length > 0) {
            console.log(`\nRecent Failures (${Math.min(failures.length, 10)}):`);
            failures.slice(-10).forEach(failure => {
                console.log(`  ❌ ${failure.suite}/${failure.test}`);
                if (failure.details.error) {
                    console.log(`     ${failure.details.error}`);
                }
            });
        }
        
        // Trends (if multiple results exist)
        const resultHistory = loadResultHistory();
        if (resultHistory.length > 1) {
            console.log(`\nTrend Analysis:`);
            const current = resultHistory[resultHistory.length - 1];
            const previous = resultHistory[resultHistory.length - 2];
            
            const rateDiff = current.summary.successRate - previous.summary.successRate;
            const trend = rateDiff > 0 ? '📈 Improving' : rateDiff < 0 ? '📉 Declining' : '➡️  Stable';
            console.log(`  Success Rate Trend: ${trend} (${rateDiff > 0 ? '+' : ''}${rateDiff}%)`);
        }
        
    } catch (error) {
        console.error('❌ Failed to analyze results:', error.message);
    }
}

function loadResultHistory() {
    // Load multiple result files for trend analysis
    const historyDir = path.join(process.cwd(), 'test-history');
    if (!fs.existsSync(historyDir)) return [];
    
    try {
        return fs.readdirSync(historyDir)
            .filter(file => file.endsWith('.json'))
            .sort()
            .slice(-10) // Last 10 runs
            .map(file => {
                const content = fs.readFileSync(path.join(historyDir, file), 'utf8');
                return JSON.parse(content);
            });
    } catch (error) {
        return [];
    }
}

function saveToHistory(results) {
    // Save results to history for trend analysis
    const historyDir = path.join(process.cwd(), 'test-history');
    if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const historyFile = path.join(historyDir, `results-${timestamp}.json`);
    
    try {
        fs.writeFileSync(historyFile, JSON.stringify(results, null, 2));
        
        // Clean up old history files (keep last 20)
        const files = fs.readdirSync(historyDir)
            .filter(file => file.startsWith('results-') && file.endsWith('.json'))
            .sort();
            
        if (files.length > 20) {
            files.slice(0, files.length - 20).forEach(file => {
                fs.unlinkSync(path.join(historyDir, file));
            });
        }
    } catch (error) {
        console.warn('⚠️  Could not save to history:', error.message);
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        showHelp();
        return;
    }
    
    if (args.includes('--analyze')) {
        analyzeResults();
        return;
    }
    
    console.log('🚀 HyperFixi Automated Test System');
    console.log('🎯 Eliminating manual intervention in testing...\n');
    
    // Determine mode
    const watch = args.includes('--watch');
    const mode = watch ? 'watch' : 'quick';
    
    console.log(`📋 Mode: ${mode.toUpperCase()}`);
    
    // Parse options
    const options = {
        watch,
        json: args.includes('--json'),
        suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1] || 'all',
        outputFile: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'test-results.json'
    };
    
    console.log(`🎛️  Options: ${JSON.stringify(options, null, 2)}\n`);
    
    try {
        const runner = new UnifiedTestRunner(options);
        
        if (watch) {
            // Watch mode - runs continuously
            await runner.watchAndRun();
        } else {
            // Quick mode - run once
            const results = await runner.runAllSuites();
            
            // Save to history for trend analysis
            if (results) {
                saveToHistory(results);
            }
            
            // Print quick summary
            console.log('\n🎉 Automated testing complete!');
            if (results && results.summary) {
                console.log(`📊 Results: ${results.summary.passed}/${results.summary.total} passed (${results.summary.successRate}%)`);
                console.log(`💾 Full report saved to: ${options.outputFile}`);
                
                if (results.summary.failed > 0) {
                    console.log('\n❌ Some tests failed. Run with --analyze for detailed failure analysis.');
                    process.exit(1);
                } else {
                    console.log('\n✅ All tests passed!');
                }
            } else {
                console.log('⚠️  Test execution completed but no results available');
                console.log('Check for errors in test runner output above');
            }
        }
        
    } catch (error) {
        console.error('\n❌ Automated test system failed:', error.message);
        console.error('💡 Try running with --help for usage information');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down automated test system...');
    process.exit(0);
});

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Fatal error in automated test system:', error.message);
        process.exit(1);
    });
}

export { main, analyzeResults, loadResultHistory };