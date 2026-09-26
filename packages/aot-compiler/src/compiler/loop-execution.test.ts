/**
 * An AOT-compiled loop RUNS, and does what upstream `_hyperscript` does.
 *
 * Both interchange converters read the pre-slot POSITIONAL `repeat`, where
 * `args[0]` named the form. Core's parser has carried the form and its operands
 * as slots since Arc 3 step 3, and semantic's `buildLoop` since #1176, so every
 * parsed loop fell through to `forever`: `repeat 3 times … end` compiled to
 * `while (true) { … }`, a hung page reported as `success: true`, in every
 * language. The rest of the loop never reached codegen either: `until event`
 * had no case and spun without yielding, `index i` was ignored, a
 * bottom-tested loop ran top-tested, and `else` was dropped.
 *
 * Every expectation was measured on upstream hyperscript.org 0.9.93 in jsdom,
 * the oracle. Each handler runs under a `vm` timeout, so a loop that hangs
 * fails its test instead of freezing the run.
 *
 * The loops append to `me` and test with possessives on purpose: `append … to
 * #out` and `my prop` hit AOT gaps that have nothing to do with loops (filed in
 * PARSER_NEXT_STEPS.md).
 *
 * @vitest-environment happy-dom
 */

import vm from 'node:vm';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { parse, render } from '@lokascript/semantic';
import * as runtime from '../runtime/aot-runtime.js';
import { AOTCompiler, createMultilingualCompiler } from './aot-compiler.js';
import type { CompilationResult, EventHandlerNode, RepeatNode } from '../types/aot-types.js';

const FOREIGN = [
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
    '<div id="host"></div><i class="i"></i><i class="i"></i><div id="out"></div>';
});

function host(): HTMLElement {
  return document.getElementById('host')!;
}

/**
 * Call a compiled handler on #host, as a click would. The synchronous part
 * runs under a 1s `vm` timeout; an async handler's promise is returned.
 */
function run(result: CompilationResult, label: string): unknown {
  expect(result.success, `${label} ${JSON.stringify(result.errors)}`).toBe(true);
  const name = /function\s+(_handler_\w+)/.exec(result.code!)![1];
  const g = globalThis as Record<string, unknown>;
  g.__host = host();
  g.__click = new Event('click');
  return vm.runInThisContext(
    `${result.code}\n${name}.call(globalThis.__host, globalThis.__click)`,
    {
      timeout: 1000,
    }
  );
}

/**
 * Compile `code` and run it. qu handlers parse at confidence 0.556 in every
 * program, loop or not, under the default 0.7 floor (filed), hence the 0.5.
 */
function click(code: string, language = 'en'): unknown {
  const result = compiler.compileScript(code, { language, confidenceThreshold: 0.5 });
  return run(result, `${language}: ${code}`);
}

function translate(source: string, language: string): string {
  const node = parse(source, 'en');
  if (!node) throw new Error(`no English parse: ${source}`);
  return render(node, language);
}

