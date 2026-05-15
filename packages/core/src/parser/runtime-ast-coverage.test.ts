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

import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from './parser';
import { evaluateAST, evaluateExpressionFromSource } from './runtime';
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
    // Phase γ.1: template-literal interpolation now uses the canonical
    // evaluator instead of the legacy `parseAndEvaluateExpression`.
    // Verify canonical semantics for the recursive `${expr}` path.
    it('${null.x} → "undefined" via canonical silent-null', async () => {
      const locals = new Map<string, unknown>([['nullVar', null]]);
      expect(await evalArg('return `[${nullVar.x}]`', { locals })).toBe('[undefined]');
    });
    it('${arr.join("-")} works on locals array', async () => {
      const locals = new Map<string, unknown>([['arr', [1, 2, 3]]]);
      expect(await evalArg('return `${arr.join("-")}`', { locals })).toBe('1-2-3');
    });
  });

  describe('optional chaining (?.)', () => {
    it('result?.x with present property → value', async () => {
      expect(await evalArg('return result?.x', { result: { x: 5 } })).toBe(5);
    });
    it('result?.x with null result → undefined', async () => {
      expect(await evalArg('return result?.x', { result: null })).toBeUndefined();
    });
    it('result?.x with undefined result → undefined', async () => {
      expect(await evalArg('return result?.x', { result: undefined })).toBeUndefined();
    });
    it('result?.missing with no such property → undefined', async () => {
      expect(await evalArg('return result?.missing', { result: { x: 5 } })).toBeUndefined();
    });
    it('chained result?.a.b on null root → undefined', async () => {
      // The `?.` short-circuits at the first null and never evaluates `.b`
      expect(await evalArg('return result?.a', { result: null })).toBeUndefined();
    });
    it('result?.x equivalent to result.x when result is present', async () => {
      const obj = { x: 'hello' };
      const optional = await evalArg('return result?.x', { result: obj });
      const dotted = await evalArg('return result.x', { result: obj });
      expect(optional).toBe(dotted);
    });
  });

  describe('unary expressions: exists / is empty / no / does not exist', () => {
    it('5 exists → true', async () => {
      expect(await evalArg('return 5 exists')).toBe(true);
    });
    it('"" exists → true (empty string is not null)', async () => {
      expect(await evalArg('return "" exists')).toBe(true);
    });
    it('null exists → false', async () => {
      expect(await evalArg('return result exists', { result: null })).toBe(false);
    });
    it('undefined exists → false', async () => {
      expect(await evalArg('return result exists', { result: undefined })).toBe(false);
    });
    it('null does not exist → true', async () => {
      expect(await evalArg('return result does not exist', { result: null })).toBe(true);
    });
    it('5 does not exist → false', async () => {
      expect(await evalArg('return 5 does not exist')).toBe(false);
    });
    it('"" is empty → true', async () => {
      expect(await evalArg('return "" is empty')).toBe(true);
    });
    it('"hello" is empty → false', async () => {
      expect(await evalArg('return "hello" is empty')).toBe(false);
    });
    it('split empty result → is empty true', async () => {
      // Empty array via split
      expect(await evalArg('return ("" split by ",") is not empty')).toBe(true);
    });
    it('"hello" is not empty → true', async () => {
      expect(await evalArg('return "hello" is not empty')).toBe(true);
    });
    it('no result with truthy value → false', async () => {
      expect(await evalArg('return no result', { result: 'something' })).toBe(false);
    });
    it('no result with null → true', async () => {
      expect(await evalArg('return no result', { result: null })).toBe(true);
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

describe('evaluateExpressionFromSource (canonical string→eval helper)', () => {
  const ctx = (locals: Record<string, unknown> = {}) => {
    const c = createContext();
    for (const [k, v] of Object.entries(locals)) c.locals.set(k, v);
    return c;
  };

  it('evaluates arithmetic expressions', async () => {
    expect(await evaluateExpressionFromSource('1 + 2', ctx())).toBe(3);
    expect(await evaluateExpressionFromSource('2 * 3 + 4', ctx())).toBe(10);
    expect(await evaluateExpressionFromSource('10 / 4', ctx())).toBe(2.5);
  });

  it('evaluates boolean expressions', async () => {
    expect(await evaluateExpressionFromSource('true and false', ctx())).toBe(false);
    expect(await evaluateExpressionFromSource('true or false', ctx())).toBe(true);
    expect(await evaluateExpressionFromSource('5 > 3', ctx())).toBe(true);
  });

  it('evaluates literals', async () => {
    expect(await evaluateExpressionFromSource('"hello"', ctx())).toBe('hello');
    expect(await evaluateExpressionFromSource('42', ctx())).toBe(42);
    expect(await evaluateExpressionFromSource('null', ctx())).toBeNull();
  });

  it('evaluates context locals', async () => {
    expect(await evaluateExpressionFromSource('localA', ctx({ localA: 'bar' }))).toBe('bar');
  });

  it('canonical null-access is silent (returns undefined, does NOT throw)', async () => {
    expect(await evaluateExpressionFromSource('nullVar.x', ctx({ nullVar: null }))).toBeUndefined();
    expect(
      await evaluateExpressionFromSource('undefVar.x', ctx({ undefVar: undefined }))
    ).toBeUndefined();
  });

  it('handles optional chaining (?.)', async () => {
    expect(
      await evaluateExpressionFromSource('nullOptVar?.x', ctx({ nullOptVar: null }))
    ).toBeUndefined();
    expect(await evaluateExpressionFromSource('objOptVar?.x', ctx({ objOptVar: { x: 7 } }))).toBe(
      7
    );
  });

  it('throws on unparseable input', async () => {
    await expect(evaluateExpressionFromSource('@@@', ctx())).rejects.toThrow(
      /Failed to parse expression/
    );
  });

  // Q1.5 — Selector unwrap semantics.
  // Upstream `_hyperscript` returns an iterable collection for class/query
  // selectors and a single element for ID selectors. Canonical now matches.
  describe('selector shape (Q1.5)', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('#id returns a single element', async () => {
      const el = document.createElement('div');
      el.id = 'd1';
      document.body.appendChild(el);

      const result = await evaluateExpressionFromSource('#d1', ctx());
      expect(result).toBe(el);
    });

    it('#id returns null when not present', async () => {
      const result = await evaluateExpressionFromSource('#missing', ctx());
      expect(result).toBeNull();
    });

    it('.class returns an iterable collection', async () => {
      const a = document.createElement('div');
      a.className = 'c1';
      const b = document.createElement('div');
      b.className = 'c1';
      document.body.append(a, b);

      const result = await evaluateExpressionFromSource('.c1', ctx());
      const arr = Array.from(result as ArrayLike<unknown>);
      expect(arr).toHaveLength(2);
      expect(arr[0]).toBe(a);
      expect(arr[1]).toBe(b);
    });

    it('.class returns an empty iterable when no matches', async () => {
      const result = await evaluateExpressionFromSource('.nonexistent', ctx());
      const arr = Array.from(result as ArrayLike<unknown>);
      expect(arr).toHaveLength(0);
    });
  });

  // Q1.6 — Reference gating for me/you and possessive aliases.
  // Upstream returns context.me/.you as-is (no instanceof gate) and aliases
  // `my`/`I` → me, `your`/`yourself` → you, `its` → it.
  describe('reference gating (Q1.6)', () => {
    it('me returns context.me as-is (plain object)', async () => {
      const c = createContext();
      const mock = { className: 'hello' };
      (c as any).me = mock;
      const result = await evaluateExpressionFromSource('me.className', c);
      expect(result).toBe('hello');
    });

    it('my aliases me in dot syntax', async () => {
      const c = createContext();
      (c as any).me = { textContent: 'world' };
      const result = await evaluateExpressionFromSource('my.textContent', c);
      expect(result).toBe('world');
    });

    it('its aliases it in dot syntax', async () => {
      const c = createContext();
      (c as any).it = { value: 42 };
      const result = await evaluateExpressionFromSource('its.value', c);
      expect(result).toBe(42);
    });

    it('your aliases you in dot syntax', async () => {
      const c = createContext();
      (c as any).you = { name: 'alice' };
      const result = await evaluateExpressionFromSource('your.name', c);
      expect(result).toBe('alice');
    });

    it('me returns null when context.me is unset', async () => {
      const result = await evaluateExpressionFromSource('me', ctx());
      expect(result).toBeNull();
    });
  });
});
