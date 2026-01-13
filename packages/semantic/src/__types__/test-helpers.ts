/**
 * Type-safe test helpers for semantic parsing
 * Provides properly typed interfaces for test assertions on semantic nodes
 */

import type { SemanticRole } from '../types';

/**
 * Semantic node result for testing
 */
export interface SemanticNodeResult {
  action: string;
  roles: Map<SemanticRole, SemanticValue>;
  confidence: number;
  errors?: ValidationError[];
  tokens?: unknown[];
  metadata?: Record<string, unknown>;
}

/**
 * Semantic value in role maps
 */
export interface SemanticValue {
  value: unknown;
  type?: string;
  raw?: string;
  [key: string]: unknown;
}

/**
 * Validation error from semantic parsing
 */
export interface ValidationError {
  message: string;
  code?: string;
  position?: number;
  [key: string]: unknown;
}

/**
 * Type-safe role accessor for semantic nodes
 */
export interface RoleAccessor<T extends string = SemanticRole> {
  get(role: T): SemanticValue | undefined;
  has(role: T): boolean;
  keys(): T[];
  values(): SemanticValue[];
  entries(): Array<[T, SemanticValue]>;
}

/**
 * Create a type-safe role accessor from a Map
 */
export function createRoleAccessor<T extends string = SemanticRole>(
  roles: Map<T, SemanticValue>
): RoleAccessor<T> {
  return {
    get(role: T): SemanticValue | undefined {
      return roles.get(role);
    },
    has(role: T): boolean {
      return roles.has(role);
    },
    keys(): T[] {
      return Array.from(roles.keys());
    },
    values(): SemanticValue[] {
      return Array.from(roles.values());
    },
    entries(): Array<[T, SemanticValue]> {
      return Array.from(roles.entries());
    },
  };
}

/**
 * Type guard to check if a value is a SemanticNodeResult
 */
export function isSemanticNodeResult(value: unknown): value is SemanticNodeResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'action' in value &&
    typeof (value as SemanticNodeResult).action === 'string' &&
    'roles' in value &&
    (value as SemanticNodeResult).roles instanceof Map &&
    'confidence' in value &&
    typeof (value as SemanticNodeResult).confidence === 'number'
  );
}

/**
 * Assert that a value is a SemanticNodeResult
 */
export function assertSemanticNodeResult(value: unknown): asserts value is SemanticNodeResult {
  if (!isSemanticNodeResult(value)) {
    throw new Error(`Expected SemanticNodeResult, got ${typeof value}`);
  }
}

/**
 * Type-safe role value extractor
 */
export function getRoleValue<T = unknown>(
  node: SemanticNodeResult,
  role: SemanticRole
): T | undefined {
  const value = node.roles.get(role);
  return value?.value as T | undefined;
}

/**
 * Assert that a role exists on a semantic node
 */
export function assertNodeHasRole(
  node: SemanticNodeResult,
  role: SemanticRole
): asserts node is SemanticNodeResult & { roles: Map<SemanticRole, SemanticValue> } {
  if (!node.roles.has(role)) {
    throw new Error(`Expected node to have role '${role}'`);
  }
}
