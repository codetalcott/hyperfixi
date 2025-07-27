/**
 * Type Migration Adapters
 * 
 * Provides compatibility bridges between legacy type definitions and the new
 * unified type system, allowing for gradual migration without breaking changes.
 */

import type {
  UnifiedValidationError,
  UnifiedValidationResult,
  UnifiedExecutionContext,
  UnifiedHyperScriptValue,
  UnifiedResult,
  UnifiedTypedResult
} from './unified-types.js';

// ============================================================================
// Legacy Type Definitions (for compatibility)
// ============================================================================

/**
 * Legacy ValidationResult formats found in codebase
 */
interface LegacyValidationResultSuccess<T> {
  success: true;
  data: T;
}

interface LegacyValidationResultError {
  success: false;
  error: {
    type: string;
    message: string;
    suggestion?: string;
    suggestions?: string | string[];
  };
}

type LegacyValidationResult<T> = LegacyValidationResultSuccess<T> | LegacyValidationResultError;

/**
 * Legacy ValidationError formats
 */
interface LegacyValidationError {
  type: string;
  message: string;
  suggestion?: string;
  suggestions?: string | string[];
  path?: string;
  code?: string;
}

/**
 * Legacy ExecutionContext format
 */
interface LegacyExecutionContext {
  me?: HTMLElement | null;
  it?: unknown;
  you?: HTMLElement | null;
  locals?: Map<string, unknown> | Record<string, unknown>;
  globals?: Map<string, unknown> | Record<string, unknown>;
  variables?: Map<string, unknown> | Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================================
// Migration Adapter Class
// ============================================================================

export class TypeMigrationAdapter {
  /**
   * Convert legacy ValidationResult to unified format
   */
  static adaptValidationResult<T>(
    legacy: unknown
  ): UnifiedValidationResult<T> {
    if (!legacy || typeof legacy !== 'object') {
      return this.createErrorResult('Invalid validation result format');
    }

    const legacyObj = legacy as any;

    // Handle {success, data, error} format
    if ('success' in legacyObj) {
      if (legacyObj.success === true) {
        return {
          isValid: true,
          errors: [],
          suggestions: [],
          data: legacyObj.data
        };
      } else {
        return {
          isValid: false,
          errors: legacyObj.error ? [this.adaptError(legacyObj.error)] : [],
          suggestions: this.extractSuggestions(legacyObj.error || legacyObj),
          data: undefined
        };
      }
    }
    
    // Handle {isValid, errors, suggestions} format (already unified)
    if ('isValid' in legacyObj) {
      return {
        isValid: legacyObj.isValid,
        errors: Array.isArray(legacyObj.errors) 
          ? legacyObj.errors.map((err: any) => this.adaptError(err))
          : [],
        suggestions: this.ensureStringArray(legacyObj.suggestions || []),
        data: legacyObj.data
      };
    }
    
    // Handle direct error object
    if ('type' in legacyObj && 'message' in legacyObj) {
      return {
        isValid: false,
        errors: [this.adaptError(legacyObj)],
        suggestions: this.extractSuggestions(legacyObj)
      };
    }
    
    // Unknown format
    return this.createErrorResult('Unknown validation result format');
  }

  /**
   * Convert legacy ValidationError to unified format
   */
  static adaptError(error: unknown): UnifiedValidationError {
    if (!error || typeof error !== 'object') {
      return {
        type: 'runtime-error',
        message: 'Unknown error',
        suggestions: ['Check error details']
      };
    }

    const errorObj = error as any;

    return {
      type: this.normalizeErrorType(errorObj.type || 'runtime-error'),
      message: errorObj.message || 'Unknown error',
      suggestions: this.extractSuggestions(errorObj),
      path: errorObj.path,
      code: errorObj.code
    };
  }

  /**
   * Convert legacy ExecutionContext to unified format
   */
  static adaptExecutionContext(legacy: unknown): UnifiedExecutionContext {
    if (!legacy || typeof legacy !== 'object') {
      return this.createDefaultContext();
    }

    const legacyObj = legacy as any;

    return {
      me: legacyObj.me || null,
      it: legacyObj.it || null,
      you: legacyObj.you || null,
      locals: this.ensureMap(legacyObj.locals),
      globals: this.ensureMap(legacyObj.globals),
      variables: this.ensureMap(legacyObj.variables),
      evaluationHistory: Array.isArray(legacyObj.evaluationHistory) 
        ? legacyObj.evaluationHistory 
        : []
    };
  }

  /**
   * Convert unified ValidationResult back to legacy format (for backward compatibility)
   */
  static toLegacyValidationResult<T>(
    unified: UnifiedValidationResult<T>
  ): LegacyValidationResult<T> {
    if (unified.isValid) {
      return {
        success: true,
        data: unified.data!
      };
    } else {
      return {
        success: false,
        error: {
          type: unified.errors[0]?.type || 'runtime-error',
          message: unified.errors[0]?.message || 'Validation failed',
          suggestions: unified.suggestions
        }
      };
    }
  }

