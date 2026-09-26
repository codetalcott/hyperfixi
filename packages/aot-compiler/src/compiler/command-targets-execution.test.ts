/**
 * A command acts on the target it names, in English and in every translation.
 *
 * Core's parser, and semantic's buildAST, which emits core's shape, put a
 * command's target in a slot: the first arg (`hide #d1`) or the modifier named
 * for its preposition (`toggle .t on #d1`, `send foo to #d1`, `take .a from
 * #d1`). These codegens read only `node.target`, which few producers set, so
 * every explicit target compiled to `me`: `hide #d1` hid the element that was
 * clicked. `remove #d1` compiled to removing a class `#d1` from `me`, and
 * toggle's branch for a target other than `me` toggled the class NAME read as
 * a tag selector (`querySelectorAll('t')`). Each case compiles the command,
 * runs it on #host as a click would, and checks that the named element changed
 * and #host did not.
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
    '<div id="host"></div><div id="d1" class="a"><i>i</i></div><input id="in1">';
});

const byId = (id: string): HTMLElement | null => document.getElementById(id);

function source(code: string, language: string): string {
  if (language === 'en') return code;
  const node = parse(code, 'en');
  if (!node) throw new Error(`no English parse: ${code}`);
  return render(node, language);
}

/** Compile `code` in `language` and call the handler on #host, as a click would. */
function click(code: string, language: string): unknown {
  const text = source(code, language);
  // qu handlers parse at confidence 0.556 (loop-execution.test.ts), hence 0.5.
  const result = compiler.compileScript(text, { language, confidenceThreshold: 0.5 });
  expect(result.success, `${language}: ${text} ${JSON.stringify(result.errors)}`).toBe(true);
  const name = /function\s+(_handler_\w+)/.exec(result.code!)![1];
  const g = globalThis as Record<string, unknown>;
  g.__host = byId('host');
  g.__click = new Event('click');
  return vm.runInThisContext(
    `${result.code}\n${name}.call(globalThis.__host, globalThis.__click)`,
    {
      timeout: 1000,
    }
  );
}

/** Record which elements receive `foo`. */
function listen(): string[] {
  const got: string[] = [];
  for (const id of ['host', 'd1']) byId(id)!.addEventListener('foo', () => got.push(id));
  return got;
}

describe.each(LANGUAGES)('%s', language => {
  it('toggle .t on #d1', async () => {
    await click('on click toggle .t on #d1', language);
    expect(byId('d1')!.classList.contains('t')).toBe(true);
    expect(byId('host')!.classList.contains('t')).toBe(false);
  });

  it('hide #d1', async () => {
    await click('on click hide #d1', language);
    expect(byId('d1')!.style.display).toBe('none');
    expect(byId('host')!.style.display).toBe('');
  });

  it('show #d1', async () => {
    byId('d1')!.style.display = 'none';
    await click('on click show #d1', language);
    expect(byId('d1')!.style.display).not.toBe('none');
  });

  it('focus #in1', async () => {
    await click('on click focus #in1', language);
    expect(document.activeElement?.id).toBe('in1');
  });

  it('blur #in1', async () => {
    byId('in1')!.focus();
    await click('on click blur #in1', language);
    expect(document.activeElement?.id).not.toBe('in1');
  });

  it('send foo to #d1', async () => {
    const got = listen();
    await click('on click send foo to #d1', language);
    expect(got).toEqual(['d1']);
  });

  it('trigger foo on #d1', async () => {
    const got = listen();
    await click('on click trigger foo on #d1', language);
    expect(got).toEqual(['d1']);
  });

  it('append "x" to #d1', async () => {
    await click('on click append "x" to #d1', language);
    expect(byId('d1')!.textContent).toBe('ix');
    expect(byId('host')!.textContent).toBe('');
  });

  it('remove #d1', async () => {
    await click('on click remove #d1', language);
    expect(byId('d1')).toBeNull();
    expect(byId('host')).not.toBeNull();
  });

  it('take .a from #d1', async () => {
    // Only #d1 gives it up, on both engines: #sib keeps its `.a`.
    byId('host')!.insertAdjacentHTML('afterend', '<div id="sib" class="a"></div>');
    await click('on click take .a from #d1', language);
    expect(byId('d1')!.classList.contains('a')).toBe(false);
    expect(byId('sib')!.classList.contains('a')).toBe(true);
    expect(byId('host')!.classList.contains('a')).toBe(true);
  });

  it('scroll to #d1', async () => {
    const scrolled: string[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.id);
    };
    try {
      await click('on click scroll to #d1', language);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
    expect(scrolled).toEqual(['d1']);
  });

  it('settle #d1 compiles against #d1', () => {
    const text = source('on click settle #d1', language);
    const result = compiler.compileScript(text, { language, confidenceThreshold: 0.5 });
    expect(result.code, text).toContain(`_rt.settle(document.getElementById('d1')`);
  });
});
