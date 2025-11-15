#!/usr/bin/env node
/**
 * Test property access with subtraction (no spaces) - Session 30
 */

import { chromium } from 'playwright';

async function testPropertySubtraction() {
  console.log('🧪 Testing Property Access + Subtraction\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  const tests = [
    {
      name: 'arr.length-2 (no spaces) - standalone',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr.length-2", { arr });
        console.log('[TEST] arr.length-2 =', result, 'type:', typeof result);
        if (result !== 3) throw new Error('Expected 3, got ' + result);
      `
    },
    {
      name: '(arr.length-2) with parens - standalone',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("(arr.length-2)", { arr });
        console.log('[TEST] (arr.length-2) =', result);
        if (result !== 3) throw new Error('Expected 3, got ' + result);
      `
    },
    {
      name: 'arr[..(arr.length-2)] - with parens in range',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[..(arr.length-2)]", { arr });
        console.log('[TEST] arr[..(arr.length-2)] =', JSON.stringify(result));
        // arr.length-2 = 3, arr[..3] = [1,2,3,4]
        if (JSON.stringify(result) !== '[1,2,3,4]') throw new Error('Expected [1,2,3,4], got ' + JSON.stringify(result));
      `
    },
  ];

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    process.stdout.write(`[${i + 1}/${tests.length}] ${test.name}... `);

    try {
      const result = await page.evaluate(
        async ({ code }) => {
          try {
            const testFn = new Function(
              '_hyperscript',
              `return (async function() { ${code} })();`
            );
            await testFn(window.evalHyperScript);
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        { code: test.code }
      );

      if (result.success) {
        console.log('✅ PASS');
        passed++;
      } else {
        console.log(`❌ FAIL: ${result.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  await browser.close();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Results: ${passed}/${tests.length} passed`);
  console.log('='.repeat(60));

  if (passed === 3) {
    console.log(`\n✨ Workaround: Use parentheses for complex expressions in ranges\n`);
  } else if (passed === 2) {
    console.log(`\n⚠️  Parentheses required for complex expressions in ranges\n`);
  }

  process.exit(0);
}

testPropertySubtraction().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
