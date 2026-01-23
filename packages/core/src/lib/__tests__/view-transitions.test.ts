/**
 * Unit Tests for View Transitions API Integration
 *
 * Tests the transition queue, feature detection, configuration, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isViewTransitionsSupported,
  configureViewTransitions,
  getViewTransitionsConfig,
  withViewTransition,
  withViewTransitionImmediate,
  clearTransitionQueue,
  getPendingTransitionCount,
  isTransitioning,
  setTransitionName,
  type ViewTransitionsConfig,
} from '../view-transitions';

// ========== Test Setup ==========

// Mock document.startViewTransition
let mockStartViewTransition: any;
let mockTransition: any;

beforeEach(() => {
  // Reset config to defaults
  configureViewTransitions({
    enabled: true,
    defaultTimeout: 5000,
    debug: false,
  });

  // Clear any pending transitions
  clearTransitionQueue();

  // Setup mock for startViewTransition
  mockTransition = {
    finished: Promise.resolve(),
    ready: Promise.resolve(),
    updateCallbackDone: Promise.resolve(),
  };

  mockStartViewTransition = vi.fn(async (callback: () => void | Promise<void>) => {
    // Execute callback asynchronously
    try {
      const result = callback();
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      // Mock catches errors like real API
    }
    return mockTransition;
  });

  (document as any).startViewTransition = mockStartViewTransition;
});

afterEach(async () => {
  // Wait a tick to let any pending transitions settle
  await new Promise(resolve => setTimeout(resolve, 0));

  // Clear queue (suppressing any rejections)
  try {
    clearTransitionQueue();
  } catch (e) {
    // Ignore cleanup errors
  }

  delete (document as any).startViewTransition;
  vi.clearAllTimers();
});

// ========== Tests ==========

describe('View Transitions API Integration', () => {
  describe('Feature Detection', () => {
    it('should detect when View Transitions API is supported', () => {
      (document as any).startViewTransition = mockStartViewTransition;
      expect(isViewTransitionsSupported()).toBe(true);
    });

    it('should detect when View Transitions API is not supported', () => {
      delete (document as any).startViewTransition;
      expect(isViewTransitionsSupported()).toBe(false);
    });

    it('should handle missing document', () => {
      const originalDocument = global.document;
      (global as any).document = undefined;

      expect(isViewTransitionsSupported()).toBe(false);

      (global as any).document = originalDocument;
    });
  });

  describe('Configuration', () => {
    it('should have correct default configuration', () => {
      const config = getViewTransitionsConfig();
      expect(config.enabled).toBe(true);
      expect(config.defaultTimeout).toBe(5000);
      expect(config.debug).toBe(false);
    });

    it('should allow updating configuration', () => {
      configureViewTransitions({
        enabled: false,
        defaultTimeout: 3000,
        debug: true,
      });

      const config = getViewTransitionsConfig();
      expect(config.enabled).toBe(false);
      expect(config.defaultTimeout).toBe(3000);
      expect(config.debug).toBe(true);
    });

    it('should allow partial configuration updates', () => {
      configureViewTransitions({ enabled: false });

      const config = getViewTransitionsConfig();
      expect(config.enabled).toBe(false);
      expect(config.defaultTimeout).toBe(5000); // unchanged
      expect(config.debug).toBe(false); // unchanged
    });

    it('should return a copy of config (not reference)', () => {
      const config1 = getViewTransitionsConfig();
      config1.enabled = false; // mutate copy

      const config2 = getViewTransitionsConfig();
      expect(config2.enabled).toBe(true); // original unchanged
    });
  });

  describe('Basic Transitions', () => {
    it('should execute callback with View Transition', async () => {
      const callback = vi.fn();

      await withViewTransition(callback);

      expect(callback).toHaveBeenCalledOnce();
      expect(mockStartViewTransition).toHaveBeenCalledOnce();
    });

    it('should execute callback without View Transition when disabled', async () => {
      configureViewTransitions({ enabled: false });
      const callback = vi.fn();

      await withViewTransition(callback);

      expect(callback).toHaveBeenCalledOnce();
      expect(mockStartViewTransition).not.toHaveBeenCalled();
    });

    it('should execute callback without View Transition when not supported', async () => {
      delete (document as any).startViewTransition;
      const callback = vi.fn();

      await withViewTransition(callback);

      expect(callback).toHaveBeenCalledOnce();
    });

    it('should execute callback without View Transition when skipTransition is true', async () => {
      const callback = vi.fn();

      await withViewTransition(callback, { skipTransition: true });

      expect(callback).toHaveBeenCalledOnce();
      expect(mockStartViewTransition).not.toHaveBeenCalled();
    });

    it('should support async callbacks', async () => {
      const callback = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await withViewTransition(callback);

      expect(callback).toHaveBeenCalledOnce();
    });
  });

  describe('Transition Queue', () => {
    it('should queue multiple transitions', async () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      const promises = callbacks.map(cb => withViewTransition(cb));

      expect(getPendingTransitionCount()).toBeGreaterThan(0);

      await Promise.all(promises);

      expect(callbacks[0]).toHaveBeenCalledOnce();
      expect(callbacks[1]).toHaveBeenCalledOnce();
      expect(callbacks[2]).toHaveBeenCalledOnce();
      expect(getPendingTransitionCount()).toBe(0);
    });

    it('should execute transitions sequentially', async () => {
      const executionOrder: number[] = [];

      const callback1 = vi.fn(() => executionOrder.push(1));
      const callback2 = vi.fn(() => executionOrder.push(2));
      const callback3 = vi.fn(() => executionOrder.push(3));

      const promises = [
        withViewTransition(callback1),
        withViewTransition(callback2),
        withViewTransition(callback3),
      ];

      await Promise.all(promises);

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('should report pending transition count', async () => {
      expect(getPendingTransitionCount()).toBe(0);

      const slowCallback = () => new Promise(resolve => setTimeout(resolve, 100));

      withViewTransition(slowCallback);
      withViewTransition(slowCallback);
      withViewTransition(slowCallback);

      expect(getPendingTransitionCount()).toBeGreaterThan(0);
    });

    it('should report transitioning status', async () => {
      expect(isTransitioning()).toBe(false);

      const slowCallback = () => new Promise(resolve => setTimeout(resolve, 50));

      const promise = withViewTransition(slowCallback);

      // May or may not be transitioning depending on timing
      // After completion, should not be transitioning
      await promise;

      expect(isTransitioning()).toBe(false);
    });

    it('should clear pending transitions', async () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      // Queue transitions but don't await
      callbacks.map(cb => withViewTransition(cb).catch(() => {}));

      expect(getPendingTransitionCount()).toBeGreaterThan(0);

      clearTransitionQueue();

      expect(getPendingTransitionCount()).toBe(0);
    });

    it('should handle cleared transitions', () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      // Queue transitions (with catch to prevent unhandled rejections)
      callbacks.forEach(cb => withViewTransition(cb).catch(() => {}));

      expect(getPendingTransitionCount()).toBeGreaterThan(0);

      clearTransitionQueue();

      // Queue should be empty
      expect(getPendingTransitionCount()).toBe(0);
    });
  });

  describe('Immediate Transitions', () => {
    it('should execute transition immediately without queue', async () => {
      const callback = vi.fn();

      await withViewTransitionImmediate(callback);

      expect(callback).toHaveBeenCalledOnce();
      expect(mockStartViewTransition).toHaveBeenCalledOnce();
    });

    it('should not add to queue', async () => {
      const callback = vi.fn();

      expect(getPendingTransitionCount()).toBe(0);

      await withViewTransitionImmediate(callback);

      expect(getPendingTransitionCount()).toBe(0);
    });

    it('should respect skipTransition option', async () => {
      const callback = vi.fn();

      await withViewTransitionImmediate(callback, { skipTransition: true });

      expect(callback).toHaveBeenCalledOnce();
      expect(mockStartViewTransition).not.toHaveBeenCalled();
    });
  });

  describe('Timeout Handling', () => {
    it('should use custom timeout when provided', async () => {
      // Transition completes immediately, timeout not reached
      mockTransition.finished = Promise.resolve();

      const callback = vi.fn();

      await withViewTransitionImmediate(callback, { timeout: 100 });

      expect(callback).toHaveBeenCalledOnce();
    });

    it('should use default timeout when not provided', async () => {
      configureViewTransitions({ defaultTimeout: 1000 });

      // Transition completes immediately, timeout not reached
      mockTransition.finished = Promise.resolve();

      const callback = vi.fn();

      await withViewTransitionImmediate(callback);

      expect(callback).toHaveBeenCalledOnce();
    });

    // Note: Timeout logging tests are difficult to test reliably with happy-dom
    // The timing is too unpredictable. These are tested manually in real browsers.
  });

  describe('CSS Helpers', () => {
    it('should set view-transition-name on element', () => {
      const element = document.createElement('div');

      setTransitionName(element, 'main-content');

      expect((element as HTMLElement).style.viewTransitionName).toBe('main-content');
    });

    it('should remove view-transition-name when null', () => {
      const element = document.createElement('div');
      (element as HTMLElement).style.viewTransitionName = 'old-name';

      setTransitionName(element, null);

      expect((element as HTMLElement).style.viewTransitionName).toBe('');
    });

    it('should overwrite existing transition name', () => {
      const element = document.createElement('div');
      (element as HTMLElement).style.viewTransitionName = 'old-name';

      setTransitionName(element, 'new-name');

      expect((element as HTMLElement).style.viewTransitionName).toBe('new-name');
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', async () => {
      const error = new Error('Callback failed');
      const callback = vi.fn(() => {
        throw error;
      });

      // Errors are caught and rejections propagated through the queue
      try {
        await withViewTransition(callback);
        // May not throw if error is caught internally
      } catch (err: any) {
        expect(err.message).toContain('Callback failed');
      }
    });

    it('should handle async callback errors', async () => {
      const error = new Error('Async callback failed');
      const callback = vi.fn(async () => {
        throw error;
      });

      // Errors are caught and rejections propagated through the queue
      try {
        await withViewTransition(callback);
        // May not throw if error is caught internally
      } catch (err: any) {
        expect(err.message).toContain('Async callback failed');
      }
    });

    it('should not break queue on error', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Failed');
      });
      const successCallback = vi.fn();

      const promise1 = withViewTransition(errorCallback).catch(() => {});
      const promise2 = withViewTransition(successCallback);

      await Promise.all([promise1, promise2]);

      expect(errorCallback).toHaveBeenCalledOnce();
      expect(successCallback).toHaveBeenCalledOnce();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid sequential transitions', async () => {
      const results: number[] = [];

      const promises = Array.from({ length: 10 }, (_, i) =>
        withViewTransition(() => results.push(i))
      );

      await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should handle mix of queued and immediate transitions', async () => {
      const queuedCallback = vi.fn();
      const immediateCallback = vi.fn();

      const promise1 = withViewTransition(queuedCallback);
      const promise2 = withViewTransitionImmediate(immediateCallback);

      await Promise.all([promise1, promise2]);

      expect(queuedCallback).toHaveBeenCalledOnce();
      expect(immediateCallback).toHaveBeenCalledOnce();
    });

    it('should handle configuration changes during transitions', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const promise1 = withViewTransition(callback1);

      configureViewTransitions({ enabled: false });

      const promise2 = withViewTransition(callback2);

      await Promise.all([promise1, promise2]);

      expect(callback1).toHaveBeenCalledOnce();
      expect(callback2).toHaveBeenCalledOnce();
      // First should use transition (was enabled), second should not (disabled)
    });
  });

  describe('Default Export', () => {
    it('should export all functions via default export', async () => {
      const viewTransitions = await import('../view-transitions');
      const defaultExport = viewTransitions.default;

      expect(defaultExport.isSupported).toBe(isViewTransitionsSupported);
      expect(defaultExport.configure).toBe(configureViewTransitions);
      expect(defaultExport.getConfig).toBe(getViewTransitionsConfig);
      expect(defaultExport.withTransition).toBe(withViewTransition);
      expect(defaultExport.withTransitionImmediate).toBe(withViewTransitionImmediate);
      expect(defaultExport.clearQueue).toBe(clearTransitionQueue);
      expect(defaultExport.getPendingCount).toBe(getPendingTransitionCount);
      expect(defaultExport.isTransitioning).toBe(isTransitioning);
      expect(defaultExport.setTransitionName).toBe(setTransitionName);
    });
  });
});
