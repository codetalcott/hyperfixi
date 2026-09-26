/**
 * `empty` removes its targets' children, in English and in every translation.
 *
 * The AOT had no `empty` codegen, so the handler compiled to nothing (with a
 * warning that it looked empty). On both engines `empty #list` and `empty
 * .box` remove the children of each element named, and a bare `empty` those of
 * the element it runs on. Each case compiles the handler, runs it on #host as
 * a click would, and counts children.
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
    '<div id="host"><i>h</i></div><ul id="list"><li>a</li><li>b</li></ul>' +
    '<div class="box" id="b1"><i>1</i></div><div class="box" id="b2"><i>2</i></div>';
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

/** Each element's child count, by id. */
const counts = (): Record<string, number> =>
  Object.fromEntries(
    ['host', 'list', 'b1', 'b2'].map(id => [id, document.getElementById(id)!.children.length])
  );

// Each handler with the child counts both engines leave.
const CASES: Array<[string, Record<string, number>]> = [
  ['on click empty #list', { host: 1, list: 0, b1: 1, b2: 1 }],
  ['on click empty .box', { host: 1, list: 2, b1: 0, b2: 0 }],
  ['on click empty', { host: 0, list: 2, b1: 1, b2: 1 }],
];

describe.each(LANGUAGES)('%s', language => {
  it.each(CASES)('%s', (code, expected) => {
    click(code, language);
    expect(counts()).toEqual(expected);
  });
});
