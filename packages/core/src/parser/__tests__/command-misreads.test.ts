/**
 * Two ways core compiled an upstream-valid handler CLEAN and then failed at
 * run time — found auditing the patterns-reference corpus (2026-09-25), where
 * `morph-form-update` earned a `both` engine verdict it did not have:
 *
 * - **A command word glued to a group was read as a method call.** Inside a
 *   handler, `put (1 + 2) into #x` became the pseudo-command `#x.put(1 + 2)`
 *   and threw "Method 'put' not found"; `morph`, `append`, `swap` and `send`
 *   alike. Upstream's `parseCommand` never does this: a registered command
 *   keyword always wins, and the group is its first operand. Only a group that
 *   cannot be ONE operand — `()` or `(a, b)` — still makes a method call, which
 *   keeps hyperfixi's leniency for the book's `focus() me` (PARSER_NEXT_STEPS
 *   C3); upstream rejects every such form, so no valid program reads otherwise.
 * - **`beep!` aborted its handler.** The parser named the node `beep!`, the
 *   runtime registers `beep`, so the first `beep!` threw "Unknown command:
 *   beep!" and nothing after it ran. Every execution test used the bang-less
 *   spelling, which upstream rejects.
 *
 * Each fix is asserted on the tree AND run, because a clean compile is exactly
 * what hid both.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parse } from '../parser';
import { hyperscript } from '../../api/hyperscript-api';

interface Handler {
  type: string;
  commands: Array<{ name: string }>;
}

function commandNames(src: string): string[] {
  const r = parse(src);
  expect(r.success, `${src}: ${r.error?.message ?? ''}`).toBe(true);
  expect(r.errors ?? [], src).toEqual([]);
  return (r.node as unknown as Handler).commands.map(c => c.name);
}

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

describe('a command word before a group is the command', () => {
  it.each([
    ['on click put (1 + 2) into #out', ['put']],
    ['on click log 1 then put (1 + 2) into #out', ['log', 'put']],
    ['on click put(1) into #out', ['put']],
    ['on click put ("a") before #out', ['put']],
    ['on click set (#out).textContent to 1', ['set']],
    ['on click append ("z") to #out', ['append']],
    ['on click swap (#a) with #b', ['swap']],
    ['on click send (foo) to #out', ['send']],
    // A comma inside a NESTED group is not an argument list.
    ['on click put (f(1, 2)) into #out', ['put']],
    ['on click put ([1, 2]) into #out', ['put']],
  ])('%s', (src, expected) => {
    expect(commandNames(src)).toEqual(expected);
  });

  it.each([
    // `()` and `(a, b)` cannot be one operand, so these stay method calls —
    // the leniency for the book's spelling. Upstream rejects all three.
    'on click focus() me',
    'on click reset() the closest <form/>',
    'on click add(5, 10) on me',
  ])('%s stays a pseudo-command', src => {
    expect(commandNames(src)).toEqual(['pseudo-command']);
  });

  describe('runs', () => {
    beforeEach(() => {
      document.body.innerHTML =
        '<button id="btn">b</button><div id="out">old</div><ul id="list"></ul>';
    });
    const out = () => document.getElementById('out')!;
    const click = async (src: string) => {
      const btn = document.getElementById('btn')!;
      await hyperscript.eval(src, btn);
      btn.click();
      await settle();
    };

    it('`put (1 + 2) into #out` puts 3', async () => {
      await click('on click put (1 + 2) into #out');
      expect(out().textContent).toBe('3');
    });

    it('after `then`, too', async () => {
      await click('on click log "x" then put (1 + 2) into #out');
      expect(out().textContent).toBe('3');
    });

    it('`set (#out).textContent to 1` sets it', async () => {
      await click('on click set (#out).textContent to 1');
      expect(out().textContent).toBe('1');
    });

    it('`put ("a") before #out` inserts before it', async () => {
      await click('on click put ("a") before #out');
      expect(out().previousSibling?.textContent).toBe('a');
    });
  });
});

describe('`beep!` runs', () => {
  let group: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    document.body.innerHTML = '<button id="btn">b</button><div id="out"></div>';
    group = vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('names the node for the command it runs', () => {
    expect(commandNames('on click beep! 1')).toEqual(['beep']);
  });

  it.each(['beep! 1', 'beep!'])(
    '`%s` debugs and the handler carries on (upstream spelling)',
    async beep => {
      const btn = document.getElementById('btn')!;
      await hyperscript.eval(`on click ${beep} then put "after" into #out`, btn);
      btn.click();
      await settle();
      expect(group).toHaveBeenCalledWith(expect.stringContaining('beep'));
      expect(document.getElementById('out')!.textContent).toBe('after');
    }
  );
});
