#!/usr/bin/env node
/**
 * Test array literal syntax
 */

import { chromium } from 'playwright';

async function testArrayLiterals() {
  console.log('🧪 Testing array literals...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  const tests = [
    {
      name: 'Empty array []',
      code: `
        var result = await _hyperscript("[]");
        if (JSON.stringify(result) !== '[]') throw new Error('Expected [], got ' + JSON.stringify(result));
      `
    },
    {
      name: 'Simple array [1, 2, 3]',
      code: `
        var result = await _hyperscript("[1, 2, 3]");
        if (JSON.stringify(result) !== '[1,2,3]') throw new Error('Expected [1,2,3], got ' + JSON.stringify(result));
      `
    },
    {
      name: 'String array ["a", "b", "c"]',
      code: `
        var result = await _hyperscript('["a", "b", "c"]');
        if (JSON.stringify(result) !== '["a","b","c"]') throw new Error('Expected ["a","b","c"], got ' + JSON.stringify(result));
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
    console.log(`✨ Array literals already implemented!`);
    console.log(`   ${passed}/${tests.length} tests passing\n`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

testArrayLiterals().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
