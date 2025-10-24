

/**
 * Enhanced Expression Types - Deep TypeScript Integration for Expression System
 * Extends enhanced patterns to hyperscript expression evaluation with full type safety
 * 
 * IMPORTANT: Core types now imported from base-types.ts for consistency
 */

import type { RuntimeValidator } from '../validation/lightweight-validators';
import { v, z } from '../validation/lightweight-validators';
// Import unified types from base-types system for local use and re-export
import type {
  ValidationResult,
  EvaluationResult,
  LLMDocumentation,
  ExecutionContext,
  TypedExpressionContext,
  TypedResult,
  EvaluationType
} from './base-types';

// Re-export for external consumers
export type { 
  ValidationResult, 
  EvaluationResult,
  LLMDocumentation,
  ExecutionContext,
  TypedExecutionContext,
  TypedExpressionContext,
  EvaluationType,
  HyperScriptValueType,
  TypedResult
} from './base-types';

// Core types now imported from base-types.ts above

/**
 * Expression categories for organization and metadata
 * Extends base categories with expression-specific types
 */
export type ExpressionCategory = 
  | 'Reference'      // me, you, it, CSS selectors
  | 'Logical'        // comparisons, boolean logic, pattern matching
  | 'Conversion'     // as keyword, type conversions
  | 'Positional'     // first, last, array navigation
  | 'Property'       // possessive syntax, attribute access
  | 'Special'        // literals, math operations, string manipulation
  | 'Template';      // template directives, conditional rendering, iteration

// EvaluationType and TypedExpressionContext now imported from base-types.ts above

// TypedResult now imported from base-types.ts above

/**
 * Enhanced error type with suggestions and structured information
 */
export interface TypedError {
  name: string;
  message: string;
  code: string;
  suggestions: string[];
}

/**
 * Base interface for typed expressions
 */
export interface BaseTypedExpression<T> {
  readonly name: string;
  readonly category: string;
  readonly syntax: string;
  readonly outputType: string;
  readonly inputSchema: RuntimeValidator<unknown>;
  readonly metadata: ExpressionMetadata;
  readonly documentation: LLMDocumentation;

  evaluate(context: TypedExpressionContext, input: unknown): Promise<TypedResult<T>>;
  validate(input: unknown): ValidationResult;
}

/**
 * Expression evaluation record for debugging and performance analysis
 */
export interface ExpressionEvaluation {
  expressionName: string;
  category: ExpressionCategory;
  input: unknown;
  output: unknown;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: Error;
}

/**
 * Expression metadata for LLM understanding and tooling
 */
export interface ExpressionMetadata {
  category: ExpressionCategory;
  complexity: 'simple' | 'medium' | 'complex';
  sideEffects: string[];           // e.g., ['dom-query', 'context-modification']
  dependencies: string[];          // Other expressions this depends on
  returnTypes: EvaluationType[];   // Possible return types
  examples: {
    input: string;
    description: string;
    expectedOutput: any;
    context?: Partial<ExecutionContext>;
  }[];
  relatedExpressions: string[];
  performance: {
    averageTime: number;           // Average execution time in ms
    complexity: 'O(1)' | 'O(n)' | 'O(log n)' | 'O(n²)';
  };
}

/**
 * Enhanced expression implementation interface
 */
export interface TypedExpressionImplementation<
  TInput = unknown,
  TOutput = unknown,
  TContext extends TypedExpressionContext = TypedExpressionContext
> {
  readonly name: string;
  readonly category: ExpressionCategory;
  readonly syntax: string;
  readonly description: string;
  readonly inputSchema: RuntimeValidator<TInput>;
  readonly outputType: EvaluationType;
  readonly metadata: ExpressionMetadata;
  readonly documentation: LLMDocumentation;

  /**
   * Evaluate expression with typed context and input
   */
  evaluate(context: TContext, input: TInput): Promise<EvaluationResult<TOutput>>;

  /**
   * Validate expression input
   */
  validate(input: unknown): ValidationResult;

  /**
   * Parse expression string into typed input (for complex expressions)
   */
  parse?(expressionString: string): Promise<EvaluationResult<TInput>>;

  /**
   * Check if expression can handle the given input
   */
  canHandle?(input: unknown): boolean;
}

/**
 * Expression validation error with position information
 */
export interface ExpressionValidationError {
  type: 'type-mismatch' | 'missing-argument' | 'invalid-syntax' | 'runtime-error' | 'syntax-error' | 'security-warning';
  message: string;
  position?: {
    line: number;
    column: number;
    source: string;
    start?: number;
    end?: number;
  suggestions: []
  };
  suggestions: string[];
  code?: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Enhanced validation result for expressions
 */
export interface ExpressionValidationResult extends ValidationResult<unknown> {
  errors: ExpressionValidationError[];
  warnings?: ExpressionValidationError[];
  suggestions: string[];
  performance?: {
    estimatedTime: number;
    complexity: string;
  };
}

/**
 * Expression registry for managing enhanced expressions
 */
export interface EnhancedExpressionRegistry {
  /**
   * Register an enhanced expression
   */
  register<TInput, TOutput, TContext extends TypedExpressionContext>(
    expression: TypedExpressionImplementation<TInput, TOutput, TContext>
  ): void;
  
