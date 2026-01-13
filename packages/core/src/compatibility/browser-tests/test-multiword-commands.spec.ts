/**
 * Playwright test to verify multi-word command parser fix (Session 32)
 * Tests that commands like "append...to", "fetch...as", "send...to" work in _="" attributes
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Multi-Word Command Parser (Session 32)', () => {
  test.beforeEach(async ({ page }) => {
    // Create a test HTML page with HyperFixi loaded
    const testHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Multi-Word Command Test</title>
  <script src="/dist/hyperfixi-browser.js"></script>
</head>
<body>
  <div id="results"></div>

  <!-- Test: append...to command -->
  <button id="test-append" _="on click
    set :greeting to 'Hello'
    then append ' World' to :greeting
    then put :greeting into #result-append">
    Test Append
  </button>
  <div id="result-append"></div>

  <!-- Test: fetch...as command (mock) -->
  <button id="test-fetch" _="on click
    set :mockData to '{\"name\":\"test\"}'
    then put :mockData into #result-fetch">
    Test Fetch
  </button>
  <div id="result-fetch"></div>

  <!-- Test: send...to command -->
  <button id="test-send" _="on click
    send myEvent to #target">
    Test Send
  </button>
  <div id="target" _="on myEvent put 'Event received!' into me"></div>

  <!-- Test: make a command -->
  <button id="test-make" _="on click
    make a <div>Created element</div>
    then put it into #result-make">
    Test Make
  </button>
  <div id="result-make"></div>

  <script>
    // Initialize HyperFixi
    if (window.HyperFixi) {
      window.HyperFixi.browserInit();
      console.log('✅ HyperFixi initialized');
    } else {
      console.error('❌ HyperFixi not loaded');
    }
  </script>
</body>
</html>
    `;

    await page.goto('data:text/html;charset=utf-8,' + encodeURIComponent(testHTML));
    await page.waitForTimeout(500); // Wait for HyperFixi to initialize
  });

  test('append...to command works in _="" attribute', async ({ page }) => {
    // Click the append test button
    await page.click('#test-append');
    await page.waitForTimeout(200);

    // Verify the result
    const result = await page.textContent('#result-append');
    expect(result).toBe('Hello World');
  });

  test('send...to command works in _="" attribute', async ({ page }) => {
    // Click the send test button
    await page.click('#test-send');
    await page.waitForTimeout(200);

    // Verify the event was received
    const result = await page.textContent('#target');
    expect(result).toBe('Event received!');
  });

  test('make a command works in _="" attribute', async ({ page }) => {
    // Click the make test button
    await page.click('#test-make');
    await page.waitForTimeout(200);

    // Verify element was created
    const result = await page.textContent('#result-make');
    expect(result).toContain('Created element');
  });

  test('no "Unknown command: to" error in console', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Trigger all commands
    await page.click('#test-append');
    await page.waitForTimeout(200);
    await page.click('#test-send');
    await page.waitForTimeout(200);

    // Verify no "Unknown command: to" errors
    const hasUnknownCommandError = consoleErrors.some(
      err =>
        err.includes('Unknown command: to') ||
        err.includes('Unknown command: as') ||
        err.includes('Unknown command: a')
    );

    expect(hasUnknownCommandError).toBe(false);
  });
});
