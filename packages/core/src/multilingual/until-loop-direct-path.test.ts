/**
 * A translated `repeat until <condition>` stops, on the multilingual direct
 * path.
 *
 * The English parse took the generated repeat pattern, which put the condition
 * in `quantity`, where semantic's AST builder does not read it for an `until`
 * loop; and no other language had a head pattern for the form, so each
 * rendered `until` in English and read it back without its condition. The
 * loop never ended: with a `wait` in its body it counted on forever, without
 * one it hangs the page. The `put` comes after the loop, so a loop that never
 * ends leaves #out as it was. Each loop is tested both ways: one runs, one
 * never starts.
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
  await new Promise(resolve => setTimeout(resolve, 100));
  return document.getElementById('out')!.textContent!;
}

const loop = (start: number): string =>
  `on click set n to ${start} then repeat until n > 3 increment n then wait 1ms end ` +
  'then put n into #out';

// Each start with the n both engines put: counted up to 4, or never started.
const STARTS: Array<[number, string]> = [
  [0, '4'],
  [5, '5'],
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

describe.each(STARTS)('repeat until n > 3, from n = %s', (start, expected) => {
  it.each(LANGUAGES)('%s', async language => {
    expect(await click(loop(start), language)).toBe(expected);
  });
});
