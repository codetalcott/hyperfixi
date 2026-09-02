/**
 * Unified Base Type System for HyperFixi
 * Single source of truth for all core types - eliminates the 1,755 TypeScript errors
 * from multiple type definitions across the codebase
 */

import type { RuntimeValidator } from '../validation/lightweight-validators';
import type { CoreExecutionContext } from './core-context';
import type { ExpressionRegistry } from '../core/expression-registry';

// Re-export core context types for convenience
export type { CoreExecutionContext } from './core-context';
export {
  createCoreContext,
  isCoreExecutionContext,
  assertHTMLElement,
  asHTMLElement,
} from './core-context';

// ============================================================================
// Core Validation Types (Single Source of Truth)
// ============================================================================

/**
 * Standard validation error structure used throughout the system
 * Unified to use suggestions: string[] for consistency with HyperScriptError
 */
export interface ValidationError {
  readonly type:
    | 'type-mismatch'
    | 'missing-argument'
    | 'runtime-error'
    | 'validation-error'
    | 'syntax-error'
    | 'invalid-argument'
    | 'invalid-input'
    | 'empty-config'
    | 'schema-validation'
    | 'context-error'
    | 'invalid-syntax'
    | 'security-warning';
  readonly message: string;
  readonly suggestions: readonly string[] | string[];
  readonly path?: string;
  readonly code?: string;
  readonly name?: string;
  /**
   * Severity level for error classification.
   * Optional for backward compatibility, but createError() always provides it.
   * New code should use createError() from error-codes.ts or validation-utils.ts.
   */
  readonly severity?: 'error' | 'warning' | 'info';
}

/**
 * Performance characteristics for tracking expression and feature execution
 */
export interface PerformanceCharacteristics {
  readonly evaluationCount: number;
  readonly totalTime: number;
  readonly averageTime: number;
  readonly successRate: number;
  readonly lastEvaluationTime: number;
}

/**
 * Unified validation result structure - consolidates all previous definitions
 * Replaces conflicting definitions in core.ts, enhanced-core.ts, and expression files
 * Supports both generic and non-generic usage for backward compatibility
 */
export interface ValidationResult<T = unknown> {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
  readonly suggestions: readonly string[] | string[];
  readonly warnings?: ValidationError[];
  readonly performance?: PerformanceCharacteristics;

  // Legacy compatibility properties
  readonly success?: boolean;
  readonly data?: T;
  readonly error?: ValidationError;
}

/**
 * Evaluation result structure for expression evaluation
 * Provides value and type information for hyperscript expressions
 * Note: value and type are optional to support error cases
 */
export interface EvaluationResult<T = unknown> {
  readonly value?: T;
  readonly type?: HyperScriptValueType;
  readonly success: boolean;
  readonly error?: ValidationError;
  readonly performance?: PerformanceCharacteristics;
}

// ============================================================================
// Core Value Types (Unified System)
// ============================================================================

/**
 * Comprehensive evaluation type system that covers all use cases
 * Consolidates EvaluationType definitions from multiple files
 */
export type EvaluationType =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Element'
  | 'ElementList'
  | 'Array'
  | 'Object'
  | 'Promise'
  | 'Context'
  | 'Null'
  | 'Undefined'
  | 'Any';

/**
 * HyperScript value type system for runtime type checking
 * Matches the lowercase convention used in actual hyperscript
 */
export type HyperScriptValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'element'
  | 'element-list'
  | 'array'
  | 'object'
  | 'promise'
  | 'fragment'
  | 'null'
  | 'undefined'
  | 'function'
  | 'event'
  | 'error'
  | 'unknown';

/**
 * Mapping between EvaluationType and HyperScriptValueType
 */
export const evaluationToHyperScriptType: Record<EvaluationType, HyperScriptValueType> = {
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Element: 'element',
  ElementList: 'element-list',
  Array: 'array',
  Object: 'object',
  Promise: 'promise',
  Context: 'object',
  Null: 'null',
  Undefined: 'undefined',
  Any: 'object',
};

