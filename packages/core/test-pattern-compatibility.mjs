#!/usr/bin/env node
/**
 * Pattern Compatibility Test
 * Tests which _hyperscript patterns from the cookbook are supported by HyperFixi
 */

import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:3000/cookbook/pattern-compatibility-test.html';

(async () => {
  console.log('🧪 Testing HyperFixi Pattern Compatibility...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const compilationErrors = [];

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  // Capture console messages for compilation errors
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('compilation failed') || text.includes('ParseError')) {
      compilationErrors.push(text);
    }
  });

  try {
    console.log(`📍 Loading: ${URL}\n`);

    await page.goto(URL, { waitUntil: 'load', timeout: 15000 });

    // Wait for HyperFixi to process all patterns
    await page.waitForTimeout(2000);

    // Get pattern results
    const results = await page.evaluate(() => {
      const patterns = [];
      for (let i = 1; i <= 11; i++) {
        const statusEl = document.getElementById(`status-${i}`);
        const patternEl = document.getElementById(`pattern-${i}`);
        const h3 = patternEl?.querySelector('h3')?.textContent;
        const code = patternEl?.querySelector('code')?.textContent;

        patterns.push({
          id: i,
          name: h3?.replace(/Pattern \d+: /, '').replace(' ⚠️', '').trim(),
          code,
          status: statusEl?.textContent,
          passed: statusEl?.classList.contains('pass')
        });
      }
      return patterns;
    });

    // Display results
    console.log('═'.repeat(70));
    console.log(' PATTERN COMPATIBILITY RESULTS');
    console.log('═'.repeat(70));
    console.log();

    let passCount = 0;
    let failCount = 0;

    results.forEach(pattern => {
      const icon = pattern.passed ? '✅' : '❌';
      const status = pattern.passed ? 'PASS' : 'FAIL';

      console.log(`${icon} Pattern ${pattern.id}: ${pattern.name}`);
      console.log(`   Status: ${status}`);
      console.log(`   Code: ${pattern.code}`);
      console.log();

      if (pattern.passed) {
        passCount++;
      } else {
        failCount++;
      }
    });

    console.log('═'.repeat(70));
    console.log(` SUMMARY: ${passCount} passed, ${failCount} failed (${Math.round(passCount / results.length * 100)}%)`);
    console.log('═'.repeat(70));
    console.log();

    if (compilationErrors.length > 0) {
      console.log('⚠️  Compilation Errors Detected:');
      compilationErrors.forEach(err => console.log(`   ${err}`));
      console.log();
    }

    // List failed patterns
    if (failCount > 0) {
      console.log('❌ Failed Patterns:');
      results.filter(p => !p.passed).forEach(pattern => {
        console.log(`   - Pattern ${pattern.id}: ${pattern.name}`);
        console.log(`     Syntax: ${pattern.code}`);
      });
      console.log();
    }

    // List passed patterns
    if (passCount > 0) {
      console.log('✅ Passing Patterns:');
      results.filter(p => p.passed).forEach(pattern => {
        console.log(`   - Pattern ${pattern.id}: ${pattern.name}`);
      });
      console.log();
    }

    await browser.close();
    process.exit(failCount > 0 ? 1 : 0);

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ FAILURE: Page crashed or timed out');
    console.log('='.repeat(60));
    console.log(`Error: ${error.message}`);

    await browser.close();
    process.exit(1);
  }
})();
