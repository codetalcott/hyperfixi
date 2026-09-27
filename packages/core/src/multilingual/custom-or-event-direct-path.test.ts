/**
 * A translated handler's custom `or` event fires under its own name, on the
 * multilingual direct path.
 *
 * The extractor that reads a custom `or <event>` lowercased it, and the DOM
 * matches event names exactly: a translated `on click or myEvent` listened for
 * `myevent` and never ran on `myEvent`. English compiles through core's parser,
 * which always kept the case. bn/ja/tr/zh throw on a custom leg and it/ko/th
 * drop it (filed), so they are not here.
 */
import { it, expect } from 'vitest';
import { parseSemantic, render } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';

const LANGUAGES = [
  'ar',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'tl',
  'uk',
  'vi',
] as const;

it.each(LANGUAGES)('%s', async language => {
  const source = 'on click or myEvent put "ran" into #out';
  const code = render(parseSemantic(source, 'en').node!, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = '<div id="out">o</div><button id="b">b</button>';
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new CustomEvent('myEvent', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  expect(document.getElementById('out')!.textContent).toBe('ran');
});
