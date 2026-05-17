import { vi } from 'vitest';
import type { ParserContext, IdentifierNode, Position } from '../parser/parser-types';
import type { Token, CommandNode } from '../types/core';

/**
 * Creates a comprehensive mock ParserContext for testing parser functions.
 * Provides every method on the ParserContext interface with sensible defaults.
 *
 * @param tokens - Array of tokens to parse (default: empty array)
 * @param overrides - Partial overrides for any method or property
 * @returns A fully mocked ParserContext with vi.fn() spies
 *
 * @example
 * const ctx = createMockParserContext(
 *   [createToken('toggle'), createToken('.active')],
 *   { parseExpression: vi.fn(() => ({ type: 'selector', value: '.active' })) }
 * );
 */
export function createMockParserContext(
  tokens: Token[] = [],
  overrides: Record<string, any> = {}
): ParserContext {
  let currentPosition = 0;

  const baseContext: Record<string, any> = {
    tokens,
    current: currentPosition,

    // Token navigation
    advance: vi.fn(() => {
      const token = tokens[currentPosition];
      currentPosition++;
      // Update mutable current property
      baseContext.current = currentPosition;
      return token;
    }),
    peek: vi.fn(() => tokens[currentPosition]),
    previous: vi.fn(() => tokens[currentPosition - 1]),
    check: vi.fn((value: string) => tokens[currentPosition]?.value === value),
    match: vi.fn((...values: string[]) => {
      if (values.includes(tokens[currentPosition]?.value)) {
        currentPosition++;
        baseContext.current = currentPosition;
        return true;
      }
      return false;
    }),
    consume: vi.fn((expected: string, message?: string) => {
      if (!baseContext.check(expected)) {
        throw new Error(
          message || `Expected "${expected}" but got "${tokens[currentPosition]?.value}"`
        );
      }
      const token = tokens[currentPosition];
      currentPosition++;
      baseContext.current = currentPosition;
      return token;
    }),
    isAtEnd: vi.fn(() => currentPosition >= tokens.length),

    // Predicate checks
    checkIdentifierLike: vi.fn(() => {
      const token = tokens[currentPosition];
      return token?.kind === 'identifier' || token?.kind === 'keyword';
    }),
    checkSelector: vi.fn(() => {
      const value = tokens[currentPosition]?.value;
      return typeof value === 'string' && (value.startsWith('.') || value.startsWith('#'));
    }),
    checkAnySelector: vi.fn(() => {
      const value = tokens[currentPosition]?.value;
      return (
        typeof value === 'string' &&
        (value.startsWith('.') || value.startsWith('#') || value.startsWith('['))
      );
    }),
    checkLiteral: vi.fn(() => {
      const kind = tokens[currentPosition]?.kind;
      return kind === 'string' || kind === 'number' || kind === 'boolean';
    }),
    checkReference: vi.fn(() => {
      const value = tokens[currentPosition]?.value;
      return ['me', 'you', 'it', 'target', 'detail'].includes(value);
    }),
    checkTimeExpression: vi.fn(() => {
      const value = tokens[currentPosition]?.value;
      const nextValue = tokens[currentPosition + 1]?.value;
      return (
        typeof value === 'string' &&
        !isNaN(Number(value)) &&
        ['ms', 's', 'm', 'h'].includes(nextValue)
      );
    }),
    checkEvent: vi.fn(() => {
      const value = tokens[currentPosition]?.value;
      return (
        typeof value === 'string' && ['click', 'submit', 'load', 'change', 'input'].includes(value)
      );
    }),
    checkIsCommand: vi.fn(() => {
      const value = tokens[currentPosition]?.value;
      const commandNames = [
        'toggle',
        'add',
        'remove',
        'set',
        'put',
        'take',
        'make',
        'increment',
        'decrement',
      ];
      return typeof value === 'string' && commandNames.includes(value);
    }),
    checkContextVar: vi.fn(() => {
      const value = tokens[currentPosition]?.value;
      return typeof value === 'string' && value.startsWith(':');
    }),
    matchOperator: vi.fn((operator: string) => {
      const value = tokens[currentPosition]?.value;
      if (value === operator) {
        currentPosition++;
        baseContext.current = currentPosition;
        return true;
      }
      return false;
    }),

    // Position checkpoint methods
    savePosition: vi.fn(() => currentPosition),
    restorePosition: vi.fn((pos: number) => {
      currentPosition = pos;
      baseContext.current = currentPosition;
    }),
    peekAt: vi.fn((offset: number) => {
      const index = currentPosition + offset;
      return index >= 0 && index < tokens.length ? tokens[index] : null;
    }),

    // AST creation
    createIdentifier: vi.fn(
      (name: string) =>
        ({
          type: 'identifier',
          name,
          start: currentPosition,
          end: currentPosition,
          line: 1,
          column: currentPosition,
        }) as IdentifierNode
    ),

    // Expression parsing (minimal defaults)
    parseExpression: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-expr',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parsePrimary: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-primary',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseLogicalAnd: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-and',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseCSSObjectLiteral: vi.fn(() => ({
      type: 'cssObjectLiteral',
      properties: [],
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),

    // Command parsing
    parseCommand: vi.fn(
      (): CommandNode =>
        ({
          type: 'Command',
          name: 'mock-command',
          arguments: [],
          start: currentPosition,
          end: currentPosition,
          line: 1,
          column: currentPosition,
        }) as unknown as CommandNode
    ),
    parseCommandSequence: vi.fn(() => ({
      type: 'commandSequence',
      commands: [],
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseCommandListUntilEnd: vi.fn(() => []),

    // Position
    getPosition: vi.fn(
      (): Position => ({
        start: currentPosition,
        end: currentPosition,
        line: 1,
        column: currentPosition,
      })
    ),

    // Error handling
    addError: vi.fn(),
    addWarning: vi.fn(),

    ...overrides,
  };

  return baseContext as unknown as ParserContext;
}

/**
 * Creates a single token with sensible defaults.
 *
 * @param value - The token value (text content)
 * @param kind - Token kind (default: 'identifier')
 * @param start - Start position (default: 0)
 * @returns A Token object
 */
export function createToken(value: string, kind: string = 'identifier', start: number = 0): Token {
  return {
    kind: kind as any,
    value,
    start,
    end: start + value.length,
    line: 1,
    column: start + 1,
  };
}

/**
 * Creates a token stream from an array of string values.
 * Automatically sets positions sequentially.
 *
 * @param values - Array of token values
 * @param kinds - Optional array of token kinds (default: all 'identifier')
 * @returns Array of Token objects with sequential positions
 *
 * @example
 * const tokens = createTokenStream(['toggle', '.active'], ['keyword', 'selector']);
 */
export function createTokenStream(values: string[], kinds?: string[]): Token[] {
  let position = 0;
  return values.map((value, i) => {
    const token = createToken(value, kinds?.[i] || 'identifier', position);
    position += value.length + 1; // +1 for space between tokens
    return token;
  });
}

/**
 * Creates a mock context with tokens already positioned at a specific index.
 * Useful for testing token navigation functions.
 *
 * @param tokens - Array of tokens
 * @param position - Starting position (default: 0)
 * @param overrides - Additional overrides
 * @returns ParserContext positioned at the specified token
 */
export function createMockParserContextAt(
  tokens: Token[],
  position: number,
  overrides: Record<string, any> = {}
): ParserContext {
  const ctx = createMockParserContext(tokens, overrides);
  ctx.current = position;
  // Advance context to position without calling advance()
  for (let i = 0; i < position; i++) {
    ctx.advance();
  }
  return ctx;
}
