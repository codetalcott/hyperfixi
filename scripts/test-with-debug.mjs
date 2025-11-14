#!/usr/bin/env node
import { chromium } from 'playwright';

async function testWithDebug() {
  console.log('🧪 Testing with DEBUG mode enabled...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Enable debug mode BEFORE the page loads
  await page.addInitScript(() => {
    window.__HYPERFIXI_DEBUG__ = true;
  });

  page.on('console', msg => console.log('  Browser:', msg.text()));
  page.on('pageerror', err => console.error('  ❌ Error:', err.message));

  try {
    await page.goto('http://127.0.0.1:3000/test-loop-commands.html', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(1500);

    console.log('\n🔄 Testing Test 3 ONLY with full debug logging...\n');

    // Only click Test 3
    await page.click('#test3 button');
    await page.waitForTimeout(2000);
    const result3 = await page.textContent('#result3');

    console.log('\n📊 Result:');
    console.log(`Test 3 (with continue): ${result3} ${result3 === '8' ? '✅' : '❌'} (expected: 8)`);

  } catch (error) {
    console.error('\n❌ Test crashed:', error.message);
  } finally {
    await browser.close();
  }
}

testWithDebug();