/**
 * Expression category classification
 * Used for organizing and documenting expression types
 */
export type ExpressionCategory =
  | 'Reference' // me, you, it, CSS selectors
  | 'Logical' // comparisons, boolean logic, pattern matching
  | 'Conversion' // as keyword, type conversions
  | 'Positional' // first, last, array navigation
  | 'Property' // possessive syntax, attribute access
  | 'Special' // literals, math operations, string manipulation
  | 'Template' // template directives, conditional rendering, iteration
  | 'Mathematical'; // arithmetic operations

// ============================================================================
// Execution Context Types (Unified System)
// ============================================================================

/**
 * Full execution context extending CoreExecutionContext with runtime features.
 * Includes legacy compatibility properties for backward compatibility.
 *
 * Type Hierarchy:
 *   CoreExecutionContext (core-context.ts) - Minimal for tree-shaking
 *        ↓
 *   ExecutionContext (this interface) - Full runtime with legacy support
 *        ↓
 *   TypedExecutionContext - Type registry + validation cache
 */
export interface ExecutionContext extends CoreExecutionContext {
  /** Result of last operation — mutable for runtime context updates */
  result: unknown;

  /**
   * Name → expression-implementation lookup used by `parser/runtime.ts:evaluateAST`
   * to dispatch named-expression operators (e.g. `ends with`, `is in`, `as`).
   * Optional during the consolidation arc (Phase 1); becomes required for
   * runtime evaluation paths in later phases. Construct via
   * `createExpressionRegistry()` from selected expression categories.
   *
   * Mutable so `RuntimeBase.execute()` can lazily inject the bundle's registry
   * onto caller-supplied contexts that didn't construct one — see the comment
   * at the top of `execute()` for the rationale.
   */
  registry?: ExpressionRegistry;

  // Control flow flags
  readonly halted?: boolean;
  readonly returned?: boolean;
  readonly broke?: boolean;
  readonly continued?: boolean;
  readonly async?: boolean;

  // Legacy compatibility properties
  readonly variables?: Map<string, unknown>;
  readonly events?: Map<string, { target: HTMLElement; event: string; handler: Function }>;
  readonly parent?: ExecutionContext;
  readonly meta?: Record<string, unknown>;
  readonly flags?: {
    halted: boolean;
    breaking: boolean;
    continuing: boolean;
    returning: boolean;
    async: boolean;
  };

  /**
   * Optional convenience for plugin commands to register per-element
   * teardown without going through `runtime.getCleanupRegistry()`. Populated by
   * runtime code paths that construct the execution context with a runtime
   * reference available. Plugins that cannot rely on presence should fall back
   * to calling `runtime.getCleanupRegistry().registerCustom(...)` via the
   * `runtime` supplied in their `HyperfixiPluginContext.install` argument.
   */
  readonly registerCleanup?: (element: Element, cleanup: () => void, description?: string) => void;
}

/**
 * Enhanced execution context for typed expressions and features.
 * Extends ExecutionContext with additional type safety and tracking.
 *
 * All enhanced properties are optional to support:
 * - Tree-shakeable minimal bundles (don't need tracking)
 * - Test code (can provide only what's needed)
 * - Gradual adoption (add tracking as needed)
 */
export interface TypedExecutionContext extends ExecutionContext {
  /** Stack of expression names for debugging nested evaluations */
  readonly expressionStack?: string[];
  /** Current nesting depth of expression evaluation */
  readonly evaluationDepth?: number;
  /** Validation strictness mode */
  readonly validationMode?: 'strict' | 'permissive';
  /** History of expression evaluations for debugging/performance */
  readonly evaluationHistory?: Array<{
    expressionName: string;
    category: string;
    input: unknown;
    output: unknown;
    timestamp: number;
    duration: number;
    success: boolean;
  }>;
  /** Type registry for runtime type checking (optional for tree-shaking) */
  readonly typeRegistry?: Map<string, unknown>;
  /** Validation cache for performance (optional for tree-shaking) */
  readonly validationCache?: Map<string, unknown>;
}

