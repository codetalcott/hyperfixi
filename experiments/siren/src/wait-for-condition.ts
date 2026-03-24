/**
 * Async primitive: wait until a named condition becomes active.
 *
 * Usage:
 *   const detail = await waitForCondition('order.paid', getConditionState());
 *   // condition is now active
 */

import type { ConditionState } from './condition-state';
import type { ConditionsChangedDetail } from './types';

export interface WaitForConditionOptions {
  /** Timeout in milliseconds. Default: 30000 (30 seconds). */
  timeout?: number;
  /** Entity URL path to scope the check. If omitted, checks all entities. */
  entity?: string;
}

/**
 * Returns a promise that resolves when the named condition becomes active
 * in the given ConditionState. Listens to `siren:conditions` events on document.
 *
 * Resolves immediately if the condition is already met.
 * Rejects on timeout.
 */
export function waitForCondition(
  condition: string,
  conditionState: ConditionState,
  opts: WaitForConditionOptions = {},
): Promise<ConditionsChangedDetail> {
  const { timeout = 30000, entity } = opts;

  return new Promise<ConditionsChangedDetail>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      document.removeEventListener('siren:conditions', listener);
      clearTimeout(timer);
    };

    // Check immediately
    if (conditionState.has(condition, entity)) {
      const detail: ConditionsChangedDetail = {
        entity: entity ?? '',
        conditions: conditionState.get(entity),
        added: [],
        removed: [],
      };
      resolve(detail);
      return;
    }

    const listener = ((e: CustomEvent<ConditionsChangedDetail>) => {
      if (settled) return;
      if (entity && e.detail.entity !== entity) return;
      if (conditionState.has(condition, entity)) {
        settled = true;
        cleanup();
        resolve(e.detail);
      }
    }) as EventListener;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`waitForCondition('${condition}') timed out after ${timeout}ms`));
    }, timeout);

    document.addEventListener('siren:conditions', listener);
  });
}
