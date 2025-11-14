#!/usr/bin/env node
import { chromium } from 'playwright';

async function testSimpleContinue() {
  console.log('🧪 Testing continue without if command...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('  Browser:', msg.text()));
  page.on('pageerror', err => console.error('  ❌ Error:', err.message));

  try {
    await page.goto('http://127.0.0.1:3000/test-continue-no-if.html', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(1500);

    console.log('\n🔄 Running tests...\n');

    // Test 1: Basic repeat
    await page.click('#test1');
    await page.waitForTimeout(500);
    const result1 = await page.textContent('#result1');

    // Test 2: Repeat with continue (no if)
    await page.click('#test2');
    await page.waitForTimeout(500);
    const result2 = await page.textContent('#result2');

    console.log('\n📊 Results:');
    console.log(`Test 1 (basic repeat): ${result1} ${result1 === '3' ? '✅' : '❌'} (expected: 3)`);
    console.log(`Test 2 (with continue): ${result2} ${result2 === '3' ? '✅' : '❌'} (expected: 3)`);

    if (result1 === '3' && result2 === '3') {
      console.log('\n✅ Both tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test crashed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testSimpleContinue();
