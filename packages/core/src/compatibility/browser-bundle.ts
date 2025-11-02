/**
 * Browser Bundle for HyperFixi Compatibility Testing
 * Exports evalHyperScript for direct browser usage
 */

import { evalHyperScript, evalHyperScriptAsync, evalHyperScriptSmart } from './eval-hyperscript';
import { hyperscript } from '../api/hyperscript-api';
import { defaultAttributeProcessor } from '../dom/attribute-processor';
import { tailwindExtension } from '../extensions/tailwind';
import { Parser } from '../parser/parser';
import { Runtime } from '../runtime/runtime';
import { tokenize } from '../parser/tokenizer';
import { debug } from '../utils/debug';

// Export to global scope for browser testing
declare global {
  interface Window {
    hyperfixi: {
      evalHyperScript: typeof evalHyperScript;
      evalHyperScriptAsync: typeof evalHyperScriptAsync;
      evalHyperScriptSmart: typeof evalHyperScriptSmart;
      tailwindExtension: typeof tailwindExtension;
      compile: typeof hyperscript.compile;
      execute: typeof hyperscript.execute;
      run: typeof hyperscript.run;
      createContext: typeof hyperscript.createContext;
      createRuntime: typeof hyperscript.createRuntime;
      processNode: (element: Element | Document) => Promise<void>;
      process: (element: Element | Document) => Promise<void>;
      Parser: typeof Parser;
      Runtime: typeof Runtime;
      tokenize: typeof tokenize;
      attributeProcessor: typeof defaultAttributeProcessor;
    };
    // Also expose as direct globals for test compatibility
    evalHyperScript: typeof evalHyperScript;
    evalHyperScriptAsync: typeof evalHyperScriptAsync;
    evalHyperScriptSmart: typeof evalHyperScriptSmart;
  }
}

// Main browser API - matches _hyperscript signature
const hyperfixi = {
  // Core evaluation functions
  evalHyperScript,
  evalHyperScriptAsync,
  evalHyperScriptSmart,

  // Convenience method that matches _hyperscript() function signature exactly
  evaluate: evalHyperScript,

  // Full hyperscript API for advanced usage
  compile: (code: string) => {
    debug.parse('BROWSER-BUNDLE: hyperfixi.compile() called', { code });
    const result = hyperscript.compile(code);
    debug.parse('BROWSER-BUNDLE: hyperscript.compile() returned', { result });

    // For compatibility with _hyperscript, throw an error if compilation fails
    if (!result.success) {
      const errorMessage = result.errors && result.errors.length > 0
        ? result.errors[0].message
        : 'Compilation failed';
      throw new Error(errorMessage);
    }

    return result;
  },
  execute: hyperscript.execute,
  run: hyperscript.run,
  createContext: hyperscript.createContext,
  createRuntime: hyperscript.createRuntime,

  // Parser and runtime classes for advanced usage
  Parser,
  Runtime,
  tokenize,

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

  // Attribute processor for manual control
  attributeProcessor: defaultAttributeProcessor,

  // Extensions
  tailwindExtension,

  // Version info
  version: '1.0.0-compatibility'
};

// Export to global for browser testing
if (typeof window !== 'undefined') {
  window.hyperfixi = hyperfixi;

  // Also expose functions as direct globals for test compatibility
  // This allows tests to use `evalHyperScript()` directly instead of `hyperfixi.evalHyperScript()`
  window.evalHyperScript = evalHyperScript;
  window.evalHyperScriptAsync = evalHyperScriptAsync;
  window.evalHyperScriptSmart = evalHyperScriptSmart;

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