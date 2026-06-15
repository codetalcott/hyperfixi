/**
 * ScrollReveal Behavior
 *
 * Adds a class or fires events when the element enters or exits the viewport.
 * Uses the IntersectionObserver web standard API (in its hyperscript `source`'s
 * `init`-block `js()` body).
 *
 * Compiled from its hyperscript `source` — the single source of truth shared with
 * the CDN resolver bundle and patterns-reference. This collapses ScrollReveal onto
 * the one runtime path (no more imperative-installer fork between CDN and npm);
 * see docs-internal/BEHAVIORS_CONSOLIDATION_PLAN.md §3d.
 */

import { scrollRevealSchema } from '../schemas/scrollreveal.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values
export const scrollRevealSource = scrollRevealSchema.source;
export const scrollRevealMetadata = scrollRevealSchema;

/**
 * Register the ScrollReveal behavior with LokaScript by compiling its
 * hyperscript source and executing the resulting behavior definition.
 */
export async function registerScrollReveal(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(scrollRevealSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile ScrollReveal behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerScrollReveal().catch(console.error);
}

export default {
  source: scrollRevealSchema.source,
  metadata: scrollRevealSchema,
  register: registerScrollReveal,
};
