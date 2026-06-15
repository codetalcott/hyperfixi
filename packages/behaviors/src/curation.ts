/**
 * Curation status — the product decision about which behaviors are first-class.
 *
 * This is ORTHOGONAL to {@link BehaviorTier} (core/common/optional), which is about
 * lazy-loading priority. Curation is about support level and the boundary rule:
 *
 *   A behavior is a named, parameterized, *reusable inline script* — `on event →
 *   DOM action`. Not a component. When it needs an observer, a focus model, or an
 *   async pointer loop, it has left hyperfixi's lane.
 *
 * See docs-internal/BEHAVIORS_CONSOLIDATION_PLAN.md for the full rationale.
 */

export type CurationStatus = 'curated' | 'optional' | 'experimental';

/**
 * Curated set — reliable, runtime-tested, multilingual. The supported story.
 * Real `on event → DOM action` behaviors (Tier A) plus two honestly-labeled
 * JS-backed conveniences (Clipboard, AutoDismiss).
 */
export const CURATED_BEHAVIORS = [
  'Toggleable',
  'Removable',
  'ClickOutside',
  'Clipboard',
  'AutoDismiss',
] as const;

/**
 * Optional — useful, kept, documented as primitives / nice-to-haves.
 * FocusTrap + ClickOutside are the primitives a Modal composes from; ScrollReveal
 * is a nice-to-have; Tabs is high-value but heavy.
 */
export const OPTIONAL_BEHAVIORS = ['FocusTrap', 'ScrollReveal', 'Tabs'] as const;

/**
 * Experimental — stateful async components (drag/sort/resize). These sit *beyond*
 * the inline-scripting boundary; kept working but explicitly outside the curated,
 * supported, marketed story.
 */
export const EXPERIMENTAL_BEHAVIORS = ['Draggable', 'Sortable', 'Resizable'] as const;

/** Curation status for every behavior, keyed by name. */
export const CURATION_STATUS: Record<string, CurationStatus> = {
  ...Object.fromEntries(CURATED_BEHAVIORS.map(n => [n, 'curated' as const])),
  ...Object.fromEntries(OPTIONAL_BEHAVIORS.map(n => [n, 'optional' as const])),
  ...Object.fromEntries(EXPERIMENTAL_BEHAVIORS.map(n => [n, 'experimental' as const])),
};

/** Curation status for a behavior name, or undefined if unknown. */
export function curationStatusOf(name: string): CurationStatus | undefined {
  return CURATION_STATUS[name];
}

/** True for the curated, supported set. */
export function isCurated(name: string): boolean {
  return CURATION_STATUS[name] === 'curated';
}
