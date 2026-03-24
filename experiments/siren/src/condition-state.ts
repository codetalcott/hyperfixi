/**
 * GRAIL Condition State Tracker
 *
 * Maintains client-side condition state keyed by entity URL path.
 * Dispatches siren:conditions on document when conditions change.
 * Manages aria-disabled on elements with data-siren-preconditions.
 *
 * Standalone — no framework dependencies.
 */

import type { ConditionsChangedDetail, ConditionsSSEData } from './types';

/**
 * Client-side condition state, keyed by entity URL path.
 */
export class ConditionState {
  private state = new Map<string, Set<string>>();

  /**
   * Get active conditions for an entity.
   * If no entity specified, returns all conditions across all entities.
   */
  get(entity?: string): string[] {
    if (entity) {
      const conditions = this.state.get(entity);
      return conditions ? [...conditions] : [];
    }
    const all = new Set<string>();
    for (const conditions of this.state.values()) {
      for (const c of conditions) all.add(c);
    }
    return [...all];
  }

  /**
   * Check if a specific condition is active for an entity.
   * If no entity, checks across all entities.
   */
  has(condition: string, entity?: string): boolean {
    if (entity) {
      return this.state.get(entity)?.has(condition) ?? false;
    }
    for (const conditions of this.state.values()) {
      if (conditions.has(condition)) return true;
    }
    return false;
  }

  /**
   * Update conditions for an entity. Returns the diff (added/removed).
   */
  update(entity: string, newConditions: string[]): { added: string[]; removed: string[] } {
    const prev = this.state.get(entity) || new Set<string>();
    const next = new Set(newConditions);

    const added = newConditions.filter(c => !prev.has(c));
    const removed = [...prev].filter(c => !next.has(c));

    this.state.set(entity, next);
    return { added, removed };
  }

  /**
   * Apply a GRAIL SSE `conditions` event.
   * Updates state, dispatches siren:conditions, and updates precondition elements.
   *
   *   source.addEventListener('conditions', e => state.applySSE(JSON.parse(e.data)));
   */
  applySSE(data: ConditionsSSEData): void {
    const { added, removed } = this.update(data.entity, data.conditions);

    if (added.length > 0 || removed.length > 0) {
      dispatchConditionsChanged(this, {
        entity: data.entity,
        conditions: data.conditions,
        added,
        removed,
      });
    }
  }

  /** Clear all tracked conditions. */
  clear(): void {
    this.state.clear();
  }
}

/**
 * Parse the x-conditions header value into an array of condition names.
 * Format: comma-separated, whitespace-trimmed.
 */
export function parseConditionsHeader(header: string): string[] {
  return header.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Derive the entity key from a request URL.
 * Uses the pathname to identify the entity.
 */
export function entityKeyFromUrl(url: string): string {
  try {
    const parsed = new URL(url, globalThis.location?.origin || 'http://localhost');
    return parsed.pathname;
  } catch {
    return url;
  }
}

/**
 * Dispatch siren:conditions event and update precondition elements.
 */
export function dispatchConditionsChanged(
  conditionState: ConditionState,
  detail: ConditionsChangedDetail,
): void {
  if (typeof document !== 'undefined') {
    document.dispatchEvent(
      new CustomEvent('siren:conditions', { detail, bubbles: true })
    );
  }
  updatePreconditionElements(conditionState);
}

/**
 * Update aria-disabled on elements with data-siren-preconditions attribute
 * based on current condition state.
 */
export function updatePreconditionElements(conditionState: ConditionState): void {
  if (typeof document === 'undefined') return;

  const elements = document.querySelectorAll('[data-siren-preconditions]');
  for (const el of elements) {
    const required = (el.getAttribute('data-siren-preconditions') || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (required.length === 0) continue;

    const allMet = required.every(c => conditionState.has(c));
    if (allMet) {
      el.removeAttribute('aria-disabled');
    } else {
      el.setAttribute('aria-disabled', 'true');
    }
  }
}
