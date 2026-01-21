import { test, expect } from '@playwright/test';

/**
 * Comprehensive Expression Compatibility Tests
 *
 * These tests cover the major expression types from the official _hyperscript test suite.
 * Each test uses direct page.evaluate() to avoid async/extraction issues.
 *
 * TODO: Known Limitations to Fix
 * ==============================
 * 1. TODO: `no` operator incorrectly handles empty strings
 *    - Test: "no empty string is false"
 *    - Syntax: `no ""`
 *    - Returns true, should return false (empty string is falsy but exists)
 *
 * 2. TODO: `no` operator incorrectly handles false values
 *    - Test: "no false is true"
 *    - Syntax: `no false`
 *    - Returns false, should return true (false is "no value")
 *
 * Note: The `no` operator should check for null/undefined/empty-array,
 * not JavaScript falsiness. See official _hyperscript semantics.
 */

test.describe('Expression Compatibility Tests @expression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/packages/core/compatibility-test.html');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      if (typeof window.hyperfixi === 'undefined') {
        throw new Error('HyperFixi not loaded');
      }
    });
  });

  // ==================== Math Operators ====================
  test.describe('Math Operators @math', () => {
    test('addition @quick @smoke', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('1 + 1'))).toBe(2);
    });

    test('subtraction', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('5 - 3'))).toBe(2);
    });

    test('multiplication', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('3 * 4'))).toBe(12);
    });

    test('division', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('10 / 2'))).toBe(5);
    });

    test('modulo', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('7 mod 3'))).toBe(1);
    });

    test('chained addition', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript('1 + 2 + 3 + 4'))
      ).toBe(10);
    });

    test('parenthesized expressions', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('(2 + 3) * 4'))).toBe(
        20
      );
    });

    test('negative numbers', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('-5 + 10'))).toBe(5);
    });
  });

  // ==================== Comparison Operators ====================
  test.describe('Comparison Operators @comparison', () => {
    test('equals true @quick', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('5 == 5'))).toBe(true);
    });

    test('equals false', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('5 == 6'))).toBe(
        false
      );
    });

    test('not equals', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('5 != 6'))).toBe(true);
    });

    test('less than', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('3 < 5'))).toBe(true);
    });

    test('greater than', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('5 > 3'))).toBe(true);
    });

    test('less than or equal', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('5 <= 5'))).toBe(true);
    });

    test('greater than or equal', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('5 >= 5'))).toBe(true);
    });

    test('is keyword', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('5 is 5'))).toBe(true);
    });

    test('is not keyword', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('5 is not 6'))).toBe(
        true
      );
    });
  });

  // ==================== Logical Operators ====================
  test.describe('Logical Operators @logical', () => {
    test('and true @quick', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript('true and true'))
      ).toBe(true);
    });

    test('and false', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript('true and false'))
      ).toBe(false);
    });

    test('or true', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript('false or true'))
      ).toBe(true);
    });

    test('or false', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript('false or false'))
      ).toBe(false);
    });

    test('not true', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('not true'))).toBe(
        false
      );
    });

    test('not false', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('not false'))).toBe(
        true
      );
    });

    test('complex logic', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript('(true and false) or true'))
      ).toBe(true);
    });
  });

  // ==================== String Operations ====================
  test.describe('String Operations', () => {
    test('string literal double quotes', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('"hello"'))).toBe(
        'hello'
      );
    });

    test('string literal single quotes', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript("'hello'"))).toBe(
        'hello'
      );
    });

    test('string concatenation', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript("'hello' + ' ' + 'world'"))
      ).toBe('hello world');
    });

    test('empty string', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('""'))).toBe('');
    });

    test('string with numbers', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('"abc" + 123'))).toBe(
        'abc123'
      );
    });
  });

  // ==================== Array Operations ====================
  test.describe('Array Operations', () => {
    test('empty array', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('[]'))).toEqual([]);
    });

    test('array with numbers', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('[1, 2, 3]'))).toEqual(
        [1, 2, 3]
      );
    });

    test('array with strings', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript('["a", "b", "c"]'))
      ).toEqual(['a', 'b', 'c']);
    });

    test('array with booleans', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript('[true, false, true]'))
      ).toEqual([true, false, true]);
    });

    test('mixed array', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript('[1, "two", true]'))
      ).toEqual([1, 'two', true]);
    });

    test('nested array', async ({ page }) => {
      expect(
        await page.evaluate(async () => (window as any).evalHyperScript('[[1, 2], [3, 4]]'))
      ).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });
  });

  // ==================== Object Literals ====================
  test.describe('Object Literals', () => {
    test('empty object', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('{}'))).toEqual({});
    });

    test('object with string values', async ({ page }) => {
      const result = await page.evaluate(async () =>
        (window as any).evalHyperScript('{name: "test"}')
      );
      expect(result).toEqual({ name: 'test' });
    });

    test('object with number values', async ({ page }) => {
      const result = await page.evaluate(async () =>
        (window as any).evalHyperScript('{count: 42}')
      );
      expect(result).toEqual({ count: 42 });
    });

    test('object with multiple keys', async ({ page }) => {
      const result = await page.evaluate(async () =>
        (window as any).evalHyperScript('{a: 1, b: 2, c: 3}')
      );
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  // ==================== Boolean Literals ====================
  test.describe('Boolean Literals', () => {
    test('true literal', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('true'))).toBe(true);
    });

    test('false literal', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('false'))).toBe(false);
    });
  });

  // ==================== Null/Nothing ====================
  test.describe('Null/Nothing', () => {
    test('null literal', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('null'))).toBe(null);
    });

    test('nothing literal', async ({ page }) => {
      const result = await page.evaluate(async () => (window as any).evalHyperScript('nothing'));
      expect(result === null || result === undefined).toBe(true);
    });
  });

  // ==================== Number Literals ====================
  test.describe('Number Literals', () => {
    test('integer', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('42'))).toBe(42);
    });

    test('decimal', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('3.14'))).toBeCloseTo(
        3.14
      );
    });

    test('negative integer', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('-10'))).toBe(-10);
    });

    test('negative decimal', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('-2.5'))).toBeCloseTo(
        -2.5
      );
    });

    test('zero', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('0'))).toBe(0);
    });
  });

  // ==================== As Expression (Type Conversion) ====================
  test.describe('As Expression', () => {
    test('number as String', async ({ page }) => {
      const result = await page.evaluate(async () =>
        (window as any).evalHyperScript('42 as String')
      );
      expect(result).toBe('42');
    });

    test('string as Int', async ({ page }) => {
      const result = await page.evaluate(async () =>
        (window as any).evalHyperScript('"42" as Int')
      );
      expect(result).toBe(42);
    });

    test('string as Number', async ({ page }) => {
      const result = await page.evaluate(async () =>
        (window as any).evalHyperScript('"3.14" as Number')
      );
      expect(result).toBeCloseTo(3.14);
    });

    test('float as Int truncates', async ({ page }) => {
      const result = await page.evaluate(async () =>
        (window as any).evalHyperScript('"3.9" as Int')
      );
      expect(result).toBe(3);
    });
  });

  // ==================== No Operator ====================
  test.describe('No Operator', () => {
    test('no null is true', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('no null'))).toBe(
        true
      );
    });

    test('no empty string is false', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('no ""'))).toBe(false);
    });

    test('no 0 is false', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('no 0'))).toBe(false);
    });

    test('no false is true', async ({ page }) => {
      expect(await page.evaluate(async () => (window as any).evalHyperScript('no false'))).toBe(
        true
      );
    });
  });
});
