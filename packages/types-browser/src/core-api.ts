/**
 * Type definitions for HyperFixi Core browser API
 */

/**
 * HyperFixi core API exposed on window.hyperfixi
 */
export interface HyperFixiCoreAPI {
  // ==================== API v2 (Recommended) ====================

  /**
   * Synchronously compile hyperscript code to AST (API v2).
   * @since API v2
   */
  compileSync(code: string, options?: NewCompileOptions): CompileResult;

  /**
   * Asynchronously compile hyperscript code (handles all 13 languages) (API v2).
   * @since API v2
   */
  compile(code: string, options?: NewCompileOptions): Promise<CompileResult>;

  /**
   * Compile and execute hyperscript in one step (API v2).
   * @since API v2
   */
  eval(code: string, contextOrElement?: any): Promise<any>;

  /**
   * Validate hyperscript syntax and return detailed errors (API v2).
   * @since API v2
   */
  validate(code: string, options?: NewCompileOptions): Promise<ValidateResult>;

  /**
   * Create execution context with optional parent (unified signature, API v2).
   * @since API v2
   */
  createContext(element?: Element | null, parent?: any): any;

  // ==================== API v1 (Deprecated) ====================

  /**
   * Evaluate hyperscript string directly
   */
  evalHyperScript(code: string, element?: Element): any;

  /**
   * Async evaluation of hyperscript
   */
  evalHyperScriptAsync(code: string, element?: Element): Promise<any>;

  /**
   * Smart evaluation with automatic context detection
   */
  evalHyperScriptSmart(code: string): Promise<any>;

  /**
   * Compile multilingual hyperscript code
   * @deprecated Use compile() with options.language instead
   */
  compileMultilingual(code: string, language: string, options?: CompileOptions): CompilationResult;

  /**
   * Execute hyperscript code
   */
  execute(code: string, element?: Element, options?: ExecuteOptions): Promise<any>;

  /**
   * Run hyperscript code (alias for execute)
   * @deprecated Use eval() instead
   */
  run(code: string, element?: Element, options?: ExecuteOptions): Promise<any>;

  /**
   * Create child execution context
   * @deprecated Use createContext(element, parent) instead
   */
  createChildContext(parent: any, element?: Element): any;

  /**
   * Validate hyperscript syntax (returns boolean)
   * @deprecated Use validate() instead (returns detailed result)
   */
  isValidHyperscript(code: string): boolean;

  /**
   * Create runtime instance
   */
  createRuntime(options?: RuntimeOptions): any;

  /**
   * Process DOM node
   */
  processNode(node: Node): void;

  /**
   * Process DOM node (alias)
   */
  process(node: Node): void;

  /**
   * Tokenize hyperscript code
   */
  tokenize(code: string): any[];

  /**
   * Low-level parser access
   */
  Parser: any;

  /**
   * Low-level runtime access
   */
  Runtime: any;

  /**
   * Attribute processor
   */
  attributeProcessor: any;

  /**
   * Tailwind extension
   */
  tailwindExtension: any;

  /**
   * Debug utilities
   */
  debug: {
    enableDebugLogging(): void;
    disableDebugLogging(): void;
  };

  /**
   * Style batcher utility
   */
  styleBatcher: any;

  /**
   * Object pool utility
   */
  ObjectPool: any;

  /**
   * Semantic parsing utilities
   */
  semantic?: {
    parse(code: string, language: string): any;
    translate(code: string, fromLang: string, toLang: string): string | null;
    buildAST(node: any): any;
  };

  /**
   * Semantic debug utilities
   */
  semanticDebug?: any;

  /**
   * Version string
   */
  version: string;
}

export interface CompileOptions {
  language?: string;
  strict?: boolean;
  [key: string]: any;
}

export interface CompilationResult {
  success: boolean;
  code?: any;
  error?: Error;
  [key: string]: any;
}

export interface ExecuteOptions {
  context?: any;
  element?: Element;
  [key: string]: any;
}

export interface ContextOptions {
  element?: Element;
  globals?: Record<string, any>;
  [key: string]: any;
}

export interface RuntimeOptions {
  [key: string]: any;
}

export type EvalHyperScriptFunction = (code: string, element?: Element) => any;

export type EvalHyperScriptAsyncFunction = (code: string, element?: Element) => Promise<any>;

export type EvalHyperScriptSmartFunction = (code: string) => Promise<any>;

// ==================== API v2 Types ====================

/**
 * Compilation result (API v2)
 */
export interface CompileResult {
  /** Whether compilation succeeded */
  ok: boolean;
  /** Compiled AST (only present if ok=true) */
  ast?: any;
  /** Compilation errors (only present if ok=false) */
  errors?: CompileError[];
  /** Compilation metadata */
  meta: {
    /** Parser used: semantic or traditional */
    parser: 'semantic' | 'traditional';
    /** Confidence score (0-1) if semantic parser was used */
    confidence?: number;
    /** Language code */
    language: string;
    /** Compilation time in milliseconds */
    timeMs: number;
    /** Whether direct path was taken (no fallback) */
    directPath?: boolean;
  };
}

/**
 * Compilation error (API v2)
 */
export interface CompileError {
  /** Error message */
  message: string;
  /** Line number where error occurred */
  line: number;
  /** Column number where error occurred */
  column: number;
  /** Optional suggestion for fixing the error */
  suggestion?: string;
}

/**
 * Compilation options (API v2)
 */
export interface NewCompileOptions {
  /** Language code (default: 'en') */
  language?: string;
  /** Minimum confidence for semantic parsing (0-1, default: 0.5) */
  confidenceThreshold?: number;
  /** Force traditional parser, skip semantic analysis */
  traditional?: boolean;
}

/**
 * Validation result (API v2)
 */
export interface ValidateResult {
  /** Whether code is valid */
  valid: boolean;
  /** Validation errors (only present if valid=false) */
  errors?: CompileError[];
}
