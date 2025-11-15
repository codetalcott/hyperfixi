#!/usr/bin/env node
/**
 * Test keyword fix - Session 30
 * Tests that keywords can be used as variable names in expressions
 */

import { chromium } from 'playwright';

async function testKeywordFix() {
  console.log('🧪 Testing Keyword Fix\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  const tests = [
    {
      name: 'array[start..end] - variables with keyword names',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var start = 1;
        var end = 3;
        var result = await _hyperscript("arr[start..end]", { arr, start, end });
        if (JSON.stringify(result) !== '[2,3,4]') throw new Error('Expected [2,3,4], got ' + JSON.stringify(result));
      `
    },
    {
      name: 'Use "start" as variable in expression',
      code: `
        var start = 42;
        var result = await _hyperscript("start", { start });
        if (result !== 42) throw new Error('Expected 42, got ' + result);
      `
    },
    {
      name: 'Use "end" as variable in expression',
      code: `
        var end = 99;
        var result = await _hyperscript("end", { end });
        if (result !== 99) throw new Error('Expected 99, got ' + result);
      `
    },
    {
      name: 'Use "of" as variable (another keyword)',
      code: `
        var of = "test";
        var result = await _hyperscript("of", { of });
        if (result !== "test") throw new Error('Expected "test", got ' + result);
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
    console.log(`\n✨ Keyword fix working! Keywords can be used as variable names.\n`);
  } else {
    console.log(`\n⚠️  Some tests still failing (${failed} failures)\n`);
  }

  process.exit(passed === tests.length ? 0 : 1);
}

testKeywordFix().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