  /**
   * Convert unified Result to legacy format
   */
  static toLegacyResult<T>(unified: UnifiedResult<T>): any {
    return {
      success: unified.success,
      value: unified.value,
      error: unified.error,
      type: unified.type
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private static extractSuggestions(obj: any): string[] {
    if (Array.isArray(obj.suggestions)) {
      return obj.suggestions.filter((s: unknown) => typeof s === 'string');
    }
    
    if (typeof obj.suggestions === 'string') {
      return [obj.suggestions];
    }
    
    if (typeof obj.suggestion === 'string') {
      return [obj.suggestion];
    }
    
    if (Array.isArray(obj.suggestion)) {
      return obj.suggestion.filter((s: unknown) => typeof s === 'string');
    }
    
    return ['Review input and try again'];
  }

  private static ensureStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item: unknown) => typeof item === 'string');
    }
    
    if (typeof value === 'string') {
      return [value];
    }
    
    return [];
  }

  private static ensureMap(value: unknown): Map<string, unknown> {
    if (value instanceof Map) {
      return value;
    }
    
    if (value && typeof value === 'object') {
      return new Map(Object.entries(value));
    }
    
    return new Map();
  }

  private static normalizeErrorType(type: string): UnifiedValidationError['type'] {
    switch (type.toLowerCase()) {
      case 'type-mismatch':
      case 'typemismatch':
        return 'type-mismatch';
      case 'missing-argument':
      case 'missingargument':
        return 'missing-argument';
      case 'validation-error':
      case 'validationerror':
        return 'validation-error';
      case 'runtime-error':
      case 'runtimeerror':
        return 'runtime-error';
      default:
        return 'runtime-error';
    }
  }

  private static createErrorResult<T>(message: string): UnifiedValidationResult<T> {
    return {
      isValid: false,
      errors: [{
        type: 'runtime-error',
        message,
        suggestions: ['Use UnifiedValidationResult interface']
      }],
      suggestions: ['Migrate to unified type system']
    };
  }

  private static createDefaultContext(): UnifiedExecutionContext {
    return {
      me: null,
      it: null,
      you: null,
      locals: new Map(),
      globals: new Map(),
      variables: new Map(),
      evaluationHistory: []
    };
  }
}

// ============================================================================
// Convenience Functions for Common Migrations
// ============================================================================

/**
 * Quick migration function for validation results
 */
export function migrateValidationResult<T>(
  legacy: unknown
): UnifiedValidationResult<T> {
  return TypeMigrationAdapter.adaptValidationResult<T>(legacy);
}

/**
 * Quick migration function for execution contexts
 */
export function migrateExecutionContext(
  legacy: unknown
): UnifiedExecutionContext {
  return TypeMigrationAdapter.adaptExecutionContext(legacy);
}

/**
 * Create a unified validation result from legacy components
 */
export function createUnifiedResult<T>(
  isValid: boolean,
  data?: T,
  errors: unknown[] = [],
  suggestions: string[] = []
): UnifiedValidationResult<T> {
  return {
    isValid,
    errors: errors.map(err => TypeMigrationAdapter.adaptError(err)),
    suggestions,
    data
  };
}

/**
 * Convert any validation result format to unified format
 */
export function normalizeValidationResult<T>(
  result: unknown
): UnifiedValidationResult<T> {
  if (result && typeof result === 'object' && 'isValid' in result) {
    // Already in unified format, but ensure structure is correct
    return TypeMigrationAdapter.adaptValidationResult<T>(result);
  }
  
  // Legacy format or unknown format
  return TypeMigrationAdapter.adaptValidationResult<T>(result);
}

// ============================================================================
// Type Assertion Helpers
// ============================================================================

/**
 * Assert that a value conforms to unified validation result
 */
export function assertUnifiedValidationResult<T>(
  value: unknown,
  errorMessage?: string
): asserts value is UnifiedValidationResult<T> {
  if (!value || typeof value !== 'object') {
    throw new Error(errorMessage || 'Value is not a UnifiedValidationResult');
  }
  
  const obj = value as any;
  if (typeof obj.isValid !== 'boolean') {
    throw new Error(errorMessage || 'UnifiedValidationResult must have boolean isValid property');
  }
  
  if (!Array.isArray(obj.errors)) {
    throw new Error(errorMessage || 'UnifiedValidationResult must have errors array');
  }
  
  if (!Array.isArray(obj.suggestions)) {
    throw new Error(errorMessage || 'UnifiedValidationResult must have suggestions array');
  }
}

/**
 * Assert that a value conforms to unified execution context
 */
export function assertUnifiedExecutionContext(
  value: unknown,
  errorMessage?: string
): asserts value is UnifiedExecutionContext {
  if (!value || typeof value !== 'object') {
    throw new Error(errorMessage || 'Value is not a UnifiedExecutionContext');
  }
  
  const obj = value as any;
  if (!(obj.locals instanceof Map)) {
    throw new Error(errorMessage || 'UnifiedExecutionContext must have locals Map');
  }
  
  if (!(obj.globals instanceof Map)) {
    throw new Error(errorMessage || 'UnifiedExecutionContext must have globals Map');
  }
  
  if (!(obj.variables instanceof Map)) {
    throw new Error(errorMessage || 'UnifiedExecutionContext must have variables Map');
  }
}

export default {
  TypeMigrationAdapter,
  migrateValidationResult,
  migrateExecutionContext,
  createUnifiedResult,
  normalizeValidationResult,
  assertUnifiedValidationResult,
  assertUnifiedExecutionContext
};