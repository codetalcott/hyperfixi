/**
 * FocusTrap Behavior
 *
 * Confines Tab navigation inside an element, manages aria-modal,
 * and restores focus on deactivation. The Tab-trapping / focus-model logic
 * lives in the schema's hyperscript `source` (an `init`-block `js()` body).
 *
 * Compiled from its hyperscript `source` — the single source of truth shared with
 * the CDN resolver bundle and patterns-reference. This collapses FocusTrap onto
 * the one runtime path (no more imperative-installer fork between CDN and npm);
 * see docs-internal/BEHAVIORS_CONSOLIDATION_PLAN.md §3d.
 */

import { focusTrapSchema } from '../schemas/focustrap.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values
export const focusTrapSource = focusTrapSchema.source;
export const focusTrapMetadata = focusTrapSchema;

/**
 * Register the FocusTrap behavior with LokaScript by compiling its
 * hyperscript source and executing the resulting behavior definition.
 */
export async function registerFocusTrap(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(focusTrapSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile FocusTrap behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
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
