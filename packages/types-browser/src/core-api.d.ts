/**
 * Type definitions for @hyperfixi/core browser global (window.hyperfixi)
 */

export interface HyperFixiCoreAPI {
  /**
   * Compile hyperscript source code to AST
   */
  compile(source: string, options?: CompileOptions): CompilationResult;

  /**
   * Execute hyperscript on an element
   */
  execute(source: string, element?: Element, context?: ExecutionOptions): Promise<void>;

  /**
   * Run (compile and execute) hyperscript
   */
  run(source: string, element?: Element): Promise<void>;

  /**
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
   * Create execution context
   */
  createContext(element?: Element, options?: ContextOptions): ExecutionContext;

  /**
   * Create child execution context
   */
  createChildContext(parent: ExecutionContext, element?: Element): ExecutionContext;

  /**
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
