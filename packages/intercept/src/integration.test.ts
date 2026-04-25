/**
 * End-to-end integration — parse + installPlugin + execute round-trip.
 *
 * happy-dom doesn't ship `navigator.serviceWorker`, so we install a mock onto
 * the global navigator before the runtime is touched. The mock records the
 * register call + any postMessage calls so we can assert the full pipeline.
 *
 * Uses the `registry.snapshot()` / `registry.restore(baseline)` pattern to
 * isolate plugin installations from other test files in the process.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime, parse, getParserExtensionRegistry, installPlugin } from '@hyperfixi/core';
import { createInterceptPlugin, _resetForTest } from './index';

// --- Mock service-worker registry --------------------------------------------

interface MockSW {
  state: 'installing' | 'waiting' | 'activated';
  postedMessages: unknown[];
  listeners: Map<string, Array<() => void>>;
  postMessage(msg: unknown): void;
  addEventListener(ev: string, cb: () => void): void;
  _advanceTo(state: 'activated'): void;
}

interface MockRegistration {
  installing: MockSW | null;
  waiting: MockSW | null;
  active: MockSW | null;
}

interface MockNavigator {
  lastScope?: string;
  lastUrl?: string;
  registrations: MockRegistration[];
  register(url: string, opts: { scope: string }): Promise<MockRegistration>;
  /** Resolve the next register() call with an SW starting in this state. */
  _nextInitialState: 'installing' | 'activated';
  /** If set, register() rejects with this error. */
  _nextError?: Error;
}

function makeSW(state: MockSW['state']): MockSW {
  const sw: MockSW = {
    state,
    postedMessages: [],
    listeners: new Map(),
    postMessage(msg) {
      this.postedMessages.push(msg);
    },
    addEventListener(ev, cb) {
      const arr = this.listeners.get(ev) ?? [];
      arr.push(cb);
      this.listeners.set(ev, arr);
    },
    _advanceTo(next) {
      this.state = next;
      const cbs = this.listeners.get('statechange') ?? [];
      for (const cb of cbs) cb();
    },
  };
  return sw;
}

function installMockNavigator(): MockNavigator {
  const mock: MockNavigator = {
    registrations: [],
    _nextInitialState: 'activated',
    async register(url, opts) {
      if (this._nextError) {
        const err = this._nextError;
        this._nextError = undefined;
        throw err;
      }
      this.lastUrl = url;
      this.lastScope = opts.scope;
      const sw = makeSW(this._nextInitialState);
      const reg: MockRegistration = {
        installing: this._nextInitialState === 'installing' ? sw : null,
        waiting: null,
        active: this._nextInitialState === 'activated' ? sw : null,
      };
      this.registrations.push(reg);
      return reg;
    },
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    value: mock,
    configurable: true,
    writable: true,
  });
  return mock;
}

function uninstallMockNavigator(): void {
  const desc = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  if (desc) {
    // Just overwrite with an object lacking postMessage so `'serviceWorker' in navigator`
    // returns false for the next test's "not supported" scenario if needed.
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    // Also delete for the "not supported" test — re-add when needed.
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
  }
}

function getSW(reg: MockRegistration): MockSW {
  return (reg.installing || reg.waiting || reg.active)!;
}

// --- Tests --------------------------------------------------------------------

