#!/usr/bin/env node
/**
 * Test range syntax edge cases - Session 30
 * Tests: negative indices, empty ranges, out of bounds, type coercion
 */

import { chromium } from 'playwright';

async function testRangeEdgeCases() {
  console.log('🧪 Testing Range Syntax Edge Cases\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  const tests = [
    // ===== OUT OF BOUNDS =====
    {
      category: 'Out of Bounds',
      name: 'array[10..20] - both indices out of bounds',
      code: `
        var arr = [1, 2, 3];
        var result = await _hyperscript("arr[10..20]", { arr });
        if (JSON.stringify(result) !== '[]') throw new Error('Expected [], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Returns empty array'
    },
    {
      category: 'Out of Bounds',
      name: 'array[..10] - end beyond length',
      code: `
        var arr = [1, 2, 3];
        var result = await _hyperscript("arr[..10]", { arr });
        if (JSON.stringify(result) !== '[1,2,3]') throw new Error('Expected [1,2,3], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Returns entire array'
    },
    {
      category: 'Out of Bounds',
      name: 'array[5..] - start beyond length',
      code: `
        var arr = [1, 2, 3];
        var result = await _hyperscript("arr[5..]", { arr });
        if (JSON.stringify(result) !== '[]') throw new Error('Expected [], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Returns empty array'
    },

    // ===== EMPTY RANGES =====
    {
      category: 'Empty Ranges',
      name: 'array[2..1] - reversed indices',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[2..1]", { arr });
        if (JSON.stringify(result) !== '[]') throw new Error('Expected [], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Returns empty array (start > end)'
    },
    {
      category: 'Empty Ranges',
      name: 'array[2..2] - same start and end',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[2..2]", { arr });
        if (JSON.stringify(result) !== '[3]') throw new Error('Expected [3], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Returns single element (inclusive)'
    },
    {
      category: 'Empty Ranges',
      name: '[][..10] - empty array range',
      code: `
        var arr = [];
        var result = await _hyperscript("arr[..10]", { arr });
        if (JSON.stringify(result) !== '[]') throw new Error('Expected [], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Returns empty array'
    },

    // ===== TYPE COERCION =====
    {
      category: 'Type Coercion',
      name: 'array["1".."3"] - string indices',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript('arr["1".."3"]', { arr });
        if (JSON.stringify(result) !== '[2,3,4]') throw new Error('Expected [2,3,4], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Coerces strings to numbers'
    },
    {
      category: 'Type Coercion',
      name: 'array[1.5..3.7] - float indices',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[1.5..3.7]", { arr });
        if (JSON.stringify(result) !== '[2,3,4]') throw new Error('Expected [2,3,4], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Truncates to integers'
    },

    // ===== STRING SLICING =====
    {
      category: 'String Slicing',
      name: '"hello"[..2] - string range',
      code: `
        var str = "hello";
        var result = await _hyperscript('str[..2]', { str });
        if (result !== 'hel') throw new Error('Expected "hel", got ' + result);
      `,
      expectedBehavior: 'String slicing works'
    },
    {
      category: 'String Slicing',
      name: '"hello"[1..] - string from index',
      code: `
        var str = "hello";
        var result = await _hyperscript('str[1..]', { str });
        if (result !== 'ello') throw new Error('Expected "ello", got ' + result);
      `,
      expectedBehavior: 'String slicing from index'
    },
    {
      category: 'String Slicing',
      name: 'empty string[..10]',
      code: `
        var str = "";
        var result = await _hyperscript('str[..10]', { str });
        if (result !== '') throw new Error('Expected "", got ' + result);
      `,
      expectedBehavior: 'Empty string returns empty'
    },

    // ===== COMPLEX EXPRESSIONS =====
    {
      category: 'Complex Expressions',
      name: 'array[..arr.length-2] - expression in range',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[..arr.length-2]", { arr });
        if (JSON.stringify(result) !== '[1,2,3]') throw new Error('Expected [1,2,3], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Expression evaluation works'
    },
    {
      category: 'Complex Expressions',
      name: 'array[start..end] - variable ranges',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var start = 1;
        var end = 3;
        var result = await _hyperscript("arr[start..end]", { arr, start, end });
        if (JSON.stringify(result) !== '[2,3,4]') throw new Error('Expected [2,3,4], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Variables work in ranges'
    },

    // ===== CHAINED OPERATIONS =====
    {
      category: 'Chained Operations',
      name: 'array[..3][1..] - chained ranges',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[..3][1..]", { arr });
        if (JSON.stringify(result) !== '[2,3,4]') throw new Error('Expected [2,3,4], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Chained range operations'
    },
    {
      category: 'Chained Operations',
      name: '[[1,2],[3,4]][0][..1] - nested array range',
      code: `
        var arr = [[1, 2], [3, 4]];
        var result = await _hyperscript("arr[0][..1]", { arr });
        if (JSON.stringify(result) !== '[1,2]') throw new Error('Expected [1,2], got ' + JSON.stringify(result));
      `,
      expectedBehavior: 'Range on nested array element'
    },
  ];

  const results = {};
  let totalPassed = 0;
  let totalFailed = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const category = test.category;

    if (!results[category]) {
      results[category] = { passed: 0, failed: 0, tests: [] };
    }

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
        results[category].passed++;
        totalPassed++;
        results[category].tests.push({ name: test.name, passed: true });
      } else {
        console.log(`❌ FAIL: ${result.error}`);
        results[category].failed++;
        totalFailed++;
        results[category].tests.push({
          name: test.name,
          passed: false,
          error: result.error,
          expectedBehavior: test.expectedBehavior
        });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      results[category].failed++;
      totalFailed++;
      results[category].tests.push({
        name: test.name,
        passed: false,
        error: error.message,
        expectedBehavior: test.expectedBehavior
      });
    }
  }

  await browser.close();

  // Print summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 EDGE CASE TEST RESULTS');
  console.log('='.repeat(70));

  for (const [category, stats] of Object.entries(results)) {
    const total = stats.passed + stats.failed;
    const percentage = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : '0.0';
    console.log(`\n${category}:`);
    console.log(`  ✅ Passed: ${stats.passed}/${total} (${percentage}%)`);
    console.log(`  ❌ Failed: ${stats.failed}/${total}`);

    // Show failed tests
    if (stats.failed > 0) {
      console.log(`  Failed tests:`);
      stats.tests.filter(t => !t.passed).forEach(t => {
        console.log(`    - ${t.name}`);
        console.log(`      Expected: ${t.expectedBehavior}`);
        console.log(`      Error: ${t.error}`);
      });
    }
  }

  const totalTests = totalPassed + totalFailed;
  const overallPercentage = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📈 OVERALL: ${totalPassed}/${totalTests} passed (${overallPercentage}%)`);
  console.log('='.repeat(70));

  if (totalPassed === totalTests) {
    console.log(`\n✨ All edge cases handled correctly! Range syntax is robust.\n`);
  } else {
    console.log(`\n⚠️  Some edge cases need attention (${totalFailed} failing)\n`);
  }

  process.exit(0);
}

testRangeEdgeCases().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
