#!/usr/bin/env node
import { chromium } from 'playwright';

async function testContinueOnly() {
  console.log('🧪 Testing ONLY Test 3 (continue command)...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('  Browser:', msg.text()));
  page.on('pageerror', err => console.error('  ❌ Error:', err.message));

  try {
    await page.goto('http://127.0.0.1:3000/test-loop-commands.html', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(1500);

    console.log('\n🔄 Running ONLY Test 3...\n');

    // Only click Test 3
    await page.click('#test3 button');
    await page.waitForTimeout(1000);
    const result3 = await page.textContent('#result3');

    console.log('\n📊 Result:');
    console.log(`Test 3 (with continue): ${result3} ${result3 === '8' ? '✅' : '❌'} (expected: 8)`);

    if (result3 === '8') {
      console.log('\n✅ Test 3 works in isolation!');
      process.exit(0);
    } else {
      console.log('\n❌ Test 3 fails even in isolation');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test crashed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testContinueOnly();
