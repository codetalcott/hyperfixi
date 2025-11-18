import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/examples/intermediate';

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
    total: 6
  };

  // Test 01: Form Validation
  const test1 = await testExample(
    page,
    '01 - Form Validation',
    `${BASE_URL}/01-form-validation.html`,
    async (page) => {
      // Verify form and inputs exist
      const formExists = await page.evaluate(() => {
        return !!document.querySelector('#signup-form') &&
               !!document.querySelector('#email') &&
               !!document.querySelector('#password') &&
               !!document.querySelector('#confirm');
      });

      if (!formExists) return false;

      // Type invalid email (no @ symbol) to trigger validation
      await page.fill('#email', 'notanemail');
      await page.waitForTimeout(100);

      // Check if email error is shown
      const emailError = await page.evaluate(() => {
        const emailInput = document.querySelector('#email');
        const emailErrorMsg = document.querySelector('#email-error');
        return {
          hasErrorClass: emailInput?.classList.contains('error'),
          errorVisible: emailErrorMsg && window.getComputedStyle(emailErrorMsg).display !== 'none'
        };
      });

      // Verify validation is working (either class added or error shown)
      return emailError.hasErrorClass || emailError.errorVisible;
    }
  );
  results.passed += test1 ? 1 : 0;
  results.failed += test1 ? 0 : 1;

  // Test 02: Fetch Data
  const test2 = await testExample(
    page,
    '02 - Fetch Data',
    `${BASE_URL}/02-fetch-data.html`,
    async (page) => {
      // Click button to fetch data
      const fetchBtn = page.locator('button').first();
      await fetchBtn.click();
      await page.waitForTimeout(2000); // Wait for fetch

      // Check if data was loaded
      const hasData = await page.evaluate(() => {
        const container = document.querySelector('#data, .data, [class*="result"]');
        return container && container.textContent.trim().length > 0;
      });

      return hasData;
    }
  );
  results.passed += test2 ? 1 : 0;
  results.failed += test2 ? 0 : 1;

  // Test 03: Fade Effects
  const test3 = await testExample(
    page,
    '03 - Fade Effects',
    `${BASE_URL}/03-fade-effects.html`,
    async (page) => {
      // Get initial opacity
      const initialOpacity = await page.evaluate(() => {
        const elem = document.querySelector('.fade, [class*="fade"]');
        return elem ? window.getComputedStyle(elem).opacity : null;
      });

      // Trigger fade
      await page.click('button');
      await page.waitForTimeout(500);

      // Check opacity changed
      const newOpacity = await page.evaluate(() => {
        const elem = document.querySelector('.fade, [class*="fade"]');
        return elem ? window.getComputedStyle(elem).opacity : null;
      });

      return initialOpacity !== newOpacity;
    }
  );
  results.passed += test3 ? 1 : 0;
  results.failed += test3 ? 0 : 1;

  // Test 04: Tabs
  const test4 = await testExample(
    page,
    '04 - Tabs',
    `${BASE_URL}/04-tabs.html`,
    async (page) => {
      // Verify tabs and content exist
      const tabsExist = await page.evaluate(() => {
        return !!document.querySelector('#overview') &&
               !!document.querySelector('#features') &&
               !!document.querySelector('#pricing') &&
               !!document.querySelector('#support');
      });

      if (!tabsExist) return false;

      // Get initial active states
      const initialState = await page.evaluate(() => {
        return {
          overviewActive: document.querySelector('#overview')?.classList.contains('active'),
          featuresActive: document.querySelector('#features')?.classList.contains('active'),
          overviewVisible: window.getComputedStyle(document.querySelector('#overview')).display !== 'none',
          featuresVisible: window.getComputedStyle(document.querySelector('#features')).display !== 'none'
        };
      });

      // Initially #overview should be active and visible
      if (!initialState.overviewActive || !initialState.overviewVisible) return false;

      // Click second tab (Features)
      const tabs = page.locator('.tab');
      await tabs.nth(1).click();
      await page.waitForTimeout(300);

      // Check if state changed
      const newState = await page.evaluate(() => {
        return {
          overviewActive: document.querySelector('#overview')?.classList.contains('active'),
          featuresActive: document.querySelector('#features')?.classList.contains('active'),
          featuresVisible: window.getComputedStyle(document.querySelector('#features')).display !== 'none'
        };
      });

      // After clicking Features tab, #features should be active and visible
      return newState.featuresActive && newState.featuresVisible && !newState.overviewActive;
    }
  );
  results.passed += test4 ? 1 : 0;
  results.failed += test4 ? 0 : 1;

  // Test 05: Modal
  const test5 = await testExample(
    page,
    '05 - Modal',
    `${BASE_URL}/05-modal.html`,
    async (page) => {
      // Check modal initially hidden
      const initiallyHidden = await page.evaluate(() => {
        const modal = document.querySelector('.modal, [class*="modal"]');
        return modal && (
          modal.classList.contains('hidden') ||
          window.getComputedStyle(modal).display === 'none'
        );
      });

      // Open modal
      await page.click('button');
      await page.waitForTimeout(300);

      // Check modal visible
      const nowVisible = await page.evaluate(() => {
        const modal = document.querySelector('.modal, [class*="modal"]');
        return modal && (
          !modal.classList.contains('hidden') &&
          window.getComputedStyle(modal).display !== 'none'
        );
      });

      return initiallyHidden && nowVisible;
    }
  );
  results.passed += test5 ? 1 : 0;
  results.failed += test5 ? 0 : 1;

  // Test 06: Native Dialog
  const test6 = await testExample(
    page,
    '06 - Native Dialog',
    `${BASE_URL}/06-native-dialog.html`,
    async (page) => {
      // Click button to open dialog
      await page.click('button');
      await page.waitForTimeout(300);

      // Check if dialog is open
      const dialogOpen = await page.evaluate(() => {
        const dialog = document.querySelector('dialog');
        return dialog && dialog.open;
      });

      return dialogOpen;
    }
  );
  results.passed += test6 ? 1 : 0;
  results.failed += test6 ? 0 : 1;

  await browser.close();

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('INTERMEDIATE EXAMPLES TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total:  ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log('='.repeat(50));

  process.exit(results.failed > 0 ? 1 : 0);
})();
