/**
 * Resizable Behavior
 *
 * A behavior that makes elements resizable by dragging edges or corners.
 * Supports minimum/maximum dimensions and resize handles.
 *
 * @example
 * ```html
 * <div _="install Resizable" style="width: 200px; height: 150px;">
 *   Resize me!
 * </div>
 * ```
 */

import { resizableSchema } from '../schemas/resizable.schema';
import type { LokaScriptInstance, LokaScriptWindow } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const resizableSource = resizableSchema.source;
export const resizableMetadata = resizableSchema;

/**
 * Register the Resizable behavior with LokaScript.
 */
export async function registerResizable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf =
    hyperfixi ||
    (typeof window !== 'undefined' ? (window as unknown as LokaScriptWindow).lokascript : null);

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
if (typeof window !== 'undefined' && (window as unknown as LokaScriptWindow).lokascript) {
  registerResizable().catch(console.error);
}

export default {
  source: resizableSchema.source,
  metadata: resizableSchema,
  register: registerResizable,
};
