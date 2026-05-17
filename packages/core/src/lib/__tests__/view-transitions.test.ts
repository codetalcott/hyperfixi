/**
 * Tests for the View Transitions queue.
 *
 * Covers the surviving public surface: feature detection, the sequencing
 * queue, and the unsupported-environment fallback.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isViewTransitionsSupported, withViewTransition } from '../view-transitions';

let mockStartViewTransition: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Real `document.startViewTransition` returns synchronously with a
  // ViewTransition object whose `finished` is a Promise. Mirror that shape.
  mockStartViewTransition = vi.fn((callback: () => void | Promise<void>) => {
    const finished = Promise.resolve()
      .then(() => callback())
      .then(() => undefined);
    return { finished };
  });
  (document as unknown as Record<string, unknown>).startViewTransition = mockStartViewTransition;
});

afterEach(() => {
  delete (document as unknown as Record<string, unknown>).startViewTransition;
});

describe('isViewTransitionsSupported', () => {
  it('returns true when startViewTransition is present', () => {
    expect(isViewTransitionsSupported()).toBe(true);
  });

  it('returns false when startViewTransition is missing', () => {
    delete (document as unknown as Record<string, unknown>).startViewTransition;
    expect(isViewTransitionsSupported()).toBe(false);
  });
});

describe('withViewTransition', () => {
  it('runs the callback through startViewTransition when supported', async () => {
    const cb = vi.fn();
    await withViewTransition(cb);
    expect(cb).toHaveBeenCalledOnce();
    expect(mockStartViewTransition).toHaveBeenCalledOnce();
  });

  it('falls back to direct execution when the API is missing', async () => {
    delete (document as unknown as Record<string, unknown>).startViewTransition;
    const cb = vi.fn();
    await withViewTransition(cb);
    expect(cb).toHaveBeenCalledOnce();
    expect(mockStartViewTransition).not.toHaveBeenCalled();
  });

  it('awaits async callbacks before resolving', async () => {
    let done = false;
    await withViewTransition(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      done = true;
    });
    expect(done).toBe(true);
  });

  it('executes queued transitions sequentially', async () => {
    const order: number[] = [];
    await Promise.all([
      withViewTransition(() => {
        order.push(1);
      }),
      withViewTransition(() => {
        order.push(2);
      }),
      withViewTransition(() => {
        order.push(3);
      }),
    ]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('does not let one failing callback block the queue', async () => {
    const after = vi.fn();
    const failing = withViewTransition(() => {
      throw new Error('boom');
    });
    const next = withViewTransition(after);

    await expect(failing).rejects.toThrow('boom');
    await next;
    expect(after).toHaveBeenCalledOnce();
  });
});
