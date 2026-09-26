/**
 * true, false and null compile to themselves, in English and in every
 * translation.
 *
 * A translation reaches the AOT through semantic's AST, where the keyword was
 * an untyped STRING literal: `set #d1.disabled to false` compiled to
 * `.disabled = "false"` and left the button disabled, and `set x to true then
 * if x is true` took the else branch. Each case compiles the handler, runs it
 * on #host as a click would, and reads the page.
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

// hi/qu/tr render null with their word for "empty", which reads back as the
// `empty` command, and sw/vi read theirs back as the word `empty`. Filed.
const NULL_IS_EMPTY = new Set(['hi', 'qu', 'sw', 'tr', 'vi']);

let compiler: AOTCompiler;

beforeAll(async () => {
  compiler = await createMultilingualCompiler();
  (globalThis as Record<string, unknown>)._rt = runtime;
});

beforeEach(() => {
  document.body.innerHTML =
    '<div id="host"></div><button id="d1" disabled>d</button><div id="out">o</div>';
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

const out = (): string => document.getElementById('out')!.textContent!;

describe.each(LANGUAGES)('%s', language => {
  it('set #d1.disabled to false', () => {
    click('on click set #d1.disabled to false', language);
    expect((document.getElementById('d1') as HTMLButtonElement).disabled).toBe(false);
  });

  it('set x to true then if x is true', () => {
    click(
      'on click set x to true then if x is true put "yes" into #out else put "no" into #out end',
      language
    );
    expect(out()).toBe('yes');
  });

  it('set x to false then if x', () => {
    click(
      'on click set x to false then if x put "yes" into #out else put "no" into #out end',
      language
    );
    expect(out()).toBe('no');
  });

  it.skipIf(NULL_IS_EMPTY.has(language))('set x to null then if x is null', () => {
    click(
      'on click set x to 5 then set x to null then if x is null put "yes" into #out else put "no" into #out end',
      language
    );
    expect(out()).toBe('yes');
  });
});
