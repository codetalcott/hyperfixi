/**
 * Values core wrote differently from upstream `_hyperscript`.
 *
 * The value matrix (testing-framework's value-matrix.ts) runs every value
 * shape on both engines; these are the cells where core's own English run
 * differed. Every row here was run on upstream 0.9.93 and core, and the
 * expected result is upstream's. The rows that already agreed are the
 * neighbours each fix must keep: a collection's own `length`, `#a's @title`,
 * an empty array, an increment with no amount.
 */
import { describe, it, expect } from 'vitest';
import { buildAST, parseSemantic, render } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';

const FIXTURE =
  '<div id="out">o</div><p id="a" class="x" title="t1">6</p>' +
  '<div id="w"><p class="w" id="w1">w</p><p class="w">v</p></div><button id="b">b</button>';
const SETUP = 'set arr to [1, 2] then set obj to {v: 6} then set nothing to null then';

/** Compile a click handler, click #b, and read #out's HTML. */
async function click(body: string): Promise<string> {
  const compiled = await hyperscript.compile(`on click ${SETUP} ${body}`);
  expect(compiled.ok, body).toBe(true);
  document.body.innerHTML = FIXTURE;
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.innerHTML;
}

/** Compile through semantic and buildAST, the path every translation takes. */
async function direct(body: string, language = 'en'): Promise<string> {
  const english = `on click ${SETUP} ${body}`;
  const code = language === 'en' ? english : render(parseSemantic(english, 'en').node!, language);
  const { ast } = buildAST(parseSemantic(code, language).node!);
  document.body.innerHTML = FIXTURE;
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(
    ast as Parameters<typeof hyperscript.execute>[0],
    hyperscript.createContext(button)
  );
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.innerHTML;
}

describe('put writes a value as upstream does', () => {
  it.each([
    ['null', 'null'],
    ['nothing', 'null'],
    ['unsetVariable', 'null'],
    ['[1, 2]', '12'],
    ['arr', '12'],
    ['["<b>x</b>", 2]', '<b>x</b>2'],
    ['[null, 1]', '1'],
    ['[#a, 1]', '<p id="a" class="x" title="t1">6</p>1'],
    ['[]', ''],
    ['"x"', 'x'],
    ['.w', '<p class="w" id="w1">w</p><p class="w">v</p>'],
  ])('put %s', async (value, expected) => {
    expect(await click(`put ${value} into #out`)).toBe(expected);
  });

  it('an array at the end of an element', async () => {
    expect(await click('put [1, 2] at end of #out')).toBe('o12');
  });
});

describe('X of Y reads an attribute, and maps over a collection', () => {
  it.each([
    ['@title of #a', 't1'],
    ["#a's @title", 't1'],
    ['@class of .w', 'ww'],
    ['textContent of .w', 'wv'],
    ['textContent of <p.w/>', 'wv'],
    ['length of .w', '2'],
    ['length of arr', '2'],
    ['v of obj', '6'],
  ])('put %s', async (value, expected) => {
    expect(await click(`put ${value} into #out`)).toBe(expected);
  });
});

describe('the X of Y takes `in` on its target, as X of Y does', () => {
  it.each([
    ['the textContent of <p.w/> in #w', 'wv'],
    ['textContent of <p.w/> in #w', 'wv'],
    ['textContent of #a as Int', 'null'],
    ['the textContent of #a', '6'],
  ])('put %s', async (value, expected) => {
    expect(await click(`put ${value} into #out`)).toBe(expected);
  });

  // A known difference (docs/UPSTREAM-KNOWN-DIFFS.md): upstream reads `the
  // value of #inp as Int` as the value of `#inp as Int`, which is null. Core
  // converts the property, which is what the idiom means.
  it('`as` after `the X of Y` converts the property, not the target', async () => {
    expect(await click('put the textContent of #a as Int into #out')).toBe('6');
    expect(await click('put the textContent of #a as Int + 1 into #out')).toBe('7');
  });
});

// `the X of Y` threw on a null target, where upstream (and core's `X of Y` and
// `Y's X`) read null. Semantic builds every `X of Y` as the-X-of-Y, and
// `v of w of obj as Int` as `v of (w of (obj as Int))`, whose inner read is
// undefined: every translation of it wrote nothing.
const NULL_TARGETS: Array<[string, string]> = [
  ['the name of nothing', 'null'],
  ['the name of #missing', 'null'],
  ['the length of the name of obj', 'null'],
  ['v of w of obj', 'null'],
  ['v of w of obj as Int', 'null'],
  ['the v of obj', '6'],
  ['the length of arr', '2'],
];

describe('the X of a null target reads null, as upstream does', () => {
  it.each(NULL_TARGETS)('English: put %s', async (value, expected) => {
    expect(await click(`put ${value} into #out`)).toBe(expected);
  });

  it.each(NULL_TARGETS)('direct path: put %s', async (value, expected) => {
    expect(await direct(`put ${value} into #out`)).toBe(expected);
  });

  it.each(['es', 'ja', 'ar'])('%s', async language => {
    expect(await direct('put v of w of obj as Int into #out', language)).toBe('null');
  });

  it('a set reads it too', async () => {
    expect(await direct('set x to v of w of obj as Int then put x into #out')).toBe('null');
  });
});

