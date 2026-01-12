/**
 * Main Hyperscript API
 * Provides a clean, type-safe public interface for hyperscript compilation and execution
 */

import { parse as parseToResult } from '../parser/parser';
import { tokenize } from '../parser/tokenizer';
import { Runtime, type RuntimeOptions } from '../runtime/runtime';
import { createContext, createChildContext } from '../core/context';
import type { ASTNode, ExecutionContext, ParseError } from '../types/base-types';
import type { RuntimeHooks } from '../types/hooks';
import type { SemanticAnalyzerInterface } from '../parser/types';
import { debug } from '../utils/debug';
import {
  createSemanticAnalyzer,
  DEFAULT_CONFIDENCE_THRESHOLD,
  type SemanticAnalyzer,
} from '@hyperfixi/semantic';
import { registerHistorySwap, registerBoosted } from '../behaviors';

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
async function getOrCreateBridge(): Promise<import('../multilingual/bridge').SemanticGrammarBridge> {
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
    language: config.language as 'en',
    semanticConfidenceThreshold: config.confidenceThreshold,
  };
}

// ============================================================================
// API Types
// ============================================================================

export interface CompilationResult {
  success: boolean;
  ast?: ASTNode;
  errors: ParseError[];
  tokens: import('../types/core').Token[];
  compilationTime: number;

  // Debug metadata (always included, minimal overhead <1%)
  metadata?: {
    parserUsed: 'semantic' | 'traditional' | 'expression-only';
    semanticConfidence?: number;  // 0-1, only if semantic attempted
    semanticLanguage?: string;     // e.g., 'en', 'ja'
    warnings?: string[];           // Non-fatal issues detected during compilation
  };
}

export interface CompileOptions {
  /** Disable semantic parsing (use traditional parser only). Useful for complex behaviors. */
  disableSemanticParsing?: boolean;
  /** Language code for multilingual input (e.g., 'en', 'ja', 'ar'). Defaults to 'en'. */
  language?: string;
}

/**
 * Extended compilation result with direct AST path metadata
 */
export interface MultilingualCompilationResult extends CompilationResult {
  /** Whether the direct AST path was used (bypassing English text generation) */
  usedDirectPath?: boolean;
  /** Confidence score from semantic parsing (0-1) */
  confidence?: number;
  /** Language used for parsing */
  language?: string;
}

export interface HyperscriptAPI {
  // Core compilation and execution
  compile(code: string, options?: CompileOptions): CompilationResult;
  compileMultilingual(code: string, options?: CompileOptions): Promise<MultilingualCompilationResult>;
  execute(ast: ASTNode, context?: ExecutionContext): Promise<unknown>;
  run(code: string, context?: ExecutionContext): Promise<unknown>;
  evaluate(code: string, context?: ExecutionContext): Promise<unknown>; // Alias for run

  // DOM processing (HTMX compatibility)
  processNode(element: Element): void;
  process(element: Element): void; // Alias for processNode

  // Context management
  createContext(element?: HTMLElement | null): ExecutionContext;
  createChildContext(parent: ExecutionContext, element?: HTMLElement | null): ExecutionContext;

  // Utilities
  isValidHyperscript(code: string): boolean;
  version: string;

  // Advanced
  createRuntime(options?: RuntimeOptions): Runtime;
  parse(code: string): ASTNode;

  // Runtime Hooks
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
      (globalThis as any)._hyperscript = (globalThis as any)._hyperscript || {};
      (globalThis as any)._hyperscript.runtime = _defaultRuntime;
      // Create a behaviors object with both Map-like has() and install() methods
      (globalThis as any)._hyperscript.behaviors = _defaultRuntime!.behaviorAPI;
    }
  }
  return _defaultRuntime;
}

// ============================================================================
// API Implementation
// ============================================================================

/**
 * Wrap main parser AST output in program-style format for API compatibility
 * Transforms: { type: 'command', name: 'log', ... }
 * Into: { type: 'program', features: [{ type: 'feature', keyword: 'command', body: [...] }] }
 */
