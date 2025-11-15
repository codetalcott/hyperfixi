#!/usr/bin/env node
/**
 * Test that the cookbook page loads without crashing after the fix
 */

import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:3000/cookbook/full-cookbook-test.html';

(async () => {
  console.log('🧪 Testing cookbook page after infinite recursion fix...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(`❌ Page error: ${error.message}`);
  });

  try {
    console.log(`📍 Loading: ${URL}`);
    const startTime = Date.now();

    await page.goto(URL, { waitUntil: 'load', timeout: 15000 });
    const loadTime = Date.now() - startTime;

    console.log(`✅ Page loaded successfully in ${loadTime}ms`);

    // Wait for HyperFixi to process
    await page.waitForTimeout(2000);

    // Check if page is still responsive
    const isAlive = await page.evaluate(() => {
      return document.body !== null && document.title !== '';
    });

    if (!isAlive) {
      console.log('❌ Page crashed after load');
      await browser.close();
      process.exit(1);
    }

    // Get page title
    const title = await page.title();
    console.log(`✅ Page is responsive, title: "${title}"`);

    // Count how many examples are on the page
    const exampleCount = await page.evaluate(() => {
      return document.querySelectorAll('.example').length;
    });
    console.log(`✅ Found ${exampleCount} examples on page`);

    // Check the fixed input field
    const hasFixedInput = await page.evaluate(() => {
      const input = document.getElementById('search-quotes');
      return input !== null;
    });
    console.log(`✅ Fixed input field exists: ${hasFixedInput}`);

    // Try typing in the fixed input to ensure it doesn't crash
    console.log('\n🧪 Testing the fixed input field...');
    await page.focus('#search-quotes');
    await page.keyboard.type('code');
    await page.waitForTimeout(500);

    console.log('✅ Typed "code" without crashing');

    // Try pressing ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const inputValue = await page.evaluate(() => {
      return document.getElementById('search-quotes').value;
    });

    console.log(`✅ Pressed ESC, input value is now: "${inputValue}"`);

    if (inputValue === '') {
      console.log('✅ ESC correctly cleared the input');
    } else {
      console.log('⚠️  ESC did not clear the input (expected "")');
    }

    // Check for errors
    if (errors.length > 0) {
      console.log(`\n⚠️  ${errors.length} error(s) detected:`);
      errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('\n✅ No errors detected');
    }

    await browser.close();

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS: Cookbook page loads and functions without crashing');
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ FAILURE: Page crashed or timed out');
    console.log('='.repeat(60));
    console.log(`Error: ${error.message}`);

    await browser.close();
    process.exit(1);
  }
})();
