/**
 * Test utilities for @lokascript/framework
 * Provides mock factories and assertion helpers for testing
 */

import { expect } from 'vitest';
import type {
  LanguageTokenizer,
  LanguageToken,
  TokenStream,
  LanguagePattern,
  SemanticNode,
  CommandSemanticNode,
  SemanticValue,
  PatternMatchResult,
} from '../core/types';
import type { CommandSchema, RoleSpec } from '../schema';
import type { PatternGenLanguageProfile } from '../generation/pattern-generator';
import type { LanguageConfig, MultilingualDSL } from '../api';
import { TokenStreamImpl, createToken, createPosition } from '../core/tokenization';
import { createMultilingualDSL } from '../api';

// =============================================================================
// Mock Factories
// =============================================================================

/**
 * Create a mock tokenizer for testing
 */
export function createMockTokenizer(overrides?: Partial<LanguageTokenizer>): LanguageTokenizer {
  return {
    language: 'test',
    direction: 'ltr',
    tokenize(input: string): TokenStream {
      // Simple whitespace tokenization for testing
      const tokens: LanguageToken[] = input
        .split(/\s+/)
        .filter(Boolean)
        .map((value, index) =>
          createToken({
            kind: 'identifier',
            value,
            position: createPosition(index * value.length, (index + 1) * value.length),
          })
        );
      return new TokenStreamImpl(tokens);
    },
    classifyToken(token: string): 'keyword' | 'identifier' | 'literal' | 'operator' {
      return 'identifier';
    },
    ...overrides,
  };
}

/**
 * Create a mock token stream from an array of tokens
 */
export function createMockTokenStream(tokens: LanguageToken[]): TokenStream {
  return new TokenStreamImpl(tokens);
}

/**
 * Create a mock language pattern for testing
 */
export function createMockPattern(overrides?: Partial<LanguagePattern>): LanguagePattern {
  return {
    id: 'test-pattern',
    command: 'test',
    language: 'en',
    priority: 0,
    template: {
      format: 'test pattern',
      tokens: [],
    },
    extraction: {},
    ...overrides,
  };
}

/**
 * Create a mock language profile for pattern generation
 */
export function createMockProfile(
  code: string,
  wordOrder: 'SVO' | 'SOV' | 'VSO' = 'SVO'
): PatternGenLanguageProfile {
  return {
    code,
    wordOrder,
    keywords: {},
    roleMarkers: {},
  };
}

/**
 * Create a test DSL with provided schemas and languages
 */
export function createTestDSL(
  schemas: CommandSchema[],
  languages: LanguageConfig[]
): MultilingualDSL {
  return createMultilingualDSL({
    name: 'Test DSL',
    schemas,
    languages,
  });
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert that a token stream matches expected token values
 */
export function expectTokenSequence(tokens: TokenStream, expected: string[]): void {
  const actual: string[] = [];
  while (!tokens.eof()) {
    const token = tokens.consume();
    if (token) {
      actual.push(token.value);
    }
  }
  expect(actual).toEqual(expected);
}

/**
 * Assert that a semantic node has the expected action and roles
 */
export function expectSemanticNode(
  node: SemanticNode,
  action: string,
  roles: Record<string, any>
): void {
  expect(node.kind).toBe('command');
  expect(node.action).toBe(action);

  const commandNode = node as CommandSemanticNode;

  // Check each expected role
  for (const [role, expectedValue] of Object.entries(roles)) {
    const actualValue = commandNode.roles.get(role as any);
    expect(actualValue).toBeDefined();

    if (typeof expectedValue === 'string') {
      // Simple value comparison
      if (actualValue && 'value' in actualValue) {
        expect(actualValue.value).toBe(expectedValue);
      } else if (actualValue && 'raw' in actualValue) {
        expect(actualValue.raw).toBe(expectedValue);
      }
    } else {
      // Object comparison for complex semantic values
      expect(actualValue).toEqual(expectedValue);
    }
  }
}

/**
 * Assert that a pattern match result has confidence within a range
 */
export function expectConfidenceRange(
  result: PatternMatchResult | null,
  min: number,
  max: number
): void {
  expect(result).not.toBeNull();
  if (result) {
    expect(result.confidence).toBeGreaterThanOrEqual(min);
    expect(result.confidence).toBeLessThanOrEqual(max);
  }
}

/**
 * Assert that a value is a literal semantic value
 */
export function expectLiteralValue(value: SemanticValue | undefined, expectedValue: any): void {
  expect(value).toBeDefined();
  expect(value).toHaveProperty('type', 'literal');
  expect(value).toHaveProperty('value', expectedValue);
}

/**
 * Assert that a value is a selector semantic value
 */
export function expectSelectorValue(
  value: SemanticValue | undefined,
  expectedSelector: string,
  expectedKind?: 'id' | 'class' | 'attribute' | 'element'
): void {
  expect(value).toBeDefined();
  expect(value).toHaveProperty('type', 'selector');
  expect(value).toHaveProperty('value', expectedSelector);
  if (expectedKind) {
    expect(value).toHaveProperty('selectorKind', expectedKind);
  }
}

/**
 * Assert that a value is an expression semantic value
 */
export function expectExpressionValue(value: SemanticValue | undefined, expectedRaw: string): void {
  expect(value).toBeDefined();
  expect(value).toHaveProperty('type', 'expression');
  expect(value).toHaveProperty('raw', expectedRaw);
}

/**
 * Assert that a value is a reference semantic value
 */
export function expectReferenceValue(value: SemanticValue | undefined, expectedRef: string): void {
  expect(value).toBeDefined();
  expect(value).toHaveProperty('type', 'reference');
  expect(value).toHaveProperty('value', expectedRef);
}

// =============================================================================
// Type Guards for Testing
// =============================================================================

/**
 * Type guard to check if a value is a literal semantic value
 */
export function isLiteralValue(value: SemanticValue): value is { type: 'literal'; value: any } {
  return 'type' in value && value.type === 'literal';
}

/**
 * Type guard to check if a value is a selector semantic value
 */
export function isSelectorValue(
  value: SemanticValue
): value is { type: 'selector'; value: string; selectorKind?: string } {
  return 'type' in value && value.type === 'selector';
}

/**
 * Type guard to check if a value is an expression semantic value
 */
export function isExpressionValue(
  value: SemanticValue
): value is { type: 'expression'; raw: string } {
  return 'type' in value && value.type === 'expression';
}

/**
 * Type guard to check if a value is a reference semantic value
 */
export function isReferenceValue(
  value: SemanticValue
): value is { type: 'reference'; value: string } {
  return 'type' in value && value.type === 'reference';
}

/**
 * Type guard to check if a node is a command node
 */
export function isCommandNode(node: SemanticNode): node is CommandSemanticNode {
  return node.kind === 'command';
}
