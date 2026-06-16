/**
 * Resizable Behavior
 *
 * Makes elements resizable by dragging. Compiled from its hyperscript `source`
 * (single source of truth) — no imperative installer. The source measures the
 * start size, runs a `repeat until event pointerup` loop, clamps to
 * min/max dimensions, and writes `*width` / `*height` inline styles.
 *
 * @example
 * ```html
 * <div _="install Resizable" style="width: 200px; height: 150px;">
 *   Resize me!
 * </div>
 * ```
 */

import { resizableSchema } from '../schemas/resizable.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const resizableSource = resizableSchema.source;
export const resizableMetadata = resizableSchema;

/**
 * Register the Resizable behavior with LokaScript by compiling its hyperscript
 * source and executing the resulting behavior definition.
 */
export async function registerResizable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(resizableSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile Resizable behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerResizable().catch(console.error);
}

export default {
  source: resizableSchema.source,
  metadata: resizableSchema,
  register: registerResizable,
};
