/**
 * Browser Bundle for HyperFixi Compatibility Testing
 * Exports evalHyperScript for direct browser usage
 */

import { evalHyperScript, evalHyperScriptAsync, evalHyperScriptSmart, type HyperScriptContext } from './eval-hyperscript.js';
import { hyperscript } from '../api/hyperscript-api.js';
import { defaultAttributeProcessor } from '../dom/attribute-processor.js';

// Export to global scope for browser testing
declare global {
  interface Window {
    hyperfixi: {
      evalHyperScript: typeof evalHyperScript;
      evalHyperScriptAsync: typeof evalHyperScriptAsync;
      evalHyperScriptSmart: typeof evalHyperScriptSmart;
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
  compile: hyperscript.compile,
  execute: hyperscript.execute,
  run: hyperscript.run,
  createContext: hyperscript.createContext,
  
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