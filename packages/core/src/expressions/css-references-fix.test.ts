/**
 * TDD Fix for CSS Reference Issues (Issue #3 from todo list)
 *
 * Based on official test suite failures:
 * ❌ basic classRef works
 * ❌ basic queryRef works
 * ❌ basic id ref works
 *
 * The issue: hyperscript expects specific return formats:
 * - .class → returns collection (iterable with Array.from())
 * - <selector/> → returns collection (iterable with Array.from())
 * - #id → returns single element
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseAndEvaluateExpression } from '../parser/expression-parser';
import type { ExecutionContext } from '../types/core';

describe('CSS References Fix - Official Test Patterns', () => {
  let context: ExecutionContext;
  let testDiv: HTMLElement;

  beforeEach(() => {
    // Clear any existing test elements
    document.body.innerHTML = '';

    // Create test element
    testDiv = document.createElement('div');
    testDiv.className = 'c1';
    testDiv.id = 'd1';
    testDiv.textContent = 'Test Content';
    document.body.appendChild(testDiv);

    context = {
      me: null,
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
    };
  });

  describe('Class References (.class)', () => {
    it('should work like official test: .c1 returns iterable collection', async () => {
      // From official classRef.js test:
      // var div = make("<div class='c1'></div>");
      // var value = evalHyperScript(".c1");
      // Array.from(value)[0].should.equal(div);

      const result = await parseAndEvaluateExpression('.c1', context);

      // Should be iterable with Array.from()
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // Should be able to convert to array and get first element
      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(1);
      expect(arrayResult[0]).toBe(testDiv);
    });

    it('should return empty collection for non-existent class', async () => {
      const result = await parseAndEvaluateExpression('.nonexistent', context);

      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(0);
    });
  });

  describe('ID References (#id)', () => {
    it('should work like official test: #d1 returns single element', async () => {
      // From official idRef.js test:
      // var div = make("<div id='d1'></div>");
      // var value = evalHyperScript("#d1");
      // value.should.equal(div);

      const result = await parseAndEvaluateExpression('#d1', context);

      // Should return the element directly (not a collection)
      expect(result).toBe(testDiv);
    });

    it('should return null for non-existent ID', async () => {
      const result = await parseAndEvaluateExpression('#nonexistent', context);
      expect(result).toBeNull();
    });
  });

  describe('Query References (<selector/>)', () => {
    it('should work like official test: <.c1/> returns iterable collection', async () => {
      // From official queryRef.js test:
      // var div = make("<div class='c1'></div>");
      // var value = evalHyperScript("<.c1/>");
      // Array.from(value)[0].should.equal(div);

      const result = await parseAndEvaluateExpression('<.c1/>', context);

      // Should be iterable with Array.from()
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // Should be able to convert to array and get first element
      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(1);
      expect(arrayResult[0]).toBe(testDiv);
    });

    it('should work with ID query: <#d1/>', async () => {
      const result = await parseAndEvaluateExpression('<#d1/>', context);

      // Query references always return collections, even for IDs
      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(1);
      expect(arrayResult[0]).toBe(testDiv);
    });

    it('should work with element query: <div/>', async () => {
      const result = await parseAndEvaluateExpression('<div/>', context);

      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(1);
      expect(arrayResult[0]).toBe(testDiv);
    });
  });

  describe('Edge Cases from Official Tests', () => {
    it('should handle multiple elements with same class', async () => {
      // Add second element with same class
      const testDiv2 = document.createElement('div');
      testDiv2.className = 'c1';
      testDiv2.textContent = 'Test Content 2';
      document.body.appendChild(testDiv2);

      const result = await parseAndEvaluateExpression('.c1', context);
      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(2);
      expect(arrayResult[0]).toBe(testDiv);
      expect(arrayResult[1]).toBe(testDiv2);
    });

    it('should handle query reference with multiple matches', async () => {
      // Add second div
      const testDiv2 = document.createElement('div');
      testDiv2.className = 'other';
      document.body.appendChild(testDiv2);

      const result = await parseAndEvaluateExpression('<div/>', context);
      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(2);
    });
  });
});