describe('each loop form runs as upstream runs it', () => {
  it.each([
    ['a counted loop', 'on click repeat 3 times append "x" to me end', 'xxx'],
    ['`index i`', 'on click repeat 3 times index i append i to me end', '012'],
    [
      'until, top-tested',
      `on click repeat until #host's innerHTML is "xxx" append "x" to me end`,
      'xxx',
    ],
    [
      'while, top-tested',
      `on click repeat while #host's innerHTML is not "xx" append "x" to me end`,
      'xx',
    ],
    // Bottom-tested: the body runs once before the first test, so a condition
    // that already stops the loop still lets one pass through.
    ['until, bottom-tested', 'on click repeat append "x" to me until true end', 'x'],
    ['while, bottom-tested', 'on click repeat append "x" to me while false end', 'x'],
    [
      'forever, ended by break',
      `on click repeat forever append "x" to me if #host's innerHTML is "xxx" break end end`,
      'xxx',
    ],
    ['for-in with `index`', 'on click for p in .i index j append j to me end', '01'],
  ])('%s', (_, code, text) => {
    click(code);
    expect(host().textContent).toBe(text);
  });

  it.each([
    ['repeat for', 'on click repeat for p in .i add .done to p end'],
    ['bare for', 'on click for p in .i add .done to p end'],
  ])('%s binds the variable to each match of the selector', (_, code) => {
    click(code);
    expect(document.querySelectorAll('.i.done')).toHaveLength(2);
  });

  // Upstream runs no pass over an undefined collection; `Array.from(undefined)`
  // threw.
  it('a for-in over an undefined collection runs no pass, and moves on', () => {
    click(`on click for x in #host's nothing add .ran to me end then add .after to me`);
    expect(host().className).toBe('after');
  });

  it('runs what follows the `end` once, after the loop', () => {
    click('on click repeat 3 times append "x" to me end then append "!" to me');
    expect(host().textContent).toBe('xxx!');
  });
});

describe('`else` runs only when no pass ran', () => {
  it.each([
    [
      'a for-in over nothing',
      'on click repeat for p in .none add .done to p else add .else to me end',
      true,
    ],
    ['zero times', 'on click repeat 0 times add .ran to me else add .else to me end', true],
    ['two times', 'on click repeat 2 times add .ran to me else add .else to me end', false],
  ])('%s', (_, code, elseRan) => {
    click(code);
    expect(host().classList.contains('else')).toBe(elseRan);
  });
});

describe('`until event` yields a tick per pass, so the event can end it', () => {
  it('listens on the element by default', async () => {
    const run = click(
      'on click repeat until event stop append "x" to me wait 10ms end then add .stopped to me'
    );
    setTimeout(() => host().dispatchEvent(new Event('stop')), 40);
    await run;
    expect(host().classList.contains('stopped')).toBe(true);
    const passes = host().textContent!.length;
    expect(passes).toBeGreaterThan(0);
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(host().textContent!.length).toBe(passes);
  });

  // No async command in the body: without the tick this spins forever and
  // hangs the page (the vm timeout catches it here).
  it('listens where `from` says, with a body that never awaits', async () => {
    const run = click('on click repeat until event stop from #out add .ran to me end');
    setTimeout(() => document.getElementById('out')!.dispatchEvent(new Event('stop')), 20);
    await run;
    expect(host().classList.contains('ran')).toBe(true);
  });
});

// LoopUnrollingPass turns a small counted loop into a `sequence` of body
// copies, and codegen had no `sequence` case: the loop compiled to NOTHING. A
// parsed count is a node, not a number, so only compileAST reaches the pass.
it('an unrolled counted loop runs its passes', () => {
  const handler = compiler.parse('on click append "x" to me') as EventHandlerNode;
  const loop: RepeatNode = { type: 'repeat', count: 3, body: handler.body ?? [] };
  const result = compiler.compileAST({ ...handler, body: [loop] }, { optimizationLevel: 2 });
  expect(result.metadata.optimizationsApplied).toContain('loop-unrolling');
  run(result, 'unrolled');
  expect(host().textContent).toBe('xxx');
});

describe('a counted loop runs in every language', () => {
  const SOURCE = 'on click repeat 3 times append "x" to me end then add .done to me';

  it.each(FOREIGN)('%s', language => {
    click(translate(SOURCE, language), language);
    expect(host().textContent).toBe('xxx');
    expect(host().classList.contains('done')).toBe(true);
  });
});

describe('a for-in loop binds its variable in every language', () => {
  const SOURCE = 'on click for item in .i add .done to item end then add .after to me';

  it.each(FOREIGN)('%s', language => {
    click(translate(SOURCE, language), language);
    expect(document.querySelectorAll('.i.done')).toHaveLength(2);
    expect(host().classList.contains('after')).toBe(true);
  });
});
