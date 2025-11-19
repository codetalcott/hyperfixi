import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console messages
  page.on('console', msg => {
    console.log('[Console]', msg.text());
  });

  // Clear cache and reload
  await context.clearCookies();
  await page.goto('http://localhost:3000/examples/intermediate/06-native-dialog.html', {
    waitUntil: 'networkidle'
  });

  console.log('\n🔍 Debugging context.it contents\n');

  // Wait for HyperFixi to initialize
  await page.waitForTimeout(1000);

  // Inject debugging script
  await page.evaluate(() => {
    // Override console.log to show what 'it' contains
    const originalLog = console.log;
    window.debugIt = function(label, value) {
      originalLog(`[DEBUG ${label}]:`, {
        type: typeof value,
        isArray: Array.isArray(value),
        value: value,
        constructor: value?.constructor?.name
      });
    };
  });

  console.log('Clicking button...');
  await page.click('text=Open Info Dialog');

  await page.waitForTimeout(2000);

  // Check result
  const dialogOpen = await page.evaluate(() => {
    const dialog = document.getElementById('info-dialog');
    return dialog && dialog.open;
  });

  console.log('\nDialog open:', dialogOpen ? '✅ YES' : '❌ NO\n');

  await browser.close();
})();
