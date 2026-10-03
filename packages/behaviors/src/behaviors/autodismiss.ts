/**
 * AutoDismiss Behavior
 *
 * Auto-removes elements after a configurable delay.
 * Supports pause-on-hover and fade effect using standard setTimeout/clearTimeout
 * (in its hyperscript `source`'s js() body).
 *
 * Defined from its hyperscript `source` (the single source of truth shared with
 * the browser bundle and patterns-reference).
 */

import { autoDismissSchema } from '../schemas/autodismiss.schema';
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

// Re-export schema-derived values
export const autoDismissSource = autoDismissSchema.source;
export const autoDismissMetadata = autoDismissSchema;

/**
 * Define the AutoDismiss behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerAutoDismiss(host?: HyperscriptHost): Promise<void> {
  defineBehavior(autoDismissSchema, host);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerAutoDismiss().catch(console.error);
}

export default {
  source: autoDismissSchema.source,
  metadata: autoDismissSchema,
  register: registerAutoDismiss,
};
