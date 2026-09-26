/**
 * Consecutive class commands and a selector named twice compile to what both
 * engines do, in English and in every translation.
 *
 * Two optimizations ran on every compile. Class batching merged consecutive
 * add/remove/toggle into one batch, but read each command's target from the
 * `target` field, which core's parser and semantic's buildAST never set, so
 * `add .a to #d1 then add .b to #d1` added both to me. It also applied a
 * batch's adds before its removes and toggles, whatever the source order. The
 * codegen's selector cache wrote `_sel__d1_0` for a selector named twice and
 * never declared it, so the handler threw. Each case compiles the handler,
 * runs it on #host as a click would, and reads the page.
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
    '<div id="host"></div><p id="d1" class="x">d</p>' +
    '<p class="item">1</p><p class="item">2</p><div id="out">o</div>';
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

/** me's classes, #d1's classes and text, the two items' classes, #out, and #z's title. */
function page(): string {
  const d1 = document.getElementById('d1')!;
  const items = [...document.querySelectorAll('body > p:not(#d1)')].map(e => e.className);
  const z = document.getElementById('z');
  return (
    `me=${document.getElementById('host')!.className} d1=${d1.className}:${d1.textContent} ` +
    `items=${items.join('|')} out=${document.getElementById('out')!.textContent}` +
    (z ? ` z=${z.title}` : '')
  );
}

// Each handler with the page both engines leave.
const CASES: Array<[string, string]> = [
  ['on click add .a to #d1 then add .b to #d1', 'me= d1=x a b:d items=item|item out=o'],
  [
    'on click toggle .a on .item then toggle .b on .item',
    'me= d1=x:d items=item a b|item a b out=o',
  ],
  ['on click toggle .a on #d1 then add .a to #d1', 'me= d1=x a:d items=item|item out=o'],
  ['on click remove .x from #d1 then add .x to #d1', 'me= d1=x:d items=item|item out=o'],
  ['on click remove .item from .item then add .b to .item', 'me= d1=x:d items=| out=o'],
  [
    'on click add .a to #d1 then remove .x from #d1 then toggle .t on #d1',
    'me= d1=a t:d items=item|item out=o',
  ],
  ['on click toggle .a then add .a', 'me=a d1=x:d items=item|item out=o'],
  ['on click remove .a then add .a', 'me=a d1=x:d items=item|item out=o'],
  ['on click toggle .a on me then remove .a', 'me= d1=x:d items=item|item out=o'],
  [
    'on click set #d1.textContent to "b" then put #d1.textContent into #out',
    'me= d1=x:b items=item|item out=b',
  ],
  [
    'on click put "<p id=z>a</p>" into #host then set #z.title to "b" then put "<p id=z>new</p>" into #host then set #z.title to "c"',
    'me= d1=x:d items=item|item out=o z=c',
  ],
];

describe.each(LANGUAGES)('%s', language => {
  it.each(CASES)('%s', (code, expected) => {
    click(code, language);
    expect(page()).toBe(expected);
  });
});
