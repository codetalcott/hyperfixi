/**
 * A `go`/`scroll` position (`go to the top of #d1`) and `smoothly`/`instantly`,
 * in every language.
 *
 * No go or scroll pattern read either. The position word took the
 * destination's slot and the element was dropped, so `go to top of #d1`
 * rendered `go top` and `scroll to top of #d1` rendered `scroll to top`,
 * which throws on core. The adverb was dropped. Both engines run every form
 * here. The phrase and the adverb are English in every language, as `do not
 * throw` is.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// Source → its English render. English renders go's destination without `to`,
// as it always has; `go top of #d1` runs on both engines.
const CASES: Array<[string, string]> = [
  ['on click go to top of #d1', 'on click go top of #d1'],
  ['on click go to the bottom of #d1 smoothly', 'on click go the bottom of #d1 smoothly'],
  ['on click go to right of me', 'on click go right of me'],
  // Two position words: upstream reads both; core, the first.
  ['on click go to top left of #d1', 'on click go top left of #d1'],
  ['on click go to top of #d1 then add .z to me', 'on click go top of #d1 then add .z to me'],
  ['on click scroll to top of #d1', 'on click scroll to top of #d1'],
  ['on click scroll to the bottom of #d1', 'on click scroll to the bottom of #d1'],
  ['on click scroll to middle of body', 'on click scroll to middle of body'],
  ['on click scroll to #d1 smoothly', 'on click scroll to #d1 smoothly'],
  ['on click scroll to #d1 instantly', 'on click scroll to #d1 instantly'],
  ['on click scroll to top of #d1 smoothly', 'on click scroll to top of #d1 smoothly'],
  [
    'on click add .z to me then scroll to bottom of #d1 smoothly',
    'on click add .z to me then scroll to bottom of #d1 smoothly',
  ],
  ['scroll to top of #d1', 'scroll to top of #d1'],
  // The corpus row, unchanged.
  ['on click scroll to last <.message/> in #chat', 'on click scroll to last <.message/> in #chat'],
];

describe.each(CASES)('%s, through every language', (src, english) => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(english);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });
});

function commands(node: SemanticNode | null): CommandSemanticNode[] {
  if (!node) return [];
  const found = node.kind === 'command' ? [node as CommandSemanticNode] : [];
  const children = node as { body?: SemanticNode[]; statements?: SemanticNode[] };
  for (const child of [...(children.body ?? []), ...(children.statements ?? [])]) {
    found.push(...commands(child));
  }
  return found;
}

// A position belongs to the go whose destination follows it, so a `the top of`
// read by a LATER command never lands on an earlier go.
it('`go to #a then log the top of #d1` gives the go no position', () => {
  const go = commands(parse('on click go to #a then log the top of #d1', 'en')).find(
    c => c.action === 'go'
  );
  expect(go?.scrollPosition).toBeUndefined();
});
