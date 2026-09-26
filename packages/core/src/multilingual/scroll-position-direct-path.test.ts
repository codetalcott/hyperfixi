/**
 * A translated `go`/`scroll` to a position (`scroll to the bottom of #d1`) or
 * with `smoothly`/`instantly` scrolls as core's English does.
 *
 * No go or scroll pattern read the position or the adverb. The position word
 * took the destination's slot and the element was dropped, so a translated
 * `scroll to top of #d1` threw `scroll: target element not found` and `go to
 * top of #d1` threw `Target element not found`. The adverb was dropped. Each
 * case runs the English through core's parser, then each translation on the
 * multilingual direct path, and compares the `scrollIntoView` calls.
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

type Scroll = [string, ScrollIntoViewOptions | boolean | undefined];

/** Compile, install on the button, click; return each scrollIntoView call. */
async function scrolls(source: string, language: string): Promise<Scroll[]> {
  const code = language === 'en' ? source : translate(source, language);
  const compiled = await hyperscript.compile(code, { language });
  expect(compiled.ok, `${language}: ${code}`).toBe(true);
  if (language !== 'en') expect(compiled.meta.directPath, `${language}: ${code}`).toBe(true);
  document.body.innerHTML = '<div id="d1"></div><button id="b">b</button>';
  const calls: Scroll[] = [];
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (
    this: Element,
    options?: ScrollIntoViewOptions | boolean
  ) {
    calls.push([this.id || this.tagName.toLowerCase(), options]);
  });
  const button = document.getElementById('b') as HTMLElement;
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(button));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return calls;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// Each form with the block/inline position both engines scroll to (core's go
// also defaults to a smooth scroll, and reads a lone horizontal word with a
// `nearest` block).
const CASES: Array<[string, string, Partial<ScrollIntoViewOptions>]> = [
  ['on click go to top of #d1', 'd1', { block: 'start' }],
  ['on click go to the bottom of #d1 smoothly', 'd1', { block: 'end', behavior: 'smooth' }],
  ['on click go to right of me', 'b', { inline: 'end' }],
  ['on click scroll to top of #d1', 'd1', { block: 'start' }],
  ['on click scroll to the bottom of #d1', 'd1', { block: 'end' }],
  ['on click scroll to middle of body', 'body', { block: 'center' }],
  ['on click scroll to #d1 smoothly', 'd1', { behavior: 'smooth' }],
  ['on click scroll to #d1 instantly', 'd1', { behavior: 'instant' }],
  ['on click scroll to top of #d1 smoothly', 'd1', { block: 'start', behavior: 'smooth' }],
];

describe.each(CASES)('%s', (source, id, expected) => {
  it('English, through core’s parser', async () => {
    const [call] = await scrolls(source, 'en');
    expect(call[0]).toBe(id);
    expect(call[1]).toMatchObject(expected);
  });

  it.each(FOREIGN)('%s scrolls as the English does', async language => {
    const english = await scrolls(source, 'en');
    vi.restoreAllMocks();
    expect(await scrolls(source, language)).toEqual(english);
  });
});
