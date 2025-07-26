/**
 * Unified Base Type System for HyperFixi
 * Single source of truth for all core types - eliminates the 1,755 TypeScript errors
 * from multiple type definitions across the codebase
 */

import { z } from 'zod';

// ============================================================================
// Core Validation Types (Single Source of Truth)
// ============================================================================

/**
 * Standard validation error structure used throughout the system
 * Unified to use suggestions: string[] for consistency with HyperScriptError
 */
export interface ValidationError {
  readonly type: 'syntax-error' | 'type-mismatch' | 'runtime-error' | 'missing-argument' | 'invalid-reference';
  readonly message: string;
  readonly suggestions: string[];
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
  readonly suggestions: string[];
  readonly warnings?: ValidationError[];
  readonly performance?: PerformanceCharacteristics;
  
  // Legacy compatibility properties
  readonly success?: boolean;
  readonly data?: T;
  readonly error?: ValidationError;
}

// ============================================================================
// Core Value Types (Unified System)
// ============================================================================

/**
 * Comprehensive evaluation type system that covers all use cases
 * Consolidates EvaluationType definitions from multiple files
 */
export type EvaluationType = 
  | 'String' | 'Number' | 'Boolean' | 'Element' | 'ElementList'
  | 'Array' | 'Object' | 'Promise' | 'Context' | 'Null' | 'Any';

/**
 * HyperScript value type system for runtime type checking
 * Matches the lowercase convention used in actual hyperscript
 */
export type HyperScriptValueType = 
  | 'string' | 'number' | 'boolean' | 'element' | 'element-list'
  | 'array' | 'object' | 'promise' | 'fragment' | 'null' | 'undefined' | 'function' | 'event';

/**
 * Mapping between EvaluationType and HyperScriptValueType
 */
export const evaluationToHyperScriptType: Record<EvaluationType, HyperScriptValueType> = {
  'String': 'string',
  'Number': 'number',
  'Boolean': 'boolean',
  'Element': 'element',
  'ElementList': 'element-list',
  'Array': 'array',
  'Object': 'object',
  'Promise': 'promise',
  'Context': 'object',
  'Null': 'null',
  'Any': 'object'
};

// ============================================================================
// Execution Context Types (Unified System)
// ============================================================================

/**
 * Core execution context used throughout the legacy system
 * This is the foundation that all other contexts build upon
 */
export interface ExecutionContext {
  readonly me: Element | null;
  readonly you: Element | null;
  readonly it: unknown;
  readonly result: unknown;
  readonly locals: Map<string, unknown>;
  readonly globals: Map<string, unknown>;
  readonly event: Event | null;
  
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
 * Enhanced execution context for typed expressions and features
 * Extends ExecutionContext with additional type safety and tracking
 */
export interface TypedExecutionContext extends ExecutionContext {
  readonly expressionStack: string[];
  readonly evaluationDepth: number;
  readonly validationMode: 'strict' | 'permissive';
  readonly evaluationHistory: Array<{
    expressionName: string;
    category: string;
    input: unknown;
    output: unknown;
    timestamp: number;
    duration: number;
    success: boolean;
  }>;
}

// ============================================================================
// Result Types (Unified System)
// ============================================================================

/**
 * Enhanced error structure with detailed information
 */
export interface EnhancedError {
  readonly name: string;
  readonly message: string;
  readonly code: string;
  readonly suggestions: string[];
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
    };

// ============================================================================
// Expression System Types
// ============================================================================

/**
 * Expression metadata for documentation and tooling
 */
export interface ExpressionMetadata {
  readonly category: string;
  readonly complexity: 'simple' | 'medium' | 'complex';
  readonly sideEffects: string[];
  readonly dependencies: string[];
  readonly returnTypes: EvaluationType[];
  readonly examples: Array<{
    input: string;
    description: string;
    expectedOutput: unknown;
    context?: Record<string, unknown>;
  }>;
  readonly relatedExpressions: string[];
  readonly performance: {
    averageTime: number;
    complexity: string;
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
  }>;
  readonly returns: {
    type: string;
    description: string;
    examples: string[];
  };
  readonly examples: Array<{
    title: string;
    code: string;
    explanation: string;
    output: string;
  }>;
  readonly seeAlso: string[];
  readonly tags: string[];
}

/**
 * Base interface for all typed expressions
 */
export interface BaseTypedExpression<T = unknown> {
  readonly name: string;
  readonly category: string;
  readonly syntax: string;
  readonly outputType: EvaluationType;
  readonly inputSchema: z.ZodSchema;
  readonly metadata: ExpressionMetadata;
  readonly documentation: LLMDocumentation;
  
  evaluate(context: TypedExecutionContext, input: unknown): Promise<TypedResult<T>>;
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
export type FeatureCategory = 
  | 'Frontend' | 'Backend' | 'Data' | 'Communication' | 'Advanced';

/**
 * Base interface for all enhanced features
 */
export interface BaseTypedFeature<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly category: FeatureCategory;
  readonly description: string;
  readonly inputSchema: z.ZodSchema<TInput>;
  readonly outputType: EvaluationType;
  readonly metadata: FeatureMetadata;
  readonly documentation: LLMDocumentation;
  
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
  execute(context: ExecutionContext, ...args: unknown[]): Promise<CommandResult>;
}

// ============================================================================
// AST Integration Types
// ============================================================================

/**
 * AST node base type for parser integration
 */
export interface ASTNode {
  readonly type: string;
  readonly start?: number | undefined;
  readonly end?: number | undefined;
  readonly raw?: string | undefined;
  // Allow additional properties for different node types
  [key: string]: unknown;
}

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
}

/**
 * Expression AST node
 */
export interface ExpressionNode extends ASTNode {
  readonly type: 'expression';
  readonly value?: unknown;
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
  readonly event: string;
  readonly target?: string;
  readonly commands: ASTNode[];
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
      evaluationHistory: []
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
      event: context.event
    };
  }

  /**
   * Normalize ValidationResult from any source
   */
  static normalizeValidationResult(result: any): ValidationResult {
    return {
      isValid: Boolean(result?.isValid),
      errors: Array.isArray(result?.errors) ? result.errors : [],
      suggestions: Array.isArray(result?.suggestions) ? result.suggestions : [],
      warnings: Array.isArray(result?.warnings) ? result.warnings : undefined,
      performance: result?.performance
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
        type: type || 'object'
      };
    } else {
      const errorObj = typeof error === 'string' ? {
        name: 'GenericError',
        message: error,
        code: 'UNKNOWN_ERROR',
        suggestions: []
      } : error || {
        name: 'UnknownError',
        message: 'An unknown error occurred',
        code: 'UNKNOWN_ERROR',
        suggestions: []
      };
      return {
        success: false,
        error: errorObj
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
    ...overrides
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
    ...overrides
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
    suggestions: []
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
    suggestions
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