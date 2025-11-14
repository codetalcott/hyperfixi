#!/usr/bin/env node
import { chromium } from 'playwright';

async function testSetVariable() {
  console.log('🧪 Testing set command with :variable syntax...\\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console logs
  page.on('console', msg => console.log('  Browser:', msg.text()));
  page.on('pageerror', err => console.error('  ❌ Page Error:', err.message));

  try {
    await page.goto('http://127.0.0.1:3000/test-set-variable.html', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(1000);

    console.log('\\n🧪 Running Test 1: set :x to 5');
    await page.click('#test1');
    await page.waitForTimeout(500);
    const result1 = await page.textContent('#result1');
    console.log(`  Result: ${result1} ${result1 === '5' ? '✅' : '❌'}`);

    console.log('\\n🧪 Running Test 2: set :name to "hello"');
    await page.click('#test2');
    await page.waitForTimeout(500);
    const result2 = await page.textContent('#result2');
    console.log(`  Result: ${result2} ${result2 === 'hello' ? '✅' : '❌'}`);

    console.log('\\n🧪 Running Test 3: repeat with set :idx to it');
    await page.click('#test3');
    await page.waitForTimeout(500);
    const result3 = await page.textContent('#result3');
    console.log(`  Result: ${result3} ${result3 === '6' ? '✅' : '❌'} (expected: 6 = 1+2+3)`);

    console.log('\\n📊 Summary:');
    const passing = [
      result1 === '5',
      result2 === 'hello',
      result3 === '6'
    ].filter(Boolean).length;
    console.log(`  ${passing}/3 tests passing`);

    if (passing === 3) {
      console.log('\\n✅ All tests passed! The :variable syntax works!');
    } else {
      console.log('\\n❌ Some tests failed. The parser fix needs more work.');
    }

  } catch (error) {
    console.error('\\n❌ Test crashed:', error.message);
  } finally {
    await browser.close();
  }
}

testSetVariable();
