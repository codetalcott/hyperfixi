/**
 * Toggleable Behavior
 *
 * A behavior that toggles a CSS class on click.
 * Useful for accordions, dropdowns, and toggle buttons.
 *
 * Compiled from its hyperscript `source` (the single source of truth shared with
 * the CDN resolver bundle and patterns-reference). The `.{cls}` dynamic class
 * selector resolves the behavior's `cls` parameter at runtime — see
 * `packages/core/src/commands/behaviors/__tests__/template-interpolation.test.ts`.
 *
 * @example
 * ```html
 * <button _="install Toggleable">Toggle</button>
 *
 * <button _="install Toggleable(cls: expanded, target: #menu)">Menu</button>
 * ```
 */

import { toggleableSchema } from '../schemas/toggleable.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const toggleableSource = toggleableSchema.source;
export const toggleableMetadata = toggleableSchema;

/**
 * Register the Toggleable behavior with LokaScript by compiling its
 * hyperscript source and executing the resulting behavior definition.
 */
export async function registerToggleable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(toggleableSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile Toggleable behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerToggleable().catch(console.error);
}

export default {
  source: toggleableSchema.source,
  metadata: toggleableSchema,
  register: registerToggleable,
};