function wrapAsProgramNode(node: ASTNode, source: string): ASTNode {
  // Determine the feature keyword based on node type
  let keyword: string;
  let body: ASTNode[];

  if (node.type === 'eventHandler') {
    keyword = 'on';
    // Extract commands from event handler
    body = (node as { commands?: ASTNode[] }).commands || [node];
  } else if (node.type === 'command') {
    keyword = 'command';
    body = [node];
  } else if (node.type === 'def' || node.type === 'function') {
    keyword = 'def';
    body = [node];
  } else if (node.type === 'init') {
    keyword = 'init';
    body = [node];
  } else if (node.type === 'behavior') {
    keyword = 'behavior';
    body = [node];
  } else {
    // Default: wrap as command feature
    keyword = 'command';
    body = [node];
  }

  const feature: ASTNode = {
    type: 'feature',
    keyword,
    body,
    children: body,
    source: '',
    start: node.start || 0,
    end: node.end || 0,
    line: node.line || 1,
    column: node.column || 1,
  };

  return {
    type: 'program',
    features: [feature],
    source,
    children: [feature],
    start: 0,
    end: source.length,
    line: 1,
    column: 1,
  } as ASTNode;
}

/**
 * Parse hyperscript code and return AST directly
 * Compatible with official _hyperscript.parse() API
 * Throws an error if parsing fails
 *
 * Uses semantic-first parsing with confidence-based fallback by default.
 */
function parse(code: string): ASTNode {
  if (typeof code !== 'string') {
    throw new TypeError('Code must be a string');
  }

  // Use main parser with semantic analysis enabled and wrap result in program-style format
  const result = parseToResult(code, getDefaultParserOptions());

  if (result.success && result.node) {
    return wrapAsProgramNode(result.node, code);
  }

  // Throw error with details if parsing failed
  const errorMsg = result.error?.message || 'Unknown parse error';
  const error = new Error(`Parse error: ${errorMsg}`);
  if (result.error) {
    (error as any).line = result.error.line;
    (error as any).column = result.error.column;
  }
  throw error;
}

/**
 * Compile hyperscript code into an Abstract Syntax Tree (AST)
 *
 * Uses semantic-first parsing with confidence-based fallback by default.
 * Pass { disableSemanticParsing: true } for complex behaviors that need traditional parsing.
 */
function compile(code: string, options?: CompileOptions): CompilationResult {
  debug.runtime('COMPILE: hyperscript-api compile() called', {
    code,
    codeLength: code.length,
    codeType: typeof code,
  });

  // Input validation
  if (typeof code !== 'string') {
    throw new TypeError('Code must be a string');
  }

  const startTime = performance.now();

  try {
    // Determine parser configuration
    const disableSemantic = options?.disableSemanticParsing ?? false;
    const parserOptions = disableSemantic ? {} : getDefaultParserOptions();
    const usesSemanticParser = !disableSemantic;

    debug.runtime('COMPILE: about to call parse()', { disableSemanticParsing: disableSemantic });
    const parseResult = parseToResult(code, parserOptions);
    debug.runtime('COMPILE: parse() returned', {
      success: parseResult.success,
      hasNode: !!parseResult.node,
      hasError: !!parseResult.error,
    });
    const compilationTime = performance.now() - startTime;

    // Create metadata about the compilation
    const metadata: CompilationResult['metadata'] = {
      parserUsed: usesSemanticParser ? 'semantic' : 'traditional',
      semanticLanguage: usesSemanticParser ? (options?.language || 'en') : undefined,
      warnings: [],
    };

    if (parseResult.success && parseResult.node) {
      return {
        success: true,
        ast: parseResult.node,
        errors: [],
        tokens: parseResult.tokens,
        compilationTime,
        metadata,
      };
    } else {
      return {
        success: false,
        errors: parseResult.error ? [parseResult.error] : [],
        tokens: parseResult.tokens,
        compilationTime,
        metadata,
      };
    }
  } catch (error) {
    const compilationTime = performance.now() - startTime;

    return {
      success: false,
      errors: [
        {
          name: 'CompilationError',
          message: error instanceof Error ? error.message : 'Unknown compilation error',
          line: 1,
          column: 1,
        },
      ],
      tokens: [],
      compilationTime,
      metadata: {
        parserUsed: 'traditional',
        warnings: [],
      },
    };
  }
}

/**
 * Compile hyperscript code using the direct AST path for non-English input.
 *
 * This uses the semantic parser's buildAST() to go directly from
 * SemanticNode to AST, bypassing English text generation and re-parsing.
 *
 * Flow: Input → Semantic Parser → AST Builder → AST
 * (vs traditional: Input → Semantic Parser → English → Core Parser → AST)
 *
 * Falls back to traditional compilation if:
 * - Language is 'en' (use traditional parser for best accuracy)
 * - Semantic parsing confidence is too low
 * - Direct AST building fails
 */
