/**
 * Type definitions for @hyperfixi/core browser global (window.hyperfixi)
 */

export interface HyperFixiCoreAPI {
  // ==================== API v2 (Recommended) ====================

  /**
   * Synchronously compile hyperscript code to AST.
   * Use this for English-only code that needs synchronous compilation.
   *
   * @example
   * ```typescript
   * const result = hyperfixi.compileSync('toggle .active');
   * if (result.ok) {
   *   console.log('Parser used:', result.meta.parser);
   *   await hyperfixi.execute(result.ast, element);
   * }
   * ```
   *
   * @since API v2
   */
  compileSync(source: string, options?: NewCompileOptions): CompileResult;

  /**
   * Asynchronously compile hyperscript code (handles all 13 languages).
   * Use this for multilingual support or when async compilation is acceptable.
   *
   * @example
   * ```typescript
   * // English
   * const result = await hyperfixi.compile('toggle .active');
   *
   * // Japanese
   * const result = await hyperfixi.compile('トグル .active', { language: 'ja' });
   * ```
   *
   * @since API v2
   */
  compile(source: string, options?: NewCompileOptions): Promise<CompileResult>;

  /**
   * Compile and execute hyperscript in one step.
   *
   * @example
   * ```typescript
   * // With context
   * const ctx = hyperfixi.createContext(element);
   * await hyperfixi.eval('toggle .active', ctx);
   *
   * // With element directly
   * await hyperfixi.eval('toggle .active', element);
   * ```
   *
   * @since API v2
   */
  eval(source: string, contextOrElement?: ExecutionContext | Element): Promise<any>;

  /**
   * Validate hyperscript syntax and return detailed errors.
   *
   * @example
   * ```typescript
   * const result = await hyperfixi.validate('toggle .active');
   * if (result.valid) {
   *   console.log('Valid syntax');
   * } else {
   *   result.errors?.forEach(err => {
   *     console.error(`Line ${err.line}: ${err.message}`);
   *   });
   * }
   * ```
   *
   * @since API v2
   */
  validate(source: string, options?: NewCompileOptions): Promise<ValidateResult>;

  /**
   * Create execution context (unified signature with optional parent).
   *
   * @example
   * ```typescript
   * // Basic context
   * const ctx = hyperfixi.createContext(element);
   *
   * // Child context
   * const child = hyperfixi.createContext(element, parentContext);
   * ```
   *
   * @since API v2
   */
  createContext(element?: Element | null, parent?: ExecutionContext): ExecutionContext;

  // ==================== API v1 (Deprecated) ====================

  /**
   * Execute hyperscript on an element
   */
  execute(source: string, element?: Element, context?: ExecutionOptions): Promise<void>;

  /**
   * @deprecated Use `eval()` instead
   * Run (compile and execute) hyperscript
   */
  run(source: string, element?: Element): Promise<void>;

  /**
   * @deprecated Use `eval()` instead
   * Alias for run()
   */
  evaluate(source: string, element?: Element): Promise<void>;

  /**
   * Parse hyperscript to AST
   */
  parse(source: string): ParseResult;

  /**
   * Process a DOM node for hyperscript attributes
   */
  processNode(node: Node): void;

  /**
   * Process entire document for hyperscript
   */
  process(root?: Document | Element): void;

  /**
   * @deprecated Use `createContext(element, parent)` instead
   * Create child execution context
   */
  createChildContext(parent: ExecutionContext, element?: Element): ExecutionContext;

  /**
   * @deprecated Use `validate()` instead
   * Validate hyperscript syntax
   */
  isValidHyperscript(source: string): boolean;

  /**
   * Get HyperFixi version
   */
  version: string;

  /**
   * Create runtime instance
   */
  createRuntime(options?: RuntimeOptions): Runtime;
}

export interface CompileOptions {
  strict?: boolean;
  includeSource?: boolean;
}

export interface CompilationResult {
  ast: ASTNode;
  errors: ParseError[];
  success: boolean;
}

export interface ParseResult {
  ast: ASTNode;
  tokens: Token[];
  errors: ParseError[];
}

export interface ParseError {
  message: string;
  position: number;
  line: number;
  column: number;
}

export interface Token {
  type: string;
  value: string;
  position: number;
  line: number;
  column: number;
}

export interface ASTNode {
  type: string;
  [key: string]: unknown;
}

export interface ExecutionOptions {
  globals?: Record<string, unknown>;
  locals?: Record<string, unknown>;
}

export interface ExecutionContext {
  me: Element | null;
  you?: Element | null;
  it?: unknown;
  result?: unknown;
  locals: Map<string, unknown>;
  globals: Map<string, unknown>;
  target?: Element | EventTarget | null;
  detail?: unknown;
}

export interface ContextOptions {
  element?: Element;
  globals?: Record<string, unknown>;
}

export interface RuntimeOptions {
  strict?: boolean;
  timeout?: number;
}

export interface Runtime {
  execute(ast: ASTNode, context: ExecutionContext): Promise<void>;
  processCommand(command: ASTNode, context: ExecutionContext): Promise<void>;
}

// ==================== API v2 Types ====================

/**
 * Result of compilation (API v2)
 */
export interface CompileResult {
  /** Whether compilation succeeded */
  ok: boolean;
  /** Compiled AST (only present if ok=true) */
  ast?: ASTNode;
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
