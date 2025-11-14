#!/usr/bin/env node
/**
 * Test Trigger Pattern Variants
 */

import { chromium } from 'playwright';

const TEST_URL = 'http://127.0.0.1:3000/test-trigger-variants.html';

async function testTriggerVariants() {
  console.log('🧪 Testing trigger pattern variants...\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Capture console and errors
    const logs = [];
    const errors = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('Test')) {
        console.log('  ', text);
      }
    });
    page.on('pageerror', err => {
      errors.push(err.message);
      console.error('  ❌ Page Error:', err.message);
    });

    console.log('📄 Loading test page...');
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    console.log('⏳ Waiting for compilation...\n');
    await page.waitForTimeout(2500);

    // Check results
    const results = [];
    for (let i = 1; i <= 4; i++) {
      const statusText = await page.textContent(`#status${i} .status-text`);
      results.push({ test: i, status: statusText });
      console.log(`Test ${i}: ${statusText}`);
    }

    console.log('\n📊 Summary:');
    const passed = results.filter(r => r.status?.includes('✅')).length;
    const failed = results.filter(r => r.status?.includes('❌')).length;
    console.log(`✅ Passed: ${passed}/4`);
    console.log(`❌ Failed: ${failed}/4`);

    if (errors.length > 0) {
      console.log('\n⚠️  Page errors detected:');
      errors.forEach(err => console.log('  -', err));
    }

    if (passed === 4 && errors.length === 0) {
      console.log('\n✅ All tests PASSED - No crash detected!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests FAILED');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test crashed:', error.message);
    console.log('\n🔍 This indicates which pattern causes the crash');
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

testTriggerVariants();
