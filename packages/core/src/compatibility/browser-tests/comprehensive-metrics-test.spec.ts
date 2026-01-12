/**
 * Comprehensive Metrics Test - Get actual compatibility numbers
 */

import { test, expect } from '@playwright/test';

// Window.evalHyperScript type is declared globally in browser-bundle.ts

test.describe('Comprehensive Compatibility Metrics', () => {
  test('all expression types', async ({ page }) => {
    await page.goto('http://localhost:3000/packages/core/compatibility-test.html');
    await page.waitForTimeout(1000);

    const results = await page.evaluate(async () => {
      const tests = [];

      // Math operations
      const mathTests = [
        { name: 'addition', expr: '1 + 1', expected: 2 },
        { name: 'subtraction', expr: '5 - 3', expected: 2 },
        { name: 'multiplication', expr: '2 * 3', expected: 6 },
        { name: 'division', expr: '10 / 2', expected: 5 },
        { name: 'modulo', expr: '7 mod 3', expected: 1 },
        { name: 'precedence', expr: '1 + 2 * 3', expected: 7 },
        { name: 'parentheses', expr: '(1 + 2) * 3', expected: 9 },
      ];

      // String operations
      const stringTests = [
        { name: 'string literal double', expr: '"hello"', expected: 'hello' },
        { name: 'string literal single', expr: "'world'", expected: 'world' },
        { name: 'string concat', expr: '"hello" + " world"', expected: 'hello world' },
        { name: 'string concat single', expr: "'hello' + ' world'", expected: 'hello world' },
      ];

      // Boolean operations
      const booleanTests = [
        { name: 'true literal', expr: 'true', expected: true },
        { name: 'false literal', expr: 'false', expected: false },
        { name: 'and true', expr: 'true and true', expected: true },
        { name: 'and false', expr: 'true and false', expected: false },
        { name: 'or true', expr: 'false or true', expected: true },
        { name: 'or false', expr: 'false or false', expected: false },
        { name: 'not true', expr: 'not true', expected: false },
        { name: 'not false', expr: 'not false', expected: true },
      ];

      // Comparison operations
      const comparisonTests = [
        { name: 'greater than true', expr: '5 > 3', expected: true },
        { name: 'greater than false', expr: '3 > 5', expected: false },
        { name: 'less than true', expr: '3 < 5', expected: true },
        { name: 'less than false', expr: '5 < 3', expected: false },
        { name: 'equals true', expr: '5 == 5', expected: true },
        { name: 'equals false', expr: '5 == 3', expected: false },
        { name: 'not equals true', expr: '5 != 3', expected: true },
        { name: 'not equals false', expr: '5 != 5', expected: false },
        { name: 'gte true', expr: '5 >= 5', expected: true },
        { name: 'lte true', expr: '5 <= 5', expected: true },
      ];

      // Number literals
      const numberTests = [
        { name: 'positive integer', expr: '42', expected: 42 },
        { name: 'negative integer', expr: '-42', expected: -42 },
        { name: 'float', expr: '3.14', expected: 3.14 },
        { name: 'zero', expr: '0', expected: 0 },
      ];

      const allTests = [
        ...mathTests.map(t => ({ ...t, category: 'math' })),
        ...stringTests.map(t => ({ ...t, category: 'string' })),
        ...booleanTests.map(t => ({ ...t, category: 'boolean' })),
        ...comparisonTests.map(t => ({ ...t, category: 'comparison' })),
        ...numberTests.map(t => ({ ...t, category: 'number' })),
      ];

      for (const test of allTests) {
        try {
          const result = await window.evalHyperScript(test.expr);
          const passed = result === test.expected;
          tests.push({
            category: test.category,
            name: test.name,
            expr: test.expr,
            expected: test.expected,
            result: result,
            passed: passed,
            error: null,
          });
        } catch (error) {
          tests.push({
            category: test.category,
            name: test.name,
            expr: test.expr,
            expected: test.expected,
            result: null,
            passed: false,
            error: (error as Error).message || String(error),
          });
        }
      }

      return tests;
    });

    // Calculate stats
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = Math.round((passed / total) * 100);

    const byCategory: Record<string, { total: number; passed: number; failed: number }> = {};
    for (const result of results) {
      if (!byCategory[result.category]) {
        byCategory[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      byCategory[result.category].total++;
      if (result.passed) {
        byCategory[result.category].passed++;
      } else {
        byCategory[result.category].failed++;
      }
    }

    console.log('\n=== COMPATIBILITY METRICS ===');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed} (${100 - passRate}%)`);
    console.log('\n=== BY CATEGORY ===');
    for (const [cat, stats] of Object.entries(byCategory)) {
      const s = stats as { total: number; passed: number; failed: number };
      const catPassRate = Math.round((s.passed / s.total) * 100);
      console.log(`${cat}: ${s.passed}/${s.total} (${catPassRate}%)`);
    }

    console.log('\n=== FAILED TESTS ===');
    const failedTests = results.filter(r => !r.passed);
    for (const test of failedTests) {
      console.log(`❌ ${test.category}/${test.name}: ${test.expr}`);
      console.log(`   Expected: ${test.expected}, Got: ${JSON.stringify(test.result)}`);
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    }

    // Don't fail the test, just report
    expect(total).toBeGreaterThan(0);
  });
});
