/**
 * `beep!` in EXPRESSION position — upstream's BeepExpression.
 *
 * Upstream lexes `beep!` as one token and parses it as a prefix on a unary
 * operand: `set $x to beep! my value` reports `my value` and stores it
 * unchanged. Core split the bang off, read `beep` as a name and discarded
 * `! my value`. Inside a command's arguments it was worse: `log beep! 3`
 * parsed as an EMPTY `log` followed by a `beep!` command, so the log printed
 * nothing where upstream prints 3. Every row was run on hyperscript.org 0.9.93.
 *
 * Reporting goes through `utils/beep.ts`, shared with the command, so both
 * forms now fire upstream's cancelable `hyperscript:beep` event too.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parse } from '../../../parser/parser';
import { hyperscript } from '../../../api/hyperscript-api';
import { HybridParser } from '../../../parser/hybrid/parser-core';

type Node = {
  type: string;
  operator?: string;
  operand?: Node;
  left?: Node;
  [key: string]: unknown;
};
type Cmd = { name: string; args: Node[]; modifiers?: Record<string, Node> };

function commandsOf(src: string): Cmd[] {
  const r = parse(src);
  expect(r.errors ?? [], src).toEqual([]);
  return (r.node as unknown as { commands: Cmd[] }).commands;
}

describe('parse', () => {
  it('`set $x to beep! my value` beeps the whole possessive', () => {
    const value = commandsOf('on click set $x to beep! my value')[0]!.modifiers?.to as Node;
    expect(value.type).toBe('unaryExpression');
    expect(value.operator).toBe('beep!');
    expect(value.operand?.type).toBe('memberExpression');
  });

  it('binds at unary precedence: `beep! 1 + 2` beeps 1', () => {
    const value = commandsOf('on click set $x to beep! 1 + 2')[0]!.modifiers?.to as Node;
    expect(value.type).toBe('binaryExpression');
    expect(value.left?.operator).toBe('beep!');
  });

  it('`log beep! 3` is ONE log of a beeped value, not an empty log and a beep', () => {
    const cmds = commandsOf('on click log beep! 3');
    expect(cmds.map(c => c.name)).toEqual(['log']);
    expect(cmds[0]!.args[0]!.operator).toBe('beep!');
  });

  it('leaves the `beep!` command alone', () => {
    const [cmd] = commandsOf('on click beep! 3, 4');
    expect(cmd!.name).toBe('beep');
    expect(cmd!.args).toHaveLength(2);
  });

  it.each([
    // no operand (upstream: "Unexpected value")
    'on click set $x to beep!',
    // not glued: upstream lexes `beep` and `!` apart and rejects it too
    'on click set $x to beep ! 3',
  ])('rejects `%s`', src => {
    expect(parse(src).errors?.length ?? 0).toBeGreaterThan(0);
  });
});

describe('runs', () => {
  let group: ReturnType<typeof vi.spyOn>;
  let log: ReturnType<typeof vi.spyOn>;
  const beeps: unknown[] = [];
  const onBeep = (e: Event) => beeps.push((e as CustomEvent).detail.value);

  beforeEach(() => {
    document.body.innerHTML = '<button id="btn" value="v1"></button><div id="out"></div>';
    beeps.length = 0;
    document.addEventListener('hyperscript:beep', onBeep);
    group = vi.spyOn(console, 'group').mockImplementation(() => {});
    log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });
  afterEach(() => {
    document.removeEventListener('hyperscript:beep', onBeep);
    vi.restoreAllMocks();
  });

  const run = async (src: string): Promise<string> => {
    const btn = document.getElementById('btn')!;
    await hyperscript.eval(src, btn);
    btn.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    return document.getElementById('out')!.textContent ?? '';
  };

  it.each([
    // the corpus row (beep-debug-expression), then its value read back
    ['on click set $x to beep! my value then put $x into #out', 'v1', ['v1']],
    ['on click put beep! 1 + 2 into #out', '3', [1]],
    ['on click put (beep! 3) + 1 into #out', '4', [3]],
    ['on click if beep! true then put "yes" into #out end', 'yes', [true]],
    ['on click put beep! beep! 3 into #out', '3', [3, 3]],
  ])('%s', async (src, out, beeped) => {
    expect(await run(src)).toBe(out);
    expect(beeps).toEqual(beeped);
    expect(group).toHaveBeenCalledTimes(beeped.length);
  });

  it('`log beep! 3` logs the 3 it beeped', async () => {
    await run('on click log beep! 3');
    expect(beeps).toEqual([3]);
    expect(log).toHaveBeenCalledWith(3);
  });

  it('a listener that cancels `hyperscript:beep` silences it, and the value still passes', async () => {
    document.addEventListener('hyperscript:beep', e => e.preventDefault(), { once: true });
    expect(await run('on click put beep! 5 into #out')).toBe('5');
    expect(group).not.toHaveBeenCalled();
  });

  it('the command fires the event as well now', async () => {
    await run('on click beep! 7');
    expect(beeps).toEqual([7]);
  });
});

describe('the hybrid parser (hyperfixi-hx.js)', () => {
  it.each(['on click log beep! 3', 'on click set $x to beep! 3'])(
    '`%s` fails loudly, naming the full parser',
    src => {
      expect(() => new HybridParser(src).parse()).toThrow(/'beep!' needs the full parser/);
    }
  );

  it('still parses the `beep!` command', () => {
    expect(() => new HybridParser('on click beep! 3').parse()).not.toThrow();
  });
});
