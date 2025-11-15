#!/usr/bin/env node

/**
 * Automated compound-examples.html test runner with log capture
 *
 * Features:
 * - Hard refresh to bypass cache
 * - Captures all console output (log, warn, error, info, debug)
 * - Multiple browser support (Chromium, Firefox, WebKit)
 * - Fast execution (< 5 seconds)
 * - Color-coded console output
 * - Auto-saves logs to file
 *
 * Usage:
 *   node test-compound-auto.mjs [browser] [options]
 *
 * Examples:
 *   node test-compound-auto.mjs                    # Default: chromium
 *   node test-compound-auto.mjs firefox            # Use Firefox
 *   node test-compound-auto.mjs chrome --headed    # Show browser window
 *   node test-compound-auto.mjs --save logs.txt    # Custom log file
 */

import { chromium, firefox, webkit } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const browserType = args.find(arg => ['chromium', 'firefox', 'webkit', 'chrome'].includes(arg)) || 'chromium';
const headed = args.includes('--headed') || args.includes('-h');
const timestamp_file = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const saveFile = args.includes('--save') ? args[args.indexOf('--save') + 1] : `console-logs/compound-${timestamp_file}.txt`;
const verbose = args.includes('--verbose') || args.includes('-v');
const watch = args.includes('--watch') || args.includes('-w');

// Ensure console-logs directory exists
const logsDir = resolve(process.cwd(), 'console-logs');
try {
  mkdirSync(logsDir, { recursive: true });
} catch (err) {
  // Directory already exists, ignore
}

// Test configuration
const TEST_URL = 'http://127.0.0.1:3000/compound-examples.html';
const WAIT_TIME = 2000; // Wait 2 seconds for scripts to execute

// Console log storage
const logs = [];
let errorCount = 0;
let warningCount = 0;