  /**
   * Get expression by name
   */
  get(name: string): TypedExpressionImplementation | undefined;
  
  /**
   * Check if expression exists
   */
  has(name: string): boolean;
  
  /**
   * Get all expression names
   */
  getExpressionNames(): string[];
  
  /**
   * Get expressions by category
   */
  getByCategory(category: ExpressionCategory): TypedExpressionImplementation[];
  
  /**
   * Validate expression exists and can handle input
   */
  validateExpression(name: string, input: unknown): ExpressionValidationResult;
  
  /**
   * Get expression metadata
   */
  getMetadata(name: string): ExpressionMetadata | undefined;
  
  /**
   * Find expressions by capability
   */
  findByReturnType(returnType: EvaluationType): TypedExpressionImplementation[];
}

/**
 * Expression evaluation options
 */
export interface ExpressionEvaluationOptions {
  validationMode?: 'strict' | 'permissive';
  maxDepth?: number;
  timeout?: number;
  caching?: boolean;
  debugging?: boolean;
}

/**
 * Context bridge for legacy compatibility
 */
export interface ExpressionContextBridge {
  /**
   * Convert ExecutionContext to TypedExpressionContext
   */
  toTyped(context: ExecutionContext, options?: ExpressionEvaluationOptions): TypedExpressionContext;
  
  /**
   * Update ExecutionContext from TypedExpressionContext
   */
  fromTyped(typedContext: TypedExpressionContext, originalContext: ExecutionContext): ExecutionContext;
}

/**
 * Expression factory for creating enhanced expressions with proper typing
 */
export interface ExpressionFactory {
  /**
   * Create a reference expression (me, you, it, CSS selectors)
   */
  createReferenceExpression<T = HTMLElement>(
    name: string,
    evaluator: (context: TypedExpressionContext, input: unknown) => Promise<T>
  ): TypedExpressionImplementation;
  
  /**
   * Create a logical expression (comparisons, boolean logic)
   */
  createLogicalExpression(
    name: string,
    evaluator: (context: TypedExpressionContext, left: unknown, right: unknown) => Promise<boolean>
  ): TypedExpressionImplementation;
  
  /**
   * Create a conversion expression (as keyword, type conversions)
   */
  createConversionExpression<TFrom, TTo>(
    name: string,
    fromType: EvaluationType,
    toType: EvaluationType,
    converter: (context: TypedExpressionContext, input: TFrom) => Promise<TTo>
  ): TypedExpressionImplementation;
}

/**
 * Expression performance profiler
 */
export interface ExpressionProfiler {
  /**
   * Start profiling an expression evaluation
   */
  startProfiling(expressionName: string, input: unknown): string;
  
  /**
   * End profiling and record results
   */
  endProfiling(profilingId: string, result: EvaluationResult<unknown>): void;
  
  /**
   * Get performance statistics
   */
  getStats(expressionName?: string): {
    totalEvaluations: number;
    averageTime: number;
    slowestEvaluation: number;
    fastestEvaluation: number;
    errorRate: number;
  };
  
  /**
   * Clear performance data
   */
  clearStats(): void;
}

/**
 * Utility types for expression implementation
 */
export type ExpressionImplementationMap<T = TypedExpressionImplementation> = {
  [key: string]: T;
};

export type ExpressionCategoryMap = {
  [K in ExpressionCategory]: TypedExpressionImplementation[];
};

/**
 * Expression evaluation cache for performance optimization
 */
export interface ExpressionCache {
  get(key: string): EvaluationResult<unknown> | undefined;
  set(key: string, result: EvaluationResult<unknown>, ttl?: number): void;
  clear(): void;
  size(): number;
}

/**
 * Expression debugging utilities
 */
export interface ExpressionDebugger {
  /**
   * Enable debugging for specific expressions
   */
  enable(expressionNames: string[]): void;
  
  /**
   * Disable debugging
   */
  disable(): void;
  
  /**
   * Get debug information for last evaluation
   */
  getLastEvaluation(): ExpressionEvaluation | undefined;
  
  /**
   * Get evaluation history
   */
  getHistory(limit?: number): ExpressionEvaluation[];
  
  /**
   * Set breakpoint on expression
   */
  setBreakpoint(expressionName: string, condition?: (context: TypedExpressionContext) => boolean): void;
}

/**
 * Default schemas for common expression input types
 */
export const CommonInputSchemas = {
  NoInput: v.undefined(),
  StringInput: v.string(),
  NumberInput: v.number(),
  BooleanInput: v.boolean(),
  ElementInput: v.custom((value: unknown) => value instanceof HTMLElement),
  SelectorInput: v.string().regex(/^[.#]?[\w-]+$/),
  ComparisonInput: v.object({
    left: v.unknown(),
    operator: z.enum(['==', '!=', '>', '<', '>=', '<=']),
    right: v.unknown()
  }),
  LogicalInput: v.object({
    left: v.boolean(),
    operator: z.enum(['and', 'or']),
    right: v.boolean()
  })
} as const;

// ValidationResult and LLMDocumentation already exported from base-types.js above