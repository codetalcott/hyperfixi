/**
 * End-to-end tests for upstream _hyperscript comparison operator parity additions:
 *   - Type checks: `is a` / `is an` / `is not a` / `is not an` (+ `!` null-disallow)
 *   - DOM ordering: `precedes` / `does not precede` / `follows` / `does not follow`
 *   - Membership negation: `is in` / `is not in`
 *   - `am` alias for `is`
 *   - English-form aliases: `is equal to`, `is greater than`, `really equals`, etc.
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

describe('Comparison operator parity', () => {
  describe('type checks: is a / is an / is not a / is not an', () => {
    it('42 is a Number → true', async () => {
      expect(await evalArg('return 42 is a Number')).toBe(true);
    });
    it('"hello" is a String → true', async () => {
      expect(await evalArg('return "hello" is a String')).toBe(true);
    });
    it('"hello" is an Array → false', async () => {
      expect(await evalArg('return "hello" is an Array')).toBe(false);
    });
    it('42 is a String → false', async () => {
      expect(await evalArg('return 42 is a String')).toBe(false);
    });
    it('42 is not a String → true', async () => {
      expect(await evalArg('return 42 is not a String')).toBe(true);
    });
    it('42 is not a Number → false', async () => {
      expect(await evalArg('return 42 is not a Number')).toBe(false);
    });
    it('true is a Boolean → true', async () => {
      expect(await evalArg('return true is a Boolean')).toBe(true);
    });
    it('null is a String → true (nullOk default)', async () => {
      expect(await evalArg('return null is a String')).toBe(true);
    });
    it('null is a String! → false (! disallows null)', async () => {
      expect(await evalArg('return null is a String!')).toBe(false);
    });
    it('"x" is a String! → true (! does not affect non-null)', async () => {
      expect(await evalArg('return "x" is a String!')).toBe(true);
    });
    it('"x" is not a String → false', async () => {
      expect(await evalArg('return "x" is not a String')).toBe(false);
    });
    it('null is not a String! → true (negated + !)', async () => {
      expect(await evalArg('return null is not a String!')).toBe(true);
    });
    it('null is a Null! → true (upstream parity: ! still permits exact-tag match)', async () => {
      // Mirrors upstream _hyperscript: when nullOk is false, the tag check
      // (Object.prototype.toString → "Null") still runs and succeeds.
      expect(await evalArg('return null is a Null!')).toBe(true);
    });
  });

  describe('DOM ordering: precedes / follows', () => {
    function makeSiblings(): { a: HTMLElement; b: HTMLElement; detached: HTMLElement } {
      // Clean up any previous test DOM
      document.body.innerHTML = '';
      const a = document.createElement('div');
      a.id = 'a';
      const b = document.createElement('div');
      b.id = 'b';
      document.body.appendChild(a);
      document.body.appendChild(b);
      const detached = document.createElement('div');
      detached.id = 'detached';
      return { a, b, detached };
    }

    it('earlier element precedes later element', async () => {
      makeSiblings();
      const result = await evalArg('return #a precedes #b');
      expect(result).toBe(true);
    });

    it('later element does not precede earlier element', async () => {
      makeSiblings();
      const result = await evalArg('return #b precedes #a');
      expect(result).toBe(false);
    });

    it('later element follows earlier element', async () => {
      makeSiblings();
      const result = await evalArg('return #b follows #a');
      expect(result).toBe(true);
    });

    it('earlier element does not follow later element', async () => {
      makeSiblings();
      const result = await evalArg('return #a follows #b');
      expect(result).toBe(false);
    });

    it('"does not precede" — false when actually precedes', async () => {
      makeSiblings();
      expect(await evalArg('return #a does not precede #b')).toBe(false);
    });

    it('"does not precede" — true when does not precede', async () => {
      makeSiblings();
      expect(await evalArg('return #b does not precede #a')).toBe(true);
    });

    it('"does not follow" — true when does not follow', async () => {
      makeSiblings();
      expect(await evalArg('return #a does not follow #b')).toBe(true);
    });

    it('non-Node operand: 1 precedes 2 → false (not DOM nodes)', async () => {
      expect(await evalArg('return 1 precedes 2')).toBe(false);
    });

    it('non-Node operand: 1 does not precede 2 → true', async () => {
      expect(await evalArg('return 1 does not precede 2')).toBe(true);
    });
  });

  describe('membership: is in / is not in', () => {
    it('"a" is in ("a,b,c" split by ",") → true', async () => {
      expect(await evalArg('return "a" is in ("a,b,c" split by ",")')).toBe(true);
    });
    it('"z" is in ("a,b,c" split by ",") → false', async () => {
      expect(await evalArg('return "z" is in ("a,b,c" split by ",")')).toBe(false);
    });
    it('"z" is not in ("a,b,c" split by ",") → true', async () => {
      expect(await evalArg('return "z" is not in ("a,b,c" split by ",")')).toBe(true);
    });
    it('"a" is not in ("a,b,c" split by ",") → false', async () => {
      expect(await evalArg('return "a" is not in ("a,b,c" split by ",")')).toBe(false);
    });
    it('"ell" is in "hello" → true (substring)', async () => {
      expect(await evalArg('return "ell" is in "hello"')).toBe(true);
    });
    it('"xyz" is not in "hello" → true', async () => {
      expect(await evalArg('return "xyz" is not in "hello"')).toBe(true);
    });
  });

  describe('`am` alias for `is`', () => {
    it('1 am 1 → true (lexical alias of `is`)', async () => {
      expect(await evalArg('return 1 am 1')).toBe(true);
    });
    it('1 am 2 → false', async () => {
      expect(await evalArg('return 1 am 2')).toBe(false);
    });
    it('"x" am "x" → true', async () => {
      expect(await evalArg('return "x" am "x"')).toBe(true);
    });
  });

  describe('English-form comparison aliases', () => {
    it('5 is equal to 5 → true', async () => {
      expect(await evalArg('return 5 is equal to 5')).toBe(true);
    });
    it('5 is equal to 6 → false', async () => {
      expect(await evalArg('return 5 is equal to 6')).toBe(false);
    });
    it('5 is not equal to 6 → true', async () => {
      expect(await evalArg('return 5 is not equal to 6')).toBe(true);
    });
    it('5 is not equal to 5 → false', async () => {
      expect(await evalArg('return 5 is not equal to 5')).toBe(false);
    });
    it('"a" is really equal to "a" → true (strict)', async () => {
      expect(await evalArg('return "a" is really equal to "a"')).toBe(true);
    });
    it('1 is really equal to "1" → false (strict — different types)', async () => {
      expect(await evalArg('return 1 is really equal to "1"')).toBe(false);
    });
    it('1 is not really equal to "1" → true', async () => {
      expect(await evalArg('return 1 is not really equal to "1"')).toBe(true);
    });
    it('1 really equals 1 → true', async () => {
      expect(await evalArg('return 1 really equals 1')).toBe(true);
    });
    it('5 is greater than 3 → true', async () => {
      expect(await evalArg('return 5 is greater than 3')).toBe(true);
    });
    it('3 is greater than 5 → false', async () => {
      expect(await evalArg('return 3 is greater than 5')).toBe(false);
    });
    it('3 is less than 5 → true', async () => {
      expect(await evalArg('return 3 is less than 5')).toBe(true);
    });
    it('5 is less than 3 → false', async () => {
      expect(await evalArg('return 5 is less than 3')).toBe(false);
    });
    it('5 is greater than or equal to 5 → true', async () => {
      expect(await evalArg('return 5 is greater than or equal to 5')).toBe(true);
    });
    it('4 is greater than or equal to 5 → false', async () => {
      expect(await evalArg('return 4 is greater than or equal to 5')).toBe(false);
    });
    it('5 is less than or equal to 5 → true', async () => {
      expect(await evalArg('return 5 is less than or equal to 5')).toBe(true);
    });
    it('6 is less than or equal to 5 → false', async () => {
      expect(await evalArg('return 6 is less than or equal to 5')).toBe(false);
    });
  });
});
