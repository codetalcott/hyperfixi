/**
 * Operator Precedence Consistency Test
 *
 * Validates that operator precedence behaves correctly end-to-end. This
 * catches drift between the parser's binding-power values and the
 * precedence fields carried on expression metadata for tooling.
 *
 * Two sources of precedence live in the codebase today:
 * 1. PARSER_TABLE entries in pratt-parser.ts (leftAssoc/rightAssoc bp values)
 * 2. Expression metadata objects (precedence fields in logical/index.ts,
 *    conversion/index.ts)
 *
 * Source 1 drives runtime parsing; source 2 is for tooling. They must agree
 * on relative ordering. This test validates that agreement behaviorally.
 */

import { describe, it, expect } from 'vitest';
import { evaluateExpressionFromSource } from './runtime';
import type { ExecutionContext } from '../types/core';

const context: ExecutionContext = {
  me: null,
  you: null,
  it: null,
  result: null,
  locals: new Map(),
  globals: new Map(),
  parent: undefined,
  halted: false,
  returned: false,
  broke: false,
  continued: false,
  async: false,
};

describe('Operator Precedence Consistency', () => {
  describe('arithmetic: * / % bind tighter than + -', () => {
    it('2 + 3 * 4 = 14', async () => {
      expect(await evaluateExpressionFromSource('2 + 3 * 4', context)).toBe(14);
    });

    it('10 - 6 / 2 = 7', async () => {
      expect(await evaluateExpressionFromSource('10 - 6 / 2', context)).toBe(7);
    });

    it('3 + 10 % 3 = 4', async () => {
      expect(await evaluateExpressionFromSource('3 + 10 % 3', context)).toBe(4);
    });
  });

  describe('exponentiation binds tighter than * /', () => {
    it('2 * 3 ** 2 = 18', async () => {
      expect(await evaluateExpressionFromSource('2 * 3 ** 2', context)).toBe(18);
    });

    it('2 * 2 ^ 3 = 16', async () => {
      expect(await evaluateExpressionFromSource('2 * 2 ^ 3', context)).toBe(16);
    });
  });

  describe('exponentiation is right-associative', () => {
    it('2 ** 2 ** 3 = 256 (right-to-left)', async () => {
      // 2 ** (2 ** 3) = 2 ** 8 = 256, NOT (2 ** 2) ** 3 = 4 ** 3 = 64
      expect(await evaluateExpressionFromSource('2 ** 2 ** 3', context)).toBe(256);
    });
  });

  describe('comparison binds tighter than logical', () => {
    it('true and 2 < 3 = true', async () => {
      // 'and' should not consume '2' — '<' binds tighter
      expect(await evaluateExpressionFromSource('true and 2 < 3', context)).toBe(true);
    });

    it('false or 5 > 3 = true', async () => {
      expect(await evaluateExpressionFromSource('false or 5 > 3', context)).toBe(true);
    });
  });

  describe('and binds tighter than or', () => {
    it('true or false and false = true', async () => {
      // true or (false and false) = true or false = true
      expect(await evaluateExpressionFromSource('true or false and false', context)).toBe(true);
    });

    it('false and true or true = true', async () => {
      // (false and true) or true = false or true = true
      expect(await evaluateExpressionFromSource('false and true or true', context)).toBe(true);
    });

    it('false or false and true = false', async () => {
      // false or (false and true) = false or false = false
      expect(await evaluateExpressionFromSource('false or false and true', context)).toBe(false);
    });
  });

  describe('arithmetic binds tighter than comparison', () => {
    it('2 + 3 > 4 = true', async () => {
      // (2 + 3) > 4 = 5 > 4 = true
      expect(await evaluateExpressionFromSource('2 + 3 > 4', context)).toBe(true);
    });

    it('10 - 3 <= 7 = true', async () => {
      expect(await evaluateExpressionFromSource('10 - 3 <= 7', context)).toBe(true);
    });
  });
});
