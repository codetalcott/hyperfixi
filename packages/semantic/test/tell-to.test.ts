/**
 * `tell <target> to <command>` and a bare `show` / `hide`, written as written.
 *
 * `on click tell #modal to show` rendered `on click tell #modal` in English and
 * so in every translation: show's and hide's target was required, so a bare
 * one matched no pattern and dropped, and no pattern read the `to`, core's
 * form (upstream rejects it). A bare show/hide now takes the implicit `me` and
 * renders bare (inside a tell, upstream reads a written `me` as the handler's
 * element, not the told one), and the `to` is a flag on the tell.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

type Walked = {
  kind: string;
  action?: string;
  tellTo?: boolean;
  body?: Walked[];
  statements?: Walked[];
};

function tells(node: Walked | null): Walked[] {
  if (!node) return [];
  const own = node.kind === 'command' && node.action === 'tell' ? [node] : [];
  return [...own, ...[...(node.body ?? []), ...(node.statements ?? [])].flatMap(tells)];
}

// [source, its English render]. A tell's block is closed by an `end` the
// source may leave to the end of input.
const CASES: [string, string][] = [
  ['on click tell #modal to show', 'on click tell #modal to show end'],
  ['on click tell #panel to hide', 'on click tell #panel to hide end'],
  ['on click tell #modal to add .x then log 1', 'on click tell #modal to add .x then log 1 end'],
  ['on click tell <p/> in me to add .highlight', 'on click tell <p/> in me to add .highlight end'],
  ['on click tell closest .card to hide', 'on click tell closest .card to hide end'],
  // A `to` after the body is the body command's own.
  ['on click tell #modal add .x to #y', 'on click tell #modal add .x to #y end'],
  ['on click tell #modal to add .x to #y', 'on click tell #modal to add .x to #y end'],
  ['on click tell #modal show', 'on click tell #modal show end'],
  ['on click show', 'on click show'],
  ['on click hide then log 1', 'on click hide then log 1'],
  ['on click add .animate then settle then remove .animate', 'on click add .animate then settle then remove .animate'],
  // The implicit target is written out when another role follows it: a verb
  // right before its marker reads as verb + object in the fused handler
  // patterns (hi/ms/th/tl/vi).
  ['on click show with *opacity', 'on click show me with *opacity'],
  ['on click show #modal with *opacity', 'on click show #modal with *opacity'],
  ['on click hide me with *opacity', 'on click hide me with *opacity'],
];

describe('English', () => {
  it.each(CASES)('%s', (src, expected) => {
    expect(render(parse(src, 'en')!, 'en')).toBe(expected);
  });

  it('flags the tell a `to` follows, and only that one', () => {
    expect(tells(parse('on click tell #modal to show', 'en') as never).map(t => t.tellTo)).toEqual([
      true,
    ]);
    expect(
      tells(parse('on click tell #modal add .x to #y', 'en') as never).map(t => t.tellTo)
    ).toEqual([undefined]);
  });

  // Excising a `set`'s `to` drops the set from the re-parse, which a check on
  // the re-parse alone cannot see: the `to` must follow the tell's own words.
  it('does not take a later command’s `to` for the tell’s', () => {
    const node = parse('on click tell #modal set my.textContent to "hi"', 'en');
    expect(tells(node as never).map(t => t.tellTo)).toEqual([undefined]);
    expect(render(node!, 'en')).toBe('on click tell #modal set my textContent to "hi" end');
  });
});

describe.each(CASES)('%s, through every language', (src, expected) => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(expected);
  });
});

// Core's tell takes its body as its own args and throws without one; semantic
// keeps the body as the statements after the flat tell.
describe('buildAST gives a tell its body', () => {
  it.each(['en', 'es', 'ja', 'ar'])('%s', language => {
    const src = 'on click tell #panel add .open then add .visible';
    const code = render(parse(src, 'en')!, language);
    const ast: {
      commands: { type: string; name?: string; args?: { type: string; name?: string }[] }[];
    } = JSON.parse(JSON.stringify(buildAST(parse(code, language)!).ast));
    const [tell] = ast.commands;
    expect(tell.name, code).toBe('tell');
    expect(tell.args!.map(a => a.name ?? a.type)).toEqual(['selector', 'add', 'add']);
  });
});
