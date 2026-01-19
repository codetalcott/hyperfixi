import { test } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

test('debug minimal bundle loading', async ({ page }) => {
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    logs.push(`[${type}] ${text}`);
    console.log(`[BROWSER ${type.toUpperCase()}]`, text);
  });

  page.on('pageerror', err => {
    console.log('[BROWSER ERROR]', err.message);
  });

  await page.goto(`${BASE_URL}/packages/core/test-pages/blocks-if-else.html?bundle=minimal`);
  await page.waitForTimeout(2000);

  console.log('\n=== All browser logs ===');
  logs.forEach(log => console.log(log));

  console.log('\n=== Checking window.hyperfixi ===');
  const hasHyperfixi = await page.evaluate(() => typeof window.hyperfixi);
  console.log('typeof window.hyperfixi:', hasHyperfixi);

  if (hasHyperfixi !== 'undefined') {
    const version = await page.evaluate(() => window.hyperfixi?.version);
    console.log('hyperfixi.version:', version);
  }
});
