/**
 * Supplementary coverage for the sockets feature (TypedSocketsFeatureImplementation).
 *
 * sockets.test.ts covers connection/messaging/events/errors; this suite targets the
 * gaps: validate() branches, the message queue API, and the internal WebSocket
 * lifecycle (open/message/error/close handlers) driven via an instance-registry mock.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSocketsFeature, TypedSocketsFeatureImplementation } from './sockets';

// Mock WebSocket that records created instances and exposes manual event triggers,
// so tests can drive the feature's onopen/onmessage/onerror/onclose handlers.
class MockWS {
  static instances: MockWS[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  protocols: string[];
  readyState = MockWS.CONNECTING;
  onopen: ((e: any) => void) | null = null;
  onclose: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onmessage: ((e: any) => void) | null = null;

  constructor(url: string, protocols: string[] = []) {
    this.url = url;
    this.protocols = protocols;
    MockWS.instances.push(this);
  }
  send() {}
  close(code?: number, reason?: string) {
    this.readyState = MockWS.CLOSED;
    this.onclose?.({ code: code ?? 1000, reason: reason ?? '' });
  }
  triggerOpen() {
    this.readyState = MockWS.OPEN;
    this.onopen?.(new Event('open'));
  }
  triggerMessage(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
  triggerError() {
    this.onerror?.(new Event('error'));
  }
}

const socketConfig = (over: Record<string, any> = {}) => ({
  url: 'wss://api.example.com/ws',
  protocols: [],
  reconnect: { enabled: true },
  heartbeat: { enabled: false },
  compression: false,
  binaryType: 'blob',
  ...over,
});

const makeInput = (over: Record<string, any> = {}) => ({
  socket: socketConfig(over.socket),
  eventHandlers: over.eventHandlers ?? [
    { event: 'message', commands: [{ type: 'command', name: 'processMessage', args: [] }] },
  ],
  context: { variables: {} },
  options: { enableAutoConnect: false, ...over.options },
});

describe('sockets feature — supplementary coverage', () => {
  let feature: TypedSocketsFeatureImplementation;
  let originalWS: any;

  beforeEach(() => {
    originalWS = globalThis.WebSocket;
    globalThis.WebSocket = MockWS as unknown as typeof WebSocket;
    MockWS.instances = [];
    feature = createSocketsFeature();
  });
  afterEach(() => {
    feature.dispose();
    globalThis.WebSocket = originalWS;
    vi.restoreAllMocks();
  });

  describe('validate()', () => {
    it('rejects non-object input', () => {
      expect(feature.validate(null).isValid).toBe(false);
      expect(feature.validate('x').isValid).toBe(false);
    });

    it('accepts a minimal valid socket config', () => {
      expect(feature.validate({ socket: { url: 'wss://api.example.com/ws' } }).isValid).toBe(true);
    });

    it('requires a socket URL', () => {
      const r = feature.validate({ socket: {} });
      expect(r.isValid).toBe(false);
      expect(r.errors.some(e => e.path === 'socket.url')).toBe(true);
    });

    it('rejects a non-ws(s) protocol', () => {
      const r = feature.validate({ socket: { url: 'http://api.example.com' } });
      expect(r.isValid).toBe(false);
      expect(r.errors.some(e => e.code === 'invalid-websocket-protocol')).toBe(true);
    });

    it('rejects a malformed URL', () => {
      const r = feature.validate({ socket: { url: 'not a url' } });
      expect(r.isValid).toBe(false);
      expect(r.errors.some(e => e.code === 'invalid-websocket-url')).toBe(true);
    });

    it('rejects invalid reconnection settings', () => {
      const negAttempts = feature.validate({
        socket: {
          url: 'wss://x.example.com',
          reconnect: { maxAttempts: -1, delay: 0, maxDelay: 10 },
        },
      });
      expect(negAttempts.isValid).toBe(false);

      const badDelay = feature.validate({
        socket: {
          url: 'wss://x.example.com',
          reconnect: { maxAttempts: 3, delay: -1, maxDelay: 10 },
        },
      });
      expect(badDelay.isValid).toBe(false);

      const maxLtDelay = feature.validate({
        socket: {
          url: 'wss://x.example.com',
          reconnect: { maxAttempts: 3, delay: 100, maxDelay: 10 },
        },
      });
      expect(maxLtDelay.isValid).toBe(false);
    });

    it('rejects invalid heartbeat settings', () => {
      const badInterval = feature.validate({
        socket: {
          url: 'wss://x.example.com',
          heartbeat: { enabled: true, interval: 0, timeout: 5 },
        },
      });
      expect(badInterval.isValid).toBe(false);

      const timeoutGteInterval = feature.validate({
        socket: {
          url: 'wss://x.example.com',
          heartbeat: { enabled: true, interval: 100, timeout: 100 },
        },
      });
      expect(timeoutGteInterval.isValid).toBe(false);
    });

    it('rejects an invalid event-handler filter expression', () => {
      const r = feature.validate({
        socket: { url: 'wss://x.example.com' },
        eventHandlers: [{ event: 'message', commands: [], filter: 'return return' }],
      });
      expect(r.isValid).toBe(false);
      expect(r.errors.some(e => e.code === 'invalid-filter-expression')).toBe(true);
    });
  });

  describe('message queue API', () => {
    let out: any;
    beforeEach(async () => {
      out = (await feature.initialize(makeInput())).value;
    });

    it('exposes the queue factory API (no-op for an unconnected id)', async () => {
      // queueMessage only pushes when a connection (and thus a queue) exists; an
      // arbitrary id has no queue, so these exercise the factory + guard paths.
      expect(out.queue.getSize('conn-1')).toBe(0);
      expect(out.queue.getPending('conn-1')).toEqual([]);
      expect(await out.queue.add('conn-1', { hello: 'world' })).toBe(true);
      expect(await out.queue.process('conn-1')).toBe(true);
      expect(out.queue.clear('conn-1')).toBe(false); // no queue for this id
    });
  });

  describe('WebSocket lifecycle (mock-driven)', () => {
    let out: any;
    beforeEach(async () => {
      out = (await feature.initialize(makeInput())).value;
    });

    it('handles open, message, error and close events', async () => {
      const connected = await out.connection.connect(socketConfig());
      expect(connected).toBe(true);
      const ws = MockWS.instances.at(-1)!;

      // open -> connected
      ws.triggerOpen();
      await Promise.resolve();

      // message -> recorded in history + message event handler path
      const before = out.messaging.getMessageHistory().length;
      ws.triggerMessage(JSON.stringify({ type: 'greeting' }));
      await Promise.resolve();
      expect(out.messaging.getMessageHistory().length).toBeGreaterThan(before);

      // error and close handlers run without throwing
      ws.triggerError();
      ws.close(1001, 'going away');
      await Promise.resolve();
    });

    it('reports connection info and state after connecting', async () => {
      await out.connection.connect(socketConfig());
      MockWS.instances.at(-1)!.triggerOpen();
      await Promise.resolve();
      const info = out.connection.getConnectionInfo();
      expect(info).toBeDefined();
    });
  });

  describe('getPerformanceMetrics()', () => {
    it('reflects an initialization', async () => {
      await feature.initialize(makeInput());
      expect(feature.getPerformanceMetrics().totalInitializations).toBeGreaterThanOrEqual(1);
    });
  });
});
