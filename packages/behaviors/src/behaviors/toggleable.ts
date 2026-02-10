/**
 * Toggleable Behavior
 *
 * A behavior that toggles a CSS class on click.
 * Useful for accordions, dropdowns, and toggle buttons.
 *
 * @example
 * ```html
 * <button _="install Toggleable">Toggle</button>
 *
 * <button _="install Toggleable(cls: expanded, target: #menu)">Menu</button>
 * ```
 */

import { toggleableSchema } from '../schemas/toggleable.schema';
import type { LokaScriptInstance, LokaScriptWindow } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const toggleableSource = toggleableSchema.source;
export const toggleableMetadata = toggleableSchema;

/**
 * Register the Toggleable behavior with LokaScript.
 */
export async function registerToggleable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf =
    hyperfixi ||
    (typeof window !== 'undefined' ? (window as unknown as LokaScriptWindow).lokascript : null);

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
if (typeof window !== 'undefined' && (window as unknown as LokaScriptWindow).lokascript) {
  registerToggleable().catch(console.error);
}

export default {
  source: toggleableSchema.source,
  metadata: toggleableSchema,
  register: registerToggleable,
};
