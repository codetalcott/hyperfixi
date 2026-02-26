/**
 * Removable Behavior
 *
 * A behavior that removes an element when a trigger is clicked.
 * Supports optional confirmation and transition effects.
 *
 * @example
 * ```html
 * <div _="install Removable">Click to remove</div>
 *
 * <div _="install Removable(confirm: true)">With confirmation</div>
 * ```
 */

import { removableSchema } from '../schemas/removable.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const removableSource = removableSchema.source;
export const removableMetadata = removableSchema;

/**
 * Register the Removable behavior with LokaScript.
 */
export async function registerRemovable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(removableSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile Removable behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerRemovable().catch(console.error);
}

export default {
  source: removableSchema.source,
  metadata: removableSchema,
  register: registerRemovable,
};