// NOTE: TypedExpressionImplementation is intentionally NOT defined here to avoid conflicts
// Files should import it directly from enhanced-expressions.ts or enhanced-core.ts
// based on which interface signature they need:
// - enhanced-expressions.ts: evaluate(context, input) signature
// - enhanced-core.ts: evaluate(context, ...args) signature

// ============================================================================
// Result Types (Unified System)
// ============================================================================

/**
 * Parse error for hyperscript compilation
 */
export interface ParseError {
  readonly name?: string;
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly position?: number;
  readonly source?: string;
}

/**
 * Structured diagnostic for parse errors, warnings, and hints.
 * Structurally compatible with framework's Diagnostic type.
 */
export type ParseDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface ParseDiagnostic {
  readonly message: string;
  readonly severity: ParseDiagnosticSeverity;
  readonly code?: string;
  readonly line?: number;
  readonly column?: number;
  readonly source?: string;
  readonly suggestions?: readonly string[];
}

/**
 * AST Node for parser compatibility (unified definition)
 */
export interface ASTNode {
  readonly type: string;
  readonly line?: number;
  readonly column?: number;
  readonly start?: number;
  readonly end?: number;
  readonly raw?: string;
  readonly diagnostics?: readonly ParseDiagnostic[];
  [key: string]: unknown;
}

/**
 * Enhanced error structure with detailed information
 */
export interface EnhancedError {
  readonly name: string;
  readonly message: string;
  readonly code: string;
  readonly suggestions: string[];
  readonly type?: string;
}

/**
 * Typed result structure for enhanced expressions and features
 * Provides comprehensive success/failure information
 */
export type TypedResult<T = unknown> =
  | {
      readonly success: true;
      readonly value: T;
      readonly type: HyperScriptValueType;
    }
  | {
      readonly success: false;
      readonly error: EnhancedError;
      readonly errors?: ValidationError[];
      readonly suggestions?: string[];
      readonly type?: string;
    };

// ============================================================================
// Expression System Types
// ============================================================================

/**
 * Expression metadata for documentation and tooling
 * Only category and complexity are required for runtime; rest is for tooling/docs
 */
export interface ExpressionMetadata {
  readonly category: string;
  readonly complexity: 'simple' | 'medium' | 'complex';
  // Optional documentation fields (stripped from production bundle)
  readonly sideEffects?: string[];
  readonly dependencies?: string[];
  readonly returnTypes?: EvaluationType[];
  readonly examples?: Array<{
    input: string;
    description: string;
    expectedOutput: unknown;
    context?: Record<string, unknown>;
  }>;
  readonly relatedExpressions?: string[];
  readonly performance?: {
    averageTime: number;
    complexity: string;
  };
  // Environment requirements for runtime introspection
  readonly environmentRequirements?: {
    browser?: boolean;
    server?: boolean;
    dom?: boolean;
  };
}

/**
 * LLM documentation structure for AI code generation
 */
export interface LLMDocumentation {
  readonly summary: string;
  readonly parameters: Array<{
    name: string;
    type: string;
    description: string;
    optional: boolean;
    examples: string[];
    defaultValue?: unknown;
  }>;
  readonly returns: {
    type: string;
    description: string;
    examples: unknown[];
  };
  readonly examples: Array<{
    title: string;
    code: string;
    explanation: string;
    output: unknown;
  }>;
  readonly seeAlso: string[];
  readonly tags: string[];
  readonly returnValue?: unknown;
}

/**
 * Base interface for all typed expressions
 */
export interface BaseTypedExpression<T = unknown> {
  readonly name: string;
  readonly category: string;
  readonly syntax: string;
  readonly outputType: EvaluationType;
  readonly inputSchema: RuntimeValidator;
  readonly metadata: ExpressionMetadata;
  readonly documentation?: LLMDocumentation; // Optional - for tooling only
  readonly description?: string; // Optional short description

