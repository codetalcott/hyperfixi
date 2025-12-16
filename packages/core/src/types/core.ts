/**
 * Core type definitions for the modular hyperscript implementation
 * Based on hyperscript-lsp database schema and language specification
 *
 * IMPORTANT: Core types now imported from base-types.ts for consistency
 * This eliminates the 1,755 TypeScript errors from type conflicts
 */

// ============================================================================
// Import Unified Types from Base System
// ============================================================================

// Re-export core types from unified base-types system
export type {
  ExecutionContext,
  TypedExecutionContext,
  EvaluationType,
  HyperScriptValueType,
  ValidationResult,
  ValidationError,
  TypedResult,
  EnhancedError,
  PerformanceCharacteristics,
  ASTNode,
  ParseError,
  ExpressionNode,
  CommandNode as BaseCommandNode,
  EventHandlerNode,
  BehaviorNode,
  DefNode,
} from './base-types';

// Import types for use within this file
import type {
  ExecutionContext,
  ASTNode,
  ExpressionNode,
  EvaluationType,
  ParseError,
} from './base-types';

// ============================================================================
// Legacy Language Element Types (Domain-Specific)
// ============================================================================

export type ElementType = 'command' | 'expression' | 'feature' | 'keyword' | 'special_symbol';

export type ElementStatus = 'Draft' | 'Review' | 'Approved' | 'Deprecated';

export type ExpressionCategory =
  | 'Arithmetic'
  | 'Logical'
  | 'Comparison'
  | 'Reference'
  | 'Conversion'
  | 'Special';

export type Associativity = 'Left' | 'Right' | 'None';

// ============================================================================
// Extended ExecutionContext (Legacy Interface)
// ============================================================================

/**
 * Extended ExecutionContext interface for legacy compatibility
 * Preserves all existing functionality while using unified base types
 */
export interface ExtendedExecutionContext extends ExecutionContext {
  /** General variables storage (for simple use cases) */
  variables?: Map<string, unknown>;

  /** Event handlers storage for cleanup */
  events?: Map<string, { target: HTMLElement; event: string; handler: Function }>;

  /** Parent context for scope chain */
  parent?: ExtendedExecutionContext;

  /** Meta scope - template variables and internal hyperscript state */
  meta?: Record<string, unknown>;

  /** Execution flags */
  flags?: {
    halted: boolean;
    breaking: boolean;
    continuing: boolean;
    returning: boolean;
    async: boolean;
  };
}

// ============================================================================
// AST Node Types (Using Unified Base Definition)
// ============================================================================

// ASTNode is now imported from base-types.ts for consistency

export interface CommandNode extends ASTNode {
  type: 'command';
  name: string;
  args: ExpressionNode[];
  body?: StatementNode[];
  implicitTarget?: ExpressionNode;
  isBlocking: boolean;
  // Modifiers for multi-word commands (e.g., "append X to Y" → modifiers: {to: Y})
  modifiers?: Record<string, ExpressionNode>;
}

// ExpressionNode is now imported from base-types.ts for consistency

export interface FeatureNode extends ASTNode {
  type: 'feature';
  name: string;
  trigger?: string;
  body: StatementNode[];
  scope: 'global' | 'local' | 'behavior';
}

export interface StatementNode extends ASTNode {
  type: 'statement';
  command: CommandNode;
  conditions?: ExpressionNode[];
}

// ============================================================================
// Runtime Types
// ============================================================================

export interface Runtime {
  /** Execute a command in the given context */
  executeCommand(command: CommandNode, context: ExecutionContext): Promise<unknown>;

  /** Evaluate an expression in the given context */
  evaluateExpression(expression: ExpressionNode, context: ExecutionContext): Promise<unknown>;

  /** Create a new execution context */
  createContext(parent?: ExecutionContext): ExecutionContext;

  /** Register a command implementation */
  registerCommand(name: string, implementation: BaseCommandImplementation): void;

  /** Register an expression implementation */
  registerExpression(name: string, implementation: ExpressionImplementation): void;

  /** Register a feature implementation */
  registerFeature(name: string, implementation: FeatureImplementation): void;
}

// ============================================================================
// Implementation Types
// ============================================================================

/**
 * Base command implementation interface (non-generic)
 * Used for runtime command registry and code generation
 */
export interface BaseCommandImplementation {
  name: string;
  syntax: string;
  execute: (context: ExecutionContext, ...args: unknown[]) => Promise<unknown>;
  isBlocking: boolean;
  hasBody: boolean;
  implicitTarget?: string;
  implicitResult?: 'it' | 'result' | 'none';
  validate?: (args: unknown[]) => string | null;
}

// ============================================================================
// Enhanced Command Types (Using Unified Base Types)
// ============================================================================

/**
 * Legacy ValidationResult interface for backward compatibility
 * Maps to the unified ValidationResult from base-types.ts
 */
