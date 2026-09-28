/**
 * A translated value whose operand is a property path runs whole on the
 * multilingual direct path.
 *
 * Semantic's operator run took one token, a possessive pair or a group as an
 * operand, so a value that started with `#d1's textContent`, `textContent of
 * #d1` or `#d1.textContent` was captured as the path alone: `put` lost its
 * whole command in every language, English included, and `set` kept the path.
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

// Each value with what both engines put (n = 3; the button is `b`), and the
// languages whose `and` or `not` does not read back (none now; see
// value-operators-direct-path.test.ts).
const VALUES: Array<[string, string, string[]]> = [
  [`#d1's textContent is "d"`, 'true', []],
  [`#d1's textContent is "e"`, 'false', []],
  [`#d1's textContent + "x"`, 'dx', []],
  [`"x" + #d1's textContent`, 'xd', []],
  [`textContent of #d1 + "x"`, 'dx', []],
  [`"x" + textContent of #d1`, 'xd', []],
  [`the textContent of #d1 + "x"`, 'dx', []],
  [`"x" + the textContent of #d1`, 'xd', []],
  [`#d1.textContent + "x"`, 'dx', []],
  [`#d1.textContent is "d"`, 'true', []],
  [`me.textContent + "x"`, 'bx', []],
  [`n + #d1's textContent`, '3d', []],
  [`#d1's className + "!"`, 'x!', []],
  [`textContent of first <p/> + "x"`, 'dx', []],
  [`#d1's textContent is "d" and n is 3`, 'true', []],
  [`n is 3 and #d1's textContent is "e"`, 'false', []],
  [`not #d1's textContent`, 'false', []],
];

describe.each(VALUES)('put %s', (value, expected, broken) => {
  it.each(LANGUAGES.filter(language => !broken.includes(language)))('%s', async language => {
    const source = `on click set n to 3 then put ${value} into #out`;
    expect(await click(source, language)).toBe(expected);
  });
});

describe('set x to #d1\'s textContent + "x"', () => {
  it.each(LANGUAGES)('%s', async language => {
    const source = `on click set x to #d1's textContent + "x" then put x into #out`;
    expect(await click(source, language)).toBe('dx');
  });
});
