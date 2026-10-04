/**
 * @hyperfixi/intent-element
 *
 * Browser custom element that validates LSE protocol JSON and executes it on the
 * page's hyperscript host. Zero-dependency validation via @lokascript/intent;
 * execution renders the intent to English hyperscript (a LokaScriptSemantic bundle's
 * `render`) and hands it to the host's `evaluate` — @hyperfixi/engine's hyperfixi-hs.js,
 * or upstream _hyperscript.
 *
 * Auto-registers <lse-intent> when loaded as a browser script.
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
