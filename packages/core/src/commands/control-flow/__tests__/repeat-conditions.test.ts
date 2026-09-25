/**
 * `repeat while` / `repeat until` loops RE-EVALUATE their condition.
 *
 * `parseInput` handed the loop the condition's AST NODE, and the loop's
 * `evaluateCondition` read any object as truthy: `repeat while $n < 3` spun to
 * the 10,000-iteration safety cap and `repeat until $n is 3` never ran its body
 * — while the same conditions evaluated correctly anywhere else. Every unit
 * test passed a plain boolean (one said "we can't easily test while loop
 * without a full evaluator"), so these are run through the real parser and
 * runtime. Each expectation was measured on hyperscript.org 0.9.93.
 *
 * Also here: upstream's implicit-forever form, `repeat <commands> …` with no
 * loop-type word, which core took for a `times` count and discarded — so the
 * bottom-tested `repeat <body> until <cond> end` never parsed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

describe('condition loops', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="btn"></button><div id="out"></div>';
  });

  const run = async (src: string): Promise<string> => {
    const btn = document.getElementById('btn')!;
    await hyperscript.eval(src, btn);
    btn.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    return document.getElementById('out')!.textContent ?? '';
  };

  it.each([
    // top-tested
    ['on click set $n to 0 then repeat while $n < 3 increment $n end then put $n into #out', '3'],
    ['on click set $n to 0 then repeat until $n is 3 increment $n end then put $n into #out', '3'],
    ['on click set $n to 5 then repeat while $n < 3 increment $n end then put $n into #out', '5'],
    // bottom-tested: the body runs once before the first check
    [
      'on click set :n to 0 then repeat forever increment :n then put "x" at end of #out until :n is 3 end',
      'xxx',
    ],
    ['on click set :n to 5 then repeat forever put "x" at end of #out while :n < 3 end', 'x'],
    // implicit forever — no loop-type word
    [
      'on click set :n to 0 then repeat increment :n then put "x" at end of #out until :n is 3 end',
      'xxx',
    ],
    [
      'on click set :n to 0 then repeat increment :n then put "x" at end of #out while :n < 3',
      'xxx',
    ],
    // an index variable alongside a condition
    [
      'on click set $n to 0 then repeat while $n < 3 index i increment $n then put i at end of #out end',
      '012',
    ],
  ])('%s', async (src, expected) => {
    expect(await run(src)).toBe(expected);
  });
});
