/**
 * An `else if` chain shares one `end`, as upstream reads it.
 *
 * The parser counted the `if` after `else` as a nested block, so a chain
 * wanted an `end` per `if`: `if a … else if b … end then c` put `c` in the
 * else branch, where it ran only when `a` was false. And the renderer closed
 * each `if` with its own `end`, which on upstream closed the handler, or a
 * behavior, early (`Unexpected Token : end`).
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const SHAPES = {
  'a command after the chain': 'on click if $x log 1 else if $y log 2 end then log 9',
  'a final else': 'on click if $x log 1 else if $y log 2 else log 3 end then log 9',
  'three links': 'on click if $x log 1 else if $y log 2 else if $z log 3 end then log 9',
};

type Node = { kind?: string; action?: string; body?: Node[]; statements?: Node[] };

/** A handler's top-level statements, compound or not. */
function topLevel(node: unknown): Node[] {
  const body = (node as Node).body ?? [];
  return body.length === 1 && body[0].kind === 'compound' ? body[0].statements ?? [] : body;
}

describe('English', () => {
  it.each(Object.entries(SHAPES))('%s renders as written', (_, src) => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it.each(Object.entries(SHAPES))('%s: the command after the chain is outside it', (_, src) => {
    const statements = topLevel(parse(src, 'en'));
    expect(statements.map(s => s.kind === 'conditional' ? 'if' : s.action)).toEqual(['if', 'log']);
  });

  it('a second `end` after the chain is the handler’s', () => {
    const src = 'on click if $x log 1 else if $y log 2 end end';
    expect(render(parse(src, 'en')!, 'en')).toBe('on click if $x log 1 else if $y log 2 end');
  });
});

describe.each(Object.entries(SHAPES))('%s, through every language', (_, src) => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});

// A chain inside a loop. The body walker met the chain's `if`s mid-clause and
// wanted an `end` per `if`, so the loop's `end` closed nothing and the command
// after the loop was lost, in English and so in every translation.
describe('a chain inside a for loop keeps the command after the loop', () => {
  const src = 'on click for $i in .a if $x log 1 else if $y log 2 end end then log 9';

  it('en', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  // bn drops the command after a loop that holds any `if`, chain or not (filed).
  it.each(FOREIGN.filter(language => language !== 'bn'))('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});
