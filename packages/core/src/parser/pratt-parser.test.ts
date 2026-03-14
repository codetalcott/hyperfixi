/**
 * Unit tests for the Pratt parser module.
 *
 * Tests the core Pratt loop, binding power fragments, and composable table merging.
 * Uses synthetic tokens rather than the full tokenizer — isolates Pratt logic.
 */
import { describe, it, expect } from 'vitest';
import type { Token } from '../types/core';
import type { ASTNode } from '../types/base-types';
import {
  createPrattParser,
  mergeFragments,
  leftAssoc,
  rightAssoc,
  prefix,
  CORE_FRAGMENT,
  POSITIONAL_FRAGMENT,
  PROPERTY_FRAGMENT,
  FULL_TABLE,
  STOP_TOKENS,
  STOP_DELIMITERS,
  type BindingPowerFragment,
  type BindingPowerEntry,
  type PrattContext,
} from './pratt-parser';

// =============================================================================
// Helpers
// =============================================================================

/** Create a minimal token for testing. */
function tok(value: string, start = 0): Token {
  return {
    value,
    kind: 'identifier' as any,
    start,
    end: start + value.length,
    line: 1,
    column: start,
  };
}

/** Create a sequence of tokens from space-separated values. */
function tokens(src: string): Token[] {
  let pos = 0;
  return src
    .split(/\s+/)
    .filter(Boolean)
    .map(v => {
      const t = tok(v, pos);
      pos += v.length + 1;
      return t;
    });
}

/** Simple primary handler: turns any token into an identifier or literal node. */
function primaryHandler(token: Token, ctx: PrattContext): ASTNode {
  ctx.advance(); // consume the token
  const num = parseFloat(token.value);
  if (!isNaN(num)) {
    return { type: 'literal', value: num, start: token.start, end: token.end } as ASTNode;
  }
  return { type: 'identifier', name: token.value, start: token.start, end: token.end } as ASTNode;
}

// =============================================================================
// Stop Tokens
// =============================================================================

describe('Stop tokens', () => {
  it('includes expected keywords', () => {
    for (const word of ['then', 'end', 'to', 'into', 'on', 'with', 'from', 'in']) {
      expect(STOP_TOKENS.has(word)).toBe(true);
    }
  });

  it('includes expected delimiters', () => {
    for (const ch of [')', ']', '}', ',']) {
      expect(STOP_DELIMITERS.has(ch)).toBe(true);
    }
  });
});

// =============================================================================
// Fragment Merging
// =============================================================================

describe('mergeFragments', () => {
  it('merges non-overlapping fragments', () => {
    const a: BindingPowerFragment = new Map([['or', leftAssoc(10) as BindingPowerEntry]]);
    const b: BindingPowerFragment = new Map([['and', leftAssoc(20) as BindingPowerEntry]]);
    const merged = mergeFragments(a, b);
    expect(merged.size).toBe(2);
    expect(merged.has('or')).toBe(true);
    expect(merged.has('and')).toBe(true);
  });

  it('later fragments override infix for same key', () => {
    const a: BindingPowerFragment = new Map([['+', leftAssoc(10) as BindingPowerEntry]]);
    const b: BindingPowerFragment = new Map([['+', leftAssoc(40) as BindingPowerEntry]]);
    const merged = mergeFragments(a, b);
    expect(merged.get('+')?.infix?.bp[0]).toBe(40);
  });

  it('preserves prefix when later fragment adds infix', () => {
    const a: BindingPowerFragment = new Map([['-', prefix(80) as BindingPowerEntry]]);
    const b: BindingPowerFragment = new Map([['-', leftAssoc(40) as BindingPowerEntry]]);
    const merged = mergeFragments(a, b);
    expect(merged.get('-')?.prefix).toBeDefined();
    expect(merged.get('-')?.infix).toBeDefined();
  });

  it('preserves infix when later fragment adds prefix', () => {
    const a: BindingPowerFragment = new Map([['-', leftAssoc(40) as BindingPowerEntry]]);
    const b: BindingPowerFragment = new Map([['-', prefix(80) as BindingPowerEntry]]);
    const merged = mergeFragments(a, b);
    expect(merged.get('-')?.prefix).toBeDefined();
    expect(merged.get('-')?.infix).toBeDefined();
  });
});

