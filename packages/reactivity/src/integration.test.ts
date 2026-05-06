/**
 * End-to-end integration — parse + installPlugin + execute round-trip.
 *
 * Uses the `registry.snapshot()` / `registry.restore(baseline)` pattern to
 * isolate plugin installations from other tests in the process.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Runtime, hyperscript } from '@hyperfixi/core';
import { parse } from '@hyperfixi/core';
import { getParserExtensionRegistry, installPlugin } from '@hyperfixi/core';
import type { ExecutionContext } from '@hyperfixi/core/src/types/core';
import { reactivityPlugin, reactive } from './index';

function createContext(me: HTMLElement): ExecutionContext {
  return {
    me,
    it: null,
    you: null,
    result: null,
    locals: new Map(),
    globals: new Map(),
    variables: new Map(),
    events: new Map(),
  } as unknown as ExecutionContext;
}

/** Drain microtasks + the setTimeout queue so reactive effects settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe('@hyperfixi/reactivity — integration', () => {
  const registry = getParserExtensionRegistry();
  let baseline: ReturnType<typeof registry.snapshot>;
  let runtime: Runtime;

  beforeEach(() => {
    baseline = registry.snapshot();
    runtime = new Runtime();
    installPlugin(runtime, reactivityPlugin);
  });

  afterEach(() => {
    registry.restore(baseline);
  });

  describe('install idempotency', () => {
    it('installing the plugin twice does not duplicate global-write hooks', async () => {
      // Install a second time — should be a no-op thanks to the hasFeature guard.
      installPlugin(runtime, reactivityPlugin);

      const el = document.createElement('div');
      document.body.appendChild(el);
      const ctx = createContext(el);
      ctx.globals.set('count', 0);

      let runs = 0;
      const r = parse('live\n  set $mirror to $count\nend');
      expect(r.success).toBe(true);
      // Wrap the live body in our own counter via a wrapping effect.
      const stop = reactive.createEffect(
        () => {
          reactive.trackGlobal('count');
          return ctx.globals.get('count');
        },
        () => {
          runs++;
        },
        el
      );
      await runtime.execute(r.node!, ctx);
      await settle();

      const baselineRuns = runs;
      ctx.globals.set('count', 1);
      reactive.notifyGlobal('count');
      await settle();
      // Exactly one additional run despite the duplicate install attempt.
      expect(runs).toBe(baselineRuns + 1);

      stop();
      document.body.removeChild(el);
    });
  });

  describe('live', () => {
    it('re-runs the body when a tracked global changes', async () => {
      // The live body sets $total from $price; changing $price should re-run
      // the body and update $total.
      const el = document.createElement('div');
      document.body.appendChild(el);
      const ctx = createContext(el);
      ctx.globals.set('price', 10);
      ctx.globals.set('total', 0);

      const r = parse('live\n  set $total to $price\nend');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, ctx);
      await settle();

      // Initial run set total = 10.
      expect(ctx.globals.get('total')).toBe(10);

      // Change price — live should re-run and update total.
      ctx.globals.set('price', 42);
      reactive.notifyGlobal('price'); // emulate the set path's notify hook
      await settle();
      expect(ctx.globals.get('total')).toBe(42);

      document.body.removeChild(el);
    });
  });

  describe('when ... changes', () => {
    it('runs the body when the watched expression changes', async () => {
      const el = document.createElement('div');
      el.id = 'target';
      document.body.appendChild(el);
      const ctx = createContext(el);
      ctx.globals.set('message', 'hello');

      // when $message changes, put it into me → updates textContent.
      const r = parse('when $message changes\n  put it into me\nend');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, ctx);
      await settle();

      // Initial: textContent should equal 'hello' because handler fires on init.
      expect(el.textContent).toBe('hello');

      ctx.globals.set('message', 'world');
      reactive.notifyGlobal('message');
      await settle();
      expect(el.textContent).toBe('world');

      document.body.removeChild(el);
    });
  });

  describe('bind', () => {
    it('two-way binds a global var to an input value', async () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'initial';
      document.body.appendChild(input);
      const ctx = createContext(input);
      ctx.globals.set('greeting', 'pending');

      const r = parse('bind $greeting to me');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, ctx);
      await settle();

      // After init, one side wins; expect the var to sync with the DOM value
      // (DOM → var direction runs first).
      expect(ctx.globals.get('greeting')).toBe('initial');

      // Programmatic var write → DOM updated.
      ctx.globals.set('greeting', 'updated');
      reactive.notifyGlobal('greeting');
      await settle();
      expect(input.value).toBe('updated');

      // User input → var updated.
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      await settle();
      expect(ctx.globals.get('greeting')).toBe('typed');

      document.body.removeChild(input);
    });

    it('two-way binds a local var (`:name`) to an input value', async () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'initial';
      document.body.appendChild(input);
      const ctx = createContext(input);
      ctx.locals.set('greeting', 'pending');

      const r = parse('bind :greeting to me');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, ctx);
      await settle();

      // DOM → var on init (DOM wins).
      expect(ctx.locals.get('greeting')).toBe('initial');

      // User input updates the local via DOM→var effect.
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      await settle();
      expect(ctx.locals.get('greeting')).toBe('typed');

      document.body.removeChild(input);
    });

    it('auto-detects checkbox → checked', async () => {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = false;
      document.body.appendChild(cb);
      const ctx = createContext(cb);
      ctx.globals.set('isOn', true);

      const r = parse('bind $isOn to me');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, ctx);
      await settle();

      // DOM → var on init (DOM wins).
      expect(ctx.globals.get('isOn')).toBe(false);

      // var → DOM
      ctx.globals.set('isOn', true);
      reactive.notifyGlobal('isOn');
      await settle();
      expect(cb.checked).toBe(true);

      document.body.removeChild(cb);
    });
  });

  describe('^name DOM-scoped vars', () => {
    it('writes a caret var via `set ^X to Y`', async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const ctx = createContext(host);

      const r = parse('set ^count to 5');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, ctx);
      await settle();
      expect(reactive.readCaret(host, 'count')).toBe(5);

      document.body.removeChild(host);
    });

    it('mutates a caret var via `increment ^X`', async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const ctx = createContext(host);

      reactive.writeCaret(host, 'count', 10, host);

      const r = parse('increment ^count');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, ctx);
      await settle();
      expect(reactive.readCaret(host, 'count')).toBe(11);

      await runtime.execute(r.node!, ctx);
      await settle();
      expect(reactive.readCaret(host, 'count')).toBe(12);

      document.body.removeChild(host);
    });

    it('hyperscript.process binds click handler that increments ^count', async () => {
      // Tests the components-style flow: build DOM, hyperscript.process binds
      // _= attributes, simulate click, verify ^count updated.
      const host = document.createElement('div');
      host.innerHTML = '<button _="on click increment ^count">+</button>';
      document.body.appendChild(host);

      reactive.writeCaret(host, 'count', 0, host);

      hyperscript.process(host);
      // Settle whatever async parsing/binding happens.
      await settle();

      const button = host.querySelector('button')!;
      button.click();
      await settle();
      expect(reactive.readCaret(host, 'count')).toBe(1);

      button.click();
      await settle();
      expect(reactive.readCaret(host, 'count')).toBe(2);

      button.click();
      await settle();
      expect(reactive.readCaret(host, 'count')).toBe(3);

      document.body.removeChild(host);
    });

    it("simulates click-counter: button increments host's ^count", async () => {
      // Mirrors the @hyperfixi/components click-counter scenario: a button
      // inside a host element runs `increment ^count`. The host owns ^count.
      const host = document.createElement('div');
      const button = document.createElement('button');
      host.appendChild(button);
      document.body.appendChild(host);

      // Init: host owns ^count
      const initCtx = createContext(host);
      const initRes = parse('set ^count to 0');
      expect(initRes.success).toBe(true);
      await runtime.execute(initRes.node!, initCtx);
      await settle();
      expect(reactive.readCaret(host, 'count')).toBe(0);

      // Click handler: button executes `increment ^count` with me=button
      const clickCtx = createContext(button);
      const clickRes = parse('increment ^count');
      expect(clickRes.success).toBe(true);

      await runtime.execute(clickRes.node!, clickCtx);
      await settle();
      expect(reactive.readCaret(host, 'count')).toBe(1);

      await runtime.execute(clickRes.node!, clickCtx);
      await runtime.execute(clickRes.node!, clickCtx);
      await settle();
      expect(reactive.readCaret(host, 'count')).toBe(3);

      document.body.removeChild(host);
    });

    it('reads an inherited caret var', async () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      reactive.writeCaret(parent, 'theme', 'dark');
      const ctx = createContext(child);

      // Expression `^theme` reads from the parent.
      const r = parse('set :t to ^theme');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, ctx);
      await settle();
      expect(ctx.locals.get('t')).toBe('dark');

      document.body.removeChild(parent);
    });
  });
});
