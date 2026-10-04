/**
 * English writes upstream's spelling for forms only core ran
 * (src/explicit/upstream-spelling.ts). Each row: the core-only source, and
 * the English render — the form upstream _hyperscript and @hyperfixi/engine
 * read, measured to leave the same DOM as core's original (Phase C2c).
 * The reader keeps accepting the source; foreign renders keep their words.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';
import { rewriteExpression } from '../src/explicit/upstream-spelling';

const ROWS: [string, string][] = [
  ['on click set @aria-selected to "true" on #t1', 'on click set @aria-selected of #t1 to "true"'],
  ['on click go to /x in new window', 'on click go url "/x" in new window'],
  ['on click go to /x', 'on click go url "/x"'],
  ['on click prepend "x" to #out', 'on click put "x" at start of #out'],
  ['on click push url "/a"', `on click call history.pushState(null,'',"/a")`],
  ['on click replace url "/b"', `on click call history.replaceState(null,'',"/b")`],
  ['on click copy "hi"', 'on click call navigator.clipboard.writeText("hi")'],
  ['on click swap innerHTML of #a with "<p/>"', 'on click put "<p/>" into #a'],
  ['on click swap outerHTML of #a with "<p/>"', `on click put "<p/>" into #a's outerHTML`],
  ['on click swap beforeBegin of #a with "<p/>"', 'on click put "<p/>" before #a'],
  ['on click swap afterEnd of #a with "<p/>"', 'on click put "<p/>" after #a'],
  ['on click swap afterBegin of #a with "<p/>"', 'on click put "<p/>" at start of #a'],
  ['on click swap beforeEnd of #a with "<p/>"', 'on click put "<p/>" at end of #a'],
  ['on click swap delete of #a', 'on click remove #a'],
  [
    'on click fetch "/missing" do not throw then put it into me',
    'on click fetch "/missing" as text do not throw then put it into me',
  ],
  [
    'on click if #d1 has .x put "y" into #out end',
    'on click if #d1 matches .x put "y" into #out end',
  ],
  ['on click if I have .x put "y" into #out end', 'on click if I match .x put "y" into #out end'],
  ['on click put my?.dataset?.x into #out', 'on click put my dataset.x into #out'],
  [
    'on click put previous <input/>.value into #out',
    'on click put the value of previous <input/> into #out',
  ],
  [
    'on input fetch /search?q=${my value} then put it into #r',
    'on input fetch `/search?q=${my value}` then put it into #r',
  ],
];

describe('English writes upstream’s spelling', () => {
  it.each(ROWS)('%s', (source, english) => {
    expect(render(parse(source, 'en')!, 'en')).toBe(english);
  });

  it.each(ROWS)('reads it back unchanged: %s', (_source, english) => {
    expect(render(parse(english, 'en')!, 'en')).toBe(english);
  });
});

describe('only English is rewritten', () => {
  it.each([
    ['on click prepend "x" to #out', 'es', 'anteponer'],
    ['on click push url "/a"', 'es', 'empujar'],
    ['on click copy "hi"', 'ja', 'コピー'],
  ])('%s keeps its own verb in %s', (source, language, verb) => {
    expect(render(parse(source, 'en')!, language)).toContain(verb);
  });
});

describe('rewriteExpression', () => {
  it('leaves string literals alone', () => {
    expect(rewriteExpression(`#d1 has .x and "has .y" is "a?.b"`)).toBe(
      `#d1 matches .x and "has .y" is "a?.b"`
    );
  });

  it('rewrites only a has/have that a selector follows', () => {
    expect(rewriteExpression('#d1 does not have .x')).toBe('#d1 does not match .x');
    expect(rewriteExpression('x has y')).toBe('x has y');
  });
});

it('a core-only form with no upstream spelling is written as read', () => {
  expect(render(parse('on click clone #tpl', 'en')!, 'en')).toBe('on click clone #tpl');
  expect(render(parse('on click copy #code', 'en')!, 'en')).toBe('on click copy #code');
});
