/**
 * HyperFixi Modular Browser Bundle (ES Module)
 *
 * This is the optimized entry point for modern browsers using ES modules.
 * It provides automatic on-demand loading of optional features.
 *
 * Usage:
 *   <script type="module" src="hyperfixi.mjs"></script>
 *
 * Benefits over IIFE bundle:
 * - ~40KB gzipped initial load (vs ~80KB full bundle)
 * - WebSocket, SSE, and Worker features load only when used
 * - Native browser code splitting
 * - Better caching (features cached separately)
 *
 * Features loaded on demand:
 * - sockets: WebSocket connections (~5KB)
 * - eventsource: Server-Sent Events (~5KB)
 * - workers: Web Worker support (~5KB)
 *
 * For simple script tag usage, use hyperfixi.js (IIFE bundle) instead.
 */

import { evalHyperScript, evalHyperScriptAsync, evalHyperScriptSmart } from './eval-hyperscript';
import { hyperscript } from '../api/hyperscript-api';
import { defaultAttributeProcessor } from '../dom/attribute-processor';
import { tailwindExtension } from '../extensions/tailwind';
import { Parser } from '../parser/parser';
import { Runtime } from '../runtime/runtime';
import { tokenize } from '../parser/tokenizer';
import { debug } from '../utils/debug';
import { styleBatcher, ObjectPool } from '../utils/performance';
import {
  preloadDocumentFeatures,
  loadRequiredFeatures,
  detectFeatures,
  isFeatureLoaded,
  getLoadedFeatures,
  preloadFeatures,
} from './feature-loader';

// Note: Window.hyperfixi type is declared in browser-bundle.ts with full interface.
// This modular bundle exports a subset of that interface.

// Main browser API - matches _hyperscript signature
const hyperfixi = {
  // Core evaluation functions
  evalHyperScript,
  evalHyperScriptAsync,
  evalHyperScriptSmart,

  // Convenience method that matches _hyperscript() function signature
  evaluate: evalHyperScript,

  // Full hyperscript API
  compile: (code: string) => {
    debug.parse('BROWSER-MODULAR: hyperfixi.compile() called', { code });
    const result = hyperscript.compile(code);
    debug.parse('BROWSER-MODULAR: hyperscript.compile() returned', { result });

    if (!result.success) {
      const errorMessage =
        result.errors && result.errors.length > 0 ? result.errors[0].message : 'Compilation failed';
      throw new Error(errorMessage);
    }

    return result;
  },
  execute: hyperscript.execute,
  run: hyperscript.run,
  createContext: hyperscript.createContext,
  createRuntime: hyperscript.createRuntime,

  // Parser and runtime classes
  Parser,
  Runtime,
  tokenize,

  // DOM processing with automatic feature loading
  processNode: async (element: Element | Document): Promise<void> => {
    // Collect hyperscript from element/document
    const code: string[] = [];
    if (element === document) {
      document.querySelectorAll('[_]').forEach(el => {
        const attr = el.getAttribute('_');
        if (attr) code.push(attr);
      });
      document.querySelectorAll('script[type="text/hyperscript"]').forEach(script => {
        if (script.textContent) code.push(script.textContent);
      });
    } else if (element instanceof HTMLElement) {
      const attr = element.getAttribute('_');
      if (attr) code.push(attr);
    }

    // Load any required features before processing
    await loadRequiredFeatures(code);

    // Now process normally
    if (element === document) {
      defaultAttributeProcessor.scanAndProcessAll();
    } else if (element instanceof HTMLElement) {
      defaultAttributeProcessor.processElement(element);
    }
  },
  process: (element: Element | Document) => hyperfixi.processNode(element),

  // Attribute processor
  attributeProcessor: defaultAttributeProcessor,

  // Extensions
  tailwindExtension,

  // Performance utilities
  styleBatcher,
  ObjectPool,

  // Debug utilities
  debug,

  // Feature loading API (modular-specific)
  features: {
    preloadDocument: preloadDocumentFeatures,
    loadRequired: loadRequiredFeatures,
    detect: detectFeatures,
    isLoaded: isFeatureLoaded,
    getLoaded: getLoadedFeatures,
    preload: preloadFeatures,
  },

  // Version info
  version: '1.0.0-modular',
};

// Export to global for browser usage
if (typeof window !== 'undefined') {
  // Use type assertion since this modular bundle exports a subset of the full interface
  (window as any).hyperfixi = hyperfixi;
  window.evalHyperScript = evalHyperScript;
  window.evalHyperScriptAsync = evalHyperScriptAsync;
  window.evalHyperScriptSmart = evalHyperScriptSmart;

  // Auto-initialize: preload features then process document
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await preloadDocumentFeatures();
      defaultAttributeProcessor.scanAndProcessAll();
    });
  } else {
    // DOM already loaded
    preloadDocumentFeatures().then(() => {
      defaultAttributeProcessor.scanAndProcessAll();
    });
  }
}

// Named exports for ES module consumers
export {
  evalHyperScript,
  evalHyperScriptAsync,
  evalHyperScriptSmart,
  hyperscript,
  Parser,
  Runtime,
  tokenize,
  defaultAttributeProcessor,
  tailwindExtension,
  debug,
  styleBatcher,
  ObjectPool,
  // Feature loading
  preloadDocumentFeatures,
  loadRequiredFeatures,
  detectFeatures,
  isFeatureLoaded,
  getLoadedFeatures,
  preloadFeatures,
};

// Default export
export default hyperfixi;
