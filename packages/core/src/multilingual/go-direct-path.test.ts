/**
 * A translated `go` runs on the multilingual direct path.
 *
 * GoCommand has read core's slots since #1077 (`modifiers.back`, `.forward`,
 * `.url`, `.in`; the destination otherwise the one positional arg), but
 * semantic's go mapper still emitted the list it read before (`args: ['url',
 * '/x']`, `args: ['back']`). So every translated `go back` and `go to url`
 * threw `Target element not found`. `go to #d1` was lost in every language
 * (go's destination took no selector), and `in new window` read as a phantom
 * `wait new`, so the page opened in the same window. Each case renders the
 * English into the language, compiles it on the direct path, and clicks.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
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
async function click(source: string, language: string): Promise<void> {
  const code = translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = '<div id="d1"></div><div id="out"></div><button>b</button>';
  const button = document.body.querySelector('button') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
}

afterEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('`go back` goes back', () => {
  it.each(FOREIGN)('%s', async language => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    await click('on click go back', language);
    expect(back).toHaveBeenCalledOnce();
  });
});

describe('`go forward` goes forward', () => {
  it.each(FOREIGN)('%s', async language => {
    const forward = vi.spyOn(window.history, 'forward').mockImplementation(() => {});
    await click('on click go forward', language);
    expect(forward).toHaveBeenCalledOnce();
  });
});

describe('`go to url "#frag"` navigates', () => {
  it.each(FOREIGN)('%s', async language => {
    await click('on click go to url "#frag"', language);
    expect(window.location.hash).toBe('#frag');
  });
});

describe('`go to url "/x" in new window` opens a window, and the next command runs', () => {
  it.each(FOREIGN)('%s', async language => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    await click('on click go to url "/x" in new window then put "y" into #out', language);
    expect(open).toHaveBeenCalledWith('/x', '_blank');
    expect(document.getElementById('out')!.textContent).toBe('y');
  });
});

describe('`go to /x in new window` opens a window', () => {
  it.each(FOREIGN)('%s', async language => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    await click('on click go to /x in new window', language);
    expect(open).toHaveBeenCalledWith('/x', '_blank');
  });
});

describe('`go to #d1` scrolls #d1 into view', () => {
  it.each(FOREIGN)('%s', async language => {
    const scrolled: string[] = [];
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
      scrolled.push(this.id);
    });
    await click('on click go to #d1', language);
    expect(scrolled).toEqual(['d1']);
  });
});
