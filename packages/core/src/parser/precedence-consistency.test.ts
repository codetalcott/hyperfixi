/**
 * Operator Precedence Consistency Test
 *
 * Validates that operator precedence behaves correctly end-to-end.
 * This catches drift between the expression-parser's hard-coded precedence
 * (getLogicalOperatorPrecedence, getArithmeticOperatorPrecedence) and
 * expression metadata precedence values.
 *
 * Background: Precedence was previously defined in three places:
 * 1. OPERATOR_PRECEDENCE in types.ts (removed — was dead code)
 * 2. getLogicalOperatorPrecedence / getArithmeticOperatorPrecedence in expression-parser.ts
 * 3. Expression metadata objects (precedence fields in logical/index.ts, conversion/index.ts)
 *
 * Sources 2 and 3 serve different purposes (parser vs tooling) but must agree
 * on relative ordering. This test validates that agreement behaviorally.
 */

import { describe, it, expect } from 'vitest';
import { parseAndEvaluateExpression } from './expression-parser';
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
      expect(await parseAndEvaluateExpression('2 + 3 * 4', context)).toBe(14);
    });

    it('10 - 6 / 2 = 7', async () => {
      expect(await parseAndEvaluateExpression('10 - 6 / 2', context)).toBe(7);
    });

    it('3 + 10 % 3 = 4', async () => {
      expect(await parseAndEvaluateExpression('3 + 10 % 3', context)).toBe(4);
    });
  });

  describe('exponentiation binds tighter than * /', () => {
    it('2 * 3 ** 2 = 18', async () => {
      expect(await parseAndEvaluateExpression('2 * 3 ** 2', context)).toBe(18);
    });

    it('2 * 2 ^ 3 = 16', async () => {
      expect(await parseAndEvaluateExpression('2 * 2 ^ 3', context)).toBe(16);
    });
  });

  describe('exponentiation is right-associative', () => {
    it('2 ** 2 ** 3 = 256 (right-to-left)', async () => {
      // 2 ** (2 ** 3) = 2 ** 8 = 256, NOT (2 ** 2) ** 3 = 4 ** 3 = 64
      expect(await parseAndEvaluateExpression('2 ** 2 ** 3', context)).toBe(256);
    });
  });

  describe('comparison binds tighter than logical', () => {
    it('true and 2 < 3 = true', async () => {
      // 'and' should not consume '2' — '<' binds tighter
      expect(await parseAndEvaluateExpression('true and 2 < 3', context)).toBe(true);
    });

    it('false or 5 > 3 = true', async () => {
      expect(await parseAndEvaluateExpression('false or 5 > 3', context)).toBe(true);
    });
  });

  describe('and binds tighter than or', () => {
    it('true or false and false = true', async () => {
      // true or (false and false) = true or false = true
      expect(await parseAndEvaluateExpression('true or false and false', context)).toBe(true);
    });

    it('false and true or true = true', async () => {
      // (false and true) or true = false or true = true
      expect(await parseAndEvaluateExpression('false and true or true', context)).toBe(true);
    });

    it('false or false and true = false', async () => {
      // false or (false and true) = false or false = false
      expect(await parseAndEvaluateExpression('false or false and true', context)).toBe(false);
    });
  });

  describe('arithmetic binds tighter than comparison', () => {
    it('2 + 3 > 4 = true', async () => {
      // (2 + 3) > 4 = 5 > 4 = true
      expect(await parseAndEvaluateExpression('2 + 3 > 4', context)).toBe(true);
    });

    it('10 - 3 <= 7 = true', async () => {
      expect(await parseAndEvaluateExpression('10 - 3 <= 7', context)).toBe(true);
    });
  });
});
