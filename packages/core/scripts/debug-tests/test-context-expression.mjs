#!/usr/bin/env node
/**
 * Test context expression evaluation - Session 30
 * Debugging arr.length-2 issue
 */

import { chromium } from 'playwright';

async function testContextExpression() {
  console.log('🧪 Testing Context Expression Evaluation\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  const tests = [
    {
      name: 'arr.length - simple property',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr.length", { arr });
        console.log('[TEST] arr.length =', result);
        if (result !== 5) throw new Error('Expected 5, got ' + result);
      `
    },
    {
      name: 'arr.length - 1 - property with subtraction',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr.length - 1", { arr });
        console.log('[TEST] arr.length - 1 =', result);
        if (result !== 4) throw new Error('Expected 4, got ' + result);
      `
    },
    {
      name: 'arr.length - 2 - property with subtraction',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr.length - 2", { arr });
        console.log('[TEST] arr.length - 2 =', result);
        if (result !== 3) throw new Error('Expected 3, got ' + result);
      `
    },
    {
      name: 'arr[..arr.length-1] - property in range (no spaces)',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[..arr.length-1]", { arr });
        console.log('[TEST] arr[..arr.length-1] =', JSON.stringify(result));
        if (JSON.stringify(result) !== '[1,2]') throw new Error('Expected [1,2], got ' + JSON.stringify(result));
      `
    },
    {
      name: 'arr[..arr.length - 2] - property in range (with spaces)',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[..arr.length - 2]", { arr });
        console.log('[TEST] arr[..arr.length - 2] =', JSON.stringify(result));
        if (JSON.stringify(result) !== '[1,2,3]') throw new Error('Expected [1,2,3], got ' + JSON.stringify(result));
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
  console.log(`📊 Results: ${passed}/${tests.length} passed (${((passed/tests.length)*100).toFixed(1)}%)`);
  console.log('='.repeat(60));

  if (passed === tests.length) {
    console.log(`\n✨ Context expression evaluation working!\n`);
  } else {
    console.log(`\n⚠️  Some tests still failing (${failed} failures)\n`);
  }

  process.exit(0);
}

testContextExpression().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
