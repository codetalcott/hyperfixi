/**
 * Clipboard Behavior
 *
 * Copies text to clipboard on click with visual feedback.
 * Uses navigator.clipboard.writeText() with execCommand fallback (in its
 * hyperscript `source`'s js() body).
 *
 * Compiled from its hyperscript `source` (the single source of truth shared with
 * the CDN resolver bundle and patterns-reference).
 */

import { clipboardSchema } from '../schemas/clipboard.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values
export const clipboardSource = clipboardSchema.source;
export const clipboardMetadata = clipboardSchema;

/**
 * Register the Clipboard behavior with LokaScript by compiling its
 * hyperscript source and executing the resulting behavior definition.
 */
export async function registerClipboard(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(clipboardSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile Clipboard behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
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
