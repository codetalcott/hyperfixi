/**
 * Signal/effect runtime unit tests — subscribe/notify, microtask batching,
 * cycle detection, Object.is semantics, stop().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Reactive } from './signals';

/**
 * Settle the effect scheduler. `createEffect()` defers its first run via
 * `queueMicrotask`, and that first run is itself async (awaits the expression,
 * then awaits the handler). A single tick isn't enough; we flush several
 * rounds plus a `setTimeout(0)` fallback to drain the whole queue.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}
const tick = settle;

describe('signals.ts — Reactive core', () => {
  let r: Reactive;

  beforeEach(() => {
    r = new Reactive();
  });

  describe('global dependency tracking', () => {
    it('subscribes an effect to a global read and re-runs on notify', async () => {
      let handlerValue: unknown = null;
      const counter = { v: 0 };
      r.createEffect(
        () => {
          r.trackGlobal('count');
          return counter.v;
        },
        v => {
          handlerValue = v;
        },
        null
      );
      await tick();
      expect(handlerValue).toBe(0);

      counter.v = 5;
      r.notifyGlobal('count');
      await tick();
      await tick();
      expect(handlerValue).toBe(5);
    });

    it('coalesces multiple synchronous writes into a single handler call', async () => {
      let callCount = 0;
      const counter = { v: 0 };
      r.createEffect(
        () => {
          r.trackGlobal('x');
          return counter.v;
        },
        _v => {
          callCount++;
        },
        null
      );
      await tick();
      expect(callCount).toBe(1); // initial

      counter.v = 1;
      r.notifyGlobal('x');
      counter.v = 2;
      r.notifyGlobal('x');
      counter.v = 3;
      r.notifyGlobal('x');
      await tick();
      await tick();
      expect(callCount).toBe(2); // batched into a single run
    });
  });

  describe('Object.is semantics', () => {
    it('skips handler when new value is Object.is-equal to previous', async () => {
      let calls = 0;
      const counter = { v: 42 };
      r.createEffect(
        () => {
          r.trackGlobal('x');
          return counter.v;
        },
        _v => {
          calls++;
        },
        null
      );
      await tick();
      expect(calls).toBe(1);

      // Notify without actually changing the value.
      r.notifyGlobal('x');
      await tick();
      await tick();
      expect(calls).toBe(1); // handler not called again
    });

    it('treats NaN !== NaN as equal (Object.is)', async () => {
      let calls = 0;
      const store = { v: NaN };
      r.createEffect(
        () => {
          r.trackGlobal('n');
          return store.v;
        },
        _v => {
          calls++;
        },
        null
      );
      await tick();
      // NaN initial is not undefined/null so handler DOES fire once.
      expect(calls).toBe(1);

      store.v = NaN; // same NaN
      r.notifyGlobal('n');
      await tick();
      await tick();
      expect(calls).toBe(1);
    });
  });

  describe('cycle detection', () => {
    it('halts a self-triggering effect before running away', async () => {
      const origError = console.error;
      console.error = () => {
        /* swallow expected cycle warning */
      };
      try {
        let runCount = 0;
        r.createEffect(
          () => {
            r.trackGlobal('loop');
            runCount++;
            return runCount;
          },
          _v => {
            // Cycle: each handler run schedules another flush for the same effect.
            r.notifyGlobal('loop');
          },
          null
        );
        // Yield the loop long enough for the guard to trip. Each effect run
        // needs several microtasks (flush → run → _runWithEffect → handler),
        // so we pump many rounds.
        for (let i = 0; i < 1000; i++) await Promise.resolve();
        // Guard should fire around runCount=101 (init + 100 cycled runs).
        // After halt, no further runs should occur.
        const stabilized = runCount;
        for (let i = 0; i < 200; i++) await Promise.resolve();
        expect(runCount).toBe(stabilized);
        expect(runCount).toBeGreaterThanOrEqual(50);
        expect(runCount).toBeLessThan(500);
      } finally {
        console.error = origError;
      }
    });
  });

  describe('stop()', () => {
    it('removes an effect from subscription sets', async () => {
      let calls = 0;
      const counter = { v: 0 };
      const stop = r.createEffect(
        () => {
          r.trackGlobal('x');
          return counter.v;
        },
        _v => {
          calls++;
        },
        null
      );
      await tick();
      expect(calls).toBe(1);

      stop();
      counter.v = 42;
      r.notifyGlobal('x');
      await tick();
      await tick();
      expect(calls).toBe(1); // stopped — handler not called
    });
  });

  describe('element-scoped dependencies', () => {
    it('notifies on element-scoped write and skips on other elements', async () => {
      const a = document.createElement('div');
      const b = document.createElement('div');
      // Attach to document so isConnected checks pass.
      document.body.appendChild(a);
      document.body.appendChild(b);
      let aCalls = 0;
      let bCalls = 0;
      const aStore = { v: 0 };

      r.createEffect(
        () => {
          r.trackElement(a, 'flag');
          return aStore.v;
        },
        _v => {
          aCalls++;
        },
        a
      );
      r.createEffect(
        () => {
          r.trackElement(b, 'flag');
          return 1;
        },
        _v => {
          bCalls++;
        },
        b
      );
      await tick();
      expect(aCalls).toBe(1);
      expect(bCalls).toBe(1);

      // Change the tracked value before notifying so Object.is diff fires.
      aStore.v = 1;
      r.notifyElement(a, 'flag');
      await tick();
      expect(aCalls).toBe(2);
      expect(bCalls).toBe(1);

      document.body.removeChild(a);
      document.body.removeChild(b);
    });
  });

  describe('caret-variable storage', () => {
    it('reads and writes on same element', () => {
      const el = document.createElement('div');
      r.writeCaret(el, 'x', 42);
      expect(r.readCaret(el, 'x')).toBe(42);
    });

    it('inherited scope walks up to ancestor with the var defined', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      r.writeCaret(parent, 'theme', 'dark');
      expect(r.readCaret(child, 'theme')).toBe('dark');
    });

    it('returns undefined for unknown caret vars', () => {
      const el = document.createElement('div');
      expect(r.readCaret(el, 'missing')).toBeUndefined();
    });
  });

  describe('stopElementEffects', () => {
    it('stops all effects owned by an element', async () => {
      const el = document.createElement('div');
      let calls = 0;
      r.createEffect(
        () => {
          r.trackElement(el, 'x');
          return 1;
        },
        _v => {
          calls++;
        },
        el
      );
      await tick();
      expect(calls).toBe(1);

      r.stopElementEffects(el);
      r.notifyElement(el, 'x');
      await tick();
      await tick();
      expect(calls).toBe(1);
    });
  });
});
