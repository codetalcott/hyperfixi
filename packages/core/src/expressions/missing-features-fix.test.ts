/**
 * TDD Fix for Missing Expression Features (Issue #2 from todo list)
 * 
 * Based on official test suite failures:
 * ❌ converts value as Date (asExpression.js)
 * ❌ simple async expression works (async.js)
 * ❌ first works (positionalExpression.js)
 * ❌ last works (positionalExpression.js)
 * ❌ first works w/ array-like (positionalExpression.js)
 * ❌ last works w/ array-like (positionalExpression.js)
 * 
 * These are important expression features for complete hyperscript compatibility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseAndEvaluateExpression } from '../parser/expression-parser.js';
import type { ExecutionContext } from '../types/core.js';

describe('Missing Expression Features Fix - Official Test Patterns', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = {
      me: null,
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: new Map()
    };
  });

  describe('Date Conversion ("as Date")', () => {
    it('should convert timestamp string to Date', async () => {
      // From official asExpression.js test
      const result = await parseAndEvaluateExpression('"2023-01-01" as Date', context);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
    });

    it('should convert timestamp number to Date', async () => {
      // Unix timestamp conversion
      const timestamp = new Date('2023-01-01').getTime();
      const result = await parseAndEvaluateExpression(`${timestamp} as Date`, context);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
    });

    it('should handle invalid date strings', async () => {
      const result = await parseAndEvaluateExpression('"invalid-date" as Date', context);
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(true); // Invalid Date
    });

    it('should handle null/undefined gracefully', async () => {
      const result1 = await parseAndEvaluateExpression('null as Date', context);
      expect(result1).toBeInstanceOf(Date);
      expect(isNaN(result1.getTime())).toBe(true);
    });
  });

  describe('Positional Expressions (first/last)', () => {
    beforeEach(() => {
      // Set up DOM elements for positional tests
      document.body.innerHTML = '';
      
      const container = document.createElement('div');
      container.id = 'test-container';
      
      // Create multiple test elements
      for (let i = 1; i <= 5; i++) {
        const item = document.createElement('div');
        item.className = 'test-item';
        item.textContent = `Item ${i}`;
        item.setAttribute('data-index', i.toString());
        container.appendChild(item);
      }
      
      document.body.appendChild(container);
    });

    describe('First Expression', () => {
      it('should get first element from CSS selector collection', async () => {
        // From official positionalExpression.js test
        const result = await parseAndEvaluateExpression('first .test-item', context);
        expect(result).toBeInstanceOf(HTMLElement);
        expect(result.textContent).toBe('Item 1');
        expect(result.getAttribute('data-index')).toBe('1');
      });

      it('should get first element from array', async () => {
        context.locals.set('testArray', ['first', 'second', 'third']);
        const result = await parseAndEvaluateExpression('first testArray', context);
        expect(result).toBe('first');
      });

      it('should get first element from array-like NodeList', async () => {
        // This tests NodeList-like objects (from official test)
        const result = await parseAndEvaluateExpression('first <.test-item/>', context);
        expect(result).toBeInstanceOf(HTMLElement);
        expect(result.textContent).toBe('Item 1');
      });

      it('should return null for empty collections', async () => {
        const result = await parseAndEvaluateExpression('first .nonexistent', context);
        expect(result).toBeNull();
      });

      it('should be null safe', async () => {
        context.locals.set('nullValue', null);
        const result = await parseAndEvaluateExpression('first nullValue', context);
        expect(result).toBeNull();
      });
    });

    describe('Last Expression', () => {
      it('should get last element from CSS selector collection', async () => {
        // From official positionalExpression.js test
        const result = await parseAndEvaluateExpression('last .test-item', context);
        expect(result).toBeInstanceOf(HTMLElement);
        expect(result.textContent).toBe('Item 5');
        expect(result.getAttribute('data-index')).toBe('5');
      });

      it('should get last element from array', async () => {
        context.locals.set('testArray', ['first', 'second', 'third']);
        const result = await parseAndEvaluateExpression('last testArray', context);
        expect(result).toBe('third');
      });

      it('should get last element from array-like NodeList', async () => {
        // This tests NodeList-like objects (from official test)
        const result = await parseAndEvaluateExpression('last <.test-item/>', context);
        expect(result).toBeInstanceOf(HTMLElement);
        expect(result.textContent).toBe('Item 5');
      });

      it('should return null for empty collections', async () => {
        const result = await parseAndEvaluateExpression('last .nonexistent', context);
        expect(result).toBeNull();
      });

      it('should be null safe', async () => {
        context.locals.set('nullValue', null);
        const result = await parseAndEvaluateExpression('last nullValue', context);
        expect(result).toBeNull();
      });
    });
  });

  describe('Async Expressions', () => {
    it('should handle simple async expressions', async () => {
      // From official async.js test
      // This tests async function calls or Promise-based expressions
      
      // Create an async function in the context
      context.globals.set('asyncFunction', async () => {
        return new Promise(resolve => {
          setTimeout(() => resolve('async-result'), 10);
        });
      });

      const result = await parseAndEvaluateExpression('asyncFunction()', context);
      expect(result).toBe('async-result');
    });

    it('should handle async argument evaluation', async () => {
      // Test that arguments are properly awaited in async contexts
      context.globals.set('asyncValue', Promise.resolve('promised-value'));
      context.globals.set('processValue', (value) => `processed-${value}`);

      const result = await parseAndEvaluateExpression('processValue(asyncValue)', context);
      expect(result).toBe('processed-promised-value');
    });

    it('should work with non-async values in async context', async () => {
      // From official async.js test - async argument works w/ non-async value
      context.globals.set('syncFunction', (value) => `sync-${value}`);
      
      const result = await parseAndEvaluateExpression('syncFunction("test")', context);
      expect(result).toBe('sync-test');
    });
  });

  describe('Edge Cases and Integration', () => {
    beforeEach(() => {
      // Set up DOM elements for integration tests (same as positional tests)
      document.body.innerHTML = '';
      
      const container = document.createElement('div');
      container.id = 'test-container';
      
      // Create multiple test elements
      for (let i = 1; i <= 5; i++) {
        const item = document.createElement('div');
        item.className = 'test-item';
        item.textContent = `Item ${i}`;
        item.setAttribute('data-index', i.toString());
        container.appendChild(item);
      }
      
      document.body.appendChild(container);
    });

    it('should combine positional expressions with conversions', async () => {
      // Test combining first/last with "as" conversions
      context.locals.set('numberStrings', ['1', '2', '3', '4', '5']);
      
      const firstAsInt = await parseAndEvaluateExpression('first numberStrings as Int', context);
      expect(firstAsInt).toBe(1);
      
      const lastAsInt = await parseAndEvaluateExpression('last numberStrings as Int', context);
      expect(lastAsInt).toBe(5);
    });

    it('should handle complex nested expressions', async () => {
      // Test first/last with complex selectors
      const result = await parseAndEvaluateExpression('first <div.test-item/>', context);
      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.textContent).toBe('Item 1');
    });

    it('should handle first/last with property access', async () => {
      // First verify that basic first works
      const element = await parseAndEvaluateExpression('first .test-item', context);
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.textContent).toBe('Item 1');
      
      // Then test possessive syntax
      const result = await parseAndEvaluateExpression('first .test-item\'s textContent', context);
      expect(result).toBe('Item 1');
    });
  });
});