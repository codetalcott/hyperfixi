/**
 * REAL Official Expression Compatibility Tests
 * Tests our actual expressions against official _hyperscript patterns
 * Based on our successful command compatibility pattern
 */

import { test, expect, Page } from '@playwright/test';

test.describe('REAL Official Expression Compatibility Tests', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000/compatibility-test.html');
    await page.waitForTimeout(2000);
  });

  test('String Expressions (Official Test Patterns)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        // From official strings.js test file
        { expr: '"foo"', expected: 'foo' },
        { expr: '"fo\'o"', expected: "fo'o" },
        { expr: "'foo'", expected: 'foo' },
        { expr: "'hello world'", expected: 'hello world' },
        { expr: '"hello world"', expected: 'hello world' },
      ];

      const results = [];
      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr);
          results.push({
            expression: test.expr,
            expected: test.expected,
            actual: result,
            success: result === test.expected,
            error: null,
          });
        } catch (error) {
          results.push({
            expression: test.expr,
            expected: test.expected,
            actual: null,
            success: false,
            error: error.message,
          });
        }
      }
      return results;
    });

    console.log('📝 String Expression Results (Official Patterns):');
    let passed = 0;
    for (const result of results) {
      if (result.success) {
        console.log(`  ✅ ${result.expression} = ${JSON.stringify(result.actual)}`);
        passed++;
      } else {
        console.log(
          `  ❌ ${result.expression}: Expected ${JSON.stringify(result.expected)}, got ${JSON.stringify(result.actual)}`
        );
        if (result.error) console.log(`     Error: ${result.error}`);
      }
    }
    console.log(
      `  📊 String Tests: ${passed}/${results.length} passed (${Math.round((passed / results.length) * 100)}%)`
    );

    expect(passed).toBeGreaterThan(results.length * 0.8); // 80%+ success rate
  });

  test('Math Expressions (Official Test Patterns)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        // From official mathOperator.js test file
        { expr: '1 + 1', expected: 2 },
        { expr: '5 - 3', expected: 2 },
        { expr: '2 * 3', expected: 6 },
        { expr: '6 / 2', expected: 3 },
        { expr: '5 mod 3', expected: 2 },
        { expr: '1 + 2 + 3', expected: 6 },
        { expr: "'a' + 'b'", expected: 'ab' },
        { expr: '(2 + 3) * 4', expected: 20 },
      ];

      const results = [];
      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr);
          results.push({
            expression: test.expr,
            expected: test.expected,
            actual: result,
            success: result === test.expected,
            error: null,
          });
        } catch (error) {
          results.push({
            expression: test.expr,
            expected: test.expected,
            actual: null,
            success: false,
            error: error.message,
          });
        }
      }
      return results;
    });

    console.log('🧮 Math Expression Results (Official Patterns):');
    let passed = 0;
    for (const result of results) {
      if (result.success) {
        console.log(`  ✅ ${result.expression} = ${result.actual}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.expression}: Expected ${result.expected}, got ${result.actual}`);
        if (result.error) console.log(`     Error: ${result.error}`);
      }
    }
    console.log(
      `  📊 Math Tests: ${passed}/${results.length} passed (${Math.round((passed / results.length) * 100)}%)`
    );

    expect(passed).toBeGreaterThan(results.length * 0.7); // 70%+ success rate
  });

  test('Boolean & Logical Expressions (Official Test Patterns)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        // From official boolean.js and logicalOperator.js
        { expr: 'true', expected: true },
        { expr: 'false', expected: false },
        { expr: 'true and true', expected: true },
        { expr: 'true and false', expected: false },
        { expr: 'false or true', expected: true },
        { expr: 'false or false', expected: false },
        { expr: 'not true', expected: false },
        { expr: 'not false', expected: true },
        { expr: '(true and false) or true', expected: true },
      ];

      const results = [];
      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr);
          results.push({
            expression: test.expr,
            expected: test.expected,
            actual: result,
            success: result === test.expected,
            error: null,
          });
        } catch (error) {
          results.push({
            expression: test.expr,
            expected: test.expected,
            actual: null,
            success: false,
            error: error.message,
          });
        }
      }
      return results;
    });

    console.log('🤔 Boolean/Logical Expression Results (Official Patterns):');
    let passed = 0;
    for (const result of results) {
      if (result.success) {
        console.log(`  ✅ ${result.expression} = ${result.actual}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.expression}: Expected ${result.expected}, got ${result.actual}`);
        if (result.error) console.log(`     Error: ${result.error}`);
      }
    }
    console.log(
      `  📊 Boolean/Logical Tests: ${passed}/${results.length} passed (${Math.round((passed / results.length) * 100)}%)`
    );

    expect(passed).toBeGreaterThan(results.length * 0.8); // 80%+ success rate
  });

  test('Comparison Expressions (Official Test Patterns)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        // From official comparisonOperator.js
        { expr: '5 > 3', expected: true },
        { expr: '3 > 5', expected: false },
        { expr: '5 >= 5', expected: true },
        { expr: '3 < 5', expected: true },
        { expr: '5 <= 5', expected: true },
        { expr: '5 == 5', expected: true },
        { expr: '5 != 3', expected: true },
        { expr: '5 is 5', expected: true },
        { expr: '5 is not 3', expected: true },
      ];

      const results = [];
      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr);
          results.push({
            expression: test.expr,
            expected: test.expected,
            actual: result,
            success: result === test.expected,
            error: null,
          });
        } catch (error) {
          results.push({
            expression: test.expr,
            expected: test.expected,
            actual: null,
            success: false,
            error: error.message,
          });
        }
      }
      return results;
    });

    console.log('⚖️ Comparison Expression Results (Official Patterns):');
    let passed = 0;
    for (const result of results) {
      if (result.success) {
        console.log(`  ✅ ${result.expression} = ${result.actual}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.expression}: Expected ${result.expected}, got ${result.actual}`);
        if (result.error) console.log(`     Error: ${result.error}`);
      }
    }
    console.log(
      `  📊 Comparison Tests: ${passed}/${results.length} passed (${Math.round((passed / results.length) * 100)}%)`
    );

    expect(passed).toBeGreaterThan(results.length * 0.8); // 80%+ success rate
  });

  test('Possessive Expressions (Official Test Patterns)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        // From official possessiveExpression.js
        { expr: 'its result', context: { result: { result: 'success' } }, expected: 'success' },
        { expr: 'my value', context: { me: { value: 42 } }, expected: 42 },
        { expr: 'your data', context: { you: { data: 'test' } }, expected: 'test' },
      ];

      const results = [];
      for (const test of tests) {
        try {
          const result = await evalHyperScript(test.expr, test.context || {});
          results.push({
            expression: test.expr,
            expected: test.expected,
            actual: result,
            success: result === test.expected,
            error: null,
          });
        } catch (error) {
          results.push({
            expression: test.expr,
            expected: test.expected,
            actual: null,
            success: false,
            error: error.message,
          });
        }
      }
      return results;
    });

    console.log('🔗 Possessive Expression Results (Official Patterns):');
    let passed = 0;
    for (const result of results) {
      if (result.success) {
        console.log(`  ✅ ${result.expression} = ${JSON.stringify(result.actual)}`);
        passed++;
      } else {
        console.log(
          `  ❌ ${result.expression}: Expected ${JSON.stringify(result.expected)}, got ${JSON.stringify(result.actual)}`
        );
        if (result.error) console.log(`     Error: ${result.error}`);
      }
    }
    console.log(
      `  📊 Possessive Tests: ${passed}/${results.length} passed (${Math.round((passed / results.length) * 100)}%)`
    );

    expect(passed).toBeGreaterThan(results.length * 0.8); // 80%+ success rate
  });

  test.afterAll(async () => {
    console.log('\n🎯 Real Official Expression Compatibility Assessment Complete');
    console.log('This uses actual evalHyperScript() calls against official test patterns');
  });
});
