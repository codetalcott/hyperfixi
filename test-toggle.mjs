import { chromium } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[BROWSER] ${text}`);
    logs.push(text);
  });

  page.on('pageerror', err => {
    console.log('[ERROR]', err.message);
  });

  console.log('\n=== Testing hybrid-hx toggle ===');
  await page.goto(`${BASE_URL}/examples/basics/02-toggle-class.html?bundle=hybrid-hx`);
  await page.waitForTimeout(1000);

  const box = page.locator('#box');
  const initialClasses = (await box.getAttribute('class')) ?? '';
  console.log('Initial classes:', initialClasses);

  console.log('\n=== Clicking button ===');
  await page.locator('button').first().click();
  await page.waitForTimeout(500);

  const newClasses = (await box.getAttribute('class')) ?? '';
  console.log('New classes:', newClasses);

  console.log('\n=== All logs ===');
  logs.forEach(l => console.log(l));

  await page.waitForTimeout(5000);
  await browser.close();
})();
