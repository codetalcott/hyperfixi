#!/usr/bin/env node
import { chromium } from 'playwright';

async function debugRuntime() {
  console.log('🔍 Debugging runtime execution with enhanced logging...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  const errors = [];

  // Capture ALL console messages
  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: msg.type(), text });

    // Show all logs
    if (msg.type() === 'error') {
      console.error('  ❌', text);
      errors.push(text);
    } else if (text.includes('🔧')) {
      // Highlight our debug messages
      console.log('  ' + text);
    } else {
      console.log(`  [${msg.type()}]`, text);
    }
  });

  // Capture page errors
  page.on('pageerror', err => {
    console.error('  ❌ Page Error:', err.message);
    errors.push(err.message);
  });

  try {
    console.log('📄 Loading test page...\n');
    await page.goto('http://127.0.0.1:3000/test-set-variable.html', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    console.log('\n⏱️  Waiting for initialization...\n');
    await page.waitForTimeout(3000);

    console.log('\n🧪 Clicking Test 1 button...\n');
    await page.click('#test1');
    await page.waitForTimeout(500);
    const result1 = await page.textContent('#result1');
    console.log('📊 Result 1:', result1, result1 === '5' ? '✅' : '❌');

    console.log('\n🧪 Clicking Test 2 button...\n');
    await page.click('#test2');
    await page.waitForTimeout(500);
    const result2 = await page.textContent('#result2');
    console.log('📊 Result 2:', result2, result2 === 'hello' ? '✅' : '❌');

    console.log('\n🧪 Clicking Test 3 button...\n');
    await page.click('#test3');
    await page.waitForTimeout(500);
    const result3 = await page.textContent('#result3');
    console.log('📊 Result 3:', result3, result3 === '6' ? '✅' : '❌');

    console.log('\n📊 Summary:');
    console.log('  Errors:', errors.length);
    console.log('  Total logs:', logs.length);
    console.log('  Test 1:', result1 === '5' ? '✅ PASS' : '❌ FAIL');
    console.log('  Test 2:', result2 === 'hello' ? '✅ PASS' : '❌ FAIL');
    console.log('  Test 3:', result3 === '6' ? '✅ PASS' : '❌ FAIL');

    const allPassed = result1 === '5' && result2 === 'hello' && result3 === '6';
    if (allPassed) {
      console.log('\n✅ SUCCESS! All tests passed - :variable syntax works perfectly!');
    } else {
      console.log('\n❌ Some tests failed - check results above');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugRuntime();
