/**
 * AOT Compiler Type Definitions
 *
 * Core types for the Ahead-of-Time compiler infrastructure.
 */

// =============================================================================
// SOURCE EXTRACTION TYPES
// =============================================================================

/**
 * Source location in the original file.
 */
export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

/**
 * An extracted hyperscript snippet from source files.
 */
export interface ExtractedScript {
  /** The hyperscript code */
  code: string;

  /** Location in the source file */
  location: SourceLocation;

  /** Element ID if available */
  elementId?: string;

  /** CSS selector for binding if no ID */
  elementSelector?: string;

  /** Language code for semantic parsing (ISO 639-1) */
  language?: string;

  /** Attribute name where script was found (_, data-hs, etc.) */
  attributeName?: string;
}

// =============================================================================
// AST TYPES (Simplified for AOT)
// =============================================================================

/**
 * Base AST node interface.
 *
 * The index signature enables generic tree walking in optimization passes
 * (Object.keys + node[key]). Specific node interfaces extend this and add
 * typed fields. Use the discriminated union `ASTNode` for type-safe codegen.
 */
export interface BaseASTNode {
  type: string;
  [key: string]: unknown;
}

/**
 * Discriminated union of all AOT AST node types.
 *
 * Enables exhaustive `switch` narrowing in TypeScript — no `as unknown as`
 * casts needed in codegen. Mirrors the interchange format's `InterchangeNode`.
 */
export type ASTNode =
  | EventHandlerNode
  | CommandNode
  | LiteralNode
  | IdentifierNode
  | SelectorNode
  | VariableNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | MemberExpressionNode
  | PossessiveNode
  | CallExpressionNode
  | PositionalNode
  | ConditionalNode
  | ArrayExpressionNode
  | ObjectExpressionNode
  | TemplateNode
  | HtmlLiteralNode
  | IfNode
  | RepeatNode
  | ForEachNode
  | WhileNode
  | SequenceNode;

/**
 * Event handler node.
 */
export interface EventHandlerNode extends BaseASTNode {
  type: 'event';
  event: string;
  modifiers?: EventModifiers;
  body?: ASTNode[];
  target?: ASTNode;
}

/**
 * Command node.
 */
export interface CommandNode extends BaseASTNode {
  type: 'command';
  name: string;
  args?: ASTNode[];
  target?: ASTNode;
  modifiers?: Record<string, unknown>;
  /** Semantic roles from the semantic parser (patient, destination, source, etc.). */
  roles?: Readonly<Record<string, ASTNode>>;
}

/**
 * Expression node types.
 */
export interface LiteralNode extends BaseASTNode {
  type: 'literal';
  value: string | number | boolean | null;
}

export interface IdentifierNode extends BaseASTNode {
  type: 'identifier';
  value: string;
  name?: string;
}

export interface SelectorNode extends BaseASTNode {
  type: 'selector';
  value: string;
}

export interface VariableNode extends BaseASTNode {
  type: 'variable';
  name: string;
  scope: 'local' | 'global' | 'element';
}

export interface BinaryExpressionNode extends BaseASTNode {
  type: 'binary';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpressionNode extends BaseASTNode {
  type: 'unary';
  operator: string;
  operand: ASTNode;
}

export interface MemberExpressionNode extends BaseASTNode {
  type: 'member';
  object: ASTNode;
  property: string | ASTNode;
  computed?: boolean;
}

export interface PossessiveNode extends BaseASTNode {
  type: 'possessive';
  object: ASTNode;
  property: string;
}

export interface CallExpressionNode extends BaseASTNode {
  type: 'call';
  callee: ASTNode;
  args?: ASTNode[];
}

export interface PositionalNode extends BaseASTNode {
  type: 'positional';
  position: 'first' | 'last' | 'next' | 'previous' | 'closest' | 'parent' | 'random';
  target?: ASTNode;
}

export interface ConditionalNode extends BaseASTNode {
  type: 'conditional';
  condition: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface ArrayExpressionNode extends BaseASTNode {
  type: 'array';
  elements: ASTNode[];
}

export interface ObjectExpressionNode extends BaseASTNode {
  type: 'object';
  properties: Array<{ key: string | ASTNode; value: ASTNode }>;
}

export interface TemplateNode extends BaseASTNode {
  type: 'template';
  parts: Array<string | ASTNode>;
}

/**
 * HTML literal node (e.g. `<div.class#id/>`).
 */
export interface HtmlLiteralNode extends BaseASTNode {
  type: 'htmlLiteral';
  tag: string;
  classes?: string[];
  id?: string;
  attributes?: Record<string, string>;
}

/**
 * Sequence node (produced by loop unrolling optimization).
 */
export interface SequenceNode extends BaseASTNode {
  type: 'sequence';
  commands: ASTNode[];
  _unrolled?: boolean;
}

/**
 * Control flow nodes.
 */
export interface IfNode extends BaseASTNode {
  type: 'if';
  condition: ASTNode;
  thenBranch: ASTNode[];
  elseBranch?: ASTNode[];
  elseIfBranches?: Array<{ condition: ASTNode; body: ASTNode[] }>;
}

export interface RepeatNode extends BaseASTNode {
  type: 'repeat';
  count?: number | ASTNode;
  whileCondition?: ASTNode;
  untilEvent?: string;
  body: ASTNode[];
}

export interface ForEachNode extends BaseASTNode {
  type: 'foreach';
  itemName: string;
  indexName?: string;
  collection: ASTNode;
  body: ASTNode[];
}

export interface WhileNode extends BaseASTNode {
  type: 'while';
  condition: ASTNode;
  body: ASTNode[];
}

// =============================================================================
// EVENT MODIFIERS
// =============================================================================

export interface EventModifiers {
  prevent?: boolean;
  stop?: boolean;
  once?: boolean;
  passive?: boolean;
  capture?: boolean;
  debounce?: number;
  throttle?: number;
  from?: string;
  target?: ASTNode;
}

// =============================================================================
// ANALYSIS TYPES
// =============================================================================

/**
 * Variable information from analysis.
 */
export interface VariableInfo {
  name: string;
  scope: 'local' | 'global' | 'element';
  reads: SourceLocation[];
  writes: SourceLocation[];
  type?: 'number' | 'string' | 'boolean' | 'element' | 'array' | 'unknown';
}

/**
 * Selector information.
 */
export interface SelectorInfo {
  selector: string;
  usages: SourceLocation[];
  isId: boolean;
  canCache: boolean;
}

/**
 * Static analysis result.
 */
export interface AnalysisResult {
  /** Commands used in the script */
  commandsUsed: Set<string>;

