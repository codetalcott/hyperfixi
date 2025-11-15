#!/usr/bin/env node
import { chromium } from 'playwright';

async function testSingleCase() {
  console.log('🧪 Testing single attributeRef case...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Enable console logging to see what's happening
  page.on('console', msg => console.log(`  [Browser] ${msg.text()}`));

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  // This is the actual test code from attributeRef.js (with await added for async HyperFixi)
  const testCode = `
    var div = make("<div foo='c1'></div>");
    var value = await _hyperscript("[@foo]", { me: div });
    value.should.equal("c1");
  `;

  console.log('Test code to execute:');
  console.log(testCode);
  console.log('\nExecuting...\n');

  try {
    const result = await page.evaluate(
      async ({ code }) => {
        try {
          if (window.clearWorkArea) {
            window.clearWorkArea();
          }

          const testFn = new Function(
            'make',
            'clearWorkArea',
            'evalHyperScript',
            'getParseErrorFor',
            '_hyperscript',
            'document',
            'window',
            'Array',
            `return (async function() { ${code} })();`
          );

          await testFn(
            window.make,
            window.clearWorkArea,
            window.evalHyperScript,
            window.getParseErrorFor,
            window.evalHyperScript,  // Map _hyperscript to our implementation
            document,
            window,
            Array
          );

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message, stack: error.stack };
        }
      },
      { code: testCode }
    );

    if (result.success) {
      console.log('✅ TEST PASSED!');
    } else {
      console.log('❌ TEST FAILED:', result.error);
      if (result.stack) {
        console.log('Stack:', result.stack);
      }
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  await page.waitForTimeout(2000);
  await browser.close();
}

testSingleCase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
