#!/usr/bin/env node
import { chromium } from 'playwright';

async function debugExecution() {
  console.log('🔍 Debugging HyperFixi execution...\\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const logs = [];

  // Capture ALL console messages with details
  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: msg.type(), text });

    if (msg.type() === 'error') {
      console.error('  ❌ Console Error:', text);
    } else if (msg.type() === 'warning') {
      console.warn('  ⚠️  Console Warning:', text);
    } else {
      console.log(`  [${msg.type()}]`, text);
    }
  });

  // Capture page errors (uncaught exceptions)
  page.on('pageerror', err => {
    errors.push(err.message);
    console.error('  ❌ Page Error:', err.message);
    if (err.stack) {
      console.error('     Stack:', err.stack.split('\\n')[0]);
    }
  });

  // Capture network errors
  page.on('requestfailed', request => {
    console.error('  ❌ Network Error:', request.url(), request.failure().errorText);
  });

  try {
    console.log('📄 Loading test page...\\n');
    await page.goto('http://127.0.0.1:3000/test-set-variable.html', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    console.log('\\n⏱️  Waiting for initialization...\\n');
    await page.waitForTimeout(2000);

    // Check if HyperFixi loaded
    const hyperfixiLoaded = await page.evaluate(() => {
      return {
        exists: typeof window.hyperfixi !== 'undefined',
        hasInit: typeof window.hyperfixi?.init === 'function',
        hasAttributeProcessor: typeof window.hyperfixi?.attributeProcessor !== 'undefined'
      };
    });

    console.log('\\n🔍 HyperFixi Status:', hyperfixiLoaded);

    // Check if buttons have event listeners
    const buttonStatus = await page.evaluate(() => {
      const test1 = document.getElementById('test1');
      return {
        hasAttribute: test1.hasAttribute('_'),
        attributeValue: test1.getAttribute('_').substring(0, 50) + '...',
      };
    });

    console.log('\\n🔍 Button Status:', buttonStatus);

    console.log('\\n🧪 Clicking Test 1 button...\\n');
    await page.click('#test1');
    await page.waitForTimeout(1000);

    const result1 = await page.textContent('#result1');
    console.log('\\n📊 Result 1:', result1);

    // Check for any execution logs
    const executionLogs = logs.filter(l =>
      l.text.includes('SET') ||
      l.text.includes('PUT') ||
      l.text.includes('executing') ||
      l.text.includes('command')
    );

    if (executionLogs.length > 0) {
      console.log('\\n🔍 Execution logs found:', executionLogs.length);
      executionLogs.forEach(log => console.log('  ', log.text));
    } else {
      console.log('\\n⚠️  No execution logs found - commands may not be running');
    }

    console.log('\\n📊 Summary:');
    console.log('  Errors:', errors.length);
    console.log('  Total logs:', logs.length);
    console.log('  Result shows:', result1);

    if (result1 === '5') {
      console.log('\\n✅ SUCCESS! The :variable syntax works end-to-end!');
    } else if (result1 === 'not run') {
      console.log('\\n❌ Execution didn\'t run. Possible causes:');
      console.log('  1. Event handler not attached');
      console.log('  2. Attribute processor not processing _ attributes');
      console.log('  3. Compilation failed silently');
    } else {
      console.log('\\n⚠️  Unexpected result:', result1);
    }

  } catch (error) {
    console.error('\\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugExecution();
