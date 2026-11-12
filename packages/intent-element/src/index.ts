/**
 * @hyperfixi/intent-element
 *
 * `<lse-intent>`: runs LSE protocol JSON on the page's hyperscript host. The JSON
 * is validated, rendered to one English hyperscript script (a LokaScriptSemantic
 * bundle's `render`) and handed to the host's `evaluate` (@hyperfixi/engine's
 * hyperfixi-hs.js, or upstream _hyperscript). What it cannot run as written it
 * refuses, with an `lse:error` event.
 *
 * Importing this module defines `<lse-intent>`.
 *
 * @example
 * ```html
 * <script src="hyperfixi-hs.js"></script>
 * <script src="browser-en.en.global.js"></script>
 * <script src="intent-element.iife.global.js"></script>
 *
 * <lse-intent>
 *   <script type="application/lse+json">
 *     {"action":"toggle","roles":{"patient":{"type":"selector","value":".active"}},"trigger":{"event":"click"}}
 *   </script>
 *   <button>Toggle sidebar</button>
 * </lse-intent>
 * ```
 */

import { LSEIntentElement } from './lse-intent.js';

export { LSEIntentElement };
export { intentRegistry } from './schema-registry.js';
export { droppedValues, planIntent } from './plan.js';
export type { IntentPlan, IntentRefusal, IntentTrigger, PlanOptions } from './plan.js';

if (typeof customElements !== 'undefined' && !customElements.get('lse-intent')) {
  customElements.define('lse-intent', LSEIntentElement);
}