// An object literal on the direct path: semantic read a `put` or `set` value's
// `{…}` as text (a CSS style block's fold), and its expression parser keyed a
// property with a bare string, which the runtime threw on (PR 73).
const OBJECTS: Array<[string, string]> = [
  ['put {} into #out', '[object Object]'],
  ['set x to {a: 1, b: "q"} then put x.b into #out', 'q'],
  ['set x to {a: 1} then put x.a + 1 into #out', '2'],
  ['put obj.v into #out', '6'],
];

describe('an object literal is an object on the direct path', () => {
  it.each(OBJECTS)('English: %s', async (body, expected) => {
    expect(await click(body)).toBe(expected);
  });

  it.each(OBJECTS)('direct path: %s', async (body, expected) => {
    expect(await direct(body)).toBe(expected);
  });

  it.each(['es', 'ja', 'ar'])('%s', async language => {
    for (const [body, expected] of OBJECTS) {
      expect(await direct(body, language), body).toBe(expected);
    }
  });
});

// Two filed direct-path readings (PR 75): a bracketed attribute, which the
// direct path queried as a selector, and a variable named like an English
// article, whose whole `set` dropped. Each row is upstream's result.
const FILED: Array<[string, string]> = [
  ['put [@title] into #out', 'null'],
  ['add [@title="x"] to me then put my @title into #out', 'x'],
  ['toggle [@title="x"] on me then put my @title into #out', 'x'],
  ['remove [@title] from #a then put #a.title into #out', ''],
  ['set a to 5 then put a into #out', '5'],
  ['set an to 5 then put an + 1 into #out', '6'],
];

describe('a bracketed attribute and an article-named variable, on both paths', () => {
  it.each(FILED)('English: %s', async (body, expected) => {
    expect(await click(body)).toBe(expected);
  });

  it.each(FILED)('direct path: %s', async (body, expected) => {
    expect(await direct(body)).toBe(expected);
  });

  it.each(['ja', 'ar', 'zh'])('%s', async language => {
    for (const [body, expected] of FILED) {
      expect(await direct(body, language), body).toBe(expected);
    }
  });

  // A known difference (docs/UPSTREAM-KNOWN-DIFFS.md): upstream reads
  // `[@title="x"]` as a value as `me`'s title (null here). Core writes its
  // text, the form `add`, `remove` and `toggle` read, on both paths.
  it('`[@name="value"]` as a value is its text', async () => {
    const body = 'put [@title="x"] into #out';
    expect(await click(body)).toBe('[@title="x"]');
    expect(await direct(body)).toBe('[@title="x"]');
  });
});

// A property of an object written through `'s` or `of`, and an attribute
// counted (PR 82): English threw on `set obj's v` and `set v of obj` ("set
// command target must be a string or object literal") and wrote nothing for
// `set textContent of #a`, core's bare `of`; the direct path's counter wrote an
// object's property and an attribute nowhere. `set obj.v` and an element's
// property already agreed. Each row is upstream's result.
const WRITES: Array<[string, string]> = [
  ["set obj's v to 5 then put obj.v into #out", '5'],
  ['set v of obj to 5 then put obj.v into #out', '5'],
  ['set the v of obj to 5 then put obj.v into #out', '5'],
  ['set textContent of #a to 5 then put #a.textContent into #out', '5'],
  ["increment obj's v then put obj.v into #out", '7'],
  ['increment v of obj then put obj.v into #out', '7'],
  ['increment obj.v then put obj.v into #out', '7'],
  ['decrement obj.v then put obj.v into #out', '5'],
  ['increment @title then put my @title into #out', '1'],
  ['increment @title by 2 then put my @title into #out', '2'],
  ['set @title to 5 then increment @title then put my @title into #out', '6'],
  ['set obj.v to 5 then put obj.v into #out', '5'],
  ["increment #a's textContent then put #a.textContent into #out", '7'],
];

describe("an object's property and an attribute are written, on both paths", () => {
  it.each(WRITES)('English: %s', async (body, expected) => {
    expect(await click(body)).toBe(expected);
  });

  it.each(WRITES)('direct path: %s', async (body, expected) => {
    expect(await direct(body)).toBe(expected);
  });

  // ar and zh read the word after an increment's target as its amount
  // (`increment obj by '`, `increment v by of`): semantic's, filed.
  const MARKERLESS_AMOUNT = ["increment obj's v", 'increment v of obj'];
  it.each(['ja', 'ar', 'zh'])('%s', async language => {
    for (const [body, expected] of WRITES) {
      if (language !== 'ja' && MARKERLESS_AMOUNT.some(row => body.startsWith(row))) continue;
      expect(await direct(body, language), body).toBe(expected);
    }
  });
});

