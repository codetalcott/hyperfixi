/**
 * ClickOutside Behavior
 *
 * Fires a clickoutside event when the user clicks outside the element.
 * Uses pointerdown instead of click to avoid timing issues.
 *
 * Compiled from its hyperscript `source` (the single source of truth shared with
 * the CDN resolver bundle and patterns-reference).
 */

import { clickOutsideSchema } from '../schemas/clickoutside.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values
export const clickOutsideSource = clickOutsideSchema.source;
export const clickOutsideMetadata = clickOutsideSchema;

/**
 * Register the ClickOutside behavior with LokaScript by compiling its
 * hyperscript source and executing the resulting behavior definition.
 */
export async function registerClickOutside(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(clickOutsideSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile ClickOutside behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerClickOutside().catch(console.error);
}

export default {
  source: clickOutsideSchema.source,
  metadata: clickOutsideSchema,
  register: registerClickOutside,
};
