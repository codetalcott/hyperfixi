/**
 * Type definitions for HyperFixi Core browser API
 */

/**
 * HyperFixi core API exposed on window.hyperfixi
 */
export interface HyperFixiCoreAPI {
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
   * Compile hyperscript code
   */
  compile(code: string, options?: CompileOptions): CompilationResult;

  /**
   * Compile multilingual hyperscript code
   */
  compileMultilingual(code: string, language: string, options?: CompileOptions): CompilationResult;

  /**
   * Execute hyperscript code
   */
  execute(code: string, element?: Element, options?: ExecuteOptions): Promise<any>;

  /**
   * Run hyperscript code (alias for execute)
   */
  run(code: string, element?: Element, options?: ExecuteOptions): Promise<any>;

  /**
   * Create execution context
   */
  createContext(options?: ContextOptions): any;

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
