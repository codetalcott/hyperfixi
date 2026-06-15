/**
 * Tabs Behavior
 *
 * WAI-ARIA compliant tabs with roving tabindex keyboard navigation.
 * Auto-wires role, aria-selected, aria-controls, and aria-labelledby. The ARIA
 * wiring / keyboard-navigation logic lives in the schema's hyperscript `source`
 * (an `init`-block `js()` body).
 *
 * Compiled from its hyperscript `source` — the single source of truth shared with
 * the CDN resolver bundle and patterns-reference. This collapses Tabs onto the one
 * runtime path (no more imperative-installer fork between CDN and npm);
 * see docs-internal/BEHAVIORS_CONSOLIDATION_PLAN.md §3d.
 */

import { tabsSchema } from '../schemas/tabs.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

export const tabsSource = tabsSchema.source;
export const tabsMetadata = tabsSchema;

/**
 * Register the Tabs behavior with LokaScript by compiling its
 * hyperscript source and executing the resulting behavior definition.
 */
export async function registerTabs(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compileSync(tabsSchema.source, { traditional: true });

  if (!result.ok) {
    throw new Error(`Failed to compile Tabs behavior: ${JSON.stringify(result.errors)}`);
  }

  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerTabs().catch(console.error);
}

export default {
  source: tabsSchema.source,
  metadata: tabsSchema,
  register: registerTabs,
};