describe('is empty reads a length, as upstream does', () => {
  it.each([
    ['{} is empty', 'false'],
    ['{} is not empty', 'true'],
    ['obj is empty', 'false'],
    ['[] is empty', 'true'],
    ['arr is empty', 'false'],
    ['"" is empty', 'true'],
    ['null is empty', 'true'],
  ])('put %s', async (value, expected) => {
    expect(await click(`put ${value} into #out`)).toBe(expected);
  });
});

describe('an increment by a null amount is NaN', () => {
  it.each([
    ['increment i by null', 'NaN'],
    ['increment i by nothing', 'NaN'],
    ['decrement i by null', 'NaN'],
    ['increment i by "2"', '3'],
    ['increment i by 2', '3'],
    ['increment i', '2'],
  ])('%s', async (command, expected) => {
    expect(await click(`set i to 1 then ${command} then put i into #out`)).toBe(expected);
  });
});

describe('the direct path reads an increment amount as upstream does', () => {
  // Core's English parser rewrites `increment` to a `set`; semantic's AST
  // builder emits it as a command with a `by` modifier, which IncrementCommand
  // reads. Semantic keeps only a literal amount today, so each row swaps the
  // modifier into the node it builds.
  async function incrementBy(by: object): Promise<string> {
    const parsed = parseSemantic(
      'on click set i to 1 then increment i by 5 then put i into #out',
      'en'
    );
    const { ast } = buildAST(parsed.node!);
    const swap = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const record = node as { name?: unknown; modifiers?: { by?: unknown } };
      if (record.name === 'increment' && record.modifiers?.by) record.modifiers.by = by;
      for (const value of Object.values(node)) swap(value);
    };
    swap(ast);
    document.body.innerHTML = FIXTURE;
    const button = document.getElementById('b') as HTMLElement;
    await hyperscript.execute(
      ast as Parameters<typeof hyperscript.execute>[0],
      hyperscript.createContext(button)
    );
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 30));
    return document.getElementById('out')!.innerHTML;
  }

  it.each([
    ['2', { type: 'literal', value: 2 }, '3'],
    ['"2"', { type: 'literal', value: '2' }, '3'],
    ['null', { type: 'literal', value: null }, 'NaN'],
    ['an unset variable', { type: 'identifier', name: 'unsetAmount' }, 'NaN'],
  ])('by %s', async (_label, by, expected) => {
    expect(await incrementBy(by)).toBe(expected);
  });
});

// Upstream's increment reads its amount through parseFloat, and its counter
// the same way unless the counter is falsy, which counts from 0. Core's
// English rewrite (`set i to i + amount`) added 1 for `true` and 6 for `#a`
// (its text), threw on text, arrays and objects, and read `""` as NaN; the
// direct path left the default 1 for anything but a number or text. Each row
// is upstream's result, on both paths.
const COUNTERS: Array<[string, string]> = [
  ['set i to 1 then increment i by true', 'NaN'],
  ['set i to 1 then increment i by false', 'NaN'],
  ['set i to 1 then increment i by #a', 'NaN'],
  ['set i to 1 then increment i by "q"', 'NaN'],
  ['set i to 1 then increment i by ""', 'NaN'],
  ['set i to 1 then increment i by [1, 2]', '2'],
  ['set i to 1 then increment i by arr', '2'],
  ['set i to 1 then increment i by "2abc"', '3'],
  ['set i to 1 then increment i by " 3 "', '4'],
  ['set i to 10 then decrement i by true', 'NaN'],
  ['set i to 10 then decrement i by #a', 'NaN'],
  ['set i to 10 then decrement i by ""', 'NaN'],
  ['set i to 10 then decrement i by [1, 2]', '9'],
  ['set i to "" then increment i', '1'],
  ['set i to "" then decrement i', '-1'],
  ['set i to false then increment i', '1'],
  ['set i to nothing then increment i', '1'],
  ['set i to "abc" then increment i', 'NaN'],
  ['set i to true then increment i', 'NaN'],
  ['set i to true then decrement i', 'NaN'],
  ['set i to [1, 2] then increment i', '2'],
  ['set i to [1, 2] then decrement i', '0'],
  ['set i to [] then increment i', 'NaN'],
  ['set i to "5px" then increment i', '6'],
  // An object, which semantic read as text on the direct path until PR 73.
  ['set i to 1 then increment i by {}', 'NaN'],
  ['set i to 1 then increment i by obj', 'NaN'],
  ['set i to {} then increment i', 'NaN'],
];

describe("a counter's amount and value read as upstream reads them", () => {
  it.each(COUNTERS)('English: %s', async (body, expected) => {
    expect(await click(`${body} then put i into #out`)).toBe(expected);
  });

  it.each(COUNTERS)('direct path: %s', async (body, expected) => {
    expect(await direct(`${body} then put i into #out`)).toBe(expected);
  });

  it.each(['es', 'ja', 'ar'])('%s', async language => {
    for (const [body, expected] of COUNTERS) {
      expect(await direct(`${body} then put i into #out`, language), body).toBe(expected);
    }
  });
});
