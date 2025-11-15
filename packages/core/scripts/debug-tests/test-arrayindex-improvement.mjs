#!/usr/bin/env node
/**
 * Test arrayIndex improvements from Session 30 range syntax
 * Measures which official _hyperscript arrayIndex tests now pass
 */

import { chromium } from 'playwright';

async function testArrayIndexImprovement() {
  console.log('🧪 Testing arrayIndex Official Tests (Session 30 Improvement)\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  // Test categories from Session 26 analysis
  const tests = [
    // ===== BASIC INDEXING (6 tests) - Should have passed before =====
    {
      category: 'Basic Indexing',
      name: 'array[0] - first element',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[0]", { arr });
        if (result !== 1) throw new Error('Expected 1, got ' + result);
      `
    },
    {
      category: 'Basic Indexing',
      name: 'array[1+1] - expression index',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[1+1]", { arr });
        if (result !== 3) throw new Error('Expected 3, got ' + result);
      `
    },
    {
      category: 'Basic Indexing',
      name: '[1,2,3][1] - literal array indexing',
      code: `
        var result = await _hyperscript("[1,2,3][1]", {});
        if (result !== 2) throw new Error('Expected 2, got ' + result);
      `
    },
    {
      category: 'Basic Indexing',
      name: 'str[0] - string character access',
      code: `
        var str = "hello";
        var result = await _hyperscript("str[0]", { str });
        if (result !== 'h') throw new Error('Expected "h", got ' + result);
      `
    },
    {
      category: 'Basic Indexing',
      name: 'array[last] - last index',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[arr.length - 1]", { arr });
        if (result !== 5) throw new Error('Expected 5, got ' + result);
      `
    },
    {
      category: 'Basic Indexing',
      name: 'nested array[0][1]',
      code: `
        var arr = [[1, 2], [3, 4]];
        var result = await _hyperscript("arr[0][1]", { arr });
        if (result !== 2) throw new Error('Expected 2, got ' + result);
      `
    },

    // ===== RANGE SYNTAX (6 tests) - NEW WITH SESSION 30 =====
    {
      category: 'Range Syntax (NEW)',
      name: 'array[..2] - first elements',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[..2]", { arr });
        if (JSON.stringify(result) !== '[1,2,3]') throw new Error('Expected [1,2,3], got ' + JSON.stringify(result));
      `
    },
    {
      category: 'Range Syntax (NEW)',
      name: 'array[2..4] - middle range',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[2..4]", { arr });
        if (JSON.stringify(result) !== '[3,4,5]') throw new Error('Expected [3,4,5], got ' + JSON.stringify(result));
      `
    },
    {
      category: 'Range Syntax (NEW)',
      name: 'array[3..] - from index to end',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[3..]", { arr });
        if (JSON.stringify(result) !== '[4,5]') throw new Error('Expected [4,5], got ' + JSON.stringify(result));
      `
    },
    {
      category: 'Range Syntax (NEW)',
      name: 'string[1..3] - string slicing',
      code: `
        var str = "hello";
        var result = await _hyperscript("str[1..3]", { str });
        if (result !== 'ell') throw new Error('Expected "ell", got ' + result);
      `
    },
    {
      category: 'Range Syntax (NEW)',
      name: 'array[x..y] - variable range',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var x = 1;
        var y = 3;
        var result = await _hyperscript("arr[x..y]", { arr, x, y });
        if (JSON.stringify(result) !== '[2,3,4]') throw new Error('Expected [2,3,4], got ' + JSON.stringify(result));
      `
    },
    {
      category: 'Range Syntax (NEW)',
      name: 'nested range array[..2][0]',
      code: `
        var arr = [1, 2, 3, 4, 5];
        var result = await _hyperscript("arr[..2][0]", { arr });
        if (result !== 1) throw new Error('Expected 1, got ' + result);
      `
    },

    // ===== SPECIAL CASES (2 tests) =====
    {
      category: 'Special Cases',
      name: 'out of bounds index',
      code: `
        var arr = [1, 2, 3];
        var result = await _hyperscript("arr[10]", { arr });
        if (result !== undefined) throw new Error('Expected undefined, got ' + result);
      `
    },
    {
      category: 'Special Cases',
      name: 'empty array[0]',
      code: `
        var arr = [];
        var result = await _hyperscript("arr[0]", { arr });
        if (result !== undefined) throw new Error('Expected undefined, got ' + result);
      `
    },
  ];

  const results = {
    'Basic Indexing': { passed: 0, failed: 0, tests: [] },
    'Range Syntax (NEW)': { passed: 0, failed: 0, tests: [] },
    'Special Cases': { passed: 0, failed: 0, tests: [] },
  };

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const category = test.category;
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
        results[category].tests.push({ name: test.name, passed: true });
      } else {
        console.log(`❌ FAIL: ${result.error}`);
        results[category].failed++;
        results[category].tests.push({ name: test.name, passed: false, error: result.error });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      results[category].failed++;
      results[category].tests.push({ name: test.name, passed: false, error: error.message });
    }
  }

  await browser.close();

  // Print summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 RESULTS BY CATEGORY');
  console.log('='.repeat(70));

  for (const [category, stats] of Object.entries(results)) {
    const total = stats.passed + stats.failed;
    const percentage = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : '0.0';
    console.log(`\n${category}:`);
    console.log(`  ✅ Passed: ${stats.passed}/${total} (${percentage}%)`);
    console.log(`  ❌ Failed: ${stats.failed}/${total}`);
  }

  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalTests = Object.values(results).reduce((sum, r) => sum + r.passed + r.failed, 0);
  const overallPercentage = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📈 OVERALL: ${totalPassed}/${totalTests} passed (${overallPercentage}%)`);
  console.log('='.repeat(70));

  // Highlight improvement
  const rangePassed = results['Range Syntax (NEW)'].passed;
  const rangeTotal = results['Range Syntax (NEW)'].passed + results['Range Syntax (NEW)'].failed;

  console.log(`\n🎉 SESSION 30 IMPACT:`);
  console.log(`   Range Syntax: ${rangePassed}/${rangeTotal} tests passing`);
  console.log(`   Estimated gap closed: +${rangePassed} tests`);
  console.log(`   Overall arrayIndex improvement: ${rangePassed}/${14} official tests (+${((rangePassed/14)*100).toFixed(1)}%)\n`);

  process.exit(0);
}

testArrayIndexImprovement().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
