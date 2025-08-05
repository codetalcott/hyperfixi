/**
 * Browser Bundle for HyperFixi Compatibility Testing
 * Exports evalHyperScript for direct browser usage
 */

import { evalHyperScript, evalHyperScriptAsync, evalHyperScriptSmart } from './eval-hyperscript';
import { hyperscript } from '../api/hyperscript-api';
import { defaultAttributeProcessor } from '../dom/attribute-processor';
import { tailwindExtension } from '../extensions/tailwind';

// Export to global scope for browser testing
declare global {
  interface Window {
    hyperfixi: {
      evalHyperScript: typeof evalHyperScript;
      evalHyperScriptAsync: typeof evalHyperScriptAsync;
      evalHyperScriptSmart: typeof evalHyperScriptSmart;
      tailwindExtension: typeof tailwindExtension;
    };
  }
}

// Main browser API - matches _hyperscript signature
const hyperfixi = {
  evalHyperScript,
  evalHyperScriptAsync,
  evalHyperScriptSmart,
  
  // Convenience method that matches _hyperscript() function signature exactly
  evaluate: evalHyperScript,
  
  // Full hyperscript API for advanced usage
  compile: (code: string) => {
    console.log('🎯 BROWSER-BUNDLE: hyperfixi.compile() called', { code });
    const result = hyperscript.compile(code);
    console.log('🏁 BROWSER-BUNDLE: hyperscript.compile() returned', { result });
    return result;
  },
  execute: hyperscript.execute,
  run: hyperscript.run,
  createContext: hyperscript.createContext,
  createRuntime: hyperscript.createRuntime,
  
  // DOM processing for HTMX/manual compatibility
  processNode: async (element: Element | Document): Promise<void> => {
    if (element === document) {
      defaultAttributeProcessor.scanAndProcessAll();
    } else if (element instanceof HTMLElement) {
      defaultAttributeProcessor.processElement(element);
    }
    return Promise.resolve();
  },
  process: (element: Element | Document) => hyperfixi.processNode(element), // Alias
  
  // Extensions
  tailwindExtension,
  
  // Version info  
  version: '1.0.0-compatibility'
};

// Export to global for browser testing
if (typeof window !== 'undefined') {
  window.hyperfixi = hyperfixi;
  
  // Auto-initialize attribute processing for full _hyperscript compatibility
  // This allows _="on click put ..." syntax to work automatically
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      defaultAttributeProcessor.init();
    });
  } else {
    defaultAttributeProcessor.init();
  }
}

// Export as default for IIFE
export default hyperfixi;