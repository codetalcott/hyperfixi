/**
 * Debug test to capture console errors
 */

import { test } from '@playwright/test';

test('capture console and errors', async ({ page }) => {
  const errors: string[] = [];
  const logs: string[] = [];

  // Listen for console messages
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(`Error: ${error.message}\nStack: ${error.stack}`);
  });

  await page.goto('http://localhost:3000/manual-test.html');
  await page.waitForTimeout(3000);

  console.log('\n=== CONSOLE LOGS ===');
  logs.forEach(log => console.log(log));

  console.log('\n=== ERRORS ===');
  if (errors.length > 0) {
    errors.forEach(err => console.log(err));
  } else {
    console.log('No errors');
  }

  // Try to get more details
  const scriptInfo = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.map(s => ({
      src: s.src,
      loaded: s.src ? 'has src' : 'inline',
      hasError: s.onerror ? 'has error handler' : 'no error handler'
    }));
  });

  console.log('\n=== SCRIPTS ===');
  console.log(JSON.stringify(scriptInfo, null, 2));
});
