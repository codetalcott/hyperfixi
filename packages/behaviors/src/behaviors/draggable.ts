/**
 * Draggable Behavior
 *
 * Makes elements draggable with pointer events. Defined from its hyperscript
 * `source` (the single source of truth shared with the browser bundle and
 * patterns-reference) — no imperative installer. The source uses
 * `repeat until event pointerup` + `wait for pointermove or pointerup` to run the
 * drag loop, `my offsetLeft` / `my offsetTop` for the start offset, and
 * `add { left: ${…}px }` to move.
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
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const draggableSource = draggableSchema.source;
export const draggableMetadata = draggableSchema;

/**
 * Define the Draggable behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerDraggable(host?: HyperscriptHost): Promise<void> {
  defineBehavior(draggableSchema, host);
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
