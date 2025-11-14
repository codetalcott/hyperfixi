#!/usr/bin/env node
/**
 * Minimal Test for Self-Referential Trigger
 */

import { chromium } from 'playwright';

const TEST_URL = 'http://127.0.0.1:3000/test-self-trigger-minimal.html';

async function testMinimalTrigger() {
  console.log('🧪 Testing minimal self-referential trigger...\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Capture console and errors
    const logs = [];
    const errors = [];
    page.on('console', msg => {
      logs.push(msg.text());
      console.log('  Browser:', msg.text());
    });
    page.on('pageerror', err => {
      errors.push(err.message);
      console.error('  Page Error:', err.message);
    });

    console.log('📄 Loading test page...');
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });

    console.log('⏳ Waiting for compilation...\n');
    await page.waitForTimeout(1500);

    // Check if page loaded successfully
    const statusText = await page.textContent('#status-text');
    console.log('\n📊 Result:', statusText);

    if (errors.length > 0) {
      console.log('\n❌ Page errors detected:');
      errors.forEach(err => console.log('  -', err));
      process.exit(1);
    }

    if (statusText?.includes('✅')) {
      console.log('\n✅ Test PASSED: No crash detected');
      process.exit(0);
    } else {
      console.log('\n❌ Test FAILED: Element did not compile');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test crashed:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

testMinimalTrigger();
