/**
 * @lokascript/framework/testing — Test utilities for domain packages
 *
 * Provides assertion helpers and type guards for testing domain DSLs
 * built on the framework. Import from '@lokascript/framework/testing'
 * in test files only (requires vitest as a peer dependency).
 *
 * @example
 * ```typescript
 * import { expectSemanticNode, isLiteralValue } from '@lokascript/framework/testing';
 *
 * test('parses select command', () => {
 *   const node = dsl.parse('select name from users', 'en');
 *   expectSemanticNode(node, 'select', { columns: 'name', source: 'users' });
 * });
 * ```
 */

import { expect } from 'vitest';
import type {
  SemanticNode,
  CommandSemanticNode,
  SemanticValue,
  LiteralValue,
  SelectorValue,
  ExpressionValue,
  ReferenceValue,
} from '../core/types';

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert that a semantic node has the expected action and role values.
 * Role values can be strings (matched against `value` or `raw`) or full SemanticValue objects.
 */
export function expectSemanticNode(
  node: SemanticNode,
  action: string,
  roles: Record<string, string | SemanticValue>
): void {
  expect(node.kind).toBe('command');
  expect(node.action).toBe(action);

  const commandNode = node as CommandSemanticNode;

  for (const [role, expectedValue] of Object.entries(roles)) {
    const actualValue = commandNode.roles.get(role);
    expect(actualValue, `Role '${role}' should be defined`).toBeDefined();

    if (typeof expectedValue === 'string') {
      if (actualValue && 'value' in actualValue) {
        expect(actualValue.value).toBe(expectedValue);
      } else if (actualValue && 'raw' in actualValue) {
        expect(actualValue.raw).toBe(expectedValue);
      }
    } else {
      expect(actualValue).toEqual(expectedValue);
    }
  }
}

/**
 * Assert that a value is a literal semantic value with the expected value.
 */
export function expectLiteralValue(
  value: SemanticValue | undefined,
  expectedValue: string | number | boolean
): void {
  expect(value).toBeDefined();
  expect(value).toHaveProperty('type', 'literal');
  expect(value).toHaveProperty('value', expectedValue);
}

/**
 * Assert that a value is a selector semantic value.
 */
export function expectSelectorValue(
  value: SemanticValue | undefined,
  expectedSelector: string,
  expectedKind?: SelectorValue['selectorKind']
): void {
  expect(value).toBeDefined();
  expect(value).toHaveProperty('type', 'selector');
  expect(value).toHaveProperty('value', expectedSelector);
  if (expectedKind) {
    expect(value).toHaveProperty('selectorKind', expectedKind);
  }
}

/**
 * Assert that a value is an expression semantic value.
 */
export function expectExpressionValue(value: SemanticValue | undefined, expectedRaw: string): void {
  expect(value).toBeDefined();
  expect(value).toHaveProperty('type', 'expression');
  expect(value).toHaveProperty('raw', expectedRaw);
}

/**
 * Assert that a value is a reference semantic value.
 */
export function expectReferenceValue(value: SemanticValue | undefined, expectedRef: string): void {
  expect(value).toBeDefined();
  expect(value).toHaveProperty('type', 'reference');
  expect(value).toHaveProperty('value', expectedRef);
}

// =============================================================================
// Type Guards
// =============================================================================

/** Type guard for LiteralValue */
export function isLiteralValue(value: SemanticValue): value is LiteralValue {
  return value.type === 'literal';
}

/** Type guard for SelectorValue */
export function isSelectorValue(value: SemanticValue): value is SelectorValue {
  return value.type === 'selector';
}

/** Type guard for ExpressionValue */
export function isExpressionValue(value: SemanticValue): value is ExpressionValue {
  return value.type === 'expression';
}

/** Type guard for ReferenceValue */
export function isReferenceValue(value: SemanticValue): value is ReferenceValue {
  return value.type === 'reference';
}

/** Type guard for CommandSemanticNode */
export function isCommandNode(node: SemanticNode): node is CommandSemanticNode {
  return node.kind === 'command';
}
