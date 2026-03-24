import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConditionState } from '../src/condition-state';
import { waitForCondition } from '../src/wait-for-condition';
import type { ConditionsChangedDetail } from '../src/types';

function dispatchConditions(detail: ConditionsChangedDetail): void {
  document.dispatchEvent(
    new CustomEvent('siren:conditions', { detail, bubbles: true }),
  );
}

describe('waitForCondition', () => {
  let state: ConditionState;

  beforeEach(() => {
    state = new ConditionState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when condition already met', async () => {
    state.update('/orders/1', ['order.paid']);
    const result = await waitForCondition('order.paid', state);
    expect(result.conditions).toContain('order.paid');
  });

  it('resolves when condition becomes active via event', async () => {
    const promise = waitForCondition('order.paid', state);

    // Simulate condition becoming active
    state.update('/orders/1', ['order.paid']);
    dispatchConditions({
      entity: '/orders/1',
      conditions: ['order.paid'],
      added: ['order.paid'],
      removed: [],
    });

    const result = await promise;
    expect(result.entity).toBe('/orders/1');
    expect(result.added).toContain('order.paid');
  });

  it('rejects on timeout', async () => {
    const promise = waitForCondition('order.paid', state, { timeout: 5000 });

    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow(
      "waitForCondition('order.paid') timed out after 5000ms",
    );
  });

  it('uses default timeout of 30000ms', async () => {
    const promise = waitForCondition('order.paid', state);

    // Should not reject before 30s
    vi.advanceTimersByTime(29999);
    // Still pending — advance to 30s
    vi.advanceTimersByTime(1);

    await expect(promise).rejects.toThrow('timed out after 30000ms');
  });

  it('scopes to specific entity when option provided', async () => {
    const promise = waitForCondition('order.paid', state, { entity: '/orders/1' });

    // Event for wrong entity — should not resolve
    state.update('/orders/2', ['order.paid']);
    dispatchConditions({
      entity: '/orders/2',
      conditions: ['order.paid'],
      added: ['order.paid'],
      removed: [],
    });

    // Verify still pending by checking it doesn't resolve synchronously
    let resolved = false;
    promise.then(() => { resolved = true; });
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(false);

    // Now the right entity
    state.update('/orders/1', ['order.paid']);
    dispatchConditions({
      entity: '/orders/1',
      conditions: ['order.paid'],
      added: ['order.paid'],
      removed: [],
    });

    const result = await promise;
    expect(result.entity).toBe('/orders/1');
  });

  it('does not resolve for wrong condition name', async () => {
    const promise = waitForCondition('order.shipped', state, { timeout: 100 });

    state.update('/orders/1', ['order.paid']);
    dispatchConditions({
      entity: '/orders/1',
      conditions: ['order.paid'],
      added: ['order.paid'],
      removed: [],
    });

    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow('timed out');
  });

  it('cleans up event listener on resolve', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const promise = waitForCondition('order.paid', state);

    state.update('/orders/1', ['order.paid']);
    dispatchConditions({
      entity: '/orders/1',
      conditions: ['order.paid'],
      added: ['order.paid'],
      removed: [],
    });

    await promise;
    expect(removeSpy).toHaveBeenCalledWith('siren:conditions', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('cleans up event listener on timeout', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const promise = waitForCondition('order.paid', state, { timeout: 100 });

    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow();
    expect(removeSpy).toHaveBeenCalledWith('siren:conditions', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('resolves immediately when condition met across entities', async () => {
    state.update('/orders/1', ['order.mutable']);
    state.update('/orders/2', ['order.paid']);

    // No entity scope — checks across all
    const result = await waitForCondition('order.paid', state);
    expect(result.conditions).toContain('order.paid');
  });
});
