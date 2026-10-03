/**
 * Clipboard Behavior
 *
 * Copies text to clipboard on click with visual feedback.
 * Uses navigator.clipboard.writeText() with execCommand fallback (in its
 * hyperscript `source`'s js() body).
 *
 * Defined from its hyperscript `source` (the single source of truth shared with
 * the browser bundle and patterns-reference).
 */

import { clipboardSchema } from '../schemas/clipboard.schema';
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

// Re-export schema-derived values
export const clipboardSource = clipboardSchema.source;
export const clipboardMetadata = clipboardSchema;

/**
 * Define the Clipboard behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerClipboard(host?: HyperscriptHost): Promise<void> {
  defineBehavior(clipboardSchema, host);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerClipboard().catch(console.error);
}

export default {
  source: clipboardSchema.source,
  metadata: clipboardSchema,
  register: registerClipboard,
};
