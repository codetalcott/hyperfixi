/**
 * Tests for upstream _hyperscript 0.9.90 event modifiers:
 *   - `on first click ...` alias for `.once`
 *   - `on resize ...` synthetic ResizeObserver wiring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime } from './runtime';
import { parse } from '../parser/parser';
import type { ExecutionContext } from '../types/core';

function createElement(): HTMLElement & {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
} {
  const el = document.createElement('div') as any;
  el.addEventListener = vi.fn();
  el.removeEventListener = vi.fn();
  return el;
}

function createContext(me: HTMLElement): ExecutionContext {
  return {
    me,
    it: null,
    you: null,
    result: null,
    locals: new Map(),
    globals: new Map(),
    variables: new Map(),
  } as unknown as ExecutionContext;
}

describe('Event modifiers (v0.9.90)', () => {
  let runtime: Runtime;
  let el: ReturnType<typeof createElement>;
  let context: ExecutionContext;

  beforeEach(() => {
    runtime = new Runtime();
    el = createElement();
    context = createContext(el);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('`on first <event>` (alias for .once)', () => {
    it('attaches with { once: true } option', async () => {
      const ast = parse('on first click hide me').node!;
      await runtime.execute(ast, context);
      expect(el.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), {
        once: true,
      });
    });

    it('`on click` alone attaches without once option', async () => {
      const ast = parse('on click hide me').node!;
      await runtime.execute(ast, context);
      expect(el.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), undefined);
    });

    it('`on click.once` still works via the dotted form', async () => {
      const ast = parse('on click.once hide me').node!;
      await runtime.execute(ast, context);
      expect(el.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), {
        once: true,
      });
    });
  });

  describe('`on resize` synthetic ResizeObserver wiring', () => {
    let originalResizeObserver: typeof ResizeObserver | undefined;
    let observeCalls: HTMLElement[];
    let disconnectCalls: number;
    let lastCallback: ResizeObserverCallback | null;

    beforeEach(() => {
      originalResizeObserver = (globalThis as any).ResizeObserver;
      observeCalls = [];
      disconnectCalls = 0;
      lastCallback = null;

      // Minimal ResizeObserver mock — records the callback and lets tests fire it.
      (globalThis as any).ResizeObserver = class MockRO {
        constructor(cb: ResizeObserverCallback) {
          lastCallback = cb;
        }
        observe(target: Element) {
          observeCalls.push(target as HTMLElement);
        }
        unobserve() {}
        disconnect() {
          disconnectCalls += 1;
        }
      };
    });

    afterEach(() => {
      (globalThis as any).ResizeObserver = originalResizeObserver;
    });

    it('creates a ResizeObserver and observes the element on `on resize`', async () => {
      const ast = parse('on resize hide me').node!;
      await runtime.execute(ast, context);

      // Did NOT fall through to addEventListener for resize
      expect(el.addEventListener).not.toHaveBeenCalledWith(
        'resize',
        expect.any(Function),
        expect.anything()
      );
      expect(observeCalls).toHaveLength(1);
      expect(observeCalls[0]).toBe(el);
    });

    it('invokes the handler with a synthetic CustomEvent on resize', async () => {
      const ast = parse('on resize hide me').node!;
      await runtime.execute(ast, context);

      expect(lastCallback).toBeTruthy();
      // Simulate a resize observation firing; the handler is async, so flush.
      const fakeEntry = { target: el, contentRect: { width: 100, height: 50 } };
      lastCallback!([fakeEntry as unknown as ResizeObserverEntry], {} as ResizeObserver);
      // Flush microtasks so the async event handler completes
      await new Promise(resolve => setTimeout(resolve, 0));

      // The handler should have run — hide sets display:none
      expect(el.style.display).toBe('none');
    });

    it('disconnects on `on first resize` after the first firing', async () => {
      const ast = parse('on first resize hide me').node!;
      await runtime.execute(ast, context);

      expect(disconnectCalls).toBe(0);
      const fakeEntry = { target: el, contentRect: { width: 100, height: 50 } };
      lastCallback!([fakeEntry as unknown as ResizeObserverEntry], {} as ResizeObserver);
      expect(disconnectCalls).toBe(1);
    });

    it('window-level `on resize` falls through to addEventListener (not ResizeObserver)', async () => {
      const ast = parse('on resize from window hide me').node!;
      await runtime.execute(ast, context);

      // Either the runtime wires it globally via window.addEventListener OR
      // via some delegate — either way, ResizeObserver should NOT have been
      // used for a window target. Asserts on the minimum: no element-level
      // observe was registered.
      expect(observeCalls).toHaveLength(0);
    });
  });

  describe('`debounced at` / `throttled at` keyword modifiers', () => {
    interface ModifiersNode {
      modifiers?: { debounce?: number; throttle?: number };
      target?: string;
    }

    it('parses `debounced at Nms` directly after the event name', () => {
      const ast = parse('on keyup debounced at 300ms call search()').node! as ModifiersNode;
      expect(ast.modifiers?.debounce).toBe(300);
    });

    it('parses `debounced at Nms` after the `from <target>` clause (upstream order)', () => {
      const result = parse('on resize from window debounced at 200ms call adjustLayout()');
      expect(result.error).toBeUndefined();
      const ast = result.node! as ModifiersNode;
      expect(ast.modifiers?.debounce).toBe(200);
      expect(ast.target).toBe('window');
    });

    it('parses `throttled at Nms` after the `from <target>` clause', () => {
      const result = parse('on scroll from window throttled at 100ms call track()');
      expect(result.error).toBeUndefined();
      const ast = result.node! as ModifiersNode;
      expect(ast.modifiers?.throttle).toBe(100);
      expect(ast.target).toBe('window');
    });

    it('still parses `throttled at Nms` directly after the event name', () => {
      const ast = parse('on mousemove throttled at 100ms call track()').node! as ModifiersNode;
      expect(ast.modifiers?.throttle).toBe(100);
    });

    // parseTimeToMs used to test suffixes in the order ms/seconds/s/minutes/…,
    // and every larger unit ALSO ends with `s` — so "2minutes" matched the bare
    // `s` case and resolved to 2000 ms, a 60× error. Pin the whole unit table.
    it.each([
      ['200ms', 200],
      ['2s', 2000],
      ['3seconds', 3000],
      ['2minutes', 120000],
      ['1hours', 3600000],
      ['1days', 86400000],
    ])('resolves `debounced at %s` to %d ms', (unit, ms) => {
      const result = parse(`on keyup debounced at ${unit} call search()`);
      expect(result.error).toBeUndefined();
      expect((result.node! as ModifiersNode).modifiers?.debounce).toBe(ms);
    });

    it('debounces `at 2minutes` for two minutes, not two seconds (behavioural)', async () => {
      vi.useFakeTimers();
      try {
        // Real element — the debounce wrapper installs a real listener and the
        // handler body must observably run (or not) at the right time.
        const target = document.createElement('div');
        document.body.appendChild(target);
        const ctx = createContext(target);

        const ast = parse('on click debounced at 2minutes add .fired to me').node!;
        await runtime.execute(ast, ctx);
        target.dispatchEvent(new Event('click'));

        // With the 60× bug the timer was 2000 ms, so this advance would fire it.
        await vi.advanceTimersByTimeAsync(2500);
        expect(target.classList.contains('fired')).toBe(false);

        await vi.advanceTimersByTimeAsync(120000);
        expect(target.classList.contains('fired')).toBe(true);

        document.body.removeChild(target);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
