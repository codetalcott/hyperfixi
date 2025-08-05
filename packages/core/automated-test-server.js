#!/usr/bin/env node

/**
 * Automated Test Server - Eliminates Manual Intervention in Testing
 * 
 * Features:
 * - Real-time WebSocket feedback (no manual copy/paste)
 * - Consolidated test runner from scattered HTML files
 * - File watching for automatic re-testing
 * - Structured JSON results for programmatic analysis
 * - Browser + Node.js test execution
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const chokidar = require('chokidar');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

class AutomatedTestServer {
    constructor() {
        this.port = 8765;
        this.results = [];
        this.clients = new Set();
        this.browser = null;
        this.testSuites = this.loadTestSuites();
        this.watching = false;
    }

    loadTestSuites() {
        return {
            // Node.js compilation tests
            nodeCompilation: {
                type: 'node',
                description: 'Node.js compilation tests for core functionality',
                tests: [
                    { name: 'Direct SET command', code: 'set myVar to "test"' },
                    { name: 'The X of Y pattern', code: 'set the textContent of #target to "test"' },
                    { name: 'Event handler basic', code: 'on click set myVar to "clicked"' },
                    { name: 'Event handler X of Y', code: 'on click set the textContent of #target to "clicked"' },
                    { name: 'Constructor call', code: 'set myVar to new Date()' },
                    { name: 'Function call', code: 'set myVar to Date()' },
                    { name: 'String concatenation', code: 'set myVar to "Hello " + "World"' },
                    { name: 'Enhanced increment', code: 'increment counter' },
                    { name: 'Enhanced decrement', code: 'decrement counter by 5' }
                ]
            },

            // Browser execution tests (from hyperfixi-demo.html)
            browserExecution: {
                type: 'browser',
                description: 'Browser execution tests with DOM manipulation',
                url: 'http://localhost:3000/hyperfixi-demo.html',
                tests: 'automated' // Uses existing automated test suite
            },

            // Specific debug scenarios (from scattered HTML files)
            debugScenarios: {
                type: 'browser',
                description: 'Specific debug scenarios from individual test files',
                scenarios: [
                    {
                        name: 'The X of Y Pattern Debug',
                        url: 'http://localhost:3000/test-debug-verification.html',
                        expect: 'compilation success'
                    },
                    {
                        name: 'Constructor Call Debug',
                        url: 'http://localhost:3000/immediate-debug-test.html',
                        expect: 'new Date() execution'
                    },
                    {
                        name: 'Set Command Fix',
                        url: 'http://localhost:3000/test-set-fix.html',
                        expect: 'SET command working'
                    }
                ]
            },

            // Official compatibility tests
            compatibility: {
                type: 'playwright',
                description: 'Official _hyperscript compatibility tests',
                command: 'npx playwright test --grep "Complete Official _hyperscript Test Suite" --reporter=json'
            }
        };
    }

    async start() {
        console.log('🚀 Starting Automated Test Server...');
        
        // Create HTTP server for WebSocket
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            console.log(`📱 Client connected (${this.clients.size} total)`);
            
            // Send recent results to new client
            ws.send(JSON.stringify({
                type: 'history',
                data: this.results.slice(-50)
            }));
            
            ws.on('close', () => {
                this.clients.delete(ws);
                console.log(`📱 Client disconnected (${this.clients.size} total)`);
            });
        });

        // Start server
        this.server.listen(this.port, () => {
            console.log(`🌐 Test server running on ws://localhost:${this.port}`);
            console.log(`📊 Access dashboard: http://localhost:${this.port}/dashboard`);
        });

        // Initialize browser for testing
        await this.initBrowser();
        
        // Run initial test suite
        await this.runAllTests();
        
        // Start file watching
        this.startFileWatching();
    }

    async initBrowser() {
        try {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            console.log('🌐 Browser initialized for testing');
        } catch (error) {
            console.error('❌ Failed to initialize browser:', error.message);
        }
    }

    broadcast(message) {
        const payload = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }

    logResult(testSuite, testName, result, details = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            suite: testSuite,
            test: testName,
            result: result ? 'PASS' : 'FAIL',
            details,
            duration: details.duration || 0
        };
        
        this.results.push(entry);
        console.log(`${result ? '✅' : '❌'} ${testSuite}/${testName}: ${result ? 'PASS' : 'FAIL'}`);
        
        // Broadcast to clients
        this.broadcast({
            type: 'result',
            data: entry
        });
    }

    async runNodeCompilationTests() {
        const suite = this.testSuites.nodeCompilation;
        console.log('\n🧪 Running Node.js Compilation Tests...');
        
        try {
            // Import hyperfixi
            const { hyperscript } = require('./dist/index.js');
            
            for (const test of suite.tests) {
                const startTime = Date.now();
                
                try {
                    const result = hyperscript.compile(test.code);
                    const duration = Date.now() - startTime;
                    
                    this.logResult('NodeCompilation', test.name, result.success, {
                        code: test.code,
                        errors: result.errors || [],
                        duration
                    });
                } catch (error) {
                    const duration = Date.now() - startTime;
                    this.logResult('NodeCompilation', test.name, false, {
                        code: test.code,
                        error: error.message,
                        duration
                    });
                }
            }
        } catch (error) {
            console.error('❌ Failed to load hyperfixi for Node tests:', error.message);
        }
    }

    async runBrowserExecutionTests() {
        if (!this.browser) {
            console.log('⚠️  Browser not available, skipping browser tests');
            return;
        }

        console.log('\n🌐 Running Browser Execution Tests...');
        
        try {
            const page = await this.browser.newPage();
            
            // Enable console capture
            const consoleMessages = [];
            page.on('console', msg => {
                consoleMessages.push({
                    type: msg.type(),
                    text: msg.text(),
                    timestamp: Date.now()
                });
            });
            
            // Navigate to demo page
            await page.goto('file://' + path.join(__dirname, 'hyperfixi-demo.html'), {
                waitUntil: 'networkidle0',
                timeout: 10000
            });
            
            // Wait for automated tests to complete
            await page.waitForFunction(() => {
                const results = document.getElementById('test-results');
                return results && results.textContent.includes('Test Suite Complete');
            }, { timeout: 30000 });
            
            // Extract test results
            const testResults = await page.evaluate(() => {
                const resultsDiv = document.getElementById('test-results');
                if (!resultsDiv) return [];
                
                const lines = resultsDiv.textContent.split('\n');
                return lines
                    .filter(line => line.includes('✅ PASS') || line.includes('❌ FAIL'))
                    .map(line => {
                        const match = line.match(/(✅ PASS|❌ FAIL): (.+?)(?:\s-\s(.+))?$/);
                        if (match) {
                            return {
                                result: match[1] === '✅ PASS',
                                name: match[2],
                                details: match[3] || ''
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);
            });
            
            // Log all browser test results
            testResults.forEach(test => {
                this.logResult('BrowserExecution', test.name, test.result, {
                    details: test.details,
                    consoleCount: consoleMessages.length
                });
            });
            
            await page.close();
            
        } catch (error) {
            this.logResult('BrowserExecution', 'Suite Error', false, {
                error: error.message
            });
        }
    }

    async runDebugScenarios() {
        if (!this.browser) return;
        
        console.log('\n🔍 Running Debug Scenarios...');
        
        for (const scenario of this.testSuites.debugScenarios.scenarios) {
            try {
                const page = await this.browser.newPage();
                const startTime = Date.now();
                
                // Navigate to scenario page
                const url = scenario.url.replace('http://localhost:3000', 'file://' + __dirname);
                await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
                
                // Wait for test completion (look for specific indicators)
                await page.waitForTimeout(2000);
                
                // Extract results based on scenario type
                const result = await page.evaluate((expectation) => {
                    const output = document.querySelector('.debug-output, .console-output, #test-results, #console-output');
                    if (!output) return false;
                    
                    const text = output.textContent || output.innerText;
                    
                    // Check for success indicators based on expectation
                    if (expectation.includes('compilation success')) {
                        return text.includes('SUCCESS') && !text.includes('FAILED');
                    }
                    if (expectation.includes('new Date()')) {
                        return text.includes('new Date()') && text.includes('SUCCESS');
                    }
                    if (expectation.includes('SET command')) {
                        return text.includes('SET') && text.includes('SUCCESS');
                    }
                    
                    return !text.includes('FAILED') && !text.includes('❌');
                }, scenario.expect);
                
                const duration = Date.now() - startTime;
                this.logResult('DebugScenarios', scenario.name, result, {
                    url: scenario.url,
                    expectation: scenario.expect,
                    duration
                });
                
                await page.close();
                
            } catch (error) {
                this.logResult('DebugScenarios', scenario.name, false, {
                    error: error.message
                });
            }
        }
    }

    async runCompatibilityTests() {
        console.log('\n🧪 Running Compatibility Tests...');
        
        return new Promise((resolve) => {
            const startTime = Date.now();
            const proc = spawn('npx', ['playwright', 'test', '--grep', 'Complete Official _hyperscript Test Suite', '--reporter=json'], {
                cwd: __dirname,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let output = '';
            proc.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            proc.on('close', (code) => {
                const duration = Date.now() - startTime;
                
                try {
                    const results = JSON.parse(output);
                    const passed = results.stats?.passed || 0;
                    const failed = results.stats?.failed || 0;
                    const total = passed + failed;
                    
                    this.logResult('Compatibility', 'Official Suite', code === 0, {
                        passed,
                        failed,
                        total,
                        duration,
                        successRate: total > 0 ? Math.round((passed / total) * 100) : 0
                    });
                } catch (error) {
                    this.logResult('Compatibility', 'Official Suite', false, {
                        error: 'Failed to parse test results',
                        duration
                    });
                }
                
                resolve();
            });
        });
    }

    async runAllTests() {
        console.log('\n🎯 Running Complete Test Suite...');
        const suiteStart = Date.now();
        
        this.broadcast({
            type: 'suite_start',
            data: { timestamp: new Date().toISOString() }
        });
        
        await this.runNodeCompilationTests();
        await this.runBrowserExecutionTests();
        await this.runDebugScenarios();
        await this.runCompatibilityTests();
        
        const duration = Date.now() - suiteStart;
        const summary = this.generateSummary();
        
        console.log('\n📊 Test Suite Summary:');
        console.log(`   Total Tests: ${summary.total}`);
        console.log(`   Passed: ${summary.passed} (${summary.successRate}%)`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   Duration: ${duration}ms`);
        
        this.broadcast({
            type: 'suite_complete',
            data: { summary, duration, timestamp: new Date().toISOString() }
        });
    }

    generateSummary() {
        const recent = this.results.slice(-100); // Last 100 tests
        const passed = recent.filter(r => r.result === 'PASS').length;
        const failed = recent.filter(r => r.result === 'FAIL').length;
        const total = passed + failed;
        
        return {
            total,
            passed,
            failed,
            successRate: total > 0 ? Math.round((passed / total) * 100) : 0,
            recentTests: recent.slice(-10) // Last 10 for quick view
        };
    }

    startFileWatching() {
        if (this.watching) return;
        
        console.log('\n👁️  Starting file watcher for automatic re-testing...');
        
        const watcher = chokidar.watch([
            'src/**/*.ts',
            'src/**/*.js',
            'dist/**/*.js',
            'dist/**/*.mjs'
        ], {
            ignored: /node_modules/,
            persistent: true,
            ignoreInitial: true
        });
        
        let debounceTimer;
        watcher.on('change', (path) => {
            console.log(`📝 File changed: ${path}`);
            
            // Debounce multiple rapid changes
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                console.log('🔄 Auto-running tests due to file changes...');
                await this.runAllTests();
            }, 2000);
        });
        
        this.watching = true;
    }

    async stop() {
        console.log('🛑 Stopping Automated Test Server...');
        
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.server) {
            this.server.close();
        }
    }
}

// CLI Interface
async function main() {
    const server = new AutomatedTestServer();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
    
    await server.start();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AutomatedTestServer;