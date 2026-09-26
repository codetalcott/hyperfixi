/**
 * `go` compiles to what it means, in English and in every translation.
 *
 * The go codegen read every destination but `back`/`forward` as a URL and
 * ignored `in new window`. So `go to #d1` compiled to `window.location.href =
 * document.getElementById('d1')`, which navigates to "[object HTMLDivElement]"
 * where both engines scroll #d1 into view, and `go to url "/x" in new window`
 * replaced the current page. The destination is now read at run time, as
 * upstream reads it (`_rt.go`). Each case compiles the command, runs it on
 * #host as a click would, and checks what it did.
 *
 * @vitest-environment happy-dom
 */
import vm from 'node:vm';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { parse, render } from '@lokascript/semantic';
import * as runtime from '../runtime/aot-runtime.js';
import { AOTCompiler, createMultilingualCompiler } from './aot-compiler.js';

const LANGUAGES = [
  'en',
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

let compiler: AOTCompiler;

beforeAll(async () => {
  compiler = await createMultilingualCompiler();
  (globalThis as Record<string, unknown>)._rt = runtime;
});

beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div><div id="d1"></div>';
});

afterEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
});

function source(code: string, language: string): string {
  if (language === 'en') return code;
  const node = parse(code, 'en');
  if (!node) throw new Error(`no English parse: ${code}`);
  return render(node, language);
}

/** Compile `code` in `language` and call the handler on #host, as a click would. */
function click(code: string, language: string): void {
  const text = source(code, language);
  // qu handlers parse at confidence 0.556 (loop-execution.test.ts), hence 0.5.
  const result = compiler.compileScript(text, { language, confidenceThreshold: 0.5 });
  expect(result.success, `${language}: ${text} ${JSON.stringify(result.errors)}`).toBe(true);
  const name = /function\s+(_handler_\w+)/.exec(result.code!)![1];
  const g = globalThis as Record<string, unknown>;
  g.__host = document.getElementById('host');
  g.__click = new Event('click');
  vm.runInThisContext(`${result.code}\n${name}.call(globalThis.__host, globalThis.__click)`, {
    timeout: 1000,
  });
}

/** Record the ids of the elements scrolled into view. */
function scrolled(): string[] {
  const ids: string[] = [];
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
    ids.push(this.id);
  });
  return ids;
}

describe.each(LANGUAGES)('%s', language => {
  it('go to #d1 scrolls #d1 into view', () => {
    const ids = scrolled();
    click('on click go to #d1', language);
    expect(ids).toEqual(['d1']);
  });

  it('go to me scrolls me into view', () => {
    const ids = scrolled();
    click('on click go to me', language);
    expect(ids).toEqual(['host']);
  });

  it('go to url "#frag" sets the hash', () => {
    click('on click go to url "#frag"', language);
    expect(window.location.hash).toBe('#frag');
  });

  it('go to url "/x" in new window opens a window', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    click('on click go to url "/x" in new window', language);
    expect(open).toHaveBeenCalledWith('/x', '_blank');
  });

  it('go to /x in new window opens a window', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    click('on click go to /x in new window', language);
    expect(open).toHaveBeenCalledWith('/x', '_blank');
  });

  it('go back goes back', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    click('on click go back', language);
    expect(back).toHaveBeenCalledOnce();
  });

  it('go forward goes forward', () => {
    const forward = vi.spyOn(window.history, 'forward').mockImplementation(() => {});
    click('on click go forward', language);
    expect(forward).toHaveBeenCalledOnce();
  });
});
