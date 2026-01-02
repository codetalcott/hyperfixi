/**
 * HyperFixi Hybrid-HX Browser Bundle
 *
 * Extends hybrid-complete with htmx attribute compatibility (hx-*).
 * Supports both `_="..."` hyperscript syntax AND htmx-style attributes.
 *
 * Target: ~8-9 KB gzipped
 *
 * Usage:
 * ```html
 * <!-- htmx-style -->
 * <button hx-get="/api/data" hx-target="#result" hx-swap="innerHTML">
 *   Load Data
 * </button>
 *
 * <!-- hyperscript-style (also supported) -->
 * <button _="on click toggle .active">Toggle</button>
 * ```
 */

// Import everything from hybrid-complete (we'll re-export its functionality)
import hybridComplete from './browser-bundle-hybrid-complete.js';

// Import htmx compatibility layer
import { HtmxAttributeProcessor, type HtmxProcessorOptions } from '../htmx/htmx-attribute-processor.js';
import { translateToHyperscript, hasHtmxAttributes, type HtmxConfig } from '../htmx/htmx-translator.js';

// ============== HTMX COMPATIBILITY ==============

let htmxProcessor: HtmxAttributeProcessor | null = null;

interface HtmxCompatOptions extends HtmxProcessorOptions {
  /** Whether to also process _="..." attributes (default: true) */
  processHyperscript?: boolean;
}

/**
 * Enable htmx attribute compatibility
 * Call this to start processing hx-* attributes on the page
 */
function enableHtmxCompatibility(options: HtmxCompatOptions = {}): void {
  const { processHyperscript = true, ...htmxOptions } = options;

  // Create the processor
  htmxProcessor = new HtmxAttributeProcessor({
    processExisting: htmxOptions.processExisting ?? true,
    watchMutations: htmxOptions.watchMutations ?? true,
    debug: htmxOptions.debug ?? false,
    root: htmxOptions.root ?? document.body,
  });

  // Initialize with execute callback
  htmxProcessor.init(async (code: string, element: Element) => {
    // Use the hybrid-complete execute function
    await hybridComplete.execute(code, element);
  });

  // Also process standard hyperscript attributes if enabled
  if (processHyperscript) {
    hybridComplete.process();
  }

  if (options.debug) {
    console.log('[hyperfixi-hx] htmx compatibility enabled');
  }
}

/**
 * Disable htmx attribute processing
 */
function disableHtmxCompatibility(): void {
  if (htmxProcessor) {
    htmxProcessor.destroy();
    htmxProcessor = null;
  }
}

/**
 * Get the current htmx processor instance
 */
function getHtmxProcessor(): HtmxAttributeProcessor | null {
  return htmxProcessor;
}

/**
 * Manually translate htmx attributes to hyperscript
 * Useful for debugging or server-side rendering
 */
function translateHtmx(element: Element): string {
  const processor = new HtmxAttributeProcessor({ processExisting: false, watchMutations: false });
  return processor.manualProcess(element);
}

// ============== PUBLIC API ==============

const api = {
  // All hybrid-complete exports
  ...hybridComplete,

  // Override version
  version: '1.0.0-hybrid-hx',

  // htmx compatibility
  enableHtmxCompatibility,
  disableHtmxCompatibility,
  getHtmxProcessor,
  translateHtmx,
  hasHtmxAttributes,

  // Export types for TypeScript users
  HtmxAttributeProcessor,
  translateToHyperscript,

  // Feature flags
  features: {
    htmx: true,
    hyperscript: true,
  },

  // All supported htmx attributes
  htmxAttributes: [
    'hx-get', 'hx-post', 'hx-put', 'hx-patch', 'hx-delete',
    'hx-target', 'hx-swap', 'hx-trigger', 'hx-confirm',
    'hx-boost', 'hx-vals', 'hx-headers',
    'hx-push-url', 'hx-replace-url',
    'hx-on:*',
  ],
};

// ============== AUTO-INITIALIZATION ==============

if (typeof window !== 'undefined') {
  (window as any).hyperfixi = api;

  // Auto-enable htmx compatibility when DOM is ready
  const initHybridHx = () => {
    // Enable htmx processing by default
    enableHtmxCompatibility({
      processExisting: true,
      watchMutations: true,
      processHyperscript: true, // Also process _="..." attributes
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHybridHx);
  } else {
    initHybridHx();
  }
}

export default api;
export { enableHtmxCompatibility, disableHtmxCompatibility, translateHtmx, HtmxAttributeProcessor };
export type { HtmxConfig, HtmxCompatOptions, HtmxProcessorOptions };