async function compileMultilingual(
  code: string,
  options?: CompileOptions
): Promise<MultilingualCompilationResult> {
  const lang = options?.language || 'en';
  const startTime = performance.now();

  debug.runtime('COMPILE_MULTILINGUAL: called', { code, lang });

  // For English or when semantic parsing is disabled, use traditional path
  if (lang === 'en' || options?.disableSemanticParsing) {
    const result = compile(code, options);
    return {
      ...result,
      usedDirectPath: false,
      language: lang,
    };
  }

  // Try direct AST path for non-English
  try {
    const bridge = await getOrCreateBridge();
    const astResult = await bridge.parseToASTWithDetails(code, lang);

    debug.runtime('COMPILE_MULTILINGUAL: bridge result', {
      usedDirectPath: astResult.usedDirectPath,
      confidence: astResult.confidence,
      hasAST: !!astResult.ast,
    });

    if (astResult.usedDirectPath && astResult.ast) {
      const compilationTime = performance.now() - startTime;
      return {
        success: true,
        ast: astResult.ast,
        errors: [],
        tokens: [], // Direct path doesn't produce tokens
        compilationTime,
        usedDirectPath: true,
        confidence: astResult.confidence,
        language: lang,
        metadata: {
          parserUsed: 'semantic',
          semanticConfidence: astResult.confidence,
          semanticLanguage: lang,
          warnings: [],
        },
      };
    }

    // Direct path failed, fall back to traditional
    debug.runtime('COMPILE_MULTILINGUAL: falling back to traditional path');
    const result = compile(code, options);
    return {
      ...result,
      usedDirectPath: false,
      confidence: astResult.confidence,
      language: lang,
      // metadata already set by compile()
    };
  } catch (error) {
    debug.runtime('COMPILE_MULTILINGUAL: error, falling back', { error });
    // Fall back to traditional compilation on any error
    const result = compile(code, options);
    return {
      ...result,
      usedDirectPath: false,
      language: lang,
      // metadata already set by compile()
    };
  }
}

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
 * Enhanced run/evaluate function that seamlessly handles all existing hyperscript code
 * Makes hyperscript.evaluate() equivalent to traditional _="" attribute processing
 */
async function run(code: string, context?: ExecutionContext): Promise<unknown> {
  // Input validation and normalization
  if (typeof code !== 'string' || code.trim().length === 0) {
    throw new Error('Code must be a non-empty string');
  }

  const normalizedCode = code.trim();

  // Create default context if none provided
  const executionContext = context || createContext();

  debug.runtime('HyperFixi Enhanced Evaluate:', {
    code: normalizedCode,
    hasContext: !!context,
    contextElement: executionContext.me?.tagName || 'none',
  });

  try {
    // Compile the hyperscript code
    const compiled = compile(normalizedCode);

    if (!compiled.success) {
      const errorMsg =
        compiled.errors.length > 0 ? compiled.errors[0].message : 'Unknown compilation error';
      throw new Error(`Compilation failed: ${errorMsg}`);
    }

    debug.runtime('Compilation successful:', {
      astType: compiled.ast?.type,
      tokenCount: compiled.tokens?.length || 0,
    });

    // Enhanced execution with pattern-specific handling
    const result = await executeWithCompatibility(compiled.ast!, executionContext, normalizedCode);

    debug.runtime('Execution completed:', { result: typeof result, value: result });
    return result;
  } catch (error) {
    console.error('❌ HyperFixi execution error:', error);
    throw error;
  }
}

/**
 * Enhanced execution that handles different hyperscript patterns seamlessly
 * This makes evaluate() work exactly like traditional _="" attribute processing
 */
async function executeWithCompatibility(
  ast: ASTNode,
  context: ExecutionContext,
  originalCode: string
): Promise<unknown> {
  // Pattern 1: Event handlers (on click, on submit, etc.)
  if (isEventHandlerPattern(originalCode)) {
    debug.runtime('Detected event handler pattern');
    return await handleEventHandlerPattern(ast, context, originalCode);
  }

  // Pattern 2: Direct commands (hide me, show #element, toggle .class, etc.)
  if (isDirectCommandPattern(originalCode)) {
    debug.runtime('Detected direct command pattern');
    return await getDefaultRuntime().execute(ast, context);
  }

  // Pattern 3: Expression evaluation (5 + 3, my.value, etc.)
  if (isExpressionPattern(originalCode)) {
    debug.runtime('Detected expression pattern');
    return await getDefaultRuntime().execute(ast, context);
  }

  // Pattern 4: Complex hyperscript (if/then, fetch, etc.)
  if (isComplexPattern(originalCode)) {
    debug.runtime('Detected complex hyperscript pattern');
    return await getDefaultRuntime().execute(ast, context);
  }

  // Default: Execute normally
  debug.runtime('Using default execution');
  return await getDefaultRuntime().execute(ast, context);
}

