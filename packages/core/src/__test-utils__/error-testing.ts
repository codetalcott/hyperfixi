/**
 * Type-safe error testing utilities
 * Provides helpers to replace 'catch (error: any)' patterns in tests
 */

/**
 * Assert that a value is an Error instance
 */
export function assertIsError(value: unknown): asserts value is Error {
  if (!(value instanceof Error)) {
    throw new Error(`Expected Error, got ${typeof value}: ${String(value)}`);
  }
}

/**
 * Assert that a value is a specific Error type
 */
export function assertErrorType<T extends Error>(
  value: unknown,
  ErrorType: new (...args: unknown[]) => T
): asserts value is T {
  if (!(value instanceof ErrorType)) {
    const actualType = value instanceof Error ? value.constructor.name : typeof value;
    throw new Error(`Expected ${ErrorType.name}, got ${actualType}`);
  }
}

/**
 * Check if an error message matches a pattern
 */
export function expectErrorMessage(error: unknown, pattern: string | RegExp): void {
  assertIsError(error);

  if (typeof pattern === 'string') {
    if (!error.message.includes(pattern)) {
      throw new Error(`Expected error message to include "${pattern}", got "${error.message}"`);
    }
  } else {
    if (!pattern.test(error.message)) {
      throw new Error(`Expected error message to match ${pattern}, got "${error.message}"`);
    }
  }
}

/**
 * Expect a function to throw a specific error
 */
export function expectThrows<T extends Error = Error>(
  fn: () => void,
  ErrorType?: new (...args: unknown[]) => T,
  messagePattern?: string | RegExp
): T {
  let thrownError: unknown;

  try {
    fn();
  } catch (error) {
    thrownError = error;
  }

  if (thrownError === undefined) {
    const errorName = ErrorType ? ErrorType.name : 'Error';
    throw new Error(`Expected ${errorName} to be thrown, but nothing was thrown`);
  }

  if (ErrorType) {
    assertErrorType(thrownError, ErrorType);
  } else {
    assertIsError(thrownError);
  }

  if (messagePattern) {
    expectErrorMessage(thrownError, messagePattern);
  }

  return thrownError as T;
}

/**
 * Expect an async function to throw a specific error
 */
export async function expectThrowsAsync<T extends Error = Error>(
  fn: () => Promise<void>,
  ErrorType?: new (...args: unknown[]) => T,
  messagePattern?: string | RegExp
): Promise<T> {
  let thrownError: unknown;

  try {
    await fn();
  } catch (error) {
    thrownError = error;
  }

  if (thrownError === undefined) {
    const errorName = ErrorType ? ErrorType.name : 'Error';
    throw new Error(`Expected ${errorName} to be thrown, but nothing was thrown`);
  }

  if (ErrorType) {
    assertErrorType(thrownError, ErrorType);
  } else {
    assertIsError(thrownError);
  }

  if (messagePattern) {
    expectErrorMessage(thrownError, messagePattern);
  }

  return thrownError as T;
}

/**
 * Safe error handler that narrows unknown to Error
 */
export function handleError<T>(
  error: unknown,
  handler: (error: Error) => T,
  fallback?: (value: unknown) => T
): T {
  if (error instanceof Error) {
    return handler(error);
  }

  if (fallback) {
    return fallback(error);
  }

  // Convert non-Error to Error
  const errorMessage = typeof error === 'string' ? error : String(error);
  return handler(new Error(errorMessage));
}

/**
 * Type guard for errors with specific properties
 */
export function hasErrorProperty<K extends string>(
  error: unknown,
  property: K
): error is Error & Record<K, unknown> {
  return error instanceof Error && property in error;
}

/**
 * Get error property safely
 */
export function getErrorProperty<T = unknown>(error: unknown, property: string): T | undefined {
  if (hasErrorProperty(error, property)) {
    return (error as Record<string, unknown>)[property] as T;
  }
  return undefined;
}

/**
 * Assert error has a specific property
 */
export function assertErrorHasProperty<K extends string>(
  error: unknown,
  property: K
): asserts error is Error & Record<K, unknown> {
  assertIsError(error);
  if (!(property in error)) {
    throw new Error(`Expected error to have property '${property}'`);
  }
}

/**
 * Create a typed error expectation helper
 * Useful for complex error assertions
 */
export interface ErrorExpectation<T extends Error = Error> {
  type?: new (...args: unknown[]) => T;
  message?: string | RegExp;
  code?: string;
  properties?: Record<string, unknown>;
}

/**
 * Expect a function to throw an error matching the expectation
 */
export function expectThrowsMatching<T extends Error = Error>(
  fn: () => void,
  expectation: ErrorExpectation<T>
): T {
  const error = expectThrows(fn, expectation.type, expectation.message);

  if (expectation.code !== undefined) {
    const code = getErrorProperty<string>(error, 'code');
    if (code !== expectation.code) {
      throw new Error(`Expected error code '${expectation.code}', got '${code}'`);
    }
  }

  if (expectation.properties) {
    for (const [key, value] of Object.entries(expectation.properties)) {
      const actualValue = getErrorProperty(error, key);
      if (actualValue !== value) {
        throw new Error(`Expected error.${key} to be ${String(value)}, got ${String(actualValue)}`);
      }
    }
  }

  return error as T;
}

/**
 * Expect an async function to throw an error matching the expectation
 */
export async function expectThrowsMatchingAsync<T extends Error = Error>(
  fn: () => Promise<void>,
  expectation: ErrorExpectation<T>
): Promise<T> {
  const error = await expectThrowsAsync(fn, expectation.type, expectation.message);

  if (expectation.code !== undefined) {
    const code = getErrorProperty<string>(error, 'code');
    if (code !== expectation.code) {
      throw new Error(`Expected error code '${expectation.code}', got '${code}'`);
    }
  }

  if (expectation.properties) {
    for (const [key, value] of Object.entries(expectation.properties)) {
      const actualValue = getErrorProperty(error, key);
      if (actualValue !== value) {
        throw new Error(`Expected error.${key} to be ${String(value)}, got ${String(actualValue)}`);
      }
    }
  }

  return error as T;
}
