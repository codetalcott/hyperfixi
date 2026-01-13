#!/usr/bin/env node
/**
 * Automated Test Feedback System for Claude Code
 *
 * Runs browser tests and outputs structured feedback that Claude Code can parse
 * Supports multiple output formats: console, JSON, markdown
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Configuration
// Note: Server may run from project root or packages/core
// We try both paths to support either setup
const CONFIG = {
  testUrls: [
    'http://127.0.0.1:3000/test-dashboard.html',           // Server from packages/core
    'http://127.0.0.1:3000/packages/core/test-dashboard.html'  // Server from project root
  ],
  timeout: 30000,
  outputDir: join(rootDir, 'test-results'),
  formats: {
    console: true,
    json: true,
    markdown: true
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  format: args.includes('--json') ? 'json' : args.includes('--markdown') ? 'markdown' : 'console',
  watch: args.includes('--watch'),
  verbose: args.includes('--verbose'),
  quick: args.includes('--quick')
};

/**
 * Run tests and collect results
 */
async function runTests() {
  console.log('🚀 Starting automated test run...\n');

  let browser;
  let testResults = null;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect console messages for debugging
    const consoleMessages = [];
    page.on('console', msg => {
      if (options.verbose) {
        consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Navigate to test page - try multiple URLs to support different server setups
    console.log('📄 Loading test dashboard...');
    let testUrl = null;
    for (const url of CONFIG.testUrls) {
      try {
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 5000 });
        if (response && response.status() === 200) {
          testUrl = url;
          break;
        }
      } catch (e) {
        // Try next URL
      }
    }
    if (!testUrl) {
      throw new Error(`Could not load test dashboard from any of: ${CONFIG.testUrls.join(', ')}`);
    }

    // Wait for tests to complete
    console.log('⏳ Running tests...\n');
    await page.waitForTimeout(5000); // Give tests time to run

    // Extract test results from the page
    testResults = await page.evaluate(() => {
      const totalEl = document.getElementById('total-tests');
      const passedEl = document.getElementById('passed-tests');
      const failedEl = document.getElementById('failed-tests');
      const passRateEl = document.getElementById('pass-rate');

      // Extract individual test results
      const categories = [
        'set-tests',
        'put-tests',
        'log-tests',
        'dom-tests',
        'expression-tests',
        'context-tests'
      ];

      const detailedResults = {};

      categories.forEach(categoryId => {
        const container = document.getElementById(categoryId);
        if (!container) return;

        const testCases = container.querySelectorAll('.test-case');
        const categoryTests = [];

        testCases.forEach(testCase => {
          const label = testCase.querySelector('.test-label')?.textContent || '';
          const result = testCase.querySelector('.test-result')?.textContent || '';
          const error = testCase.querySelector('.test-error')?.textContent || '';
          const code = testCase.querySelector('.code-snippet')?.textContent || '';

          const passed = testCase.classList.contains('pass');

          categoryTests.push({
            name: label.replace(/^[✅❌]\s*/, ''),
            passed,
            result,
            error: error.replace('Error: ', ''),
            code
          });
        });

        const categoryName = categoryId.replace('-tests', '').toUpperCase();
        detailedResults[categoryName] = categoryTests;
      });

      return {
        summary: {
          total: parseInt(totalEl?.textContent || '0'),
          passed: parseInt(passedEl?.textContent || '0'),
          failed: parseInt(failedEl?.textContent || '0'),
          passRate: passRateEl?.textContent || '0%'
        },
        categories: detailedResults,
        timestamp: new Date().toISOString()
      };
    });

    // Add console messages if verbose
    if (options.verbose) {
      testResults.console = consoleMessages;
    }

  } catch (error) {
    console.error('❌ Error running tests:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return testResults;
}

/**
 * Format results for console output
 */
function formatConsoleOutput(results) {
  const { summary, categories } = results;
  const success = summary.failed === 0;

  let output = '\n';
  output += '╔══════════════════════════════════════════════════════════════════╗\n';
  output += '║                                                                  ║\n';
  output += `║           ${success ? '✅' : '❌'} Test Results: ${summary.passRate.padEnd(4)} Pass Rate ${success ? '✅' : '❌'}             ║\n`;
  output += '║                                                                  ║\n';
  output += '╚══════════════════════════════════════════════════════════════════╝\n\n';

  output += '📊 Summary:\n';
  output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  output += `   Total Tests:  ${summary.total}\n`;
  output += `   ✅ Passed:     ${summary.passed}\n`;
  output += `   ❌ Failed:     ${summary.failed}\n`;
  output += `   📈 Pass Rate:  ${summary.passRate}\n\n`;

  // Category breakdown
  Object.entries(categories).forEach(([category, tests]) => {
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    const icon = failed === 0 ? '✅' : '❌';

    output += `${icon} ${category} Tests: ${passed}/${tests.length} passed\n`;

    // Show failed tests
    tests.filter(t => !t.passed).forEach(test => {
      output += `   ❌ ${test.name}\n`;
      if (test.error) {
        output += `      Error: ${test.error}\n`;
      }
      if (test.code && !options.quick) {
        output += `      Code: ${test.code}\n`;
      }
    });
  });

  output += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  if (success) {
    output += '\n🎉 All tests passed! Safe to proceed.\n\n';
  } else {
    output += '\n⚠️  Some tests failed. Review failures above.\n\n';
  }

  return output;
}

/**
 * Format results as JSON
 */
function formatJsonOutput(results) {
  return JSON.stringify(results, null, 2);
}

/**
 * Format results as Markdown
 */
function formatMarkdownOutput(results) {
  const { summary, categories, timestamp } = results;
  const success = summary.failed === 0;

  let output = `# Test Results\n\n`;
  output += `**Status**: ${success ? '✅ PASS' : '❌ FAIL'} | `;
  output += `**Pass Rate**: ${summary.passRate} | `;
  output += `**Timestamp**: ${timestamp}\n\n`;

  output += `## Summary\n\n`;
  output += `- **Total Tests**: ${summary.total}\n`;
  output += `- **Passed**: ${summary.passed} ✅\n`;
  output += `- **Failed**: ${summary.failed} ❌\n`;
  output += `- **Pass Rate**: ${summary.passRate}\n\n`;

  output += `## Results by Category\n\n`;

  Object.entries(categories).forEach(([category, tests]) => {
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    const status = failed === 0 ? '✅' : '❌';

    output += `### ${status} ${category} (${passed}/${tests.length})\n\n`;

    tests.forEach(test => {
      const icon = test.passed ? '✅' : '❌';
      output += `- ${icon} **${test.name}**\n`;

      if (!test.passed) {
        if (test.error) {
          output += `  - Error: \`${test.error}\`\n`;
        }
        if (test.code) {
          output += `  - Code: \`\`\`javascript\n${test.code}\n\`\`\`\n`;
        }
      }
    });

    output += `\n`;
  });

  return output;
}

/**
 * Save results to file
 */
function saveResults(results, format) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let filename, content;

  switch (format) {
    case 'json':
      filename = `test-results-${timestamp}.json`;
      content = formatJsonOutput(results);
      break;
    case 'markdown':
      filename = `test-results-${timestamp}.md`;
      content = formatMarkdownOutput(results);
      break;
    default:
      filename = `test-results-${timestamp}.txt`;
      content = formatConsoleOutput(results);
  }

  const filepath = join(CONFIG.outputDir, filename);

  try {
    writeFileSync(filepath, content);
    console.log(`💾 Results saved to: ${filepath}\n`);
  } catch (error) {
    console.error(`❌ Failed to save results: ${error.message}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                  ║');
  console.log('║           🤖 Claude Code Test Feedback System 🤖                 ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const results = await runTests();

  // Output based on format
  switch (options.format) {
    case 'json':
      console.log(formatJsonOutput(results));
      break;
    case 'markdown':
      console.log(formatMarkdownOutput(results));
      break;
    default:
      console.log(formatConsoleOutput(results));
  }

  // Save results if enabled
  if (CONFIG.formats[options.format]) {
    saveResults(results, options.format);
  }

  // Exit with appropriate code
  const exitCode = results.summary.failed === 0 ? 0 : 1;
  process.exit(exitCode);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runTests, formatConsoleOutput, formatJsonOutput, formatMarkdownOutput };