  evaluate(context: TypedExecutionContext, input: unknown): Promise<EvaluationResult<T>>;
  validate(input: unknown): ValidationResult;
}

/**
 * Expression evaluation options
 */
export interface ExpressionEvaluationOptions {
  readonly validationMode?: 'strict' | 'permissive';
  readonly timeout?: number;
  readonly trackPerformance?: boolean;
}

/**
 * Enhanced expression context with additional evaluation state
 */
export interface TypedExpressionContext extends TypedExecutionContext {
  // Inherits all properties from TypedExecutionContext
  // This ensures compatibility while maintaining the enhanced typing
}

// ============================================================================
// Feature System Types
// ============================================================================

/**
 * Feature category classification
 */
export type FeatureCategory = 'Frontend' | 'Backend' | 'Data' | 'Communication' | 'Advanced';

/**
 * Base interface for all enhanced features
 */
export interface BaseTypedFeature<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly category: FeatureCategory;
  readonly description: string;
  readonly inputSchema: RuntimeValidator<TInput>;
  readonly outputType: EvaluationType;
  readonly metadata: FeatureMetadata;
  readonly documentation?: LLMDocumentation; // Optional

  initialize(context: TypedExecutionContext): Promise<TypedResult<void>>;
  execute(context: TypedExecutionContext, input: TInput): Promise<TypedResult<TOutput>>;
  validate(input: unknown): ValidationResult;
  cleanup?(context: TypedExecutionContext): Promise<void>;
}

/**
 * Feature metadata for documentation and tooling
 */
export interface FeatureMetadata {
  readonly version: string;
  readonly stability: 'stable' | 'experimental' | 'deprecated';
  readonly performance: {
    complexity: string;
    memoryUsage: 'low' | 'medium' | 'high';
    async: boolean;
  };
  readonly compatibility: {
    browsers: string[];
    nodeVersion?: string;
  };
  readonly examples: Array<{
    title: string;
    description: string;
    code: string;
    expectedOutput: unknown;
  }>;
  readonly relatedFeatures: string[];
}

// ============================================================================
// Command System Types
// ============================================================================

/**
 * Command execution result
 */
export interface CommandResult {
  readonly success: boolean;
  readonly value?: unknown;
  readonly error?: string;
  readonly context?: ExecutionContext;
}

/**
 * Base command interface
 */
export interface BaseCommand {
  readonly name: string;
  readonly syntax: string;
  readonly description?: string;
  readonly metadata?: {
    category?: string;
    complexity?: 'simple' | 'medium' | 'complex';
    sideEffects?: string[];
    dependencies?: string[];
    examples?: Array<{
      code: string;
      description: string;
    }>;
  };
  execute(context: ExecutionContext, ...args: unknown[]): Promise<CommandResult>;
  validate?(args: unknown[]): ValidationResult;
}

// ============================================================================
// AST Integration Types
// ============================================================================
//
// The per-kind node interfaces that used to live here were deleted by Arc 2
// step 4 (2026-09-01). `ast/nodes.ts` is the single description of what the
// parser emits; every consumer resolves `CommandNode`, `EventHandlerNode`,
// `BehaviorNode` and `DefNode` from there. Seven of the eleven had no importer
// at all (`MemberExpressionNode` described a `{expression, member}` shape
// nothing ever produced); the other four were live and MORE complete than the
// union — the catch/finally, `of @attr` and `in <sel>` fields were declared
// here and nowhere else — so the union absorbed them first. `ASTNode` and
// `ExpressionNode` stay: `ASTNode` carries the index signature the union
// members extend (step 6 decides its fate), `ExpressionNode` is the frozen
// public type `ast/legacy.ts` crosses into.

/**
 * Expression AST node
 */
export interface ExpressionNode extends ASTNode {
  readonly type: 'expression';
  readonly value?: unknown;
  readonly operator?: string;
  readonly operands?: ExpressionNode[];
}

// ============================================================================
// Bridge Utilities
// ============================================================================

