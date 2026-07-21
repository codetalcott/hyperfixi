/**
 * HMR / dev-cache invalidation regressions (2026-07-20 pre-release audit).
 *
 * Bundle SELECTION depends on the htmx-v4/reactivity flags, but neither the
 * dev-server usage hash nor the aggregator's change detection included them —
 * so adding/removing an hx-live/sse-connect/ws-send attribute served a stale
 * cached bundle at the wrong tier. These tests pin both seams.
 */
import { describe, it, expect } from 'vitest';
import { computeUsageHash } from './index';
import { Aggregator } from './aggregator';
import { Scanner } from './scanner';
import type { AggregatedUsage } from './types';

function baseUsage(overrides: Partial<AggregatedUsage> = {}): AggregatedUsage {
  return {
    commands: new Set(['toggle']),
    blocks: new Set(),
    positional: false,
    detectedLanguages: new Set(),
    ...overrides,
  } as AggregatedUsage;
}

describe('computeUsageHash covers bundle-selection inputs', () => {
  it('changes when needsHxLive flips with identical commands/blocks/languages', () => {
    const without = computeUsageHash(baseUsage());
    const withLive = computeUsageHash(
      baseUsage({
        htmx: {
          hasHtmxAttributes: true,
          hasFixiAttributes: false,
          httpMethods: new Set(),
          swapStrategies: new Set(),
          triggerModifiers: new Set(),
          urlManagement: new Set(),
          usesConfirm: false,
          onHandlers: [],
          needsHxLive: true,
          needsReactivity: true,
        },
      } as Partial<AggregatedUsage>)
    );
    expect(withLive).not.toBe(without);
  });

  it('changes when SSE/WS flags flip', () => {
    const htmxBase = {
      hasHtmxAttributes: true,
      hasFixiAttributes: false,
      httpMethods: new Set<string>(),
      swapStrategies: new Set<string>(),
      triggerModifiers: new Set<string>(),
      urlManagement: new Set<string>(),
      usesConfirm: false,
      onHandlers: [] as string[],
    };
    const a = computeUsageHash(
      baseUsage({ htmx: { ...htmxBase, needsSSE: true } } as Partial<AggregatedUsage>)
    );
    const b = computeUsageHash(
      baseUsage({ htmx: { ...htmxBase, needsWS: true } } as Partial<AggregatedUsage>)
    );
    const c = computeUsageHash(baseUsage({ htmx: { ...htmxBase } } as Partial<AggregatedUsage>));
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('changes when top-level reactivity flags flip', () => {
    const without = computeUsageHash(baseUsage());
    const withReactivity = computeUsageHash(baseUsage({ needsReactivity: true }));
    const withBind = computeUsageHash(
      baseUsage({ needsReactivity: true, needsBindToProperty: true })
    );
    expect(new Set([without, withReactivity, withBind]).size).toBe(3);
  });
});

describe('Aggregator.add reports change when a v4 flag flips', () => {
  it('returns true when the same file gains an hx-live attribute', () => {
    const scanner = new Scanner({});
    const aggregator = new Aggregator();

    // Same commands + htmx surface both times; only hx-live differs.
    const before = scanner.scan(
      '<button _="on click toggle .x" hx-get="/data">load</button>',
      'page.html'
    );
    const after = scanner.scan(
      '<button _="on click toggle .x" hx-get="/data">load</button><div hx-live="put $count into me"></div>',
      'page.html'
    );

    expect(aggregator.add('page.html', before)).toBe(true);
    expect(aggregator.add('page.html', after)).toBe(true);
  });

  it('returns false when the same file is re-added unchanged (guards against over-invalidation)', () => {
    const scanner = new Scanner({});
    const aggregator = new Aggregator();
    const usage = scanner.scan(
      '<button _="on click toggle .x" hx-get="/data">load</button>',
      'page.html'
    );
    expect(aggregator.add('page.html', usage)).toBe(true);
    expect(
      aggregator.add(
        'page.html',
        scanner.scan('<button _="on click toggle .x" hx-get="/data">load</button>', 'page.html')
      )
    ).toBe(false);
  });
});