/**
 * Detect if code is an event handler pattern (starts with "on")
 */
function isEventHandlerPattern(code: string): boolean {
  return /^\s*on\s+\w+/.test(code);
}

/**
 * Detect if code is a direct command pattern
 */
function isDirectCommandPattern(code: string): boolean {
  const directCommands = [
    'hide',
    'show',
    'toggle',
    'add',
    'remove',
    'set',
    'put',
    'take',
    'make',
    'call',
    'send',
    'fetch',
    'wait',
    'go',
  ];

  const firstWord = code.trim().split(/\s+/)[0];
  return directCommands.includes(firstWord);
}

/**
 * Detect if code is a pure expression pattern
 */
function isExpressionPattern(code: string): boolean {
  // Simple heuristic: no commands, likely an expression
  const hasCommands =
    /\b(hide|show|toggle|add|remove|set|put|take|make|call|send|fetch|wait|go|on)\b/.test(code);
  return !hasCommands;
}

/**
 * Detect if code is a complex hyperscript pattern
 */
function isComplexPattern(code: string): boolean {
  return /\b(if|then|else|repeat|for|while|until|def|behavior)\b/.test(code);
}

/**
 * Enhanced event handler processing that seamlessly handles traditional patterns
 */
async function handleEventHandlerPattern(
  ast: ASTNode,
  context: ExecutionContext,
  _originalCode: string
): Promise<unknown> {
  try {
    // If context has an element, set up the event handler on it
    if (context.me && typeof context.me.addEventListener === 'function') {
      debug.event('Setting up event handler on element:', context.me);

      // Process the event handler AST to set up listeners
      await getDefaultRuntime().execute(ast, context);

      // Event handlers return undefined (they set up listeners)
      return undefined;
    }

    // If no element context, this might be a standalone evaluation
    // Execute normally and let the runtime handle it
    return await getDefaultRuntime().execute(ast, context);
  } catch (error) {
    console.error('Error in event handler setup:', error);
    throw error;
  }
}

/**
 * Check if the given code is valid hyperscript syntax
 */
function isValidHyperscript(code: string): boolean {
  try {
    const result = compile(code);
    return result.success;
  } catch {
    return false;
  }
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
  // In a real implementation, this would be injected during build
  return '0.1.0';
}

// ============================================================================
// Public API Object
// ============================================================================

/**
 * Process DOM elements to initialize hyperscript behaviors
 */
function processNode(element: Element): void {
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
    console.error('Error processing hyperscript node:', error);
  }
}

/**
 * Detect language from element attributes or document.
 * Checks: data-lang, lang attribute, closest parent with lang, document lang.
 */
function detectLanguage(element: Element): string {
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
  return 'en';
}

/**
 * Process a single hyperscript attribute on an element
 */
function processHyperscriptAttribute(element: Element, hyperscriptCode: string): void {
  // Detect language from element
  const lang = detectLanguage(element);

  // For non-English, use async multilingual path
  if (lang !== 'en') {
    void processHyperscriptAttributeAsync(element, hyperscriptCode, lang);
    return;
  }

  // For English, use synchronous path
  processHyperscriptAttributeSync(element, hyperscriptCode);
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
    const compileResult = await compileMultilingual(hyperscriptCode, { language: lang });

    if (!compileResult.success) {
      console.error(`❌ Failed to compile ${lang} hyperscript on element:`, element);
      console.error(`❌ Hyperscript code: "${hyperscriptCode}"`);
      console.error(`❌ Parse errors:`, compileResult.errors);
      return;
    }

    if (!compileResult.ast) {
      console.warn('⚠️ No AST generated for hyperscript:', hyperscriptCode);
      return;
    }

    debug.runtime('Successfully compiled multilingual hyperscript:', {
      code: hyperscriptCode,
      lang,
      usedDirectPath: compileResult.usedDirectPath,
      confidence: compileResult.confidence,
    });

    // Create execution context for this element
    const context = createHyperscriptContext(element as HTMLElement);

    // Check if this is an event handler (starts with "on ")
    if (hyperscriptCode.trim().startsWith('on ') || compileResult.ast.type === 'eventHandler') {
      debug.event('Setting up multilingual event handler:', { code: hyperscriptCode, lang });
      setupEventHandler(element, compileResult.ast, context);
    } else {
      debug.runtime('Executing immediate multilingual hyperscript:', hyperscriptCode);
      void executeHyperscriptAST(compileResult.ast, context);
    }
  } catch (error) {
    console.error('❌ Error processing multilingual hyperscript:', error, 'on element:', element);
  }
}

