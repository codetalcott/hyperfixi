/**
 * Unit Tests for Event Waiting Helpers
 *
 * Tests shared utilities for promise-based event waiting with cleanup.
 * Critical helper affecting: wait, trigger, send, transition, settle commands
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  waitForEvent,
  waitForTime,
  waitForTransitionEnd,
  waitForAnimationComplete,
  waitForFirst,
  createGuardedFinisher,
  createOnceGuard,
  createCleanupManager,
  type EventWaitResult,
  type TransitionWaitResult,
  type AnimationWaitResult,
  type WaitCondition,
} from '../event-waiting';

// ========== Test Utilities ==========

class MockEventTarget extends EventTarget {
  dispatchEvent(event: Event): boolean {
    return super.dispatchEvent(event);
  }
}

// ========== Tests ==========

describe('Event Waiting Helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('waitForEvent', () => {
    describe('basic event waiting', () => {
      it('should resolve when event fires', async () => {
        const target = new MockEventTarget();
        const promise = waitForEvent(target, 'test');

        target.dispatchEvent(new Event('test'));
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.timedOut).toBe(false);
        expect(result.cancelled).toBe(false);
        expect(result.event).toBeInstanceOf(Event);
      });

      it('should resolve with the event object', async () => {
        const target = new MockEventTarget();
        const promise = waitForEvent(target, 'custom');

        const customEvent = new CustomEvent('custom', { detail: { data: 42 } });
        target.dispatchEvent(customEvent);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.event).toBe(customEvent);
        expect((result.event as CustomEvent).detail.data).toBe(42);
      });

      it('should clean up listener after event fires', async () => {
        const target = new MockEventTarget();
        const removeEventListenerSpy = vi.spyOn(target, 'removeEventListener');

        const promise = waitForEvent(target, 'test');
        target.dispatchEvent(new Event('test'));
        await vi.runAllTimersAsync();
        await promise;

        expect(removeEventListenerSpy).toHaveBeenCalledWith('test', expect.any(Function));
      });
    });

    describe('timeout handling', () => {
      it('should timeout when event does not fire', async () => {
        const target = new MockEventTarget();
        const promise = waitForEvent(target, 'test', 1000);

        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.timedOut).toBe(true);
        expect(result.event).toBeNull();
      });

      it('should resolve before timeout if event fires', async () => {
        const target = new MockEventTarget();
        const promise = waitForEvent(target, 'test', 1000);

        vi.advanceTimersByTime(500);
        target.dispatchEvent(new Event('test'));
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.timedOut).toBe(false);
        expect(result.event).toBeInstanceOf(Event);
      });

      it('should clear timeout when event fires', async () => {
        const target = new MockEventTarget();
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

        const promise = waitForEvent(target, 'test', 1000);
        target.dispatchEvent(new Event('test'));
        await vi.runAllTimersAsync();
        await promise;

        expect(clearTimeoutSpy).toHaveBeenCalled();
      });

      it('should not timeout when timeout is 0', async () => {
        const target = new MockEventTarget();
        const promise = waitForEvent(target, 'test', 0);

        // Advance time significantly
        vi.advanceTimersByTime(10000);

        // Event should still be waited for
        target.dispatchEvent(new Event('test'));
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.timedOut).toBe(false);
      });

      it('should not timeout when timeout is undefined', async () => {
        const target = new MockEventTarget();
        const promise = waitForEvent(target, 'test', undefined);

        vi.advanceTimersByTime(10000);

        target.dispatchEvent(new Event('test'));
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.timedOut).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should reject when no target provided', async () => {
        await expect(waitForEvent(null as any, 'test')).rejects.toThrow(
          'waitForEvent: no target provided'
        );
      });

      it('should reject when undefined target provided', async () => {
        await expect(waitForEvent(undefined as any, 'test')).rejects.toThrow(
          'waitForEvent: no target provided'
        );
      });
    });
  });

  describe('waitForTime', () => {
    it('should resolve after specified duration', async () => {
      const promise = waitForTime(1000);

      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
    });

    it('should not resolve before duration', async () => {
      const promise = waitForTime(1000);
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      vi.advanceTimersByTime(500);

      expect(resolved).toBe(false);
    });

    it('should handle zero duration', async () => {
      const promise = waitForTime(0);

      vi.advanceTimersByTime(0);
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('waitForTransitionEnd', () => {
    let element: HTMLElement;

    beforeEach(() => {
      element = document.createElement('div');
    });

    describe('transition completion', () => {
      it('should resolve when transitionend fires', async () => {
        const promise = waitForTransitionEnd(element, 'opacity', 500);

        const event = new TransitionEvent('transitionend', {
          propertyName: 'opacity',
          bubbles: true,
        });
        Object.defineProperty(event, 'target', { value: element, writable: false });
        element.dispatchEvent(event);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.completed).toBe(true);
        expect(result.cancelled).toBe(false);
      });

      it('should ignore transitions on different properties', async () => {
        const promise = waitForTransitionEnd(element, 'opacity', 500);
        let resolved = false;
        promise.then(() => {
          resolved = true;
        });

        // Fire event for different property
        const event = new TransitionEvent('transitionend', {
          propertyName: 'width',
          bubbles: true,
        });
        Object.defineProperty(event, 'target', { value: element, writable: false });
        element.dispatchEvent(event);

        // Advance only a small amount of time, not enough to trigger timeout
        vi.advanceTimersByTime(100);

        expect(resolved).toBe(false);
      });

      it('should ignore transitions on different elements', async () => {
        const promise = waitForTransitionEnd(element, 'opacity', 500);
        let resolved = false;
        promise.then(() => {
          resolved = true;
        });

        const otherElement = document.createElement('div');
        const event = new TransitionEvent('transitionend', {
          propertyName: 'opacity',
          bubbles: true,
        });
        Object.defineProperty(event, 'target', { value: otherElement, writable: false });
        otherElement.dispatchEvent(event);

        // Advance only a small amount of time, not enough to trigger timeout
        vi.advanceTimersByTime(100);

        expect(resolved).toBe(false);
      });
    });

    describe('transition cancellation', () => {
      // Note: Skipped because happy-dom doesn't properly dispatch transitioncancel events
      // The event is created and dispatched, but listeners don't receive it.
      // This works correctly in real browsers. The code is tested via integration tests.
      it.skip('should resolve with cancelled when transitioncancel fires', async () => {
        const promise = waitForTransitionEnd(element, 'opacity', 500);

        const event = new TransitionEvent('transitioncancel', {
          propertyName: 'opacity',
          bubbles: true,
        });
        Object.defineProperty(event, 'target', { value: element, writable: false });
        element.dispatchEvent(event);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.completed).toBe(false);
        expect(result.cancelled).toBe(true);
      });
    });

    describe('timeout handling', () => {
      it('should timeout after duration + 50ms', async () => {
        const promise = waitForTransitionEnd(element, 'opacity', 500);

        vi.advanceTimersByTime(550);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.completed).toBe(true);
        expect(result.cancelled).toBe(false);
      });

      it('should resolve before timeout if transition completes', async () => {
        const promise = waitForTransitionEnd(element, 'opacity', 500);

        vi.advanceTimersByTime(100);
        const event = new TransitionEvent('transitionend', {
          propertyName: 'opacity',
          bubbles: true,
        });
        Object.defineProperty(event, 'target', { value: element, writable: false });
        element.dispatchEvent(event);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.completed).toBe(true);
      });
    });

    describe('cleanup', () => {
      it('should remove event listeners after completion', async () => {
        const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');

        const promise = waitForTransitionEnd(element, 'opacity', 500);
        const event = new TransitionEvent('transitionend', {
          propertyName: 'opacity',
          bubbles: true,
        });
        Object.defineProperty(event, 'target', { value: element, writable: false });
        element.dispatchEvent(event);
        await vi.runAllTimersAsync();
        await promise;

        expect(removeEventListenerSpy).toHaveBeenCalledWith('transitionend', expect.any(Function));
        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          'transitioncancel',
          expect.any(Function)
        );
      });
    });
  });

  describe('waitForAnimationComplete', () => {
    let element: HTMLElement;

    beforeEach(() => {
      element = document.createElement('div');
    });

    describe('immediate resolution', () => {
      it('should resolve immediately when no animation time', async () => {
        const result = await waitForAnimationComplete(element, 0, 1000);

        expect(result.completed).toBe(true);
        expect(result.type).toBe('timeout');
      });

      it('should resolve immediately when negative animation time', async () => {
        const result = await waitForAnimationComplete(element, -100, 1000);

        expect(result.completed).toBe(true);
        expect(result.type).toBe('timeout');
      });
    });

    describe('transition end', () => {
      it('should resolve when transitionend fires', async () => {
        const promise = waitForAnimationComplete(element, 500, 1000);

        const event = new Event('transitionend', { bubbles: true });
        Object.defineProperty(event, 'target', { value: element, writable: false });
        element.dispatchEvent(event);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.completed).toBe(true);
        expect(result.type).toBe('transition');
      });

      it('should ignore transitions on other elements', async () => {
        const promise = waitForAnimationComplete(element, 500, 1000);
        let resolved = false;
        promise.then(() => {
          resolved = true;
        });

        const otherElement = document.createElement('div');
        const event = new Event('transitionend', { bubbles: true });
        Object.defineProperty(event, 'target', { value: otherElement, writable: false });
        otherElement.dispatchEvent(event);

        // Advance only a small amount of time, not enough to trigger timeout
        vi.advanceTimersByTime(100);

        expect(resolved).toBe(false);
      });
    });

    describe('animation end', () => {
      it('should resolve when animationend fires', async () => {
        const promise = waitForAnimationComplete(element, 500, 1000);

        const event = new Event('animationend', { bubbles: true });
        Object.defineProperty(event, 'target', { value: element, writable: false });
        element.dispatchEvent(event);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.completed).toBe(true);
        expect(result.type).toBe('animation');
      });
    });

    describe('timeout handling', () => {
      it('should timeout after computed animation time + 50ms', async () => {
        const promise = waitForAnimationComplete(element, 500, 10000);

        vi.advanceTimersByTime(550);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.completed).toBe(true);
        expect(result.type).toBe('timeout');
      });

      it('should timeout at user timeout if shorter', async () => {
        const promise = waitForAnimationComplete(element, 5000, 1000);

        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.completed).toBe(false);
        expect(result.type).toBe('timeout');
      });
    });

    describe('cleanup', () => {
      it('should remove event listeners after completion', async () => {
        const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');

        const promise = waitForAnimationComplete(element, 500, 1000);
        const event = new Event('animationend', { bubbles: true });
        Object.defineProperty(event, 'target', { value: element, writable: false });
        element.dispatchEvent(event);
        await vi.runAllTimersAsync();
        await promise;

        expect(removeEventListenerSpy).toHaveBeenCalledWith('transitionend', expect.any(Function));
        expect(removeEventListenerSpy).toHaveBeenCalledWith('animationend', expect.any(Function));
      });

      it('should clear both timeouts', async () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

        const promise = waitForAnimationComplete(element, 500, 1000);
        const event = new Event('animationend', { bubbles: true });
        Object.defineProperty(event, 'target', { value: element, writable: false });
        element.dispatchEvent(event);
        await vi.runAllTimersAsync();
        await promise;

        expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('waitForFirst', () => {
    describe('time conditions', () => {
      it('should resolve with time condition when it completes first', async () => {
        const conditions: WaitCondition[] = [
          { type: 'time', ms: 100 },
          { type: 'time', ms: 500 },
        ];

        const promise = waitForFirst(conditions);

        vi.advanceTimersByTime(100);
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.winner.type).toBe('time');
        expect((result.winner as { ms: number }).ms).toBe(100);
        expect(result.result).toBe(100);
      });
    });

    describe('event conditions', () => {
      it('should resolve with event condition when it completes first', async () => {
        const target = new MockEventTarget();
        const conditions: WaitCondition[] = [
          { type: 'event', target, eventName: 'test' },
          { type: 'time', ms: 1000 },
        ];

        const promise = waitForFirst(conditions);

        target.dispatchEvent(new Event('test'));
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.winner.type).toBe('event');
        expect(result.result).toBeInstanceOf(Event);
      });
    });

    describe('mixed conditions', () => {
      it('should resolve with the first completing condition', async () => {
        const target1 = new MockEventTarget();
        const target2 = new MockEventTarget();
        const conditions: WaitCondition[] = [
          { type: 'time', ms: 500 },
          { type: 'event', target: target1, eventName: 'fast' },
          { type: 'event', target: target2, eventName: 'slow' },
        ];

        const promise = waitForFirst(conditions);

        vi.advanceTimersByTime(100);
        target1.dispatchEvent(new Event('fast'));
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.winner.type).toBe('event');
        expect((result.winner as { eventName: string }).eventName).toBe('fast');
      });
    });

    describe('error handling', () => {
      it('should reject when no conditions provided', async () => {
        await expect(waitForFirst([])).rejects.toThrow('waitForFirst: no conditions provided');
      });
    });
  });

  describe('createGuardedFinisher', () => {
    it('should call cleanup and resolve on first invocation', () => {
      const cleanup = vi.fn();
      const resolve = vi.fn();
      const finish = createGuardedFinisher(cleanup, resolve);

      finish({ result: 'success' });

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(resolve).toHaveBeenCalledWith({ result: 'success' });
    });

    it('should not call cleanup or resolve on subsequent invocations', () => {
      const cleanup = vi.fn();
      const resolve = vi.fn();
      const finish = createGuardedFinisher(cleanup, resolve);

      finish({ result: 'first' });
      finish({ result: 'second' });
      finish({ result: 'third' });

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(resolve).toHaveBeenCalledWith({ result: 'first' });
    });

    it('should execute cleanup before resolve', () => {
      const order: string[] = [];
      const cleanup = () => order.push('cleanup');
      const resolve = () => order.push('resolve');
      const finish = createGuardedFinisher(cleanup, resolve);

      finish({ result: 'test' });

      expect(order).toEqual(['cleanup', 'resolve']);
    });
  });

  describe('createOnceGuard', () => {
    it('should call callback on first invocation', () => {
      const callback = vi.fn();
      const guarded = createOnceGuard(callback);

      guarded('arg1', 'arg2');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should not call callback on subsequent invocations', () => {
      const callback = vi.fn();
      const guarded = createOnceGuard(callback);

      guarded('first');
      guarded('second');
      guarded('third');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });

    it('should preserve callback arguments', () => {
      const callback = vi.fn((a: number, b: string, c: boolean) => {
        return `${a}-${b}-${c}`;
      });
      const guarded = createOnceGuard(callback);

      guarded(42, 'test', true);

      expect(callback).toHaveBeenCalledWith(42, 'test', true);
    });
  });

  describe('createCleanupManager', () => {
    it('should add cleanup functions', () => {
      const manager = createCleanupManager();
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      manager.add(fn1);
      manager.add(fn2);
      manager.cleanup();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should execute cleanups in order', () => {
      const manager = createCleanupManager();
      const order: number[] = [];

      manager.add(() => order.push(1));
      manager.add(() => order.push(2));
      manager.add(() => order.push(3));

      manager.cleanup();

      expect(order).toEqual([1, 2, 3]);
    });

    it('should clear cleanups after execution', () => {
      const manager = createCleanupManager();
      const fn = vi.fn();

      manager.add(fn);
      manager.cleanup();
      manager.cleanup();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should ignore errors in cleanup functions', () => {
      const manager = createCleanupManager();
      const fn1 = vi.fn();
      const fn2 = vi.fn(() => {
        throw new Error('Cleanup error');
      });
      const fn3 = vi.fn();

      manager.add(fn1);
      manager.add(fn2);
      manager.add(fn3);

      expect(() => manager.cleanup()).not.toThrow();
      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
      expect(fn3).toHaveBeenCalled();
    });

    it('should handle empty cleanup list', () => {
      const manager = createCleanupManager();

      expect(() => manager.cleanup()).not.toThrow();
    });

    it('should allow multiple cleanup cycles', () => {
      const manager = createCleanupManager();
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      manager.add(fn1);
      manager.cleanup();

      manager.add(fn2);
      manager.cleanup();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });
});
