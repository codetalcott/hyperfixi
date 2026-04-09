/**
 * @hyperfixi/intent-element
 *
 * Browser custom element that validates LSE protocol JSON and executes it
 * via the hyperfixi runtime. Zero-dependency validation via @lokascript/intent;
 * execution delegated to window.hyperfixi.evalLSENode (peer dep).
 *
 * Auto-registers <lse-intent> when loaded as a browser script.
 *
 * @example
 * ```html
 * <script src="hyperfixi.js"></script>
 * <script src="intent-element.iife.js"></script>
 *
 * <lse-intent>
 *   <script type="application/lse+json">
 *     {"action":"toggle","roles":{"patient":{"type":"selector","value":".active"}},"trigger":{"event":"click"}}
 *   </script>
 *   <button slot="trigger">Toggle sidebar</button>
 * </lse-intent>
 * ```
 */

export { LSEIntentElement } from './lse-intent.js';
export { intentRegistry } from './schema-registry.js';
export type { SandboxResult } from './sandbox.js';

// Auto-register the custom element when loaded in a browser context
if (typeof customElements !== 'undefined' && !customElements.get('lse-intent')) {
  // Dynamic import to avoid circular reference from the export above
  import('./lse-intent.js').then(({ LSEIntentElement }) => {
    customElements.define('lse-intent', LSEIntentElement);
  });
}
