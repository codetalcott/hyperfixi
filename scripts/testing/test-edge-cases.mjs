#!/usr/bin/env node
/**
 * Edge Case Test Runner
 *
 * Runs the edge case test suite and reports results
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join } from 'path';

const TEST_URL = 'http://127.0.0.1:3000/cookbook/generated-tests/test-edge-cases.html';
const TIMEOUT = 30000;

async function runEdgeCaseTests() {
  console.log('🧪 Running Edge Case Test Suite\n');
  console.log('Test URL:', TEST_URL);
  console.log('Timeout:', TIMEOUT, 'ms\n');

  let browser;
  let passed = 0;
  let failed = 0;
  let total = 0;

  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Capture console messages
    page.on('console', msg => console.log('  Browser:', msg.text()));
    page.on('pageerror', err => console.error('  Page Error:', err.message));

    // Navigate to test page
    console.log('📄 Loading test page...');
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

    // Wait for tests to run (the page has a setTimeout of 1500ms)
    console.log('⏳ Waiting for tests to execute...\n');
    await page.waitForTimeout(2000);

    // Extract test results
    const results = await page.evaluate(() => {
      const tests = document.querySelectorAll('.test');
      const summary = {
        total: parseInt(document.getElementById('total')?.textContent || '0'),
        passed: parseInt(document.getElementById('passed')?.textContent || '0'),
        failed: parseInt(document.getElementById('failed')?.textContent || '0'),
        score: document.getElementById('score')?.textContent || '0%',
        tests: []
      };

      tests.forEach((test, index) => {
        const titleEl = test.querySelector('h3');
        const statusEl = test.querySelector('.status');
        const title = titleEl?.textContent.split('\n')[0].trim() || `Test ${index + 1}`;
        const status = statusEl?.textContent || 'UNKNOWN';
        const isPassing = test.classList.contains('pass');

        summary.tests.push({
          id: index + 1,
          title,
          status,
          passing: isPassing
        });
      });

      return summary;
    });

    // Update counts
    total = results.total;
    passed = results.passed;
    failed = results.failed;

    // Display results
    console.log('=' .repeat(70));
    console.log(' EDGE CASE TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`\n📊 Summary: ${passed}/${total} tests passed (${results.score})\n`);

    results.tests.forEach(test => {
      const icon = test.passing ? '✅' : '❌';
      const status = test.passing ? 'PASS' : 'FAIL';
      console.log(`${icon} Test ${test.id}: ${test.title}`);
      console.log(`   Status: ${status}\n`);
    });

    console.log('='.repeat(70));

    if (failed === 0) {
      console.log('✅ All edge case tests passed!');
    } else {
      console.log(`⚠️  ${failed} test(s) failed - review above for details`);
    }

    console.log('='.repeat(70));

    // Take screenshot
    await page.screenshot({ path: 'test-results/edge-case-tests-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved to: test-results/edge-case-tests-screenshot.png');

  } catch (error) {
    console.error('\n❌ Error running edge case tests:', error.message);

    if (error.message.includes('net::ERR')) {
      console.log('\n💡 Tip: Make sure the HTTP server is running:');
      console.log('   npx http-server packages/core -p 3000 -c-1\n');
    }

    failed = total || 8; // Assume all failed if error
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runEdgeCaseTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
