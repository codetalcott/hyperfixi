/**
 * A non-English handler head binds what the English binds, on the multilingual
 * direct path.
 *
 * Two of its parts never reached the runtime:
 * - `or <event>` alternatives. The renderer dropped them, so every translation
 *   of `on click or keydown …` read `on click …`; and `buildAST` ignored the
 *   parser's `additionalEvents` anyway. The handler listened for `click` alone.
 * - a `[filter]`. `buildAST` passed `keydown[key=="Escape"]` on as the event
 *   NAME, so no event ever matched and the handler never fired.
 *
 * English is untouched (core's own parser). Each case renders the English into
 * the language, compiles it on the direct path, fires one event, and checks
 * the element. `on click or keypress[key=="Enter"]` is deliberately absent:
 * core applies no filter to a multi-event handler, in English too (filed in
 * PARSER_NEXT_STEPS.md, "Or-join filters have no per-event representation").
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

/** Install the handler on a fresh button, fire `event` at it, report `.x`. */
async function fires(code: string, language: string, event: Event): Promise<boolean> {
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = '<button></button>';
  const button = document.body.firstElementChild as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(event);
  await new Promise(resolve => setTimeout(resolve, 20));
  return button.classList.contains('x');
}

describe('`on click or keydown` fires on either event', () => {
  const SOURCE = 'on click or keydown add .x to me';

  it.each(FOREIGN)('%s', async language => {
    const code = translate(SOURCE, language);
    expect(await fires(code, language, new MouseEvent('click', { bubbles: true }))).toBe(true);
    expect(await fires(code, language, new KeyboardEvent('keydown', { bubbles: true }))).toBe(true);
  });
});

describe('`on keydown[key=="Escape"]` fires on its key only', () => {
  const SOURCE = 'on keydown[key=="Escape"] add .x to me';
  const key = (k: string) => new KeyboardEvent('keydown', { key: k, bubbles: true });

  it.each(FOREIGN)('%s', async language => {
    const code = translate(SOURCE, language);
    expect(await fires(code, language, key('Escape'))).toBe(true);
    expect(await fires(code, language, key('a'))).toBe(false);
  });
});