/**
 * Synchronous processing for English hyperscript (traditional path)
 */
function processHyperscriptAttributeSync(element: Element, hyperscriptCode: string): void {
  try {
    debug.runtime('Processing hyperscript:', hyperscriptCode);

    // Compile the hyperscript code
    const compileResult = compile(hyperscriptCode);

    if (!compileResult.success) {
      console.error(`❌ Failed to compile hyperscript on element:`, element);
      console.error(`❌ Hyperscript code: "${hyperscriptCode}"`);
      console.error(
        `❌ Parse errors (count: ${compileResult.errors.length}):`,
        compileResult.errors
      );

      // Enhanced error logging
      if (compileResult.errors.length === 0) {
        console.error(`❌ No specific error details available - compilation failed without errors`);
      } else {
        compileResult.errors.forEach((error, index) => {
          console.error(`❌ Error ${index + 1}:`);
          console.error(`   Message: ${error.message || 'No message'}`);
          console.error(
            `   Line: ${error.line || 'Unknown'}, Column: ${error.column || 'Unknown'}`
          );
          console.error(`   Name: ${error.name || 'Unknown'}`);
          console.error(`   Full error object:`, JSON.stringify(error, null, 2));
        });
      }

      // Try to identify the specific syntax issue
      const lines = hyperscriptCode.split('\n');
      lines.forEach((line, lineIndex) => {
        console.error(`❌ Line ${lineIndex + 1}: "${line.trim()}"`);
      });

      // Test tokenization of the failing code
      try {
        const tokens = tokenize(hyperscriptCode);
        console.error(
          `🔍 Tokens generated:`,
          tokens.map((t: any) => `${t.type}:"${t.value}"`).join(', ')
        );
        console.error(`🔍 Token count: ${tokens.length}`);
      } catch (tokenError) {
        console.error(`❌ Tokenization failed:`, tokenError);
      }

      // Also try to parse manually to get more details
      try {
        console.error(`🔧 Attempting manual parse for debugging...`);
        const parseResult = parseToResult(hyperscriptCode, getDefaultParserOptions());
        console.error(`🔧 Manual parse result:`, {
          success: parseResult.success,
          errorCount: parseResult.error ? 1 : 0,
          error: parseResult.error,
          nodeType: parseResult.node?.type || 'none',
        });
      } catch (manualError) {
        console.error(`❌ Manual parse also failed:`, manualError);
      }

      return;
    }

    if (!compileResult.ast) {
      console.warn('⚠️ No AST generated for hyperscript:', hyperscriptCode);
      return;
    }

    debug.runtime('Successfully compiled hyperscript:', hyperscriptCode);
    debug.runtime('Generated AST:', compileResult.ast);

    // Create execution context for this element
    const context = createHyperscriptContext(element as HTMLElement);

    // Check if this is an event handler (starts with "on ")
    if (hyperscriptCode.trim().startsWith('on ')) {
      debug.event('Setting up event handler for:', hyperscriptCode);
      debug.event('Element for event handler:', element);
      debug.event('AST for event handler:', compileResult.ast);

      try {
        debug.event('About to call setupEventHandler...');
        setupEventHandler(element, compileResult.ast, context);
        debug.event('setupEventHandler completed successfully');
      } catch (setupError) {
        console.error('❌ Error in setupEventHandler:', setupError);
        console.error(
          '❌ setupError stack:',
          setupError instanceof Error ? setupError.stack : 'No stack trace'
        );
        throw setupError; // Re-throw to see it in outer catch
      }
    } else {
      debug.runtime('Executing immediate hyperscript:', hyperscriptCode);
      // Execute immediately for non-event code
      void executeHyperscriptAST(compileResult.ast, context);
    }
  } catch (error) {
    console.error('❌ Error processing hyperscript attribute:', error, 'on element:', element);
  }
}

/**
 * Set up event handler for hyperscript "on" statements
 */
