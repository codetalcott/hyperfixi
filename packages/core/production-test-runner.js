#!/usr/bin/env node

/**
 * Production Test Runner - Minimal logging to prevent memory issues
 * Optimized for automated testing without verbose debug output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production DOM polyfill
function setupProductionEnvironment() {
    if (typeof globalThis !== 'undefined' && !globalThis.HTMLElement) {
        globalThis.HTMLElement = class HTMLElement {};
        globalThis.document = {
            createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }),
            querySelector: () => null,
            querySelectorAll: () => []
        };
        globalThis.window = globalThis;
    }

    // Suppress verbose debug logging in production
    if (process.env.NODE_ENV === 'production' || process.argv.includes('--quiet')) {
        const originalLog = console.log;
        console.log = (...args) => {
            const message = args[0];
            if (typeof message === 'string') {
                // Only show important messages, suppress debug spam
                if (message.includes('🚀') || 
                    message.includes('✅') || 
                    message.includes('❌') || 
                    message.includes('📊') ||
                    message.includes('🎉') ||
                    message.includes('⚠️') ||
                    (!message.includes('🔍') && 
                     !message.includes('TOKENIZER') && 
                     !message.includes('PARSER') &&
                     !message.includes('COMPILE:'))) {
                    originalLog.apply(console, args);
                }
            } else {
                // Allow non-string logs through
                originalLog.apply(console, args);
            }
        };
    }
}

class ProductionTestRunner {
    constructor(options = {}) {
        this.options = {
            quiet: options.quiet || process.argv.includes('--quiet'),
            json: options.json || process.argv.includes('--json'),
            suite: options.suite || 'nodeCompilation',
            outputFile: options.outputFile || 'production-test-results.json'
        };
        
        this.results = [];
        this.startTime = Date.now();
        
        setupProductionEnvironment();
    }

    async runNodeCompilationTests() {
        const tests = [
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
            { name: 'Possessive expression', code: 'log my className' },
            { name: 'Complex compound', code: 'on click add .highlight to #target then wait 1s then remove .highlight from #target' }
        ];

        console.log('🧪 Running Node.js Compilation Tests (Production Mode)...');
        
        try {
            const { hyperscript } = await import('./dist/index.mjs');
            
            if (!hyperscript || !hyperscript.compile) {
                throw new Error('hyperscript.compile not available');
            }

            let passed = 0;
            let failed = 0;

            for (const test of tests) {
                const testStart = Date.now();
                
                try {
                    const result = hyperscript.compile(test.code);
                    const duration = testStart ? Date.now() - testStart : 0;
                    
                    if (result && result.success) {
                        console.log(`✅ PASS: ${test.name}`);
                        passed++;
                        this.results.push({
                            timestamp: new Date().toISOString(),
                            suite: 'nodeCompilation',
                            test: test.name,
                            result: 'PASS',
                            details: { code: test.code, duration }
                        });
                    } else {
                        console.log(`❌ FAIL: ${test.name}`);
                        failed++;
                        this.results.push({
                            timestamp: new Date().toISOString(),
                            suite: 'nodeCompilation',
                            test: test.name,
                            result: 'FAIL',
                            details: { 
                                code: test.code, 
                                duration,
                                errors: result.errors || []
                            }
                        });
                        
                        if (result.errors && result.errors.length > 0) {
                            result.errors.forEach(err => console.log(`   Error: ${err.message}`));
                        }
                    }
                } catch (error) {
                    const duration = testStart ? Date.now() - testStart : 0;
                    console.log(`❌ FAIL: ${test.name} - Exception: ${error.message}`);
                    failed++;
                    this.results.push({
                        timestamp: new Date().toISOString(),
                        suite: 'nodeCompilation',
                        test: test.name,
                        result: 'FAIL',
                        details: { 
                            code: test.code, 
                            duration,
                            error: error.message 
                        }
                    });
                }
            }

            return { passed, failed, total: tests.length };
        } catch (error) {
            console.error('❌ Node compilation tests failed to run:', error.message);
            return { passed: 0, failed: 0, total: 0, error: error.message };
        }
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        const passed = this.results.filter(r => r.result === 'PASS').length;
        const failed = this.results.filter(r => r.result === 'FAIL').length;
        const total = passed + failed;
        const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        const report = {
            timestamp: new Date().toISOString(),
            mode: 'production',
            summary: {
                total,
                passed,
                failed,
                successRate,
                duration
            },
            results: this.results,
            suites: {
                nodeCompilation: {
                    passed,
                    failed,
                    total,
                    successRate
                }
            }
        };

        // Save report
        const outputPath = path.join(process.cwd(), this.options.outputFile);
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

        // Console summary
        console.log('\n📊 Production Test Results:');
        console.log(`   Total Tests: ${total}`);
        console.log(`   Passed: ${passed} (${successRate}%)`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Duration: ${Math.round(duration / 1000)}s`);
        console.log(`   Report: ${outputPath}`);

        if (this.options.json) {
            console.log('\n📄 JSON Report:');
            console.log(JSON.stringify(report, null, 2));
        }

        return report;
    }

    async run() {
        console.log('🚀 Production Test Runner');
        console.log(`🎛️  Mode: ${this.options.quiet ? 'Quiet' : 'Normal'} Logging`);
        console.log(`📋 Suite: ${this.options.suite}\n`);

        let testResults;
        switch (this.options.suite) {
            case 'nodeCompilation':
                testResults = await this.runNodeCompilationTests();
                break;
            default:
                throw new Error(`Unknown test suite: ${this.options.suite}`);
        }

        const report = await this.generateReport();
        
        if (testResults.error) {
            console.log(`\n⚠️  Suite execution had errors: ${testResults.error}`);
        }

        if (report.summary.failed > 0) {
            console.log('\n❌ Some tests failed.');
            process.exit(1);
        } else {
            console.log('\n🎉 All tests passed!');
            process.exit(0);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        console.log(`
🧪 Production Test Runner

Usage:
  node production-test-runner.js [options]

Options:
  --quiet              Suppress verbose debug logging (recommended)
  --json               Output detailed JSON results
  --suite=SUITE        Test suite to run (default: nodeCompilation)
  --output=FILE        Output file (default: production-test-results.json)
  --help               Show this help

Examples:
  node production-test-runner.js --quiet
  node production-test-runner.js --json --output=my-results.json
  NODE_ENV=production node production-test-runner.js
`);
        return;
    }

    const options = {
        quiet: args.includes('--quiet'),
        json: args.includes('--json'),
        suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1] || 'nodeCompilation',
        outputFile: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'production-test-results.json'
    };

    const runner = new ProductionTestRunner(options);
    await runner.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Production test runner failed:', error.message);
        process.exit(1);
    });
}

export default ProductionTestRunner;