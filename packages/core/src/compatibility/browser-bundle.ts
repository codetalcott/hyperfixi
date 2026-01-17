/**
 * HyperFixi Full Browser Bundle
 * Includes ALL commands and features (40+ commands)
 *
 * This is the complete bundle for maximum compatibility.
 * For smaller bundle sizes, consider:
 * - hyperfixi-browser-minimal.js (~50-60KB gzipped, 8 commands, core expressions)
 * - hyperfixi-browser-standard.js (~100-110KB gzipped, 20 commands, core+common expressions)
 *
 * Phase 2 optimization notes:
 * - When using createRuntime(), specify expressionPreload option:
 *   - 'core': Minimal expressions (~40KB)
 *   - 'common': Core + common expressions (~70KB)
 *   - 'all': All expressions (~100KB, default for full bundle)
 *
 * Estimated size: ~180-190KB gzipped (with Phase 2 optimizations)
 * Recommended for: Complex applications, full _hyperscript compatibility
 */

import { evalHyperScript, evalHyperScriptAsync, evalHyperScriptSmart } from './eval-hyperscript';
import { lokascript, hyperscript, config } from '../api/lokascript-api';
import type { RuntimeHooks } from '../types/hooks';
import { defaultAttributeProcessor } from '../dom/attribute-processor';
import { tailwindExtension } from '../extensions/tailwind';
import { Parser } from '../parser/parser';
import { Runtime } from '../runtime/runtime';
import { tokenize } from '../parser/tokenizer';
import { debug, debugControl } from '../utils/debug';
import { styleBatcher, ObjectPool } from '../utils/performance';
import {
  enableDebugEvents,
  disableDebugEvents,
  isDebugEnabled,
  getDebugStats,
  resetDebugStats,
  getEventHistory,
  replayEvents,
} from '../utils/debug-events';

// Semantic parsing API for multilingual support
import {
  createSemanticAnalyzer,
  parse as semanticParse,
  translate,
  render,
  toExplicit,
  fromExplicit,
} from '@hyperfixi/semantic';

// Import CompileResult type for browser bundle
import type { CompileResult } from '../api/hyperscript-api';

// HyperFixi Browser API Type
interface HyperFixiBrowserAPI {
  evalHyperScript: typeof evalHyperScript;
  evalHyperScriptAsync: typeof evalHyperScriptAsync;
  evalHyperScriptSmart: typeof evalHyperScriptSmart;
  tailwindExtension: typeof tailwindExtension;
  compile: (code: string) => CompileResult;
  compileMultilingual: (code: string, language: string) => Promise<CompileResult>;
  execute: typeof hyperscript.execute;
  run: (code: string, context?: any) => Promise<unknown>;
  createContext: typeof hyperscript.createContext;
  createRuntime: typeof hyperscript.createRuntime;
  processNode: (element: Element | Document) => Promise<void>;
  process: (element: Element | Document) => Promise<void>;
  Parser: typeof Parser;
  Runtime: typeof Runtime;
  tokenize: typeof tokenize;
  attributeProcessor: typeof defaultAttributeProcessor;
  debug: typeof debug;
  debugControl: typeof debugControl;
  styleBatcher: typeof styleBatcher;
  ObjectPool: typeof ObjectPool;
  // Semantic parsing API for multilingual support
  semantic: {
    createAnalyzer: typeof createSemanticAnalyzer;
    parse: typeof semanticParse;
    translate: typeof translate;
    render: typeof render;
    toExplicit: typeof toExplicit;
    fromExplicit: typeof fromExplicit;
    supportedLanguages: string[];
  };
  // Semantic debug API
  semanticDebug: {
    enable: typeof enableDebugEvents;
    disable: typeof disableDebugEvents;
    isEnabled: typeof isDebugEnabled;
    getStats: typeof getDebugStats;
    resetStats: typeof resetDebugStats;
    getEventHistory: typeof getEventHistory;
    replayEvents: typeof replayEvents;
  };
  // Global configuration
  config: typeof config;
  // Runtime hooks for analytics, logging, etc.
  registerHooks: (name: string, hooks: RuntimeHooks) => void;
  unregisterHooks: (name: string) => boolean;
  getRegisteredHooks: () => string[];
}

// Export to global scope for browser testing
declare global {
  interface Window {
    // Primary: lokascript (new name)
    lokascript: HyperFixiBrowserAPI;
    // Compatibility: hyperfixi (deprecated, use lokascript)
    hyperfixi: HyperFixiBrowserAPI;
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
    const result = hyperscript.compileSync(code);
    debug.parse('BROWSER-BUNDLE: hyperscript.compileSync() returned', { result });

    // For compatibility with _hyperscript, throw an error if compilation fails
    if (!result.ok) {
      const errorMessage =
        result.errors && result.errors.length > 0 ? result.errors[0].message : 'Compilation failed';
      throw new Error(errorMessage);
    }

    return result;
  },
  // Compatibility wrappers for deprecated v1 API
  compileMultilingual: async (code: string, language: string) => {
    return hyperscript.compile(code, { language });
  },
  execute: hyperscript.execute,
  run: async (code: string, context?: any) => {
    return hyperscript.eval(code, context);
  },
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

  // Performance utilities
  styleBatcher,
  ObjectPool,

  // Debug utilities
  debug,
  debugControl,

  // Semantic parsing API for multilingual support
  semantic: {
    createAnalyzer: createSemanticAnalyzer,
    parse: semanticParse,
    translate,
    render,
    toExplicit,
    fromExplicit,
    supportedLanguages: [
      'ar',
      'bn',
      'de',
      'en',
      'es',
      'fr',
      'hi',
      'id',
      'it',
      'ja',
      'ko',
      'ms',
      'pl',
      'pt',
      'qu',
      'ru',
      'sw',
      'th',
      'tl',
      'tr',
      'uk',
      'vi',
      'zh',
    ],
  },

  // Semantic debug API for monitoring parsing decisions
  semanticDebug: {
    enable: enableDebugEvents,
    disable: disableDebugEvents,
    isEnabled: isDebugEnabled,
    getStats: getDebugStats,
    resetStats: resetDebugStats,
    getEventHistory,
    replayEvents,
  },

  // Global configuration for parsing behavior
  // Use: hyperfixi.config.semantic = false to disable semantic parsing
  config,

  // Runtime hooks for analytics, logging, debugging, etc.
  // Delegates to the default runtime instance
  registerHooks: hyperscript.registerHooks,
  unregisterHooks: hyperscript.unregisterHooks,
  getRegisteredHooks: hyperscript.getRegisteredHooks,

  // Version info
  version: '1.0.0-full',
};

// Export to global for browser testing
if (typeof window !== 'undefined') {
  // Note: Debug auto-enable via URL param is handled in debug-events.ts module load
  // This ensures it happens before attribute processing

  // Primary: lokascript (new name reflecting multilingual world/realm scope)
  window.lokascript = hyperfixi;
  // Compatibility: hyperfixi (deprecated, use lokascript)
  window.hyperfixi = hyperfixi;

  // Also expose functions as direct globals for test compatibility
  // This allows tests to use `evalHyperScript()` directly instead of `hyperfixi.evalHyperScript()`
  window.evalHyperScript = evalHyperScript;
  window.evalHyperScriptAsync = evalHyperScriptAsync;
  window.evalHyperScriptSmart = evalHyperScriptSmart;

  // Initialize attribute processor when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      defaultAttributeProcessor.init();
    });
  } else {
    // DOM already ready
    defaultAttributeProcessor.init();
  }
}

// Export as default for IIFE
export default hyperfixi;
