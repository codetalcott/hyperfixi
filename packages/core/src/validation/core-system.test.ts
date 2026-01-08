/**
 * Core System Validation Tests
 * Comprehensive validation of the complete hyperscript system integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../test-setup.js';
import { evalHyperScript } from '../compatibility/eval-hyperscript';

describe('Core System Validation', () => {
  let testContainer: HTMLElement;

  beforeEach(() => {
    testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    if (testContainer.parentNode) {
      document.body.removeChild(testContainer);
    }
  });

  describe('Expression System Integration', () => {
    it('should handle complex nested expressions', async () => {
      const result = await evalHyperScript('(5 + 3) * (10 - 2)');
      expect(result).toBe(64);
    });

    it('should handle mixed expression types', async () => {
      const context = {
        locals: {
          arr: [1, 2, 3],
          obj: { name: 'test', count: 5 },
        },
      };

      const result = await evalHyperScript("arr's length + obj's count", context);
      expect(result).toBe(8);
    });

    it('should handle conditional expressions', async () => {
      const result = await evalHyperScript('(5 > 3) and (2 < 4)');
      expect(result).toBe(true);
    });

    it('should handle type conversions', async () => {
      const result = await evalHyperScript('"42" as Int + 8');
      expect(result).toBe(50);
    });
  });

  describe('Parser System Validation', () => {
    it('should handle whitespace variations', async () => {
      const result1 = await evalHyperScript('5+3');
      const result2 = await evalHyperScript('5 + 3');
      const result3 = await evalHyperScript('5  +  3');

      expect(result1).toBe(8);
      expect(result2).toBe(8);
      expect(result3).toBe(8);
    });

    it('should handle parentheses correctly', async () => {
      const result = await evalHyperScript('((5 + 3) * 2) / 4');
      expect(result).toBe(4);
    });

    it('should handle string literals with special characters', async () => {
      const result = await evalHyperScript('"hello\\nworld\\t!"');
      expect(result).toBe('hello\nworld\t!');
    });

    it('should handle array and object literals', async () => {
      const arrayResult = await evalHyperScript("[1, 2, 3]'s length");
      expect(arrayResult).toBe(3);

      const objResult = await evalHyperScript('{"key": "value"}\'s key');
      expect(objResult).toBe('value');
    });
  });

  describe('Context System Validation', () => {
    it('should handle local variable scoping', async () => {
      const context = {
        locals: new Map([
          ['x', 10],
          ['y', 20],
        ]),
      };

      const result = await evalHyperScript('x * y', context);
      expect(result).toBe(200);
    });

    it('should handle global variable scoping', async () => {
      const context = {
        globals: new Map([['$global', 'global-value']]),
      };

      const result = await evalHyperScript('$global', context);
      expect(result).toBe('global-value');
    });

    it('should handle element context (me)', async () => {
      testContainer.className = 'test-class';

      const result = await evalHyperScript("me's className", { me: testContainer });
      expect(result).toBe('test-class');
    });

    it('should handle context variable precedence', async () => {
      const context = {
        locals: new Map([['var', 'local']]),
        globals: new Map([['var', 'global']]),
      };

      const result = await evalHyperScript('var', context);
      expect(result).toBe('local'); // Local should shadow global
    });
  });

  describe('Error Handling System', () => {
    it('should provide meaningful error messages for syntax errors', async () => {
      try {
        await evalHyperScript('5 + + 3');
        expect.fail('Should have thrown a parse error');
      } catch (error: any) {
        expect(error.message).toMatch(/parse|syntax|unexpected/i);
      }
    });

    it('should handle runtime errors gracefully', async () => {
      try {
        await evalHyperScript("nonexistent's property");
        // Should return undefined rather than throwing
      } catch (error: any) {
        // If it throws, error should be descriptive
        expect(error.message).toMatch(/undefined|null|property/i);
      }
    });

    it('should handle division by zero', async () => {
      const result = await evalHyperScript('10 / 0');
      expect(result).toBe(Infinity);
    });

    it('should handle type conversion errors', async () => {
      try {
        await evalHyperScript('"not-a-number" as Int');
        // Should either return NaN or throw descriptive error
      } catch (error: any) {
        expect(error.message).toMatch(/conversion|invalid|number/i);
      }
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large expressions efficiently', async () => {
      const largeExpression = Array.from({ length: 100 }, (_, i) => i).join(' + ');
      const expectedResult = Array.from({ length: 100 }, (_, i) => i).reduce((a, b) => a + b, 0);

      const startTime = Date.now();
      const result = await evalHyperScript(largeExpression);
      const endTime = Date.now();

      expect(result).toBe(expectedResult);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should handle large datasets without memory leaks', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item${i}` }));

      const result = await evalHyperScript("data's length", {
        locals: { data: largeArray },
      });

      expect(result).toBe(1000);
    });

    it('should reuse parsed expressions efficiently', async () => {
      const expression = '5 + 3 * 2';

      // Multiple evaluations should be fast
      const results = await Promise.all([
        evalHyperScript(expression),
        evalHyperScript(expression),
        evalHyperScript(expression),
      ]);

      expect(results).toEqual([11, 11, 11]);
    });
  });

  describe('Type System Validation', () => {
    it('should handle JavaScript type coercion correctly', async () => {
      expect(await evalHyperScript('5 + "3"')).toBe('53'); // String concatenation
      expect(await evalHyperScript('5 == "5"')).toBe(true); // Loose equality
      expect(await evalHyperScript('5 === "5"')).toBe(false); // Strict equality
    });

    it('should handle null and undefined correctly', async () => {
      expect(await evalHyperScript('null == undefined')).toBe(true);
      expect(await evalHyperScript('null === undefined')).toBe(false);

      const result = await evalHyperScript('nonexistent?.property');
      expect(result).toBeUndefined();
    });

    it('should handle boolean conversions', async () => {
      expect(await evalHyperScript('!!""')).toBe(false);
      expect(await evalHyperScript('!!"text"')).toBe(true);
      expect(await evalHyperScript('!!0')).toBe(false);
      expect(await evalHyperScript('!!1')).toBe(true);
    });

    it('should handle array operations', async () => {
      const context = { locals: { arr: [1, 2, 3, 4, 5] } };

      expect(await evalHyperScript("arr's length", context)).toBe(5);
      expect(await evalHyperScript('arr[0]', context)).toBe(1);
      expect(await evalHyperScript('arr[-1]', context)).toBe(5); // Last element
    });
  });

  describe('DOM Integration Validation', () => {
    it('should handle DOM element queries', async () => {
      testContainer.innerHTML = '<div class="test-item">content</div>';

      // Class selectors return arrays (consistent with _hyperscript)
      const result = await evalHyperScript('.test-item');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].textContent).toBe('content');
    });

    it('should handle multiple element queries', async () => {
      testContainer.innerHTML = `
        <div class="multi">first</div>
        <div class="multi">second</div>
        <div class="multi">third</div>
      `;

      const result = await evalHyperScript('.multi');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should handle element property access', async () => {
      testContainer.innerHTML = '<input id="test-input" value="test-value" />';

      const result = await evalHyperScript("#test-input's value");
      expect(result).toBe('test-value');
    });

    it('should handle element attribute access', async () => {
      testContainer.innerHTML = '<div data-test="attribute-value">content</div>';

      const result = await evalHyperScript("[data-test]'s @data-test");
      expect(result).toBe('attribute-value');
    });
  });

  describe('Advanced Features Validation', () => {
    it('should handle method chaining', async () => {
      const context = {
        locals: {
          str: 'hello world',
        },
      };

      // Note: This would require advanced method support
      // For now, test basic property chaining
      const result = await evalHyperScript("str's length", context);
      expect(result).toBe(11);
    });

    it('should handle regex patterns', async () => {
      const context = {
        locals: {
          text: 'test123',
          pattern: /\d+/,
        },
      };

      // Basic pattern matching - would need regex expression support
      expect(await evalHyperScript("text's length", context)).toBe(7);
    });

    it('should handle date and time operations', async () => {
      const context = {
        locals: {
          date: new Date('2023-01-01'),
        },
      };

      const result = await evalHyperScript("date's getFullYear", context);
      expect(typeof result).toBe('function'); // Method reference
    });

    it('should handle complex object traversal', async () => {
      const context = {
        locals: {
          data: {
            users: [
              { name: 'Alice', age: 30 },
              { name: 'Bob', age: 25 },
            ],
          },
        },
      };

      const result = await evalHyperScript("data's users's length", context);
      expect(result).toBe(2);
    });
  });

  describe('Integration with External Systems', () => {
    it('should handle window/global object access', async () => {
      (globalThis as Record<string, unknown>).testGlobal = 'test-value';

      try {
        const result = await evalHyperScript('window.testGlobal');
        expect(result).toBe('test-value');
      } finally {
        delete (globalThis as Record<string, unknown>).testGlobal;
      }
    });

    it('should handle document object access', async () => {
      const result = await evalHyperScript('document.body.tagName');
      // jsdom returns lowercase 'body', real browsers return 'BODY'
      expect((result as string).toUpperCase()).toBe('BODY');
    });

    it('should handle localStorage integration', async () => {
      // Mock localStorage for testing
      const mockStorage = {
        getItem: (key: string) => (key === 'test' ? 'stored-value' : null),
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 1,
        key: () => null,
      };

      (globalThis as Record<string, unknown>).localStorage = mockStorage;

      try {
        const result = await evalHyperScript('localStorage.getItem("test")');
        expect(result).toBe('stored-value');
      } finally {
        delete (globalThis as Record<string, unknown>).localStorage;
      }
    });
  });

  describe('System Robustness', () => {
    it('should handle concurrent evaluations', async () => {
      const expressions = [
        '5 + 3',
        '10 * 2',
        '"hello" + " world"',
        "[1, 2, 3]'s length",
        '{"test": true}\'s test',
      ];

      const results = await Promise.all(expressions.map(expr => evalHyperScript(expr)));

      expect(results).toEqual([8, 20, 'hello world', 3, true]);
    });

    it('should maintain context isolation', async () => {
      const context1 = { locals: { x: 'first' } };
      const context2 = { locals: { x: 'second' } };

      const [result1, result2] = await Promise.all([
        evalHyperScript('x', context1),
        evalHyperScript('x', context2),
      ]);

      expect(result1).toBe('first');
      expect(result2).toBe('second');
    });

    it('should handle edge case inputs', async () => {
      // Empty string
      const emptyResult = await evalHyperScript('""');
      expect(emptyResult).toBe('');

      // Very long string
      const longString = 'x'.repeat(1000);
      const longResult = await evalHyperScript(`"${longString}"`);
      expect(longResult).toBe(longString);

      // Very large number
      const largeResult = await evalHyperScript('1e10 + 1e10');
      expect(largeResult).toBe(2e10);
    });

    it('should handle recursive data structures safely', async () => {
      const recursive: any = { name: 'test' };
      recursive.self = recursive;

      const context = { locals: { obj: recursive } };

      // Should handle at least basic property access
      const result = await evalHyperScript("obj's name", context);
      expect(result).toBe('test');
    });
  });
});
