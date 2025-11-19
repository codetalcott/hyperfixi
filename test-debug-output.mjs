import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // Disable cache to force fresh bundle load
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Disable cache
  await page.route('**/*', route => {
    route.continue({
      headers: {
        ...route.request().headers(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  });

  // Capture ALL console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log('[CONSOLE]', text);
  });

  // Load page with networkidle to ensure bundle loads
  await page.goto('http://localhost:3000/examples/intermediate/06-native-dialog.html', {
    waitUntil: 'networkidle'
  });
  console.log('\n✨ Testing with Full Debug Output\n');

  // Wait for HyperFixi to initialize
  await page.waitForTimeout(1000);

  console.log('Clicking button to trigger: get #info-dialog call it.showModal()...\n');

  // Click the button
  await page.click('text=Open Info Dialog');

  // Wait a bit for execution
  await page.waitForTimeout(2000);

  // Check if dialog is open
  const dialogOpen = await page.evaluate(() => {
    const dialog = document.getElementById('info-dialog');
    return dialog && dialog.open;
  });

  console.log('\n========== TEST RESULTS ==========');
  console.log('Dialog opened:', dialogOpen ? '✅ YES' : '❌ NO');
  console.log('\n========== ALL CONSOLE MESSAGES ==========');
  consoleMessages.forEach((msg, i) => {
    console.log(`[${i+1}]`, msg);
  });
  console.log('=========================================\n');

  await browser.close();
})();
