import { chromium } from 'playwright';

async function test() {
  console.log('🧪 Testing new test runner approach...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`  ${msg.text()}`));

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  console.log('Running test with complete code execution...\n');

  // This simulates what the new test runner does
  const result = await page.evaluate(async ({ code }) => {
    try {
      // Clear work area
      if (window.clearWorkArea) {
        window.clearWorkArea();
      }

      // Execute the complete test code
      const testFn = new Function(
        'make',
        'clearWorkArea',
        'evalHyperScript',
        `return (async function() { ${code} })();`
      );

      await testFn(
        window.make,
        window.clearWorkArea,
        window.evalHyperScript
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, {
    // This is the actual test code from classRef.js
    code: `
      var div = make("<div class='c1'></div>");
      var value = await evalHyperScript(".c1");
      var arr = Array.from(value);
      if (arr.length !== 1) {
        throw new Error('Expected 1 element, got ' + arr.length);
      }
      if (arr[0] !== div) {
        throw new Error('Element does not match');
      }
    `
  });

  console.log('\n📊 Test Result:');
  console.log(JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('\n✅ TEST RUNNER FIX WORKS!');
    console.log('The new approach successfully runs complete test code.');
  } else {
    console.log('\n❌ TEST FAILED:');
    console.log(result.error);
  }

  await page.waitForTimeout(2000);
  await browser.close();

  process.exit(result.success ? 0 : 1);
}

test().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
