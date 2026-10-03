/**
 * FocusTrap Behavior
 *
 * Confines Tab navigation inside an element, manages aria-modal,
 * and restores focus on deactivation. The Tab-trapping / focus-model logic
 * lives in the schema's hyperscript `source` (an `init`-block `js()` body).
 *
 * Defined from its hyperscript `source` — the single source of truth shared with
 * the browser bundle and patterns-reference. This collapses FocusTrap onto
 * the one runtime path (no more imperative-installer fork between CDN and npm);
 * see docs-internal/BEHAVIORS_CONSOLIDATION_PLAN.md §3d.
 */

import { focusTrapSchema } from '../schemas/focustrap.schema';
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

// Re-export schema-derived values
export const focusTrapSource = focusTrapSchema.source;
export const focusTrapMetadata = focusTrapSchema;

/**
 * Define the FocusTrap behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerFocusTrap(host?: HyperscriptHost): Promise<void> {
  defineBehavior(focusTrapSchema, host);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerFocusTrap().catch(console.error);
}

export default {
  source: focusTrapSchema.source,
  metadata: focusTrapSchema,
  register: registerFocusTrap,
};
