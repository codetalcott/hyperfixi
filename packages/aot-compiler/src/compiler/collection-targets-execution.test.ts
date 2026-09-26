/**
 * A class or query target reaches every match, in English and in every
 * translation.
 *
 * Every non-id selector compiled to `document.querySelector`, so a command
 * reached the first match only: `remove .active from .tab` left every other
 * tab active. Both engines act on each match. Each case compiles the command,
 * runs it on #host as a click would, and checks both `.it` elements.
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
let got: string[];

beforeAll(async () => {
  compiler = await createMultilingualCompiler();
  (globalThis as Record<string, unknown>)._rt = runtime;
});

beforeEach(() => {
  document.body.innerHTML =
    '<div id="host"></div>' +
    '<div class="it a" id="i1" style="display: none">1</div>' +
    '<div class="it a" id="i2" style="display: none">2</div>' +
    '<p>p</p><p>p</p>';
  got = [];
  for (const el of document.querySelectorAll('.it')) {
    el.addEventListener('foo', () => got.push(el.id));
  }
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

const items = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('#i1, #i2')];

// Each command with what both engines leave on each `.it`.
const CASES: Array<[string, () => unknown, unknown]> = [
  ['on click add .b to .it', () => items().map(e => e.classList.contains('b')), [true, true]],
  [
    'on click remove .a from .it',
    () => items().map(e => e.classList.contains('a')),
    [false, false],
  ],
  ['on click toggle .b on .it', () => items().map(e => e.classList.contains('b')), [true, true]],
  ['on click show .it', () => items().map(e => e.style.display === 'none'), [false, false]],
  ['on click put "x" into .it', () => items().map(e => e.textContent), ['x', 'x']],
  ['on click send foo to .it', () => got, ['i1', 'i2']],
  ['on click remove <p/>', () => document.querySelectorAll('p').length, 0],
  [
    'on click take .a from .it',
    () => [...items().map(e => e.classList.contains('a')), host().classList.contains('a')],
    [false, false, true],
  ],
];

function host(): HTMLElement {
  return document.getElementById('host')!;
}

describe.each(LANGUAGES)('%s', language => {
  it.each(CASES)('%s', (code, read, expected) => {
    click(code, language);
    expect(read()).toEqual(expected);
  });

  // An id names one element on both engines, even when it is duplicated.
  it('on click hide #dup hides the first #dup only', () => {
    document.body.insertAdjacentHTML('beforeend', '<div id="dup">a</div><div id="dup">b</div>');
    click('on click hide #dup', language);
    const dups = [...document.querySelectorAll<HTMLElement>('[id="dup"]')];
    expect(dups.map(e => e.style.display)).toEqual(['none', '']);
  });

  it('on click hide .it', () => {
    for (const el of items()) el.style.display = '';
    click('on click hide .it', language);
    expect(items().map(e => e.style.display)).toEqual(['none', 'none']);
  });
});
