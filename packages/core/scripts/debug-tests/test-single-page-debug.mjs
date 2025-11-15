#!/usr/bin/env node
import { chromium } from 'playwright';

async function testPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  const errors = [];

  // Capture all console messages
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });

  // Capture errors
  page.on('pageerror', error => {
    const text = `ERROR: ${error.message}`;
    errors.push(text);
    console.error(text);
  });

  console.log('Loading page...');
  await page.goto('http://127.0.0.1:3000/cookbook/generated-tests/test-commands.html');

  console.log('Waiting 6 seconds for validation...');
  await page.waitForTimeout(6000);

  // Check results
  const results = await page.evaluate(() => {
    return {
      total: document.getElementById('total')?.textContent,
      passed: document.getElementById('passed')?.textContent,
      failed: document.getElementById('failed')?.textContent,
      unknown: document.getElementById('unknown')?.textContent,
      hyperFixiLoaded: typeof window.evalHyperScript !== 'undefined'
    };
  });

  console.log('\n' + '='.repeat(70));
  console.log('Results:', JSON.stringify(results, null, 2));
  console.log('='.repeat(70));

  if (errors.length > 0) {
    console.log('\nErrors found:', errors.length);
    errors.forEach(e => console.log('  ', e));
  }

  await browser.close();
}

testPage().catch(console.error);
