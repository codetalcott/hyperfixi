import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Disable cache
  await page.route('**/*', route => {
    route.continue({
      headers: {
        ...route.request().headers(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  });

  let allPassed = true;

  // Test 1: Draggable Example (from compound-examples.html)
  console.log('\n=== TEST 1: Draggable Example ===\n');

  await page.goto('http://localhost:3000/compound-examples.html', {
    waitUntil: 'networkidle'
  });

  await page.waitForTimeout(1000);

  let draggableWorking = false;

  // Get initial position of first draggable-item
  const initialPos = await page.evaluate(() => {
    const box = document.querySelector('#item1');
    if (!box) return null;
    return {
      left: parseInt(box.style.left || '0'),
      top: parseInt(box.style.top || '0')
    };
  });

  if (!initialPos) {
    console.log('❌ Could not find #item1 element');
    allPassed = false;
  } else {
    // Use click to trigger draggable behavior (Playwright's mouse.down() doesn't dispatch pointer events)
    await page.click('#item1 .titlebar');
    await page.waitForTimeout(500);

    // Check if position changed
    const finalPos = await page.evaluate(() => {
      const box = document.querySelector('#item1');
      if (!box) return null;
      return {
        left: parseInt(box.style.left || '0'),
        top: parseInt(box.style.top || '0')
      };
    });

    draggableWorking = finalPos && (finalPos.left !== initialPos.left || finalPos.top !== initialPos.top);
    console.log('Initial position:', initialPos);
    console.log('Final position:', finalPos);
    console.log('Draggable working:', draggableWorking ? '✅ YES' : '❌ NO');

    if (!draggableWorking) {
      allPassed = false;
    }
  }

  // Test 2: Native Dialog Example
  console.log('\n=== TEST 2: Native Dialog Example ===\n');

  await page.goto('http://localhost:3000/examples/intermediate/06-native-dialog.html', {
    waitUntil: 'networkidle'
  });

  await page.waitForTimeout(1000);

  // Click the button
  await page.click('text=Open Info Dialog');

  await page.waitForTimeout(500);

  // Check if dialog is open
  const dialogOpen = await page.evaluate(() => {
    const dialog = document.getElementById('info-dialog');
    return dialog && dialog.open;
  });

  console.log('Dialog opened:', dialogOpen ? '✅ YES' : '❌ NO');

  if (!dialogOpen) {
    allPassed = false;
  }

  // Final Results
  console.log('\n========== FINAL RESULTS ==========');
  console.log('Draggable Example:', draggableWorking ? '✅ PASS' : '❌ FAIL');
  console.log('Native Dialog Example:', dialogOpen ? '✅ PASS' : '❌ FAIL');
  console.log('Overall:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log('===================================\n');

  await browser.close();

  process.exit(allPassed ? 0 : 1);
})();
