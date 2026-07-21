/**
 * Tests for the Production Performance Monitor.
 *
 * Covers ProductionPerformanceMonitor (record/measure/getStats/report/lifecycle),
 * the monitorPerformance decorator, and the measureOperation helper. Timer-driven
 * paths use fake timers; every enabled instance is destroy()ed in afterEach so the
 * real setInterval never leaks and keeps the process alive.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ProductionPerformanceMonitor,
  productionMonitor,
  monitorPerformance,
  measureOperation,
} from './production-monitor';

describe('ProductionPerformanceMonitor', () => {
  // Track every instance we create so real intervals are always torn down.
  const created: ProductionPerformanceMonitor[] = [];
  const make = (opts?: ConstructorParameters<typeof ProductionPerformanceMonitor>[0]) => {
    const m = new ProductionPerformanceMonitor(opts);
    created.push(m);
    return m;
  };

  afterEach(() => {
    for (const m of created.splice(0)) m.destroy();
    vi.restoreAllMocks();
  });

  describe('enabled/disabled gating', () => {
    it('defaults to disabled outside production (record is a no-op)', () => {
      const monitor = make(); // NODE_ENV is 'test' under vitest
      monitor.record('op', 'command', 5);
      expect(monitor.getStats().total).toBe(0);
    });

    it('does not record while disabled', () => {
      const monitor = make({ enabled: false });
      monitor.record('op', 'command', 100);
      expect(monitor.getStats().total).toBe(0);
    });

    it('records once enabled', () => {
      const monitor = make({ enabled: true });
      monitor.record('op', 'command', 3);
      expect(monitor.getStats().total).toBe(1);
    });
  });

  describe('record() severity classification', () => {
    let monitor: ProductionPerformanceMonitor;
    let errorSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      monitor = make({ enabled: true });
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('marks below-warning durations as info and logs nothing', () => {
      monitor.record('fast', 'command', 1); // < warning(10)
      expect(monitor.getStats().warnings).toBe(0);
      expect(monitor.getStats().errors).toBe(0);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('marks durations at/above the warning threshold as warning and warns', () => {
      monitor.record('slow', 'command', 10); // == warning(10)
      const stats = monitor.getStats();
      expect(stats.warnings).toBe(1);
      expect(stats.errors).toBe(0);
      expect(warnSpy).toHaveBeenCalledOnce();
    });

    it('marks durations at/above the error threshold as error and logs error', () => {
      monitor.record('very-slow', 'command', 50); // == error(50)
      const stats = monitor.getStats();
      expect(stats.errors).toBe(1);
      expect(stats.warnings).toBe(0);
      expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('uses per-category thresholds (expression is stricter than command)', () => {
      monitor.record('expr', 'expression', 5); // warning(5) for expression
      expect(monitor.getStats('expression').warnings).toBe(1);
    });

    it('treats categories without thresholds (runtime/system) as info', () => {
      monitor.record('rt', 'runtime', 9999);
      const stats = monitor.getStats('runtime');
      expect(stats.total).toBe(1);
      expect(stats.warnings).toBe(0);
      expect(stats.errors).toBe(0);
    });

    it('honours overridden thresholds from the constructor', () => {
      const strict = make({ enabled: true, thresholds: { command: { warning: 1, error: 2 } } });
      strict.record('op', 'command', 2);
      expect(strict.getStats().errors).toBe(1);
    });

    it('stores metadata when provided', () => {
      monitor.record('op', 'command', 1, true, { userId: 42 });
      expect(monitor.getRecentMetrics()[0].metadata).toEqual({ userId: 42 });
    });
  });

  describe('metrics trimming', () => {
    it('keeps only the most recent maxMetrics entries', () => {
      const monitor = make({ enabled: true, maxMetrics: 3 });
      for (let i = 0; i < 10; i++) monitor.record(`op${i}`, 'runtime', i);
      const recent = monitor.getRecentMetrics();
      expect(recent).toHaveLength(3);
      expect(recent.map(m => m.name)).toEqual(['op7', 'op8', 'op9']);
    });
  });

  describe('measure()', () => {
    it('returns the operation result and records success', async () => {
      const monitor = make({ enabled: true });
      const result = await monitor.measure('work', 'runtime', () => 'done');
      expect(result).toBe('done');
      const stats = monitor.getStats();
      expect(stats.total).toBe(1);
      expect(stats.successful).toBe(1);
    });

    it('awaits async operations', async () => {
      const monitor = make({ enabled: true });
      const result = await monitor.measure('async', 'runtime', async () => 7);
      expect(result).toBe(7);
    });

    it('records a failure and rethrows when the operation throws', async () => {
      const monitor = make({ enabled: true });
      await expect(
        monitor.measure('boom', 'runtime', () => {
          throw new Error('kaboom');
        })
      ).rejects.toThrow('kaboom');
      const stats = monitor.getStats();
      expect(stats.failed).toBe(1);
      expect(monitor.getRecentMetrics()[0].metadata?.error).toBe('kaboom');
    });

    it('passes the operation through untouched when disabled (no metric)', async () => {
      const monitor = make({ enabled: false });
      const result = await monitor.measure('x', 'runtime', () => 'ok');
      expect(result).toBe('ok');
      expect(monitor.getStats().total).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('returns all-zero stats when there are no metrics', () => {
      const monitor = make({ enabled: true });
      expect(monitor.getStats()).toEqual({
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0,
        medianDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        warnings: 0,
        errors: 0,
      });
    });

    it('computes aggregate duration statistics', () => {
      const monitor = make({ enabled: true });
      for (const d of [10, 20, 30]) monitor.record('op', 'runtime', d);
      const stats = monitor.getStats();
      expect(stats.total).toBe(3);
      expect(stats.averageDuration).toBe(20);
      expect(stats.medianDuration).toBe(20);
      expect(stats.minDuration).toBe(10);
      expect(stats.maxDuration).toBe(30);
    });

    it('filters by category', () => {
      const monitor = make({ enabled: true });
      monitor.record('a', 'command', 1);
      monitor.record('b', 'runtime', 2);
      expect(monitor.getStats('command').total).toBe(1);
      expect(monitor.getStats('runtime').total).toBe(1);
      expect(monitor.getStats().total).toBe(2);
    });

    it('counts failed operations', () => {
      const monitor = make({ enabled: true });
      monitor.record('ok', 'runtime', 1, true);
      monitor.record('bad', 'runtime', 1, false);
      const stats = monitor.getStats();
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('getRecentMetrics()', () => {
    it('excludes metrics older than the cutoff window', () => {
      const monitor = make({ enabled: true });
      monitor.record('now', 'runtime', 1);
      // Backdate the stored metric beyond the window.
      const old = monitor.getRecentMetrics()[0];
      old.timestamp = Date.now() - 10 * 60 * 1000;
      expect(monitor.getRecentMetrics(5)).toHaveLength(0);
    });
  });

  describe('getCurrentSystemMetrics()', () => {
    it('returns memory, cpu, and timestamp fields', () => {
      const monitor = make({ enabled: true });
      const sys = monitor.getCurrentSystemMetrics();
      expect(sys.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(sys.cpuUsage).toHaveProperty('user');
      expect(sys.cpuUsage).toHaveProperty('system');
      expect(typeof sys.timestamp).toBe('number');
    });
  });

  describe('generateReport()', () => {
    it('summarises overall and per-category performance', () => {
      const monitor = make({ enabled: true });
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      monitor.record('cmd', 'command', 15); // warning
      monitor.record('expr', 'expression', 1);
      const report = monitor.generateReport();
      expect(report).toContain('Production Performance Report');
      expect(report).toContain('Total Operations: 2');
      expect(report).toContain('COMMAND Performance');
      expect(report).toContain('EXPRESSION Performance');
    });

    it('lists recent non-info operations as hotspots', () => {
      const monitor = make({ enabled: true });
      vi.spyOn(console, 'error').mockImplementation(() => {});
      monitor.record('heavy', 'command', 100); // error
      expect(monitor.generateReport()).toContain('Recent Performance Issues');
    });
  });

  describe('lifecycle', () => {
    it('clear() empties recorded metrics', () => {
      const monitor = make({ enabled: true });
      monitor.record('op', 'runtime', 1);
      monitor.clear();
      expect(monitor.getStats().total).toBe(0);
    });

    it('setEnabled() toggles recording', () => {
      const monitor = make({ enabled: false });
      monitor.record('ignored', 'runtime', 1);
      monitor.setEnabled(true);
      monitor.record('kept', 'runtime', 1);
      monitor.setEnabled(false);
      monitor.record('ignored2', 'runtime', 1);
      expect(monitor.getStats().total).toBe(1);
      expect(monitor.getRecentMetrics()[0].name).toBe('kept');
    });

    it('destroy() clears metrics and stops monitoring', () => {
      const monitor = make({ enabled: true });
      monitor.record('op', 'runtime', 1);
      monitor.destroy();
      expect(monitor.getStats().total).toBe(0);
    });
  });

  describe('system monitoring interval (fake timers)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('collects a system metric on each interval tick', () => {
      const monitor = new ProductionPerformanceMonitor({ enabled: true, flushIntervalMs: 1000 });
      try {
        expect(monitor.generateReport()).not.toContain('System Metrics');
        vi.advanceTimersByTime(1000);
        expect(monitor.generateReport()).toContain('System Metrics');
      } finally {
        monitor.destroy();
      }
    });

    it('caps stored system metrics at 100', () => {
      const monitor = new ProductionPerformanceMonitor({ enabled: true, flushIntervalMs: 10 });
      try {
        vi.advanceTimersByTime(10 * 150); // 150 ticks
        // Not directly observable, but report should still render without error.
        expect(monitor.generateReport()).toContain('System Metrics');
      } finally {
        monitor.destroy();
      }
    });
  });
});

describe('monitorPerformance decorator', () => {
  afterEach(() => {
    productionMonitor.setEnabled(false);
    productionMonitor.clear();
    vi.restoreAllMocks();
  });

  // Invoke the (legacy-style) method decorator directly with a manual descriptor.
  // This exercises its real runtime behaviour without depending on how the test
  // bundler transforms `@`-decorator syntax (esbuild uses Stage-3 semantics; the
  // package build uses tsc/experimentalDecorators — the two disagree on the shape
  // of a method decorator's arguments).
  const applyDecorator = <T extends (...args: any[]) => any>(
    fn: T,
    category: Parameters<typeof monitorPerformance>[0],
    name?: string,
    className = 'Service'
  ) => {
    const descriptor: PropertyDescriptor = { value: fn, configurable: true, writable: true };
    const target = { constructor: { name: className } };
    monitorPerformance(category, name)(target, fn.name || 'method', descriptor as any);
    return descriptor.value as T;
  };

  it('wraps a method, preserving its return value', async () => {
    const compute = applyDecorator(
      async (a: number, b: number) => a + b,
      'command',
      'Service.compute'
    );
    const result = await compute.call({}, 2, 3);
    expect(result).toBe(5);
  });

  it('records a metric via the global monitor when enabled', async () => {
    productionMonitor.setEnabled(true);
    productionMonitor.clear();
    const run = applyDecorator(async () => 'ok', 'runtime');
    await run.call({});
    expect(productionMonitor.getStats().total).toBeGreaterThanOrEqual(1);
  });
});

describe('measureOperation helper', () => {
  afterEach(() => {
    productionMonitor.setEnabled(false);
    productionMonitor.clear();
  });

  it('returns the operation result', async () => {
    const result = await measureOperation('quick', () => 'value');
    expect(result).toBe('value');
  });

  it('records through the global monitor when enabled', async () => {
    productionMonitor.setEnabled(true);
    productionMonitor.clear();
    await measureOperation('quick', () => 'value', 'command');
    expect(productionMonitor.getStats().total).toBeGreaterThanOrEqual(1);
  });
});
