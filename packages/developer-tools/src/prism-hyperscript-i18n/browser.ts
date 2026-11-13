/**
 * Browser bundle for prism-hyperfixi.
 *
 * Self-registers with Prism if available on window.
 * Also exports for manual registration.
 *
 * @example Auto-registration
 * ```html
 * <script src="prism.js"></script>
 * <script src="prism-hyperfixi/browser.js"></script>
 * <!-- Prism now supports hyperscript highlighting! -->
 * ```
 *
 * @example Manual registration
 * ```html
 * <script src="prism.js"></script>
 * <script type="module">
 * import { registerPrismHyperfixi } from './prism-hyperfixi/browser.js';
 * registerPrismHyperfixi(window.Prism, { language: 'auto' });
 * </script>
 * ```
 */

import { registerPrismHyperfixi } from './index';
import type { PrismLike } from './types';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    Prism?: PrismLike;
    PrismHyperfixi?: {
      register: typeof registerPrismHyperfixi;
      version: string;
    };
  }
}

// Version for debugging
const VERSION = '0.1.0';

// Auto-register if Prism is available
if (typeof window !== 'undefined' && window.Prism) {
  registerPrismHyperfixi(window.Prism, { language: 'auto' });

  // Expose API on window for manual re-registration or configuration
  window.PrismHyperfixi = {
    register: registerPrismHyperfixi,
    version: VERSION,
  };
}

// Export for manual usage
export { registerPrismHyperfixi };
export { highlightHyperscript, detectLanguage, getSupportedLanguages } from './index';
export type { PrismHyperfixiOptions, PrismLike } from './types';