  /** Variable analysis */
  variables: {
    locals: Map<string, VariableInfo>;
    globals: Map<string, VariableInfo>;
    contextVars: Set<string>;
  };

  /** Expression analysis */
  expressions: {
    pure: ASTNode[];
    dynamic: ASTNode[];
    selectors: SelectorInfo[];
  };

  /** Control flow analysis */
  controlFlow: {
    hasAsync: boolean;
    hasLoops: boolean;
    hasConditionals: boolean;
    canThrow: boolean;
    maxNestingDepth: number;
  };

  /** Dependencies */
  dependencies: {
    domQueries: string[];
    eventTypes: string[];
    behaviors: string[];
    runtimeHelpers: string[];
  };

  /** Warnings from analysis */
  warnings: string[];
}

// =============================================================================
// CODE GENERATION TYPES
// =============================================================================

/**
 * Code generation options.
 */
export interface CodegenOptions {
  /** JavaScript target version */
  target: 'es2020' | 'es2022' | 'esnext';

  /** Output module format */
  mode: 'iife' | 'esm' | 'cjs';

  /** Minify output */
  minify: boolean;

  /** Generate source maps */
  sourceMaps: boolean;

  /** Runtime import path */
  runtimeImport: string;

  /** Preserve comments */
  preserveComments: boolean;

  /** Enable debug mode */
  debugMode: boolean;
}

/**
 * Generated expression result.
 */
export interface GeneratedExpression {
  /** The generated JavaScript code */
  code: string;

  /** Whether this expression is async */
  async: boolean;

  /** Whether this has side effects */
  sideEffects: boolean;

  /** Required runtime helpers */
  helpers?: string[];
}

/**
 * Generated handler result.
 */
export interface GeneratedHandler {
  /** Handler function code */
  handlerCode: string;

  /** Event binding code */
  bindingCode: string;

  /** Cleanup code (for removeEventListener) */
  cleanup: string | null;

  /** Whether handler is async */
  async: boolean;

  /** Required runtime imports */
  imports: string[];
}

/**
 * Complete code generation result.
 */
export interface GeneratedCode {
  /** The generated JavaScript code */
  code: string;

  /** Source map if enabled */
  map?: SourceMap;

  /** Required runtime imports */
  imports: string[];

  /** Exported handler names */
  exports: string[];

  /** Metadata about generation */
  metadata: {
    commandsUsed: string[];
    handlersGenerated: number;
    originalSize: number;
    generatedSize: number;
    optimizationsApplied: string[];
  };
}

/**
 * Source map type (simplified).
 */
export interface SourceMap {
  version: 3;
  file: string;
  sources: string[];
  sourcesContent?: (string | null)[];
  names: string[];
  mappings: string;
}

// =============================================================================
// CODEGEN CONTEXT
// =============================================================================

/**
 * Context passed through code generation.
 */
export interface CodegenContext {
  /** Current handler ID */
  handlerId: string;

  /** Generate a unique ID */
  generateId(prefix?: string): string;

  /** Compile an expression to JavaScript */
  generateExpression(node: ASTNode): string;

  /** Get implicit target element reference */
  implicitTarget: string;

  /** Local variable declarations needed */
  localVarDeclarations: string;

  /** Check if selector can be cached */
  canCacheSelector(selector: string): boolean;

  /** Get cached selector variable name */
  getCachedSelector(selector: string): string;

  /** Register a required runtime helper */
  requireHelper(name: string): void;

  /** Required helpers */
  requiredHelpers: Set<string>;

  /** Analysis results */
  analysis: AnalysisResult;

