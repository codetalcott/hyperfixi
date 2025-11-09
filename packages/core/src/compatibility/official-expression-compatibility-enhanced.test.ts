/**
 * Enhanced Official Expression Compatibility Tests
 * Tests our actual expressions against official _hyperscript patterns
 * Converted to Vitest for better integration with existing test suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseAndEvaluateExpression } from '../parser/expression-parser';
import type { ExecutionContext } from '../types/core';

describe('Enhanced Official Expression Compatibility Tests', () => {
  let context: ExecutionContext;
  let testContainer: HTMLElement;

  beforeEach(() => {
    // Create a comprehensive test DOM structure
    testContainer = document.createElement('div');
    testContainer.innerHTML = `
      <div id="test-container">
        <form id="test-form" class="main-form">
          <input type="text" name="username" value="john" class="form-control" data-testid="username">
          <input type="password" name="password" class="form-control" data-testid="password">
          <input type="email" name="email" value="john@example.com" class="form-control">
          <button type="submit" class="btn btn-primary">Submit</button>
        </form>
        <div class="content">
          <p class="text-primary highlighted">Primary text</p>
          <p class="text-secondary">Secondary text</p>
          <ul class="list">
            <li data-value="1" class="active">Item 1</li>
            <li data-value="2">Item 2</li>
            <li data-value="3" class="active">Item 3</li>
          </ul>
        </div>
      </div>
    `;
    document.body.appendChild(testContainer);

    context = {
      me: testContainer.querySelector('#test-form') as HTMLElement,
      you: testContainer.querySelector('.content') as HTMLElement,
      it: testContainer.querySelector('[data-testid="username"]') as HTMLElement,
      result: null,
      locals: new Map([
        ['username', 'john'],
        ['items', [1, 2, 3, 4, 5]],
        ['user', { name: 'John', age: 30, email: 'john@example.com' }],
      ]),
      globals: new Map([['app', { name: 'TestApp', version: '1.0' }]]),
      parent: null,
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
    };
  });

  afterEach(() => {
    if (testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
  });

  describe('String Expressions (Official Test Patterns)', () => {
    it('should handle string literals correctly', async () => {
      const tests = [
        { expr: '"foo"', expected: 'foo' },
        { expr: '"fo\'o"', expected: "fo'o" },
        { expr: "'foo'", expected: 'foo' },
        { expr: "'hello world'", expected: 'hello world' },
        { expr: '"hello world"', expected: 'hello world' },
      ];

      for (const test of tests) {
        const result = await parseAndEvaluateExpression(test.expr, context);
        expect(result).toBe(test.expected);
      }
    });

    it('should handle empty strings', async () => {
      expect(await parseAndEvaluateExpression('""', context)).toBe('');
      expect(await parseAndEvaluateExpression("''", context)).toBe('');
    });

    it('should handle string concatenation patterns', async () => {
      const result = await parseAndEvaluateExpression('"Hello " + "World"', context);
      expect(result).toBe('Hello World');
    });
  });

  describe('Math Expressions (Official Test Patterns)', () => {
    it('should handle mathematical operations correctly', async () => {
      const tests = [
        { expr: '5 + 3', expected: 8 },
        { expr: '10 - 4', expected: 6 },
        { expr: '6 * 7', expected: 42 },
        { expr: '15 / 3', expected: 5 },
        { expr: '17 % 5', expected: 2 },
        { expr: '2 ^ 3', expected: 8 }, // Exponentiation
        { expr: '(5 + 3) * 2', expected: 16 }, // Precedence
      ];

      for (const test of tests) {
        const result = await parseAndEvaluateExpression(test.expr, context);
        expect(result).toBe(test.expected);
      }
    });

    it('should handle mod operator', async () => {
      expect(await parseAndEvaluateExpression('17 mod 5', context)).toBe(2);
      expect(await parseAndEvaluateExpression('20 mod 3', context)).toBe(2);
    });
  });

  describe('Boolean & Logical Expressions (Official Test Patterns)', () => {
    it('should handle boolean and logical operations correctly', async () => {
      const tests = [
        { expr: 'true', expected: true },
        { expr: 'false', expected: false },
        { expr: 'true and false', expected: false },
        { expr: 'true or false', expected: true },
        { expr: 'not true', expected: false },
        { expr: 'not false', expected: true },
        { expr: 'true and true', expected: true },
        { expr: 'false or false', expected: false },
      ];

      for (const test of tests) {
        const result = await parseAndEvaluateExpression(test.expr, context);
        expect(result).toBe(test.expected);
      }
    });

    it('should handle logical precedence', async () => {
      // AND has higher precedence than OR
      expect(await parseAndEvaluateExpression('true or false and false', context)).toBe(true);
      expect(await parseAndEvaluateExpression('false and true or true', context)).toBe(true);
    });
  });

  describe('Comparison Expressions (Official Test Patterns)', () => {
    it('should handle comparison operations correctly', async () => {
      const tests = [
        { expr: '5 > 3', expected: true },
        { expr: '5 < 3', expected: false },
        { expr: '5 >= 5', expected: true },
        { expr: '5 <= 4', expected: false },
        { expr: '5 == 5', expected: true },
        { expr: '5 != 4', expected: true },
        { expr: '"hello" == "hello"', expected: true },
        { expr: '"hello" != "world"', expected: true },
      ];

      for (const test of tests) {
        const result = await parseAndEvaluateExpression(test.expr, context);
        expect(result).toBe(test.expected);
      }
    });

    it('should handle string comparisons', async () => {
      expect(await parseAndEvaluateExpression('"abc" < "def"', context)).toBe(true);
      expect(await parseAndEvaluateExpression('"xyz" > "abc"', context)).toBe(true);
    });
  });

  describe('Context References (Official Test Patterns)', () => {
    it('should handle me/you/it/its references correctly', async () => {
      // Test 'me' reference
      const meResult = await parseAndEvaluateExpression('me', context);
      expect(meResult).toBe(context.me);

      // Test 'you' reference
      const youResult = await parseAndEvaluateExpression('you', context);
      expect(youResult).toBe(context.you);

      // Test 'it' reference
      const itResult = await parseAndEvaluateExpression('it', context);
      expect(itResult).toBe(context.it);
    });

    it('should handle possessive references', async () => {
      // Test my/your/its possessive syntax
      const myClass = await parseAndEvaluateExpression('my className', context);
      expect(typeof myClass).toBe('string');

      const itsValue = await parseAndEvaluateExpression('its value', context);
      expect(itsValue).toBe('john'); // Username input value
    });
  });

  describe('CSS Selector References (Official Test Patterns)', () => {
    it('should handle CSS selector references correctly', async () => {
      // ID selector returns single element
      const formById = await parseAndEvaluateExpression('#test-form', context);
      expect(formById).toBeInstanceOf(HTMLElement);
      expect(formById.id).toBe('test-form');

      // Class selector returns array
      const formControls = await parseAndEvaluateExpression('.form-control', context);
      expect(Array.isArray(formControls)).toBe(true);
      expect(formControls.length).toBe(3);

      // Query reference returns NodeList
      const queryControls = await parseAndEvaluateExpression('<.form-control/>', context);
      expect(queryControls).toBeInstanceOf(NodeList);
      expect(queryControls.length).toBe(3);
    });

    it('should handle attribute selectors', async () => {
      const byTestId = await parseAndEvaluateExpression('[data-testid="username"]', context);
      expect(byTestId).toBeInstanceOf(NodeList);
      expect(byTestId.length).toBe(1);

      const byType = await parseAndEvaluateExpression('<input[type="text"]/>', context);
      expect(byType).toBeInstanceOf(NodeList);
      expect(byType.length).toBe(1);
    });
  });

  describe('Type Conversion (Official Test Patterns)', () => {
    it('should handle "as" keyword conversions correctly', async () => {
      const tests = [
        { expr: '"123" as Int', expected: 123 },
        { expr: '"45.67" as Number', expected: 45.67 },
        { expr: '123 as String', expected: '123' },
        { expr: '1 as Boolean', expected: true },
        { expr: '0 as Boolean', expected: false },
        { expr: '[1, 2, 3] as String', expected: '[1,2,3]' },
      ];

      for (const test of tests) {
        const result = await parseAndEvaluateExpression(test.expr, context);
        expect(result).toBe(test.expected);
      }
    });

    it('should handle advanced type conversions', async () => {
      // Array conversion
      const arrayResult = await parseAndEvaluateExpression('"a,b,c" as Array', context);
      expect(Array.isArray(arrayResult)).toBe(true);

      // Date conversion
      const dateResult = await parseAndEvaluateExpression('"2023-01-01" as Date', context);
      expect(dateResult).toBeInstanceOf(Date);
    });
  });

  describe('Variable References (Official Test Patterns)', () => {
    it('should handle local and global variable access', async () => {
      // Local variables
      expect(await parseAndEvaluateExpression('username', context)).toBe('john');
      expect(await parseAndEvaluateExpression('items', context)).toEqual([1, 2, 3, 4, 5]);

      // Object property access
      expect(await parseAndEvaluateExpression('user.name', context)).toBe('John');
      expect(await parseAndEvaluateExpression('user.email', context)).toBe('john@example.com');

      // Global variables
      expect(await parseAndEvaluateExpression('app.name', context)).toBe('TestApp');
    });

    it('should handle array access and methods', async () => {
      expect(await parseAndEvaluateExpression('items[0]', context)).toBe(1);
      expect(await parseAndEvaluateExpression('items.length', context)).toBe(5);
      expect(await parseAndEvaluateExpression('items.slice(1, 3)', context)).toEqual([2, 3]);
    });
  });

  describe('Overall Official Pattern Summary', () => {
    it('should provide compatibility assessment', async () => {
      // This test serves as a summary of our compatibility
      const patterns = [
        // String literals
        '"test"',
        "'test'",

        // Math operations
        '5 + 3',
        '10 * 2',

        // Boolean operations
        'true and false',
        'not true',

        // Comparisons
        '5 > 3',
        '"a" == "a"',

        // Context references
        'me',
        'it',

        // CSS selectors
        '#test-form',
        '.form-control',

        // Type conversions
        '"123" as Int',
        '123 as String',

        // Variable access
        'username',
        'user.name',
      ];

      let passedCount = 0;
      const total = patterns.length;

      for (const pattern of patterns) {
        try {
          await parseAndEvaluateExpression(pattern, context);
          passedCount++;
        } catch (error) {
          console.warn(`Pattern failed: ${pattern}`, error.message);
        }
      }

      const compatibilityScore = (passedCount / total) * 100;

      // Log compatibility assessment
      console.log(
        `Expression Compatibility: ${compatibilityScore.toFixed(1)}% (${passedCount}/${total})`
      );

      // We expect very high compatibility now
      expect(compatibilityScore).toBeGreaterThan(80); // 80%+ compatibility target
      expect(passedCount).toBeGreaterThanOrEqual(16); // At least 16 out of 20 patterns should work
    });
  });
});
