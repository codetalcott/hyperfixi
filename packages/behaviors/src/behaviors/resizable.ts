/**
 * Resizable Behavior
 *
 * Makes elements resizable by dragging. Defined from its hyperscript `source`
 * (single source of truth) — no imperative installer. The source reads the start
 * size from `my offsetWidth` / `my offsetHeight`, runs a `repeat until event pointerup` loop, clamps to
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
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const resizableSource = resizableSchema.source;
export const resizableMetadata = resizableSchema;

/**
 * Define the Resizable behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerResizable(host?: HyperscriptHost): Promise<void> {
  defineBehavior(resizableSchema, host);
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
