/**
 * Draggable Behavior
 *
 * A reusable behavior that makes elements draggable with pointer events.
 * Supports custom drag handles, lifecycle events, and smooth positioning.
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <div _="install Draggable">Drag me!</div>
 *
 * <!-- With custom drag handle -->
 * <div _="install Draggable(dragHandle: .titlebar)">
 *   <div class="titlebar">Drag here</div>
 *   <div class="content">Content</div>
 * </div>
 * ```
 */

import { draggableSchema } from '../schemas/draggable.schema';
import type { LokaScriptInstance, LokaScriptWindow } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const draggableSource = draggableSchema.source;
export const draggableMetadata = draggableSchema;

/**
 * Register the Draggable behavior with LokaScript.
 */
export async function registerDraggable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf =
    hyperfixi ||
    (typeof window !== 'undefined' ? (window as unknown as LokaScriptWindow).lokascript : null);

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(draggableSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile Draggable behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
}

// Auto-register when loaded as a script tag
if (typeof window !== 'undefined' && (window as unknown as LokaScriptWindow).lokascript) {
  registerDraggable().catch(console.error);
}

export default {
  source: draggableSchema.source,
  metadata: draggableSchema,
  register: registerDraggable,
};
