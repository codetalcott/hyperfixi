/**
 * Test Suite for DOM Command Parsers
 *
 * Tests parseRemoveCommand, parseToggleCommand, parseAddCommand,
 * parsePutCommand, and parseSwapCommand using mock ParserContext.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseRemoveCommand,
  parseToggleCommand,
  parseAddCommand,
  parsePutCommand,
  parseSwapCommand,
} from '../dom-commands';
import {
  createMockParserContext,
  createTokenStream,
  createToken,
} from '../../../__test-utils__/parser-context-mock';
import type { ParserContext, IdentifierNode } from '../../parser-types';
import type { Token, ASTNode } from '../../../types/core';

describe('DOM Command Parsers', () => {
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

  /**
   * Helper to create a properly configured parser context for DOM commands
   */
  function createParserContextForDOMCommand(tokens: Token[]): ParserContext {
    let position = 0;

    const ctx = createMockParserContext(tokens, {
      current: position,

      isAtEnd: vi.fn(() => position >= tokens.length),

      peek: vi.fn(
        () => tokens[position] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
      ),

      check: vi.fn((value: string) => {
        const token = tokens[position];
        return token && token.value === value;
      }),

      checkIdentifierLike: vi.fn(() => {
        const token = tokens[position];
        return token && (token.kind === 'identifier' || token.kind === 'keyword');
      }),

      checkAnySelector: vi.fn(() => {
        const token = tokens[position];
        return token && token.kind === 'selector';
      }),

      match: vi.fn((...values: string[]) => {
        const token = tokens[position];
        if (token && values.includes(token.value)) {
          position++;
          return true;
        }
        return false;
      }),

      advance: vi.fn(() => {
        const token = tokens[position];
        position++;
        return token;
      }),

      parsePrimary: vi.fn(() => {
        if (position >= tokens.length) {
          return {
            type: 'identifier',
            name: '__END__',
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          };
        }

        const token = tokens[position];
        position++;

        if (!token) {
          return {
            type: 'identifier',
            name: '__END__',
            start: 0,
            end: 0,
            line: 1,
            column: 0,
          };
        }

        let node: ASTNode;
        if (token.kind === 'selector') {
          node = {
            type: 'selector',
            value: token.value,
            start: token.start || 0,
            end: token.end || 0,
            line: token.line || 1,
            column: token.column || 0,
          };
        } else if (token.kind === 'number') {
          node = {
            type: 'literal',
            value: Number(token.value),
            raw: token.value,
            start: token.start || 0,
            end: token.end || 0,
            line: token.line || 1,
            column: token.column || 0,
          };
        } else if (token.kind === 'string') {
          node = {
            type: 'string',
            value: token.value,
            raw: token.value,
            start: token.start || 0,
            end: token.end || 0,
            line: token.line || 1,
            column: token.column || 0,
          };
        } else {
          node = {
            type: 'identifier',
            name: token.value,
            start: token.start || 0,
            end: token.end || 0,
            line: token.line || 1,
            column: token.column || 0,
          };
        }

        return node;
      }),

      parseExpression: vi.fn(() => {
        // For parseExpression, consume one token and return appropriate node
        if (position >= tokens.length) {
          return null;
        }

        const token = tokens[position];
        position++;

        if (token.kind === 'selector') {
          return {
            type: 'selector',
            value: token.value,
            start: token.start || 0,
            end: token.end || 0,
            line: token.line || 1,
            column: token.column || 0,
          };
        }

        return {
          type: 'identifier',
          name: token.value,
          start: token.start || 0,
          end: token.end || 0,
          line: token.line || 1,
          column: token.column || 0,
        };
      }),

      parseCSSObjectLiteral: vi.fn(() => ({
        type: 'object',
        properties: [],
        start: 0,
        end: 0,
        line: 1,
        column: 0,
      })),

      createIdentifier: vi.fn((name: string) => ({
        type: 'identifier',
        name,
        start: position,
        end: position,
        line: 1,
        column: position,
      })),

      addError: vi.fn(),

      getPosition: vi.fn(() => ({
        start: 0,
        end: position,
        line: 1,
        column: position,
      })),
    });

    return ctx;
  }

  describe('parseRemoveCommand', () => {
    it('should parse remove with class and target', () => {
      const tokens = createTokenStream(
        ['.active', 'from', '#button'],
        ['selector', 'keyword', 'selector']
      );
      const ctx = createParserContextForDOMCommand(tokens);

      const result = parseRemoveCommand(ctx, createIdentifierNode('remove'));

      expect(result.name).toBe('remove');
      expect(result.args.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse remove with string class', () => {
      const tokens = createTokenStream(
        ['"selected"', 'from', '#el'],
        ['string', 'keyword', 'selector']
      );
      const ctx = createParserContextForDOMCommand(tokens);

      const result = parseRemoveCommand(ctx, createIdentifierNode('remove'));

      expect(result.name).toBe('remove');
      expect(result.args.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('parseToggleCommand', () => {
    it('should parse standard toggle syntax', () => {
      const tokens = createTokenStream(
        ['.active', 'from', '#button'],
        ['selector', 'keyword', 'selector']
      );
      const ctx = createParserContextForDOMCommand(tokens);

      const result = parseToggleCommand(ctx, createIdentifierNode('toggle'));

      expect(result.name).toBe('toggle');
      expect(result.args.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse toggle with "on" keyword (hyperscript compatibility)', () => {
      const tokens = createTokenStream(
        ['.active', 'on', '#button'],
        ['selector', 'keyword', 'selector']
      );
      const ctx = createParserContextForDOMCommand(tokens);

      const result = parseToggleCommand(ctx, createIdentifierNode('toggle'));

      expect(result.name).toBe('toggle');
      expect(result.args.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse toggle between syntax', () => {
      const tokens = createTokenStream(
        ['between', '.on', 'and', '.off', 'on', '#target'],
        ['keyword', 'selector', 'keyword', 'selector', 'keyword', 'selector']
      );
      const ctx = createParserContextForDOMCommand(tokens);

      const result = parseToggleCommand(ctx, createIdentifierNode('toggle'));

      expect(result.name).toBe('toggle');
      // Should have: 'between' keyword, classA, 'and' keyword, classB, 'on' keyword, target
      expect(result.args.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('parseAddCommand', () => {
    it('should parse add with class and target', () => {
      const tokens = createTokenStream(
        ['.highlight', 'to', '#el'],
        ['selector', 'keyword', 'selector']
      );
      const ctx = createParserContextForDOMCommand(tokens);

      const result = parseAddCommand(ctx, createToken('add'));

      expect(result.name).toBe('add');
      expect(result.args.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse add with CSS object literal', () => {
      const tokens = createTokenStream(
        ['{', 'left', ':', '10px', '}', 'to', '#el'],
        ['symbol', 'identifier', 'symbol', 'string', 'symbol', 'keyword', 'selector']
      );
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        parseCSSObjectLiteral: vi.fn(() => {
          // Skip to closing brace
          while (pos < tokens.length && tokens[pos].value !== '}') {
            pos++;
          }
          if (tokens[pos]?.value === '}') pos++;
          return {
            type: 'object',
            properties: [{ key: 'left', value: '10px' }],
            start: 0,
            end: pos,
            line: 1,
            column: 0,
          };
        }),
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => tokens[pos++]),
        parsePrimary: vi.fn(() => {
          const token = tokens[pos++];
          if (!token) return null;
          if (token.kind === 'selector') {
            return { type: 'selector', value: token.value, start: 0, end: 0, line: 1, column: 0 };
          }
          return { type: 'identifier', name: token.value, start: 0, end: 0, line: 1, column: 0 };
        }),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: 0 })),
      });

      const result = parseAddCommand(ctx, createToken('add'));

      expect(result.name).toBe('add');
      expect(result.args.length).toBeGreaterThanOrEqual(1);
      expect(result.args[0].type).toBe('object');
    });
  });

  describe('parsePutCommand', () => {
    it('should parse put into', () => {
      const tokens = createTokenStream(
        ['content', 'into', '#target'],
        ['identifier', 'keyword', 'selector']
      );
      const ctx = createParserContextForDOMCommand(tokens);

      const result = parsePutCommand(ctx, createIdentifierNode('put'));

      expect(result?.name).toBe('put');
      expect(result?.args).toHaveLength(3);
      // Args: content, operation keyword, target
      expect(result?.args[1]).toMatchObject({
        type: 'identifier',
        name: 'into',
      });
    });

    it('should parse put before', () => {
      const tokens = createTokenStream(
        ['text', 'before', '#el'],
        ['identifier', 'keyword', 'selector']
      );
      const ctx = createParserContextForDOMCommand(tokens);

      const result = parsePutCommand(ctx, createIdentifierNode('put'));

      expect(result?.name).toBe('put');
      expect(result?.args[1]).toMatchObject({
        type: 'identifier',
        name: 'before',
      });
    });

    it('should parse put after', () => {
      const tokens = createTokenStream(
        ['text', 'after', '#el'],
        ['identifier', 'keyword', 'selector']
      );
      const ctx = createParserContextForDOMCommand(tokens);

      const result = parsePutCommand(ctx, createIdentifierNode('put'));

      expect(result?.name).toBe('put');
      expect(result?.args[1]).toMatchObject({
        type: 'identifier',
        name: 'after',
      });
    });

    it('should parse put at start of', () => {
      const tokens = createTokenStream(
        ['text', 'at start of', '#container'],
        ['identifier', 'keyword', 'selector']
      );
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        parseExpression: vi.fn(() => {
          const token = tokens[pos++];
          if (!token) return null;
          if (token.kind === 'selector') {
            return { type: 'selector', value: token.value, start: 0, end: 0, line: 1, column: 0 };
          }
          return { type: 'identifier', name: token.value, start: 0, end: 0, line: 1, column: 0 };
        }),
        peek: vi.fn(() => tokens[pos]),
        advance: vi.fn(() => tokens[pos++]),
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        createIdentifier: vi.fn((name: string) => ({
          type: 'identifier',
          name,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        addError: vi.fn(),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: 0 })),
      });

      const result = parsePutCommand(ctx, createIdentifierNode('put'));

      expect(result?.name).toBe('put');
      expect(result?.args[1].name).toBe('at start of');
    });

    it('should return null if content expression is missing', () => {
      const tokens = createTokenStream([], []);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        parseExpression: vi.fn(() => null),
        addError: vi.fn(),
      });

      const result = parsePutCommand(ctx, createIdentifierNode('put'));

      expect(result).toBeNull();
      expect(ctx.addError).toHaveBeenCalledWith('Put command requires content expression');
    });

    it('should return null if operation keyword is missing', () => {
      const tokens = createTokenStream(['content'], ['identifier']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        parseExpression: vi.fn(() => ({
          type: 'identifier',
          name: 'content',
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        peek: vi.fn(() => ({ kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 })),
        addError: vi.fn(),
      });

      const result = parsePutCommand(ctx, createIdentifierNode('put'));

      expect(result).toBeNull();
      expect(ctx.addError).toHaveBeenCalled();
    });
  });

  describe('parseSwapCommand', () => {
    it('should parse basic swap with target and content', () => {
      const tokens = createTokenStream(
        ['#target', 'with', 'content'],
        ['selector', 'keyword', 'identifier']
      );
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        advance: vi.fn(() => tokens[pos++]),
        parseExpression: vi.fn(() => {
          const token = tokens[pos++];
          if (!token) return null;
          if (token.kind === 'selector') {
            return { type: 'selector', value: token.value, start: 0, end: 0, line: 1, column: 0 };
          }
          return { type: 'identifier', name: token.value, start: 0, end: 0, line: 1, column: 0 };
        }),
        createIdentifier: vi.fn((name: string) => ({
          type: 'identifier',
          name,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: 0 })),
      });

      const result = parseSwapCommand(ctx, createIdentifierNode('swap'));

      expect(result.name).toBe('swap');
      expect(result.args.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse swap with innerHTML strategy', () => {
      const tokens = createTokenStream(
        ['innerHTML', 'of', '#target', 'with', 'content'],
        ['keyword', 'keyword', 'selector', 'keyword', 'identifier']
      );
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        advance: vi.fn(() => tokens[pos++]),
        parseExpression: vi.fn(() => {
          const token = tokens[pos++];
          if (!token) return null;
          if (token.kind === 'selector') {
            return { type: 'selector', value: token.value, start: 0, end: 0, line: 1, column: 0 };
          }
          return { type: 'identifier', name: token.value, start: 0, end: 0, line: 1, column: 0 };
        }),
        createIdentifier: vi.fn((name: string) => ({
          type: 'identifier',
          name,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: 0 })),
      });

      const result = parseSwapCommand(ctx, createIdentifierNode('swap'));

      expect(result.name).toBe('swap');
      // Should include strategy keyword in arguments
      expect(result.args.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse swap delete syntax', () => {
      const tokens = createTokenStream(['delete', '#target'], ['keyword', 'selector']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        advance: vi.fn(() => tokens[pos++]),
        parseExpression: vi.fn(() => {
          const token = tokens[pos++];
          if (!token) return null;
          if (token.kind === 'selector') {
            return { type: 'selector', value: token.value, start: 0, end: 0, line: 1, column: 0 };
          }
          return { type: 'identifier', name: token.value, start: 0, end: 0, line: 1, column: 0 };
        }),
        createIdentifier: vi.fn((name: string) => ({
          type: 'identifier',
          name,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: 0 })),
      });

      const result = parseSwapCommand(ctx, createIdentifierNode('swap'));

      expect(result.name).toBe('swap');
      expect(result.args.length).toBeGreaterThanOrEqual(1);
    });
  });
});
