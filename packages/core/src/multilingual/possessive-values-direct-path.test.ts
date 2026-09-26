/**
 * A translated possessive value (`put #d1's value into #out`) runs on the
 * multilingual direct path.
 *
 * Most languages render a property path in the `of` form (es `valor de #d1`),
 * and the value roles of put, set, append, prepend and default did not accept
 * a property path, so the possessive was lost in 16 languages: the put dropped
 * whole, or the set held the property word. Each case renders the English into
 * the language, compiles it on the direct path, and clicks.
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

/** Compile the translation on the direct path, install it on the button, click it. */
async function click(source: string, language: string): Promise<string | null> {
  const code = translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = '<input id="d1" value="v1"><div id="out">o</div><button>b</button>';
  const button = document.body.querySelector('button') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent;
}

// Each form with the #out both engines leave (prepend is core's own).
const CASES: Array<[string, string]> = [
  ["on click put #d1's value into #out", 'v1'],
  ['on click put the value of #d1 into #out', 'v1'],
  ["on click set x to #d1's value then put x into #out", 'v1'],
  ['on click set x to the value of #d1 then put x into #out', 'v1'],
  ["on click append #d1's value to #out", 'ov1'],
  ["on click prepend #d1's value to #out", 'v1o'],
  ["on click default x to #d1's value then put x into #out", 'v1'],
  ["on click put 'x' into #out's textContent", 'x'],
];

describe.each(CASES)('%s', (source, expected) => {
  it.each(FOREIGN)('%s', async language => {
    expect(await click(source, language)).toBe(expected);
  });
});
