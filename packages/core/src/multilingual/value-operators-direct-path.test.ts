/**
 * A translated value with a comparison, `mod`, `and`, `or`, `not` or one of
 * core's comparison phrases runs whole on the multilingual direct path.
 *
 * The operator-run capture joined only `+ - * /`, so `put n > 2 into #out`
 * captured `n` alone and every translation lost the comparison. And semantic's
 * expression parser, which builds every translated value's AST, lexed `===` as
 * `==` and a stray `=`, and read `mod` as a variable.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';

/** Translate the handler, compile it on the direct path, click #b, read #out. */
async function click(source: string, language: string): Promise<string> {
  const code = render(parseSemantic(source, 'en').node!, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML =
    '<div id="out">o</div><p id="d1" class="x">d</p><button id="b">b</button>';
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent!;
}

// Each value with what both engines put (n = 3).
const VALUES: Array<[string, string]> = [
  ['n > 2', 'true'],
  ['n < 2', 'false'],
  ['n >= 3', 'true'],
  ['n <= 2', 'false'],
  ['n == 3', 'true'],
  ['n != 3', 'false'],
  ['n === 3', 'true'],
  ['n !== 3', 'false'],
  ['n mod 2', '1'],
  ['n + 2 > 4', 'true'],
];

const LANGUAGES = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];

describe.each(VALUES)('put %s', (value, expected) => {
  it.each(LANGUAGES)('%s', async language => {
    const source = `on click set n to 3 then put ${value} into #out`;
    expect(await click(source, language)).toBe(expected);
  });
});

// `and`, `or` and `not`, with each binary one in both operand orders (p = true,
// q = false), so a value cut to either operand fails. Each skips the languages
// whose word for it is also another word (see semantic's value-operators test).
const CONNECTIVES: Array<[string, string, string[]]> = [
  ['p or q', 'true', []],
  ['q or p', 'true', []],
  ['p and q', 'false', ['qu']],
  ['q and p', 'false', ['qu']],
  ['not p', 'false', ['hi']],
  ['not q', 'true', ['hi']],
  ['p and not q', 'true', ['hi']],
];

describe.each(CONNECTIVES)('put %s', (value, expected, broken) => {
  it.each(LANGUAGES.filter(language => !broken.includes(language)))('%s', async language => {
    const source = `on click set p to true then set q to false then put ${value} into #out`;
    expect(await click(source, language)).toBe(expected);
  });
});

// Core's comparison phrases (n = 3, #d1 has class x, #zz is absent), each with
// what both engines put.
const PHRASES: Array<[string, string, string[]]> = [
  ['n is 3', 'true', []],
  ['n is not 3', 'false', []],
  ['n is greater than 2', 'true', []],
  ['n is less than 2', 'false', []],
  ['#d1 matches .x', 'true', []],
  ['#d1 does not match .x', 'false', []],
  ['#d1 exists', 'true', []],
  ['#zz exists', 'false', []],
  ['#zz does not exist', 'true', []],
  ['n is a Number', 'true', []],
  ['n is 3 or n is 4', 'true', []],
  ['n is 4 or n is 5', 'false', []],
];

describe.each(PHRASES)('put %s', (value, expected, broken) => {
  it.each(LANGUAGES.filter(language => !broken.includes(language)))('%s', async language => {
    expect(await click(`on click set n to 3 then put ${value} into #out`, language)).toBe(expected);
  });
});

// `contains`, `includes` and `equals`, both ways (n = 3). Each is skipped where
// its word is another concept's too, or its tokenizer splits it (see semantic's
// value-operators test).
const WORDS: Array<[string, string, string[]]> = [
  ['[1, 2] contains 1', 'true', ['ja', 'ko', 'qu', 'zh']],
  ['[1, 2] contains 3', 'false', ['ja', 'ko', 'qu', 'zh']],
  ['[1, 2] includes 1', 'true', ['hi', 'tl', 'tr']],
  ['[1, 2] includes 3', 'false', ['hi', 'tl', 'tr']],
  ['n equals 3', 'true', ['pl', 'zh']],
  ['n equals 4', 'false', ['pl', 'zh']],
];

describe.each(WORDS)('put %s', (value, expected, broken) => {
  it.each(LANGUAGES.filter(language => !broken.includes(language)))('%s', async language => {
    expect(await click(`on click set n to 3 then put ${value} into #out`, language)).toBe(expected);
  });
});
