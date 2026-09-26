/**
 * A `go`/`scroll` to a position, or with `smoothly`/`instantly`, compiles to
 * the scroll it names, in English and in every translation.
 *
 * The scroll codegen read the element from the positional arg only, and core's
 * parser writes the element of `scroll to top of #d1` to `of`: it compiled to
 * scrolling the clicked element. Neither codegen read the position, and
 * `instantly` compiled to `auto`. Each case compiles the command, runs it on
 * #host as a click would, and checks the scrollIntoView call.
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
});

function source(code: string, language: string): string {
  if (language === 'en') return code;
  const node = parse(code, 'en');
  if (!node) throw new Error(`no English parse: ${code}`);
  return render(node, language);
}

type Scroll = [string, ScrollIntoViewOptions | boolean | undefined];

/** Compile `code` in `language`, call the handler on #host, return the scrolls. */
function scrolls(code: string, language: string): Scroll[] {
  const calls: Scroll[] = [];
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (
    this: Element,
    options?: ScrollIntoViewOptions | boolean
  ) {
    calls.push([this.id || this.tagName.toLowerCase(), options]);
  });
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
  return calls;
}

// Each form with the element and options both engines scroll with.
const CASES: Array<[string, string, Partial<ScrollIntoViewOptions>]> = [
  ['on click go to top of #d1', 'd1', { block: 'start' }],
  ['on click go to the bottom of #d1 smoothly', 'd1', { block: 'end', behavior: 'smooth' }],
  ['on click go to right of me', 'host', { inline: 'end' }],
  ['on click scroll to top of #d1', 'd1', { block: 'start' }],
  ['on click scroll to the bottom of #d1', 'd1', { block: 'end' }],
  ['on click scroll to middle of body', 'body', { block: 'center' }],
  ['on click scroll to #d1 smoothly', 'd1', { behavior: 'smooth' }],
  ['on click scroll to #d1 instantly', 'd1', { behavior: 'instant' }],
  ['on click scroll to top of #d1 smoothly', 'd1', { block: 'start', behavior: 'smooth' }],
];

describe.each(LANGUAGES)('%s', language => {
  it.each(CASES)('%s', (code, id, expected) => {
    const calls = scrolls(code, language);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(id);
    expect(calls[0][1]).toMatchObject(expected);
  });
});
