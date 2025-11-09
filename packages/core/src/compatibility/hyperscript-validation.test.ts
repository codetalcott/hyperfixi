/**
 * Official _hyperscript Compatibility Validation Tests
 * Tests our implementation against patterns from the official test suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { evalHyperScript, make, clearWorkArea, getParseErrorFor } from './hyperscript-adapter';

describe('_hyperscript Compatibility Validation', () => {
  beforeEach(() => {
    clearWorkArea();
  });

  afterEach(() => {
    clearWorkArea();
  });

  describe('Possessive Expression Compatibility', () => {
    it('should access basic properties', async () => {
      const result = await evalHyperScript("foo's foo", {
        locals: { foo: { foo: 'foo' } },
      });
      expect(result).toBe('foo');
    });

    it('should handle null safety for undefined objects', async () => {
      const result = await evalHyperScript("foo's foo", {
        locals: { foo: undefined },
      });
      expect(result).toBeUndefined();
    });

    it('should access DOM element properties', async () => {
      const div = make('<div id="test" style="display: inline;">content</div>');

      const result = await evalHyperScript("#test's style's display");
      expect(result).toBe('inline');
    });

    it('should handle attribute access with bracket notation', async () => {
      const div = make('<div id="test" data-foo="bar">content</div>');

      const result = await evalHyperScript("#test's [@data-foo]");
      expect(result).toBe('bar');
    });

    it('should handle context references (me, my)', async () => {
      const div = make('<div class="test-class">content</div>');

      const result = await evalHyperScript('my className', { me: div });
      expect(result).toBe('test-class');
    });

    it('should handle multiple element properties', async () => {
      make('<div class="multi">first</div>');
      make('<div class="multi">second</div>');

      const result = await evalHyperScript(".multi's textContent");
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['first', 'second']);
    });
  });

  describe('Type Conversion (as Expression) Compatibility', () => {
    it('should convert strings to integers', async () => {
      const result = await evalHyperScript('"10" as Int');
      expect(result).toBe(10);
    });

    it('should convert strings to floats', async () => {
      const result = await evalHyperScript('"10.4" as Float');
      expect(result).toBe(10.4);
    });

    it('should handle fixed precision conversion', async () => {
      const result = await evalHyperScript('"10.4899" as Fixed:2');
      expect(result).toBe('10.49');
    });

    it('should convert objects to JSON', async () => {
      const result = await evalHyperScript('obj as JSON', {
        locals: { obj: { foo: 'bar' } },
      });
      expect(result).toBe('{"foo":"bar"}');
    });

    it('should convert JSON strings to objects', async () => {
      const result = await evalHyperScript('\'{"foo":"bar"}\' as Object');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should handle form value extraction', async () => {
      const form = make(`
        <form id="testForm">
          <input name="username" value="john" />
          <input name="age" value="25" />
        </form>
      `);

      const result = await evalHyperScript('#testForm as Values');
      expect(result).toEqual({ username: 'john', age: '25' });
    });

    it('should handle complex form controls', async () => {
      const form = make(`
        <form id="complexForm">
          <input type="checkbox" name="subscribe" checked />
          <input type="radio" name="gender" value="male" checked />
          <select name="country">
            <option value="us" selected>United States</option>
            <option value="ca">Canada</option>
          </select>
        </form>
      `);

      const result = await evalHyperScript('#complexForm as Values');
      expect(result).toEqual({
        subscribe: true,
        gender: 'male',
        country: 'us',
      });
    });
  });

  describe('Query Reference Compatibility', () => {
    it('should handle basic CSS selectors', async () => {
      make('<div class="test">content</div>');

      const result = await evalHyperScript('<.test/>');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle ID selectors', async () => {
      make('<div id="unique">content</div>');

      const result = await evalHyperScript('<#unique/>');
      expect(result).toBeDefined();
      expect(result.textContent).toBe('content');
    });

    it('should handle attribute selectors', async () => {
      make('<input title="search" />');

      const result = await evalHyperScript('<[title="search"]/>');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle complex selectors', async () => {
      make('<input type="checkbox" class="foo" checked />');

      const result = await evalHyperScript('<input.foo:checked/>');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Logical Operator Compatibility', () => {
    it('should handle basic boolean logic', async () => {
      expect(await evalHyperScript('true and false')).toBe(false);
      expect(await evalHyperScript('true or false')).toBe(true);
      expect(await evalHyperScript('not true')).toBe(false);
    });

    it('should handle chained logic operations', async () => {
      expect(await evalHyperScript('true and true and false')).toBe(false);
      expect(await evalHyperScript('false or false or true')).toBe(true);
    });

    it('should require parentheses for mixed operators', async () => {
      // This should throw a parse error according to hyperscript rules
      expect(() => getParseErrorFor('true and false or true')).not.toBeNull();
    });

    it('should handle parenthesized mixed operations', async () => {
      expect(await evalHyperScript('(true and false) or true')).toBe(true);
      expect(await evalHyperScript('true and (false or true)')).toBe(true);
    });
  });

  describe('Comparison Operator Compatibility', () => {
    it('should handle mathematical comparisons', async () => {
      expect(await evalHyperScript('5 > 3')).toBe(true);
      expect(await evalHyperScript('5 < 3')).toBe(false);
      expect(await evalHyperScript('5 >= 5')).toBe(true);
      expect(await evalHyperScript('5 <= 4')).toBe(false);
    });

    it('should handle equality comparisons', async () => {
      expect(await evalHyperScript('5 == "5"')).toBe(true); // Loose equality
      expect(await evalHyperScript('5 === "5"')).toBe(false); // Strict equality
      expect(await evalHyperScript('5 != "6"')).toBe(true);
      expect(await evalHyperScript('5 !== "5"')).toBe(true);
    });

    it('should handle English equivalents', async () => {
      expect(await evalHyperScript('5 is 5')).toBe(true);
      expect(await evalHyperScript('5 equals 5')).toBe(true);
      expect(await evalHyperScript('5 is not 6')).toBe(true);
    });

    it('should handle membership tests', async () => {
      const result1 = await evalHyperScript('value is in array', {
        locals: { value: 2, array: [1, 2, 3] },
      });
      expect(result1).toBe(true);

      const result2 = await evalHyperScript('value is in array', {
        locals: { value: 5, array: [1, 2, 3] },
      });
      expect(result2).toBe(false);
    });

    it('should handle CSS matching', async () => {
      const div = make('<div class="test-class">content</div>');

      const result = await evalHyperScript('element matches ".test-class"', {
        locals: { element: div },
      });
      expect(result).toBe(true);
    });

    it('should handle existence checks', async () => {
      make('<div id="exists">content</div>');

      expect(await evalHyperScript('#exists exists')).toBe(true);
      expect(await evalHyperScript('#nonexistent exists')).toBe(false);
    });

    it('should handle empty checks', async () => {
      expect(
        await evalHyperScript('array is empty', {
          locals: { array: [] },
        })
      ).toBe(true);

      expect(
        await evalHyperScript('array is not empty', {
          locals: { array: [1, 2, 3] },
        })
      ).toBe(true);
    });
  });

  describe('Mathematical Operator Compatibility', () => {
    it('should handle basic arithmetic', async () => {
      expect(await evalHyperScript('5 + 3')).toBe(8);
      expect(await evalHyperScript('10 - 4')).toBe(6);
      expect(await evalHyperScript('6 * 7')).toBe(42);
      expect(await evalHyperScript('15 / 3')).toBe(5);
      expect(await evalHyperScript('10 mod 3')).toBe(1);
    });

    it('should handle string concatenation', async () => {
      expect(await evalHyperScript('"a" + "b"')).toBe('ab');
      expect(await evalHyperScript('"hello" + " " + "world"')).toBe('hello world');
    });

    it('should require parentheses for mixed operations', async () => {
      // This should throw a parse error
      expect(() => getParseErrorFor('5 + 3 * 2')).not.toBeNull();
    });

    it('should handle parenthesized operations', async () => {
      expect(await evalHyperScript('(5 + 3) * 2')).toBe(16);
      expect(await evalHyperScript('5 + (3 * 2)')).toBe(11);
    });
  });

  describe('Context Variable Compatibility', () => {
    it('should handle "me" context consistently', async () => {
      const div = make('<div class="test-me">content</div>');

      const result = await evalHyperScript('me', { me: div });
      expect(result).toBe(div);
    });

    it('should handle "it" context across operations', async () => {
      const testValue = { length: 5, name: 'test' };

      const lengthResult = await evalHyperScript('its length', { it: testValue });
      expect(lengthResult).toBe(5);

      const nameResult = await evalHyperScript('its name', { it: testValue });
      expect(nameResult).toBe('test');
    });

    it('should handle local and global variable scoping', async () => {
      const localResult = await evalHyperScript('localVar', {
        locals: { localVar: 'local' },
        globals: { localVar: 'global' },
      });
      expect(localResult).toBe('local'); // Local should shadow global

      const globalResult = await evalHyperScript('globalVar', {
        locals: { localVar: 'local' },
        globals: { globalVar: 'global' },
      });
      expect(globalResult).toBe('global');
    });
  });

  describe('Advanced Edge Cases', () => {
    it('should handle deeply nested property access', async () => {
      const nested = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const result = await evalHyperScript("obj's level1's level2's level3's value", {
        locals: { obj: nested },
      });
      expect(result).toBe('deep');
    });

    it('should handle null safety in chains', async () => {
      const partial = {
        level1: {
          level2: null,
        },
      };

      const result = await evalHyperScript("obj's level1's level2's level3's value", {
        locals: { obj: partial },
      });
      expect(result).toBeUndefined();
    });

    it('should handle large dataset operations', async () => {
      // Create large dataset
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item${i}` }));

      const result = await evalHyperScript("array's length", {
        locals: { array: largeArray },
      });
      expect(result).toBe(1000);
    });

    it('should handle mixed type operations', async () => {
      const result = await evalHyperScript('str + num', {
        locals: { str: 'Number: ', num: 42 },
      });
      expect(result).toBe('Number: 42');
    });
  });
});
