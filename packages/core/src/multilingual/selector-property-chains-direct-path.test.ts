/**
 * A translated property chain on an element (`#d1.value.length`) runs on the
 * multilingual direct path.
 *
 * The matcher folded only the first `.prop` after an element into its property
 * path, so `put #d1.value.length into #out` lost the whole put in every
 * language, and `set x to #d1.value.length` set `#d1.value`. Each case renders
 * the English into the language, compiles it on the direct path, and clicks.
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
  document.body.innerHTML =
    '<input id="d1" value="v1x"><ul id="l1"><li>a</li><li>b</li></ul><div id="out">o</div><button>b</button>';
  const button = document.body.querySelector('button') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return document.getElementById('out')!.textContent;
}

// Each form with the #out both engines leave.
const CASES: Array<[string, string]> = [
  ['on click put #d1.value.length into #out', '3'],
  ['on click set x to #d1.value.length then put x into #out', '3'],
  ['on click put #l1.children.length into #out', '2'],
];

describe.each(CASES)('%s', (source, expected) => {
  it.each(FOREIGN)('%s', async language => {
    expect(await click(source, language)).toBe(expected);
  });
});
