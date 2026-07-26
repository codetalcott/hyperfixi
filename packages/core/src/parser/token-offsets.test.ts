/**
 * Every token's `start`/`end` must be character offsets that round-trip:
 * `input.slice(t.start, t.end) === t.value`.
 *
 * `addToken()`'s no-explicit-start contract is `start = position - value.length`
 * and `end = position`, i.e. it assumes `position` has ALREADY advanced past the
 * token. `tokenizeIdentifier` and `tokenizeNumberOrTime` honour that; six
 * single-character branches did not — `{`, `}`, and all three `[` cases plus
 * `]` called `addToken()` BEFORE `advance()`, landing one character to the left.
 * Parens were never affected because `tokenizeOperator` passes an explicit start.
 *
 * This was not cosmetic. `parseCSSObjectLiteral` rebuilds a property value as
 * `originalInput.slice(valueStart, valueEnd)`, so any value ENDING in `}` lost
 * its final character:
 *
 *     add { left: ${x} } to me              ->  templateLiteral "${x"
 *     add { left: ${clientX - xoff} } to me ->  "${clientX - xoff"
 *
 * and `evaluateTemplateLiteralNode`'s /\$(?:\{([^}]+)\})/g never matches `${x`,
 * so it renders as literal text instead of interpolating. The sibling suite
 * css-object-literal-whitespace.test.ts missed it because every one of its cases
 * has a suffix after the brace (`${a - b}px`), which hides the off-by-one.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer';
import type { Token } from '../types/core';

/** Tokens whose slice does not reproduce their own value. */
const nonRoundTripping = (input: string): Token[] =>
  tokenize(input).filter(t => input.slice(t.start, t.end) !== t.value);

const spanOf = (input: string, value: string): [number, number] => {
  const tok = tokenize(input).find(t => t.value === value);
  if (!tok) throw new Error(`no token ${JSON.stringify(value)} in ${JSON.stringify(input)}`);
  return [tok.start, tok.end];
};

describe('token character offsets', () => {
  it('gives braces the span they actually occupy', () => {
    expect(spanOf('a{b}c', '{')).toEqual([1, 2]);
    expect(spanOf('a{b}c', '}')).toEqual([3, 4]);
  });

  it('gives brackets the span they actually occupy', () => {
    expect(spanOf('a[b]c', '[')).toEqual([1, 2]);
    expect(spanOf('a[b]c', ']')).toEqual([3, 4]);
  });

  it('covers the member-access bracket branch', () => {
    // prevToken is an IDENTIFIER, so this takes the isMemberAccess path.
    expect(spanOf('a.b[0]', '[')).toEqual([3, 4]);
    expect(spanOf('a.b[0]', ']')).toEqual([5, 6]);
  });

  it('covers the event-condition bracket branch', () => {
    // `on <domEvent>[` takes the isEventCondition path (TokenKind.SYMBOL).
    expect(spanOf('on click[x] log 1', '[')).toEqual([8, 9]);
    expect(spanOf('on click[x] log 1', ']')).toEqual([10, 11]);
  });

  it('covers the array-literal bracket branch', () => {
    // No preceding identifier, so this is the array-literal path.
    expect(spanOf('set x to [1,2]', '[')).toEqual([9, 10]);
    expect(spanOf('set x to [1,2]', ']')).toEqual([13, 14]);
  });

  it('leaves parens correct (they always were)', () => {
    expect(spanOf('a(b)c', '(')).toEqual([1, 2]);
    expect(spanOf('a(b)c', ')')).toEqual([3, 4]);
  });

  it.each([
    'a{b}c',
    'a[b]c',
    '{a:1}',
    '[1,2]',
    'a.b[0]',
    'on click[x] log 1',
    'add { left: ${x} } to me',
    'add { transform: translate(${x}px, ${y}px) } to me',
    'fetch /api/data with {method:"POST"}',
    'set $o to {a: [1, 2], b: (3 + 4)}',
  ])('round-trips every token in %j', src => {
    expect(nonRoundTripping(src)).toEqual([]);
  });
});
