/**
 * Unified Type System - Single Source of Truth
 * 
 * This file consolidates all core type definitions to resolve architectural
 * conflicts and establish consistent types across the HyperFixi codebase.
 */

import { v, type RuntimeValidator } from '../validation/lightweight-validators';

// ============================================================================
// Core Validation Types
// ============================================================================

/**
 * Unified validation error interface - replaces all fragmented error types
 */
export interface UnifiedValidationError {
  readonly type: 'type-mismatch' | 'missing-argument' | 'runtime-error' | 'validation-error' | 'syntax-error' | 'invalid-argument';
  readonly message: string;
  readonly suggestions: string[]; // Always array, never string
  readonly path?: string;
  readonly code?: string;
}

/**
 * Unified validation result interface - replaces all ValidationResult variants
 */
export interface UnifiedValidationResult<T = unknown> {
  readonly isValid: boolean;
  readonly errors: UnifiedValidationError[];
  readonly suggestions: string[];
  readonly data?: T;
}

// ============================================================================
// Core Value Types
// ============================================================================

/**
 * Unified HyperScript value type - consolidates all value type definitions
 */
export type UnifiedHyperScriptValueType = 
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
  | 'event';

/**
 * Unified evaluation type - consolidates EvaluationType definitions
 */
export type UnifiedEvaluationType = UnifiedHyperScriptValueType | 'Any' | 'Context' | 'Command' | 'Expression';

/**
 * Unified HyperScript value - actual value container
 */
export type UnifiedHyperScriptValue = 
  | string 
  | number 
  | boolean 
  | HTMLElement 
  | HTMLElement[] 
  | unknown[] 
  | Record<string, unknown> 
  | Promise<unknown> 
  | DocumentFragment 
  | null 
  | undefined 
  | Function 
  | Event;

// ============================================================================
// Core Context Types
// ============================================================================

/**
 * Unified execution context - consolidates all context definitions
 */
export interface UnifiedExecutionContext {
  readonly me: HTMLElement | null;
  it: unknown;
  readonly you: HTMLElement | null;
  readonly event: Event | null;
  readonly locals: Map<string, unknown>;
  readonly globals: Map<string, unknown>;
  readonly variables: Map<string, unknown>;
  readonly evaluationHistory: Array<{
    readonly expressionName: string;
    readonly category: string;
    readonly input: string;
    readonly output: unknown;
    readonly timestamp: number;
    readonly duration: number;
    readonly success: boolean;
  }>;
}

/**
 * Enhanced execution context with additional typing information
 */
export interface UnifiedTypedExecutionContext extends UnifiedExecutionContext {
  readonly typeRegistry: Map<string, z.ZodSchema>;
  readonly validationCache: Map<string, UnifiedValidationResult>;
}

// ============================================================================
// Core Result Types
// ============================================================================

/**
 * Unified result type for operations that can succeed or fail
 */
export interface UnifiedResult<T = unknown> {
  readonly success: boolean;
  readonly value?: T;
  readonly error?: {
    readonly name: string;
    readonly message: string;
    readonly code?: string;
    readonly suggestions?: string[];
  };
  readonly type?: string;
}

/**
 * Unified typed result with validation information
 */
export interface UnifiedTypedResult<T = unknown> extends UnifiedResult<T> {
  readonly errors?: UnifiedValidationError[];
  readonly suggestions?: string[];
}

// ============================================================================
// Core Command Types
// ============================================================================

/**
 * Unified command category - consolidates all command categories
 */
export type UnifiedCommandCategory = 
  | 'dom-manipulation' 
  | 'event-handling' 
  | 'data-processing' 
  | 'control-flow' 
  | 'animation' 
  | 'network' 
  | 'utility' 
  | 'navigation'
  | 'templates'
  | 'advanced';

/**
 * Unified side effect types
 */
export type UnifiedSideEffect = 
  | 'dom-mutation' 
  | 'network-request' 
  | 'local-storage' 
  | 'global-state' 
  | 'event-emission' 
  | 'timer-creation' 
  | 'navigation' 
  | 'dom-query' 
  | 'history'
  | 'async'
  | 'attribute-transfer';

// ============================================================================
// Core Expression Types
// ============================================================================

/**
 * Unified expression category
 */
export type UnifiedExpressionCategory = 
  | 'Reference' 
  | 'Property' 
  | 'Logical' 
  | 'Mathematical' 
  | 'Conversion' 
  | 'Positional' 
  | 'Special';

