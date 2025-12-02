/**
 * Unified Types - Public API
 *
 * Single point of entry for all unified type definitions.
 * This file exports all core types that should be used throughout the codebase.
 */

// Import base types for use in type aliases
import type {
  ValidationResult,
  ValidationError,
  EvaluationResult,
  ExecutionContext,
} from './base-types';

// ============================================================================
// Core Unified Types
// ============================================================================

export type {
  ValidationError,
  ValidationResult,
  HyperScriptValueType,
  EvaluationType,
  HyperScriptValue,
  ExecutionContext,
  TypedExecutionContext,
  Result,
  TypedResult,
  CommandCategory,
  SideEffect,
  ExpressionCategory,
  ExpressionMetadata,
  ASTNode,
  ParseError,
  LLMDocumentation,
} from './unified-types';

export {
  Validator,
  isValidationResult,
  isExecutionContext,
} from './unified-types';

// ============================================================================
// Migration Support (removed - migration-adapters.ts deleted)
// ============================================================================
// Migration adapters removed as they were unused (0 imports)

// ============================================================================
// Legacy Compatibility (temporary)
// ============================================================================

// Export base types for runtime usage
export type {
  ExpressionNode,
  CommandNode,
  ValidationResult,
  ValidationError,
  EvaluationResult,
  ExecutionContext,
  TypedExecutionContext,
  HyperScriptValueType,
  EvaluationType,
  ASTNode,
  ParseError,
  LLMDocumentation,
  EventHandlerNode,
  BehaviorNode,
  DefNode,
} from './base-types';

// ============================================================================
// Convenience Type Aliases
// ============================================================================

/**
 * Shorthand for unified validation result
 */
export type ValidResult<T> = ValidationResult<T>;

/**
 * Shorthand for unified execution context
 */
export type ExecContext = ExecutionContext;

/**
 * Shorthand for unified validation error
 */
export type ValidError = ValidationError;

// ============================================================================
// Common Type Combinations
// ============================================================================

/**
 * Common result type for async operations
 */
export type AsyncResult<T> = Promise<EvaluationResult<T>>;

/**
 * Common result type for async validation
 */
export type AsyncValidResult<T> = Promise<ValidationResult<T>>;

/**
 * Function type for validation
 */
export type ValidationFunction<T> = (input: unknown) => ValidationResult<T>;

/**
 * Function type for async validation
 */
export type AsyncValidationFunction<T> = (input: unknown) => Promise<ValidationResult<T>>;

// ============================================================================
// Default Exports
// ============================================================================

export { default as CoreTypes } from './unified-types';
