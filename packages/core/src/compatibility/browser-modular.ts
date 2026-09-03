/**
 * HyperFixi Modular Browser Bundle (ES Module)
 *
 * The ES-module entry point for modern browsers.
 *
 * Usage:
 *   <script type="module" src="hyperfixi.mjs"></script>
 *
 * The on-demand feature loader this bundle used to carry (`features.*`,
 * `loadRequiredFeatures`, `preloadFeatures`, …) was deleted with the six
 * `features/` families in the 4.0 cycle: the modules it imported registered
 * nothing on load, so every call was a no-op with a misleading name.
 *
 * For simple script tag usage, use hyperfixi.js (IIFE bundle) instead.
 */

import { evalHyperScript, evalHyperScriptAsync, evalHyperScriptSmart } from './eval-hyperscript';
import { hyperscript } from '../api/hyperscript-api';
import { defaultAttributeProcessor } from '../dom/attribute-processor';
import { Parser } from '../parser/parser';
import { Runtime } from '../runtime/runtime';
import { tokenize } from '../parser/tokenizer';
import { debug } from '../utils/debug';
import { styleBatcher, ObjectPool } from '../utils/performance';

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
    const result = hyperscript.compileSync(code);
    debug.parse('BROWSER-MODULAR: hyperscript.compileSync() returned', { result });

    if (!result.ok) {
      const errorMessage =
        result.errors && result.errors.length > 0 ? result.errors[0].message : 'Compilation failed';
      throw new Error(errorMessage);
    }

    return result;
  },
  execute: hyperscript.execute,
  run: async (code: string, context?: any) => {
    return hyperscript.eval(code, context);
  },
  createContext: hyperscript.createContext,
  createRuntime: hyperscript.createRuntime,

  // Parser and runtime classes
  Parser,
  Runtime,
  tokenize,

  // DOM processing
  processNode: async (element: Element | Document): Promise<void> => {
    if (element === document) {
      defaultAttributeProcessor.scanAndProcessAll();
    } else if (element instanceof HTMLElement) {
      defaultAttributeProcessor.processElement(element);
    }
  },
  process: (element: Element | Document) => hyperfixi.processNode(element),

  // Attribute processor
  attributeProcessor: defaultAttributeProcessor,

  // Performance utilities
  styleBatcher,
  ObjectPool,

  // Debug utilities
  debug,

  // Version info
  version: '1.0.0-modular',
};

// Export to global for browser usage
if (typeof window !== 'undefined') {
  // Use type assertions since this modular bundle exports a subset of the full
  // interface (the full Window augmentation lives in browser-bundle.ts, which
  // is excluded from the declaration build).
  (window as any).hyperfixi = hyperfixi;
  (window as any).evalHyperScript = evalHyperScript;
  (window as any).evalHyperScriptAsync = evalHyperScriptAsync;
  (window as any).evalHyperScriptSmart = evalHyperScriptSmart;

  // Auto-initialize: init() sets up the MutationObserver for dynamic elements
  // and dispatches hyperscript:ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      defaultAttributeProcessor.init();
    });
  } else {
    // DOM already loaded
    defaultAttributeProcessor.init();
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
  debug,
  styleBatcher,
  ObjectPool,
};

// Default export
export default hyperfixi;
