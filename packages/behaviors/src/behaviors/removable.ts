/**
 * Removable Behavior
 *
 * A behavior that removes an element when a trigger is clicked.
 * Supports optional confirmation and transition effects.
 *
 * @example
 * ```html
 * <div _="install Removable">Click to remove</div>
 *
 * <div _="install Removable(confirm: true)">With confirmation</div>
 * ```
 */

import { removableSchema } from '../schemas/removable.schema';
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const removableSource = removableSchema.source;
export const removableMetadata = removableSchema;

/**
 * Define the Removable behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerRemovable(host?: HyperscriptHost): Promise<void> {
  defineBehavior(removableSchema, host);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerRemovable().catch(console.error);
}

export default {
  source: removableSchema.source,
  metadata: removableSchema,
  register: registerRemovable,
};
