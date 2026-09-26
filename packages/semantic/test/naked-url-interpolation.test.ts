/**
 * A naked `${…}` URL, written as written.
 *
 * `fetch /search?q=${my value}` is core's (a spaced `${…}` is core-only; an
 * unspaced one upstream sends literally), and core builds it as a template.
 * Every render quoted it, and a quoted string interpolates on neither engine,
 * so a translated search box requested `${my value}` literally. The URL's
 * literal carries `interpolates`, renders naked, and reaches core as a
 * `templateLiteral`. A naked URL without `${` keeps its quotes, as before.
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
  roles?: Map<string, { interpolates?: true }>;
  body?: Walked[];
  statements?: Walked[];
};

function fetchSource(node: Walked | null): { interpolates?: true } | undefined {
  if (!node) return undefined;
  if (node.action === 'fetch') return node.roles?.get('source');
  for (const child of [...(node.body ?? []), ...(node.statements ?? [])]) {
    const found = fetchSource(child);
    if (found) return found;
  }
  return undefined;
}

// [source, its English render]
const CASES: [string, string][] = [
  [
    'on input debounced at 300ms fetch /api/search?q=${my value} as json then put it into #results',
    'on input debounced at 300ms fetch /api/search?q=${my value} as json then put it into #results',
  ],
  ['on click fetch /api/${id}/more as json', 'on click fetch /api/${id}/more as json'],
  // Nothing to interpolate: quoted, as before (the two are one on both engines).
  ['on click fetch /api/items then put it into #x', 'on click fetch "/api/items" then put it into #x'],
  // Written quoted or as a template: kept so.
  ['on click fetch "/api/${id}" as json', 'on click fetch "/api/${id}" as json'],
  ['on click fetch `/api/${id}` as json', 'on click fetch `/api/${id}` as json'],
];

describe('English', () => {
  it.each(CASES)('%s', (src, expected) => {
    expect(render(parse(src, 'en')!, 'en')).toBe(expected);
  });

  it('marks only a naked URL with a `${…}` span', () => {
    const marked = CASES.map(([src]) => fetchSource(parse(src, 'en') as never)?.interpolates);
    expect(marked).toEqual([true, true, undefined, undefined, undefined]);
  });
});

describe.each(CASES)('%s, through every language', (src, expected) => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(expected);
  });
});

// Core's parser builds a naked `${…}` URL as a template, and a quoted one as a
// string literal; buildAST hands core the same.
describe('buildAST', () => {
  it.each([
    ['on click fetch /api/${id} as json', 'templateLiteral'],
    ['on click fetch "/api/${id}" as json', 'literal'],
  ])('%s', (src, type) => {
    const code = render(parse(src, 'en')!, 'es');
    const ast: { args?: { type: string; value?: string }[] } = JSON.parse(
      JSON.stringify(buildAST(parse(code, 'es')!).ast)
    ).commands[0];
    expect(ast.args?.[0], code).toMatchObject({ type, value: '/api/${id}' });
  });
});
