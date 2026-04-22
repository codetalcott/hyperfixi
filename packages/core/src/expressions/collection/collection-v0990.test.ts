/**
 * End-to-end tests for v0.9.90 collection expressions:
 *   - `where` (filter by per-element predicate)
 *   - `sorted by` (sort by per-element key; asc|desc)
 *   - `mapped to` (transform each element)
 *   - `split by` (string → array)
 *   - `joined by` (array → string)
 *
 * Per-element operators (`where`/`sorted by`/`mapped to`) test the critical
 * behavior that their RHS AST is re-evaluated with `it` bound to each element.
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

describe('Collection expressions (v0.9.90)', () => {
  describe('split by', () => {
    it('"a,b,c" split by "," → ["a","b","c"]', async () => {
      expect(await evalArg('return "a,b,c" split by ","')).toEqual(['a', 'b', 'c']);
    });
    it('empty separator yields character array', async () => {
      expect(await evalArg('return "abc" split by ""')).toEqual(['a', 'b', 'c']);
    });
    it('no match → single-element array', async () => {
      expect(await evalArg('return "abc" split by ","')).toEqual(['abc']);
    });
  });

  describe('joined by', () => {
    it('round-trip: split then join', async () => {
      expect(await evalArg('return ("a,b,c" split by ",") joined by "-"')).toBe('a-b-c');
    });
    it('joined by empty string → concatenation', async () => {
      expect(await evalArg('return ("abc" split by "") joined by ""')).toBe('abc');
    });
  });

  describe('where', () => {
    it('filters by predicate using `it`', async () => {
      expect(await evalArg('return ("a,b,c,d" split by ",") where it is "b"')).toEqual(['b']);
    });
    it('returns empty array when nothing matches', async () => {
      expect(await evalArg('return ("a,b,c" split by ",") where it is "z"')).toEqual([]);
    });
    it('composes with joined by', async () => {
      // Use `!= "b"` instead of `is not` — `is not` dispatch is not wired
      // in the runtime binary operator switch (pre-existing orthogonal gap).
      expect(await evalArg('return (("a,b,c,d" split by ",") where it != "b") joined by "-"')).toBe(
        'a-c-d'
      );
    });
    it('supports string comparators on elements', async () => {
      expect(
        await evalArg('return ("apple,banana,cherry" split by ",") where it contains "an"')
      ).toEqual(['banana']);
    });
  });

  describe('mapped to', () => {
    it('uppercases each element via it.toUpperCase()', async () => {
      expect(await evalArg('return ("a,b,c" split by ",") mapped to it.toUpperCase()')).toEqual([
        'A',
        'B',
        'C',
      ]);
    });
    it('composes with joined by', async () => {
      expect(
        await evalArg('return (("a,b,c" split by ",") mapped to it.toUpperCase()) joined by "-"')
      ).toBe('A-B-C');
    });
  });

  describe('sorted by', () => {
    it('sorts strings ascending by default', async () => {
      expect(await evalArg('return ("banana,apple,cherry" split by ",") sorted by it')).toEqual([
        'apple',
        'banana',
        'cherry',
      ]);
    });
    it('sorts strings descending with `desc`', async () => {
      expect(
        await evalArg('return ("banana,apple,cherry" split by ",") sorted by it desc')
      ).toEqual(['cherry', 'banana', 'apple']);
    });
    it('accepts `descending` as alias for desc', async () => {
      expect(await evalArg('return ("a,b,c" split by ",") sorted by it descending')).toEqual([
        'c',
        'b',
        'a',
      ]);
    });
    it('sorts by a derived key (string length)', async () => {
      expect(await evalArg('return ("bb,a,ccc" split by ",") sorted by it.length')).toEqual([
        'a',
        'bb',
        'ccc',
      ]);
    });
  });

  describe('composition', () => {
    it('where + mapped to + joined by pipeline', async () => {
      // Split, filter out "3", uppercase each, join with dashes.
      expect(
        await evalArg(
          'return ((("1,2,3,4,5" split by ",") where it != "3") mapped to it.toUpperCase()) joined by "-"'
        )
      ).toBe('1-2-4-5');
    });

    it('sorted by then joined by', async () => {
      expect(await evalArg('return (("c,a,b" split by ",") sorted by it) joined by ","')).toBe(
        'a,b,c'
      );
    });
  });
});
