/**
 * Debug test for swap command
 */
import { test, expect } from '@playwright/test';

test('minimal swap test with put instead', async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  // Test with 'put' command first to verify hyperscript works at all
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <button id="btn" _="on click put 'UPDATED' into #target">Test Put</button>
      <div id="target">Original</div>
      <script src="http://127.0.0.1:3000/packages/core/dist/lokascript-browser.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          console.log('DOM loaded');
          if (window.hyperfixi && window.hyperfixi.process) {
            window.hyperfixi.process(document);
            console.log('HyperFixi processed');
          }
        });
      </script>
    </body>
    </html>
  `);

  await page.waitForTimeout(1000);

  console.log('=== Initial logs ===');
  logs.forEach(log => console.log(log));

  const before = await page.textContent('#target');
  console.log('Before click:', before);

  await page.click('#btn');
  await page.waitForTimeout(500);

  console.log('=== After click ===');
  logs.forEach(log => console.log(log));
  errors.forEach(err => console.log('ERROR:', err));

  const after = await page.textContent('#target');
  console.log('After click:', after);

  expect(after).toContain('UPDATED');
});

test('swap innerHTML direct', async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <button id="btn" _="on click swap #target with 'SWAPPED'">Swap</button>
      <div id="target">Original</div>
      <script src="http://127.0.0.1:3000/packages/core/dist/lokascript-browser.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          console.log('DOM loaded');
          if (window.hyperfixi) {
            console.log('HyperFixi found');

            // Enable debug mode to see what's happening
            window.__HYPERFIXI_DEBUG__ = true;

            window.hyperfixi.process(document);
            console.log('HyperFixi processed');

            // Check if button has handler attached
            const btn = document.getElementById('btn');
            console.log('Button hyperscript:', btn.getAttribute('_'));
          }
        });
      </script>
    </body>
    </html>
  `);

  await page.waitForTimeout(1500);

  console.log('=== Initial ===');
  logs.forEach(log => console.log(log));

  const before = await page.textContent('#target');
  console.log('Before:', before);

  await page.click('#btn');
  await page.waitForTimeout(1000);

  console.log('=== After click ===');
  logs.forEach(log => console.log(log));
  errors.forEach(err => console.log('ERROR:', err));

  const after = await page.textContent('#target');
  console.log('After:', after);

  expect(after).toContain('SWAPPED');
});
