/**
 * Test ::globalVar syntax for explicit global scope
 * Verifies parser recognizes ::variable and runtime handles it correctly
 */

import { chromium } from 'playwright';

async function runTests() {
  console.log('🔍 Testing ::globalVar explicit global scope syntax...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen for console logs from the page
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🧪') || text.includes('🔍')) {
      console.log('  ', text);
    }
  });

  // Navigate to test page
  await page.goto('http://127.0.0.1:3000/test-global-variable.html');

  // Wait for HyperFixi to initialize
  await page.waitForTimeout(500);

  const tests = [
    {
      id: 'test1',
      resultId: 'result1',
      expected: '42',
      name: 'Basic ::global variable'
    },
    {
      id: 'test3',
      resultId: 'result3',
      expected: '25',
      name: '::global with INCREMENT'
    },
    {
      id: 'test4',
      resultId: 'result4',
      expected: '12',
      name: '::global in expressions'
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}...`);

    // Click the test button
    await page.click(`#${test.id}`);

    // Wait for execution
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

  // Test 2: Scope distinction
  console.log(`\n🧪 Testing: Scope distinction (::global vs :local)...`);
  await page.click('#test2a'); // Set ::sharedValue to 100
  await page.waitForTimeout(200);
  let result = await page.textContent('#result2');
  if (result === '100') {
    console.log(`📊 Step 1 (set ::sharedValue): ${result} ✅ PASS`);
    passed++;
  } else {
    console.log(`📊 Step 1 (set ::sharedValue): ${result} ❌ FAIL (expected 100)`);
    failed++;
  }

  await page.click('#test2b'); // Set :sharedValue to 5 (local)
  await page.waitForTimeout(200);
  result = await page.textContent('#result2');
  if (result === '5') {
    console.log(`📊 Step 2 (set :sharedValue local): ${result} ✅ PASS`);
    passed++;
  } else {
    console.log(`📊 Step 2 (set :sharedValue local): ${result} ❌ FAIL (expected 5)`);
    failed++;
  }

  await page.click('#test2c'); // Get ::sharedValue (should still be 100)
  await page.waitForTimeout(200);
  result = await page.textContent('#result2');
  if (result === '100') {
    console.log(`📊 Step 3 (get ::sharedValue): ${result} ✅ PASS`);
    passed++;
  } else {
    console.log(`📊 Step 3 (get ::sharedValue): ${result} ❌ FAIL (expected 100)`);
    failed++;
  }

  // Test 5: Cross-handler access
  console.log(`\n🧪 Testing: Cross-handler global access...`);
  await page.click('#test5a'); // Handler A sets ::message
  await page.waitForTimeout(200);
  await page.click('#test5b'); // Handler B reads ::message
  await page.waitForTimeout(200);
  result = await page.textContent('#result5');
  if (result === 'Hello from handler A') {
    console.log(`📊 Cross-handler access: ${result} ✅ PASS`);
    passed++;
  } else {
    console.log(`📊 Cross-handler access: ${result} ❌ FAIL (expected 'Hello from handler A')`);
    failed++;
  }

  // Test 7: Mixed scopes
  console.log(`\n🧪 Testing: Mixed scopes in loop...`);
  await page.click('#test7');
  await page.waitForTimeout(300);
  result = await page.textContent('#result7');
  if (result === 'Global: 6, Local: 6') {
    console.log(`📊 Mixed scopes: ${result} ✅ PASS`);
    passed++;
  } else {
    console.log(`📊 Mixed scopes: ${result} ❌ FAIL (expected 'Global: 6, Local: 6')`);
    failed++;
  }

  await browser.close();

  const total = passed + failed;
  console.log(`\n📊 Summary:`);
  console.log(`  Passed: ${passed}/${total}`);
  console.log(`  Failed: ${failed}/${total}`);

  if (failed === 0) {
    console.log(`\n✅ SUCCESS! All ::globalVar tests passed!`);
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
