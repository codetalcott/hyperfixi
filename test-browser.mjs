import { chromium } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push(msg.text());
    console.log(`[CONSOLE] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[ERROR] ${err.message}`);
  });

  console.log('\n=== Testing browser bundle - basic toggle ===');
  await page.setContent(`
    <!DOCTYPE html>
    <html><body>
      <script src="${BASE_URL}/packages/core/dist/hyperfixi-browser.js"></script>
      <button id="btn" _="on click toggle .active">Toggle</button>
      <div id="status">Not clicked</div>
      <script>
        console.log('window.hyperfixi:', typeof window.hyperfixi);
        console.log('version:', window.hyperfixi?.version);
      </script>
    </body></html>
  `);

  await page.waitForTimeout(1000);

  const initialClass = await page.locator('#btn').getAttribute('class');
  console.log('Initial class:', initialClass);

  await page.click('#btn');
  await page.waitForTimeout(300);

  const newClass = await page.locator('#btn').getAttribute('class');
  console.log('After click class:', newClass);

  console.log('\n=== All console logs ===');
  logs.forEach(l => console.log(l));

  await page.waitForTimeout(5000);
  await browser.close();
})();
