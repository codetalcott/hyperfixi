/**
 * Test Suite for Animation Command Parsers
 *
 * Tests parseMeasureCommand and parseTransitionCommand using mock ParserContext.
 */

import { describe, it, expect, vi } from 'vitest';
import { parseMeasureCommand, parseTransitionCommand } from '../animation-commands';
import {
  createMockParserContext,
  createTokenStream,
  createToken,
} from '../../../__test-utils__/parser-context-mock';
import type { ParserContext, IdentifierNode } from '../../parser-types';
import type { Token, ASTNode } from '../../../types/core';

describe('Animation Command Parsers', () => {
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
   * Helper to create a properly configured parser context for animation commands
   */
  function createParserContextForAnimation(tokens: Token[]): ParserContext {
    let position = 0;
    const parsedTokens: ASTNode[] = [];

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

      checkContextVar: vi.fn(() => {
        const token = tokens[position];
        return token && typeof token.value === 'string' && token.value.startsWith(':');
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

      // parsePrimary creates appropriate nodes based on token kind
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

        parsedTokens.push(node);
        return node;
      }),

      getPosition: vi.fn(() => ({
        start: 0,
        end: position,
        line: 1,
        column: position,
      })),
    });

    return ctx;
  }

  describe('parseMeasureCommand', () => {
    it('should parse measure with just property', () => {
      const tokens = createTokenStream(['width'], ['identifier']);
      const ctx = createParserContextForAnimation(tokens);

      const result = parseMeasureCommand(ctx, createIdentifierNode('measure'));

      expect(result.name).toBe('measure');
      expect(result.args).toHaveLength(1);
      expect(result.args[0]).toMatchObject({
        type: 'identifier',
        name: 'width',
      });
    });

    it('should parse measure with target and property', () => {
      const tokens = createTokenStream(['#el', 'width'], ['selector', 'identifier']);
      const ctx = createParserContextForAnimation(tokens);

      const result = parseMeasureCommand(ctx, createIdentifierNode('measure'));

      expect(result.args).toHaveLength(2);
      expect(result.args[0]).toMatchObject({
        type: 'selector',
        value: '#el',
      });
      expect(result.args[1]).toMatchObject({
        type: 'identifier',
        name: 'width',
      });
    });

    it('should parse measure with CSS property (*opacity)', () => {
      const tokens = createTokenStream(
        ['#el', '*', 'opacity'],
        ['selector', 'operator', 'identifier']
      );
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        checkAnySelector: vi.fn(() => pos === 0),
        checkIdentifierLike: vi.fn(() => pos === 2),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            return true;
          }
          return false;
        }),
        advance: vi.fn(() => tokens[pos++]),
        parsePrimary: vi.fn(() => {
          const token = tokens[pos++];
          if (token.kind === 'selector') {
            return { type: 'selector', value: token.value, start: 0, end: 0, line: 1, column: 0 };
          }
          return { type: 'identifier', name: token.value, start: 0, end: 0, line: 1, column: 0 };
        }),
        getPosition: vi.fn(() => ({ start: 0, end: 10, line: 1, column: 0 })),
      });

      const result = parseMeasureCommand(ctx, createIdentifierNode('measure'));

      expect(result.args).toHaveLength(2);
      // Second arg should be CSS property with *
      const cssArg = result.args[1] as any;
      expect(cssArg.name).toContain('*');
    });

    it('should parse measure with "and set" modifier', () => {
      const tokens = createTokenStream(
        ['width', 'and', 'set', 'w'],
        ['identifier', 'keyword', 'keyword', 'identifier']
      );
      const ctx = createParserContextForAnimation(tokens);

      const result = parseMeasureCommand(ctx, createIdentifierNode('measure'));

      expect(result.modifiers).toBeDefined();
      expect(result.modifiers!.set).toBeDefined();
      expect(result.modifiers!.set).toMatchObject({
        type: 'identifier',
        name: 'w',
      });
    });
  });

  describe('parseTransitionCommand', () => {
    it('should parse transition with property and to value', () => {
      const tokens = createTokenStream(['opacity', 'to', '1'], ['identifier', 'keyword', 'number']);
      const ctx = createParserContextForAnimation(tokens);

      const result = parseTransitionCommand(ctx, createToken('transition'));

      expect(result.name).toBe('transition');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers).toBeDefined();
      expect(result.modifiers!.to).toBeDefined();
    });

    it('should parse transition with * prefix CSS property', () => {
      const tokens = createTokenStream(
        ['*', 'background-color', 'to', 'red'],
        ['operator', 'identifier', 'keyword', 'identifier']
      );
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        peek: vi.fn(() => tokens[pos]),
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        checkIdentifierLike: vi.fn(() => pos === 1),
        advance: vi.fn(() => tokens[pos++]),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parsePrimary: vi.fn(() => {
          const token = tokens[pos++];
          return { type: 'identifier', name: token.value, start: 0, end: 0, line: 1, column: 0 };
        }),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: 0 })),
      });

      const result = parseTransitionCommand(ctx, createToken('transition'));

      const prop = result.args[0] as any;
      expect(prop.value).toContain('*');
    });

    it('should parse transition with hyphenated property', () => {
      const tokens = createTokenStream(
        ['background', '-', 'color', 'to', 'red'],
        ['identifier', 'operator', 'identifier', 'keyword', 'identifier']
      );
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        peek: vi.fn(() => tokens[pos]),
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        checkIdentifierLike: vi.fn(() => [0, 2].includes(pos)),
        advance: vi.fn(() => tokens[pos++]),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parsePrimary: vi.fn(() => {
          const token = tokens[pos++];
          return { type: 'identifier', name: token.value, start: 0, end: 0, line: 1, column: 0 };
        }),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: 0 })),
      });

      const result = parseTransitionCommand(ctx, createToken('transition'));

      const prop = result.args[0] as any;
      expect(prop.value).toBe('background-color');
    });

    it('should parse transition with over duration', () => {
      const tokens = createTokenStream(
        ['opacity', 'to', '1', 'over', '2s'],
        ['identifier', 'keyword', 'number', 'keyword', 'number']
      );
      const ctx = createParserContextForAnimation(tokens);

      const result = parseTransitionCommand(ctx, createToken('transition'));

      expect(result.modifiers!.over).toBeDefined();
    });

    it('should parse transition with with timing function', () => {
      const tokens = createTokenStream(
        ['opacity', 'to', '1', 'with', 'ease-in-out'],
        ['identifier', 'keyword', 'number', 'keyword', 'identifier']
      );
      const ctx = createParserContextForAnimation(tokens);

      const result = parseTransitionCommand(ctx, createToken('transition'));

      expect(result.modifiers!.with).toBeDefined();
    });

    it('should throw if property is missing', () => {
      const tokens = createTokenStream(['to', '1'], ['keyword', 'number']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        peek: vi.fn(() => tokens[pos]),
        check: vi.fn(() => false),
        checkIdentifierLike: vi.fn(() => false),
      });

      expect(() => parseTransitionCommand(ctx, createToken('transition'))).toThrow(
        'requires a CSS property'
      );
    });

    it('should throw if "to" keyword is missing', () => {
      const tokens = createTokenStream(['opacity', '1'], ['identifier', 'number']);
      let pos = 0;
      const ctx = createMockParserContext(tokens, {
        peek: vi.fn(() => tokens[pos]),
        check: vi.fn((val: string) => (val === 'to' ? false : tokens[pos]?.value === val)),
        checkIdentifierLike: vi.fn(() => pos === 0),
        advance: vi.fn(() => tokens[pos++]),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: 0 })),
      });

      expect(() => parseTransitionCommand(ctx, createToken('transition'))).toThrow(
        'Expected "to" keyword'
      );
    });
  });
});
