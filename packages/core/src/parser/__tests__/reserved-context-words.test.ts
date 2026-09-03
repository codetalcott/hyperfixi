/**
 * Reserved context words — `detail` and `sender` resolve from the event
 *
 * Found by auditing upstream's reserved-word list (`meta, it, result, locals,
 * event, target, detail, sender, body` — `#isReservedWord`) after the `body`
 * defect: upstream's Context derives `detail = event?.detail ?? null` and
 * `sender = event?.detail?.sender ?? null`, and hyperfixi resolved NEITHER —
 * `on custom log detail.num` logged `undefined` while the explicit
 * `event.detail.num` worked. Same class as `body`: a bare reserved word whose
 * resolution existed nowhere on the identifier path.
 *
 * Resolution is derived at READ time from `context.event` in
 * `evaluateIdentifier` (and its sync mirror) rather than stamped into the
 * per-event context — there are two context-hydration sites today (DOM
 * listener, custom-event path) and a stamped field would silently miss any
 * third. Placed after the locals/globals lookups, so a user binding named
 * `detail` or `sender` still shadows.
 *
 * `target`/`event`/`me`/`it` already resolved (measured); `meta`/`locals` are
 * upstream-internal surfaces with no documented hyperscript usage — left
 * unresolved deliberately.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Runtime } from '../../runtime/runtime';
import { parse } from '../parser';
import { hyperscript } from '../../api/hyperscript-api';

describe('reserved context words resolve from the event', () => {
  let logged: unknown[];
  let host: HTMLElement;
  let other: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div><div id="other"></div>';
    host = document.getElementById('host') as HTMLElement;
    other = document.getElementById('other') as HTMLElement;
    logged = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logged.push(args[0]);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const dispatchInto = async (handlerBody: string) => {
    const runtime = new Runtime();
    const ast = parse(`on custom ${handlerBody}`).node!;
    await runtime.execute(ast, hyperscript.createContext(host) as never);
    host.dispatchEvent(new CustomEvent('custom', { detail: { sender: other, num: 5 } }));
    await new Promise(resolve => setTimeout(resolve, 10));
  };

  it('bare `detail` is the event detail object', async () => {
    await dispatchInto('log detail');
    expect(logged).toEqual([expect.objectContaining({ num: 5 })]);
  });

  it('`detail.num` reads through the bare word', async () => {
    await dispatchInto('log detail.num');
    expect(logged).toEqual([5]);
  });

  it('bare `sender` is event.detail.sender', async () => {
    await dispatchInto('log sender');
    expect(logged).toEqual([other]);
  });

  it('a local named `detail` shadows the event detail', async () => {
    await dispatchInto('set detail to "mine" then log detail');
    expect(logged).toEqual(['mine']);
  });

  it('with no event in flight, both resolve to null on both paths', async () => {
    for (const traditional of [false, true]) {
      logged = [];
      await hyperscript.eval('log detail then log sender', hyperscript.createContext(host), {
        traditional,
      } as never);
      expect(logged).toEqual([null, null]);
    }
  });
});
