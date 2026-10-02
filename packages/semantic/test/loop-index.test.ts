/**
 * A loop's index variable.
 *
 * Nothing read upstream's `index i` (`repeat for x in xs index i`, `repeat 3
 * times index i`) or core's `with index` (which binds `index`), so both
 * dropped in English and so in every translation, and a translated body's
 * index was unbound. The loop node carries `indexVariable`, and renders write
 * `index <name>` after the loop head in every language. Core's `with index`
 * is read and written back as `index index`: the same binding, in the form
 * upstream and @hyperfixi/engine accept (2026-10-01; before that it rendered
 * as written).
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

type Walked = {
  kind: string;
  indexVariable?: string;
  body?: Walked[];
  statements?: Walked[];
};

function loops(node: Walked | null): Walked[] {
  if (!node) return [];
  const own = node.kind === 'loop' ? [node] : [];
  return [...own, ...[...(node.body ?? []), ...(node.statements ?? [])].flatMap(loops)];
}

const CASES = [
  'on load repeat for item in .item with index add .visible to item then wait 100ms end',
  'on click repeat for item in .item index idx add .x to item end',
  'on click for item in .item index idx add .x to item end',
  'on click repeat 3 times index idx log idx end',
  'on click repeat for item in <li/> in #list index idx append idx to item end',
  'on click repeat for item in .item with index log item end',
  // Another clause after it, or another loop: the phrase is the loop's before
  // it (qu writes `3 times ta repeat`, its particle between).
  'on click repeat 3 times index idx log idx end then log 1',
  'on click repeat 3 times index idx log idx end then repeat 2 times log 1 end',
  'on click repeat for item in .a log item end then repeat for entry in .b index idx log idx end',
  // An event loop's head ends with its source, and a verb-final language
  // writes the source's marker after it (ja `document から 繰り返し`).
  'on click repeat until event pointerup from document index idx log idx end',
];

/** Core's `with index` binds `index`; it is written back as upstream's `index index`. */
const written = (src: string): string => src.replace(' with index ', ' index index ');

describe('English', () => {
  it.each(CASES)('%s', src => {
    expect(render(parse(src, 'en')!, 'en')).toBe(written(src));
  });

  it('indexes the loop it follows, not a later one', () => {
    const node = parse(CASES[7], 'en');
    expect(loops(node as never).map(l => l.indexVariable)).toEqual(['idx', undefined]);
  });

  it('puts the variable on the loop', () => {
    const [named] = loops(parse('on click repeat 3 times index idx log idx end', 'en') as never);
    expect(named.indexVariable).toBe('idx');
    const [core] = loops(parse(CASES[0], 'en') as never);
    expect(core.indexVariable).toBe('index');
  });

  // A body's `index` is a variable: only the loop's own words may sit between
  // the head and the phrase.
  it.each([
    'on click repeat 3 times log index end',
    'on click repeat for item in .item log index then add .x to item end',
  ])('leaves a body’s `index` alone: %s', src => {
    const node = parse(src, 'en');
    expect(render(node!, 'en')).toBe(src);
    expect(loops(node as never).map(l => l.indexVariable)).toEqual([undefined]);
  });
});

describe.each(CASES)('%s, through every language', src => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(written(src));
  });
});

// Hand-written input may use a verb form the renderer does not write.
it('reads the index after a native loop verb (ja 繰り返す)', () => {
  const node = parse('クリック で 3 回 繰り返す index idx idx を 記録 終わり', 'ja');
  expect(loops(node as never).map(l => l.indexVariable)).toEqual(['idx']);
});

// Core's repeat reads the index from `modifiers.index`, on both spellings.
describe('buildAST hands core the index', () => {
  it.each([
    ['on click repeat 3 times index idx log idx end', 'idx'],
    [CASES[0], 'index'],
  ])('%s', (src, name) => {
    const code = render(parse(src, 'en')!, 'ja');
    const ast: {
      commands: { name?: string; modifiers?: { index?: { value?: string } } }[];
    } = JSON.parse(JSON.stringify(buildAST(parse(code, 'ja')!).ast));
    const repeat = ast.commands.find(c => c.name === 'repeat');
    expect(repeat?.modifiers?.index?.value, code).toBe(name);
  });
});
