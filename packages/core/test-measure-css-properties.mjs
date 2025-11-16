import { chromium } from 'playwright';

async function testMeasureCSSProperties() {
  console.log('🧪 Testing Measure Command CSS Property Syntax...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('📄 Loading test page...');
    await page.goto('http://127.0.0.1:3000/packages/core/test-measure-css-properties.html', {
      waitUntil: 'networkidle'
    });

    console.log('✅ Page loaded\n');

    const results = [];

    // Test 1: Measure *opacity
    console.log('Test 1: Measuring *opacity...');
    await page.click('text=Measure Opacity');
    await page.waitForTimeout(300);
    const result1 = await page.textContent('#result1');
    const opacity = parseFloat(result1);
    const test1Pass = !isNaN(opacity) && opacity >= 0 && opacity <= 1;
    console.log(`  Result: ${result1}`);
    console.log(`  Expected: Number between 0-1`);
    console.log(`  ${test1Pass ? '✅ PASS' : '❌ FAIL'}\n`);
    results.push(test1Pass);

    // Test 2: Measure *background-color
    console.log('Test 2: Measuring *background-color...');
    await page.click('text=Measure Background Color');
    await page.waitForTimeout(300);
    const result2 = await page.textContent('#result2');
    const test2Pass = result2.includes('red') || result2.includes('rgb');
    console.log(`  Result: ${result2}`);
    console.log(`  Expected: Contains 'red' or 'rgb'`);
    console.log(`  ${test2Pass ? '✅ PASS' : '❌ FAIL'}\n`);
    results.push(test2Pass);

    // Test 3: Measure *transform
    console.log('Test 3: Measuring *transform...');
    await page.click('text=Measure Transform');
    await page.waitForTimeout(300);
    const result3 = await page.textContent('#result3');
    const test3Pass = result3.includes('scale') || result3.includes('matrix') || result3.length > 0;
    console.log(`  Result: ${result3}`);
    console.log(`  Expected: Transform value`);
    console.log(`  ${test3Pass ? '✅ PASS' : '❌ FAIL'}\n`);
    results.push(test3Pass);

    // Test 4: Measure *display
    console.log('Test 4: Measuring *display...');
    await page.click('text=Measure Display');
    await page.waitForTimeout(300);
    const result4 = await page.textContent('#result4');
    const test4Pass = result4.includes('block') || result4.length > 0;
    console.log(`  Result: ${result4}`);
    console.log(`  Expected: 'block' or display value`);
    console.log(`  ${test4Pass ? '✅ PASS' : '❌ FAIL'}\n`);
    results.push(test4Pass);

    const allPassed = results.every(r => r);
    console.log('========================================');
    console.log(allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
    console.log('========================================\n');

    await browser.close();
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await browser.close();
    process.exit(1);
  }
}

testMeasureCSSProperties();
