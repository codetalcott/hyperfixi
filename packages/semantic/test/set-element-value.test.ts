/**
 * `set x to <an element or an array>`, in every language.
 *
 * set's value took a literal, an expression or a reference, and the tokenizers
 * read an element (`#panel`, `.item`, `<li/>`) and an array (`[1, 2]`) as one
 * selector token. So `set el to #panel` matched no pattern and the whole `set`
 * was lost, in English and so in every translation. The handcrafted de/fr/id/
 * ms/pt set patterns had copied the narrow list. it/pl/ru/uk render the value
 * unmarked after the variable, and the matcher read the spaced `:x .item` as
 * the property `:x.item`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// Each renders as written in English.
const CASES: string[] = [
  'on click set x to #d1 then log x',
  'on click set x to .item then log x',
  'on click set x to <li/> then log x',
  'on click set x to <li/> in #list then log x',
  'on click set x to [1, 2] then log x',
  'on click set x to ["a", "b"] then log x',
  'on click set x to [] then log x',
  'on click set x to [#d1, #d2] then log x',
  'on click set x to *opacity then log x',
  'on click set $x to #d1 then log $x',
  'on click set :x to .item then log :x',
  // The values it always took.
  'on click set x to 1 then log x',
  'on click set x to it then log x',
  // An array anywhere. qu writes the value right after the event, and read a
  // spaced `[1, 2]` there as the event's filter.
  'on click put [1, 2] into x then log x',
  'on click log [1, 2]',
  'on click repeat for x in [1, 2] log x end',
];

describe.each(CASES)('%s, through every language', src => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});

// The variable stays a reference where the value follows it unmarked
// (it/pl/ru/uk): the spaced `.item` is a class, not the property `:x.item`.
describe('`set :x to .item` keeps its role types in every language', () => {
  const src = 'on click set :x to .item then log :x';
  type Node = { kind?: string; action?: string; roles?: Map<string, { type: string }> };
  const firstSet = (node: unknown): Node | undefined => {
    const n = node as Node & { body?: unknown[]; statements?: unknown[] };
    if (n.kind === 'command' && n.action === 'set') return n;
    for (const child of [...(n.body ?? []), ...(n.statements ?? [])]) {
      const found = firstSet(child);
      if (found) return found;
    }
    return undefined;
  };
  const types = (node: unknown): string[] =>
    [...(firstSet(node)?.roles ?? new Map()).entries()].map(([role, v]) => `${role}:${v.type}`);

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(types(parse(foreign, language)), foreign).toEqual(types(parse(src, 'en')));
  });
});
