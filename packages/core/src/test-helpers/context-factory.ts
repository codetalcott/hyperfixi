/**
 * Test helper utilities for creating execution contexts
 */

import type { ExecutionContext } from '../types/base-types';
import type { UnifiedExecutionContext } from '../types/unified-types';

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
 * Create a UnifiedExecutionContext for testing
 */
export function createTestUnifiedContext(
  overrides?: Partial<UnifiedExecutionContext>
): UnifiedExecutionContext {
  const context: UnifiedExecutionContext = {
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
 * Includes all properties from UnifiedExecutionContext for maximum compatibility
 */
export function createMutableTestContext(
  baseContext?: Partial<UnifiedExecutionContext>
): Record<string, unknown> & {
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
