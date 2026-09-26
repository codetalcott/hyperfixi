/**
 * A translated behavior keeps every handler on the multilingual direct path.
 *
 * The block parser split a behavior's handlers by counting block openers, and
 * it counted each word of a head of several (`repeat while`) and each marker
 * that spells an opener (`wait for`). A handler holding one never closed, so
 * the handlers after it were lost: the installed behavior never answered their
 * events. Each case renders the English into the language, compiles it on the
 * direct path, installs it, and fires the second handler's event.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';

const FOREIGN = [
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
] as const;

function translate(source: string, language: string): string {
  const node = parseSemantic(source, 'en').node;
  if (!node) throw new Error(`no English parse: ${source}`);
  return render(node, language);
}

// A fresh behavior name per case, in letters: qu and tr split a trailing number
// off an identifier, so `behavior Demo15` defined `Demo` (filed).
let serial = 0;
const letters = (n: number): string =>
  (n < 26 ? '' : letters(Math.floor(n / 26) - 1)) + String.fromCharCode(65 + (n % 26));

/** Define the translated behavior, install it on a fresh button, fire `keyup`. */
async function keyupAnswered(first: string, language: string): Promise<boolean> {
  const name = `Demo${letters(serial++)}`;
  const source = `behavior ${name}(h)\n  ${first}\n  on keyup add .k to me end\nend`;
  const compiled = await hyperscript.compile(translate(source, language), { language });
  expect(compiled.ok, `${language}: ${source}`).toBe(true);
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(document.body));
  document.body.innerHTML = '<button></button>';
  const button = document.body.firstElementChild as HTMLElement;
  await hyperscript.eval(`install ${name}(h: 1)`, button);
  button.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 20));
  return button.classList.contains('k');
}

describe.each([
  ['repeat while', 'on click repeat while x < 3 increment x end end'],
  ['wait for', 'on click wait for pointerup end'],
])('a behavior with `%s` in its first handler answers its second', (_, first) => {
  it.each(FOREIGN)('%s', async language => {
    expect(await keyupAnswered(first, language)).toBe(true);
  });
});