// =============================================================================
// Fragment Builders
// =============================================================================

describe('Fragment builders', () => {
  it('leftAssoc creates correct binding powers', () => {
    const entry = leftAssoc(30);
    expect(entry.infix?.bp).toEqual([30, 31]);
  });

  it('rightAssoc creates correct binding powers', () => {
    const entry = rightAssoc(60);
    expect(entry.infix?.bp).toEqual([61, 60]);
  });

  it('prefix creates correct binding power', () => {
    const entry = prefix(80);
    expect(entry.prefix?.bp).toBe(80);
  });
});

// =============================================================================
// Core Fragments
// =============================================================================

describe('CORE_FRAGMENT', () => {
  it('has logical operators at tier 1-2', () => {
    expect(CORE_FRAGMENT.get('or')?.infix?.bp[0]).toBe(10);
    expect(CORE_FRAGMENT.get('||')?.infix?.bp[0]).toBe(10);
    expect(CORE_FRAGMENT.get('and')?.infix?.bp[0]).toBe(20);
    expect(CORE_FRAGMENT.get('&&')?.infix?.bp[0]).toBe(20);
  });

  it('has comparison operators at tier 3', () => {
    for (const op of ['==', '!=', '<', '>', '<=', '>=', 'is', 'matches', 'contains']) {
      expect(CORE_FRAGMENT.get(op)?.infix?.bp[0]).toBe(30);
    }
  });

  it('has +/- as both infix (tier 4) and prefix (tier 8)', () => {
    const plus = CORE_FRAGMENT.get('+');
    expect(plus?.infix?.bp[0]).toBe(40);
    expect(plus?.prefix?.bp).toBe(80);

    const minus = CORE_FRAGMENT.get('-');
    expect(minus?.infix?.bp[0]).toBe(40);
    expect(minus?.prefix?.bp).toBe(80);
  });

  it('has multiplication operators at tier 5', () => {
    for (const op of ['*', '/', '%', 'mod']) {
      expect(CORE_FRAGMENT.get(op)?.infix?.bp[0]).toBe(50);
    }
  });

  it('has exponentiation at tier 6 (right-associative)', () => {
    const caret = CORE_FRAGMENT.get('^');
    expect(caret?.infix?.bp).toEqual([61, 60]); // right-assoc
  });

  it('has unary prefix operators at tier 8', () => {
    for (const op of ['not', '!', 'no']) {
      expect(CORE_FRAGMENT.get(op)?.prefix?.bp).toBe(80);
    }
  });
});

describe('POSITIONAL_FRAGMENT', () => {
  it('has first/last at tier 9', () => {
    expect(POSITIONAL_FRAGMENT.get('first')?.prefix?.bp).toBe(85);
    expect(POSITIONAL_FRAGMENT.get('last')?.prefix?.bp).toBe(85);
  });
});

describe('PROPERTY_FRAGMENT', () => {
  it('has . and ?. at tier 10', () => {
    expect(PROPERTY_FRAGMENT.get('.')?.infix?.bp[0]).toBe(90);
    expect(PROPERTY_FRAGMENT.get('?.')?.infix?.bp[0]).toBe(90);
  });

  it("has 's at tier 10 (highest)", () => {
    expect(PROPERTY_FRAGMENT.get("'s")?.infix?.bp[0]).toBe(95);
  });
});

describe('FULL_TABLE', () => {
  it('contains all operators from all fragments', () => {
    expect(FULL_TABLE.has('or')).toBe(true);
    expect(FULL_TABLE.has('first')).toBe(true);
    expect(FULL_TABLE.has('.')).toBe(true);
    expect(FULL_TABLE.has("'s")).toBe(true);
  });
});

// =============================================================================
// Core Pratt Loop
// =============================================================================

