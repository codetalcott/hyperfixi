import { chromium } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(`${BASE_URL}/packages/core/test-pages/blocks-if-else.html?bundle=browser`);
  await page.waitForTimeout(2000);

  console.log('\n=== Testing has operator directly ===');

  const result = await page.evaluate(() => {
    const btn = document.getElementById('btn');

    // Test 1: Direct classList check
    const hasClassDirect = btn.classList.contains('active');

    // Test 2: Try to evaluate hyperscript expression
    let hyperfixiResult = 'not tested';
    try {
      if (window.hyperfixi && window.hyperfixi.evaluate) {
        // Try to evaluate "me has .active" with btn as context
        const code = 'me has .active';
        hyperfixiResult = window.hyperfixi.evaluate(code, btn);
      }
    } catch (e) {
      hyperfixiResult = `error: ${e.message}`;
    }

    return {
      hasClassDirect,
      hyperfixiResult,
      classList: Array.from(btn.classList),
    };
  });

  console.log('Results:');
  console.log('- Direct classList.contains("active"):', result.hasClassDirect);
  console.log('- Button classList:', result.classList);
  console.log('- Hyperfixi evaluate result:', result.hyperfixiResult);

  await page.waitForTimeout(5000);
  await browser.close();
})();
