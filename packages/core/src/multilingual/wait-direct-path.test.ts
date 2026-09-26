/**
 * A non-English `wait for <event>` waits, on the multilingual direct path.
 *
 * `buildAST` wrote an event wait as `modifiers.for` (and `modifiers.from`),
 * which WaitCommand stopped reading at Arc 3 step 2 (#1073, as keys "neither
 * parser emits" — semantic's wait mapper did). With `args` empty, every
 * translated `wait for <event>` threw "wait command requires an argument", and
 * the handler stopped there: nothing after the wait ever ran. English was
 * untouched (core's own parser). The mapper now emits core's shape, an array
 * of `{ name, args }` event specs.
 *
 * Each case renders the English into the language, compiles it on the direct
 * path, clicks, and checks that the command after the wait runs only once the
 * event arrives.
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

async function install(code: string, language: string): Promise<HTMLElement> {
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = '<button></button>';
  const button = document.body.firstElementChild as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  return button;
}

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

describe('`wait for keyup` waits for the keyup', () => {
  const SOURCE = 'on click wait for keyup then add .x to me';

  it.each(FOREIGN)('%s', async language => {
    const button = await install(translate(SOURCE, language), language);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(button.classList.contains('x'), 'ran before the event').toBe(false);
    button.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    await settle();
    expect(button.classList.contains('x'), 'never ran after it').toBe(true);
  });
});

// The time path was never broken; kept beside the event path so a change to
// the mapper's branch order is caught.
describe('`wait 10ms` still waits a time', () => {
  const SOURCE = 'on click wait 10ms then add .x to me';

  it.each(['es', 'ja', 'ar'])('%s', async language => {
    const button = await install(translate(SOURCE, language), language);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(button.classList.contains('x')).toBe(true);
  });
});

// PR 8d: a wait's params, alternatives and source reach the runtime. The
// translation kept only the first event, so a drag behavior waited on the
// element, not the document, with its coordinates unbound.
describe('`wait for pointermove(clientX) or pointerup(clientX) from document` binds and listens there', () => {
  const SOURCE =
    'on click wait for pointermove(clientX) or pointerup(clientX) from document then put clientX into me';

  it.each(FOREIGN)('%s', async language => {
    const button = await install(translate(SOURCE, language), language);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(button.textContent, 'ran before the event').toBe('');
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 7 }));
    await settle();
    expect(button.textContent).toBe('7');
  });
});

describe('`wait for keyup or 20ms` gives up at the timeout', () => {
  const SOURCE = 'on click wait for keyup or 20ms then add .x to me';

  it.each(['es', 'ja', 'ar', 'zh'])('%s', async language => {
    const button = await install(translate(SOURCE, language), language);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(button.classList.contains('x')).toBe(true);
  });
});
