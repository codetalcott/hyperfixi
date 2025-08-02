/**
 * Unified Types - Public API
 * 
 * Single point of entry for all unified type definitions.
 * This file exports all core types that should be used throughout the codebase.
 */

// ============================================================================
// Core Unified Types
// ============================================================================

export type {
  UnifiedValidationError,
  UnifiedValidationResult,
  UnifiedHyperScriptValueType,
  UnifiedEvaluationType,
  UnifiedHyperScriptValue,
  UnifiedExecutionContext,
  UnifiedTypedExecutionContext,
  UnifiedResult,
  UnifiedTypedResult,
  UnifiedCommandCategory,
  UnifiedSideEffect,
  UnifiedExpressionCategory,
  UnifiedExpressionMetadata,
  UnifiedASTNode,
  UnifiedParseError,
  UnifiedLLMDocumentation
} from './unified-types';

export {
  UnifiedValidator,
  isUnifiedValidationResult,
  isUnifiedExecutionContext
} from './unified-types';

// ============================================================================
// Migration Support
// ============================================================================

export {
  TypeMigrationAdapter,
  migrateValidationResult,
  migrateExecutionContext,
  createUnifiedResult,
  normalizeValidationResult,
  assertUnifiedValidationResult,
  assertUnifiedExecutionContext
} from './migration-adapters';

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
  LLMDocumentation
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

export { default as UnifiedTypes } from './unified-types';
export { default as MigrationAdapters } from './migration-adapters';