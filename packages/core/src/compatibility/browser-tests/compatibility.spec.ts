/**
 * Browser-based _hyperscript Compatibility Tests
 * Tests our implementation against the original _hyperscript in real browser environment
 */

import { test, expect, Page } from '@playwright/test';

// Extend Window interface for test helper functions injected by compatibility-test.html
declare global {
  interface Window {
    testExpression: (expr: string, context: object) => { match: boolean; original: any; ours: any };
    testExpressionWithContext: (
      expr: string,
      context: object
    ) => { match: boolean; original: any; ours: any };
  }
}

test.describe('HyperScript Compatibility Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;

    // Listen to console logs for debugging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.error('Page error:', error));

    // Navigate to the compatibility test page
    await page.goto('http://localhost:3000/packages/core/compatibility-test.html');

    // Wait for libraries to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Basic Expression Compatibility', () => {
    test('arithmetic expressions', async () => {
      const expressions = [
        '5 + 3',
        '10 - 4',
        '3 * 7',
        '15 / 3',
        '17 mod 5',
        '(2 + 3) * 4',
        '2 + 3 * 4', // precedence test
      ];

      for (const expr of expressions) {
        const result = await page.evaluate(e => window.testExpression(e, {}), expr);
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });

    test('comparison expressions', async () => {
      const expressions = [
        '5 > 3',
        '2 < 8',
        '5 >= 5',
        '3 <= 7',
        '5 == 5',
        '3 != 7',
        '5 === 5',
        '3 !== 7',
      ];

      for (const expr of expressions) {
        const result = await page.evaluate(e => window.testExpression(e, {}), expr);
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });

    test('logical expressions', async () => {
      const expressions = [
        'true and true',
        'true and false',
        'false or true',
        'false or false',
        'not true',
        'not false',
        'true and false or true', // precedence test
      ];

      for (const expr of expressions) {
        const result = await page.evaluate(e => window.testExpression(e, {}), expr);
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });

    test('string expressions', async () => {
      const expressions = [
        '"hello"',
        "'world'",
        '"hello" + " world"',
        '"number: " + 42',
        '42 + " is the answer"',
      ];

      for (const expr of expressions) {
        const result = await page.evaluate(e => window.testExpression(e, {}), expr);
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });
  });

  test.describe('Context and Property Access', () => {
    test('local variable access', async () => {
      const testCases = [
        { expr: 'foo', context: { locals: { foo: 'bar' } } },
        { expr: 'num', context: { locals: { num: 42 } } },
        { expr: 'flag', context: { locals: { flag: true } } },
      ];

      for (const { expr, context } of testCases) {
        const result = await page.evaluate(
          ({ e, ctx }) => window.testExpressionWithContext(e, ctx),
          { e: expr, ctx: context }
        );
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });

    test('possessive expressions', async () => {
      const testCases = [
        {
          expr: "foo's bar",
          context: { locals: { foo: { bar: 'baz' } } },
        },
        {
          expr: "obj's nested's value",
          context: { locals: { obj: { nested: { value: 'deep' } } } },
        },
        {
          expr: "data's count",
          context: { locals: { data: { count: 123 } } },
        },
      ];

      for (const { expr, context } of testCases) {
        const result = await page.evaluate(
          ({ e, ctx }) => window.testExpressionWithContext(e, ctx),
          { e: expr, ctx: context }
        );
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });

    test('context variables (my, its, your)', async () => {
      const testCases = [
        {
          expr: 'my value',
          context: { me: { value: 42 } },
        },
        {
          expr: 'its result',
          context: { result: { result: 'success' } },
        },
        {
          expr: 'your data',
          context: { you: { data: 'test' } },
        },
      ];

      for (const { expr, context } of testCases) {
        const result = await page.evaluate(
          ({ e, ctx }) => window.testExpressionWithContext(e, ctx),
          { e: expr, ctx: context }
        );
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });
  });

  test.describe('Type Conversion (as expressions)', () => {
    test('basic type conversions', async () => {
      const expressions = [
        '"123" as Int',
        '"45.67" as Float',
        '789 as String',
        'true as String',
        'false as String',
      ];

      for (const expr of expressions) {
        const result = await page.evaluate(e => window.testExpression(e, {}), expr);
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });

    test('JSON conversion', async () => {
      const testCases = [
        {
          expr: 'obj as JSON',
          context: { locals: { obj: { foo: 'bar', num: 42 } } },
        },
        {
          expr: 'arr as JSON',
          context: { locals: { arr: [1, 2, 3] } },
        },
      ];

      for (const { expr, context } of testCases) {
        const result = await page.evaluate(
          ({ e, ctx }) => window.testExpressionWithContext(e, ctx),
          { e: expr, ctx: context }
        );
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });
  });

  test.describe('Null Safety and Edge Cases', () => {
    test('null safe property access', async () => {
      const expressions = ["undefined's property", "null's value", "missing's data"];

      for (const expr of expressions) {
        const result = await page.evaluate(e => window.testExpression(e, {}), expr);
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });

    test('undefined variable access', async () => {
      const expressions = ['undefinedVariable', 'missing', 'notThere'];

      for (const expr of expressions) {
        const result = await page.evaluate(e => window.testExpression(e, {}), expr);
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });
  });

  test.describe('Complex Combined Expressions', () => {
    test('arithmetic with property access', async () => {
      const testCases = [
        {
          expr: "data's value + 10",
          context: { locals: { data: { value: 5 } } },
        },
        {
          expr: '(my count as Int) * 2',
          context: { me: { count: '7' } },
        },
      ];

      for (const { expr, context } of testCases) {
        const result = await page.evaluate(
          ({ e, ctx }) => window.testExpressionWithContext(e, ctx),
          { e: expr, ctx: context }
        );
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });

    test('logical with comparisons', async () => {
      const testCases = [
        {
          expr: "my age > 18 and my status == 'active'",
          context: { me: { age: 25, status: 'active' } },
        },
        {
          expr: "data's count < 5 or data's count > 10",
          context: { locals: { data: { count: 3 } } },
        },
      ];

      for (const { expr, context } of testCases) {
        const result = await page.evaluate(
          ({ e, ctx }) => window.testExpressionWithContext(e, ctx),
          { e: expr, ctx: context }
        );
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });
  });

  test.describe('Performance and Stress Tests', () => {
    test('handle deeply nested property access', async () => {
      const result = await page.evaluate(() => {
        const context = {
          locals: {
            level1: {
              level2: {
                level3: {
                  level4: {
                    level5: {
                      value: 'deep',
                    },
                  },
                },
              },
            },
          },
        };
        return window.testExpressionWithContext(
          "level1's level2's level3's level4's level5's value",
          context
        );
      });

      expect(result.match, `Original: ${result.original} | Ours: ${result.ours}`).toBe(true);
    });

    test('handle complex mathematical expressions', async () => {
      const expressions = ['((5 + 3) * 2 - 1) / 3', '2 * 3 + 4 * 5 - 6', '(10 + 5) * (8 - 3) / 5'];

      for (const expr of expressions) {
        const result = await page.evaluate(e => window.testExpression(e, {}), expr);
        expect(
          result.match,
          `Expression: ${expr} | Original: ${result.original} | Ours: ${result.ours}`
        ).toBe(true);
      }
    });
  });
});
