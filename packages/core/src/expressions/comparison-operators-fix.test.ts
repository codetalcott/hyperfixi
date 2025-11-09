/**
 * TDD Fix for Comparison Operators (Issue #4 from todo list)
 *
 * Based on official test suite failures:
 * ❌ equal works (==)
 * ❌ triple equal works (===)
 * ❌ is not in works
 * ❌ exists works
 * ❌ does not exist works
 *
 * These operators are critical for logical expressions in hyperscript
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseAndEvaluateExpression } from '../parser/expression-parser';
import type { ExecutionContext } from '../types/core';

describe('Comparison Operators Fix - Official Test Patterns', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = {
      me: null,
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
    };
  });

  describe('Equality Operators', () => {
    it('should support == operator (loose equality)', async () => {
      // From official comparisonOperator.js test
      expect(await parseAndEvaluateExpression('5 == 5', context)).toBe(true);
      expect(await parseAndEvaluateExpression('5 == "5"', context)).toBe(true); // loose equality
      expect(await parseAndEvaluateExpression('5 == 3', context)).toBe(false);
      expect(await parseAndEvaluateExpression('null == undefined', context)).toBe(true); // loose equality
    });

    it('should support === operator (strict equality)', async () => {
      // From official comparisonOperator.js test
      expect(await parseAndEvaluateExpression('5 === 5', context)).toBe(true);
      expect(await parseAndEvaluateExpression('5 === "5"', context)).toBe(false); // strict equality
      expect(await parseAndEvaluateExpression('5 === 3', context)).toBe(false);
      expect(await parseAndEvaluateExpression('null === undefined', context)).toBe(false); // strict equality
    });

    it('should support !== operator (strict not equal)', async () => {
      expect(await parseAndEvaluateExpression('5 !== "5"', context)).toBe(true);
      expect(await parseAndEvaluateExpression('5 !== 5', context)).toBe(false);
    });
  });

  describe('Membership Operators', () => {
    beforeEach(() => {
      // Set up DOM elements for membership tests
      document.body.innerHTML = '';
      const testDiv = document.createElement('div');
      testDiv.className = 'test-class';
      testDiv.id = 'test-id';
      document.body.appendChild(testDiv);
    });

    it('should support "is not in" operator', async () => {
      // From official comparisonOperator.js test
      // "is not in" should work opposite of "is in"
      expect(await parseAndEvaluateExpression('5 is not in [1, 2, 3]', context)).toBe(true);
      expect(await parseAndEvaluateExpression('2 is not in [1, 2, 3]', context)).toBe(false);
    });

    it('should work with CSS selectors for "is not in"', async () => {
      // This tests CSS selector membership
      const result1 = await parseAndEvaluateExpression('#test-id is not in .nonexistent', context);
      expect(result1).toBe(true); // element is not in nonexistent class

      const result2 = await parseAndEvaluateExpression('#test-id is not in #test-id', context);
      expect(result2).toBe(false); // element is in itself
    });
  });

  describe('Existence Operators', () => {
    beforeEach(() => {
      // Set up test elements
      document.body.innerHTML = '';
      const testDiv = document.createElement('div');
      testDiv.id = 'existing-element';
      document.body.appendChild(testDiv);
    });

    it('should support "exists" operator', async () => {
      // From official comparisonOperator.js test
      expect(await parseAndEvaluateExpression('#existing-element exists', context)).toBe(true);
      expect(await parseAndEvaluateExpression('#nonexistent-element exists', context)).toBe(false);

      // Should work with variables
      context.locals.set('testVar', 'some value');
      expect(await parseAndEvaluateExpression('testVar exists', context)).toBe(true);
      expect(await parseAndEvaluateExpression('nonexistentVar exists', context)).toBe(false);
    });

    it('should support "does not exist" operator', async () => {
      // From official comparisonOperator.js test
      expect(await parseAndEvaluateExpression('#nonexistent-element does not exist', context)).toBe(
        true
      );
      expect(await parseAndEvaluateExpression('#existing-element does not exist', context)).toBe(
        false
      );

      // Should work with variables
      context.locals.set('testVar', 'some value');
      expect(await parseAndEvaluateExpression('nonexistentVar does not exist', context)).toBe(true);
      expect(await parseAndEvaluateExpression('testVar does not exist', context)).toBe(false);
    });

    it('should handle null and undefined for existence', async () => {
      context.locals.set('nullVar', null);
      context.locals.set('undefinedVar', undefined);

      // null and undefined should be considered as "not existing"
      expect(await parseAndEvaluateExpression('nullVar exists', context)).toBe(false);
      expect(await parseAndEvaluateExpression('undefinedVar exists', context)).toBe(false);
      expect(await parseAndEvaluateExpression('nullVar does not exist', context)).toBe(true);
      expect(await parseAndEvaluateExpression('undefinedVar does not exist', context)).toBe(true);
    });
  });

  describe('Edge Cases and Type Coercion', () => {
    it('should handle boolean coercion correctly', async () => {
      // Make sure == does JavaScript-style type coercion
      expect(await parseAndEvaluateExpression('0 == false', context)).toBe(true);
      expect(await parseAndEvaluateExpression('"" == false', context)).toBe(true);
      expect(await parseAndEvaluateExpression('1 == true', context)).toBe(true);

      // But === should not
      expect(await parseAndEvaluateExpression('0 === false', context)).toBe(false);
      expect(await parseAndEvaluateExpression('1 === true', context)).toBe(false);
    });

    it('should handle string/number coercion', async () => {
      expect(await parseAndEvaluateExpression('"42" == 42', context)).toBe(true);
      expect(await parseAndEvaluateExpression('"42" === 42', context)).toBe(false);
    });
  });
});
