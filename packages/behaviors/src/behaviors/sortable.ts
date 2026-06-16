/**
 * Sortable Behavior
 *
 * Drag-and-drop reordering of list items. Apply to a container element; its
 * `<li>` children become sortable. Compiled from its hyperscript `source` (single
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
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const sortableSource = sortableSchema.source;
export const sortableMetadata = sortableSchema;

/**
 * Register the Sortable behavior with LokaScript by compiling its hyperscript
 * source and executing the resulting behavior definition.
 */
export async function registerSortable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(sortableSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile Sortable behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
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
