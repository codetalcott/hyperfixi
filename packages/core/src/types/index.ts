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
// Core Context Types (Tree-shakeable foundation)
// ============================================================================

export type { CoreExecutionContext } from './core-context';
export {
  createCoreContext,
  isCoreExecutionContext,
  assertHTMLElement,
  asHTMLElement,
} from './core-context';

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
  // Note: Result is exported from './result' below (napi-rs inspired pattern)
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
// Legacy Compatibility (base-types not in unified-types)
// ============================================================================

// Export additional base types not already exported from unified-types
export type {
  ExpressionNode,
  CommandNode,
  EvaluationResult,
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

export { CoreTypes } from './unified-types';

// ============================================================================
// Result Pattern (napi-rs inspired - Rust Result<T, E>)
// ============================================================================

export type {
  Result,
  Ok,
  Err,
  ExecutionSignal,
  HaltSignal,
  ExitSignal,
  BreakSignal,
  ContinueSignal,
  ReturnSignal,
  ExecutionResult,
  OperationResult,
  ExecutionError,
} from './result';

export {
  ok,
  err,
  halt,
  exit,
  breakLoop,
  continueLoop,
  returnValue,
  isOk,
  isErr,
  isSignal,
  isSignalResult,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  map,
  mapErr,
  andThen,
  fromPromise,
  fromThrowable,
  fromAsyncThrowable,
} from './result';

// ============================================================================
// Command Metadata System (napi-rs inspired patterns)
// ============================================================================

export type {
  CommandCategory as StandardCommandCategory,
  CommandSideEffect,
  CommandMetadata,
  MetadataValidationResult,
  CommandRegistryEntry,
} from './command-metadata';

export {
  COMMAND_CATEGORIES,
  COMMAND_SIDE_EFFECTS,
  validateCommandMetadata,
  normalizeCategory,
  createCommandMetadata,
  mergeCommandMetadata,
  getSyntaxArray,
  formatMetadataForDocs,
  CommandMetadataRegistry,
  commandMetadataRegistry,
} from './command-metadata';

// ============================================================================
// htmx-like Feature Types
// ============================================================================

// Swap Executor types
export type {
  SwapStrategy,
  SwapExecutionOptions,
} from '../lib/swap-executor';

// Morph Adapter types
export type {
  MorphOptions,
  MorphEngine,
} from '../lib/morph-adapter';

// View Transitions types
export type {
  TransitionCallback,
  ViewTransitionOptions,
  ViewTransitionsConfig,
} from '../lib/view-transitions';

// Behavior types
export type {
  HistorySwapConfig,
  HistorySwapInstance,
} from '../behaviors/history-swap';

export type {
  BoostedConfig,
  BoostedInstance,
} from '../behaviors/boosted';

// Swap Command types
export type {
  SwapCommandInput,
} from '../commands/dom/swap';

// URL Command types
export type {
  PushUrlCommandInput,
} from '../commands/navigation/push-url';

export type {
  ReplaceUrlCommandInput,
} from '../commands/navigation/replace-url';
