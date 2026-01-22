/**
 * LokaScript Hyperscript API Implementation
 *
 * NAMING CLARIFICATION:
 * This file is named "hyperscript-api.ts" because it implements the hyperscript
 * language specification and maintains compatibility with the _hyperscript ecosystem.
 * However, this is NOT the original _hyperscript implementation from BigSky Software.
 *
 * This is LokaScript's own modular, typed implementation that extends hyperscript with:
 * - Multilingual support (23 languages with SOV/VSO/SVO grammar transformation)
 * - Semantic-first parsing with confidence scoring
 * - Type-safe API with modern TypeScript patterns
 * - Modular architecture with tree-shakeable bundles
 * - ~85% compatibility with official _hyperscript syntax
 *
 * The name "hyperscript" refers to the LANGUAGE being implemented, not the original
 * library. Think of it like "javascript-api.ts" for a JS engine - the name describes
 * what it parses/executes, not which implementation it is.
 *
 * For external facing APIs, we use "lokascript" (see lokascript-api.ts).
 * For internal implementation, we use "hyperscript" to denote the language spec.
 *
 * Provides a clean, type-safe public interface for hyperscript compilation and execution.
 */

import { parse as parseToResult } from '../parser/parser';
import { tokenize } from '../parser/tokenizer';
import { Runtime, type RuntimeOptions } from '../runtime/runtime';
import { createContext, createChildContext } from '../core/context';
import type { ASTNode, ExecutionContext, ParseError } from '../types/base-types';
import type { RuntimeHooks } from '../types/hooks';
import type { SemanticAnalyzerInterface } from '../parser/types';
import type { Token } from '../types/core';
import { debug } from '../utils/debug';
import {
  createSemanticAnalyzer,
  DEFAULT_CONFIDENCE_THRESHOLD,
  type SemanticAnalyzer,
} from '@lokascript/semantic';
import { registerHistorySwap, registerBoosted } from '../behaviors';
import {
  process as processDOMElements,
  processHyperscriptAttribute,
  setupEventHandler,
  createHyperscriptContext,
  extractEventInfo,
  detectLanguage,
  initializeDOMProcessor,
} from './dom-processor';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_EVENT_TYPE = 'click';
const DEFAULT_LANGUAGE = 'en';

// =============================================================================
// Type Augmentations
// =============================================================================

/**
 * Augment globalThis with hyperscript runtime
 */
declare global {
  interface Window {
    _hyperscript?: {
      runtime?: Runtime;
      behaviors?: Runtime['behaviorAPI'];
    };
  }
}

// Singleton semantic analyzer instance (lazy-initialized)
let semanticAnalyzerInstance: SemanticAnalyzer | null = null;

// Singleton bridge instance for direct AST path (lazy-initialized)
let bridgeInstance: import('../multilingual/bridge').SemanticGrammarBridge | null = null;

// =============================================================================
// Global Configuration
// =============================================================================

/**
 * Global configuration for hyperscript parsing and execution.
 */
export interface HyperscriptConfig {
  /**
   * Enable/disable semantic parsing globally.
   * When false, uses traditional keyword-based parsing only.
   * Default: true (semantic parsing enabled)
   */
  semantic: boolean;

  /**
   * Default language for semantic parsing.
   * Default: 'en'
   */
  language: string;

  /**
   * Confidence threshold for semantic parsing (0-1).
   * Lower values accept more flexible syntax.
   * Default: 0.5
   */
  confidenceThreshold: number;
}

/**
 * Global configuration instance.
 * Modify this to change default parsing behavior.
 *
 * @example
 * ```javascript
 * // Disable semantic parsing globally (use traditional parser only)
 * hyperfixi.config.semantic = false;
 *
 * // Set default language
 * hyperfixi.config.language = 'ja';
 * ```
 */
export const config: HyperscriptConfig = {
  semantic: true,
  language: 'en',
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
};

