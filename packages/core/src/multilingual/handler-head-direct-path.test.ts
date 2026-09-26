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
 * - event parameters (`on click(clientX)`). The renderer never wrote them and
 *   the SVO heads never parsed them, so a translation's `clientX` was unbound.
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

/** Install the handler on a fresh button and fire `event` at it; return the button. */
async function fire(code: string, language: string, event: Event): Promise<HTMLElement> {
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = '<button></button>';
  const button = document.body.firstElementChild as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(event);
  await new Promise(resolve => setTimeout(resolve, 20));
  return button;
}

async function fires(code: string, language: string, event: Event): Promise<boolean> {
  return (await fire(code, language, event)).classList.contains('x');
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

describe('`on click(clientX)` binds its parameter', () => {
  const SOURCE = 'on click(clientX) put clientX into me';

  it.each(FOREIGN)('%s', async language => {
    const click = new MouseEvent('click', { clientX: 42, bubbles: true });
    expect((await fire(translate(SOURCE, language), language, click)).textContent).toBe('42');
  });
});

describe('a custom event binds its `detail`', () => {
  const SOURCE = 'on myEvent(detail) put detail into me';

  it.each(FOREIGN)('%s', async language => {
    const event = new CustomEvent('myEvent', { detail: 'D', bubbles: true });
    expect((await fire(translate(SOURCE, language), language, event)).textContent).toBe('D');
  });
});

// PR 8e: a head's params survive when its event has a native name the head
// reads but no token spells (de `mausbewegen`, ar `ضغط المفتاح`, zh `鼠标移动`).
describe('`on mousemove(clientX)` binds its parameter', () => {
  const SOURCE = 'on mousemove(clientX) put clientX into me';

  it.each(FOREIGN)('%s', async language => {
    const move = new MouseEvent('mousemove', { clientX: 4, bubbles: true });
    expect((await fire(translate(SOURCE, language), language, move)).textContent).toBe('4');
  });
});

describe('`on keydown(key)` binds its parameter', () => {
  const SOURCE = 'on keydown(key) put key into me';

  it.each(FOREIGN)('%s', async language => {
    const press = new KeyboardEvent('keydown', { key: 'q', bubbles: true });
    expect((await fire(translate(SOURCE, language), language, press)).textContent).toBe('q');
  });
});
