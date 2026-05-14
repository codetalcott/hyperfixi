/**
 * End-to-end coverage for AST node types that were ported into the canonical
 * Pratt evaluator (`parser/runtime.ts:evaluateAST`). Each previously caused
 * `Unknown AST node type: X` despite parsing successfully.
 *
 * Covers: arrayLiteral, objectLiteral, attributeAccess, propertyOfExpression,
 * templateLiteral, and the `does not contain` / `does not include` operator
 * cases.
 *
 * Note: `propertyAccess`, `optionalChain`, and `positionalExpression` from
 * pratt-parser fragments are NOT reached via the canonical PARSER_TABLE
 * (parser.ts uses memberExpression instead). Handlers for those types are
 * intentionally omitted; tests for them would exercise unreachable code.
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { evaluateAST } from './runtime';
import { createContext } from '../core/context';

async function evalArg(
  code: string,
  contextOverrides: Record<string, unknown> = {}
): Promise<unknown> {
  const result = parse(code);
  if (!result.success) {
    console.error('parse error:', result.error);
    throw new Error(`parse failed: ${code}`);
  }
  const ast = result.node as any;
  const firstCmd = ast.body?.[0] ?? ast;
  const arg = firstCmd.args?.[0] ?? firstCmd;
  const ctx = { ...createContext(), ...contextOverrides } as any;
  return evaluateAST(arg, ctx);
}

describe('AST evaluator coverage (ported from expression-parser.ts)', () => {
  describe('arrayLiteral', () => {
    it('[1, 2, 3] → [1,2,3]', async () => {
      expect(await evalArg('return [1, 2, 3]')).toEqual([1, 2, 3]);
    });
    it('[] → []', async () => {
      expect(await evalArg('return []')).toEqual([]);
    });
    it('evaluates each element: [1+1, 2*2, 3-1]', async () => {
      expect(await evalArg('return [1+1, 2*2, 3-1]')).toEqual([2, 4, 2]);
    });
    it('mixed types: [1, "two", true]', async () => {
      expect(await evalArg('return [1, "two", true]')).toEqual([1, 'two', true]);
    });
  });

  describe('objectLiteral', () => {
    it('{a: 1, b: 2} → object', async () => {
      expect(await evalArg('return {a: 1, b: 2}')).toEqual({ a: 1, b: 2 });
    });
    it('{} → empty object', async () => {
      expect(await evalArg('return {}')).toEqual({});
    });
    it('string-key form: {"name": "alice"}', async () => {
      expect(await evalArg('return {"name": "alice"}')).toEqual({ name: 'alice' });
    });
    it('evaluates value expressions: {x: 1+1}', async () => {
      expect(await evalArg('return {x: 1+1}')).toEqual({ x: 2 });
    });
    it('nested array+object: [{n: 1}, {n: 2}]', async () => {
      expect(await evalArg('return [{n: 1}, {n: 2}]')).toEqual([{ n: 1 }, { n: 2 }]);
    });
  });

  describe('attributeAccess (@attr)', () => {
    it('reads attribute from context.me', async () => {
      const el = document.createElement('div');
      el.setAttribute('data-x', '42');
      const result = await evalArg('return @data-x', { me: el });
      expect(result).toBe('42');
    });
    it('returns null for missing attribute', async () => {
      const el = document.createElement('div');
      const result = await evalArg('return @nonexistent', { me: el });
      expect(result).toBeNull();
    });
    it('no element context → returns @-prefixed name', async () => {
      const result = await evalArg('return @foo');
      expect(result).toBe('@foo');
    });
  });

  describe('propertyOfExpression (the X of Y)', () => {
    it('reads property from plain object via "the X of Y"', async () => {
      const result = await evalArg('return the name of result', { result: { name: 'alice' } });
      expect(result).toBe('alice');
    });
    it('reads DOM element property via "the X of Y"', async () => {
      const el = document.createElement('input');
      el.value = 'typed';
      const result = await evalArg('return the value of result', { result: el });
      expect(result).toBe('typed');
    });
    it('throws on null target', async () => {
      await expect(evalArg('return the name of result', { result: null })).rejects.toThrow();
    });
  });

  describe('templateLiteral', () => {
    it('static template returns its literal text', async () => {
      expect(await evalArg('return `hello world`')).toBe('hello world');
    });
    it('interpolates ${expr} with arithmetic', async () => {
      expect(await evalArg('return `${1 + 1}`')).toBe('2');
    });
    it('interpolates $(expr) shell-style syntax', async () => {
      expect(await evalArg('return `$(2 * 3)`')).toBe('6');
    });
    it('interpolates $var from locals', async () => {
      const locals = new Map<string, unknown>([['name', 'world']]);
      expect(await evalArg('return `hello $name`', { locals })).toBe('hello world');
    });
    it('$N numeric literal passthrough', async () => {
      expect(await evalArg('return `count: $1`')).toBe('count: 1');
    });
    it('missing $var → empty string', async () => {
      expect(await evalArg('return `[$missing]`')).toBe('[]');
    });
    it('multiple ${...} interpolations', async () => {
      expect(await evalArg('return `${1+1} and ${2+2}`')).toBe('2 and 4');
    });
  });

  describe('does not contain / does not include', () => {
    it('"hello" does not contain "x" → true', async () => {
      expect(await evalArg('return "hello" does not contain "x"')).toBe(true);
    });
    it('"hello" does not contain "ell" → false', async () => {
      expect(await evalArg('return "hello" does not contain "ell"')).toBe(false);
    });
    it('"hello" does not include "x" → true', async () => {
      expect(await evalArg('return "hello" does not include "x"')).toBe(true);
    });
    it('array does not contain missing element → true', async () => {
      expect(await evalArg('return ("a,b,c" split by ",") does not contain "z"')).toBe(true);
    });
    it('array does not contain present element → false', async () => {
      expect(await evalArg('return ("a,b,c" split by ",") does not contain "a"')).toBe(false);
    });
  });
});
