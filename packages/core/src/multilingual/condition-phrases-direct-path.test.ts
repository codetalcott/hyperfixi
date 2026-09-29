/**
 * A condition's comparison phrases run as both engines run them, on the
 * multilingual direct path.
 *
 * buildAST parses every translated condition with semantic's expression parser,
 * which read `is`, `is empty` and `is not empty` and none of core's other
 * comparison phrases: `p is not q` became `p is (not q)`, `p is less than q`
 * compared p with a variable named `less`, `#zz does not exist` and `the X of
 * Y` lost everything after their first word, and `#d1's X` built a possessive
 * core reads as no property. English compiles through core's own parser, so
 * each condition runs in English through buildAST, the path every translation
 * takes, and in the languages that read every operator word and possessive
 * back (the rest render one they do not, a separate gap). Each phrase is
 * tested both ways, so a condition that reads as always true cannot pass.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render, buildAST } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';

const LANGUAGES = ['es', 'he', 'it', 'pl', 'tl', 'tr'] as const;

/** Run the handler on #b and read #out. */
async function run(ast: unknown): Promise<string> {
  document.body.innerHTML =
    '<div id="out">o</div><p id="d1" class="x">d</p><p id="d2">e</p><button id="b">b</button>';
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(ast as never, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent!;
}

const handler = (condition: string): string =>
  'on click set p to 1 then set q to 2 then set r to 0 then set t to "" then ' +
  `if ${condition} put "yes" into #out else put "no" into #out end`;

// Each condition with the branch upstream takes (p = 1, q = 2, r = 0, t = "",
// #d1 has class x and text "d", #d2 follows it). Core agrees on all but
// `textContent of #d1`, which it binds as `textContent of (#d1 is "d")`.
const CONDITIONS: Array<[string, string]> = [
  ['p is not q', 'yes'],
  ['p is not 1', 'no'],
  ['p is q', 'no'],
  ['p is less than q', 'yes'],
  ['p is less than 1', 'no'],
  ['p is greater than q', 'no'],
  ['p is greater than or equal to 1', 'yes'],
  ['p is greater than or equal to 2', 'no'],
  ['p is less than or equal to 0', 'no'],
  ['p is equal to 1', 'yes'],
  ['p is equal to 2', 'no'],
  ['p is not equal to q', 'yes'],
  ['p is not equal to 1', 'no'],
  ['p is really 1', 'yes'],
  ['p is really "1"', 'no'],
  ['p is in [1, 2]', 'yes'],
  ['p is in [3, 4]', 'no'],
  ['p is not in [3, 4]', 'yes'],
  ['p is not in [1, 2]', 'no'],
  ['#d1 matches .x', 'yes'],
  ['#d1 does not match .x', 'no'],
  ['[1, 2] does not contain 3', 'yes'],
  ['#d1 precedes #d2', 'yes'],
  ['#d2 precedes #d1', 'no'],
  ['#d2 follows #d1', 'yes'],
  ['#d1 follows #d2', 'no'],
  ['#d2 does not precede #d1', 'yes'],
  ['#d1 does not precede #d2', 'no'],
  ['#zz does not exist', 'yes'],
  ['#d1 does not exist', 'no'],
  ['p is a Number', 'yes'],
  ['p is a String', 'no'],
  ['p is not a String', 'yes'],
  ['p is not a Number', 'no'],
  ['#d1 is an Element', 'yes'],
  ['p is an Element', 'no'],
  ['#d1 is not an Element', 'no'],
  ['p is not an Element', 'yes'],
  ['[1, 2] includes 1', 'yes'],
  ['[1, 2] includes 3', 'no'],
  ['[1, 2] does not include 3', 'yes'],
  ['[1, 2] does not include 1', 'no'],
  ['p is not null', 'yes'],
  ['p is not empty', 'yes'],
  ['t is empty', 'yes'],
  ['p is not q and q is 2', 'yes'],
  ['p is not q and q is 3', 'no'],
  ['not (p is q)', 'yes'],
  ['#d1\'s textContent is "d"', 'yes'],
  ['#d1\'s textContent is "z"', 'no'],
  ['#d1\'s textContent is not "d"', 'no'],
  ['the textContent of #d1 is "d"', 'yes'],
  ['the textContent of #d1 is "z"', 'no'],
  ['textContent of #d1 is "d"', 'yes'],
  ['textContent of #d1 is "z"', 'no'],
  // A selector after a phrase's last word (PR 101): semantic's expression
  // tokenizer let one follow only its own list of words, which lacked `to` and
  // `includes`, so `#d1` read the variable `d1` on the direct path.
  ['"d" is equal to #d1.textContent', 'yes'],
  ['"z" is equal to #d1.textContent', 'no'],
  ['"d" is equal to #d1\'s textContent', 'yes'],
  ['"xd" includes #d1.textContent', 'yes'],
  ['"xz" includes #d1.textContent', 'no'],
];

describe.each(CONDITIONS)('if %s', (condition, expected) => {
  it('English, through buildAST', async () => {
    const node = parseSemantic(handler(condition), 'en').node;
    expect(node, condition).toBeTruthy();
    expect(await run(buildAST(node!).ast)).toBe(expected);
  });

  it.each(LANGUAGES)('%s', async language => {
    const code = render(parseSemantic(handler(condition), 'en').node!, language);
    const compiled = await hyperscript.compile(code, { language });
    expect(compiled.ok, `${language}: ${code}`).toBe(true);
    expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
    expect(await run(compiled.ast)).toBe(expected);
  });
});

// The type checks the value matrix's phrase cells found failing (PR 93), in
// the fifteen more languages it found them failing in: the value lexicon
// translated the type name like a word (`#d1 is an Element` read back `is an
// elemento`), and a translated type is a variable to both engines (PR 95).
// Every condition above passes in these languages too (measured; tl and tr,
// whose `includes` reads back since PR 100, run them all above); the matrix
// runs them all.
const TYPE_CHECK_LANGUAGES = [
  'ar',
  'fr',
  'hi',
  'id',
  'ja',
  'ko',
  'ms',
  'pt',
  'qu',
  'ru',
  'sw',
  'tl',
  'tr',
  'uk',
  'zh',
] as const;

const TYPE_CHECKS: Array<[string, string]> = [
  ['#d1 is an Element', 'yes'],
  ['p is an Element', 'no'],
  ['#d1 is not an Element', 'no'],
  ['p is not an Element', 'yes'],
];

describe.each(TYPE_CHECKS)('if %s', (condition, expected) => {
  it.each(TYPE_CHECK_LANGUAGES)('%s', async language => {
    const code = render(parseSemantic(handler(condition), 'en').node!, language);
    const compiled = await hyperscript.compile(code, { language });
    expect(compiled.ok, `${language}: ${code}`).toBe(true);
    expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
    expect(await run(compiled.ast)).toBe(expected);
  });
});

// The rest of core's phrases, both ways, in English through buildAST (es and it
// render some of these words as ones they do not read back). Both engines agree
// on each, except `has`/`have`, which upstream does not have: there the answer
// is core's, since a translation runs on core.
const MORE_CONDITIONS: Array<[string, string]> = [
  ['p am 1', 'yes'],
  ['p am 2', 'no'],
  ['p am in [1, 2]', 'yes'],
  ['p am in [3, 4]', 'no'],
  ['p am not in [3, 4]', 'yes'],
  ['p am not in [1, 2]', 'no'],
  ['p is equal 1', 'yes'],
  ['p is equal 2', 'no'],
  ['p is not equal 2', 'yes'],
  ['p is not equal 1', 'no'],
  ['p is not really "1"', 'yes'],
  ['p is not really 1', 'no'],
  ['p is really equal to 1', 'yes'],
  ['p is really equal to "1"', 'no'],
  ['p is not really equal to "1"', 'yes'],
  ['p is not really equal to 1', 'no'],
  ['p really equals 1', 'yes'],
  ['p really equals "1"', 'no'],
  ['p equals 1', 'yes'],
  ['p equals 2', 'no'],
  ['#d1 equals #d1', 'yes'],
  ['#d1 equals #d2', 'no'],
  ['[1, 2] include 1', 'yes'],
  ['[1, 2] include 3', 'no'],
  ['[1, 2] contain 1', 'yes'],
  ['[1, 2] contain 3', 'no'],
  ['[1, 2] do not contain 3', 'yes'],
  ['[1, 2] do not contain 1', 'no'],
  ['[1, 2] does not contains 3', 'yes'],
  ['[1, 2] does not contains 1', 'no'],
  ['#d1 do not match .y', 'yes'],
  ['#d1 do not match .x', 'no'],
  ['#d1 does not follow #d2', 'yes'],
  ['#d2 does not follow #d1', 'no'],
  ['#d1 has .x', 'yes'],
  ['#d1 has .y', 'no'],
  ['#d1 have .x', 'yes'],
  ['#d1 have .y', 'no'],
];

it.each(MORE_CONDITIONS)('English, through buildAST: if %s', async (condition, expected) => {
  const node = parseSemantic(handler(condition), 'en').node;
  expect(node, condition).toBeTruthy();
  expect(await run(buildAST(node!).ast)).toBe(expected);
});
