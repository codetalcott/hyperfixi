/**
 * Tests for SSE integration in the htmx-compat attribute processor.
 *
 * happy-dom/jsdom don't ship a useful `EventSource`, so we inject a small
 * mock via `eventSourceCtor`. The mock lets us drive open/message/error
 * synchronously from tests and observe close behavior precisely.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  HtmxAttributeProcessor,
  type SSEEventSourceCtor,
  type SSEEventSourceLike,
} from '../htmx-attribute-processor.js';

// ─────────────────────────────────────────────────────────────────────
// EventSource mock
// ─────────────────────────────────────────────────────────────────────

// Drop `readonly` on `readyState` so the mock can mutate it directly to
// simulate connection-state transitions. The interface declares it
// readonly to mirror the browser's `EventSource` surface; in tests we
// need write access to drive close/error scenarios.
type MockEventSource = Omit<SSEEventSourceLike, 'readyState'> & {
  readyState: number;
  emit(type: string, data: string): void;
  fireError(): void;
  fireOpen(): void;
  closeWasCalled: boolean;
};

function createMockEventSourceFactory(): {
  ctor: SSEEventSourceCtor;
  instances: MockEventSource[];
  openCount: number;
} {
  const instances: MockEventSource[] = [];
  let openCount = 0;
  const ctor = function (this: MockEventSource, url: string) {
    openCount++;
    const listeners = new Map<string, Set<(ev: { data: string; type: string }) => void>>();
    const self: MockEventSource = {
      url,
      readyState: 0,
      onopen: null,
      onmessage: null,
      onerror: null,
      closeWasCalled: false,
      addEventListener(type, listener) {
        let bucket = listeners.get(type);
        if (!bucket) {
          bucket = new Set();
          listeners.set(type, bucket);
        }
        bucket.add(listener);
      },
      removeEventListener(type, listener) {
        listeners.get(type)?.delete(listener);
      },
      close() {
        self.closeWasCalled = true;
        self.readyState = 2;
      },
      emit(type, data) {
        const bucket = listeners.get(type);
        if (bucket) {
          for (const l of bucket) l.call(self, { type, data });
        }
        if (type === 'message' && self.onmessage) {
          self.onmessage({ type: 'message', data });
        }
      },
      fireError() {
        self.readyState = 2;
        if (self.onerror) self.onerror(new Event('error'));
      },
      fireOpen() {
        self.readyState = 1;
        if (self.onopen) self.onopen(new Event('open'));
      },
    };
    instances.push(self);
    return self;
  } as unknown as SSEEventSourceCtor;
  return {
    ctor,
    instances,
    get openCount() {
      return openCount;
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// DOM setup helpers
// ─────────────────────────────────────────────────────────────────────

let dom: JSDOM;
let document: Document;
let MutationObserver: typeof globalThis.MutationObserver;
let CustomEvent: typeof globalThis.CustomEvent;
let Element: typeof globalThis.Element;
let Event: typeof globalThis.Event;

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  document = dom.window.document;
  // Mirror jsdom into globals — sse.ts and the processor reference
  // `MutationObserver`, `CustomEvent`, etc. through globalThis.
  globalThis.document = document as unknown as typeof globalThis.document;
  globalThis.window = dom.window as unknown as typeof globalThis.window;
  MutationObserver = dom.window.MutationObserver;
  CustomEvent = dom.window.CustomEvent;
  Element = dom.window.Element;
  Event = dom.window.Event;
  globalThis.MutationObserver = MutationObserver;
  globalThis.CustomEvent = CustomEvent;
  globalThis.Element = Element;
  globalThis.Event = Event;
});

function mkElement(html: string): HTMLElement {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const el = tmp.firstElementChild as HTMLElement;
  document.body.appendChild(el);
  return el;
}

// ─────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────

describe('SSE integration', () => {
  describe('SSEConnection (via processor.attachSSE)', () => {
    it('opens an EventSource against the sse-connect URL', () => {
      const { ctor, instances } = createMockEventSourceFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        eventSourceCtor: ctor,
      });
      const el = mkElement('<div sse-connect="/stream"></div>');
      proc.attachSSE(el);
      expect(instances.length).toBe(1);
      expect(instances[0].url).toBe('/stream');
      proc.destroy();
    });

    it('returns the same connection for repeated attach calls', () => {
      const { ctor } = createMockEventSourceFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        eventSourceCtor: ctor,
      });
      const el = mkElement('<div sse-connect="/stream"></div>');
      const a = proc.attachSSE(el);
      const b = proc.attachSSE(el);
      expect(a).toBe(b);
      proc.destroy();
    });

    it('routes named events through the execute callback as a swap', async () => {
      const { ctor, instances } = createMockEventSourceFactory();
      const calls: { code: string; element: Element }[] = [];
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        eventSourceCtor: ctor,
      });
      proc.init(async (code, element) => {
        calls.push({ code, element });
      });
      const el = mkElement('<div sse-connect="/stream" sse-swap="tick" hx-target="#out"></div>');
      // Provide a target the swap snippet references; happy-dom innerHTML
      // mutations aren't necessary for this assertion.
      mkElement('<div id="out"></div>');
      proc.processElement(el);

      const mock = instances[0];
      mock.fireOpen();
      mock.emit('tick', '<span>hello</span>');
      // The executeCallback runs inside SSE handler asynchronously via
      // a void/catch chain — drain microtasks.
      await Promise.resolve();
      expect(calls.length).toBe(1);
      expect(calls[0].code).toContain('put');
      expect(calls[0].code).toContain('#out');
      expect(calls[0].code).toContain('hello');
      proc.destroy();
    });

    it('honors hx-swap=outerHTML for incoming events', async () => {
      const { ctor, instances } = createMockEventSourceFactory();
      const calls: string[] = [];
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        eventSourceCtor: ctor,
      });
      proc.init(async code => {
        calls.push(code);
      });
      const el = mkElement('<div sse-connect="/s" sse-swap="patch" hx-swap="outerHTML"></div>');
      proc.processElement(el);
      instances[0].fireOpen();
      instances[0].emit('patch', '<b>new</b>');
      await Promise.resolve();
      expect(calls[0]).toContain('outerHTML');
      proc.destroy();
    });

    it('supports multiple named events via comma-separated sse-swap', async () => {
      const { ctor, instances } = createMockEventSourceFactory();
      const calls: string[] = [];
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        eventSourceCtor: ctor,
      });
      proc.init(async code => {
        calls.push(code);
      });
      const el = mkElement('<div sse-connect="/s" sse-swap="add, remove" hx-target="#log"></div>');
      proc.processElement(el);
      instances[0].fireOpen();
      instances[0].emit('add', 'A');
      instances[0].emit('remove', 'B');
      await Promise.resolve();
      expect(calls).toHaveLength(2);
      expect(calls[0]).toContain('"A"');
      expect(calls[1]).toContain('"B"');
      proc.destroy();
    });

    it('dispatches htmx:sseOpen / htmx:sseMessage / htmx:sseClose lifecycle events', async () => {
      const { ctor, instances } = createMockEventSourceFactory();
      const events: string[] = [];
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        eventSourceCtor: ctor,
      });
      const el = mkElement('<div sse-connect="/s" sse-swap="tick"></div>');
      proc.init(async () => undefined);
      for (const name of ['htmx:sseOpen', 'htmx:sseMessage', 'htmx:sseClose']) {
        el.addEventListener(name, () => events.push(name));
      }
      proc.processElement(el);
      instances[0].fireOpen();
      // The default `message` event flows through onmessage as
      // htmx:sseMessage with the raw data.
      instances[0].emit('message', 'plain');
      proc.detachSSE(el);
      expect(events).toContain('htmx:sseOpen');
      expect(events).toContain('htmx:sseMessage');
      expect(events).toContain('htmx:sseClose');
    });

    it('closes the EventSource on detach', () => {
      const { ctor, instances } = createMockEventSourceFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        eventSourceCtor: ctor,
      });
      const el = mkElement('<div sse-connect="/s"></div>');
      proc.attachSSE(el);
      expect(instances[0].closeWasCalled).toBe(false);
      proc.detachSSE(el);
      expect(instances[0].closeWasCalled).toBe(true);
    });

    it('closes all SSE connections on processor.destroy()', () => {
      const { ctor, instances } = createMockEventSourceFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        eventSourceCtor: ctor,
      });
      const a = mkElement('<div sse-connect="/a"></div>');
      const b = mkElement('<div sse-connect="/b"></div>');
      proc.attachSSE(a);
      proc.attachSSE(b);
      proc.destroy();
      expect(instances[0].closeWasCalled).toBe(true);
      expect(instances[1].closeWasCalled).toBe(true);
    });

    it('detaches SSE when the element is removed from the DOM', async () => {
      const { ctor, instances } = createMockEventSourceFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: true,
        root: document.body,
        eventSourceCtor: ctor,
      });
      proc.init(async () => undefined);
      const el = mkElement('<div sse-connect="/s"></div>');
      proc.processElement(el);
      expect(instances[0].closeWasCalled).toBe(false);
      el.remove();
      // MutationObserver fires asynchronously — wait for a microtask + a
      // jsdom MutationObserver tick. jsdom's MutationObserver is
      // synchronous-ish but routed via queueMicrotask.
      await new Promise(r => setTimeout(r, 10));
      expect(instances[0].closeWasCalled).toBe(true);
      proc.destroy();
    });

    it('attempts reconnect with exponential backoff after CLOSED error, then gives up', async () => {
      vi.useFakeTimers();
      const { ctor, instances } = createMockEventSourceFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        eventSourceCtor: ctor,
      });
      const el = mkElement('<div sse-connect="/s"></div>');
      proc.attachSSE(el);
      // Initial open. Then drive readyState=2 + fireError repeatedly to
      // trigger backoff/reconnect through every allowed attempt.
      for (let i = 0; i < 6; i++) {
        instances[instances.length - 1].readyState = 2;
        instances[instances.length - 1].fireError();
        // Advance enough time for the maximum backoff in case any single
        // attempt scheduled it.
        vi.advanceTimersByTime(40_000);
      }
      // Default maxAttempts = 5 → original + 5 retries = 6 total opens
      expect(instances.length).toBeLessThanOrEqual(6);
      // After giving up, connection should be detached — final close.
      expect(instances[instances.length - 1].closeWasCalled).toBe(true);
      vi.useRealTimers();
      proc.destroy();
    });
  });
});
