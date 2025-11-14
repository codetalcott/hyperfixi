#!/usr/bin/env node
import { chromium } from 'playwright';

async function testLoopCommands() {
  console.log('🧪 Testing loop commands (repeat, break, continue)...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('  Browser:', msg.text()));
  page.on('pageerror', err => console.error('  ❌ Error:', err.message));

  try {
    await page.goto('http://127.0.0.1:3000/test-loop-commands.html', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(1500);

    // Click all test buttons
    console.log('\n🔄 Running tests...\n');

    // Test 1: repeat 5 times
    await page.click('#test1 button');
    await page.waitForTimeout(500);
    const result1 = await page.textContent('#result1');

    // Test 2: repeat with break
    await page.click('#test2 button');
    await page.waitForTimeout(500);
    const result2 = await page.textContent('#result2');

    // Test 3: repeat with continue
    await page.click('#test3 button');
    await page.waitForTimeout(500);
    const result3 = await page.textContent('#result3');

    console.log('\n📊 Results:');
    console.log(`Test 1 (repeat 5 times): ${result1} ${result1 === '5' ? '✅' : '❌'} (expected: 5)`);
    console.log(`Test 2 (with break): ${result2} ${result2 === '5' ? '✅' : '❌'} (expected: 5)`);
    console.log(`Test 3 (with continue): ${result3} ${result3 === '8' ? '✅' : '❌'} (expected: 8)`);

    const allPass = result1 === '5' && result2 === '5' && result3 === '8';

    if (allPass) {
      console.log('\n✅ All loop commands working correctly!');
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

testLoopCommands();