describe('createPrattParser', () => {
  // Simple table: just arithmetic
  const arithmeticTable: BindingPowerFragment = new Map([
    ['+', leftAssoc(40) as BindingPowerEntry],
    ['-', leftAssoc(40) as BindingPowerEntry],
    ['*', leftAssoc(50) as BindingPowerEntry],
  ]);

  const parse = createPrattParser(arithmeticTable, primaryHandler);

  it('parses a single number', () => {
    const toks = tokens('42');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('literal');
    expect((result as any).value).toBe(42);
  });

  it('parses a single identifier', () => {
    const toks = tokens('x');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('identifier');
    expect((result as any).name).toBe('x');
  });

  it('parses a + b', () => {
    const toks = tokens('1 + 2');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('binaryExpression');
    expect((result as any).operator).toBe('+');
    expect((result as any).left.value).toBe(1);
    expect((result as any).right.value).toBe(2);
  });

  it('respects precedence: 1 + 2 * 3 → 1 + (2 * 3)', () => {
    const toks = tokens('1 + 2 * 3');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('binaryExpression');
    expect((result as any).operator).toBe('+');
    expect((result as any).left.value).toBe(1);
    expect((result as any).right.type).toBe('binaryExpression');
    expect((result as any).right.operator).toBe('*');
    expect((result as any).right.left.value).toBe(2);
    expect((result as any).right.right.value).toBe(3);
  });

  it('left-associates: 1 - 2 - 3 → (1 - 2) - 3', () => {
    const toks = tokens('1 - 2 - 3');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('binaryExpression');
    expect((result as any).operator).toBe('-');
    expect((result as any).left.type).toBe('binaryExpression');
    expect((result as any).left.operator).toBe('-');
    expect((result as any).left.left.value).toBe(1);
    expect((result as any).left.right.value).toBe(2);
    expect((result as any).right.value).toBe(3);
  });

  it('stops at stop tokens', () => {
    const toks = tokens('1 + 2 then 3');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    // Should parse "1 + 2" and stop before "then"
    expect(result.type).toBe('binaryExpression');
    expect((result as any).right.value).toBe(2);
    expect(pos.value).toBe(3); // consumed 3 tokens: 1, +, 2
  });

  it('stops at delimiter tokens', () => {
    const toks = tokens('1 + 2 )');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('binaryExpression');
    expect(pos.value).toBe(3);
  });

  it('stops at unknown operators', () => {
    const toks = tokens('1 ? 2');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    // '?' is not in the table, so parse stops after '1'
    expect(result.type).toBe('literal');
    expect((result as any).value).toBe(1);
    expect(pos.value).toBe(1);
  });

  it('throws on empty token stream', () => {
    const toks: Token[] = [];
    const pos = { value: 0 };
    expect(() => parse(toks, pos)).toThrow('Unexpected end of expression');
  });
});

describe('Pratt parser with unary prefix', () => {
  const table: BindingPowerFragment = new Map([
    ['+', leftAssoc(40) as BindingPowerEntry],
    ['-', { ...(leftAssoc(40) as BindingPowerEntry), ...(prefix(80) as BindingPowerEntry) }],
    ['not', prefix(80) as BindingPowerEntry],
  ]);

  const parse = createPrattParser(table, primaryHandler);

  it('parses unary minus: -5', () => {
    const toks = tokens('- 5');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('unaryExpression');
    expect((result as any).operator).toBe('-');
    expect((result as any).operand.value).toBe(5);
  });

  it('parses not x', () => {
    const toks = tokens('not x');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('unaryExpression');
    expect((result as any).operator).toBe('not');
    expect((result as any).operand.name).toBe('x');
  });

  it('unary binds tighter than binary: -5 + 3 → (-5) + 3', () => {
    const toks = tokens('- 5 + 3');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('binaryExpression');
    expect((result as any).operator).toBe('+');
    expect((result as any).left.type).toBe('unaryExpression');
    expect((result as any).left.operator).toBe('-');
    expect((result as any).right.value).toBe(3);
  });
});

