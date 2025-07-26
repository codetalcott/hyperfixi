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
  PerformanceCharacteristics
} from './base-types.js';

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
export interface ExtendedExecutionContext extends import('./base-types.js').ExecutionContext {
  /** General variables storage (for simple use cases) */
  variables?: Map<string, any>;
  
  /** Event handlers storage for cleanup */
  events?: Map<string, { target: HTMLElement; event: string; handler: Function }>;
  
  /** Parent context for scope chain */
  parent?: ExtendedExecutionContext;
  
  /** Meta scope - template variables and internal hyperscript state */
  meta?: Record<string, any>;
  
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
// AST Node Types
// ============================================================================

export interface ASTNode {
  type: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

export interface CommandNode extends ASTNode {
  type: 'command';
  name: string;
  args: ExpressionNode[];
  body?: StatementNode[];
  implicitTarget?: ExpressionNode;
  isBlocking: boolean;
}

export interface ExpressionNode extends ASTNode {
  type: 'expression';
  category: ExpressionCategory;
  evaluatesTo: EvaluationType;
  value?: any;
}

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
  executeCommand(command: CommandNode, context: ExecutionContext): Promise<any>;
  
  /** Evaluate an expression in the given context */
  evaluateExpression(expression: ExpressionNode, context: ExecutionContext): Promise<any>;
  
  /** Create a new execution context */
  createContext(parent?: ExecutionContext): ExecutionContext;
  
  /** Register a command implementation */
  registerCommand(name: string, implementation: CommandImplementation): void;
  
  /** Register an expression implementation */
  registerExpression(name: string, implementation: ExpressionImplementation): void;
  
  /** Register a feature implementation */
  registerFeature(name: string, implementation: FeatureImplementation): void;
}

// ============================================================================
// Implementation Types
// ============================================================================

export interface CommandImplementation {
  name: string;
  syntax: string;
  execute: (context: ExecutionContext, ...args: any[]) => Promise<any>;
  isBlocking: boolean;
  hasBody: boolean;
  implicitTarget?: string;
  implicitResult?: 'it' | 'result' | 'none';
  validate?: (args: any[]) => string | null;
}

// ============================================================================
// Enhanced Command Types (Using Unified Base Types)
// ============================================================================

/**
 * Legacy ValidationResult interface for backward compatibility
 * Maps to the unified ValidationResult from base-types.ts
 */
export interface LegacyValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: import('./base-types.js').ValidationError;
}

export interface TypedCommandImplementation<TInput = any, TOutput = any, TContext = import('./base-types.js').ExecutionContext> {
  metadata: {
    name: string;
    description: string;
    examples: string[];
    syntax: string;
    category: string;
    version: string;
  };
  
  validation: {
    validate(input: unknown): import('./base-types.js').ValidationResult<TInput>;
  };
  
  execute(input: TInput, context: TContext): Promise<TOutput>;
}

// TypedExecutionContext is now exported from base-types.ts above

export interface ExpressionImplementation {
  name: string;
  category: ExpressionCategory;
  evaluatesTo: EvaluationType;
  evaluate: (context: ExecutionContext, ...args: any[]) => Promise<any>;
  precedence?: number;
  associativity?: Associativity;
  operators?: string[];
  validate?: (args: any[]) => string | null;
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
  type: string;
  value: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

export interface ParseResult<T = ASTNode> {
  success: boolean;
  node?: T;
  error?: ParseError;
  tokens: Token[];
}

export interface ParseError {
  message: string;
  position: number;
  line: number;
  column: number;
  expected?: string[];
  actual?: string;
}

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
  default_value?: any;
}

// ============================================================================
// Event Types
// ============================================================================

export interface HyperscriptEvent extends CustomEvent {
  detail: {
    element: HTMLElement;
    context: ExecutionContext;
    command?: string;
    result?: any;
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
  commands?: Record<string, CommandImplementation>;
  
  /** Custom expression implementations */
  expressions?: Record<string, ExpressionImplementation>;
  
  /** Custom feature implementations */
  features?: Record<string, FeatureImplementation>;
  
  /** Global variables */
  globals?: Record<string, any>;
  
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