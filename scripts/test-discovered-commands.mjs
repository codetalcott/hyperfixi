#!/usr/bin/env node
/**
 * Automated Test Runner for Discovered Commands
 * Tests: append, make, send, throw
 */

import { chromium } from 'playwright';

const TEST_URL = 'http://127.0.0.1:3000/test-discovered-commands.html';

async function testDiscoveredCommands() {
  console.log('🧪 Testing discovered commands (append, make, send, throw)...\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Capture console output
    const logs = [];
    const errors = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('Test') || text.includes('RESULTS') || text.includes('===')) {
        console.log(text);
      }
    });
    page.on('pageerror', err => {
      errors.push(err.message);
      console.error('❌ Page Error:', err.message);
    });

    console.log('📄 Loading test page...');
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    console.log('⏳ Waiting for tests to complete...\n');
    // Tests run automatically and take ~8 seconds (7 tests * 1s stagger + 1s for results)
    await page.waitForTimeout(10000);

    // Extract test results
    const results = [];
    for (let i = 1; i <= 7; i++) {
      const statusText = await page.textContent(`#status-${i}`);
      const isPassing = statusText.includes('✅');
      results.push({
        test: i,
        status: isPassing ? 'PASS' : 'FAIL',
        text: statusText
      });
    }

    // Display results
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(60));
    results.forEach(r => {
      const icon = r.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} Test ${r.test}: ${r.status}`);
    });
    console.log('=' .repeat(60));

    const passed = results.filter(r => r.status === 'PASS').length;
    const total = results.length;
    console.log(`\n📈 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);

    if (errors.length > 0) {
      console.log('\n⚠️  Page Errors Detected:');
      errors.forEach(err => console.log('  -', err));
    }

    // Exit with appropriate code
    if (passed === total && errors.length === 0) {
      console.log('\n✅ All discovered commands working correctly!');
      console.log('\n📝 Commands validated:');
      console.log('  • append <value> to <target>');
      console.log('  • make a <tag> called <name>');
      console.log('  • send <event> to <target>');
      console.log('  • throw <error>');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed or errors detected');
      console.log('\n🔍 Next steps:');
      console.log('  1. Open http://127.0.0.1:3000/test-discovered-commands.html in browser');
      console.log('  2. Check console for detailed error messages');
      console.log('  3. Verify command implementations in packages/core/src/commands/');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test crashed:', error.message);
    console.log('\n🔍 Possible causes:');
    console.log('  • HTTP server not running (start with: npx http-server packages/core -p 3000 -c-1)');
    console.log('  • HyperFixi browser bundle not built (run: npm run build:browser --prefix packages/core)');
    console.log('  • Page compilation error (check browser console)');
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

testDiscoveredCommands();
