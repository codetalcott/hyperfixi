/**
 * `the X of Y` in a condition compiles to the property read, in English and in
 * every translation.
 *
 * A translation reaches the AOT through semantic's AST, whose expression parser
 * read `the` as a variable and lost the rest of the condition; it builds core's
 * `propertyOfExpression` now, which the interchange converter reads as
 * `Y's X`, as core's converter does for English. Each case compiles the
 * handler, runs it on #host as a click would, and reads #out.
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
  document.body.innerHTML = '<div id="host"></div><p id="d1">d</p><div id="out">o</div>';
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

// Each condition with the branch both engines take.
const CASES: Array<[string, string]> = [
  ['the textContent of #d1 is "d"', 'yes'],
  ['the textContent of #d1 is "z"', 'no'],
];

describe.each(LANGUAGES)('%s', language => {
  it.each(CASES)('if %s', (condition, expected) => {
    click(`on click if ${condition} put "yes" into #out else put "no" into #out end`, language);
    expect(document.getElementById('out')!.textContent).toBe(expected);
  });
});
