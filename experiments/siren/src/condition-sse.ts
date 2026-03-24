/**
 * SSE condition broadcast helper.
 *
 * Connects to a GRAIL server's SSE endpoint and feeds condition events
 * into a ConditionState instance. Usage:
 *
 *   const source = connectConditionSSE('/orders/events', getConditionState());
 *   // later: source.close();
 */

import type { ConditionState } from './condition-state';
import type { ConditionsSSEData } from './types';

/**
 * Connect to a GRAIL SSE endpoint and apply condition broadcasts
 * to the given ConditionState. Returns the EventSource for lifecycle control.
 */
export function connectConditionSSE(url: string, state: ConditionState): EventSource {
  const source = new EventSource(url);
  source.addEventListener('conditions', (e: MessageEvent) => {
    const data = JSON.parse(e.data) as ConditionsSSEData;
    state.applySSE(data);
  });
  return source;
}
