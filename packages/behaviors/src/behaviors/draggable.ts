/**
 * Draggable Behavior
 *
 * Makes elements draggable with pointer events. Compiled from its hyperscript
 * `source` (the single source of truth shared with the CDN resolver bundle and
 * patterns-reference) — no imperative installer. The source uses
 * `repeat until event pointerup` + `wait for pointermove or pointerup` to run the
 * drag loop, `measure` for the start offset, and `add { left: ${…}px }` to move.
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
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const draggableSource = draggableSchema.source;
export const draggableMetadata = draggableSchema;

/**
 * Register the Draggable behavior with LokaScript by compiling its hyperscript
 * source and executing the resulting behavior definition.
 */
export async function registerDraggable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

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
if (resolveRuntime()) {
  registerDraggable().catch(console.error);
}

export default {
  source: draggableSchema.source,
  metadata: draggableSchema,
  register: registerDraggable,
};
