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
} from './unified-types.js';

export {
  UnifiedValidator,
  isUnifiedValidationResult,
  isUnifiedExecutionContext
} from './unified-types.js';

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
} from './migration-adapters.js';

// ============================================================================
// Legacy Compatibility (temporary)
// ============================================================================

// Re-export some types with legacy names for backward compatibility
export type {
  UnifiedValidationError as ValidationError,
  UnifiedValidationResult as ValidationResult,
  UnifiedExecutionContext as TypedExecutionContext,
  UnifiedHyperScriptValue as HyperScriptValue,
  UnifiedHyperScriptValueType as HyperScriptValueType,
  UnifiedEvaluationType as EvaluationType,
  UnifiedASTNode as ASTNode,
  UnifiedParseError as ParseError,
  UnifiedLLMDocumentation as LLMDocumentation
} from './unified-types.js';

// ============================================================================
// Convenience Type Aliases
// ============================================================================

/**
 * Shorthand for unified validation result
 */
export type ValidResult<T> = UnifiedValidationResult<T>;

/**
 * Shorthand for unified execution context
 */
export type ExecContext = UnifiedExecutionContext;

/**
 * Shorthand for unified validation error
 */
export type ValidError = UnifiedValidationError;

// ============================================================================
// Common Type Combinations
// ============================================================================

/**
 * Common result type for async operations
 */
export type AsyncResult<T> = Promise<UnifiedResult<T>>;

/**
 * Common result type for async validation
 */
export type AsyncValidResult<T> = Promise<UnifiedValidationResult<T>>;

/**
 * Function type for validation
 */
export type ValidationFunction<T> = (input: unknown) => UnifiedValidationResult<T>;

/**
 * Function type for async validation
 */
export type AsyncValidationFunction<T> = (input: unknown) => Promise<UnifiedValidationResult<T>>;

// ============================================================================
// Default Exports
// ============================================================================

export { default as UnifiedTypes } from './unified-types.js';
export { default as MigrationAdapters } from './migration-adapters.js';