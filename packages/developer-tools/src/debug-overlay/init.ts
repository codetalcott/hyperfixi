/**
 * Debug Overlay Auto-Init
 *
 * Import this module to add an interactive step-through debugger to any page:
 *
 *   <script type="module">
 *     import 'hyperfixi-debugger';
 *   </script>
 *
 * Or in a bundled project:
 *   import '@hyperfixi/developer-tools/debug-overlay';
 *
 * The debugger starts in "continue" mode (no pausing). Use the overlay's
 * pause button, set breakpoints in the browser console, or call:
 *   hyperscript.debug.pause()
 */

import { DebugOverlay } from './overlay';

/**
 * Initialize the debug overlay. Waits for the hyperscript API to be
 * available (it may be loaded asynchronously or after this script).
 */
function init(): void {
  // Look for the hyperscript API on common globals
  const api = findHyperscriptAPI();
  if (!api) {
    // Retry after DOM content loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      console.warn('[HyperFixi Debugger] hyperscript API not found. Load @hyperfixi/core first.');
    }
    return;
  }

  const controller = api.debug;
  const overlay = new DebugOverlay();

  // Enable the debug controller (registers hooks)
  controller.enable();

  // Attach the overlay to the controller and inject into page
  overlay.attach(controller);

  // Expose on the API for console access
  (api as any).debugOverlay = overlay;

  console.log(
    '%c[HyperFixi Debugger]%c Ready. Use F8/F10/F11 or the overlay panel to control execution.',
    'color: #89b4fa; font-weight: bold',
    'color: inherit'
  );
}

interface HyperscriptLikeAPI {
  debug: import('@hyperfixi/core').DebugController;
}

function findHyperscriptAPI(): HyperscriptLikeAPI | null {
  const g = globalThis as any;
  // Check common entry points
  if (g.hyperfixi?.debug) return g.hyperfixi;
  if (g.hyperscript?.debug) return g.hyperscript;
  if (g.lokascript?.debug) return g.lokascript;
  // Check _hyperscript compatibility shim
  if (g._hyperscript?.debug) return g._hyperscript;
  return null;
}

// Auto-init when this module is imported
init();

export { DebugOverlay } from './overlay';
export { ElementHighlighter } from './element-highlighter';
export { init };
