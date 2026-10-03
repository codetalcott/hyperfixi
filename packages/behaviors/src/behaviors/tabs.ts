/**
 * Tabs Behavior
 *
 * WAI-ARIA compliant tabs with roving tabindex keyboard navigation.
 * Auto-wires role, aria-selected, aria-controls, and aria-labelledby. The ARIA
 * wiring / keyboard-navigation logic lives in the schema's hyperscript `source`
 * (an `init`-block `js()` body).
 *
 * Defined from its hyperscript `source` — the single source of truth shared with
 * the browser bundle and patterns-reference. This collapses Tabs onto the one
 * runtime path (no more imperative-installer fork between CDN and npm);
 * see docs-internal/BEHAVIORS_CONSOLIDATION_PLAN.md §3d.
 */

import { tabsSchema } from '../schemas/tabs.schema';
import { defineBehavior, resolveRuntime } from '../schemas/types';
import type { HyperscriptHost } from '../schemas/types';

export const tabsSource = tabsSchema.source;
export const tabsMetadata = tabsSchema;

/**
 * Define the Tabs behavior on a hyperscript host (`window.hyperfixi` when none is given)
 * from its source, as a `<script type="text/hyperscript">` would.
 */
export async function registerTabs(host?: HyperscriptHost): Promise<void> {
  defineBehavior(tabsSchema, host);
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
