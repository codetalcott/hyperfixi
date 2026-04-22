/**
 * End-to-end tests for upstream _hyperscript 0.9.90 comparator additions:
 *   - `starts with` / `ends with` / `does not start with` / `does not end with`
 *   - `is between <min> and <max>` / `is not between <min> and <max>` (ternary, auto-ordered bounds)
 *   - `ignoring case` (postfix modifier on string comparators)
 *
 * Covers parse → Pratt table → runtime dispatch through the `return` command.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/parser';
import { evaluateAST } from '../../parser/runtime';
import { createContext } from '../../core/context';

async function evalArg(code: string): Promise<unknown> {
  const result = parse(code);
  if (!result.success) {
    console.error('parse error:', result.error);
    throw new Error(`parse failed: ${code}`);
  }
  const ast = result.node as any;
  const firstCmd = ast.body?.[0] ?? ast;
  const arg = firstCmd.args?.[0] ?? firstCmd;
  return evaluateAST(arg, createContext());
}

describe('Comparators (v0.9.90)', () => {
  describe('starts with / ends with', () => {
    it('"hello world" starts with "hello" → true', async () => {
      expect(await evalArg('return "hello world" starts with "hello"')).toBe(true);
    });
    it('"hello world" starts with "world" → false', async () => {
      expect(await evalArg('return "hello world" starts with "world"')).toBe(false);
    });
    it('"hello world" ends with "world" → true', async () => {
      expect(await evalArg('return "hello world" ends with "world"')).toBe(true);
    });
    it('"hello world" ends with "hello" → false', async () => {
      expect(await evalArg('return "hello world" ends with "hello"')).toBe(false);
    });
    it('"hello world" does not start with "world" → true', async () => {
      expect(await evalArg('return "hello world" does not start with "world"')).toBe(true);
    });
    it('"hello world" does not start with "hello" → false', async () => {
      expect(await evalArg('return "hello world" does not start with "hello"')).toBe(false);
    });
    it('"hello world" does not end with "hello" → true', async () => {
      expect(await evalArg('return "hello world" does not end with "hello"')).toBe(true);
    });
    it('non-string LHS returns false: 42 starts with "4"', async () => {
      expect(await evalArg('return 42 starts with "4"')).toBe(false);
    });
  });

  describe('between', () => {
    it('5 is between 1 and 10 → true', async () => {
      expect(await evalArg('return 5 is between 1 and 10')).toBe(true);
    });
    it('10 is between 1 and 10 → true (inclusive)', async () => {
      expect(await evalArg('return 10 is between 1 and 10')).toBe(true);
    });
    it('1 is between 1 and 10 → true (inclusive)', async () => {
      expect(await evalArg('return 1 is between 1 and 10')).toBe(true);
    });
    it('0 is between 1 and 10 → false', async () => {
      expect(await evalArg('return 0 is between 1 and 10')).toBe(false);
    });
    it('11 is between 1 and 10 → false', async () => {
      expect(await evalArg('return 11 is between 1 and 10')).toBe(false);
    });
    it('5 is not between 1 and 10 → false', async () => {
      expect(await evalArg('return 5 is not between 1 and 10')).toBe(false);
    });
    it('100 is not between 1 and 10 → true', async () => {
      expect(await evalArg('return 100 is not between 1 and 10')).toBe(true);
    });
    it('auto-orders reversed bounds: 5 is between 10 and 1 → true', async () => {
      expect(await evalArg('return 5 is between 10 and 1')).toBe(true);
    });
  });

  describe('ignoring case', () => {
    it('"Alice" is "alice" ignoring case → true', async () => {
      expect(await evalArg('return "Alice" is "alice" ignoring case')).toBe(true);
    });
    it('"Alice" is "alice" (without modifier) → false', async () => {
      expect(await evalArg('return "Alice" is "alice"')).toBe(false);
    });
    it('"HELLO WORLD" starts with "hello" ignoring case → true', async () => {
      expect(await evalArg('return "HELLO WORLD" starts with "hello" ignoring case')).toBe(true);
    });
    it('"HELLO WORLD" ends with "WORLD" ignoring case → true', async () => {
      expect(await evalArg('return "HELLO WORLD" ends with "WORLD" ignoring case')).toBe(true);
    });
    it('"HELLO" contains "ello" ignoring case → true', async () => {
      expect(await evalArg('return "HELLO" contains "ello" ignoring case')).toBe(true);
    });
    it('does not affect non-string operands: 5 is 5 ignoring case → true', async () => {
      expect(await evalArg('return 5 is 5 ignoring case')).toBe(true);
    });
  });
});
