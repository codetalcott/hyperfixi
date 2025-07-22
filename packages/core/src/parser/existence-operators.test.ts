/**
 * Existence Operators Implementation Tests
 * TDD approach for implementing 'no' and potentially 'some' operators
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { tokenize } from './tokenizer';
import { parseAndEvaluateExpression } from './expression-parser';
import { createMockHyperscriptContext } from '../test-setup';
import type { ExecutionContext } from '../types/core';

describe('Existence Operators', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = createMockHyperscriptContext();
    context.locals = new Map([
      ['emptyString', ''],
      ['emptyArray', []],
      ['emptyObject', {}],
      ['nullValue', null],
      ['undefinedValue', undefined],
      ['nonEmptyString', 'hello'],
      ['nonEmptyArray', [1, 2, 3]],
      ['nonEmptyObject', { key: 'value' }],
      ['falseValue', false],
      ['zeroValue', 0]
    ]);
  });

  describe('No Operator', () => {
    it('should return true for null values', async () => {
      const result = await parseAndEvaluateExpression('no nullValue', context);
      expect(result).toBe(true);
    });

    it('should return true for undefined values', async () => {
      const result = await parseAndEvaluateExpression('no undefinedValue', context);
      expect(result).toBe(true);
    });

    it('should return true for empty string', async () => {
      const result = await parseAndEvaluateExpression('no emptyString', context);
      expect(result).toBe(true);
    });

    it('should return true for empty array', async () => {
      const result = await parseAndEvaluateExpression('no emptyArray', context);
      expect(result).toBe(true);
    });

    it('should return true for empty object', async () => {
      const result = await parseAndEvaluateExpression('no emptyObject', context);
      expect(result).toBe(true);
    });

    it('should return false for non-empty string', async () => {
      const result = await parseAndEvaluateExpression('no nonEmptyString', context);
      expect(result).toBe(false);
    });

    it('should return false for non-empty array', async () => {
      const result = await parseAndEvaluateExpression('no nonEmptyArray', context);
      expect(result).toBe(false);
    });

    it('should return false for non-empty object', async () => {
      const result = await parseAndEvaluateExpression('no nonEmptyObject', context);
      expect(result).toBe(false);
    });

    it('should return false for false boolean (not empty)', async () => {
      const result = await parseAndEvaluateExpression('no falseValue', context);
      expect(result).toBe(false);
    });

    it('should return false for zero number (not empty)', async () => {
      const result = await parseAndEvaluateExpression('no zeroValue', context);
      expect(result).toBe(false);
    });

    it('should work with CSS selector expressions', async () => {
      // Add an empty NodeList to test with
      context.locals?.set('emptyNodeList', document.querySelectorAll('.nonexistent-class'));
      const result = await parseAndEvaluateExpression('no emptyNodeList', context);
      expect(result).toBe(true); // Empty NodeList
    });
  });

  describe('Some Operator (if it exists)', () => {
    // Based on context, 'some' might be the opposite of 'no'
    // Let's test this hypothesis
    it.skip('should return false for null values', async () => {
      const result = await parseAndEvaluateExpression('some nullValue', context);
      expect(result).toBe(false);
    });

    it.skip('should return false for empty values', async () => {
      const result = await parseAndEvaluateExpression('some emptyString', context);
      expect(result).toBe(false);
    });

    it.skip('should return true for non-empty values', async () => {
      const result = await parseAndEvaluateExpression('some nonEmptyString', context);
      expect(result).toBe(true);
    });
  });

  describe('Usage in Conditionals', () => {
    it('should work in if statements as documented', async () => {
      // Based on the documentation example: if no .tabs log 'No tabs found!'
      // We'll simulate this with a simpler example
      context.locals?.set('tabs', []);
      const result = await parseAndEvaluateExpression('no tabs', context);
      expect(result).toBe(true);
    });

    it('should work in complex expressions', async () => {
      const result = await parseAndEvaluateExpression('no emptyArray and nonEmptyString', context);
      expect(result).toBe(true); // true && truthy = true
    });
  });
});