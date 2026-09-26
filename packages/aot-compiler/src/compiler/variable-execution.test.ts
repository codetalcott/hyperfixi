/**
 * A variable keeps its scope when compiled, in English and in every
 * translation.
 *
 * The set, increment, decrement and default codegens handled `variable`
 * nodes, and both converters handed them identifiers: every `set x`, `set :x`
 * and `set $x` compiled to nothing, and `on click set $x to 5` to an empty
 * handler. The converters also dropped `:x`'s element scope, so `:x` and a
 * bare `x` were one variable, and a read of either compiled to a bare JS `x`,
 * which throws. On both engines `:x` persists on its element across the
 * handler's runs, a bare `x` lasts one run, and `$x` is global. Each case
 * compiles the handler once and clicks #host three times.
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
  document.body.innerHTML = '<div id="host"></div><div id="out">o</div>';
  runtime.globals.clear();
});

function source(code: string, language: string): string {
  if (language === 'en') return code;
  const node = parse(code, 'en');
  if (!node) throw new Error(`no English parse: ${code}`);
  return render(node, language);
}

/** Compile `code` in `language`, click #host three times, return #out after each. */
function clicks(code: string, language: string): Array<string | null> {
  const text = source(code, language);
  // qu handlers parse at confidence 0.556 (loop-execution.test.ts), hence 0.5.
  const result = compiler.compileScript(text, { language, confidenceThreshold: 0.5 });
  expect(result.success, `${language}: ${text} ${JSON.stringify(result.errors)}`).toBe(true);
  const name = /function\s+(_handler_\w+)/.exec(result.code!)![1];
  const g = globalThis as Record<string, unknown>;
  g.__host = document.getElementById('host');
  const seen: Array<string | null> = [];
  vm.runInThisContext(result.code!);
  for (let i = 0; i < 3; i++) {
    g.__click = new Event('click');
    vm.runInThisContext(`${name}.call(globalThis.__host, globalThis.__click)`, { timeout: 1000 });
    seen.push(document.getElementById('out')!.textContent);
  }
  return seen;
}

// Each handler with the #out both engines show after each of three clicks.
const CASES: Array<[string, string[]]> = [
  ['on click increment :count then put :count into #out', ['1', '2', '3']],
  ['on click decrement :n then put :n into #out', ['-1', '-2', '-3']],
  ['on click increment x then put x into #out', ['1', '1', '1']],
  ['on click increment $g then put $g into #out', ['1', '2', '3']],
  ['on click set x to 5 then put x into #out', ['5', '5', '5']],
  ['on click set :y to 7 then put :y into #out', ['7', '7', '7']],
  ['on click set $z to 9 then put $z into #out', ['9', '9', '9']],
  ['on click set :x to 1 then set x to 2 then put :x into #out', ['1', '1', '1']],
  ['on click set x to 1 then increment x then put x into #out', ['2', '2', '2']],
  ['on click default :d to 7 then put :d into #out', ['7', '7', '7']],
  // A variable counts as a number, from a string too.
  ['on click set x to "5" then increment x then put x into #out', ['6', '6', '6']],
];

describe.each(LANGUAGES)('%s', language => {
  it.each(CASES)('%s', (code, expected) => {
    expect(clicks(code, language)).toEqual(expected);
  });
});
