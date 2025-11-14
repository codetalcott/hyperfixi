/**
 * Test :variable syntax with arithmetic operations
 * Verifies INCREMENT, DECREMENT, and arithmetic expressions work with local variables
 */

import { chromium } from 'playwright';

async function runTests() {
  console.log('🔍 Testing :variable with arithmetic operations...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen for console logs from the page
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🧪') || text.includes('🔍')) {
      console.log(` `, text);
    }
  });

  // Navigate to test page
  await page.goto('http://127.0.0.1:3000/test-variable-arithmetic.html');

  // Wait for HyperFixi to initialize
  await page.waitForTimeout(500);

  const tests = [
    { id: 'test-increment', resultId: 'result-increment', expected: '15', name: 'INCREMENT' },
    { id: 'test-decrement', resultId: 'result-decrement', expected: '13', name: 'DECREMENT' },
    { id: 'test-add', resultId: 'result-add', expected: '40', name: 'Addition' },
    { id: 'test-subtract', resultId: 'result-subtract', expected: '65', name: 'Subtraction' },
    { id: 'test-multiply', resultId: 'result-multiply', expected: '42', name: 'Multiplication' },
    { id: 'test-divide', resultId: 'result-divide', expected: '25', name: 'Division' },
    { id: 'test-complex', resultId: 'result-complex', expected: '11', name: 'Complex Expression' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n🧪 Testing ${test.name}...`);

    // Click the test button
    await page.click(`#${test.id}`);

    // Wait a bit for execution
    await page.waitForTimeout(200);

    // Get the result
    const result = await page.textContent(`#${test.resultId}`);

    if (result === test.expected) {
      console.log(`📊 Result: ${result} ✅ PASS`);
      passed++;
    } else {
      console.log(`📊 Result: ${result} ❌ FAIL (expected ${test.expected})`);
      failed++;
    }
  }

  await browser.close();

  console.log(`\n📊 Summary:`);
  console.log(`  Passed: ${passed}/${tests.length}`);
  console.log(`  Failed: ${failed}/${tests.length}`);

  if (failed === 0) {
    console.log(`\n✅ SUCCESS! All arithmetic operations work with :variable syntax!`);
    process.exit(0);
  } else {
    console.log(`\n❌ Some tests failed`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
