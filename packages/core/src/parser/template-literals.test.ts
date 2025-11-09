/**
 * Template Literals Implementation Tests
 * TDD approach for implementing template literal support in hyperscript parser
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { tokenize } from './tokenizer';
import { parseAndEvaluateExpression } from './expression-parser';
import { createMockHyperscriptContext } from '../test-setup';
import type { ExecutionContext } from '../types/core';

describe('Template Literals', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = createMockHyperscriptContext();
    context.locals = new Map([
      ['name', 'world'],
      ['count', 5],
      ['user', { name: 'Alice', age: 30 }],
    ]);
  });

  describe('Basic Template Literals', () => {
    it('should tokenize basic template literal', () => {
      const tokens = tokenize('`hello world`');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        type: 'template_literal',
        value: 'hello world',
        line: 1,
        column: 1,
      });
    });

    it('should tokenize empty template literal', () => {
      const tokens = tokenize('``');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        type: 'template_literal',
        value: '',
        line: 1,
        column: 1,
      });
    });

    it('should parse and evaluate basic template literal', async () => {
      const result = await parseAndEvaluateExpression('`hello world`', context);
      expect(result).toBe('hello world');
    });
  });

  describe('Template Literals with Variables', () => {
    it('should tokenize template literal with variable interpolation', () => {
      const tokens = tokenize('`hello ${name}`');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        type: 'template_literal',
        value: 'hello ${name}',
        line: 1,
        column: 1,
      });
    });

    it('should parse and evaluate template literal with simple variable', async () => {
      const result = await parseAndEvaluateExpression('`hello ${name}`', context);
      expect(result).toBe('hello world');
    });

    it('should handle multiple variable interpolations', async () => {
      const result = await parseAndEvaluateExpression('`${name} has ${count} items`', context);
      expect(result).toBe('world has 5 items');
    });

    it('should handle property access in interpolation', async () => {
      const result = await parseAndEvaluateExpression(
        '`Hello ${user.name}, age ${user.age}`',
        context
      );
      expect(result).toBe('Hello Alice, age 30');
    });
  });

  describe('Template Literals with Expressions', () => {
    it('should handle mathematical expressions in interpolation', async () => {
      const result = await parseAndEvaluateExpression('`total: ${count + 10}`', context);
      expect(result).toBe('total: 15');
    });

    it('should handle complex expressions in interpolation', async () => {
      const result = await parseAndEvaluateExpression(
        '`doubled: ${count * 2}, tripled: ${count * 3}`',
        context
      );
      expect(result).toBe('doubled: 10, tripled: 15');
    });

    it('should handle string concatenation in interpolation', async () => {
      const result = await parseAndEvaluateExpression('`greeting: ${"hello " + name}`', context);
      expect(result).toBe('greeting: hello world');
    });
  });

  describe('Nested Template Literals', () => {
    it.skip('should handle escaped backticks', async () => {
      const result = await parseAndEvaluateExpression('`code: \\`hello\\``', context);
      expect(result).toBe('code: `hello`');
    });

    it('should handle multiline template literals', async () => {
      const tokens = tokenize('`line 1\nline 2`');
      expect(tokens[0].value).toBe('line 1\nline 2');
    });
  });

  describe('Error Handling', () => {
    it('should handle unclosed template literals', () => {
      expect(() => tokenize('`unclosed template')).toThrow('Unterminated template literal');
    });

    it.skip('should handle invalid variable references', async () => {
      const result = await parseAndEvaluateExpression('`hello ${nonexistent}`', context);
      expect(result).toBe('hello undefined');
    });

    it.skip('should handle syntax errors in interpolation expressions', async () => {
      await expect(parseAndEvaluateExpression('`result: ${1 + }`', context)).rejects.toThrow();
    });
  });
});
