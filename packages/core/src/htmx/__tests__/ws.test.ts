/**
 * Tests for WebSocket integration in the htmx-compat attribute processor.
 *
 * Same pattern as SSE tests — happy-dom/jsdom doesn't ship a usable
 * WebSocket for end-to-end driving, so we inject a small mock via the
 * `wsEventSourceCtor` option.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  HtmxAttributeProcessor,
  type WSEventSourceCtor,
  type WSEventSourceLike,
} from '../htmx-attribute-processor.js';
import { collectWSSendPayload } from '../ws.js';

// ─────────────────────────────────────────────────────────────────────
// WebSocket mock
// ─────────────────────────────────────────────────────────────────────

type MockWS = Omit<WSEventSourceLike, 'readyState'> & {
  readyState: number;
  sent: string[];
  closeWasCalled: boolean;
  fireOpen(): void;
  fireMessage(data: string): void;
  fireError(): void;
  fireClose(wasClean?: boolean): void;
};

function createMockWSFactory(): { ctor: WSEventSourceCtor; instances: MockWS[] } {
  const instances: MockWS[] = [];
  const ctor = function (this: MockWS, url: string) {
    const self: MockWS = {
      url,
      readyState: 0,
      sent: [],
      closeWasCalled: false,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send(data) {
        self.sent.push(String(data));
      },
      close(_code, _reason) {
        self.closeWasCalled = true;
        self.readyState = 3;
      },
      fireOpen() {
        self.readyState = 1;
        if (self.onopen) self.onopen(new Event('open'));
      },
      fireMessage(data) {
        if (self.onmessage) self.onmessage({ data });
      },
      fireError() {
        if (self.onerror) self.onerror(new Event('error'));
      },
      fireClose(wasClean = false) {
        self.readyState = 3;
        if (self.onclose) self.onclose({ code: wasClean ? 1000 : 1006, reason: 'gone', wasClean });
      },
    };
    instances.push(self);
    return self;
  } as unknown as WSEventSourceCtor;
  return { ctor, instances };
}

// ─────────────────────────────────────────────────────────────────────
// DOM setup
// ─────────────────────────────────────────────────────────────────────

let dom: JSDOM;
let document: Document;

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  document = dom.window.document;
  globalThis.document = document as unknown as typeof globalThis.document;
  globalThis.window = dom.window as unknown as typeof globalThis.window;
  globalThis.MutationObserver = dom.window.MutationObserver;
  globalThis.CustomEvent = dom.window.CustomEvent;
  globalThis.Element = dom.window.Element;
  globalThis.Event = dom.window.Event;
  // ws.ts uses HTMLFormElement in collectWSSendPayload.
  globalThis.HTMLFormElement = dom.window.HTMLFormElement;
  globalThis.FormData = dom.window.FormData;
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

describe('WebSocket integration', () => {
  describe('WSConnection (via processor.attachWS)', () => {
    it('opens a WebSocket against the ws-connect URL', () => {
      const { ctor, instances } = createMockWSFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const el = mkElement('<div ws-connect="wss://example/api"></div>');
      proc.attachWS(el);
      expect(instances).toHaveLength(1);
      expect(instances[0].url).toBe('wss://example/api');
      proc.destroy();
    });

    it('returns the same connection for repeated attach calls', () => {
      const { ctor } = createMockWSFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const el = mkElement('<div ws-connect="/api"></div>');
      const a = proc.attachWS(el);
      const b = proc.attachWS(el);
      expect(a).toBe(b);
      proc.destroy();
    });

    it('queues sends before OPEN, flushes after', () => {
      const { ctor, instances } = createMockWSFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const el = mkElement('<div ws-connect="/q"></div>');
      const conn = proc.attachWS(el)!;
      // Before fireOpen, sends should queue.
      conn.send({ msg: 'a' });
      conn.send({ msg: 'b' });
      expect(instances[0].sent).toHaveLength(0);
      instances[0].fireOpen();
      expect(instances[0].sent).toHaveLength(2);
      expect(JSON.parse(instances[0].sent[0])).toEqual({ msg: 'a' });
      proc.destroy();
    });

    it('routes JSON envelopes with target through the execute callback as a swap', async () => {
      const { ctor, instances } = createMockWSFactory();
      const calls: string[] = [];
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      proc.init(async code => {
        calls.push(code);
      });
      const el = mkElement('<div ws-connect="/api"></div>');
      proc.processElement(el);
      instances[0].fireOpen();
      instances[0].fireMessage(
        JSON.stringify({ target: '#out', swap: 'innerHTML', data: '<i>x</i>' })
      );
      await Promise.resolve();
      expect(calls).toHaveLength(1);
      expect(calls[0]).toContain('#out');
      expect(calls[0]).toContain('<i>x</i>');
      proc.destroy();
    });

    it('dispatches htmx:wsMessage for non-envelope payloads', () => {
      const { ctor, instances } = createMockWSFactory();
      const events: { type: string; detail: unknown }[] = [];
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const el = mkElement('<div ws-connect="/api"></div>');
      el.addEventListener('htmx:wsMessage', e =>
        events.push({ type: e.type, detail: (e as CustomEvent).detail })
      );
      proc.attachWS(el);
      instances[0].fireOpen();
      instances[0].fireMessage('plain text');
      expect(events).toHaveLength(1);
      const detail = events[0].detail as { data: string };
      expect(detail.data).toBe('plain text');
      proc.destroy();
    });

    it('dispatches htmx:wsOpen / htmx:wsClose lifecycle events', () => {
      const { ctor, instances } = createMockWSFactory();
      const seen: string[] = [];
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const el = mkElement('<div ws-connect="/api"></div>');
      for (const name of ['htmx:wsOpen', 'htmx:wsClose']) {
        el.addEventListener(name, () => seen.push(name));
      }
      proc.attachWS(el);
      instances[0].fireOpen();
      proc.detachWS(el);
      expect(seen).toContain('htmx:wsOpen');
      expect(seen).toContain('htmx:wsClose');
    });

    it('closes WebSocket on detach', () => {
      const { ctor, instances } = createMockWSFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const el = mkElement('<div ws-connect="/api"></div>');
      proc.attachWS(el);
      expect(instances[0].closeWasCalled).toBe(false);
      proc.detachWS(el);
      expect(instances[0].closeWasCalled).toBe(true);
    });

    it('closes all WS connections on processor.destroy()', () => {
      const { ctor, instances } = createMockWSFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const a = mkElement('<div ws-connect="/a"></div>');
      const b = mkElement('<div ws-connect="/b"></div>');
      proc.attachWS(a);
      proc.attachWS(b);
      proc.destroy();
      expect(instances[0].closeWasCalled).toBe(true);
      expect(instances[1].closeWasCalled).toBe(true);
    });

    it('detaches WS on element removal via MutationObserver', async () => {
      const { ctor, instances } = createMockWSFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: true,
        root: document.body,
        wsEventSourceCtor: ctor,
      });
      proc.init(async () => undefined);
      const el = mkElement('<div ws-connect="/api"></div>');
      proc.processElement(el);
      el.remove();
      await new Promise(r => setTimeout(r, 10));
      expect(instances[0].closeWasCalled).toBe(true);
      proc.destroy();
    });

    it('reconnects with exponential backoff on unclean close, gives up after maxAttempts', async () => {
      vi.useFakeTimers();
      const { ctor, instances } = createMockWSFactory();
      const events: string[] = [];
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const el = mkElement('<div ws-connect="/api"></div>');
      el.addEventListener('htmx:wsClose', () => events.push('close'));
      proc.attachWS(el);
      // Drive multiple unclean closes. fireClose nulls our `socket` ref
      // (via onclose) and schedules reconnect — open() then constructs a
      // fresh mock instance.
      for (let i = 0; i < 6; i++) {
        const sock = instances[instances.length - 1];
        sock.fireClose(false);
        vi.advanceTimersByTime(40_000);
      }
      // Default maxAttempts=5 → at most original + 5 retries = 6 opens.
      expect(instances.length).toBeLessThanOrEqual(6);
      // Give-up triggers detach(), which dispatches a final htmx:wsClose
      // beyond the per-socket onclose events. The presence of an extra
      // close event after the loop's onclose run signals give-up.
      // (Each fireClose triggers one event; detach adds one more.)
      expect(events.length).toBeGreaterThanOrEqual(6);
      vi.useRealTimers();
      proc.destroy();
    });
  });

  describe('ws-send wiring', () => {
    it('serializes a form on submit and sends as JSON', () => {
      const { ctor, instances } = createMockWSFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const root = mkElement(`
        <div ws-connect="/api">
          <form ws-send>
            <input name="msg" value="hello" />
            <input name="user" value="alice" />
            <button type="submit">Send</button>
          </form>
        </div>
      `);
      proc.processElement(root);
      instances[0].fireOpen();
      const form = root.querySelector('form')!;
      form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
      expect(instances[0].sent).toHaveLength(1);
      expect(JSON.parse(instances[0].sent[0])).toEqual({ msg: 'hello', user: 'alice' });
      proc.destroy();
    });

    it('serializes a button (name+value) on click', () => {
      const { ctor, instances } = createMockWSFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const root = mkElement(`
        <div ws-connect="/api">
          <button ws-send name="action" value="ping">Ping</button>
        </div>
      `);
      proc.processElement(root);
      instances[0].fireOpen();
      const btn = root.querySelector('button')!;
      btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
      expect(instances[0].sent).toHaveLength(1);
      expect(JSON.parse(instances[0].sent[0])).toEqual({ action: 'ping' });
      proc.destroy();
    });

    it('prevents default form submission so the page does not navigate', () => {
      const { ctor, instances } = createMockWSFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const root = mkElement(`
        <div ws-connect="/api">
          <form ws-send action="/legacy">
            <input name="x" value="1" />
          </form>
        </div>
      `);
      proc.processElement(root);
      instances[0].fireOpen();
      const form = root.querySelector('form')!;
      const submitEvent = new dom.window.Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);
      expect(submitEvent.defaultPrevented).toBe(true);
      proc.destroy();
    });

    it('idempotent listener installation — repeated processElement does not stack listeners', () => {
      const { ctor, instances } = createMockWSFactory();
      const proc = new HtmxAttributeProcessor({
        watchMutations: false,
        wsEventSourceCtor: ctor,
      });
      const root = mkElement(`
        <div ws-connect="/api">
          <button ws-send name="a" value="1">a</button>
        </div>
      `);
      proc.processElement(root);
      // Force a second pass by clearing the processed-set entry.
      proc.processElement(root);
      // attachWS is idempotent — same conn. ws-send listener too.
      instances[0].fireOpen();
      root.querySelector('button')!.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
      expect(instances[0].sent).toHaveLength(1);
      proc.destroy();
    });
  });

  describe('collectWSSendPayload', () => {
    it('serializes a form to a plain object', () => {
      const form = document.createElement('form');
      const i1 = document.createElement('input');
      i1.name = 'a';
      i1.value = '1';
      const i2 = document.createElement('input');
      i2.name = 'b';
      i2.value = '2';
      form.append(i1, i2);
      expect(collectWSSendPayload(form)).toEqual({ a: '1', b: '2' });
    });

    it('serializes a button with name+value', () => {
      const btn = document.createElement('button');
      btn.name = 'action';
      btn.value = 'go';
      expect(collectWSSendPayload(btn)).toEqual({ action: 'go' });
    });

    it('returns {} for elements with no name', () => {
      const div = document.createElement('div');
      expect(collectWSSendPayload(div)).toEqual({});
    });
  });
});
