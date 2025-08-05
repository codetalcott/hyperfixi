#!/usr/bin/env node

/**
 * Unified Test Runner - Consolidates scattered test functionality
 * 
 * Works with existing dependencies and provides:
 * - Automated test execution without manual intervention
 * - Structured JSON results for programmatic analysis  
 * - Consolidated reporting from all test scenarios
 * - File-based result persistence for iteration tracking
 * 
 * Usage:
 *   node unified-test-runner.js [--watch] [--json] [--suite=SUITE_NAME]
 */

import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UnifiedTestRunner {
    constructor(options = {}) {
        this.options = {
            watch: options.watch || false,
            json: options.json || false,
            suite: options.suite || 'all',
            outputFile: options.outputFile || 'test-results.json',
            ...options
        };
        
        this.results = [];
        this.testSuites = this.defineTestSuites();
        this.startTime = Date.now();
    }

    defineTestSuites() {
        return {
            nodeCompilation: {
                name: 'Node.js Compilation Tests',
                type: 'node',
                tests: [
                    { name: 'Simple SET command', code: 'set myVar to "test"' },
                    { name: 'The X of Y pattern', code: 'set the textContent of #target to "test"' },
                    { name: 'Event handler basic', code: 'on click set myVar to "clicked"' },
                    { name: 'Event handler X of Y', code: 'on click set the textContent of #target to "clicked"' },
                    { name: 'Constructor call', code: 'set myVar to new Date()' },
                    { name: 'Function call', code: 'set myVar to Date()' },
                    { name: 'String concatenation', code: 'set myVar to "Hello " + "World"' },
                    { name: 'Mathematical expression', code: 'set result to (5 + 3) * 2' },
                    { name: 'Enhanced increment', code: 'increment counter' },
                    { name: 'Enhanced decrement', code: 'decrement counter by 5' },
                    { name: 'Complex compound', code: 'on click add .highlight to #target then wait 1s then remove .highlight from #target' }
                ]
            },

            browserCompatibility: {
                name: 'Browser Compatibility Tests', 
                type: 'playwright',
                command: 'npx playwright test --grep "Complete Official _hyperscript Test Suite" --reporter=json --output-dir=test-results'
            },

            unitTests: {
                name: 'Unit Test Suite',
                type: 'vitest',
                command: 'npm test -- --reporter=json --outputFile=test-results/unit-results.json'
            },

            expresssionTests: {
                name: 'Expression System Tests',
                type: 'vitest', 
                command: 'npm test src/expressions/ -- --reporter=json --outputFile=test-results/expression-results.json'
            }
        };
    }

    async runAllSuites() {
        console.log('🚀 Starting Unified Test Runner...');
        console.log(`📊 Running ${this.options.suite === 'all' ? 'all' : this.options.suite} test suites`);
        
        const suitesToRun = this.options.suite === 'all' 
            ? Object.keys(this.testSuites)
            : [this.options.suite];

        for (const suiteName of suitesToRun) {
            if (!this.testSuites[suiteName]) {
                console.error(`❌ Unknown test suite: ${suiteName}`);
                continue;
            }

            await this.runSuite(suiteName, this.testSuites[suiteName]);
        }

        await this.generateReport();
    }

    async runSuite(suiteName, suite) {
        console.log(`\n🧪 Running ${suite.name}...`);
        const suiteStart = Date.now();

        try {
            switch (suite.type) {
                case 'node':
                    await this.runNodeTests(suiteName, suite);
                    break;
                case 'playwright':
                    await this.runPlaywrightTests(suiteName, suite);
                    break;
                case 'vitest':
                    await this.runVitestTests(suiteName, suite);
                    break;
                default:
                    console.warn(`⚠️  Unknown suite type: ${suite.type}`);
            }
        } catch (error) {
            this.logResult(suiteName, 'Suite Error', false, {
                error: error.message,
                type: 'suite_error'
            });
        }

        const suiteDuration = Date.now() - suiteStart;
        console.log(`✅ ${suite.name} completed in ${suiteDuration}ms`);
    }

    async runNodeTests(suiteName, suite) {
        try {
            // Set up DOM polyfills for Node.js environment
            if (typeof global !== 'undefined' && !global.HTMLElement) {
                global.HTMLElement = class HTMLElement {};
                global.document = {
                    createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }),
                    querySelector: () => null,
                    querySelectorAll: () => []
                };
                global.window = global;
            }
            
            // Try to load hyperfixi module
            let hyperscript;
            try {
                // Try ES module first
                const module = await import('./dist/index.mjs');
                hyperscript = module.hyperscript || module.default;
                console.log('✅ Loaded hyperscript from ES module, available methods:', Object.keys(hyperscript || {}));
            } catch (esError) {
                console.error('❌ Could not load hyperfixi ES module:', esError.message);
                return;
            }

            if (!hyperscript || !hyperscript.compile) {
                console.error('❌ hyperscript.compile not available');
                return;
            }

            for (const test of suite.tests) {
                const testStart = Date.now();
                
                try {
                    const result = hyperscript.compile(test.code);
                    const duration = Date.now() - testStart;
                    
                    this.logResult(suiteName, test.name, result.success, {
                        code: test.code,
                        errors: result.errors || [],
                        duration,
                        type: 'compilation'
                    });
                } catch (error) {
                    const duration = Date.now() - testStart;
                    this.logResult(suiteName, test.name, false, {
                        code: test.code,
                        error: error.message,
                        duration,
                        type: 'compilation'
                    });
                }
            }
        } catch (error) {
            console.error('❌ Node test suite failed:', error.message);
        }
    }

    async runPlaywrightTests(suiteName, suite) {
        return new Promise((resolve) => {
            console.log(`🎭 Running Playwright tests: ${suite.command}`);
            
            const [cmd, ...args] = suite.command.split(' ');
            const proc = spawn(cmd, args, {
                cwd: process.cwd(),
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            proc.stdout.on('data', (data) => {
                output += data.toString();
            });

            proc.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            proc.on('close', (code) => {
                try {
                    // Try to parse JSON output
                    const results = JSON.parse(output);
                    this.parsePlaywrightResults(suiteName, results);
                } catch (parseError) {
                    // Fallback: parse text output
                    this.parsePlaywrightTextOutput(suiteName, output, errorOutput, code);
                }
                resolve();
            });
        });
    }

    async runVitestTests(suiteName, suite) {
        return new Promise((resolve) => {
            console.log(`⚡ Running Vitest tests: ${suite.command}`);
            
            const [cmd, ...args] = suite.command.split(' ');
            const proc = spawn(cmd, args, {
                cwd: process.cwd(),
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true
            });

            let output = '';
            proc.stdout.on('data', (data) => {
                output += data.toString();
            });

            proc.on('close', (code) => {
                this.parseVitestOutput(suiteName, output, code);
                resolve();
            });
        });
    }

    parsePlaywrightResults(suiteName, results) {
        if (results.suites) {
            results.suites.forEach(suite => {
                suite.specs?.forEach(spec => {
                    const passed = spec.tests?.every(test => test.results?.every(result => result.status === 'passed')) || false;
                    this.logResult(suiteName, spec.title, passed, {
                        type: 'playwright',
                        file: spec.file,
                        tests: spec.tests?.length || 0
                    });
                });
            });
        } else {
            // Fallback summary
            const stats = results.stats || {};
            this.logResult(suiteName, 'Playwright Summary', stats.failed === 0, {
                type: 'summary',
                passed: stats.passed || 0,
                failed: stats.failed || 0,
                total: (stats.passed || 0) + (stats.failed || 0)
            });
        }
    }

    parsePlaywrightTextOutput(suiteName, output, errorOutput, code) {
        // Parse text-based output for test results
        const lines = output.split('\n');
        let passed = 0, failed = 0;

        lines.forEach(line => {
            if (line.includes('✓') || line.includes('passed')) {
                passed++;
            } else if (line.includes('✗') || line.includes('failed')) {
                failed++;
            }
        });

        this.logResult(suiteName, 'Playwright Suite', code === 0, {
            type: 'playwright_summary',
            passed,
            failed,
            total: passed + failed,
            output: output.slice(-500) // Last 500 chars
        });
    }

    parseVitestOutput(suiteName, output, code) {
        // Parse Vitest output
        const lines = output.split('\n');
        let tests = [];
        
        lines.forEach(line => {
            if (line.includes('PASS') || line.includes('FAIL')) {
                const match = line.match(/(PASS|FAIL)\s+(.+)/);
                if (match) {
                    tests.push({
                        result: match[1] === 'PASS',
                        name: match[2].trim()
                    });
                }
            }
        });

        if (tests.length === 0) {
            // Fallback summary
            this.logResult(suiteName, 'Vitest Suite', code === 0, {
                type: 'vitest_summary',
                exitCode: code,
                output: output.slice(-500)
            });
        } else {
            tests.forEach(test => {
                this.logResult(suiteName, test.name, test.result, {
                    type: 'vitest'
                });
            });
        }
    }

    logResult(suite, testName, passed, details = {}) {
        const result = {
            timestamp: new Date().toISOString(),
            suite,
            test: testName,
            result: passed ? 'PASS' : 'FAIL',
            details
        };

        this.results.push(result);
        
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const duration = details.duration ? ` (${details.duration}ms)` : '';
        console.log(`  ${status}: ${testName}${duration}`);
        
        if (!passed && details.error) {
            console.log(`    Error: ${details.error}`);
        }
        if (!passed && details.errors && details.errors.length > 0) {
            console.log(`    Compilation errors: ${details.errors.length}`);
        }
    }

    async generateReport() {
        const duration = Date.now() - this.startTime;
        const passed = this.results.filter(r => r.result === 'PASS').length;
        const failed = this.results.filter(r => r.result === 'FAIL').length;
        const total = passed + failed;
        const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        const report = {
            summary: {
                total,
                passed,
                failed,
                successRate,
                duration,
                timestamp: new Date().toISOString()
            },
            results: this.results,
            suites: this.generateSuiteSummaries()
        };

        // Save JSON report
        const outputPath = path.join(process.cwd(), this.options.outputFile);
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

        // Console summary
        console.log('\n📊 Test Results Summary:');
        console.log(`   Total Tests: ${total}`);
        console.log(`   Passed: ${passed} (${successRate}%)`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Duration: ${Math.round(duration / 1000)}s`);
        console.log(`   Report saved: ${outputPath}`);

        if (this.options.json) {
            console.log('\n📄 JSON Report:');
            console.log(JSON.stringify(report, null, 2));
        }

        // Return for programmatic usage
        return report;
    }

    generateSuiteSummaries() {
        const suites = {};
        
        this.results.forEach(result => {
            if (!suites[result.suite]) {
                suites[result.suite] = { passed: 0, failed: 0, tests: [] };
            }
            
            suites[result.suite].tests.push(result);
            if (result.result === 'PASS') {
                suites[result.suite].passed++;
            } else {
                suites[result.suite].failed++;
            }
        });

        // Calculate success rates
        Object.keys(suites).forEach(suite => {
            const s = suites[suite];
            s.total = s.passed + s.failed;
            s.successRate = s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0;
        });

        return suites;
    }

    async watchAndRun() {
        console.log('👁️  Starting watch mode...');
        
        // Simple file watching using fs.watchFile (works without additional deps)
        const filesToWatch = [
            'src',
            'dist',
            'test'
        ].filter(dir => fs.existsSync(dir));

        const runTests = async () => {
            console.log('\n🔄 Files changed, re-running tests...');
            this.results = []; // Clear previous results
            this.startTime = Date.now();
            await this.runAllSuites();
        };

        // Watch directories for changes
        filesToWatch.forEach(dir => {
            this.watchDirectory(dir, runTests);
        });

        // Run initial tests
        await this.runAllSuites();
        
        console.log('👁️  Watching for file changes... (Press Ctrl+C to stop)');
        
        // Keep process alive
        process.stdin.resume();
    }

    watchDirectory(dir, callback) {
        let timeout;
        
        const debounce = () => {
            clearTimeout(timeout);
            timeout = setTimeout(callback, 2000); // Debounce 2 seconds
        };

        try {
            fs.watch(dir, { recursive: true }, (eventType, filename) => {
                if (filename && (filename.endsWith('.ts') || filename.endsWith('.js') || filename.endsWith('.mjs'))) {
                    console.log(`📝 Changed: ${filename}`);
                    debounce();
                }
            });
        } catch (error) {
            console.warn(`⚠️  Could not watch ${dir}:`, error.message);
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const options = {
        watch: args.includes('--watch'),
        json: args.includes('--json'),
        suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1] || 'all',
        outputFile: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'test-results.json'
    };

    const runner = new UnifiedTestRunner(options);

    try {
        if (options.watch) {
            await runner.watchAndRun();
        } else {
            const report = await runner.runAllSuites();
            process.exit(report.summary.failed > 0 ? 1 : 0);
        }
    } catch (error) {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down test runner...');
    process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}

export default UnifiedTestRunner;