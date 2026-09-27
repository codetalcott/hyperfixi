/**
 * `#d1's textContent` in a condition compiles to the property read in the
 * languages that write the possessive owner first.
 *
 * A translation reaches the AOT through semantic's AST. Where the possessive
 * marker sits between owner and property (ja `#d1のtextContent`), the marker
 * stayed in the condition, which the expression parser read as the bare `#d1`,
 * so the condition was always true. Each case compiles the handler, runs it on
 * #host as a click would, and reads #out.
 *
 * @vitest-environment happy-dom
 */
import vm from 'node:vm';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { parse, render } from '@lokascript/semantic';
import * as runtime from '../runtime/aot-runtime.js';
import { AOTCompiler, createMultilingualCompiler } from './aot-compiler.js';

const LANGUAGES = ['en', 'bn', 'hi', 'ja', 'ko', 'tl', 'vi', 'zh'] as const;

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
  const result = compiler.compileScript(text, { language });
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
  [`#d1's textContent is "d"`, 'yes'],
  [`#d1's textContent is "z"`, 'no'],
];

describe.each(LANGUAGES)('%s', language => {
  it.each(CASES)('if %s', (condition, expected) => {
    click(`on click if ${condition} put "yes" into #out else put "no" into #out end`, language);
    expect(document.getElementById('out')!.textContent).toBe(expected);
  });
});
