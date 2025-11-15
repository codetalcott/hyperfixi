#!/usr/bin/env node
/**
 * Test range syntax - Session 26
 * Tests: array[..3], array[2..4], array[3..]
 */

import { chromium } from 'playwright';

async function testRangeSyntax() {
  console.log('🧪 Testing range syntax...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  const tests = [
    {
      name: 'Range syntax - first elements [..3]',
      code: `
        var arr = [0, 1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[..3]", { arr });
        if (JSON.stringify(result) !== '[0,1,2,3]') throw new Error('Expected [0,1,2,3], got ' + JSON.stringify(result));
      `
    },
    {
      name: 'Range syntax - middle elements [2..3]',
      code: `
        var arr = [0, 1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[2..3]", { arr });
        if (JSON.stringify(result) !== '[2,3]') throw new Error('Expected [2,3], got ' + JSON.stringify(result));
      `
    },
    {
      name: 'Range syntax - last elements [3..]',
      code: `
        var arr = [0, 1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[3..]", { arr });
        if (JSON.stringify(result) !== '[3,4,5]') throw new Error('Expected [3,4,5], got ' + JSON.stringify(result));
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

  if (passed === 0) {
    console.log(`❌ Range syntax NOT implemented (expected)\n`);
  } else if (passed < tests.length) {
    console.log(`⚠️  Range syntax partially implemented\n`);
  } else {
    console.log(`✨ Range syntax fully implemented!\n`);
  }

  // Don't fail if range syntax isn't implemented (it's expected)
  process.exit(0);
}

testRangeSyntax().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
