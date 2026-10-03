/**
 * Toggleable Behavior
 *
 * A behavior that toggles a CSS class on click.
 * Useful for accordions, dropdowns, and toggle buttons.
 *
 * Defined from its hyperscript `source` (the single source of truth shared with
 * the browser bundle and patterns-reference). The `.{cls}` dynamic class
 * selector resolves the behavior's `cls` parameter at runtime.
 *
 * @example
 * ```html
 * <button _="install Toggleable">Toggle</button>
 *
 * <button _="install Toggleable(cls: 'expanded', targetEl: #menu)">Menu</button>
 * ```
 */

import { toggleableSchema } from '../schemas/toggleable.schema';
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const toggleableSource = toggleableSchema.source;
export const toggleableMetadata = toggleableSchema;

/**
 * Define the Toggleable behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerToggleable(host?: HyperscriptHost): Promise<void> {
  defineBehavior(toggleableSchema, host);
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
