/**
 * Test Suite for Utility Command Parsers (Non-Dispatch Functions)
 *
 * Tests parseRegularCommand, parseMultiWordCommand, parseJsCommand, and parseTellCommand.
 * Skips parseCompoundCommand to avoid circular dependency issues.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseRegularCommand,
  parseMultiWordCommand,
  parseJsCommand,
  parseTellCommand,
} from '../utility-commands';
import {
  createMockParserContext,
  createTokenStream,
  createToken,
} from '../../../__test-utils__/parser-context-mock';
import type { IdentifierNode } from '../../parser-types';

describe('Utility Command Parsers (Non-Dispatch)', () => {
  function createIdentifierNode(name: string): IdentifierNode {
    return {
      type: 'identifier',
      name,
      start: 0,
      end: name.length,
      line: 1,
      column: 0,
    };
  }

  describe('parseRegularCommand', () => {
    it('should parse command with multiple arguments', () => {
      const tokens = createTokenStream(['arg1', 'arg2', 'then']);
      const ctx = createMockParserContext(tokens, {
        checkIdentifierLike: vi
          .fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
        parsePrimary: vi
          .fn()
          .mockReturnValueOnce({ type: 'identifier', name: 'arg1' })
          .mockReturnValueOnce({ type: 'identifier', name: 'arg2' }),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseRegularCommand(ctx, createIdentifierNode('myCommand'));

      expect(result.args).toHaveLength(2);
      expect(result.name).toBe('myCommand');
    });

    it('should parse command with selector arguments', () => {
      const tokens = createTokenStream(['.class', '#id']);
      const ctx = createMockParserContext(tokens, {
        checkIdentifierLike: vi.fn(() => false),
        checkSelector: vi
          .fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
        parsePrimary: vi
          .fn()
          .mockReturnValueOnce({ type: 'selector', value: '.class' })
          .mockReturnValueOnce({ type: 'selector', value: '#id' }),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseRegularCommand(ctx, createIdentifierNode('myCommand'));

      expect(result.args).toHaveLength(2);
    });

    it('should stop at command boundaries', () => {
      const tokens = createTokenStream(['arg', 'then']);
      const ctx = createMockParserContext(tokens, {
        checkIdentifierLike: vi
          .fn(() => true)
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
        parsePrimary: vi.fn(() => ({ type: 'identifier', name: 'arg' })),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseRegularCommand(ctx, createIdentifierNode('myCommand'));

      expect(result.args).toHaveLength(1);
    });
  });

  describe('parseMultiWordCommand', () => {
    it('should return null if no pattern found', () => {
      const tokens = createTokenStream([]);
      const ctx = createMockParserContext(tokens, {
        getMultiWordPattern: vi.fn(() => null),
      });

      const result = parseMultiWordCommand(ctx, createToken('unknown'), 'unknown');

      expect(result).toBeNull();
    });

    it('should parse command with keyword modifiers', () => {
      // "fetch /api/data as json" → primary arg: /api/data, modifier: { as: json }
      const tokens = createTokenStream(['/api/data', 'as', 'json']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        getMultiWordPattern: vi.fn(() => ({
          command: 'fetch',
          keywords: ['as', 'with'],
          syntax: 'fetch <url> [as <type>] [with <options>]',
        })),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        peek: vi.fn(
          () =>
            tokens[pos] || { value: '', kind: 'identifier', start: 0, end: 0, line: 1, column: 0 }
        ),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return t;
        }),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        parsePrimary: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return { type: 'literal', value: t?.value, start: 0, end: 10 };
        }),
        parseExpression: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return { type: 'identifier', name: t?.value, start: 0, end: 10 };
        }),
        getPosition: vi.fn(() => ({ start: 0, end: 30, line: 1, column: 0 })),
      });

      const result = parseMultiWordCommand(ctx, createToken('fetch'), 'fetch');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('fetch');
      expect(result!.args).toHaveLength(1); // primary arg: /api/data
    });

    it('should parse command with multiple modifiers', () => {
      // "append <div/> to #target" → primary arg: <div/>, modifier: { to: #target }
      const tokens = createTokenStream(['<div/>', 'to', '#target']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        getMultiWordPattern: vi.fn(() => ({
          command: 'append',
          keywords: ['to'],
          syntax: 'append <value> [to <target>]',
        })),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        peek: vi.fn(
          () =>
            tokens[pos] || { value: '', kind: 'identifier', start: 0, end: 0, line: 1, column: 0 }
        ),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return t;
        }),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        parsePrimary: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return { type: 'selector', value: t?.value, start: 0, end: 10 };
        }),
        parseExpression: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          return { type: 'selector', value: t?.value, start: 0, end: 10 };
        }),
        getPosition: vi.fn(() => ({ start: 0, end: 30, line: 1, column: 0 })),
      });

      const result = parseMultiWordCommand(ctx, createToken('append'), 'append');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('append');
      expect(result!.args).toHaveLength(1); // primary arg
    });
  });

  describe('parseJsCommand', () => {
    it('should parse js command without parameters', () => {
      const tokens = createTokenStream(['console.log("test")', 'end']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        match: vi.fn(() => false),
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        peek: vi.fn(() => tokens[pos]),
        advance: vi.fn(() => tokens[pos++]),
        consume: vi.fn(),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        getInputSlice: vi.fn(() => 'console.log("test")'),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseJsCommand(ctx, createIdentifierNode('js'));

      expect(result.name).toBe('js');
      expect(result.args).toHaveLength(2);
    });

    it('should parse js command with parameters', () => {
      const tokens = createTokenStream(['(', 'x', ',', 'y', ')', 'return', 'x', '+', 'y', 'end']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        checkIdentifierLike: vi.fn(() => ['x', 'y'].includes(tokens[pos]?.value)),
        peek: vi.fn(() => tokens[pos]),
        advance: vi.fn(() => tokens[pos++]),
        consume: vi.fn(() => pos++),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        getInputSlice: vi.fn(() => 'return x + y'),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseJsCommand(ctx, createIdentifierNode('js'));

      expect(result.args).toHaveLength(2);
      const params = (result.args[1] as any).elements;
      expect(params).toHaveLength(2);
    });
  });

  describe('parseTellCommand', () => {
    it('should parse tell with target and single command', () => {
      const tokens = createTokenStream(['#el', 'add', '.active']);
      const ctx = createMockParserContext(tokens, {
        parseExpression: vi.fn(() => ({ type: 'selector', value: '#el' })),
        checkIsCommand: vi
          .fn(() => true)
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
        advance: vi.fn(),
        parseCommand: vi.fn(() => ({ type: 'Command', name: 'add', arguments: [] })),
        match: vi.fn(() => false),
        check: vi.fn(() => false),
        isAtEnd: vi
          .fn(() => false)
          .mockReturnValueOnce(false)
          .mockReturnValue(true),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseTellCommand(ctx, createIdentifierNode('tell'));

      expect(result.name).toBe('tell');
      expect(result.args.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw if target is missing', () => {
      const tokens = createTokenStream([]);
      const ctx = createMockParserContext(tokens, {
        parseExpression: vi.fn(() => null),
      });

      expect(() => parseTellCommand(ctx, createIdentifierNode('tell'))).toThrow(
        'requires a target expression'
      );
    });

    it('should throw if no commands after target', () => {
      const tokens = createTokenStream(['#el']);
      const ctx = createMockParserContext(tokens, {
        parseExpression: vi.fn(() => ({ type: 'selector', value: '#el' })),
        checkIsCommand: vi.fn(() => false),
        isAtEnd: vi.fn(() => true),
      });

      expect(() => parseTellCommand(ctx, createIdentifierNode('tell'))).toThrow(
        'requires at least one command'
      );
    });
  });
});
