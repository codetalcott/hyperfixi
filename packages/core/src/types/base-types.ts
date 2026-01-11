/**
 * Unified Base Type System for HyperFixi
 * Single source of truth for all core types - eliminates the 1,755 TypeScript errors
 * from multiple type definitions across the codebase
 */

import type { RuntimeValidator } from '../validation/lightweight-validators';
import type { CoreExecutionContext } from './core-context';

// Re-export core context types for convenience
export type { CoreExecutionContext } from './core-context';
export { createCoreContext, isCoreExecutionContext, assertHTMLElement, asHTMLElement } from './core-context';

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
  /** Result of last operation */
  readonly result: unknown;

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
 * AST Node for parser compatibility (unified definition)
 */
export interface ASTNode {
  readonly type: string;
  readonly line?: number;
  readonly column?: number;
  readonly start?: number;
  readonly end?: number;
  readonly raw?: string;
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

// ASTNode is already defined above - this was a duplicate

/**
 * Binary expression AST node
 */
export interface BinaryExpressionNode extends ASTNode {
  readonly type: 'binaryExpression';
  readonly operator: string;
  readonly left: ASTNode;
  readonly right: ASTNode;
}

/**
 * Unary expression AST node
 */
export interface UnaryExpressionNode extends ASTNode {
  readonly type: 'unaryExpression';
  readonly operator: string;
  readonly operand: ASTNode;
}

/**
 * Property access AST node
 */
export interface PropertyAccessNode extends ASTNode {
  readonly type: 'propertyAccess';
  readonly object: ASTNode;
  readonly property: string;
}

/**
 * Member expression AST node
 */
export interface MemberExpressionNode extends ASTNode {
  readonly type: 'memberExpression';
  readonly expression: ASTNode;
  readonly member: string;
}

/**
 * Context reference AST node
 */
export interface ContextReferenceNode extends ASTNode {
  readonly type: 'contextReference';
  readonly contextType: 'me' | 'you' | 'it' | 'target' | 'event';
}

/**
 * Command AST node
 */
export interface CommandNode extends ASTNode {
  readonly type: 'command';
  readonly name: string;
  readonly args?: ASTNode[];
  readonly source?: string;
}

/**
 * Expression AST node
 */
export interface ExpressionNode extends ASTNode {
  readonly type: 'expression';
  readonly value?: unknown;
  readonly operator?: string;
  readonly operands?: ExpressionNode[];
}

/**
 * Literal AST node
 */
export interface LiteralNode extends ASTNode {
  readonly type: 'literal';
  readonly value: string | number | boolean;
}

/**
 * Event handler AST node
 */
export interface EventHandlerNode extends ASTNode {
  readonly type: 'eventHandler';
  readonly event: string; // Primary event name (for backward compatibility)
  readonly events?: string[]; // All event names when using "on event1 or event2" syntax
  readonly target?: string;
  readonly selector?: string; // CSS selector for event delegation ("from" keyword)
  readonly condition?: ASTNode; // Optional event condition ("[condition]" syntax)
  readonly attributeName?: string; // Attribute name for mutation events ("of @attribute" syntax)
  readonly watchTarget?: ASTNode; // Target element to watch for changes ("in <target>" syntax)
  readonly args?: string[]; // Event parameter names to destructure (e.g., ['clientX', 'clientY'])
  readonly commands: ASTNode[];
}

/**
 * Behavior definition AST node
 * Represents a reusable behavior that can be installed on elements
 */
export interface BehaviorNode extends ASTNode {
  readonly type: 'behavior';
  readonly name: string;
  readonly parameters: string[];
  readonly eventHandlers: EventHandlerNode[];
  readonly initBlock?: ASTNode;
  readonly namespace?: string;
}

/**
 * Function definition AST node (def feature)
 * Represents a user-defined function in hyperscript
 *
 * Syntax:
 *   def <name>(<params>)
 *     <commands>
 *   [catch <errorSymbol>
 *     <commands>]
 *   [finally
 *     <commands>]
 *   end
 */
export interface DefNode extends ASTNode {
  readonly type: 'def';
  /** Function name (can be namespaced, e.g., "utils.calculate") */
  readonly name: string;
  /** Parameter names */
  readonly params: string[];
  /** Function body commands */
  readonly body: CommandNode[];
  /** Error symbol name for catch block (if present) */
  readonly errorSymbol?: string;
  /** Error handler commands (catch block) */
  readonly errorHandler?: CommandNode[];
  /** Finally handler commands */
  readonly finallyHandler?: CommandNode[];
}

/**
 * Enhanced AST node with type information
 */
export interface TypedASTNode extends ASTNode {
  readonly evaluationType: EvaluationType;
  readonly validationResult: ValidationResult;
  readonly metadata?: Record<string, unknown>;
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
