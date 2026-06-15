/**
 * AutoDismiss Behavior
 *
 * Auto-removes elements after a configurable delay.
 * Supports pause-on-hover and fade effect using standard setTimeout/clearTimeout
 * (in its hyperscript `source`'s js() body).
 *
 * Compiled from its hyperscript `source` (the single source of truth shared with
 * the CDN resolver bundle and patterns-reference).
 */

import { autoDismissSchema } from '../schemas/autodismiss.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values
export const autoDismissSource = autoDismissSchema.source;
export const autoDismissMetadata = autoDismissSchema;

/**
 * Register the AutoDismiss behavior with LokaScript by compiling its
 * hyperscript source and executing the resulting behavior definition.
 */
export async function registerAutoDismiss(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(autoDismissSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile AutoDismiss behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
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
