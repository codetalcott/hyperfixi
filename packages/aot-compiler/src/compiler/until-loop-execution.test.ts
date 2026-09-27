/**
 * `repeat until <condition>` compiles to a loop that stops, in English and in
 * every translation.
 *
 * A translation reaches the AOT through semantic's AST, which lost the
 * condition of every translated `until` loop (no language but English had a
 * head pattern for the form, and English's put the condition where the AST
 * builder does not read it). The loop never ended; the vm timeout below turns
 * that into a failure. Each case compiles the handler, runs it on #host as a
 * click would, and reads #out.
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

// Each start with the n both engines put: counted up to 4, or never started.
const STARTS: Array<[number, string]> = [
  [0, '4'],
  [5, '5'],
];

describe.each(LANGUAGES)('%s', language => {
  it.each(STARTS)('repeat until n > 3, from n = %s', (start, expected) => {
    click(
      `on click set n to ${start} then repeat until n > 3 increment n end then put n into #out`,
      language
    );
    expect(document.getElementById('out')!.textContent).toBe(expected);
  });
});