/**
 * Unified expression metadata
 */
export interface UnifiedExpressionMetadata {
  readonly category: UnifiedExpressionCategory;
  readonly complexity: 'simple' | 'medium' | 'complex';
  readonly sideEffects: UnifiedSideEffect[];
  readonly dependencies: string[];
  readonly returnTypes: UnifiedEvaluationType[];
  readonly examples: Array<{
    readonly input: string;
    readonly description: string;
    readonly expectedOutput: unknown;
    readonly context?: Partial<UnifiedExecutionContext>;
  }>;
  readonly relatedExpressions: string[];
  readonly performance: {
    readonly averageTime: number;
    readonly complexity: string;
  };
}

// ============================================================================
// Core AST Types
// ============================================================================

/**
 * Unified AST node interface
 */
export interface UnifiedASTNode {
  readonly type: string;
  readonly line?: number;
  readonly column?: number;
  readonly start?: number;
  readonly end?: number;
  readonly raw?: string;
  readonly [key: string]: unknown;
}

/**
 * Unified parse error interface
 */
export interface UnifiedParseError {
  readonly name: string;
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly source?: string;
}

// ============================================================================
// Core Documentation Types
// ============================================================================

/**
 * Unified LLM documentation interface
 */
export interface UnifiedLLMDocumentation {
  readonly summary: string;
  readonly parameters: Array<{
    readonly name: string;
    readonly type: string;
    readonly description: string;
    readonly optional: boolean;
    readonly examples: string[];
  }>;
  readonly returns: {
    readonly type: string;
    readonly description: string;
    readonly examples: string[];
  };
  readonly examples: Array<{
    readonly title: string;
    readonly code: string;
    readonly explanation: string;
    readonly output: unknown;
  }>;
  readonly seeAlso: string[];
  readonly tags: string[];
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Unified validator class for consistent validation across codebase
 */
export class UnifiedValidator {
  /**
   * Validate input against a Zod schema with unified error formatting
   */
  static validateInput<T>(
    input: unknown,
    schema: z.ZodSchema<T>
  ): UnifiedValidationResult<T> {
    try {
      const parsed = schema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch' as const,
            message: `Invalid input: ${err.message}`,
            suggestions: [
              'Check input structure',
              'Verify all required properties are provided',
              'Ensure property types match schema'
            ],
            path: err.path.join('.')
          })),
          suggestions: ['Review input format and try again']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: parsed.data
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error' as const,
          message: 'Validation failed with exception',
          suggestions: ['Check input structure and types']
        }],
        suggestions: ['Verify input is in correct format']
      };
    }
  }

  /**
   * Create a validation error with consistent format
   */
  static createValidationError(
    type: UnifiedValidationError['type'],
    message: string,
    suggestions: string[] = [],
    path?: string,
    code?: string
  ): UnifiedValidationError {
    return {
      type,
      message,
      suggestions,
      ...(path !== undefined && { path }),
      ...(code !== undefined && { code })
    };
  }

  /**
   * Create a validation result for success cases
   */
  static createSuccessResult<T>(data: T): UnifiedValidationResult<T> {
    return {
      isValid: true,
      errors: [],
      suggestions: [],
      data
    };
  }

  /**
   * Create a validation result for error cases
   */
  static createErrorResult<T>(
    errors: UnifiedValidationError[],
    suggestions: string[] = []
  ): UnifiedValidationResult<T> {
    return {
      isValid: false,
      errors,
      suggestions
    };
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for UnifiedValidationResult
 */
export function isUnifiedValidationResult<T>(
  value: unknown
): value is UnifiedValidationResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isValid' in value &&
    typeof (value as any).isValid === 'boolean' &&
    'errors' in value &&
    Array.isArray((value as any).errors) &&
    'suggestions' in value &&
    Array.isArray((value as any).suggestions)
  );
}

/**
 * Type guard for UnifiedExecutionContext
 */
export function isUnifiedExecutionContext(
  value: unknown
): value is UnifiedExecutionContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'locals' in value &&
    (value as any).locals instanceof Map &&
    'globals' in value &&
    (value as any).globals instanceof Map &&
    'variables' in value &&
    (value as any).variables instanceof Map
  );
}

// ============================================================================
// Exports
// ============================================================================

export default {
  UnifiedValidator,
  isUnifiedValidationResult,
  isUnifiedExecutionContext
};