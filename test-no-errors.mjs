import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let allPassed = true;
  const errors = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  // Test 1: Compound Examples (Draggable)
  console.log('\n=== TEST 1: Compound Examples Page ===');
  errors.length = 0;

  await page.goto('http://localhost:3000/compound-examples.html', {
    waitUntil: 'networkidle'
  });

  await page.waitForTimeout(2000);

  const hasErrors1 = errors.some(e => e.includes('TypeError') || e.includes('COMMAND FAILED'));
  console.log('Page loaded:', '✅ YES');
  console.log('Console errors:', hasErrors1 ? `❌ YES (${errors.length})` : '✅ NO');

  if (hasErrors1) {
    console.log('Errors:', errors.slice(0, 3));
    allPassed = false;
  }

  // Test 2: Native Dialog Example
  console.log('\n=== TEST 2: Native Dialog Page ===');
  errors.length = 0;

  await page.goto('http://localhost:3000/examples/intermediate/06-native-dialog.html', {
    waitUntil: 'networkidle'
  });

  await page.waitForTimeout(1000);

  // Click the button
  await page.click('text=Open Info Dialog');
  await page.waitForTimeout(500);

  const dialogOpen = await page.evaluate(() => {
    const dialog = document.getElementById('info-dialog');
    return dialog && dialog.open;
  });

  const hasErrors2 = errors.some(e => e.includes('TypeError') || e.includes('COMMAND FAILED'));
  console.log('Page loaded:', '✅ YES');
  console.log('Dialog opened:', dialogOpen ? '✅ YES' : '❌ NO');
  console.log('Console errors:', hasErrors2 ? `❌ YES (${errors.length})` : '✅ NO');

  if (hasErrors2) {
    console.log('Errors:', errors.slice(0, 3));
    allPassed = false;
  }

  if (!dialogOpen) {
    allPassed = false;
  }

  // Final Results
  console.log('\n========== FINAL RESULTS ==========');
  console.log('Compound Examples (no errors):', !hasErrors1 ? '✅ PASS' : '❌ FAIL');
  console.log('Native Dialog (working):', (dialogOpen && !hasErrors2) ? '✅ PASS' : '❌ FAIL');
  console.log('Overall:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log('===================================\n');

  await browser.close();

  process.exit(allPassed ? 0 : 1);
})();
