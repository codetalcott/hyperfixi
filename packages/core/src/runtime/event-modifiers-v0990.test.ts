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
    events: new Map(),
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
});
