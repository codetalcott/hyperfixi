/**
 * `toggle … for <duration>` / `toggle … until <event>` — parse AND execute.
 *
 * Both tails are accepted by the real `hyperscript.org` engine (checked with
 * `hs.parse(src).errors` — both return `[]`), and `for <duration>` is
 * ToggleCommand's own `metadata.examples` entry, so the shipped documentation
 * advertised a form the shipped parser refused:
 *
 *   toggle .loading for 2s     → 'Expected variable name after "for"'
 *   toggle .a on #b for 2s     → same — the `for` tail was left unconsumed and
 *                                the next parse round read it as a `for` LOOP
 *   toggle .a until click      → parsed, then silently dropped the whole tail
 *
 * The runtime side was never the problem: `parseTemporalModifiers` reads
 * `modifiers.for` and `modifiers.until`, and `helpers/temporal-modifiers.ts`
 * implements both reversions. The parser simply never produced either modifier,
 * so that machinery was unreachable — no test in the package exercised it
 * through a real parse.
 *
 * These tests go through the real parser and the real runtime deliberately: a
 * mock-evaluator unit test cannot see a parse-level gap.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

function host(): HTMLElement {
  document.body.innerHTML = '<div id="host"></div><button id="btn"></button>';
  return document.getElementById('host') as HTMLElement;
}

describe('toggle … for <duration>', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('parses `toggle .loading for 2s` instead of reading `for` as a loop', async () => {
    const result = hyperscript.compileSync('toggle .loading for 2s');
    expect(result.errors ?? [], JSON.stringify(result.errors)).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  it('parses the on-target form `toggle .a on #b for 2s`', async () => {
    const result = hyperscript.compileSync('toggle .a on #b for 2s');
    expect(result.errors ?? [], JSON.stringify(result.errors)).toHaveLength(0);
  });

  it('applies the class, then reverts it when the duration elapses', async () => {
    const el = host();
    await hyperscript.eval('toggle .loading for 30ms', el);

    expect(el.classList.contains('loading'), 'class applied immediately').toBe(true);
    await new Promise(r => setTimeout(r, 80));
    expect(el.classList.contains('loading'), 'class reverted after the duration').toBe(false);
  });

  it('reverts an attribute toggle too', async () => {
    const el = host();
    await hyperscript.eval('toggle @disabled for 30ms', el);

    expect(el.hasAttribute('disabled')).toBe(true);
    await new Promise(r => setTimeout(r, 80));
    expect(el.hasAttribute('disabled')).toBe(false);
  });
});

describe('toggle … until <event>', () => {
  it('parses and keeps the tail rather than dropping it', () => {
    const result = hyperscript.compileSync('toggle .a until click');
    expect(result.errors ?? [], JSON.stringify(result.errors)).toHaveLength(0);
  });

  it('reverts the class when the named event fires on the element', async () => {
    const el = host();
    await hyperscript.eval('toggle .active until customdone', el);

    expect(el.classList.contains('active'), 'class applied immediately').toBe(true);
    el.dispatchEvent(new Event('customdone'));
    expect(el.classList.contains('active'), 'class reverted on the event').toBe(false);
  });

  it('does not revert before the event fires', async () => {
    const el = host();
    await hyperscript.eval('toggle .active until customdone', el);

    el.dispatchEvent(new Event('somethingelse'));
    expect(el.classList.contains('active')).toBe(true);
  });

  it('still parses the `until <event> from <target>` form upstream accepts', () => {
    // ToggleCommand reverts on a listener attached to the toggled element only
    // (`helpers/temporal-modifiers.ts` `setupEventReversion`), so the `from`
    // target is parsed and carried but not yet honoured. Parsing it matters
    // regardless: leaving `from #btn` unconsumed turns a silent drop into a
    // parse error the moment the `until` tail is consumed.
    const result = hyperscript.compileSync('toggle .a until click from #btn');
    expect(result.errors ?? [], JSON.stringify(result.errors)).toHaveLength(0);
  });
});
