/**
 * English writes upstream's spelling for forms only core ran
 * (src/explicit/upstream-spelling.ts). Each row: the core-only source, and
 * the English render — the form upstream _hyperscript and @hyperfixi/engine
 * read, measured to leave the same DOM as core's original (Phase C2c).
 * The reader keeps accepting the source; foreign renders keep their words.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, getSupportedLanguages } from '../src/index';
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
  // Core's two words for a strategy: `into` is innerHTML, `over` outerHTML. Left
  // as a swap, English wrote `swap into of #a with …`, an exchange upstream runs
  // with a property named `into` (S6).
  ['on click swap into #a with "<p/>"', 'on click put "<p/>" into #a'],
  ['on click swap into of #a with "<p/>"', 'on click put "<p/>" into #a'],
  ['on click swap over #a with "<p/>"', `on click put "<p/>" into #a's outerHTML`],
  // A handler's catch and finally run as its body does.
  ['on click log 1 catch e prepend "x" to #out', 'on click log 1 catch e put "x" at start of #out'],
  ['on click log 1 finally swap into #a with "x"', 'on click log 1 finally put "x" into #a'],
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
  // Core's dialog mode: upstream's open is modal, and it reads `as non-modal`
  // as an expression, `(#d as non) - modal`.
  ['on click open #d as non-modal', 'on click call #d.show()'],
  ['on click open #d as modal', 'on click open #d'],
  ['on click open as non-modal', 'on click call me.show()'],
  // Upstream's statement modifier follows its command.
  ['on click unless I match .off toggle .on', 'on click toggle .on unless I match .off'],
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
  // `process partials` is core's in either spelling, so its tail stays too.
  expect(render(parse('on click process partials in it using view transition', 'en')!, 'en')).toBe(
    'on click process partials in it using view transition'
  );
});

/**
 * Core's view-transition tail (the `manner` role, view-transition-manner.test.ts)
 * is upstream's `start view transition … end` block, parsed by upstream 0.9.93 and
 * the engine alike, a `then` after its `end` included. Not in ROWS: the reader reads
 * the block back as a view-transition node around the command, not as the tail, so
 * the two nodes differ though both write this English (view-transition-block.test.ts).
 * What a page written in another language gets is the round trip below: its tail
 * reads, and the adapter hands the host the block.
 */
describe('core’s view-transition tail is written as upstream’s block', () => {
  const TAIL: [string, string][] = [
    [
      'on click swap #a with #b using view transition',
      'on click start view transition swap #a with #b end',
    ],
    [
      'on click swap #a with #b using view transition then add .x to me',
      'on click start view transition swap #a with #b end then add .x to me',
    ],
    [
      'on click morph #list to it using view transition',
      'on click start view transition morph #list to it end',
    ],
    // The tail leaves the command first, so a strategy swap's `put` keeps it.
    [
      'on click swap innerHTML of #a with "<p/>" using view transition',
      'on click start view transition put "<p/>" into #a end',
    ],
  ];

  it.each(TAIL)('%s', (source, english) => {
    expect(render(parse(source, 'en')!, 'en')).toBe(english);
  });

  const languages = getSupportedLanguages().filter(l => l !== 'en');

  it.each(languages)('%s keeps the tail, and its English is the block', language => {
    const [source, english] = TAIL[0];
    const foreign = render(parse(source, 'en')!, language);
    expect(foreign).not.toContain('start view transition');
    expect(render(parse(foreign, language)!, 'en')).toBe(english);
  });

  it('morph round-trips in 22 of 23 (ms folds the destination: view-transition-manner.test.ts)', () => {
    const [source, english] = TAIL[2];
    const missed = languages.filter(
      language => render(parse(render(parse(source, 'en')!, language), language)!, 'en') !== english
    );
    expect(missed).toEqual(['ms']);
  });
});
