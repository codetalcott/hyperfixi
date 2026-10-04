/**
 * `fetch … do not throw` keeps its phrase.
 *
 * No fetch pattern read the phrase, so it dropped, in English and so in every
 * translation: a translated fetch then threw on a 404 its author told it to
 * tolerate. And other languages' patterns read its words: pl's `do` is its own
 * "to" (a destination `not`), and ja took `do` for a response type. The phrase
 * is excised before any pattern sees it and flagged on the fetch it followed,
 * found by position (he `הבא` and id `muat` do not normalize to `fetch`).
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// [source, its English render]. Upstream reads a quoted URL followed by `do
// not …` as a comparison, so English writes the response type (`as text`, the
// default) before the phrase when the source had none (upstream-spelling.ts).
const SHAPES: [string, string][] = [
  [
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
  ],
  [
    'on click fetch "/api/users" do not throw then log it',
    'on click fetch "/api/users" as text do not throw then log it',
  ],
  // Bare, outside a handler.
  ['fetch "/api/users" do not throw', 'fetch "/api/users" as text do not throw'],
  // The flag goes to the fetch the phrase followed, not the first.
  [
    'on click fetch "/a" then fetch "/b" do not throw then log it',
    'on click fetch "/a" then fetch "/b" as text do not throw then log it',
  ],
];

describe('English keeps the phrase', () => {
  it.each(SHAPES)('%s', (src, english) => {
    expect(render(parse(src, 'en')!, 'en')).toBe(english);
  });
});

describe.each(SHAPES)('%s, through every language', (src, english) => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });
});

it('buildAST writes core’s `doNotThrow` modifier', () => {
  const { ast } = buildAST(parse('fetch "/api/users" do not throw', 'en')!);
  expect((ast as { modifiers?: Record<string, unknown> }).modifiers?.doNotThrow).toEqual({
    type: 'literal',
    value: true,
  });
});
