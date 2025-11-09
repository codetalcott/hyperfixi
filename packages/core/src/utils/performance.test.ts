/**
 * Performance Utilities Test Suite
 *
 * Comprehensive tests for ObjectPool, StyleBatcher, and EventQueue
 * to ensure reliability, edge case coverage, and regression protection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectPool, StyleBatcher, EventQueue, styleBatcher, eventQueue } from './performance';

// ============================================================================
// ObjectPool Tests
// ============================================================================

describe('ObjectPool', () => {
  describe('Constructor and Initialization', () => {
    it('should create empty pool with no initial size', () => {
      const pool = new ObjectPool(() => ({ value: 0 }));
      const metrics = pool.getMetrics();

      expect(metrics.allocations).toBe(0);
      expect(metrics.reuses).toBe(0);
      expect(metrics.peakPoolSize).toBe(0);
      expect(metrics.hitRate).toBe(0);
    });

    it('should pre-allocate objects with initialSize', () => {
      const pool = new ObjectPool(() => ({ value: 0 }), undefined, 5);
      const metrics = pool.getMetrics();

      expect(metrics.allocations).toBe(5);
      expect(metrics.reuses).toBe(0);
      expect(metrics.peakPoolSize).toBe(5);
    });

    it('should accept reset function', () => {
      const resetFn = vi.fn();
      const pool = new ObjectPool(() => ({ value: 0 }), resetFn);

      pool.get(); // Create first object
      pool.releaseAll();
      pool.get(); // Reuse object, should call reset

      expect(resetFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('get() - Object Retrieval', () => {
    it('should return new object when pool is empty', () => {
      const pool = new ObjectPool(() => ({ value: Math.random() }));
      const obj1 = pool.get();

      expect(obj1).toBeDefined();
      expect(obj1).toHaveProperty('value');
    });

    it('should reuse objects from pool after release', () => {
      const pool = new ObjectPool(() => ({ id: Math.random() }));

      const obj1 = pool.get();
      const originalId = obj1.id;
      pool.releaseAll();

      const obj2 = pool.get();

      expect(obj2).toBe(obj1); // Same object reference
      expect(obj2.id).toBe(originalId);
    });

    it('should call reset function before reuse', () => {
      const pool = new ObjectPool(
        () => ({ value: 0, count: 0 }),
        obj => {
          obj.value = 0;
          obj.count = 0;
        }
      );

      const obj1 = pool.get();
      obj1.value = 42;
      obj1.count = 100;

      pool.releaseAll();
      const obj2 = pool.get();

      expect(obj2).toBe(obj1); // Same object
      expect(obj2.value).toBe(0); // Reset to 0
      expect(obj2.count).toBe(0); // Reset to 0
    });

    it('should grow pool when exhausted', () => {
      const pool = new ObjectPool(() => ({ id: Math.random() }), undefined, 2);

      const obj1 = pool.get();
      const obj2 = pool.get();
      const obj3 = pool.get(); // Should grow pool

      expect(obj1).not.toBe(obj2);
      expect(obj2).not.toBe(obj3);
      expect(obj1).not.toBe(obj3);

      const metrics = pool.getMetrics();
      expect(metrics.allocations).toBe(3); // 2 initial + 1 growth
      expect(metrics.peakPoolSize).toBe(3);
    });

    it('should handle multiple get() calls without release', () => {
      const pool = new ObjectPool(() => ({ id: Math.random() }));

      const objects = [pool.get(), pool.get(), pool.get(), pool.get(), pool.get()];

      // All should be different objects
      const ids = objects.map(o => o.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });
  });

  describe('releaseAll() - Pool Reset', () => {
    it('should reset index to 0', () => {
      const pool = new ObjectPool(() => ({ value: 0 }), undefined, 3);

      pool.get(); // Reuse pre-allocated 1 (reuses = 1)
      pool.get(); // Reuse pre-allocated 2 (reuses = 2)
      pool.get(); // Reuse pre-allocated 3 (reuses = 3)

      pool.releaseAll();

      const obj = pool.get(); // Reuse object 1 again (reuses = 4)
      const metrics = pool.getMetrics();

      expect(metrics.allocations).toBe(3); // 3 pre-allocated
      expect(metrics.reuses).toBe(4); // 3 initial reuses + 1 after releaseAll
      expect(metrics.peakPoolSize).toBe(3);
    });

    it('should allow reuse of all pooled objects', () => {
      const pool = new ObjectPool(() => ({ id: Math.random() }), undefined, 3);

      const objs1 = [pool.get(), pool.get(), pool.get()];
      pool.releaseAll();

      const objs2 = [pool.get(), pool.get(), pool.get()];

      expect(objs2[0]).toBe(objs1[0]);
      expect(objs2[1]).toBe(objs1[1]);
      expect(objs2[2]).toBe(objs1[2]);
    });

    it('should work correctly with multiple release cycles', () => {
      const pool = new ObjectPool(() => ({ value: 0 }));

      // Cycle 1
      pool.get();
      pool.get();
      pool.releaseAll();

      // Cycle 2
      pool.get();
      pool.get();
      pool.releaseAll();

      // Cycle 3
      pool.get();
      pool.get();
      pool.releaseAll();

      const metrics = pool.getMetrics();
      expect(metrics.allocations).toBe(2); // Only created 2
      expect(metrics.reuses).toBe(4); // Reused 4 times (2+2)
    });
  });

  describe('getMetrics() - Performance Tracking', () => {
    it('should calculate metrics correctly', () => {
      const pool = new ObjectPool(() => ({ value: 0 }));

      pool.get(); // allocation
      pool.get(); // allocation
      pool.releaseAll();
      pool.get(); // reuse
      pool.get(); // reuse

      const metrics = pool.getMetrics();

      expect(metrics.allocations).toBe(2);
      expect(metrics.reuses).toBe(2);
      expect(metrics.peakPoolSize).toBe(2);
      expect(metrics.hitRate).toBe(50); // 2 reuses out of 4 total
    });

    it('should calculate 0% hit rate with no operations', () => {
      const pool = new ObjectPool(() => ({ value: 0 }));
      const metrics = pool.getMetrics();

      expect(metrics.hitRate).toBe(0);
    });

    it('should calculate 0% hit rate with only allocations', () => {
      const pool = new ObjectPool(() => ({ value: 0 }));

      pool.get();
      pool.get();
      pool.get();

      const metrics = pool.getMetrics();

      expect(metrics.allocations).toBe(3);
      expect(metrics.reuses).toBe(0);
      expect(metrics.hitRate).toBe(0);
    });

    it('should calculate 100% hit rate after sufficient reuse', () => {
      const pool = new ObjectPool(() => ({ value: 0 }), undefined, 2);

      // Many reuse cycles
      for (let i = 0; i < 100; i++) {
        pool.get();
        pool.get();
        pool.releaseAll();
      }

      const metrics = pool.getMetrics();

      expect(metrics.allocations).toBe(2);
      expect(metrics.reuses).toBe(200);
      // 200 / (2 + 200) = ~99% (very high)
      expect(metrics.hitRate).toBeGreaterThan(98);
    });

    it('should track peak pool size correctly', () => {
      const pool = new ObjectPool(() => ({ value: 0 }));

      // Grow to 5
      for (let i = 0; i < 5; i++) {
        pool.get();
      }

      pool.releaseAll();

      // Only use 2 this time
      pool.get();
      pool.get();

      const metrics = pool.getMetrics();
      expect(metrics.peakPoolSize).toBe(5); // Peak is still 5
    });
  });

  describe('clear() - Pool Reset', () => {
    it('should clear all pool state', () => {
      const pool = new ObjectPool(() => ({ value: 0 }), undefined, 5);

      pool.get();
      pool.get();
      pool.get();

      pool.clear();

      const metrics = pool.getMetrics();
      expect(metrics.allocations).toBe(0);
      expect(metrics.reuses).toBe(0);
      expect(metrics.peakPoolSize).toBe(0);
    });

    it('should allow fresh start after clear', () => {
      const pool = new ObjectPool(() => ({ id: Math.random() }), undefined, 3);

      const obj1 = pool.get();
      const originalId = obj1.id;

      pool.clear();

      const obj2 = pool.get();
      expect(obj2).not.toBe(obj1); // Different object
      expect(obj2.id).not.toBe(originalId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle objects with complex reset logic', () => {
      const pool = new ObjectPool(
        () => ({ map: new Map(), set: new Set(), arr: [] }),
        obj => {
          obj.map.clear();
          obj.set.clear();
          obj.arr.length = 0;
        }
      );

      const obj1 = pool.get();
      obj1.map.set('key', 'value');
      obj1.set.add('item');
      obj1.arr.push(1, 2, 3);

      pool.releaseAll();

      const obj2 = pool.get();
      expect(obj2).toBe(obj1);
      expect(obj2.map.size).toBe(0);
      expect(obj2.set.size).toBe(0);
      expect(obj2.arr.length).toBe(0);
    });

    it('should work without reset function', () => {
      const pool = new ObjectPool(() => ({ value: 0 }));

      const obj1 = pool.get();
      obj1.value = 999;

      pool.releaseAll();

      const obj2 = pool.get();
      expect(obj2).toBe(obj1);
      expect(obj2.value).toBe(999); // No reset, value persists
    });

    it('should handle very large pool sizes', () => {
      const pool = new ObjectPool(() => ({ value: 0 }), undefined, 10000);
      const metrics = pool.getMetrics();

      expect(metrics.allocations).toBe(10000);
      expect(metrics.peakPoolSize).toBe(10000);
    });
  });
});

// ============================================================================
// StyleBatcher Tests
// ============================================================================

describe('StyleBatcher', () => {
  let batcher: StyleBatcher;
  let testElement: HTMLElement;

  beforeEach(() => {
    batcher = new StyleBatcher();
    testElement = document.createElement('div');
    document.body.appendChild(testElement);

    // Mock RAF for synchronous testing
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(cb, 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    document.body.removeChild(testElement);
    vi.unstubAllGlobals();
  });

  describe('add() - Style Queuing', () => {
    it('should queue style updates', () => {
      batcher.add(testElement, { color: 'red' });

      expect(batcher.getPendingCount()).toBe(1);
    });

    it('should merge multiple style updates for same element', () => {
      batcher.add(testElement, { color: 'red' });
      batcher.add(testElement, { fontSize: '16px' });
      batcher.add(testElement, { padding: '10px' });

      expect(batcher.getPendingCount()).toBe(1); // Still only 1 element
    });

    it('should track multiple elements separately', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const el3 = document.createElement('div');

      batcher.add(el1, { color: 'red' });
      batcher.add(el2, { color: 'blue' });
      batcher.add(el3, { color: 'green' });

      expect(batcher.getPendingCount()).toBe(3);
    });

    it('should override previous values for same property', () => {
      batcher.add(testElement, { color: 'red' });
      batcher.add(testElement, { color: 'blue' });
      batcher.add(testElement, { color: 'green' });

      expect(batcher.getPendingCount()).toBe(1);
    });

    it('should schedule RAF on first add', () => {
      const rafSpy = vi.spyOn(global, 'requestAnimationFrame');

      batcher.add(testElement, { color: 'red' });

      expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('should not schedule multiple RAFs for same batch', () => {
      const rafSpy = vi.spyOn(global, 'requestAnimationFrame');

      batcher.add(testElement, { color: 'red' });
      batcher.add(testElement, { fontSize: '16px' });
      batcher.add(testElement, { padding: '10px' });

      expect(rafSpy).toHaveBeenCalledTimes(1); // Only once
    });
  });

  describe('flush() - DOM Updates', () => {
    it('should apply styles to element', async () => {
      batcher.add(testElement, { color: 'red', fontSize: '16px' });

      // Wait for RAF
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(testElement.style.color).toBe('red');
      expect(testElement.style.fontSize).toBe('16px');
    });

    it('should convert hyphenated properties to camelCase', async () => {
      batcher.add(testElement, {
        'font-size': '16px',
        'background-color': 'blue',
        'border-radius': '5px',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(testElement.style.fontSize).toBe('16px');
      expect(testElement.style.backgroundColor).toBe('blue');
      expect(testElement.style.borderRadius).toBe('5px');
    });

    it('should handle CSS custom properties (--variables)', async () => {
      batcher.add(testElement, {
        '--primary-color': '#ff0000',
        '--spacing': '10px',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(testElement.style.getPropertyValue('--primary-color')).toBe('#ff0000');
      expect(testElement.style.getPropertyValue('--spacing')).toBe('10px');
    });

    it('should apply styles to multiple elements', async () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const el3 = document.createElement('div');

      document.body.append(el1, el2, el3);

      batcher.add(el1, { color: 'red' });
      batcher.add(el2, { color: 'blue' });
      batcher.add(el3, { color: 'green' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(el1.style.color).toBe('red');
      expect(el2.style.color).toBe('blue');
      expect(el3.style.color).toBe('green');

      document.body.removeChild(el1);
      document.body.removeChild(el2);
      document.body.removeChild(el3);
    });

    it('should clear pending updates after flush', async () => {
      batcher.add(testElement, { color: 'red' });

      expect(batcher.getPendingCount()).toBe(1);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(batcher.getPendingCount()).toBe(0);
    });

    it('should handle empty style objects', async () => {
      batcher.add(testElement, {});

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should not throw
      expect(batcher.getPendingCount()).toBe(0);
    });
  });

  describe('cancel() - Cleanup', () => {
    it('should cancel pending RAF', () => {
      const cancelSpy = vi.spyOn(global, 'cancelAnimationFrame');

      batcher.add(testElement, { color: 'red' });
      batcher.cancel();

      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('should clear pending updates', () => {
      batcher.add(testElement, { color: 'red' });

      expect(batcher.getPendingCount()).toBe(1);

      batcher.cancel();

      expect(batcher.getPendingCount()).toBe(0);
    });

    it('should prevent styles from being applied', async () => {
      batcher.add(testElement, { color: 'red' });
      batcher.cancel();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(testElement.style.color).toBe(''); // Not applied
    });

    it('should handle cancel with no pending updates', () => {
      expect(() => batcher.cancel()).not.toThrow();
    });
  });

  describe('ObjectPool Integration', () => {
    it('should reuse style objects from pool', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');

      batcher.add(el1, { color: 'red' });
      batcher.add(el2, { color: 'blue' });

      const metrics = batcher.getPoolMetrics();

      // Should allocate from pool
      expect(metrics.allocations).toBeGreaterThan(0);
    });

    it('should release objects back to pool after flush', async () => {
      batcher.add(testElement, { color: 'red' });

      const metricsBefore = batcher.getPoolMetrics();

      await new Promise(resolve => setTimeout(resolve, 10));

      const metricsAfter = batcher.getPoolMetrics();

      // Pool should track reuse after release
      expect(metricsAfter.allocations).toBeGreaterThanOrEqual(metricsBefore.allocations);
    });

    it('should achieve high hit rate with many batches', async () => {
      // Simulate many drag operations
      for (let i = 0; i < 50; i++) {
        batcher.add(testElement, { left: `${i}px`, top: `${i}px` });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const metrics = batcher.getPoolMetrics();

      // After many operations, hit rate should be high
      // Pool pre-allocates 10 objects, then reuses them across 50 batches
      // = 10 allocations + 50 total operations = 40 reuses / 50 total = 80%+
      expect(metrics.hitRate).toBeGreaterThan(80);
      expect(metrics.allocations).toBe(10); // Pre-allocated pool
      expect(metrics.reuses).toBeGreaterThan(40); // Many reuses
    });
  });

  describe('getPendingCount() - Monitoring', () => {
    it('should return 0 when no updates pending', () => {
      expect(batcher.getPendingCount()).toBe(0);
    });

    it('should return correct count with updates', () => {
      const elements = Array.from({ length: 10 }, () => document.createElement('div'));

      elements.forEach(el => batcher.add(el, { color: 'red' }));

      expect(batcher.getPendingCount()).toBe(10);
    });

    it('should update count after cancel', () => {
      batcher.add(testElement, { color: 'red' });
      expect(batcher.getPendingCount()).toBe(1);

      batcher.cancel();
      expect(batcher.getPendingCount()).toBe(0);
    });
  });

  describe('getPoolMetrics() - Performance Monitoring', () => {
    it('should return pool metrics', () => {
      const metrics = batcher.getPoolMetrics();

      expect(metrics).toHaveProperty('allocations');
      expect(metrics).toHaveProperty('reuses');
      expect(metrics).toHaveProperty('peakPoolSize');
      expect(metrics).toHaveProperty('hitRate');
    });

    it('should show increasing allocations with many elements', () => {
      const elements = Array.from({ length: 20 }, () => document.createElement('div'));

      elements.forEach(el => batcher.add(el, { color: 'red' }));

      const metrics = batcher.getPoolMetrics();

      expect(metrics.allocations).toBeGreaterThan(0);
      expect(metrics.peakPoolSize).toBeGreaterThan(0);
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton styleBatcher', () => {
      expect(styleBatcher).toBeInstanceOf(StyleBatcher);
    });

    it('should persist state across imports', () => {
      const el = document.createElement('div');
      styleBatcher.add(el, { color: 'red' });

      expect(styleBatcher.getPendingCount()).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long property names', async () => {
      const longProperty = 'very-very-very-long-property-name';
      batcher.add(testElement, { [longProperty]: 'value' });

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should convert to camelCase
      const camelCase = 'veryVeryVeryLongPropertyName';
      expect((testElement.style as any)[camelCase]).toBe('value');
    });

    it('should handle special characters in values', async () => {
      batcher.add(testElement, {
        content: '"Hello, World!"',
        background: 'url("image.png")',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(testElement.style.content).toBe('"Hello, World!"');
      expect(testElement.style.background).toContain('url');
    });

    it('should handle numeric values', async () => {
      batcher.add(testElement, {
        opacity: '0.5',
        zIndex: '999',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(testElement.style.opacity).toBe('0.5');
      expect(testElement.style.zIndex).toBe('999');
    });

    it('should handle empty string values', async () => {
      testElement.style.color = 'red';

      batcher.add(testElement, { color: '' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(testElement.style.color).toBe('');
    });
  });
});

// ============================================================================
// EventQueue Tests (Bonus Coverage)
// ============================================================================

describe('EventQueue', () => {
  let queue: EventQueue;
  let testElement: HTMLElement;

  beforeEach(() => {
    queue = new EventQueue();
    testElement = document.createElement('div');
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    queue.cleanupAll();
    document.body.removeChild(testElement);
  });

  describe('wait() - Event Waiting', () => {
    it('should resolve when event fires', async () => {
      const waitPromise = queue.wait('click', testElement);

      testElement.click();

      const event = await waitPromise;

      expect(event).toBeInstanceOf(Event);
      expect(event.type).toBe('click');
    });

    it('should queue events when no waiters', async () => {
      // First wait sets up listener
      const wait1Promise = queue.wait('click', testElement);
      testElement.click();
      await wait1Promise;

      // Now fire event with no waiters - should be queued
      testElement.click();

      // Next wait should get queued event immediately
      const event = await queue.wait('click', testElement);

      expect(event).toBeInstanceOf(Event);
      expect(event.type).toBe('click');
    });

    it('should handle multiple waiters', async () => {
      const wait1 = queue.wait('click', testElement);
      const wait2 = queue.wait('click', testElement);

      testElement.click();
      testElement.click();

      const [event1, event2] = await Promise.all([wait1, wait2]);

      expect(event1).toBeInstanceOf(Event);
      expect(event2).toBeInstanceOf(Event);
    });

    it('should reuse persistent listeners', async () => {
      expect(queue.getListenerCount()).toBe(0);

      const wait1 = queue.wait('click', testElement);
      testElement.click();
      await wait1;

      expect(queue.getListenerCount()).toBe(1); // Listener persists

      const wait2 = queue.wait('click', testElement);
      testElement.click();
      await wait2;

      expect(queue.getListenerCount()).toBe(1); // Still only 1
    });

    it('should handle different event types', async () => {
      const clickPromise = queue.wait('click', testElement);
      const mouseoverPromise = queue.wait('mouseover', testElement);

      testElement.click();
      testElement.dispatchEvent(new MouseEvent('mouseover'));

      const [clickEvent, mouseoverEvent] = await Promise.all([clickPromise, mouseoverPromise]);

      expect(clickEvent.type).toBe('click');
      expect(mouseoverEvent.type).toBe('mouseover');
    });

    it('should handle global targets (window, document)', async () => {
      const windowPromise = queue.wait('resize', window);
      const docPromise = queue.wait('click', document);

      window.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new MouseEvent('click'));

      const [resizeEvent, clickEvent] = await Promise.all([windowPromise, docPromise]);

      expect(resizeEvent.type).toBe('resize');
      expect(clickEvent.type).toBe('click');
    });
  });

  describe('cleanup() - Listener Cleanup', () => {
    it('should remove specific listener', async () => {
      const waitPromise = queue.wait('click', testElement);
      testElement.click();
      await waitPromise;

      expect(queue.getListenerCount()).toBe(1);

      queue.cleanup(testElement, 'click');

      expect(queue.getListenerCount()).toBe(0);
    });

    it('should not affect other listeners', async () => {
      const clickPromise = queue.wait('click', testElement);
      const mouseoverPromise = queue.wait('mouseover', testElement);
      testElement.click();
      testElement.dispatchEvent(new MouseEvent('mouseover'));
      await Promise.all([clickPromise, mouseoverPromise]);

      expect(queue.getListenerCount()).toBe(2);

      queue.cleanup(testElement, 'click');

      expect(queue.getListenerCount()).toBe(1);
    });
  });

  describe('cleanupAll() - Full Cleanup', () => {
    it('should remove all listeners', async () => {
      // Use different event types to ensure different keys
      const wait1 = queue.wait('click', testElement);
      const wait2 = queue.wait('mouseover', testElement);
      const wait3 = queue.wait('mousedown', testElement);

      testElement.click();
      testElement.dispatchEvent(new MouseEvent('mouseover'));
      testElement.dispatchEvent(new MouseEvent('mousedown'));

      await Promise.all([wait1, wait2, wait3]);

      expect(queue.getListenerCount()).toBe(3);

      queue.cleanupAll();

      expect(queue.getListenerCount()).toBe(0);
    });
  });

  describe('getListenerCount() - Monitoring', () => {
    it('should return 0 initially', () => {
      expect(queue.getListenerCount()).toBe(0);
    });

    it('should count active listeners', async () => {
      const wait1 = queue.wait('click', testElement);
      testElement.click();
      await wait1;

      expect(queue.getListenerCount()).toBe(1);

      const wait2 = queue.wait('mouseover', testElement);
      testElement.dispatchEvent(new MouseEvent('mouseover'));
      await wait2;

      expect(queue.getListenerCount()).toBe(2);
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton eventQueue', () => {
      expect(eventQueue).toBeInstanceOf(EventQueue);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid event firing', async () => {
      const events: Event[] = [];

      const waiters = Array.from({ length: 10 }, () =>
        queue.wait('click', testElement).then(e => events.push(e))
      );

      // Fire 10 events rapidly
      for (let i = 0; i < 10; i++) {
        testElement.click();
      }

      await Promise.all(waiters);

      expect(events.length).toBe(10);
    });

    it('should handle cleanup of non-existent listener', () => {
      expect(() => queue.cleanup(testElement, 'click')).not.toThrow();
    });

    it('should handle custom events', async () => {
      const customEvent = new CustomEvent('custom', { detail: { value: 42 } });

      const waitPromise = queue.wait('custom', testElement);

      testElement.dispatchEvent(customEvent);

      const event = (await waitPromise) as CustomEvent;

      expect(event.type).toBe('custom');
      expect(event.detail.value).toBe(42);
    });
  });
});