describe('@hyperfixi/intercept — integration', () => {
  const registry = getParserExtensionRegistry();
  let baseline: ReturnType<typeof registry.snapshot>;
  let runtime: Runtime;
  let mockNav: MockNavigator;
  const plugin = createInterceptPlugin({ swUrl: '/hyperfixi-sw.js' });

  beforeEach(() => {
    baseline = registry.snapshot();
    _resetForTest();
    runtime = new Runtime();
    installPlugin(runtime, plugin);
    mockNav = installMockNavigator();
  });

  afterEach(() => {
    registry.restore(baseline);
    uninstallMockNavigator();
    vi.restoreAllMocks();
  });

  function parseOrThrow(input: string): ReturnType<typeof parse>['node'] {
    const r = parse(input);
    if (!r.success) {
      throw new Error(`parse failed: ${JSON.stringify(r.errors)}`);
    }
    return r.node!;
  }

  function makeCtx(me: HTMLElement): Parameters<Runtime['execute']>[1] {
    return {
      me,
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      variables: new Map(),
      events: new Map(),
    } as unknown as Parameters<Runtime['execute']>[1];
  }

  it('registers the SW at the configured scope with the configured URL', async () => {
    const el = document.createElement('div');
    const node = parseOrThrow('intercept "/app"\nend');
    await runtime.execute(node as never, makeCtx(el));

    expect(mockNav.lastUrl).toBe('/hyperfixi-sw.js');
    expect(mockNav.lastScope).toBe('/app');
  });

  it('posts the config once the SW is active (eager path)', async () => {
    mockNav._nextInitialState = 'activated';
    const el = document.createElement('div');
    const node = parseOrThrow(
      'intercept "/"\n' +
        '  precache "/" as "v9"\n' +
        '  on "/api/*" use network-first\n' +
        '  offline fallback "/offline.html"\n' +
        'end'
    );
    await runtime.execute(node as never, makeCtx(el));

    const reg = mockNav.registrations[0]!;
    const sw = getSW(reg);
    expect(sw.postedMessages.length).toBe(1);
    const msg = sw.postedMessages[0] as {
      type: string;
      config: { scope: string; precache: unknown; routes: unknown; offlineFallback: string };
    };
    expect(msg.type).toBe('hs:intercept:config');
    expect(msg.config.scope).toBe('/');
    expect(msg.config.precache).toEqual({ urls: ['/'], version: 'v9' });
    expect(msg.config.routes).toEqual([{ patterns: ['/api/*'], strategy: 'network-first' }]);
    expect(msg.config.offlineFallback).toBe('/offline.html');
  });

  it('defers posting until the SW transitions to activated (statechange path)', async () => {
    mockNav._nextInitialState = 'installing';
    const el = document.createElement('div');
    const node = parseOrThrow('intercept "/"\n  precache "/a"\nend');
    await runtime.execute(node as never, makeCtx(el));

    const reg = mockNav.registrations[0]!;
    const sw = getSW(reg);
    expect(sw.postedMessages.length).toBe(0);

    sw._advanceTo('activated');
    expect(sw.postedMessages.length).toBe(1);
    expect((sw.postedMessages[0] as { type: string }).type).toBe('hs:intercept:config');
  });

  it('warns and skips when the plugin is invoked a second time', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('div');

    await runtime.execute(parseOrThrow('intercept "/"\nend') as never, makeCtx(el));
    expect(mockNav.registrations.length).toBe(1);

    await runtime.execute(parseOrThrow('intercept "/other"\nend') as never, makeCtx(el));
    expect(mockNav.registrations.length).toBe(1); // still just one
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/only one intercept declaration/));
  });

  it('warns when navigator.serviceWorker is unavailable', async () => {
    uninstallMockNavigator();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('div');
    const node = parseOrThrow('intercept "/"\nend');
    await runtime.execute(node as never, makeCtx(el));
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/service worker not supported/));
  });

  it('prints the SecurityError hint when scope is wider than the SW directory', async () => {
    const secErr = new Error('scope mismatch');
    secErr.name = 'SecurityError';
    mockNav._nextError = secErr;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const el = document.createElement('div');
    const node = parseOrThrow('intercept "/app"\nend');
    await runtime.execute(node as never, makeCtx(el));

    expect(errSpy).toHaveBeenCalled();
    const msg = errSpy.mock.calls[0]!.join(' ');
    expect(msg).toMatch(/scope '\/app'/);
    expect(msg).toMatch(/Service-Worker-Allowed: \/app/);
  });

  it('logs the error on non-security registration failures', async () => {
    mockNav._nextError = new Error('boom');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const el = document.createElement('div');
    const node = parseOrThrow('intercept "/"\nend');
    await runtime.execute(node as never, makeCtx(el));
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringMatching(/registration failed/),
      expect.any(Error)
    );
  });
});
