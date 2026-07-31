// @vitest-environment jsdom
/**
 * `wait for <event> or <duration>` — the event/timeout race.
 *
 * The real `hyperscript.org` engine accepts every surface below (checked with
 * `hs.parse(src).errors` — all `[]`), and it means "resume on whichever comes
 * first". HyperFixi rejected them at PARSE time: `parseWaitCommand`'s event
 * branch ran a `do…while` over or-separated event NAMES and required
 * `isIdentifierLike`, so the number token `1s` threw
 * `Expected event name after "for"`.
 *
 * This was a one-sided gap. `WaitCommand` has had a `race` input since before
 * this change — `WaitRaceInput.conditions` is a mixed list of `time` and
 * `event` conditions, and `executeRace` already `Promise.race`s them behind an
 * AbortController that tears down the losing listeners. Only the parser was
 * missing, so the machinery was unreachable from this surface. (The `or`
 * MODIFIER path — `parseRaceCondition`, reached via `raw.modifiers.or` — is a
 * different, already-working entry point and is untouched here.)
 */

import { describe, it, expect, vi } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

function host(): HTMLElement {
  document.body.innerHTML = '<div id="host"></div><button id="btn"></button>';
  return document.getElementById('host') as HTMLElement;
}

describe('wait for <event> or <duration> — parsing', () => {
  it.each([
    'wait for click or 1s',
    'wait for click or keydown or 2s',
    'wait for 1s',
    'wait for click or 1s from #btn',
    'wait for click',
    'wait 1s',
  ])('%s compiles without errors', src => {
    const result = hyperscript.compileSync(src);
    expect(result.errors ?? [], JSON.stringify(result.errors)).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  it('still rejects a `for` tail that is neither an event nor a duration', () => {
    const result = hyperscript.compileSync('wait for .someClass');
    expect(result.ok).toBe(false);
  });
});

describe('wait for <event> or <duration> — execution', () => {
  it('resolves on the TIMEOUT when the event never fires', async () => {
    const el = host();
    const started = Date.now();
    await hyperscript.eval('wait for click or 30ms', el);
    // Nothing dispatched a click, so only the timer could have resolved it.
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('resolves on the EVENT when it fires before the timeout', async () => {
    const el = host();
    const started = Date.now();
    const pending = hyperscript.eval('wait for click or 5s', el);
    setTimeout(() => el.dispatchEvent(new Event('click', { bubbles: true })), 10);
    await pending;
    // A 5s timer cannot have won; if the event path were broken this would
    // hang until the timeout and blow the test timeout instead.
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('races three ways — two events and a timeout', async () => {
    const el = host();
    const pending = hyperscript.eval('wait for click or keydown or 5s', el);
    setTimeout(() => el.dispatchEvent(new Event('keydown', { bubbles: true })), 10);
    await expect(pending).resolves.toBeDefined();
  });

  it('honours `from <target>` for the event half of the race', async () => {
    host();
    const btn = document.getElementById('btn') as HTMLElement;
    const pending = hyperscript.eval(
      'wait for click or 5s from #btn',
      document.getElementById('host') as HTMLElement
    );
    setTimeout(() => btn.dispatchEvent(new Event('click', { bubbles: true })), 10);
    await expect(pending).resolves.toBeDefined();
  });

  it('`wait for 1s` alone is a plain timeout, not a race', async () => {
    const el = host();
    const started = Date.now();
    await hyperscript.eval('wait for 30ms', el);
    expect(Date.now() - started).toBeGreaterThanOrEqual(20);
  });

  it('removes the losing event listener when the timer wins', async () => {
    const el = host();
    const add = vi.spyOn(el, 'addEventListener');
    const remove = vi.spyOn(el, 'removeEventListener');
    await hyperscript.eval('wait for click or 20ms', el);
    // `executeRace` aborts its AbortController in a `finally`; without that the
    // click listener would outlive the wait.
    expect(add).toHaveBeenCalled();
    const listenerLeaked =
      add.mock.calls.length > remove.mock.calls.length &&
      !add.mock.calls.some(c => (c[2] as AddEventListenerOptions | undefined)?.signal);
    expect(listenerLeaked, 'the losing listener must be torn down').toBe(false);
    add.mockRestore();
    remove.mockRestore();
  });
});
