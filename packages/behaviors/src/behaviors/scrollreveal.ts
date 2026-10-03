/**
 * ScrollReveal Behavior
 *
 * Adds a class or fires events when the element enters or exits the viewport.
 * Uses the IntersectionObserver web standard API (in its hyperscript `source`'s
 * `init`-block `js()` body).
 *
 * Defined from its hyperscript `source` — the single source of truth shared with
 * the browser bundle and patterns-reference. This collapses ScrollReveal onto
 * the one runtime path (no more imperative-installer fork between CDN and npm);
 * see docs-internal/BEHAVIORS_CONSOLIDATION_PLAN.md §3d.
 */

import { scrollRevealSchema } from '../schemas/scrollreveal.schema';
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

// Re-export schema-derived values
export const scrollRevealSource = scrollRevealSchema.source;
export const scrollRevealMetadata = scrollRevealSchema;

/**
 * Define the ScrollReveal behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerScrollReveal(host?: HyperscriptHost): Promise<void> {
  defineBehavior(scrollRevealSchema, host);
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