/**
 * Get or create the singleton bridge instance for direct AST path.
 * Lazy initialization to avoid overhead if not used.
 */
async function getOrCreateBridge(): Promise<
  import('../multilingual/bridge').SemanticGrammarBridge
> {
  if (!bridgeInstance) {
    const { SemanticGrammarBridge } = await import('../multilingual/bridge');
    bridgeInstance = new SemanticGrammarBridge();
    await bridgeInstance.initialize();
  }
  return bridgeInstance;
}

/**
 * Get or create the singleton semantic analyzer instance.
 * Lazy initialization to avoid overhead if not used.
 */
function getSemanticAnalyzer(): SemanticAnalyzerInterface {
  if (!semanticAnalyzerInstance) {
    semanticAnalyzerInstance = createSemanticAnalyzer();
  }
  // Type cast required: SemanticAnalyzer from @lokascript/semantic has compatible
  // interface but different internal types (ActionType vs string, SemanticValue vs object)
  // This is safe because the parser only uses the public interface methods
  return semanticAnalyzerInstance as unknown as SemanticAnalyzerInterface;
}

/**
 * Default parser options based on global config.
 * Returns semantic analyzer only if config.semantic is true.
 */
function getDefaultParserOptions() {
  if (!config.semantic) {
    // Traditional parsing only - no semantic analyzer
    return {};
  }

  return {
    semanticAnalyzer: getSemanticAnalyzer(),
    language: config.language,
    semanticConfidenceThreshold: config.confidenceThreshold,
  };
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Compilation error with location and optional suggestion
 */
export interface CompileError {
  message: string;
  line: number;
  column: number;
  /** Suggestion for fixing the error */
  suggestion?: string;
}

/**
 * Options for compile() and compileSync()
 */
export interface NewCompileOptions {
  /** Language code (default: 'en'). Auto-detected from element if using process() */
  language?: string;

  /** Confidence threshold for semantic parsing (0-1, default: 0.5) */
  confidenceThreshold?: number;

  /** Force traditional parser (skip semantic analysis) */
  traditional?: boolean;
}

/**
 * Result of compilation - new cleaner API
 */
export interface CompileResult {
  /** Whether compilation succeeded */
  ok: boolean;

  /** Compiled AST (present if ok=true) */
  ast?: ASTNode;

  /** Compilation errors (present if ok=false) */
  errors?: CompileError[];

  /** Metadata about the compilation */
  meta: {
    /** Which parser was used */
    parser: 'semantic' | 'traditional';
    /** Confidence score if semantic parser was used */
    confidence?: number;
    /** Language detected/used */
    language: string;
    /** Compilation time in ms */
    timeMs: number;
    /** Whether the direct AST path was used (multilingual) */
    directPath?: boolean;
  };
}

/**
 * Result of validate()
 */
export interface ValidateResult {
  valid: boolean;
  errors?: CompileError[];
}

export interface HyperscriptAPI {
  // ─────────────────────────────────────────────────────────────
  // NEW API (v2)
  // ─────────────────────────────────────────────────────────────

  /**
   * Compile hyperscript code to AST (async, handles all languages).
   * This is the recommended compilation method.
   */
  compile(code: string, options?: NewCompileOptions): Promise<CompileResult>;

  /**
   * Compile hyperscript code to AST (sync, English only).
   * Use compile() unless you specifically need synchronous behavior.
   */
  compileSync(code: string, options?: NewCompileOptions): CompileResult;

  /**
   * Execute a compiled AST.
   */
  execute(ast: ASTNode, context?: ExecutionContext): Promise<unknown>;

  /**
   * Compile and execute in one step.
   * Convenience method equivalent to: compile() then execute()
   */
  eval(
    code: string,
    context?: ExecutionContext | Element,
    options?: NewCompileOptions
  ): Promise<unknown>;

  /**
   * Validate hyperscript syntax without executing.
   */
  validate(code: string, options?: NewCompileOptions): Promise<ValidateResult>;

  // ─────────────────────────────────────────────────────────────
  // DOM PROCESSING
  // ─────────────────────────────────────────────────────────────

  /**
   * Process element and descendants for hyperscript attributes.
   * Automatically detects language from element/document.
   */
  process(element: Element): void;

  // ─────────────────────────────────────────────────────────────
  // CONTEXT
  // ─────────────────────────────────────────────────────────────

  /**
   * Create an execution context.
   * @param element - Element to bind as 'me'
   * @param parent - Optional parent context for scope inheritance
   */
  createContext(element?: HTMLElement | null, parent?: ExecutionContext): ExecutionContext;

  // ─────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────

  /** Version string */
  version: string;

  /** Global configuration */
  config: HyperscriptConfig;

  // ─────────────────────────────────────────────────────────────
  // ADVANCED
  // ─────────────────────────────────────────────────────────────

  /** Create a custom runtime instance */
  createRuntime(options?: RuntimeOptions): Runtime;

  /** Runtime Hooks */
  registerHooks(name: string, hooks: RuntimeHooks): void;
  unregisterHooks(name: string): boolean;
  getRegisteredHooks(): string[];
}

// ============================================================================
// Internal Runtime Instance (Lazy Initialization)
// ============================================================================

// Lazy initialization to avoid loading all 43 commands at import time
// Runtime is only created when first API call is made
let _defaultRuntime: Runtime | null = null;

/**
 * Get the default runtime instance, creating it lazily if needed
 * This defers command registration until actual usage
 */
function getDefaultRuntime(): Runtime {
  if (!_defaultRuntime) {
    // Browser runtime uses eager loading for maximum compatibility
    // Lazy loading causes race conditions since preloading is async but constructor is sync
    _defaultRuntime = new Runtime({
      lazyLoad: false, // Eager load all expressions synchronously
    });

    // Register built-in behaviors (HistorySwap, Boosted)
    registerHistorySwap(_defaultRuntime.behaviorRegistry);
    registerBoosted(_defaultRuntime.behaviorRegistry);

    // Expose default runtime globally for behavior registration/lookup
    // This allows behaviors defined in <script type="text/hyperscript"> to be found by install command
    if (typeof globalThis !== 'undefined') {
      const globalWithHyperscript = globalThis as typeof globalThis & {
        _hyperscript?: { runtime?: Runtime; behaviors?: Runtime['behaviorAPI'] };
      };
      globalWithHyperscript._hyperscript = globalWithHyperscript._hyperscript || {};
      globalWithHyperscript._hyperscript.runtime = _defaultRuntime;
      // Create a behaviors object with both Map-like has() and install() methods
      globalWithHyperscript._hyperscript.behaviors = _defaultRuntime!.behaviorAPI;
    }
  }
  return _defaultRuntime;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if value is an ExecutionContext
 */
function isExecutionContext(value: unknown): value is ExecutionContext {
  return (
    typeof value === 'object' && value !== null && 'locals' in value && value.locals instanceof Map
  );
}

/**
 * Type guard to check if value has a 'me' property (partial context)
 */
function hasMe(value: unknown): value is { me?: HTMLElement } {
  return typeof value === 'object' && value !== null && 'me' in value;
}

// ============================================================================
// API Implementation
// ============================================================================

/**
 * Execute a compiled AST with the given execution context
 */
async function execute(ast: ASTNode, context?: ExecutionContext): Promise<unknown> {
  if (!ast) {
    throw new Error('AST is required for execution');
  }

  const executionContext = context || createContext();
  return await getDefaultRuntime().execute(ast, executionContext);
}

/**
 * Create a new runtime instance with custom options
 */
function createRuntimeInstance(options?: RuntimeOptions): Runtime {
  return new Runtime(options);
}

/**
 * Get the current version of hyperfixi
 */
function getVersion(): string {
  // TODO: Inject during build via rollup replace plugin
  return '2.0.0';
}

// ============================================================================
// DOM Processing (Delegated to dom-processor.ts)
// ============================================================================

// DOM processing functions are now in dom-processor.ts to maintain separation
// between the API layer and DOM-specific code. The functions are imported at
// the top of this file and re-exported through the hyperscript API object.

// ============================================================================
// New API Implementation (v2)
// ============================================================================

/**
 * Convert ParseError to CompileError
 */
function toCompileError(error: ParseError): CompileError {
  return {
    message: error.message,
    line: error.line ?? 1,
    column: error.column ?? 1,
  };
}

/**
 * Synchronously compiles hyperscript code to an Abstract Syntax Tree (AST).
 *
 * This is the recommended method for English-only code that needs synchronous compilation.
 * For multilingual support or when async compilation is acceptable, use `compileAsync()`.
 *
 * @param code - The hyperscript code to compile
 * @param options - Compilation options
 * @param options.language - Language code (default: 'en')
 * @param options.confidenceThreshold - Min confidence for semantic parsing (0-1, default: 0.5)
 * @param options.traditional - Force traditional parser, skip semantic analysis
 *
 * @returns CompileResult with ok/errors/meta structure
 *
 * @example
 * ```typescript
 * const result = hyperscript.compileSync('toggle .active');
 * if (result.ok) {
 *   console.log('Parser used:', result.meta.parser);
 *   // Use result.ast
 * } else {
 *   console.error('Errors:', result.errors);
 * }
 * ```
 *
 * @since API v2
 */
function compileSync(code: string, options?: NewCompileOptions): CompileResult {
  if (typeof code !== 'string') {
    throw new TypeError('Code must be a string');
  }

  const startTime = performance.now();
  const lang = options?.language || DEFAULT_LANGUAGE;

  try {
    const disableSemantic = options?.traditional ?? false;
    const parserOptions = disableSemantic ? {} : getDefaultParserOptions();
    const usesSemanticParser = !disableSemantic;

    const parseResult = parseToResult(code, parserOptions);
    const timeMs = performance.now() - startTime;

    if (parseResult.success && parseResult.node) {
      return {
        ok: true,
        ast: parseResult.node,
        meta: {
          parser: usesSemanticParser ? 'semantic' : 'traditional',
          language: lang,
          timeMs,
        },
      };
    } else {
      return {
        ok: false,
        errors: parseResult.error ? [toCompileError(parseResult.error)] : [],
        meta: {
          parser: usesSemanticParser ? 'semantic' : 'traditional',
          language: lang,
          timeMs,
        },
      };
    }
  } catch (error) {
    const timeMs = performance.now() - startTime;
    return {
      ok: false,
      errors: [
        {
          message: error instanceof Error ? error.message : 'Unknown compilation error',
          line: 1,
          column: 1,
        },
      ],
      meta: {
        parser: 'traditional',
        language: lang,
        timeMs,
      },
    };
  }
}

/**
 * Asynchronously compiles hyperscript code to an Abstract Syntax Tree (AST).
 *
 * This method handles all languages and is the recommended compilation method for multilingual
 * code. For English-only code that requires synchronous compilation, use `compileSync()`.
 *
 * @param code - The hyperscript code to compile
 * @param options - Compilation options
 * @param options.language - Language code (e.g., 'en', 'ja', 'es'). Auto-detected if not specified
 * @param options.confidenceThreshold - Min confidence for semantic parsing (0-1, default: 0.5)
 * @param options.traditional - Force traditional parser, skip semantic analysis
 *
 * @returns Promise<CompileResult> with ok/errors/meta structure
 *
 * @example
 * ```typescript
 * // English code
 * const result = await hyperscript.compileAsync('toggle .active');
 *
 * // Japanese code
 * const result = await hyperscript.compileAsync('.active を 切り替え', {
 *   language: 'ja'
 * });
 *
 * if (result.ok) {
 *   console.log('Confidence:', result.meta.confidence);
 * }
 * ```
 *
 * @since API v2
 */
async function compileAsync(code: string, options?: NewCompileOptions): Promise<CompileResult> {
  if (typeof code !== 'string') {
    throw new TypeError('Code must be a string');
  }

  const lang = options?.language || DEFAULT_LANGUAGE;
  const startTime = performance.now();

  // For English or when traditional parsing is requested, use sync path
  if (lang === DEFAULT_LANGUAGE || options?.traditional) {
    return compileSync(code, options);
  }

  // For non-English, try direct AST path
  try {
    const bridge = await getOrCreateBridge();
    const astResult = await bridge.parseToASTWithDetails(code, lang);

    if (astResult.usedDirectPath && astResult.ast) {
      const timeMs = performance.now() - startTime;
      return {
        ok: true,
        ast: astResult.ast,
        meta: {
          parser: 'semantic',
          confidence: astResult.confidence,
          language: lang,
          timeMs,
          directPath: true,
        },
      };
    }

    // Direct path failed, fall back to traditional
    const fallbackCode = astResult.fallbackText || code;
    const result = compileSync(fallbackCode, { ...options, language: DEFAULT_LANGUAGE });
    return {
      ...result,
      meta: {
        ...result.meta,
        language: lang,
        confidence: astResult.confidence,
        directPath: false,
      },
    };
  } catch {
    // Fall back to sync compilation on any error
    return compileSync(code, { ...options, language: 'en' });
  }
}

// Initialize DOM processor with compile functions and runtime
initializeDOMProcessor(compileSync, compileAsync, getDefaultRuntime);

/**
 * Compiles and executes hyperscript code in a single call.
 *
 * This is the recommended method for most use cases where you want to run hyperscript code
 * immediately. Combines compilation and execution for convenience.
 *
 * @param code - The hyperscript code to compile and execute
 * @param context - Execution context or element. If an Element is provided, a context will be
 *                  created with that element as 'me'. If omitted, a basic context is created.
 * @param options - Compilation options
 * @param options.language - Language code (e.g., 'en', 'ja', 'es')
 * @param options.confidenceThreshold - Min confidence for semantic parsing (0-1)
 * @param options.traditional - Force traditional parser
 *
 * @returns Promise<unknown> - The result of execution
 *
 * @throws Error if compilation or execution fails
 *
 * @example
 * ```typescript
 * // Simple expression
 * const sum = await hyperscript.eval('5 + 3');
 *
 * // With element context
 * const button = document.getElementById('btn');
 * await hyperscript.eval('add .active to me', button);
 *
 * // With full context
 * const ctx = hyperscript.createContext(element);
 * await hyperscript.eval('toggle .visible', ctx);
 *
 * // Multilingual
 * await hyperscript.eval('.active を 切り替え', element, { language: 'ja' });
 * ```
 *
 * @since API v2
 */
async function evalCode(
  code: string,
  context?: ExecutionContext | Element,
  options?: NewCompileOptions
): Promise<unknown> {
  if (typeof code !== 'string' || code.trim().length === 0) {
    throw new Error('Code must be a non-empty string');
  }

  // Normalize context (handle Element passed directly)
  let executionContext: ExecutionContext;
  if (!context) {
    executionContext = createContext();
  } else if (context instanceof Element) {
    executionContext = createContext(context as HTMLElement);
  } else if (isExecutionContext(context)) {
    executionContext = context;
  } else {
    // Check if it's a partial context object with 'me' property
    // Using type assertion here is safe because we've ruled out Element and ExecutionContext
    const potentialPartialContext = context as unknown;
    if (hasMe(potentialPartialContext)) {
      executionContext = createContext(potentialPartialContext.me);
    } else {
      // Fallback: create empty context
      executionContext = createContext();
    }
  }

  const compiled = await compileAsync(code.trim(), options);

  if (!compiled.ok) {
    const errorMsg = compiled.errors?.[0]?.message || 'Unknown compilation error';
    throw new Error(`Compilation failed: ${errorMsg}`);
  }

  return execute(compiled.ast!, executionContext);
}

/**
 * Validates hyperscript syntax without executing the code.
 *
 * Use this method to check syntax before execution, or to provide validation feedback
 * in development tools and editors.
 *
 * @param code - The hyperscript code to validate
 * @param options - Validation options (same as compilation options)
 * @param options.language - Language code (e.g., 'en', 'ja', 'es')
 * @param options.confidenceThreshold - Min confidence for semantic parsing (0-1)
 * @param options.traditional - Force traditional parser
 *
 * @returns Promise<ValidateResult> with valid flag and optional errors
 *
 * @example
 * ```typescript
 * const result = await hyperscript.validate('toggle .active on me');
 * if (result.valid) {
 *   console.log('Syntax is valid');
 * } else {
 *   result.errors?.forEach(err => {
 *     console.error(`Line ${err.line}:${err.column}: ${err.message}`);
 *     if (err.suggestion) {
 *       console.log('Suggestion:', err.suggestion);
 *     }
 *   });
 * }
 * ```
 *
 * @since API v2
 */
async function validate(code: string, options?: NewCompileOptions): Promise<ValidateResult> {
  const result = await compileAsync(code, options);
  return {
    valid: result.ok,
    errors: result.errors,
  };
}

/**
 * Creates an execution context, optionally inheriting from a parent context.
 *
 * Child contexts inherit globals from their parent but maintain separate local variables.
 * This is useful for implementing nested scopes or component hierarchies.
 *
 * @param element - Element to bind as 'me' in the context (optional)
 * @param parent - Parent context to inherit from (optional)
 *
 * @returns ExecutionContext for executing hyperscript
 *
 * @example
 * ```typescript
 * // Basic context
 * const ctx = hyperscript.createContext(element);
 *
 * // Child context inheriting from parent
 * const parent = hyperscript.createContext();
 * parent.globals?.set('theme', 'dark');
 * parent.globals?.set('lang', 'en');
 *
 * const child = hyperscript.createContext(element, parent);
 * // child can access parent.globals but has separate locals
 * console.log(child.globals?.get('theme')); // 'dark'
 * ```
 *
 * @since API v2
 */
function createContextWithParent(
  element?: HTMLElement | null,
  parent?: ExecutionContext
): ExecutionContext {
  if (parent) {
    return createChildContext(parent, element);
  }
  return createContext(element);
}

// ============================================================================
// Public API Object
// ============================================================================

export const hyperscript: HyperscriptAPI = {
  // ─────────────────────────────────────────────────────────────
  // NEW API (v2)
  // ─────────────────────────────────────────────────────────────

  // Async compile (handles all languages)
  compile: compileAsync,

  // Sync compile (English-optimized)
  compileSync,

  // Execute compiled AST
  execute,

  // Compile and execute
  eval: evalCode,

  // Validate syntax
  validate,

  // Process DOM elements
  process: processDOMElements,

  // Create context (with optional parent)
  createContext: createContextWithParent,

  // Configuration
  config,
  version: getVersion(),

  // Advanced
  createRuntime: createRuntimeInstance,

  // Runtime Hooks
  registerHooks: (name: string, hooks: RuntimeHooks) => {
    getDefaultRuntime().registerHooks(name, hooks);
  },
  unregisterHooks: (name: string) => {
    return getDefaultRuntime().unregisterHooks(name);
  },
  getRegisteredHooks: () => {
    return getDefaultRuntime().getRegisteredHooks();
  },
};

// Export as _hyperscript for official _hyperscript API compatibility
export const _hyperscript = hyperscript;

// Note: Default export removed in favor of named exports for better tree-shaking
// Migration: import { hyperscript } from '@lokascript/core' instead of import hyperfixi from '@lokascript/core'
