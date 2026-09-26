/**
 * A scoped query (`<li/> in #list`) compiles to the matches inside its scope,
 * in English and in every translation.
 *
 * The binary codegen had no `in` case, so the query compiled to JavaScript's
 * `in` operator, which tests a property key: `add .a to <li/> in #list`
 * became `(document.querySelector('li') in document.getElementById('list'))
 * .classList.add('a')`, and `remove <li/> in #list` removed a class from me.
 * Both engines act on each `li` inside #list and leave the rest alone. Each
 * case compiles the handler, runs it on #host as a click would, and checks
 * the lists.
 *
 * @vitest-environment happy-dom
 */
import vm from 'node:vm';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
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
  document.body.innerHTML =
    '<div id="host"></div><ul id="list"><li>a</li><li>b</li></ul>' +
    '<ul id="other"><li>c</li></ul><div id="out">o</div>';
});

function source(code: string, language: string): string {
  if (language === 'en') return code;
  const node = parse(code, 'en');
  if (!node) throw new Error(`no English parse: ${code}`);
  return render(node, language);
}

/** Compile `code` in `language`, call the handler on #host as a click would. */
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

/** Each `li`, as `text:class`. */
const lis = (): string[] =>
  [...document.querySelectorAll('li')].map(e => `${e.textContent}:${e.className || '-'}`);
const out = (): string | null => document.getElementById('out')!.textContent;

// Each handler with what both engines leave.
const CASES: Array<[string, () => unknown, unknown]> = [
  ['on click add .a to <li/> in #list', lis, ['a:a', 'b:a', 'c:-']],
  ['on click put "x" into <li/> in #list', lis, ['x:-', 'x:-', 'c:-']],
  ['on click set x to <li/> in #list then put x.length into #out', out, '2'],
  ['on click remove <li/> in #list', lis, ['c:-']],
];

describe.each(LANGUAGES)('%s', language => {
  it.each(CASES)('%s', (code, read, expected) => {
    click(code, language);
    expect(read()).toEqual(expected);
  });
});

// A scoped query inside an expression. (Semantic's English parse drops this
// `put` whole, so it has no translation to compile yet.)
it('en: put (<li/> in #list).length into #out', () => {
  click('on click put (<li/> in #list).length into #out', 'en');
  expect(out()).toBe('2');
});