/**
 * Type system bridge for converting between legacy and enhanced systems
 */
export class TypeSystemBridge {
  /**
   * Convert ExecutionContext to TypedExecutionContext
   */
  static toEnhanced(context: ExecutionContext): TypedExecutionContext {
    return {
      ...context,
      expressionStack: [],
      evaluationDepth: 0,
      validationMode: 'permissive',
      evaluationHistory: [],
    };
  }

  /**
   * Extract core ExecutionContext from TypedExecutionContext
   */
  static toLegacy(context: TypedExecutionContext): ExecutionContext {
    return {
      me: context.me,
      you: context.you,
      it: context.it,
      result: context.result,
      locals: context.locals,
      globals: context.globals,
      event: context.event,
    };
  }

  /**
   * Normalize ValidationResult from any source
   */
  static normalizeValidationResult(result: unknown): ValidationResult {
    const res = result as any; // Type assertion for property access
    return {
      isValid: Boolean(res?.isValid),
      errors: Array.isArray(res?.errors) ? res.errors : [],
      suggestions: Array.isArray(res?.suggestions) ? res.suggestions : [],
      warnings: Array.isArray(res?.warnings) ? res.warnings : undefined,
      performance: res?.performance,
    };
  }

  /**
   * Convert EvaluationType to HyperScriptValueType
   */
  static toHyperScriptType(evaluationType: EvaluationType): HyperScriptValueType {
    return evaluationToHyperScriptType[evaluationType];
  }

  /**
   * Create a TypedResult from legacy result data
   */
  static createTypedResult<T>(
    success: boolean,
    value?: T,
    error?: string | EnhancedError,
    type?: HyperScriptValueType
  ): TypedResult<T> {
    if (success && value !== undefined) {
      return {
        success: true,
        value,
        type: type || 'object',
      };
    } else {
      const errorObj =
        typeof error === 'string'
          ? {
              name: 'GenericError',
              message: error,
              code: 'UNKNOWN_ERROR',
              suggestions: [],
            }
          : error || {
              name: 'UnknownError',
              message: 'An unknown error occurred',
              code: 'UNKNOWN_ERROR',
              suggestions: [],
            };
      return {
        success: false,
        error: errorObj,
      };
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new ExecutionContext with default values
 */
export function createExecutionContext(
  me: Element | null = null,
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext {
  return {
    me,
    you: null,
    it: null,
    result: null,
    locals: new Map(),
    globals: new Map(),
    event: null,
    ...overrides,
  };
}

/**
 * Create a new TypedExecutionContext with default values
 */
export function createTypedExecutionContext(
  base?: Partial<ExecutionContext>,
  overrides: Partial<TypedExecutionContext> = {}
): TypedExecutionContext {
  const executionContext = createExecutionContext(base?.me, base);
  return {
    ...executionContext,
    expressionStack: [],
    evaluationDepth: 0,
    validationMode: 'strict',
    evaluationHistory: [],
    ...overrides,
  };
}

/**
 * Type guard to check if a context is typed
 */
export function isTypedExecutionContext(
  context: ExecutionContext | TypedExecutionContext
): context is TypedExecutionContext {
  return 'expressionStack' in context && 'evaluationDepth' in context;
}

/**
 * Create a ValidationResult for successful validation
 */
export function createSuccessValidation(): ValidationResult {
  return {
    isValid: true,
    errors: [],
    suggestions: [],
  };
}

/**
 * Create a ValidationResult for failed validation
 */
export function createFailureValidation(
  errors: ValidationError[],
  suggestions: string[] = []
): ValidationResult {
  return {
    isValid: false,
    errors,
    suggestions,
  };
}

/**
 * Create a ValidationError
 */
export function createValidationError(
  type: ValidationError['type'],
  message: string,
  suggestions: string[] = ['Check the documentation for proper usage']
): ValidationError {
  return { type, message, suggestions };
}

// ============================================================================
// Note: All types are exported by their original declarations above
// No need for additional re-exports that would cause conflicts
// ============================================================================