export interface LegacyValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: import('./base-types').ValidationError;
}

/**
 * @deprecated Use TypedCommandImplementation from enhanced-core.ts instead.
 * This legacy interface is kept for backward compatibility only.
 *
 * Key differences from modern interface:
 * - Legacy: execute(input, context) → Promise<TOutput>
 * - Modern: execute(context, ...args) → Promise<TypedResult<TOutput>>
 * - Legacy: metadata is plain object
 * - Modern: metadata is CommandMetadata type with additional fields
 */
export interface CommandImplementation<
  TInput = unknown,
  TOutput = unknown,
  TContext = import('./base-types').ExecutionContext,
> {
  metadata: {
    name: string;
    description: string;
    examples: string[];
    syntax: string;
    category: string;
    version: string;
  };

  validation: {
    validate(input: unknown): import('./base-types').ValidationResult<TInput>;
  };

  execute(input: TInput, context: TContext): Promise<TOutput>;
}

// TypedExecutionContext is now exported from base-types.ts above

export interface ExpressionImplementation {
  name: string;
  category: ExpressionCategory;
  evaluatesTo: EvaluationType;
  evaluate: (context: ExecutionContext, ...args: unknown[]) => Promise<unknown>;
  precedence?: number;
  associativity?: Associativity;
  operators?: string[];
  validate?: (args: unknown[]) => string | null;
}

export interface FeatureImplementation {
  name: string;
  trigger?: string;
  install: (runtime: Runtime) => void;
  uninstall?: (runtime: Runtime) => void;
  scope: 'global' | 'local' | 'behavior';
}

// ============================================================================
// Parser Types
// ============================================================================

export interface Token {
  /** Semantic token type (TokenType) - what the token MEANS in hyperscript */
  type: string;
  /** Lexical token kind (TokenKind) - what the token IS structurally (Phase 5) */
  kind?: string;
  value: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

export interface ParseWarning {
  type: string;
  message: string;
  suggestions: string[];
  severity: 'info' | 'warning' | 'error';
  code?: string;
  line?: number;
  column?: number;
}

export interface ParseResult<T = ASTNode> {
  success: boolean;
  node?: T;
  ast?: T; // Alias for node - some code uses ast instead of node
  error?: ParseError;
  warnings?: ParseWarning[];
  tokens: Token[];
}

// ParseError is now imported from base-types.ts for consistency

export interface Parser {
  /** Parse a complete hyperscript program */
  parse(input: string): ParseResult<FeatureNode[]>;

  /** Parse a single expression */
  parseExpression(input: string): ParseResult<ExpressionNode>;

  /** Parse a single command */
  parseCommand(input: string): ParseResult<CommandNode>;

  /** Tokenize input */
  tokenize(input: string): Token[];
}

// ============================================================================
// Database Integration Types
// ============================================================================

export interface LSPElement {
  id: number;
  name: string;
  description: string;
  syntax_canonical: string;
  status: ElementStatus;
  tags: string[];
  examples: LSPExample[];
}

export interface LSPCommand extends LSPElement {
  purpose: string;
  has_body: boolean;
  is_blocking: boolean;
  implicit_target?: string;
  implicit_result_target?: string;
  arguments?: LSPArgument[];
}

export interface LSPExpression extends LSPElement {
  category: ExpressionCategory;
  evaluates_to_type: EvaluationType;
  precedence?: number;
  associativity?: Associativity;
  operators?: string[];
}

export interface LSPFeature extends LSPElement {
  trigger?: string;
  structure_description?: string;
  scope_impact?: string;
}

export interface LSPExample {
  id: number;
  element_id: number;
  element_type: ElementType;
  example: string;
  description?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  html_context?: string;
}

export interface LSPArgument {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  default_value?: unknown;
}

// ============================================================================
// Event Types
// ============================================================================

export interface HyperscriptEvent extends CustomEvent {
  detail: {
    element: HTMLElement;
    context: ExecutionContext;
    command?: string;
    result?: unknown;
    error?: Error;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface HyperscriptConfig {
  /** Enable strict mode with enhanced type checking */
  strict?: boolean;

  /** Debug mode with detailed logging */
  debug?: boolean;

  /** Custom command implementations */
  commands?: Record<string, BaseCommandImplementation>;

  /** Custom expression implementations */
  expressions?: Record<string, ExpressionImplementation>;

  /** Custom feature implementations */
  features?: Record<string, FeatureImplementation>;

  /** Global variables */
  globals?: Record<string, unknown>;

  /** Event handling configuration */
  events?: {
    bubbling?: boolean;
    delegation?: boolean;
    passive?: boolean;
  };

  /** Performance options */
  performance?: {
    cacheParsing?: boolean;
    lazyLoading?: boolean;
    bundleOptimization?: boolean;
  };
}
