/**
 * Sortable Behavior
 *
 * A behavior for drag-and-drop reordering of list items.
 * Apply to a container element; children become sortable.
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

// Re-export schema-derived values for backwards compatibility
export const sortableSource = sortableSchema.source;
export const sortableMetadata = sortableSchema;

/**
 * Register the Sortable behavior with HyperFixi.
 */
export async function registerSortable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || (typeof window !== 'undefined' ? (window as any).lokascript : null);

  if (!hf) {
    throw new Error(
      'HyperFixi not found. Make sure @lokascript/core is loaded before registering behaviors.'
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
if (typeof window !== 'undefined' && (window as any).lokascript) {
  registerSortable().catch(console.error);
}

export default {
  source: sortableSchema.source,
  metadata: sortableSchema,
  register: registerSortable,
};
