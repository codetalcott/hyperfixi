/**
 * LokaScript Hybrid-HX Browser Bundle
 *
 * Extends hybrid-complete with htmx (hx-*) and fixi (fx-*) attribute compatibility.
 * Supports:
 * - hyperscript syntax: `_="..."`
 * - htmx-style: `hx-get`, `hx-post`, `hx-target`, `hx-swap`, etc.
 * - fixi-style: `fx-action`, `fx-method`, `fx-target`, `fx-swap`, `fx-trigger`, `fx-ignore`
 *
 * Fixi-specific features:
 * - Request dropping (anti-double-submit) - new requests dropped while one is pending
 * - fx-ignore attribute - prevents processing on element and descendants
 * - Full fixi event lifecycle: fx:init, fx:config, fx:before, fx:after, fx:error, fx:finally, fx:swapped
 *
 * Target: ~9-10 KB gzipped
 *
 * Usage:
 * ```html
 * <!-- htmx-style -->
 * <button hx-get="/api/data" hx-target="#result" hx-swap="innerHTML">
 *   Load Data
 * </button>
 *
 * <!-- fixi-style -->
 * <button fx-action="/api/data" fx-target="#result" fx-swap="innerHTML">
 *   Load Data
 * </button>
 *
 * <!-- hyperscript-style (also supported) -->
 * <button _="on click toggle .active">Toggle</button>
 * ```
 */

// Import everything from hybrid-complete (we'll re-export its functionality)
import hybridComplete from './browser-bundle-hybrid-complete.js';

// Import htmx/fixi compatibility layer
import {
  HtmxAttributeProcessor,
  FIXI_ATTRS,
  HTMX_ATTRS,
  type HtmxProcessorOptions,
  type FxInitEventDetail,
  type FxConfigEventDetail,
  type FxAfterEventDetail,
  type FxFinallyEventDetail,
} from '../htmx/htmx-attribute-processor.js';
import {
  translateToHyperscript,
  hasHtmxAttributes,
  hasFxAttributes,
  hasAnyAttributes,
  type HtmxConfig,
} from '../htmx/htmx-translator.js';

// ============== HTMX/FIXI COMPATIBILITY ==============

let htmxProcessor: HtmxAttributeProcessor | null = null;

interface HtmxCompatOptions extends HtmxProcessorOptions {
  /** Whether to also process _="..." attributes (default: true) */
  processHyperscript?: boolean;
}

/**
 * Enable htmx/fixi attribute compatibility
 * Call this to start processing hx-* and fx-* attributes on the page
 *
 * Fixi-specific options:
 * - requestDropping: Enable request dropping (default: true)
 * - fixiEvents: Dispatch fixi-compatible events (default: true)
 */
function enableHtmxCompatibility(options: HtmxCompatOptions = {}): void {
  const { processHyperscript = true, ...htmxOptions } = options;

  // Create the processor with fixi support
  htmxProcessor = new HtmxAttributeProcessor({
    processExisting: htmxOptions.processExisting ?? true,
    watchMutations: htmxOptions.watchMutations ?? true,
    debug: htmxOptions.debug ?? false,
    root: htmxOptions.root ?? document.body,
    requestDropping: htmxOptions.requestDropping ?? true,
    fixiEvents: htmxOptions.fixiEvents ?? true,
  });

  // Initialize with execute callback
  htmxProcessor.init(async (code: string, element: Element) => {
    // Use the hybrid-complete execute function
    await hybridComplete.execute(code, element);
  });

  // Note: Don't call hybridComplete.process() here - hybrid-complete
  // auto-initializes on DOMContentLoaded, so calling process() again
  // would double-process elements and break event handlers

  if (options.debug) {
    console.log('[hyperfixi-hx] htmx/fixi compatibility enabled');
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

  // htmx/fixi compatibility
  enableHtmxCompatibility,
  disableHtmxCompatibility,
  getHtmxProcessor,
  translateHtmx,
  hasHtmxAttributes,
  hasFxAttributes,
  hasAnyAttributes,

  // Export types for TypeScript users
  HtmxAttributeProcessor,
  translateToHyperscript,

  // Feature flags
  features: {
    htmx: true,
    fixi: true,
    hyperscript: true,
  },

  // All supported htmx attributes
  htmxAttributes: HTMX_ATTRS,

  // All supported fixi attributes
  fixiAttributes: FIXI_ATTRS,

  // Fixi-specific events (for documentation)
  fixiEvents: [
    'fx:init',
    'fx:inited',
    'fx:config',
    'fx:before',
    'fx:after',
    'fx:error',
    'fx:finally',
    'fx:swapped',
  ],
};

// ============== AUTO-INITIALIZATION ==============

if (typeof window !== 'undefined') {
  (window as any).hyperfixi = api;
  // Deprecated alias for v1.x compatibility (remove in v3.0.0)
  (window as any).lokascript = api;

  // Auto-enable htmx/fixi compatibility when DOM is ready
  const initHybridHx = () => {
    // Enable htmx/fixi processing by default
    enableHtmxCompatibility({
      processExisting: true,
      watchMutations: true,
      processHyperscript: true, // Also process _="..." attributes
      requestDropping: true, // Fixi-style request dropping
      fixiEvents: true, // Dispatch fixi-compatible events
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHybridHx);
  } else {
    initHybridHx();
  }
}

export default api;
export {
  enableHtmxCompatibility,
  disableHtmxCompatibility,
  translateHtmx,
  HtmxAttributeProcessor,
  hasFxAttributes,
  hasAnyAttributes,
  FIXI_ATTRS,
  HTMX_ATTRS,
};
export type {
  HtmxConfig,
  HtmxCompatOptions,
  HtmxProcessorOptions,
  FxInitEventDetail,
  FxConfigEventDetail,
  FxAfterEventDetail,
  FxFinallyEventDetail,
};