function setupEventHandler(element: Element, ast: ASTNode, context: ExecutionContext): void {
  try {
    debug.event('setupEventHandler called with:');
    debug.event('Element:', element);
    debug.event('AST:', ast);
    debug.event('Context:', context);

    // Parse the event from the AST (simplified - assumes "on eventName" structure)
    const eventInfo = extractEventInfo(ast);
    debug.event('extractEventInfo returned:', eventInfo);

    if (!eventInfo) {
      console.error('❌ Could not extract event information from AST:', ast);
      return;
    }

    // Add event listener
    const eventHandler = async (event: Event) => {
      debug.event(`Event handler triggered: ${eventInfo.eventType} on element:`, element);
      debug.event(`Event object:`, event);
      debug.event(`Event target:`, event.target);
      debug.event(`Current element:`, element);

      try {
        // Set event context
        context.locals.set('event', event);
        context.locals.set('target', event.target);

        debug.event('About to execute hyperscript AST:', eventInfo.body);
        debug.event('Context:', context);

        // Execute the event handler body
        const result = await executeHyperscriptAST(eventInfo.body, context);
        debug.event('Hyperscript AST execution completed, result:', result);
      } catch (error) {
        console.error('❌ Error executing hyperscript event handler:', error);
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('❌ Event info body:', eventInfo.body);
        console.error('❌ Context:', context);
      }
    };

    element.addEventListener(eventInfo.eventType, eventHandler);
    debug.event(`Event listener attached: ${eventInfo.eventType} on element:`, element);
    debug.event(`Event handler function:`, eventHandler);

    debug.event(`Set up ${eventInfo.eventType} event handler on element:`, element);
  } catch (error) {
    console.error('Error setting up event handler:', error);
  }
}

/**
 * Extract event information from AST
 */
function extractEventInfo(ast: ASTNode): { eventType: string; body: ASTNode } | null {
  try {
    debug.event('Extracting event info from AST:', ast);
    debug.event('AST type:', ast.type);
    debug.event('AST keys:', Object.keys(ast));
    debug.event('Full AST structure:', JSON.stringify(ast, null, 2));

    // Handle the actual HyperFixi AST structure
    if (ast.type === 'eventHandler') {
      const eventType = (ast as { event?: string }).event || 'click';
      const commands = (ast as { commands?: ASTNode[] }).commands;

      debug.event(`Found event handler: ${eventType} with ${commands?.length || 0} commands`);

      // Create a body node from the commands
      const body: ASTNode = {
        type: 'CommandSequence',
        commands: commands || [],
        start: ast.start || 0,
        end: ast.end || 0,
        line: ast.line || 1,
        column: ast.column || 1,
      };

      return { eventType, body };
    }

    // Handle legacy AST structures
    if (ast.type === 'FeatureNode' && (ast as { name?: string }).name === 'on') {
      const eventType = (ast as { args?: Array<{ value?: string }> }).args?.[0]?.value || 'click';
      const body = (ast as { body?: ASTNode }).body || ast;
      return { eventType, body };
    }

    // Handle direct command sequences
    if (ast.type === 'CommandSequence' || ast.type === 'Block') {
      return { eventType: 'click', body: ast }; // Default to click
    }

    console.warn('⚠️ Unknown AST structure for event extraction:', ast.type);
    return null;
  } catch (error) {
    console.error('❌ Error extracting event info:', error);
    return null;
  }
}

/**
 * Execute hyperscript AST
 */
async function executeHyperscriptAST(ast: ASTNode, context: ExecutionContext): Promise<unknown> {
  try {
    return await getDefaultRuntime().execute(ast, context);
  } catch (error) {
    console.error('Error executing hyperscript AST:', error);
    throw error;
  }
}

/**
 * Create hyperscript execution context for an element
 */
function createHyperscriptContext(element?: HTMLElement | null): ExecutionContext {
  return createContext(element);
}

/**
 * Alias for processNode for HTMX API compatibility
 */
function process(element: Element): void {
  return processNode(element);
}

export const hyperscript: HyperscriptAPI = {
  // Core compilation and execution
  compile,
  compileMultilingual,
  execute,
  run,
  evaluate: run, // Alias for run - compile and execute in one step

  // DOM processing (HTMX compatibility)
  processNode,
  process,

  // Context management
  createContext,
  createChildContext,

  // Utilities
  isValidHyperscript,
  version: getVersion(),

  // Advanced
  createRuntime: createRuntimeInstance,
  parse,

  // Runtime Hooks - delegate to default runtime
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
// Migration: import { hyperscript } from '@hyperfixi/core' instead of import hyperfixi from '@hyperfixi/core'
