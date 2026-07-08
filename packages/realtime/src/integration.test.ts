/**
 * End-to-end integration — parse + installPlugin + execute round-trip.
 *
 * Uses the `registry.snapshot()` / `registry.restore(baseline)` pattern to
 * isolate plugin installations from other tests in the process (same harness
 * as @hyperfixi/reactivity).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime } from '@hyperfixi/core';
import { parse } from '@hyperfixi/core';
import { getParserExtensionRegistry, installPlugin } from '@hyperfixi/core';
import type { ExecutionContext } from '@hyperfixi/core/src/types/core';
import { realtimePlugin, configureRealtime, realtime } from './index';
import type { SocketFeatureNode } from './socket';
import type { EventSourceFeatureNode } from './eventsource';
import type { WorkerFeatureNode } from './worker';

function createContext(
  me: HTMLElement,
  globals: Map<string, unknown> = new Map()
): ExecutionContext {
  return {
    me,
    it: null,
    you: null,
    result: null,
    locals: new Map(),
    globals,
    variables: new Map(),
    events: new Map(),
  } as unknown as ExecutionContext;
}

/** Drain microtasks + the setTimeout queue so async handlers settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

// ---------------------------------------------------------------------------
// Fake transports
// ---------------------------------------------------------------------------

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readyState = 0; // CONNECTING
  sent: string[] = [];
  onopen: ((ev?: unknown) => void) | null = null;
  onclose: ((ev?: { wasClean?: boolean }) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  simulateOpen(): void {
    this.readyState = 1;
    this.onopen?.();
  }
  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }
  simulateUncleanClose(): void {
    this.readyState = 3;
    this.onclose?.({ wasClean: false });
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.readyState = 3;
    this.onclose?.({ wasClean: true });
  }
}

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readyState = 1; // OPEN
  listeners = new Map<string, Array<(ev: { data: string }) => void>>();
  onerror: ((ev?: unknown) => void) | null = null;

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, fn: (ev: { data: string }) => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  emit(type: string, data: string): void {
    for (const fn of this.listeners.get(type) ?? []) fn({ data });
  }
  close(): void {
    this.readyState = 2;
  }
}

// ---------------------------------------------------------------------------

describe('@hyperfixi/realtime — integration', () => {
  const registry = getParserExtensionRegistry();
  let baseline: ReturnType<typeof registry.snapshot>;
  let runtime: Runtime;

  beforeEach(() => {
    baseline = registry.snapshot();
    runtime = new Runtime();
    installPlugin(runtime, realtimePlugin);
    FakeWebSocket.instances = [];
    FakeEventSource.instances = [];
    configureRealtime({
      WebSocketCtor: FakeWebSocket as never,
      EventSourceCtor: FakeEventSource as never,
    });
  });

  afterEach(() => {
    realtime.closeAll();
    configureRealtime();
    registry.restore(baseline);
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('parse shapes', () => {
    it('parses the socket-basic corpus pattern verbatim', () => {
      const r = parse('socket ChatSocket ws://localhost:8080 on message put it into #chat end');
      expect(r.success).toBe(true);
      const node = r.node as unknown as SocketFeatureNode;
      expect(node.type).toBe('socketFeature');
      expect(node.name).toBe('ChatSocket');
      expect(node.url).toBe('ws://localhost:8080');
      expect(node.handler?.event).toBe('message');
      expect(node.handler?.body.length).toBeGreaterThan(0);
    });

    it('parses the eventsource-basic corpus pattern verbatim', () => {
      const r = parse(
        'eventsource ChatStream from /events on message put it into #messages end end'
      );
      expect(r.success).toBe(true);
      const node = r.node as unknown as EventSourceFeatureNode;
      expect(node.type).toBe('eventsourceFeature');
      expect(node.name).toBe('ChatStream');
      expect(node.url).toBe('/events');
      expect(node.handlers).toHaveLength(1);
      expect(node.handlers[0].event).toBe('message');
    });

    it('parses the worker-basic corpus pattern verbatim', () => {
      const r = parse('worker Calculator def add(a, b) return a + b end end');
      expect(r.success).toBe(true);
      const node = r.node as unknown as WorkerFeatureNode;
      expect(node.type).toBe('workerFeature');
      expect(node.name).toBe('Calculator');
      expect(node.defs).toHaveLength(1);
      expect(node.defs[0].name).toBe('add');
      expect(node.defs[0].params).toEqual(['a', 'b']);
    });

    it('parses a quoted socket URL', () => {
      const r = parse('socket S "wss://example.com/chat" end');
      expect(r.success).toBe(true);
      expect((r.node as unknown as SocketFeatureNode).url).toBe('wss://example.com/chat');
    });

    it('parses a bare wss URL with a path', () => {
      const r = parse('socket S wss://example.com/chat/v2 on message log it end');
      expect(r.success).toBe(true);
      expect((r.node as unknown as SocketFeatureNode).url).toBe('wss://example.com/chat/v2');
    });

    it('parses a handler-less socket with explicit end', () => {
      const r = parse('socket Quiet ws://localhost:9999 end');
      expect(r.success).toBe(true);
      const node = r.node as unknown as SocketFeatureNode;
      expect(node.handler).toBeUndefined();
    });

    it('parses a multi-handler eventsource', () => {
      const r = parse(
        'eventsource Feed from /feed on post put it into #posts end on like as json log it end end'
      );
      expect(r.success).toBe(true);
      const node = r.node as unknown as EventSourceFeatureNode;
      expect(node.handlers).toHaveLength(2);
      expect(node.handlers[0].event).toBe('post');
      expect(node.handlers[1].event).toBe('like');
      expect(node.handlers[1].as).toBe('json');
    });

    it('parses a multi-def worker', () => {
      const r = parse('worker Math def add(a, b) return a + b end def neg(a) return 0 - a end end');
      expect(r.success).toBe(true);
      const node = r.node as unknown as WorkerFeatureNode;
      expect(node.defs.map(d => d.name)).toEqual(['add', 'neg']);
    });

    it('reports a parse error (not a throw) when end is missing', () => {
      const r = parse('socket Bad ws://x on message log it');
      expect(r.success).toBe(false);
    });
  });

  describe('socket', () => {
    it('runs the message handler with `it` bound to the payload (DOM effect)', async () => {
      const chat = document.createElement('div');
      chat.id = 'chat';
      const owner = document.createElement('div');
      document.body.append(chat, owner);

      const r = parse('socket ChatSocket ws://localhost:8080 on message put it into #chat end');
      expect(r.success).toBe(true);
      const ctx = createContext(owner);
      await runtime.execute(r.node!, ctx);

      const ws = FakeWebSocket.instances[0];
      expect(ws).toBeDefined();
      ws.simulateOpen();
      ws.simulateMessage('hello world');
      await settle();

      expect(chat.textContent).toBe('hello world');
    });

    it('parses JSON payloads into `it` (raw fallback covered above)', async () => {
      const owner = document.createElement('div');
      document.body.append(owner);

      const r = parse('socket S ws://x on message set $last to it end');
      expect(r.success).toBe(true);
      const globals = new Map<string, unknown>();
      await runtime.execute(r.node!, createContext(owner, globals));

      const ws = FakeWebSocket.instances[0];
      ws.simulateOpen();
      ws.simulateMessage('{"n": 42}');
      await settle();

      expect(globals.get('last')).toEqual({ n: 42 });
    });

    it('registers the connection under its name in shared globals', async () => {
      const owner = document.createElement('div');
      document.body.append(owner);
      const globals = new Map<string, unknown>();

      const r = parse('socket ChatSocket ws://x end');
      await runtime.execute(r.node!, createContext(owner, globals));

      expect(globals.get('ChatSocket')).toBeDefined();
      expect(realtime.get('ChatSocket')).toBe(globals.get('ChatSocket'));
    });

    it('queues sends before open and flushes on open', async () => {
      const owner = document.createElement('div');
      document.body.append(owner);
      const globals = new Map<string, unknown>();

      await runtime.execute(parse('socket S ws://x end').node!, createContext(owner, globals));
      const conn = globals.get('S') as { send(p: string): void };
      conn.send('early');

      const ws = FakeWebSocket.instances[0];
      expect(ws.sent).toEqual([]);
      ws.simulateOpen();
      expect(ws.sent).toEqual(['early']);
    });

    it('supports `send <event> to <SocketName>` end-to-end', async () => {
      const owner = document.createElement('button');
      document.body.append(owner);
      const globals = new Map<string, unknown>();

      await runtime.execute(
        parse('socket ChatSocket ws://x end').node!,
        createContext(owner, globals)
      );
      FakeWebSocket.instances[0].simulateOpen();

      const send = parse('send hello to ChatSocket');
      expect(send.success).toBe(true);
      await runtime.execute(send.node!, createContext(owner, globals));
      await settle();

      expect(FakeWebSocket.instances[0].sent).toContain('hello');
    });

    it('reconnects with backoff after an unclean close, then gives up', async () => {
      vi.useFakeTimers();
      const owner = document.createElement('div');
      document.body.append(owner);

      await runtime.execute(parse('socket S ws://x end').node!, createContext(owner, new Map()));
      expect(FakeWebSocket.instances).toHaveLength(1);

      // First unclean close → reconnect after base backoff (1000ms).
      FakeWebSocket.instances[0].simulateUncleanClose();
      await vi.advanceTimersByTimeAsync(999);
      expect(FakeWebSocket.instances).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(FakeWebSocket.instances).toHaveLength(2);

      // Exhaust the remaining attempts (2000, 4000, 8000, 16000ms) —
      // maxAttempts=5 reconnects on top of the initial connection = 6 total.
      for (const delay of [2000, 4000, 8000, 16000]) {
        FakeWebSocket.instances[FakeWebSocket.instances.length - 1].simulateUncleanClose();
        await vi.advanceTimersByTimeAsync(delay);
      }
      expect(FakeWebSocket.instances).toHaveLength(6);

      // Attempts exhausted: a further close schedules nothing.
      FakeWebSocket.instances[5].simulateUncleanClose();
      await vi.advanceTimersByTimeAsync(60000);
      expect(FakeWebSocket.instances).toHaveLength(6);
    });
  });

  describe('eventsource', () => {
    it('routes named events to their handlers', async () => {
      const messages = document.createElement('div');
      messages.id = 'messages';
      const owner = document.createElement('div');
      document.body.append(messages, owner);

      const r = parse(
        'eventsource ChatStream from /events on message put it into #messages end end'
      );
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, createContext(owner));

      const es = FakeEventSource.instances[0];
      expect(es.url).toBe('/events');
      es.emit('message', 'live update');
      await settle();

      expect(messages.textContent).toBe('live update');
    });

    it('parses payloads with `as json`', async () => {
      const owner = document.createElement('div');
      document.body.append(owner);
      const globals = new Map<string, unknown>();

      const r = parse('eventsource Feed from /f on tick as json set $t to it end end');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, createContext(owner, globals));

      FakeEventSource.instances[0].emit('tick', '{"at": 5}');
      await settle();
      expect(globals.get('t')).toEqual({ at: 5 });
    });

    it('reopens with backoff only when the source is CLOSED', async () => {
      vi.useFakeTimers();
      const owner = document.createElement('div');
      document.body.append(owner);

      await runtime.execute(
        parse('eventsource F from /f on message log it end end').node!,
        createContext(owner)
      );
      const es = FakeEventSource.instances[0];

      // Transient error while still OPEN → the browser retries; no reopen.
      es.onerror?.();
      await vi.advanceTimersByTimeAsync(5000);
      expect(FakeEventSource.instances).toHaveLength(1);

      // CLOSED → manual reopen with backoff, and listeners re-attach.
      es.readyState = 2;
      es.onerror?.();
      await vi.advanceTimersByTimeAsync(1000);
      expect(FakeEventSource.instances).toHaveLength(2);
      expect(FakeEventSource.instances[1].listeners.get('message')).toBeDefined();
    });
  });

  describe('worker (async main-thread shim)', () => {
    it('exposes defs as Promise-returning functions', async () => {
      const owner = document.createElement('div');
      document.body.append(owner);
      const globals = new Map<string, unknown>();

      const r = parse('worker Calculator def add(a, b) return a + b end end');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, createContext(owner, globals));

      const api = globals.get('Calculator') as {
        add(a: number, b: number): Promise<number>;
      };
      expect(api).toBeDefined();
      await expect(api.add(1, 2)).resolves.toBe(3);
    });

    it('captures an early return before later commands run', async () => {
      const owner = document.createElement('div');
      document.body.append(owner);
      const globals = new Map<string, unknown>();

      const r = parse('worker W def pick(a) return a then set $after to "ran" end end');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, createContext(owner, globals));

      const api = globals.get('W') as { pick(a: string): Promise<string> };
      await expect(api.pick('chosen')).resolves.toBe('chosen');
      expect(globals.get('after')).toBeUndefined();
    });

    it('is callable from a hyperscript expression', async () => {
      const owner = document.createElement('div');
      document.body.append(owner);
      const globals = new Map<string, unknown>();

      await runtime.execute(
        parse('worker Calculator def add(a, b) return a + b end end').node!,
        createContext(owner, globals)
      );

      const r = parse('set $sum to Calculator.add(1, 2)');
      expect(r.success).toBe(true);
      await runtime.execute(r.node!, createContext(owner, globals));
      await settle();

      expect(globals.get('sum')).toBe(3);
    });
  });

  describe('lifecycle', () => {
    it('realtime.stopElement detaches connections owned by the element', async () => {
      const owner = document.createElement('div');
      document.body.append(owner);
      const globals = new Map<string, unknown>();

      await runtime.execute(parse('socket S ws://x end').node!, createContext(owner, globals));
      const ws = FakeWebSocket.instances[0];
      ws.simulateOpen();

      realtime.stopElement(owner);
      expect(ws.readyState).toBe(3); // closed
      expect(realtime.get('S')).toBeUndefined();
    });

    it('installs inert (no throw) when no transport constructor exists', async () => {
      configureRealtime(); // clear fakes
      vi.stubGlobal('WebSocket', undefined);
      vi.stubGlobal('EventSource', undefined);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const owner = document.createElement('div');
        document.body.append(owner);

        await expect(
          runtime.execute(
            parse('socket S ws://x on message log it end').node!,
            createContext(owner)
          )
        ).resolves.toBeUndefined();
        await expect(
          runtime.execute(
            parse('eventsource E from /f on message log it end end').node!,
            createContext(owner)
          )
        ).resolves.toBeUndefined();
        expect(warnSpy).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
        vi.unstubAllGlobals();
      }
    });

    it('re-installing the plugin is idempotent (one connection per execute)', async () => {
      installPlugin(runtime, realtimePlugin);
      installPlugin(runtime, realtimePlugin);

      const owner = document.createElement('div');
      document.body.append(owner);
      await runtime.execute(parse('socket S ws://x end').node!, createContext(owner, new Map()));
      expect(FakeWebSocket.instances).toHaveLength(1);
    });
  });
});
