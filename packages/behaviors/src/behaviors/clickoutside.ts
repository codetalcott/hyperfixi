/**
 * ClickOutside Behavior
 *
 * Fires a clickoutside event when the user clicks outside the element.
 * Uses pointerdown instead of click to avoid timing issues.
 *
 * Defined from its hyperscript `source` (the single source of truth shared with
 * the browser bundle and patterns-reference).
 */

import { clickOutsideSchema } from '../schemas/clickoutside.schema';
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

// Re-export schema-derived values
export const clickOutsideSource = clickOutsideSchema.source;
export const clickOutsideMetadata = clickOutsideSchema;

/**
 * Define the ClickOutside behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerClickOutside(host?: HyperscriptHost): Promise<void> {
  defineBehavior(clickOutsideSchema, host);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerClickOutside().catch(console.error);
}

export default {
  source: clickOutsideSchema.source,
  metadata: clickOutsideSchema,
  register: registerClickOutside,
};
