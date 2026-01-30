import { vi } from 'vitest';
import type { ParserContext, IdentifierNode, Position } from '../parser/parser-types';
import type { Token, ASTNode, CommandNode } from '../types/core';

/**
 * Creates a comprehensive mock ParserContext for testing parser functions.
 * Provides all 48+ methods from the ParserContext interface with sensible defaults.
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
  overrides: Partial<ParserContext> = {}
): ParserContext {
  let currentPosition = 0;

  const baseContext: ParserContext = {
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
    createLiteral: vi.fn((value: unknown, raw: string) => ({
      type: 'literal',
      value,
      raw,
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    createSelector: vi.fn((value: string) => ({
      type: 'selector',
      value,
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    createBinaryExpression: vi.fn((operator, left, right) => ({
      type: 'binaryExpression',
      operator,
      left,
      right,
      start: left.start,
      end: right.end,
      line: left.line,
      column: left.column,
    })),
    createUnaryExpression: vi.fn((operator, argument, prefix = true) => ({
      type: 'unaryExpression',
      operator,
      argument,
      prefix,
      start: argument.start,
      end: argument.end,
      line: argument.line,
      column: argument.column,
    })),
    createMemberExpression: vi.fn((object, property, computed = false) => ({
      type: 'memberExpression',
      object,
      property,
      computed,
      start: object.start,
      end: property.end,
      line: object.line,
      column: object.column,
    })),
    createPossessiveExpression: vi.fn((object, property) => ({
      type: 'possessiveExpression',
      object,
      property,
      start: object.start,
      end: property.end,
      line: object.line,
      column: object.column,
    })),
    createCallExpression: vi.fn((callee, args) => ({
      type: 'callExpression',
      callee,
      arguments: args,
      start: callee.start,
      end: callee.end,
      line: callee.line,
      column: callee.column,
    })),
    createErrorNode: vi.fn(
      (message?: string) =>
        ({
          type: 'identifier',
          name: '__ERROR__',
          error: message,
          start: currentPosition,
          end: currentPosition,
          line: 1,
          column: currentPosition,
        }) as IdentifierNode
    ),
    createProgramNode: vi.fn(statements => ({
      type: 'Program',
      statements,
      start: 0,
      end: tokens.length,
      line: 1,
      column: 0,
    })),
    createCommandFromIdentifier: vi.fn(
      (identifier: IdentifierNode): CommandNode =>
        ({
          type: 'Command',
          name: identifier.name,
          arguments: [],
          start: identifier.start ?? 0,
          end: identifier.end ?? 0,
          line: identifier.line ?? 1,
          column: identifier.column ?? 1,
        }) as unknown as CommandNode
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
    parseCall: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-call',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseAssignment: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-assignment',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseLogicalOr: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-or',
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
    parseEquality: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-equality',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseComparison: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-comparison',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseAddition: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-addition',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseMultiplication: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-multiplication',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseImplicitBinary: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-implicit',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseConditional: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-conditional',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseConditionalBranch: vi.fn(() => ({
      type: 'identifier',
      name: 'mock-branch',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseEventHandler: vi.fn(() => ({
      type: 'eventHandler',
      event: 'click',
      body: [],
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseBehaviorDefinition: vi.fn(() => ({
      type: 'behavior',
      name: 'mock-behavior',
      body: [],
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseNavigationFunction: vi.fn(() => ({
      type: 'navigationFunction',
      name: 'first',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseMyPropertyAccess: vi.fn(() => ({
      type: 'possessiveExpression',
      object: { type: 'identifier', name: 'me' },
      property: { type: 'identifier', name: 'value' },
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseDollarExpression: vi.fn(() => ({
      type: 'dollarExpression',
      name: 'mock-dollar',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseHyperscriptSelector: vi.fn(() => ({
      type: 'selector',
      value: '<button/>',
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseAttributeOrArrayLiteral: vi.fn(() => ({
      type: 'arrayLiteral',
      elements: [],
      start: currentPosition,
      end: currentPosition,
      line: 1,
      column: currentPosition,
    })),
    parseObjectLiteral: vi.fn(() => ({
      type: 'objectLiteral',
      properties: [],
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
  overrides: Partial<ParserContext> = {}
): ParserContext {
  const ctx = createMockParserContext(tokens, overrides);
  ctx.current = position;
  // Advance context to position without calling advance()
  for (let i = 0; i < position; i++) {
    ctx.advance();
  }
  return ctx;
}
