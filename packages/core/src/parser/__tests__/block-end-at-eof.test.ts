/**
 * An open block may omit its `end` at END OF INPUT — upstream's rule, and
 * nowhere else.
 *
 * Upstream closes repeat / if / tell / `start view transition` with
 * `if (parser.hasMore()) parser.requireToken("end")`: once no tokens remain the
 * `end` is optional, and before anything else — another handler included — it
 * is required. Core demanded it everywhere except `if`, so the shortest loop in
 * the corpus, `on click repeat 3 times log "x"`, compiled to a DISCARDED
 * command. `init` has no `end` of its own upstream at all (the program loop
 * takes an optional `end` after every feature); core rejected every `init`
 * without one.
 *
 * Every accepted row below was checked on hyperscript.org 0.9.93, and the
 * loops are also RUN — a parse that merely succeeds is how these hid.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '../parser';
import { hyperscript } from '../../api/hyperscript-api';

function cleanParse(src: string) {
  const r = parse(src);
  expect(r.success, `${src}: ${r.error?.message ?? ''}`).toBe(true);
  expect(r.errors ?? [], src).toEqual([]);
  return r;
}

describe('an open block closes at end of input', () => {
  it.each([
    'on click repeat 3 times log "x"',
    'on click repeat for x in [1, 2] log x',
    'on click for x in [1, 2] log x',
    'on click repeat 2 times log "a" else log "b"',
    'on click repeat log "x" until true',
    'on click if true log 1 else log 2',
    'on click start view transition log 1',
    // Comments are nothing: upstream's tokenizer drops them.
    'on click repeat 3 times log "x" -- done',
    'on click if true log 1 -- done',
    // Nested: end of input closes every open block at once.
    'on click repeat 2 times if true log "x"',
    'repeat 3 times add .item',
  ])('%s', src => {
    cleanParse(src);
  });

  it('still requires `end` before another handler', () => {
    // Upstream: "Expected 'end' but found 'on'".
    const r = parse('on click repeat 3 times log "x" on keyup log "y"');
    expect(r.errors?.length ?? 0).toBeGreaterThan(0);
  });

  it('an `end` still closes only the innermost block', () => {
    const r = parse('on click repeat 3 times log "x" end log "after"');
    expect(r.errors ?? []).toEqual([]);
    const commands = (r.node as unknown as { commands: Array<{ name: string }> }).commands;
    expect(commands.map(c => c.name)).toEqual(['repeat', 'log']);
  });
});

describe('`init` needs no `end`', () => {
  it.each([
    'init log 1',
    'init repeat 3 times log "x"',
    'init log 1 on click log 2',
    'init log 1 end on click log 2',
  ])('%s', src => {
    cleanParse(src);
  });

  it('an unterminated init followed by junk is still an error', () => {
    const r = parse('init log 1 qqqq');
    expect(r.success).toBe(false);
  });
});

describe('runs', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="btn"></button><div id="out"></div>';
  });
  const out = () => document.getElementById('out')!.textContent;
  const click = async (src: string) => {
    const btn = document.getElementById('btn')!;
    await hyperscript.eval(src, btn);
    btn.click();
    await new Promise(resolve => setTimeout(resolve, 20));
  };

  it('`repeat 3 times` without `end` runs three times', async () => {
    await click('on click repeat 3 times put "x" at end of #out');
    expect(out()).toBe('xxx');
  });

  it('a nested block without `end` keeps its body', async () => {
    await click('on click repeat 2 times if true put "x" at end of #out');
    expect(out()).toBe('xx');
  });

  it('`init` without `end` runs', async () => {
    await hyperscript.eval('init put "ready" into #out', document.getElementById('btn')!);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(out()).toBe('ready');
  });
});
