/**
 * The semantic parser's fallbacks read a lone token as the role capture does
 * (PR 113, `parser/token-value.ts`). The SOV verb-anchoring paths had a
 * classifier of their own: a bare identifier was a string literal there, where
 * a role capture reads a variable, so bn `d কে অপেক্ষা` (wait d) waited for the
 * string "d"; and a number or a duration carried no data type.
 *
 * A run of several tokens, too (PR 115): joined as text it was a string
 * literal, where the role capture reads a run the expression parser reads whole
 * as an expression, so the direct path waited for the text `d + 1`.
 */
import { describe, it, expect } from 'vitest';
import { buildAST, parse, tokenize } from '../src/index';
import { tokenValue } from '../src/parser/token-value';

interface Node {
  action?: string;
  roles?: Map<string, { type: string; value?: unknown; raw?: unknown; dataType?: string }>;
}

/** Every command node's role `role`, in document order. */
function rolesNamed(node: unknown, action: string, role: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const walk = (x: unknown): void => {
    if (!x || typeof x !== 'object') return;
    const n = x as Node;
    if (n.action === action && n.roles instanceof Map && n.roles.has(role)) {
      out.push({ ...n.roles.get(role) });
    }
    for (const v of Object.values(x)) if (v && typeof v === 'object') walk(v);
  };
  walk(node);
  return out;
}

describe('the fallback reads a lone identifier as a variable', () => {
  it('bn `d কে অপেক্ষা` (wait d) waits for the variable', () => {
    const node = parse('লোড এ পুনরাবৃত্তি চিরকাল .pulse কে টগল তারপর d কে অপেক্ষা শেষ', 'bn');
    expect(rolesNamed(node, 'wait', 'duration')).toEqual([{ type: 'expression', raw: 'd' }]);
  });
});

describe('the fallback reads a run the expression parser reads whole as an expression', () => {
  it.each([
    ['ক্লিক তে d + 1 কে অপেক্ষা', 'd + 1'],
    ['ক্লিক তে n * 100 কে অপেক্ষা', 'n * 100'],
    ["ক্লিক তে x's length কে অপেক্ষা", "x's length"],
    ['লোড এ পুনরাবৃত্তি চিরকাল .pulse কে টগল তারপর d + 1 কে অপেক্ষা শেষ', 'd + 1'],
  ])('bn %s', (code, raw) => {
    expect(rolesNamed(parse(code, 'bn'), 'wait', 'duration')).toEqual([
      { type: 'expression', raw },
    ]);
  });

  it('and the direct path waits for the sum, not the text', () => {
    const { ast } = buildAST(parse('ক্লিক তে d + 1 কে অপেক্ষা', 'bn')!);
    expect(JSON.stringify(ast)).toContain('"type":"binaryExpression"');
    expect(JSON.stringify(ast)).not.toContain('"value":"d + 1"');
  });

  it('a run it does not read whole keeps its text', () => {
    expect(rolesNamed(parse('ক্লিক তে d e কে অপেক্ষা', 'bn'), 'wait', 'duration')).toEqual([
      { type: 'literal', value: 'd e' },
    ]);
  });
});

describe('the fallback types a literal as the role capture does', () => {
  it('bn `2s কে অপেক্ষা` is a duration', () => {
    const node = parse('লোড এ পুনরাবৃত্তি চিরকাল .pulse কে টগল তারপর 1s কে অপেক্ষা শেষ', 'bn');
    expect(rolesNamed(node, 'wait', 'duration')).toEqual([
      { type: 'literal', value: '1s', dataType: 'duration' },
    ]);
  });
});

describe('tokenValue', () => {
  const first = (code: string, language: string) => tokenize(code, language).tokens[0]!;

  it.each([
    ['#out', 'en', { type: 'selector', value: '#out' }],
    ['x', 'en', { type: 'expression', raw: 'x' }],
    ['"a"', 'en', { type: 'literal', value: 'a', dataType: 'string' }],
    ['2s', 'en', { type: 'literal', value: '2s', dataType: 'duration' }],
    ['3', 'en', { type: 'literal', value: 3, dataType: 'number' }],
  ])('%s (%s)', (code, language, expected) => {
    expect(tokenValue(first(code, language))).toMatchObject(expected);
  });

  it('a particle is no value', () => {
    expect(tokenValue(first('を', 'ja'))).toBeNull();
  });
});
