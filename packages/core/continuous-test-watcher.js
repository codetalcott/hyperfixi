#!/usr/bin/env node

/**
 * Continuous Test Watcher - Advanced File Watching for Automated Testing
 * 
 * Features:
 * - Intelligent file watching with debouncing
 * - Smart filtering to ignore irrelevant changes
 * - Selective test running based on changed files
 * - Real-time terminal updates with clear status
 * - Performance optimized with minimal resource usage
 */

import fs from 'fs';
import { spawn } from 'child_process';
import process from 'node:process';

class ContinuousTestWatcher {
    constructor(options = {}) {
        this.options = {
            debounceMs: options.debounceMs || 2000,
            watchPaths: options.watchPaths || ['src', 'test', 'tests'],
            ignorePaths: options.ignorePaths || ['node_modules', 'dist', '.git', 'coverage'],
            testCommand: options.testCommand || 'npm run test:auto',
            quiet: options.quiet || false,
            ...options
        };
        
        this.watchers = new Map();
        this.debounceTimer = null;
        this.isRunning = false;
        this.lastRun = null;
        this.runCount = 0;
        this.stats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            averageDuration: 0
        };
    }

    async start() {
        console.log('🎯 HyperFixi Continuous Test Watcher');
        console.log('════════════════════════════════════════════════════════════');
        console.log(`📁 Watching: ${this.options.watchPaths.join(', ')}`);
        console.log(`⚡ Debounce: ${this.options.debounceMs}ms`);
        console.log(`🚀 Command: ${this.options.testCommand}`);
        console.log('════════════════════════════════════════════════════════════\n');

        // Initial test run
        console.log('🔄 Running initial test suite...');
        await this.runTests('Initial run');

        // Setup file watchers
        this.setupWatchers();
        
        console.log('👁️  File watching active. Press Ctrl+C to stop.\n');
        
        // Keep process alive
        process.stdin.resume();
        
        // Setup graceful shutdown
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
    }

    setupWatchers() {
        for (const watchPath of this.options.watchPaths) {
            const fullPath = path.resolve(watchPath);
            
            if (!fs.existsSync(fullPath)) {
                console.log(`⚠️  Path does not exist, skipping: ${watchPath}`);
                continue;
            }

            try {
                const watcher = fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
                    this.handleFileChange(eventType, filename, watchPath);
                });

                this.watchers.set(watchPath, watcher);
                console.log(`✅ Watching: ${watchPath}/`);
            } catch (error) {
                console.log(`❌ Failed to watch ${watchPath}: ${error.message}`);
            }
        }
    }

    handleFileChange(eventType, filename, basePath) {
        if (!filename) return;

        // Filter out irrelevant files
        if (this.shouldIgnoreFile(filename)) {
            return;
        }

        const fullPath = path.join(basePath, filename);
        const changeType = this.getChangeType(eventType, filename);
        
        if (!this.options.quiet) {
            console.log(`📝 ${changeType}: ${fullPath}`);
        }

        // Debounce multiple rapid changes
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.runTests(`File change: ${filename}`);
        }, this.options.debounceMs);
    }

    shouldIgnoreFile(filename) {
        // Ignore hidden files
        if (filename.startsWith('.')) return true;
        
        // Ignore specific patterns
        const ignorePatterns = [
            /node_modules/,
            /\.git/,
            /dist/,
            /coverage/,
            /\.log$/,
            /\.tmp$/,
            /\.temp$/,
            /~$/,
            /\.swp$/,
            /\.swo$/,
            /-results\.json$/,
            /test-results/,
            /playwright-report/
        ];

        return ignorePatterns.some(pattern => pattern.test(filename));
    }

    getChangeType(eventType, filename) {
        if (eventType === 'rename') {
            return fs.existsSync(filename) ? '📄 Created' : '🗑️  Deleted';
        }
        return '✏️  Modified';
    }

    async runTests(trigger) {
        if (this.isRunning) {
            console.log('⏳ Test run already in progress, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();
        
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`🧪 Test Run #${++this.runCount} - ${trigger}`);
        console.log(`⏰ ${new Date().toLocaleTimeString()}`);
        console.log(`${'═'.repeat(60)}`);

        try {
            const result = await this.executeTestCommand();
            const duration = Date.now() - startTime;
            
            this.updateStats(result.success, duration);
            this.displayResults(result, duration, trigger);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.updateStats(false, duration);
            console.log(`❌ Test execution failed: ${error.message}`);
        } finally {
            this.isRunning = false;
            this.lastRun = Date.now();
            
            if (!this.options.quiet) {
                this.displayStatus();
            }
        }
    }

    executeTestCommand() {
        return new Promise((resolve) => {
            const [command, ...args] = this.options.testCommand.split(' ');
            
            const proc = spawn(command, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                resolve({
                    success: code === 0,
                    code,
                    stdout,
                    stderr
                });
            });
        });
    }

    updateStats(success, duration) {
        this.stats.totalRuns++;
        if (success) {
            this.stats.successfulRuns++;
        } else {
            this.stats.failedRuns++;
        }
        
        // Update rolling average duration
        this.stats.averageDuration = Math.round(
            (this.stats.averageDuration * (this.stats.totalRuns - 1) + duration) / this.stats.totalRuns
        );
    }

    displayResults(result, duration, _trigger) {
        const durationText = `${Math.round(duration / 1000)}s`;
        const statusIcon = result.success ? '✅' : '❌';
        const statusText = result.success ? 'PASSED' : 'FAILED';
        
        console.log(`${statusIcon} ${statusText} in ${durationText}`);
        
        if (!result.success && result.stderr) {
            console.log('🔍 Error details:');
            console.log(result.stderr.split('\n').slice(-10).join('\n')); // Last 10 lines
        }
        
        // Extract key metrics if available
        this.extractAndDisplayMetrics(result.stdout);
    }

    extractAndDisplayMetrics(stdout) {
        // Try to extract test metrics from stdout
        const lines = stdout.split('\n');
        
        // Look for common test result patterns
        for (const line of lines) {
            // Playwright/Jest style: "X passed, Y failed"
            const playwrightMatch = line.match(/(\d+) passed.*?(\d+) failed/);
            if (playwrightMatch) {
                console.log(`📊 Results: ${playwrightMatch[1]} passed, ${playwrightMatch[2]} failed`);
                continue;
            }
            
            // Vitest style: "Test Files  X passed"
            const vitestMatch = line.match(/Test Files\s+(\d+) passed/);
            if (vitestMatch) {
                console.log(`📊 Test Files: ${vitestMatch[1]} passed`);
                continue;
            }
            
            // Success rate patterns
            const rateMatch = line.match(/(\d+)%.*success/i);
            if (rateMatch) {
                console.log(`📈 Success Rate: ${rateMatch[1]}%`);
                continue;
            }
        }
    }

    displayStatus() {
        const successRate = this.stats.totalRuns > 0 
            ? Math.round((this.stats.successfulRuns / this.stats.totalRuns) * 100)
            : 0;
            
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📊 Session Stats:`);
        console.log(`   Total Runs: ${this.stats.totalRuns}`);
        console.log(`   Success Rate: ${successRate}% (${this.stats.successfulRuns}/${this.stats.totalRuns})`);
        console.log(`   Average Duration: ${Math.round(this.stats.averageDuration / 1000)}s`);
        console.log(`   Last Run: ${this.lastRun ? new Date(this.lastRun).toLocaleTimeString() : 'Never'}`);
        console.log(`${'─'.repeat(60)}`);
        console.log('👁️  Watching for changes...\n');
    }

    stop() {
        console.log('\n🛑 Stopping continuous test watcher...');
        
        // Close all watchers
        for (const [path, watcher] of this.watchers) {
            watcher.close();
            console.log(`📁 Stopped watching: ${path}`);
        }
        
        // Clear any pending debounce
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Final stats
        if (this.stats.totalRuns > 0) {
            console.log('\n📊 Final Session Summary:');
            const successRate = Math.round((this.stats.successfulRuns / this.stats.totalRuns) * 100);
            console.log(`   Runs: ${this.stats.totalRuns} (${successRate}% success)`);
            console.log(`   Average Duration: ${Math.round(this.stats.averageDuration / 1000)}s`);
        }
        
        console.log('👋 Goodbye!');
        process.exit(0);
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        console.log(`
🎯 HyperFixi Continuous Test Watcher

Automatically runs tests when files change, enabling true continuous development.

Usage:
  node continuous-test-watcher.js [options]

Options:
  --debounce=MS        Debounce delay in milliseconds (default: 2000)
  --command=CMD        Test command to run (default: "npm run test:auto")
  --watch=PATHS        Comma-separated paths to watch (default: "src,test")
  --ignore=PATHS       Additional paths to ignore
  --quiet              Suppress verbose output
  --help               Show this help

Examples:
  node continuous-test-watcher.js
  node continuous-test-watcher.js --command="npm run test:browser"
  node continuous-test-watcher.js --debounce=1000 --quiet
  node continuous-test-watcher.js --watch="src,packages/core/src"

Features:
  ✅ Smart file filtering (ignores irrelevant changes)
  ✅ Debounced execution (prevents spam from rapid changes)
  ✅ Real-time metrics and success rate tracking
  ✅ Graceful shutdown with session summary
  ✅ Cross-platform compatibility
`);
        return;
    }

    const options = {
        debounceMs: parseInt(args.find(arg => arg.startsWith('--debounce='))?.split('=')[1]) || 2000,
        testCommand: args.find(arg => arg.startsWith('--command='))?.split('=')[1] || 'npm run test:auto',
        watchPaths: args.find(arg => arg.startsWith('--watch='))?.split('=')[1]?.split(',') || ['src', 'test'],
        quiet: args.includes('--quiet')
    };

    const watcher = new ContinuousTestWatcher(options);
    await watcher.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Continuous test watcher failed:', error.message);
        process.exit(1);
    });
}

export default ContinuousTestWatcher;