  /** Codegen options */
  options: CodegenOptions;
}

// =============================================================================
// OPTIMIZATION TYPES
// =============================================================================

/**
 * Optimization pass interface.
 */
export interface OptimizationPass {
  /** Pass name */
  readonly name: string;

  /** Check if this pass should run */
  shouldRun(analysis: AnalysisResult): boolean;

  /** Transform the AST */
  transform(ast: ASTNode, analysis: AnalysisResult): ASTNode;
}

/**
 * Optimized AST with metadata.
 */
export type OptimizedAST = ASTNode & { _optimizations?: string[] };

// =============================================================================
// COMPILER TYPES
// =============================================================================

/**
 * Compile options.
 */
export interface CompileOptions {
  /** Language code (ISO 639-1). Defaults to 'en'. */
  language?: string;

  /** Confidence threshold for semantic parsing (0-1). */
  confidenceThreshold?: number;

  /** Enable debug logging */
  debug?: boolean;

  /** Code generation options */
  codegen?: Partial<CodegenOptions>;

  /** Optimization level: 0 = none, 1 = basic, 2 = full */
  optimizationLevel?: 0 | 1 | 2;
}

/**
 * Parse result from the parser.
 */
export interface ParseResult {
  ast: ASTNode;
  errors: ParseError[];
  warnings: string[];
  metadata: {
    parserUsed: 'traditional' | 'semantic';
    language?: string;
    confidence?: number;
  };
}

/**
 * Parse error.
 */
export interface ParseError {
  message: string;
  location?: SourceLocation;
}

/**
 * Compilation result for a single script.
 */
export interface CompilationResult {
  /** Whether compilation succeeded */
  success: boolean;

  /** Generated code (if success) */
  code?: string;

  /** Source map (if enabled) */
  map?: SourceMap;

  /** Errors (if failed) */
  errors?: string[];

  /** Warnings */
  warnings: string[];

  /** Metadata */
  metadata: {
    handlerId: string;
    parserUsed: 'traditional' | 'semantic';
    language?: string;
    commandsUsed: string[];
    optimizationsApplied: string[];
    needsRuntime: boolean;
    runtimeHelpers: string[];
  };
}

/**
 * Batch compilation result.
 */
export interface BatchCompilationResult {
  /** All compiled handlers */
  handlers: CompiledHandler[];

  /** Combined code for all handlers */
  code: string;

  /** Combined source map */
  map?: SourceMap;

  /** Scripts that couldn't be compiled */
  fallbacks: FallbackScript[];

  /** Overall statistics */
  stats: {
    total: number;
    compiled: number;
    fallbacks: number;
    totalSize: number;
    runtimeSize: number;
  };
}

/**
 * Compiled handler.
 */
export interface CompiledHandler {
  /** Unique identifier */
  id: string;

  /** Original hyperscript source */
  source: string;

  /** Event type(s) */
  events: string[];

  /** Generated JavaScript code */
  code: string;

  /** Element binding info */
  binding: {
    elementId?: string;
    elementSelector?: string;
  };
}

/**
 * Script that couldn't be compiled.
 */
export interface FallbackScript {
  id: string;
  script: string;
  reason: string;
  location?: SourceLocation;
}

// =============================================================================
// RUNTIME TYPES
// =============================================================================

/**
 * Execution context for AOT runtime.
 */
export interface ExecutionContext {
  /** Current element (me) */
  me: Element;

  /** Target element (you) */
  you: Element | null;

  /** Last result (it/result) */
  it: unknown;

  /** Alias for it */
  result: unknown;

  /** Current event */
  event: Event | null;

  /** Local variables */
  locals: Map<string, unknown>;

  /** Whether execution was halted */
  halted: boolean;

  /** Whether a return was executed */
  returned: boolean;

  /** Return value if returned */
  returnValue?: unknown;
}

/**
 * Runtime behavior definition.
 */
export interface CompiledBehavior {
  /** Behavior name */
  name: string;

  /** Install this behavior on an element */
  install(element: Element): void;

  /** Remove this behavior from an element */
  uninstall(element: Element): void;
}

// =============================================================================
// SCANNER TYPES
// =============================================================================

/**
 * Scanner options.
 */
export interface ScannerOptions {
  /** Attribute names to scan for hyperscript */
  attributeNames?: string[];

  /** Whether to include script tags with type="text/hyperscript" */
  includeScriptTags?: boolean;

  /** Default language for scripts without lang attribute */
  defaultLanguage?: string;
}

/**
 * Scan result.
 */
export interface ScanResult {
  /** Extracted scripts */
  scripts: ExtractedScript[];

  /** Files scanned */
  files: string[];

  /** Errors during scanning */
  errors: Array<{ file: string; error: string }>;
}

// =============================================================================
// CLI TYPES
// =============================================================================

/**
 * CLI compile command options.
 */
export interface CLICompileOptions {
  output: string;
  format: 'esm' | 'cjs' | 'iife';
  minify: boolean;
  sourcemap: boolean;
  language: string;
  watch: boolean;
}

/**
 * CLI analyze command options.
 */
export interface CLIAnalyzeOptions {
  json: boolean;
  verbose: boolean;
}
