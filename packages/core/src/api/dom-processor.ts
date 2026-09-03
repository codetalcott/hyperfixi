/**
 * DOM Processing Module
 * Handles attribute processing and event handler setup for hyperscript
 */

import type { ASTNode, ExecutionContext } from '../types/core';
import type { CompileResult, NewCompileOptions } from './hyperscript-api';
import type { Runtime } from '../runtime/runtime';
import { createContext } from '../core/context';
import { debug } from '../utils/debug';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_EVENT_TYPE = 'click';
const DEFAULT_LANGUAGE = 'en';

// =============================================================================
// Type for compile functions (to avoid circular dependency)
// =============================================================================

type CompileFunction = (code: string, options?: NewCompileOptions) => CompileResult;
type CompileAsyncFunction = (code: string, options?: NewCompileOptions) => Promise<CompileResult>;
type GetRuntimeFunction = () => Runtime;

// These will be injected from hyperscript-api.ts
let compileSyncFn: CompileFunction;
let compileAsyncFn: CompileAsyncFunction;
let getRuntimeFn: GetRuntimeFunction;

/**
 * Initialize the DOM processor with compile functions
 * Called from hyperscript-api.ts to avoid circular dependency
 */
export function initializeDOMProcessor(
  compileSync: CompileFunction,
  compileAsync: CompileAsyncFunction,
  getRuntime: GetRuntimeFunction
): void {
  compileSyncFn = compileSync;
  compileAsyncFn = compileAsync;
  getRuntimeFn = getRuntime;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Log compilation error with optional debug details
 */
function logCompileError(element: Element, code: string, result: CompileResult): void {
  debug.parse(`Failed to compile hyperscript on element:`, element);
  debug.parse(`Code: "${code}"`);

  if (result.errors?.length) {
    result.errors.forEach((error, i) => {
      debug.parse(`Error ${i + 1}: ${error.message} (line ${error.line}, col ${error.column})`);
    });
  }

  // Log detailed parse information for downstream diagnostic consumers.
  debug.parse('Compilation failed - error details:', {
    code,
    errors: result.errors,
    codeLines: code.split('\n'),
    element: element.tagName,
  });
}

/**
 * Detect language from element attributes or document.
 * Checks: data-lang, lang attribute, closest parent with lang, document lang.
 */
export function detectLanguage(element: Element): string {
  // Check data-lang attribute on element (explicit hyperscript language)
  const dataLang = element.getAttribute('data-lang');
  if (dataLang) return dataLang;

  // Check lang attribute (HTML standard) on element or closest parent
  const langAttr = element.closest('[lang]')?.getAttribute('lang');
  if (langAttr) return langAttr.split('-')[0]; // 'en-US' → 'en'

  // Check document language
  if (typeof document !== 'undefined') {
    const docLang = document.documentElement?.lang;
    if (docLang) return docLang.split('-')[0];
  }

  // Default to English
  return DEFAULT_LANGUAGE;
}

// =============================================================================
// AST Type Guards
// =============================================================================

/**
 * Execute hyperscript AST
 */
async function executeHyperscriptAST(ast: ASTNode, context: ExecutionContext): Promise<unknown> {
  try {
    return await getRuntimeFn().execute(ast, context);
  } catch (error) {
    debug.runtime('Error executing hyperscript AST:', error);
    throw error;
  }
}

/**
 * Create hyperscript execution context for an element
 */
export function createHyperscriptContext(element?: HTMLElement | null): ExecutionContext {
  return createContext(element);
}

/**
 * Async processing for multilingual hyperscript (uses direct AST path)
 */
async function processHyperscriptAttributeAsync(
  element: Element,
  hyperscriptCode: string,
  lang: string
): Promise<void> {
  try {
    debug.runtime('Processing multilingual hyperscript:', { code: hyperscriptCode, lang });

    // Use direct AST path
    const compileResult = await compileAsyncFn(hyperscriptCode, { language: lang });

    if (!compileResult.ok) {
      logCompileError(element, hyperscriptCode, compileResult);
      return;
    }

    if (!compileResult.ast) {
      debug.parse('No AST generated for hyperscript:', hyperscriptCode);
      return;
    }

    debug.runtime('Successfully compiled multilingual hyperscript:', {
      code: hyperscriptCode,
      lang,
      directPath: compileResult.meta.directPath,
      confidence: compileResult.meta.confidence,
    });

    // Create execution context for this element
    const context = createHyperscriptContext(element as HTMLElement);

    // Hand the AST to the runtime, whatever it is. An `eventHandler` AST
    // installs its listener there — synchronously, before the first await —
    // with the full event grammar (filters, `or` lists, `from`, modifiers,
    // cleanup tracking, `config.logAll`). This file used to carry its OWN
    // installer for the `on …` case and silently dropped all of that: a
    // filter fired on every event, an `or` list fired on its first name only,
    // `from <target>` never fired (measured 2026-09-03, dom-processor.test.ts).
    // Anything else executes immediately, as before.
    void executeHyperscriptAST(compileResult.ast, context);
  } catch (error) {
    debug.runtime('Error processing multilingual hyperscript:', error, 'on element:', element);
  }
}

/**
 * Synchronous processing for English hyperscript (traditional path)
 */
function processHyperscriptAttributeSync(element: Element, hyperscriptCode: string): void {
  try {
    debug.runtime('Processing hyperscript:', hyperscriptCode);

    // Compile the hyperscript code
    const compileResult = compileSyncFn(hyperscriptCode);

    if (!compileResult.ok) {
      logCompileError(element, hyperscriptCode, compileResult);
      return;
    }

    if (!compileResult.ast) {
      debug.parse('No AST generated for hyperscript:', hyperscriptCode);
      return;
    }

    debug.runtime('Successfully compiled hyperscript:', hyperscriptCode);
    debug.runtime('Generated AST:', compileResult.ast);

    // Create execution context for this element
    const context = createHyperscriptContext(element as HTMLElement);

    // Hand the AST to the runtime, whatever it is. An `eventHandler` AST
    // installs its listener there — synchronously, before the first await —
    // with the full event grammar (filters, `or` lists, `from`, modifiers,
    // cleanup tracking, `config.logAll`). This file used to carry its OWN
    // installer for the `on …` case and silently dropped all of that: a
    // filter fired on every event, an `or` list fired on its first name only,
    // `from <target>` never fired (measured 2026-09-03, dom-processor.test.ts).
    // Anything else executes immediately, as before.
    void executeHyperscriptAST(compileResult.ast, context);
  } catch (error) {
    debug.runtime('Error processing hyperscript attribute:', error, 'on element:', element);
  }
}

/**
 * Dispatch a lifecycle event on an element (upstream _hyperscript 0.9.90).
 * Cancelable events return false if a handler called preventDefault, letting
 * callers skip the associated work.
 */
function dispatchLifecycle(
  element: Element,
  name: string,
  cancelable: boolean,
  detail?: Record<string, unknown>
): boolean {
  const event = new CustomEvent(name, { bubbles: true, cancelable, detail });
  const delivered = element.dispatchEvent(event);
  // dispatchEvent returns false if cancelable and preventDefault() was called.
  return delivered;
}

/**
 * Process a single hyperscript attribute on an element
 */
export function processHyperscriptAttribute(element: Element, hyperscriptCode: string): void {
  // Upstream _hyperscript 0.9.90 lifecycle: `hyperscript:before:init` is
  // cancelable — if a listener calls preventDefault() we skip initialization.
  const allowed = dispatchLifecycle(element, 'hyperscript:before:init', true, {
    code: hyperscriptCode,
  });
  if (!allowed) return;

  // Detect language from element
  const lang = detectLanguage(element);

  // For non-English, use async multilingual path
  if (lang !== DEFAULT_LANGUAGE) {
    void processHyperscriptAttributeAsync(element, hyperscriptCode, lang).then(() => {
      markPowered(element);
      dispatchLifecycle(element, 'hyperscript:after:init', false, { code: hyperscriptCode });
    });
    return;
  }

  // For English, use synchronous path
  processHyperscriptAttributeSync(element, hyperscriptCode);
  markPowered(element);
  dispatchLifecycle(element, 'hyperscript:after:init', false, { code: hyperscriptCode });
}

/**
 * Mark an element as hyperscript-powered (upstream _hyperscript 0.9.90).
 * Used by morph engines (idiomorph, htmx 4) to identify elements that need
 * re-processing after a swap, and to avoid double-initialization.
 */
function markPowered(element: Element): void {
  if (!element.hasAttribute('data-hyperscript-powered')) {
    element.setAttribute('data-hyperscript-powered', '');
  }
}

/**
 * Process DOM elements to initialize hyperscript behaviors
 */
export function process(element: Element): void {
  try {
    // Process the element itself if it has hyperscript
    const hyperscriptAttr = element.getAttribute('_');
    if (hyperscriptAttr) {
      processHyperscriptAttribute(element, hyperscriptAttr);
    }

    // Process all child elements with hyperscript attributes
    const hyperscriptElements = element.querySelectorAll('[_]');
    hyperscriptElements.forEach(child => {
      const childHyperscriptAttr = child.getAttribute('_');
      if (childHyperscriptAttr) {
        processHyperscriptAttribute(child, childHyperscriptAttr);
      }
    });
  } catch (error) {
    debug.runtime('Error processing hyperscript node:', error);
  }
}
