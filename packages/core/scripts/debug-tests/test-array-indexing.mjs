#!/usr/bin/env node
/**
 * Test array indexing syntax - Session 26
 * Tests: array[0], array[1+1], and validates array indexing works
 */

import { chromium } from 'playwright';

async function testArrayIndexing() {
  console.log('🧪 Testing array indexing syntax...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  const tests = [
    {
      name: 'Array indexing - first element [0]',
      code: `
        var arr = [10, 20, 30];
        var result = arr[0];
        if (result !== 10) throw new Error('Expected 10, got ' + result);
      `
    },
    {
      name: 'Array indexing - middle element [1]',
      code: `
        var arr = [10, 20, 30];
        var result = arr[1];
        if (result !== 20) throw new Error('Expected 20, got ' + result);
      `
    },
    {
      name: 'Array indexing - last element [2]',
      code: `
        var arr = [10, 20, 30];
        var result = arr[2];
        if (result !== 30) throw new Error('Expected 30, got ' + result);
      `
    },
    {
      name: 'Array indexing with expression [1+1]',
      code: `
        var arr = ["A", "B", "C"];
        var result = arr[1+1];
        if (result !== "C") throw new Error('Expected C, got ' + result);
      `
    },
    {
      name: 'Inline array literal indexing',
      code: `
        var result = await _hyperscript("[10, 20, 30][1]");
        if (result !== 20) throw new Error('Expected 20, got ' + result);
      `
    },
    {
      name: 'String character access',
      code: `
        var str = "hello";
        var result = str[1];
        if (result !== "e") throw new Error('Expected e, got ' + result);
      `
    }
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
  console.log(`${'='.repeat(60)}\n`);

  if (passed > 0) {
    console.log(`✨ Array indexing ${passed === tests.length ? 'fully' : 'partially'} implemented!`);
    console.log(`   ${passed}/${tests.length} tests passing\n`);
  }

  if (failed > 0) {
    console.log(`⚠️  ${failed} test(s) failed - may need implementation\n`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

testArrayIndexing().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
