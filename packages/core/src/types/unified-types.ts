/**
 * Unified Type System - Single Source of Truth
 *
 * This file consolidates all core type definitions to resolve architectural
 * conflicts and establish consistent types across the HyperFixi codebase.
 */

import type { RuntimeValidator } from '../validation/lightweight-validators';

// ============================================================================
// Core Validation Types
// ============================================================================

/**
 * Unified validation error interface - replaces all fragmented error types
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
  readonly suggestions: string[]; // Always array, never string
  readonly path?: string;
  readonly code?: string;
}

/**
 * Unified validation result interface - replaces all ValidationResult variants
 */
export interface ValidationResult<T = unknown> {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
  readonly suggestions: string[];
  readonly data?: T;
}

// ============================================================================
// Core Value Types
// ============================================================================

/**
 * Unified HyperScript value type - consolidates all value type definitions
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
 * Unified evaluation type - consolidates EvaluationType definitions
 */
export type EvaluationType =
  | HyperScriptValueType
  | 'Any'
  | 'Context'
  | 'Command'
  | 'Expression';

/**
 * Unified HyperScript value - actual value container
 */
export type HyperScriptValue =
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
export interface ExecutionContext {
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
export interface TypedExecutionContext extends ExecutionContext {
  readonly typeRegistry: Map<string, RuntimeValidator>;
  readonly validationCache: Map<string, ValidationResult>;
}

// ============================================================================
// Core Result Types
// ============================================================================

/**
 * Unified result type for operations that can succeed or fail
 */
export interface Result<T = unknown> {
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
export interface TypedResult<T = unknown> extends Result<T> {
  readonly errors?: ValidationError[];
  readonly suggestions?: string[];
}

// ============================================================================
// Core Command Types
// ============================================================================

/**
 * Unified command category - consolidates all command categories
 */
export type CommandCategory =
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
export type SideEffect =
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
export type ExpressionCategory =
  | 'Reference'
  | 'Property'
  | 'Logical'
  | 'Mathematical'
  | 'Conversion'
  | 'Positional'
  | 'Special';

/**
 * Unified expression metadata
 * Only category and complexity are required; rest is optional documentation
 */
export interface ExpressionMetadata {
  readonly category: ExpressionCategory;
  readonly complexity: 'simple' | 'medium' | 'complex';
  // Optional documentation fields
  readonly sideEffects?: SideEffect[];
  readonly dependencies?: string[];
  readonly returnTypes?: EvaluationType[];
  readonly examples?: Array<{
    readonly input: string;
    readonly description: string;
    readonly expectedOutput: unknown;
    readonly context?: Partial<ExecutionContext>;
  }>;
  readonly relatedExpressions?: string[];
  readonly performance?: {
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
export interface ASTNode {
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
export interface ParseError {
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
export interface LLMDocumentation {
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
export class Validator {
  /**
   * Validate input against a Zod schema with unified error formatting
   */
  static validateInput<T>(input: unknown, schema: RuntimeValidator<T>): ValidationResult<T> {
    try {
      const parsed = schema.safeParse(input);

      if (!parsed.success) {
        return {
          isValid: false,
          errors:
            parsed.error?.errors.map(err => ({
              type: 'type-mismatch' as const,
              message: `Invalid input: ${err.message}`,
              suggestions: [
                'Check input structure',
                'Verify all required properties are provided',
                'Ensure property types match schema',
              ],
              path: Array.isArray(err.path) ? err.path.join('.') : String(err.path),
            })) || [],
          suggestions: ['Review input format and try again'],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        ...(parsed.data !== undefined && { data: parsed.data }),
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            type: 'runtime-error' as const,
            message: 'Validation failed with exception',
            suggestions: ['Check input structure and types'],
          },
        ],
        suggestions: ['Verify input is in correct format'],
      };
    }
  }

  /**
   * Create a validation error with consistent format
   */
  static createValidationError(
    type: ValidationError['type'],
    message: string,
    suggestions: string[] = [],
    path?: string,
    code?: string
  ): ValidationError {
    return {
      type,
      message,
      suggestions,
      ...(path !== undefined && { path }),
      ...(code !== undefined && { code }),
    };
  }

  /**
   * Create a validation result for success cases
   */
  static createSuccessResult<T>(data: T): ValidationResult<T> {
    return {
      isValid: true,
      errors: [],
      suggestions: [],
      data,
    };
  }

  /**
   * Create a validation result for error cases
   */
  static createErrorResult<T>(
    errors: ValidationError[],
    suggestions: string[] = []
  ): ValidationResult<T> {
    return {
      isValid: false,
      errors,
      suggestions,
    };
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for ValidationResult
 */
export function isValidationResult<T>(value: unknown): value is ValidationResult<T> {
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
 * Type guard for ExecutionContext
 */
export function isExecutionContext(value: unknown): value is ExecutionContext {
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
  Validator,
  isValidationResult,
  isExecutionContext,
};
