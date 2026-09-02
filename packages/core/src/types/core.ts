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
} from './base-types';
// `EventHandlerNode`, `BehaviorNode`, `DefNode` (and the `BaseCommandNode`
// alias nothing imported) were re-exported from base-types here until Arc 2
// step 4 deleted the originals. They live in `ast/nodes.ts`; import from there.

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
  'Arithmetic' | 'Logical' | 'Comparison' | 'Reference' | 'Conversion' | 'Special';

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
  // Original command name when parser sugar transforms the command
  // (e.g., "increment" → set command with originalCommand: "increment")
  originalCommand?: string;
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

// ============================================================================
// Implementation Types
// ============================================================================

// ============================================================================
// Enhanced Command Types (Using Unified Base Types)
// ============================================================================

// TypedExecutionContext is now exported from base-types.ts above

/**
 * Lightweight expression interface — preferred for new expressions.
 *
 * Uses variadic args and returns raw values. Validation returns `string | null`.
 * Used by all 6 bundled expression categories (references, logical, special,
 * conversion, positional, properties).
 *
 * For expressions needing typed results (`TypedResult<T>`), structured validation
 * (`ValidationResult`), or built-in performance tracking, use `BaseExpressionImpl`
 * from `expressions/base-expression.ts` instead.
 */
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

// ============================================================================
// Parser Types
// ============================================================================

export interface Token {
  /** Lexical token kind (TokenKind) - what the token IS structurally */
  kind: string;
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
  /**
   * An AST was produced — **not** a validity claim.
   *
   * The parser is deliberately resilient: it recovers from some malformed
   * input and returns a usable-but-degraded AST *plus* diagnostics. Such a
   * parse is `success: true` with a non-empty `errors`. Callers that want
   * "is this runnable?" should read this flag (that is what every execute
   * path does); callers that want "is this correct?" must check `recovered`
   * or `errors.length === 0`.
   */
  success: boolean;
  node?: T;
  ast?: T; // Alias for node - some code uses ast instead of node
  error?: ParseError;
  errors?: ParseError[]; // All accumulated errors (resilient parsing)
  /**
   * The parse recovered from at least one error, so `node` is degraded.
   * Mirrors `errors.length > 0`, and is set in `Parser.parse()` — the single
   * place `errors` is attached — so the two cannot drift apart.
   *
   * Exists because `success` alone cannot express the difference: the parser's
   * recovery paths restore the singular `this.error` but never unwind the
   * push onto `this.errors`, which is exactly how a recovered parse ends up
   * reporting `success: true`.
   */
  recovered?: boolean;
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
