import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Track all console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.error('❌ PAGE ERROR:', error.message);
  });

  console.log('\n=== Testing Full Cookbook Page Performance Fix ===\n');

  // Test 1: Load WITHOUT debug mode (should be fast)
  console.log('📊 Test 1: Loading without debug mode...');
  const start1 = Date.now();
  await page.goto('http://127.0.0.1:3000/cookbook/full-cookbook-test.html');
  await page.waitForTimeout(1000);
  const loadTime1 = Date.now() - start1;

  const debugDisabledMessage = await page.evaluate(() => {
    const consoleEl = document.getElementById('console-output');
    return consoleEl ? consoleEl.innerHTML : '';
  });

  console.log(`   Load time: ${loadTime1}ms`);
  console.log(`   Console logs: ${consoleLogs.length}`);
  console.log(`   Debug mode disabled: ${debugDisabledMessage.includes('Click "Run All Tests"')}`);

  // Test 2: Check console size limit works
  console.log('\n📊 Test 2: Testing console size limit...');
  // Manually run tests to generate logs
  await page.click('button:has-text("Run All Tests")');
  await page.waitForTimeout(5000); // Wait for tests to complete

  const consoleSpanCount = await page.evaluate(() => {
    const consoleEl = document.getElementById('console-output');
    return consoleEl ? consoleEl.querySelectorAll('span').length : 0;
  });

  console.log(`   Console span count: ${consoleSpanCount}`);
  console.log(`   Under limit (100): ${consoleSpanCount <= 100 ? '✅' : '❌'}`);

  // Test 3: Load WITH debug mode (should log more)
  console.log('\n📊 Test 3: Loading with debug mode...');
  consoleLogs.length = 0; // Clear
  const start3 = Date.now();
  await page.goto('http://127.0.0.1:3000/cookbook/full-cookbook-test.html?debug=true');
  await page.waitForTimeout(1000);
  const loadTime3 = Date.now() - start3;

  console.log(`   Load time: ${loadTime3}ms`);
  console.log(`   Console logs: ${consoleLogs.length}`);
  console.log(`   Debug enabled: ${consoleLogs.some(log => log.includes('Debug mode ENABLED'))}`);

  // Summary
  console.log('\n=== Performance Summary ===\n');
  console.log(`Load time (no debug):  ${loadTime1}ms`);
  console.log(`Load time (with debug): ${loadTime3}ms`);
  console.log(`Console size limit:     ${consoleSpanCount <= 100 ? '✅ Working' : '❌ Not working'}`);
  console.log(`Debug control:          ${consoleLogs.some(log => log.includes('Debug mode ENABLED')) ? '✅ Working' : '❌ Not working'}`);

  await browser.close();

  // Exit with success if all tests pass
  const allPass = consoleSpanCount <= 100 && consoleLogs.some(log => log.includes('Debug mode ENABLED'));
  process.exit(allPass ? 0 : 1);
})();
