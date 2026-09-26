/**
 * `toCoreAST` gives back control flow that core RUNS.
 *
 * It wrote loops and `if`s in shapes core never reads: `loopVariant`, `count`
 * and `condition` on the node, `condition`/`thenBranch` beside empty args. So
 * every one it converted threw, "repeat command requires a loop type" or "if
 * command requires a condition to evaluate". It now writes the shape core's
 * parser builds.
 *
 * Each case parses a handler, converts it to interchange and back, installs the
 * result and clicks it. The effect must be the one the original parse has; each
 * expected value was measured on upstream hyperscript 0.9.93 in jsdom.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';
import { fromCoreAST } from './from-core';
import { toCoreAST } from './to-core';

beforeEach(() => {
  document.body.innerHTML =
    '<div id="host"></div><i class="i"></i><i class="i"></i><div id="out"></div>';
});

function host(): HTMLElement {
  return document.getElementById('host')!;
}

function parse(src: string): unknown {
  const compiled = hyperscript.compileSync(src);
  expect(compiled.ok, src).toBe(true);
  return compiled.ast;
}

/** Install `ast` on #host, click it, and describe what it did. */
async function click(ast: unknown, after?: () => void): Promise<string> {
  document.body.innerHTML =
    '<div id="host"></div><i class="i"></i><i class="i"></i><div id="out"></div>';
  await hyperscript.execute(ast as never, hyperscript.createContext(host()));
  host().click();
  if (after) setTimeout(after, 20);
  await new Promise(resolve => setTimeout(resolve, 80));
  const done = document.querySelectorAll('.i.done').length;
  return `${host().className}|${host().textContent}|${done}`;
}

function roundTrip(src: string): unknown {
  return toCoreAST(fromCoreAST(parse(src) as { type: string }));
}

describe('control flow through toCoreAST runs as the parse does', () => {
  it.each([
    [
      'a counted loop',
      'on click repeat 3 times append "x" to me end then add .done to me',
      'done|xxx|0',
    ],
    ['`index i`', 'on click repeat 3 times index i append i to me end', '|012|0'],
    ['a for-in loop', 'on click for p in .i add .done to p end', '||2'],
    ['a for-in `index`', 'on click repeat for p in .i index j append j to me end', '|01|0'],
    ['until', `on click repeat until my innerHTML is "xxx" append "x" to me end`, '|xxx|0'],
    ['while', `on click repeat while my innerHTML is not "xx" append "x" to me end`, '|xx|0'],
    ['bottom-tested', 'on click repeat append "x" to me until true end', '|x|0'],
    [
      'forever, ended by an `if … break`',
      `on click repeat forever append "x" to me if my innerHTML is "xxx" break end end`,
      '|xxx|0',
    ],
    [
      '`else` when no pass ran',
      'on click repeat for p in .none add .done to p else add .else to me end',
      'else||0',
    ],
    [
      'if / else',
      `on click if my innerHTML is "" add .empty to me else add .full to me end`,
      'empty||0',
    ],
    ['unless', `on click unless my innerHTML is "x" add .u to me end`, 'u||0'],
  ])('%s', async (_, src, effect) => {
    expect(await click(parse(src))).toBe(effect);
    expect(await click(roundTrip(src))).toBe(effect);
  });

  // Each pass appends an `x`; once `stop` arrives on #out the count must hold.
  it.each([
    ['the parse', parse],
    ['toCoreAST', roundTrip],
  ])('`until event … from` stops when the event arrives: %s', async (_, build) => {
    const ast = build('on click repeat until event stop from #out append "x" to me wait 5ms end');
    await click(ast, () => document.getElementById('out')!.dispatchEvent(new Event('stop')));
    const passes = host().textContent!.length;
    expect(passes).toBeGreaterThan(0);
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(host().textContent!.length).toBe(passes);
  });
});
