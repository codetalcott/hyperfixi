/**
 * An array, an attribute and `the X of Y` compile, in English and in every
 * translation.
 *
 * Core's parser and semantic's buildAST emit `arrayLiteral`,
 * `attributeAccess` (`@title`) and, from core, `propertyOfExpression` (`the
 * value of #d1`), and neither interchange converter knew them. Core's made an
 * `error` node, and compileScript threw `Unknown expression type: error`;
 * semantic's made a `null` literal, so a translated `set x to ["a", "b"]` set
 * `x` to null and `set @title` was dropped. Each case compiles the handler,
 * runs it on #host as a click would, and checks #out.
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

// Each handler with the #out both engines leave.
const CASES: Array<[string, string]> = [
  ['on click set x to ["a", "b"] then put x.length into #out', '2'],
  ['on click repeat for k in ["a", "b"] put k into #out end', 'b'],
  ['on click set @title to "t" then put @title into #out', 't'],
  ['on click put the value of #d1 into #out', 'v1'],
  ['on click set x to the value of #d1 then put x into #out', 'v1'],
];

describe.each(LANGUAGES)('%s', language => {
  it.each(CASES)('%s', (code, expected) => {
    click(code, language);
    expect(document.getElementById('out')!.textContent).toBe(expected);
  });
});
