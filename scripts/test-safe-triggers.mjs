#!/usr/bin/env node
import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('  Browser:', msg.text()));
  page.on('pageerror', err => console.error('  Error:', err.message));

  console.log('Testing safe triggers (no self-reference)...\n');
  await page.goto('http://127.0.0.1:3000/test-safe-triggers.html', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2000);

  const status1 = await page.textContent('#status1');
  const status2 = await page.textContent('#status2');

  console.log('\nTest 1:', status1);
  console.log('Test 2:', status2);

  await browser.close();

  if (status1?.includes('✅') && status2?.includes('✅')) {
    console.log('\n✅ Safe triggers work - crash is specific to self-reference');
    process.exit(0);
  } else {
    console.log('\n❌ Even safe triggers failed');
    process.exit(1);
  }
}

test().catch(err => {
  console.error('❌ Crashed:', err.message);
  process.exit(1);
});