describe('Pratt parser with right-associative operators', () => {
  const table: BindingPowerFragment = new Map([
    ['+', leftAssoc(40) as BindingPowerEntry],
    ['^', rightAssoc(60) as BindingPowerEntry],
  ]);

  const parse = createPrattParser(table, primaryHandler);

  it('right-associates: 2 ^ 3 ^ 4 → 2 ^ (3 ^ 4)', () => {
    const toks = tokens('2 ^ 3 ^ 4');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('binaryExpression');
    expect((result as any).operator).toBe('^');
    expect((result as any).left.value).toBe(2);
    expect((result as any).right.type).toBe('binaryExpression');
    expect((result as any).right.operator).toBe('^');
    expect((result as any).right.left.value).toBe(3);
    expect((result as any).right.right.value).toBe(4);
  });

  it('^ binds tighter than +: 1 + 2 ^ 3 → 1 + (2 ^ 3)', () => {
    const toks = tokens('1 + 2 ^ 3');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('binaryExpression');
    expect((result as any).operator).toBe('+');
    expect((result as any).right.type).toBe('binaryExpression');
    expect((result as any).right.operator).toBe('^');
  });
});

describe('Pratt parser with property access', () => {
  const table = mergeFragments(
    new Map([['+', leftAssoc(40) as BindingPowerEntry]]),
    PROPERTY_FRAGMENT
  );

  const parse = createPrattParser(table, primaryHandler);

  it('parses x . y (property access)', () => {
    const toks = tokens('x . y');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('propertyAccess');
    expect((result as any).object.name).toBe('x');
    expect((result as any).property).toBe('y');
  });

  it('property access binds tighter than +: a . b + c → (a.b) + c', () => {
    const toks = tokens('a . b + c');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('binaryExpression');
    expect((result as any).operator).toBe('+');
    expect((result as any).left.type).toBe('propertyAccess');
    expect((result as any).right.name).toBe('c');
  });

  it("parses possessive: x 's y", () => {
    const toks = tokens("x 's y");
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('possessiveExpression');
    expect((result as any).object.name).toBe('x');
    expect((result as any).property).toBe('y');
  });
});

describe('Pratt parser with positional prefix', () => {
  const table = mergeFragments(CORE_FRAGMENT, POSITIONAL_FRAGMENT);
  const parse = createPrattParser(table, primaryHandler);

  it('parses first x', () => {
    const toks = tokens('first x');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('positionalExpression');
    expect((result as any).position).toBe('first');
    expect((result as any).operand.name).toBe('x');
  });

  it('parses last x', () => {
    const toks = tokens('last x');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('positionalExpression');
    expect((result as any).position).toBe('last');
  });
});

describe('Pratt parser with as (type conversion)', () => {
  const parse = createPrattParser(CORE_FRAGMENT, primaryHandler);

  it('parses x as Number', () => {
    const toks = tokens('x as Number');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('asExpression');
    expect((result as any).expression.name).toBe('x');
    expect((result as any).targetType.name).toBe('Number');
  });

  it('as binds tighter than comparison: x == y as Number → x == (y as Number)', () => {
    const toks = tokens('x == y as Number');
    const pos = { value: 0 };
    const result = parse(toks, pos);
    expect(result.type).toBe('binaryExpression');
    expect((result as any).operator).toBe('==');
    expect((result as any).right.type).toBe('asExpression');
  });
});

describe('Complex expressions with FULL_TABLE', () => {
  const parse = createPrattParser(FULL_TABLE, primaryHandler);

  it('parses full precedence chain: not a or b and c == d + e * f', () => {
    // Expected: (not a) or (b and (c == (d + (e * f))))
    const toks = tokens('not a or b and c == d + e * f');
    const pos = { value: 0 };
    const result = parse(toks, pos);

    // Top level: or
    expect(result.type).toBe('binaryExpression');
    expect((result as any).operator).toBe('or');

    // Left of or: not a
    expect((result as any).left.type).toBe('unaryExpression');
    expect((result as any).left.operator).toBe('not');

    // Right of or: and
    const andNode = (result as any).right;
    expect(andNode.type).toBe('binaryExpression');
    expect(andNode.operator).toBe('and');

    // Right of and: ==
    const eqNode = andNode.right;
    expect(eqNode.type).toBe('binaryExpression');
    expect(eqNode.operator).toBe('==');

    // Right of ==: +
    const addNode = eqNode.right;
    expect(addNode.type).toBe('binaryExpression');
    expect(addNode.operator).toBe('+');

    // Right of +: *
    const mulNode = addNode.right;
    expect(mulNode.type).toBe('binaryExpression');
    expect(mulNode.operator).toBe('*');
  });
});
