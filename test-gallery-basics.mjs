import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/examples/basics';

async function testExample(page, name, url, testFn) {
  console.log(`\n=== Testing: ${name} ===`);

  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check that HyperFixi loaded
    const hyperfixiLoaded = await page.evaluate(() => typeof hyperfixi !== 'undefined');
    if (!hyperfixiLoaded) {
      console.log(`❌ ${name}: HyperFixi not loaded`);
      return false;
    }

    // Run example-specific test
    const result = await testFn(page);

    if (errors.length > 0) {
      console.log(`⚠️  ${name}: ${errors.length} error(s) detected`);
      errors.slice(0, 3).forEach(e => console.log(`  - ${e}`));
    }

    if (result) {
      console.log(`✅ ${name}: PASS`);
    } else {
      console.log(`❌ ${name}: FAIL`);
    }

    return result;
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = {
    passed: 0,
    failed: 0,
    total: 5
  };

  // Test 01: Hello World
  const test1 = await testExample(
    page,
    '01 - Hello World',
    `${BASE_URL}/01-hello-world.html`,
    async (page) => {
      // Click the button and verify text appears
      await page.click('button');
      await page.waitForTimeout(200);

      const message = await page.textContent('#output');
      return message && message.includes('HyperFixi');
    }
  );
  results.passed += test1 ? 1 : 0;
  results.failed += test1 ? 0 : 1;

  // Test 02: Toggle Class
  const test2 = await testExample(
    page,
    '02 - Toggle Class',
    `${BASE_URL}/02-toggle-class.html`,
    async (page) => {
      const box = page.locator('#box');

      // Check initial state (should not have .active)
      const initialClass = await box.getAttribute('class');
      const initiallyActive = initialClass?.includes('active') || false;

      // Click button to toggle
      await page.click('button');
      await page.waitForTimeout(200);

      const afterClick = await box.getAttribute('class');
      const nowActive = afterClick?.includes('active') || false;

      // Verify class toggled
      return initiallyActive !== nowActive;
    }
  );
  results.passed += test2 ? 1 : 0;
  results.failed += test2 ? 0 : 1;

  // Test 03: Show/Hide
  const test3 = await testExample(
    page,
    '03 - Show/Hide',
    `${BASE_URL}/03-show-hide.html`,
    async (page) => {
      const content = page.locator('#content');

      // Check initial visibility
      const initialVisible = await content.isVisible();

      // Click the toggle button (3rd button with class="success")
      await page.click('button.success');
      await page.waitForTimeout(200);

      const afterToggle = await content.isVisible();

      // Verify visibility changed
      return initialVisible !== afterToggle;
    }
  );
  results.passed += test3 ? 1 : 0;
  results.failed += test3 ? 0 : 1;

  // Test 04: Input Mirror
  const test4 = await testExample(
    page,
    '04 - Input Mirror',
    `${BASE_URL}/04-input-mirror.html`,
    async (page) => {
      const input = page.locator('input#name');
      const mirror = page.locator('#name-mirror');

      // Type some text
      await input.fill('Test message');
      await page.waitForTimeout(200);

      // Check if mirror displays input value
      const mirrorText = await mirror.textContent();
      return mirrorText && mirrorText.includes('Test message');
    }
  );
  results.passed += test4 ? 1 : 0;
  results.failed += test4 ? 0 : 1;

  // Test 05: Counter
  const test5 = await testExample(
    page,
    '05 - Counter',
    `${BASE_URL}/05-counter.html`,
    async (page) => {
      const counter = page.locator('#count');

      // Get initial count
      const initialCount = parseInt(await counter.textContent() || '0');

      // Click increment button (the last button has increment)
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      await buttons.nth(buttonCount - 1).click(); // Last button is increment
      await page.waitForTimeout(200);

      // Check count increased
      const newCount = parseInt(await counter.textContent() || '0');
      return newCount === initialCount + 1;
    }
  );
  results.passed += test5 ? 1 : 0;
  results.failed += test5 ? 0 : 1;

  await browser.close();

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('BASICS EXAMPLES TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total:  ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log('='.repeat(50));

  process.exit(results.failed > 0 ? 1 : 0);
})();
