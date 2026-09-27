/**
 * Core's comparison phrases compile to JavaScript that runs, in English and in
 * the translations that read them.
 *
 * The AOT wrote a phrase operator as it is (`(n is greater than 2)` is not
 * JavaScript), wrote postfix `exists` and `is empty` in front of their operand,
 * and passed `matches` the element its selector queries rather than the
 * selector. Each case compiles the handler, runs it on #host as a click would,
 * and reads #out.
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
  document.body.innerHTML = '<div id="host"></div><div id="out">o</div><p id="d1" class="x">d</p>';
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

// Each value with what both engines put (n = 3, t = "", #d1 has class x, #zz
// is absent).
const PHRASES: Array<[string, string]> = [
  ['n is greater than 2', 'true'],
  ['n is less than 2', 'false'],
  ['n is greater than or equal to 3', 'true'],
  ['n is less than or equal to 2', 'false'],
  ['n is equal to 3', 'true'],
  ['n is not equal to 3', 'false'],
  ['n equals 3', 'true'],
  ['n is really equal to 3', 'true'],
  ['n is not really equal to 3', 'false'],
  ['#d1 matches .x', 'true'],
  ['#d1 does not match .x', 'false'],
  ['#d1 exists', 'true'],
  ['#zz exists', 'false'],
  ['#zz does not exist', 'true'],
  ['.nope exists', 'false'],
  ['[] exists', 'false'],
  ['[1] exists', 'true'],
  ['t is empty', 'true'],
  ['t is not empty', 'false'],
  ['[] is empty', 'true'],
  ['[] is not empty', 'false'],
  ['(<p/> in #d1) exists', 'false'],
  ['(<p/> in #d1) is empty', 'true'],
  ['#d1 is empty', 'false'],
  ["'' exists", 'true'],
  ['[1, 2] contains 1', 'true'],
  ['[1, 2] includes 3', 'false'],
  ['[1, 2] does not contain 3', 'true'],
  ['n is in [1, 3]', 'true'],
  ['n is not in [1, 3]', 'false'],
];

describe.each(PHRASES)('put %s', (value, expected) => {
  it('en', () => {
    click(`on click set n to 3 then set t to "" then put ${value} into #out`, 'en');
    expect(document.getElementById('out')!.textContent).toBe(expected);
  });
});

// The same phrases from a translation, which reaches the AOT through semantic's
// AST. qu is skipped where its `not` is `mana`, also its `false`.
const TRANSLATED: Array<[string, string, string[]]> = [
  ['n is greater than 2', 'true', []],
  ['#d1 matches .x', 'true', []],
  ['#d1 exists', 'true', []],
  ['#zz does not exist', 'true', ['qu']],
  ['[1, 2] does not contain 3', 'true', ['qu']],
];

describe.each(TRANSLATED)('put %s, translated', (value, expected, broken) => {
  it.each(LANGUAGES.filter(l => l !== 'en' && !broken.includes(l)))('%s', language => {
    click(`on click set n to 3 then set t to "" then put ${value} into #out`, language);
    expect(document.getElementById('out')!.textContent).toBe(expected);
  });
});

// `is a`, as both engines test it (n = 3, t = ""). qu is skipped where its
// `not` is `mana`, also its `false`.
const TYPE_CHECKS: Array<[string, string, string[]]> = [
  ['n is a Number', 'true', LANGUAGES.slice()],
  ['n is not a Number', 'false', LANGUAGES.filter(l => l !== 'qu')],
  ['n is a String', 'false', LANGUAGES.slice()],
  ['n is not a String', 'true', LANGUAGES.filter(l => l !== 'qu')],
  ['t is a String', 'true', LANGUAGES.slice()],
];

describe.each(TYPE_CHECKS)('put %s', (value, expected, languages) => {
  it.each(languages)('%s', language => {
    click(`on click set n to 3 then set t to "" then put ${value} into #out`, language);
    expect(document.getElementById('out')!.textContent).toBe(expected);
  });
});

// Null passes unless `!` follows the type name, and an element is an Element:
// English only, since a translation loses the `!`, renders `null` as a word
// some languages share with `empty`, and translates `Element` (es `elemento`),
// all filed.
it.each([
  ['u is a Number', 'true'],
  ['u is a Number!', 'false'],
  ['#d1 is an Element', 'true'],
])('put %s (en)', (value, expected) => {
  click(`on click set u to null then put ${value} into #out`, 'en');
  expect(document.getElementById('out')!.textContent).toBe(expected);
});
