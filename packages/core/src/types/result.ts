/**
 * Result Type Pattern for HyperFixi Runtime
 *
 * Inspired by napi-rs's use of Rust's Result<T, E> pattern.
 * Provides explicit, type-safe error handling without exceptions.
 *
 * Key benefits:
 * - Eliminates try-catch overhead on hot paths
 * - Control flow signals are explicit, not exceptional
 * - Type-safe with discriminated unions
 * - Better stack traces (no exception unwinding)
 *
 * @module types/result
 */

// ============================================================================
// Core Result Types
// ============================================================================

/**
 * A Result type representing either success (Ok) or failure (Err).
 * Based on Rust's Result<T, E> pattern.
 *
 * @template T - The success value type
 * @template E - The error type (defaults to Error)
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Represents a successful result containing a value.
 */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Represents a failed result containing an error.
 */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

// ============================================================================
// Execution-Specific Types
// ============================================================================

/**
 * Control flow signals that are NOT errors.
 * These represent intentional execution flow changes, not failures.
 */
export type ExecutionSignal = HaltSignal | ExitSignal | BreakSignal | ContinueSignal | ReturnSignal;

export interface HaltSignal {
  readonly type: 'halt';
}

export interface ExitSignal {
  readonly type: 'exit';
  readonly returnValue?: unknown;
}

export interface BreakSignal {
  readonly type: 'break';
}

export interface ContinueSignal {
  readonly type: 'continue';
}

export interface ReturnSignal {
  readonly type: 'return';
  readonly returnValue?: unknown;
}

/**
 * Result type specifically for execution operations.
 * Can return either a value or a control flow signal.
 */
export type ExecutionResult<T> = Result<T, ExecutionSignal>;

/**
 * Result type for operations that can fail with an error.
 * Distinct from ExecutionResult which handles control flow.
 */
export type OperationResult<T> = Result<T, ExecutionError>;

/**
 * Structured error for operation failures.
 * Supports error chaining for debugging complex failures.
 */
export interface ExecutionError {
  readonly code: string;
  readonly message: string;
  /** Original error that caused this failure (for error chain preservation) */
  readonly cause?: ExecutionError | Error;
  readonly context?: ExecutionErrorContext;
}

/**
 * Context information for execution errors.
 * Provides additional details for debugging.
 */
export interface ExecutionErrorContext {
  /** The command being executed when error occurred */
  command?: string;
  /** Input that triggered the error */
  input?: unknown;
  /** Element selector or reference */
  element?: string;
  /** Execution phase where error occurred */
  phase?: 'parse' | 'validate' | 'execute';
  /** Additional context properties */
  [key: string]: unknown;
}

// ============================================================================
// Constructor Functions
// ============================================================================

/**
 * Creates a successful Result.
 *
 * @example
 * const result = ok(42);
 * // result.ok === true, result.value === 42
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Creates a failed Result.
 *
 * @example
 * const result = err({ type: 'halt' });
 * // result.ok === false, result.error.type === 'halt'
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

// ============================================================================
// Signal Constructors
// ============================================================================

/**
 * Creates a halt signal result.
 */
export function halt(): Err<HaltSignal> {
  return err({ type: 'halt' });
}

/**
 * Creates an exit signal result with optional return value.
 */
export function exit(returnValue?: unknown): Err<ExitSignal> {
  return err({ type: 'exit', returnValue });
}

/**
 * Creates a break signal result.
 */
export function breakLoop(): Err<BreakSignal> {
  return err({ type: 'break' });
}

/**
 * Creates a continue signal result.
 */
export function continueLoop(): Err<ContinueSignal> {
  return err({ type: 'continue' });
}

/**
 * Creates a return signal result with optional return value.
 */
export function returnValue(value?: unknown): Err<ReturnSignal> {
  return err({ type: 'return', returnValue: value });
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a Result is Ok.
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/**
 * Type guard to check if a Result is Err.
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

/**
 * Type guard to check if an error is a control flow signal.
 */
export function isSignal(error: unknown): error is ExecutionSignal {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as ExecutionSignal).type === 'string' &&
    ['halt', 'exit', 'break', 'continue', 'return'].includes((error as ExecutionSignal).type)
  );
}

/**
 * Type guard to check if a Result contains a signal.
 */
export function isSignalResult<T>(result: Result<T, unknown>): result is Err<ExecutionSignal> {
  if (isOk(result)) return false;
  return isSignal((result as Err<unknown>).error);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Unwraps a Result, returning the value or throwing the error.
 * Use sparingly - prefer pattern matching with isOk/isErr.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw (result as Err<E>).error;
}

/**
 * Unwraps a Result, returning the value or a default.
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Unwraps a Result, returning the value or computing a default.
 */
export function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
  if (isOk(result)) {
    return result.value;
  }
  return fn((result as Err<E>).error);
}

/**
 * Maps a Result's value if Ok, otherwise returns Err unchanged.
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result as Err<E>;
}

/**
 * Maps a Result's error if Err, otherwise returns Ok unchanged.
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isOk(result)) {
    return result;
  }
  return err(fn((result as Err<E>).error));
}

/**
 * Chains Result operations, similar to flatMap/bind.
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result as Err<E>;
}

/**
 * Converts a Promise that might throw to a Promise<Result>.
 * Useful for wrapping existing exception-based code.
 */
export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Converts a throwing function to one that returns Result.
 */
export function fromThrowable<T, A extends unknown[]>(
  fn: (...args: A) => T
): (...args: A) => Result<T, Error> {
  return (...args: A) => {
    try {
      return ok(fn(...args));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  };
}

/**
 * Converts an async throwing function to one that returns Promise<Result>.
 */
export function fromAsyncThrowable<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>
): (...args: A) => Promise<Result<T, Error>> {
  return async (...args: A) => {
    try {
      const value = await fn(...args);
      return ok(value);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  };
}
