/**
 * Sortable Behavior
 *
 * Drag-and-drop reordering of list items. Apply to a container element; its
 * `<li>` children become sortable. Defined from its hyperscript `source` (single
 * source of truth) — no imperative installer.
 *
 * Note: This behavior fires lifecycle events but does NOT automatically reorder
 * DOM elements. Users handle actual reordering in their `sortable:move` handlers.
 *
 * @example
 * ```html
 * <ul _="install Sortable">
 *   <li>Item 1</li>
 *   <li>Item 2</li>
 * </ul>
 * ```
 */

import { sortableSchema } from '../schemas/sortable.schema';
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const sortableSource = sortableSchema.source;
export const sortableMetadata = sortableSchema;

/**
 * Define the Sortable behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerSortable(host?: HyperscriptHost): Promise<void> {
  defineBehavior(sortableSchema, host);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerSortable().catch(console.error);
}

export default {
  source: sortableSchema.source,
  metadata: sortableSchema,
  register: registerSortable,
};
