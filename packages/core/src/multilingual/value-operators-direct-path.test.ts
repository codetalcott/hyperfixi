/**
 * A translated value with a comparison, `mod`, `and`, `or` or `not` runs whole
 * on the multilingual direct path.
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
  document.body.innerHTML = '<div id="out">o</div><button id="b">b</button>';
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
  ['p and q', 'false', ['ja', 'qu', 'sw']],
  ['q and p', 'false', ['ja', 'qu', 'sw']],
  ['not p', 'false', ['hi', 'qu']],
  ['not q', 'true', ['hi', 'qu']],
  ['p and not q', 'true', ['hi', 'ja', 'qu', 'sw']],
];

describe.each(CONNECTIVES)('put %s', (value, expected, broken) => {
  it.each(LANGUAGES.filter(language => !broken.includes(language)))('%s', async language => {
    const source = `on click set p to true then set q to false then put ${value} into #out`;
    expect(await click(source, language)).toBe(expected);
  });
});