function logWithColor(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

function timestamp() {
  return new Date().toLocaleTimeString();
}

async function runTest() {
  const startTime = Date.now();
  logs.length = 0;
  errorCount = 0;
  warningCount = 0;

  logWithColor(colors.cyan + colors.bright, '\n🧪 Compound Examples Test Runner');
  logWithColor(colors.gray, '━'.repeat(60));
  logWithColor(colors.blue, `⏰ Started at ${timestamp()}`);
  logWithColor(colors.blue, `🌐 Browser: ${browserType}`);
  logWithColor(colors.blue, `📄 URL: ${TEST_URL}`);
  logWithColor(colors.gray, '━'.repeat(60));

  let browser;
  let page;

  try {
    // Launch browser
    const browserEngine = browserType === 'chrome' ? chromium :
                          browserType === 'firefox' ? firefox :
                          browserType === 'webkit' ? webkit : chromium;

    browser = await browserEngine.launch({
      headless: !headed,
      args: browserType === 'firefox' ? [] : ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    page = await context.newPage();

    // Capture console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();

      const logEntry = {
        type,
        text,
        location: `${location.url}:${location.lineNumber}`,
        timestamp: new Date().toISOString()
      };

      logs.push(logEntry);

      // Count errors and warnings
      if (type === 'error') errorCount++;
      if (type === 'warning') warningCount++;

      // Color-coded console output
      const icon = type === 'error' ? '❌' :
                   type === 'warning' ? '⚠️' :
                   type === 'info' ? 'ℹ️' :
                   type === 'debug' ? '🐛' :
                   '📝';

      const color = type === 'error' ? colors.red :
                    type === 'warning' ? colors.yellow :
                    type === 'info' ? colors.cyan :
                    type === 'debug' ? colors.magenta :
                    colors.reset;

      logWithColor(color, `${icon} [${type.toUpperCase()}]`, text);

      if (verbose && location.url !== '') {
        logWithColor(colors.gray, `   └─ ${location.url}:${location.lineNumber}`);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      errorCount++;
      const logEntry = {
        type: 'pageerror',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      logs.push(logEntry);
      logWithColor(colors.red + colors.bright, `💥 PAGE ERROR: ${error.message}`);
      if (verbose) {
        console.log(colors.gray + error.stack + colors.reset);
      }
    });

    logWithColor(colors.cyan, '\n🔄 Loading page with hard refresh...');

    // Navigate with hard refresh (bypass cache)
    await page.goto(TEST_URL, {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    // Force hard reload using CDP (Chrome DevTools Protocol) for Chromium
    if (browserType === 'chromium' || browserType === 'chrome') {
      const client = await context.newCDPSession(page);
      await client.send('Network.setCacheDisabled', { cacheDisabled: true });
      await page.reload({ waitUntil: 'networkidle' });
    } else {
      // For Firefox/WebKit, use standard reload
      await page.reload({ waitUntil: 'networkidle' });
    }

    logWithColor(colors.green, '✅ Page loaded');

    // Wait for scripts to execute
    logWithColor(colors.cyan, `⏳ Waiting ${WAIT_TIME}ms for scripts to execute...`);
    await page.waitForTimeout(WAIT_TIME);

    // Check for _hyperscript runtime
    const hasHyperscript = await page.evaluate(() => {
      return typeof window._hyperscript !== 'undefined' ||
             typeof window.hyperscriptFixi !== 'undefined';
    });

    logWithColor(
      hasHyperscript ? colors.green : colors.red,
      hasHyperscript ? '✅ HyperScript runtime detected' : '❌ HyperScript runtime not found'
    );

    // Get page title
    const title = await page.title();
    logWithColor(colors.blue, `📄 Page title: ${title}`);

    // Test button clicks to catch runtime errors
    logWithColor(colors.cyan, '\n🖱️  Testing button clicks...');

    try {
      // Click the HSL color cycling button
      const colorBoxButton = await page.$('#color-box');
      if (colorBoxButton) {
        logWithColor(colors.cyan, '  Clicking HSL color button...');
        await colorBoxButton.click();
        await page.waitForTimeout(100); // Wait for any errors to surface

        // Simulate pointerup to stop the repeat loop
        await page.mouse.up();
        logWithColor(colors.green, '  ✅ HSL color button test passed');
      } else {
        logWithColor(colors.yellow, '  ⚠️ HSL color button not found');
      }

      // Click one of the draggable windows
      const draggableWindow = await page.$('.window');
      if (draggableWindow) {
        logWithColor(colors.cyan, '  Clicking draggable window...');
        await draggableWindow.click();
        await page.waitForTimeout(100); // Wait for any errors to surface
        logWithColor(colors.green, '  ✅ Draggable window test passed');
      } else {
        logWithColor(colors.yellow, '  ⚠️ Draggable window not found');
      }
    } catch (clickError) {
      logWithColor(colors.red, `  ❌ Button click test failed: ${clickError.message}`);
      errorCount++;
    }

    // Summary
    const duration = Date.now() - startTime;
    logWithColor(colors.gray, '━'.repeat(60));
    logWithColor(colors.bright, '\n📊 Test Summary');
    logWithColor(colors.blue, `⏱️  Duration: ${duration}ms`);
    logWithColor(colors.blue, `📝 Total logs: ${logs.length}`);
    logWithColor(errorCount === 0 ? colors.green : colors.red, `❌ Errors: ${errorCount}`);
    logWithColor(warningCount === 0 ? colors.green : colors.yellow, `⚠️  Warnings: ${warningCount}`);

    // Save logs to file
    const logContent = [
      `=== Compound Examples Test Logs ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `Browser: ${browserType}`,
      `URL: ${TEST_URL}`,
      `Duration: ${duration}ms`,
      `Total logs: ${logs.length}`,
      `Errors: ${errorCount}`,
      `Warnings: ${warningCount}`,
      ``,
      `=== Console Output ===`,
      ...logs.map(log => {
        const parts = [`[${log.type.toUpperCase()}]`, log.text];
        if (log.location && log.location !== ':0') {
          parts.push(`(${log.location})`);
        }
        if (log.stack) {
          parts.push(`\nStack: ${log.stack}`);
        }
        return parts.join(' ');
      }),
      ``,
      `=== End of Logs ===`
    ].join('\n');

    const logPath = resolve(process.cwd(), saveFile);
    writeFileSync(logPath, logContent, 'utf-8');
    logWithColor(colors.green, `💾 Logs saved to: ${logPath}`);

    logWithColor(colors.gray, '━'.repeat(60));

    // Exit code based on errors
    return errorCount === 0 ? 0 : 1;

  } catch (error) {
    logWithColor(colors.red + colors.bright, `\n💥 Test execution failed: ${error.message}`);
    if (verbose) {
      console.error(error.stack);
    }
    return 1;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

async function watchMode() {
  logWithColor(colors.cyan + colors.bright, '\n👀 Watch mode enabled - Press Ctrl+C to exit');
  logWithColor(colors.gray, 'Running tests every 3 seconds...\n');

  while (true) {
    await runTest();
    await new Promise(resolve => setTimeout(resolve, 3000));
    logWithColor(colors.cyan, '\n♻️  Re-running tests...\n');
  }
}

// Main execution
if (watch) {
  watchMode().catch(error => {
    console.error('Watch mode failed:', error);
    process.exit(1);
  });
} else {
  runTest()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}
