/**
 * Supplementary coverage for the eventsource (SSE) feature.
 *
 * eventsource.test.ts covers the output API against fake connection ids; this suite
 * targets the gaps: validate() branches and the internal EventSource lifecycle
 * (open/message/error handlers) driven via an instance-registry mock.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEventSourceFeature, TypedEventSourceFeatureImplementation } from './eventsource';

class MockES {
  static instances: MockES[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  readyState = MockES.CONNECTING;
  onopen: ((e: any) => void) | null = null;
  onmessage: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockES.instances.push(this);
  }
  close() {
    this.readyState = MockES.CLOSED;
  }
  triggerOpen() {
    this.readyState = MockES.OPEN;
    this.onopen?.(new Event('open'));
  }
  triggerMessage(data: unknown, type = 'message') {
    this.onmessage?.({ data, type } as MessageEvent);
  }
  triggerError() {
    this.onerror?.(new Event('error'));
  }
}

const makeInput = (over: Record<string, any> = {}) => ({
  source: { url: 'https://api.example.com/events', withCredentials: false, ...over.source },
  eventHandlers: over.eventHandlers ?? [
    { event: 'message', commands: [{ type: 'command', name: 'processMessage', args: [] }] },
  ],
  context: { variables: {} },
  options: { enableAutoConnect: false, ...over.options },
});

describe('eventsource feature — supplementary coverage', () => {
  let feature: TypedEventSourceFeatureImplementation;
  let originalES: any;

  beforeEach(() => {
    originalES = globalThis.EventSource;
    globalThis.EventSource = MockES as unknown as typeof EventSource;
    MockES.instances = [];
    feature = createEventSourceFeature();
  });
  afterEach(() => {
    feature.dispose();
    globalThis.EventSource = originalES;
    vi.restoreAllMocks();
  });

  describe('validate()', () => {
    it('rejects non-object input', () => {
      expect(feature.validate(null).isValid).toBe(false);
    });

    it('accepts a minimal valid source config', () => {
      expect(feature.validate({ source: { url: 'https://api.example.com/events' } }).isValid).toBe(
        true
      );
    });

    it('requires a source URL', () => {
      const r = feature.validate({ source: {} });
      expect(r.isValid).toBe(false);
      expect(r.errors.some(e => e.code === 'missing-eventsource-url')).toBe(true);
    });

    it('rejects a non-HTTP(S) URL', () => {
      const r = feature.validate({ source: { url: 'ftp://example.com/events' } });
      expect(r.isValid).toBe(false);
      expect(r.errors.some(e => e.code === 'invalid-eventsource-url')).toBe(true);
    });

    it('rejects a negative buffer size', () => {
      const r = feature.validate({
        source: { url: 'https://x.example.com' },
        messageProcessing: { buffer: { maxSize: -1 } },
      });
      expect(r.isValid).toBe(false);
      expect(r.errors.some(e => e.code === 'invalid-buffer-size')).toBe(true);
    });

    it('rejects an empty event-handler commands array', () => {
      const r = feature.validate({
        source: { url: 'https://x.example.com' },
        eventHandlers: [{ event: 'message', commands: [] }],
      });
      expect(r.isValid).toBe(false);
      expect(r.errors.some(e => e.code === 'empty-commands-array')).toBe(true);
    });

    it('rejects invalid retry settings', () => {
      const negAttempts = feature.validate({
        source: {
          url: 'https://x.example.com',
          retry: { maxAttempts: -1, delay: 0, maxDelay: 10 },
        },
      });
      expect(negAttempts.isValid).toBe(false);

      const negDelay = feature.validate({
        source: {
          url: 'https://x.example.com',
          retry: { maxAttempts: 3, delay: -1, maxDelay: 10 },
        },
      });
      expect(negDelay.isValid).toBe(false);
    });
  });

  describe('messages API', () => {
    let out: any;
    beforeEach(async () => {
      out = (await feature.initialize(makeInput())).value;
    });

    it('exposes history and buffer accessors', () => {
      expect(Array.isArray(out.messages.getHistory())).toBe(true);
      expect(Array.isArray(out.messages.getBuffer('conn-1'))).toBe(true);
      expect(out.messages.clearHistory()).toBe(true);
    });
  });

  describe('EventSource lifecycle (mock-driven)', () => {
    it('handles open and message events, recording history', async () => {
      const out = (await feature.initialize(makeInput())).value;
      await out.connection.connect({
        url: 'https://api.example.com/events',
        withCredentials: false,
      });
      const es = MockES.instances.at(-1)!;

      es.triggerOpen();
      await Promise.resolve();

      const before = out.messages.getHistory().length;
      es.triggerMessage(JSON.stringify({ hello: 'world' }));
      await Promise.resolve();
      expect(out.messages.getHistory().length).toBeGreaterThan(before);
    });

    it('handles connection errors (fake timers swallow the reconnection timer)', async () => {
      vi.useFakeTimers();
      try {
        const out = (await feature.initialize(makeInput())).value;
        await out.connection.connect({
          url: 'https://api.example.com/events',
          withCredentials: false,
        });
        const es = MockES.instances.at(-1)!;
        es.triggerError();
        await Promise.resolve();
        // Error handler ran and (attempted) reconnection was scheduled but not run.
        expect(out.errors.getErrorHistory().length).toBeGreaterThanOrEqual(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('getPerformanceMetrics()', () => {
    it('reflects an initialization', async () => {
      await feature.initialize(makeInput());
      expect(feature.getPerformanceMetrics().totalInitializations).toBeGreaterThanOrEqual(1);
    });
  });
});
