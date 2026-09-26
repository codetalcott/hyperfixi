/**
 * A property access (`#d1.value`) compiles to the property, in English and in
 * every translation.
 *
 * Core's parser and semantic's buildAST both hand a non-computed property over
 * as an identifier node, and the member codegen read every node property as
 * computed: `#d1.value` compiled to `document.getElementById('d1')[value]`,
 * which throws (`value` is not a variable). Every dotted access did, through
 * the compilation service and so MCP's `compile_hyperscript`. Each case
 * compiles the command, runs it on #host as a click would, and checks #out.
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
  document.body.innerHTML = '<div id="host"></div><input id="d1" value="v1"><div id="out">o</div>';
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

const out = (): string | null => document.getElementById('out')!.textContent;

// Each form with the #out both engines leave.
const CASES: Array<[string, () => unknown, unknown]> = [
  ['on click put #d1.value into #out', out, 'v1'],
  ['on click set #out.textContent to "a"', out, 'a'],
  ['on click if #d1.value is "v1" put "yes" into #out end', out, 'yes'],
  ['on click put event.type into #out', out, 'click'],
  ['on click put my.tagName into #out', out, 'DIV'],
  ['on click set #out.title to "t"', () => document.getElementById('out')!.title, 't'],
];

describe.each(LANGUAGES)('%s', language => {
  it.each(CASES)('%s', (code, read, expected) => {
    click(code, language);
    expect(read()).toBe(expected);
  });
});

// A chained access. (Semantic's English parse drops this `put` whole, so it
// has no translation to compile yet.)
it('en: put #d1.value.length into #out', () => {
  click('on click put #d1.value.length into #out', 'en');
  expect(out()).toBe('2');
});
