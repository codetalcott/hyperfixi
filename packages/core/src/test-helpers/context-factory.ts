/**
 * Test helper utilities for creating execution contexts
 */

import type { ExecutionContext } from '../types/base-types';

/**
 * Create a minimal ExecutionContext for testing
 */
export function createTestExecutionContext(
  overrides?: Partial<ExecutionContext>
): ExecutionContext {
  const context: ExecutionContext = {
    me: null,
    you: null,
    it: null,
    result: null,
    locals: new Map(),
    globals: new Map(),
    event: null,
    ...overrides,
  };

  return context;
}

/**
 * Create a ExecutionContext for testing
 */
export function createTestContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
  const context: ExecutionContext = {
    me: null,
    you: null,
    it: null,
    event: null,
    locals: new Map(),
    globals: new Map(),
    variables: new Map(),
    evaluationHistory: [],
    ...overrides,
  };

  return context;
}

/**
 * Create a mutable context wrapper for testing that allows property mutations
 * Includes all properties from ExecutionContext for maximum compatibility
 */
export function createMutableTestContext(baseContext?: Partial<ExecutionContext>): Record<
  string,
  unknown
> & {
  me: Element | null;
  you: Element | null;
  it: unknown;
  result: unknown;
  locals: Map<string, unknown>;
  globals: Map<string, unknown>;
  variables: Map<string, unknown>;
  evaluationHistory: Array<{
    readonly expressionName: string;
    readonly category: string;
    readonly input: string;
    readonly output: unknown;
    readonly timestamp: number;
    readonly duration: number;
    readonly success: boolean;
  }>;
  event: Event | null;
} {
  return {
    me: null,
    you: null,
    it: null,
    result: null,
    locals: new Map(),
    globals: new Map(),
    variables: new Map(),
    evaluationHistory: [],
    event: null,
    ...baseContext,
  };
}
