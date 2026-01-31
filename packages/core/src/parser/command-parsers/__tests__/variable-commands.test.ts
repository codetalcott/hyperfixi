/**
 * Test Suite for Variable Command Parsers
 *
 * Tests parseSetCommand and parseIncrementDecrementCommand
 * from variable-commands.ts using mock ParserContext.
 */

import { describe, it, expect, vi } from 'vitest';
import { parseSetCommand, parseIncrementDecrementCommand } from '../variable-commands';
import {
  createMockParserContext,
  createTokenStream,
  createToken,
} from '../../../__test-utils__/parser-context-mock';
import type { IdentifierNode } from '../../parser-types';
import type { Token, ASTNode } from '../../../types/core';

describe('Variable Command Parsers', () => {
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

  describe('parseSetCommand', () => {
    it('should parse set with simple variable', () => {
      // set count to 0
      const tokens = createTokenStream(['count', 'to', '0'], ['identifier', 'keyword', 'number']);
      let pos = 0;

      const targetNode: ASTNode = {
        type: 'identifier',
        name: 'count',
        start: 0,
        end: 5,
        line: 1,
        column: 0,
      };
      const valueNode: ASTNode = {
        type: 'literal',
        value: 0,
        raw: '0',
        start: 10,
        end: 11,
        line: 1,
        column: 10,
      };

      let parseExprCallCount = 0;
      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          parseExprCallCount++;
          if (parseExprCallCount === 1) {
            // First call: parse the target 'count'
            pos++;
            (ctx as any).current = pos;
            return targetNode;
          }
          // Second call: parse the value '0'
          pos++;
          (ctx as any).current = pos;
          return valueNode;
        }),
        parsePrimary: vi.fn(() => null),
        createIdentifier: vi.fn((name: string) => ({
          type: 'identifier',
          name,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      // parseSetCommand reads ctx.current and ctx.tokens directly
      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const result = parseSetCommand(ctx, createIdentifierNode('set'));

      expect(result.name).toBe('set');
      expect(result.type).toBe('command');
      expect(result.args).toHaveLength(3);
      // args[0] = target
      expect(result.args[0]).toBe(targetNode);
      // args[1] = 'to' identifier
      expect((result.args[1] as any).name).toBe('to');
      // args[2] = value
      expect(result.args[2]).toBe(valueNode);
    });

    it('should parse set with local scope (:var)', () => {
      // set :myVar to "hello"
      const tokens = createTokenStream(
        [':', 'myVar', 'to', '"hello"'],
        ['symbol', 'identifier', 'keyword', 'string']
      );
      let pos = 0;

      let checkCallCount = 0;
      const valueNode: ASTNode = {
        type: 'literal',
        value: 'hello',
        raw: '"hello"',
        start: 12,
        end: 19,
        line: 1,
        column: 12,
      };

      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => {
          return tokens[pos]?.value === val;
        }),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          // Called for the value after 'to'
          pos++;
          (ctx as any).current = pos;
          return valueNode;
        }),
        parsePrimary: vi.fn(() => null),
        createIdentifier: vi.fn((name: string) => ({
          type: 'identifier',
          name,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const result = parseSetCommand(ctx, createIdentifierNode('set'));

      expect(result.name).toBe('set');
      expect(result.type).toBe('command');
      expect(result.args).toHaveLength(3);
      // Target should be a local-scoped identifier
      const target = result.args[0] as any;
      expect(target.type).toBe('identifier');
      expect(target.name).toBe('myVar');
      expect(target.scope).toBe('local');
      // 'to' keyword
      expect((result.args[1] as any).name).toBe('to');
      // value
      expect(result.args[2]).toBe(valueNode);
    });

    it('should parse set with global scope (::var)', () => {
      // set ::globalVar to 42
      const tokens = createTokenStream(
        [':', ':', 'globalVar', 'to', '42'],
        ['symbol', 'symbol', 'identifier', 'keyword', 'number']
      );
      let pos = 0;

      const valueNode: ASTNode = {
        type: 'literal',
        value: 42,
        raw: '42',
        start: 16,
        end: 18,
        line: 1,
        column: 16,
      };

      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          // Called for the value after 'to'
          pos++;
          (ctx as any).current = pos;
          return valueNode;
        }),
        parsePrimary: vi.fn(() => null),
        createIdentifier: vi.fn((name: string) => ({
          type: 'identifier',
          name,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const result = parseSetCommand(ctx, createIdentifierNode('set'));

      expect(result.name).toBe('set');
      expect(result.type).toBe('command');
      expect(result.args).toHaveLength(3);
      // Target should be a global-scoped identifier
      const target = result.args[0] as any;
      expect(target.type).toBe('identifier');
      expect(target.name).toBe('globalVar');
      expect(target.scope).toBe('global');
      // 'to' keyword
      expect((result.args[1] as any).name).toBe('to');
      // value
      expect(result.args[2]).toBe(valueNode);
    });

    it('should parse set with scope modifier (global keyword)', () => {
      // set global counter to 10
      const tokens = createTokenStream(
        ['global', 'counter', 'to', '10'],
        ['keyword', 'identifier', 'keyword', 'number']
      );
      let pos = 0;

      const valueNode: ASTNode = {
        type: 'literal',
        value: 10,
        raw: '10',
        start: 20,
        end: 22,
        line: 1,
        column: 20,
      };

      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          // Called for the value after 'to'
          pos++;
          (ctx as any).current = pos;
          return valueNode;
        }),
        parsePrimary: vi.fn(() => null),
        createIdentifier: vi.fn((name: string) => ({
          type: 'identifier',
          name,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const result = parseSetCommand(ctx, createIdentifierNode('set'));

      expect(result.name).toBe('set');
      expect(result.type).toBe('command');
      expect(result.args).toHaveLength(3);
      // Target should have global scope from the 'global' keyword
      const target = result.args[0] as any;
      expect(target.type).toBe('identifier');
      expect(target.name).toBe('counter');
      expect(target.scope).toBe('global');
      // 'to' keyword
      expect((result.args[1] as any).name).toBe('to');
      // value
      expect(result.args[2]).toBe(valueNode);
    });

    it('should throw if "to" keyword is missing', () => {
      // set count <eof> -- missing 'to'
      const tokens = createTokenStream(['count'], ['identifier']);
      let pos = 0;

      const targetNode: ASTNode = {
        type: 'identifier',
        name: 'count',
        start: 0,
        end: 5,
        line: 1,
        column: 0,
      };

      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          // Parse the target, consuming one token
          pos++;
          (ctx as any).current = pos;
          return targetNode;
        }),
        parsePrimary: vi.fn(() => null),
        createIdentifier: vi.fn((name: string) => ({
          type: 'identifier',
          name,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      expect(() => parseSetCommand(ctx, createIdentifierNode('set'))).toThrow(
        "Expected 'to' in set command"
      );
    });

    it('should parse set with expression value', () => {
      // set x to someExpression
      const tokens = createTokenStream(
        ['x', 'to', 'someExpression'],
        ['identifier', 'keyword', 'identifier']
      );
      let pos = 0;

      const targetNode: ASTNode = {
        type: 'identifier',
        name: 'x',
        start: 0,
        end: 1,
        line: 1,
        column: 0,
      };
      const valueNode: ASTNode = {
        type: 'identifier',
        name: 'someExpression',
        start: 5,
        end: 19,
        line: 1,
        column: 5,
      };

      let parseExprCallCount = 0;
      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          parseExprCallCount++;
          if (parseExprCallCount === 1) {
            pos++;
            (ctx as any).current = pos;
            return targetNode;
          }
          pos++;
          (ctx as any).current = pos;
          return valueNode;
        }),
        parsePrimary: vi.fn(() => null),
        createIdentifier: vi.fn((name: string) => ({
          type: 'identifier',
          name,
          start: 0,
          end: 0,
          line: 1,
          column: 0,
        })),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const result = parseSetCommand(ctx, createIdentifierNode('set'));

      expect(result.name).toBe('set');
      expect(result.type).toBe('command');
      expect(result.args).toHaveLength(3);
      expect(result.args[0]).toBe(targetNode);
      expect((result.args[1] as any).name).toBe('to');
      expect(result.args[2]).toBe(valueNode);
    });
  });

  describe('parseIncrementDecrementCommand', () => {
    it('should parse increment with default amount', () => {
      // increment count
      const tokens = createTokenStream(['count'], ['identifier']);
      let pos = 0;

      const targetNode: ASTNode = {
        type: 'identifier',
        name: 'count',
        start: 0,
        end: 5,
        line: 1,
        column: 0,
      };

      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          pos++;
          (ctx as any).current = pos;
          return targetNode;
        }),
        parsePrimary: vi.fn(() => null),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const commandToken = createToken('increment');
      const result = parseIncrementDecrementCommand(ctx, commandToken);

      expect(result.name).toBe('set');
      expect(result.type).toBe('command');
      expect((result as any).originalCommand).toBe('increment');
      expect(result.args).toHaveLength(3);
      // args[0] = target
      expect(result.args[0]).toBe(targetNode);
      // args[1] = 'to' identifier
      expect((result.args[1] as any).name).toBe('to');
      // args[2] = binary expression: target + 1
      const binaryExpr = result.args[2] as any;
      expect(binaryExpr.type).toBe('binaryExpression');
      expect(binaryExpr.operator).toBe('+');
      expect(binaryExpr.left).toBe(targetNode);
      // Default amount should be literal 1
      expect(binaryExpr.right.type).toBe('literal');
      expect(binaryExpr.right.value).toBe(1);
      expect(binaryExpr.right.raw).toBe('1');
    });

    it('should parse decrement with default amount', () => {
      // decrement count
      const tokens = createTokenStream(['count'], ['identifier']);
      let pos = 0;

      const targetNode: ASTNode = {
        type: 'identifier',
        name: 'count',
        start: 0,
        end: 5,
        line: 1,
        column: 0,
      };

      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          pos++;
          (ctx as any).current = pos;
          return targetNode;
        }),
        parsePrimary: vi.fn(() => null),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const commandToken = createToken('decrement');
      const result = parseIncrementDecrementCommand(ctx, commandToken);

      expect(result.name).toBe('set');
      expect(result.type).toBe('command');
      expect((result as any).originalCommand).toBe('decrement');
      expect(result.args).toHaveLength(3);
      // args[0] = target
      expect(result.args[0]).toBe(targetNode);
      // args[1] = 'to' identifier
      expect((result.args[1] as any).name).toBe('to');
      // args[2] = binary expression: target - 1
      const binaryExpr = result.args[2] as any;
      expect(binaryExpr.type).toBe('binaryExpression');
      expect(binaryExpr.operator).toBe('-');
      expect(binaryExpr.left).toBe(targetNode);
      expect(binaryExpr.right.type).toBe('literal');
      expect(binaryExpr.right.value).toBe(1);
    });

    it('should parse increment with custom amount', () => {
      // increment count by 5
      const tokens = createTokenStream(['count', 'by', '5'], ['identifier', 'keyword', 'number']);
      let pos = 0;

      const targetNode: ASTNode = {
        type: 'identifier',
        name: 'count',
        start: 0,
        end: 5,
        line: 1,
        column: 0,
      };
      const amountNode: ASTNode = {
        type: 'literal',
        value: 5,
        raw: '5',
        start: 9,
        end: 10,
        line: 1,
        column: 9,
      };

      let parseExprCallCount = 0;
      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          parseExprCallCount++;
          if (parseExprCallCount === 1) {
            // First call: parse the target 'count'
            pos++;
            (ctx as any).current = pos;
            return targetNode;
          }
          // Second call: parse the amount '5'
          pos++;
          (ctx as any).current = pos;
          return amountNode;
        }),
        parsePrimary: vi.fn(() => null),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const commandToken = createToken('increment');
      const result = parseIncrementDecrementCommand(ctx, commandToken);

      expect(result.name).toBe('set');
      expect(result.type).toBe('command');
      expect((result as any).originalCommand).toBe('increment');
      expect(result.args).toHaveLength(3);
      // args[0] = target
      expect(result.args[0]).toBe(targetNode);
      // args[1] = 'to' identifier
      expect((result.args[1] as any).name).toBe('to');
      // args[2] = binary expression: target + 5
      const binaryExpr = result.args[2] as any;
      expect(binaryExpr.type).toBe('binaryExpression');
      expect(binaryExpr.operator).toBe('+');
      expect(binaryExpr.left).toBe(targetNode);
      expect(binaryExpr.right).toBe(amountNode);
    });

    it('should parse increment with global modifier', () => {
      // increment global counter
      const tokens = createTokenStream(['global', 'counter'], ['keyword', 'identifier']);
      let pos = 0;

      const targetNode: ASTNode = {
        type: 'identifier',
        name: 'counter',
        start: 7,
        end: 14,
        line: 1,
        column: 7,
      };

      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          // Parse the target 'counter' (after 'global' has been consumed)
          pos++;
          (ctx as any).current = pos;
          return targetNode;
        }),
        parsePrimary: vi.fn(() => null),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const commandToken = createToken('increment');
      const result = parseIncrementDecrementCommand(ctx, commandToken);

      expect(result.name).toBe('set');
      expect(result.type).toBe('command');
      expect((result as any).originalCommand).toBe('increment');
      expect(result.args).toHaveLength(3);
      // Target should have global scope applied
      const target = result.args[0] as any;
      expect(target.type).toBe('identifier');
      expect(target.name).toBe('counter');
      expect(target.scope).toBe('global');
      // 'to' identifier
      expect((result.args[1] as any).name).toBe('to');
      // Binary expression: target + 1
      const binaryExpr = result.args[2] as any;
      expect(binaryExpr.type).toBe('binaryExpression');
      expect(binaryExpr.operator).toBe('+');
    });

    it('should throw if target expression is missing', () => {
      // increment <nothing>
      const tokens = createTokenStream([], []);
      let pos = 0;

      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => null),
        previous: vi.fn(() => ({ value: '', start: 0, end: 0, line: 1, column: 0 })),
        getPosition: vi.fn(() => ({ start: 0, end: 0, line: 1, column: 0 })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const commandToken = createToken('increment');
      expect(() => parseIncrementDecrementCommand(ctx, commandToken)).toThrow(
        'Expected variable or expression after increment'
      );
    });

    it('should throw if amount is missing after by', () => {
      // increment count by <nothing>
      const tokens = createTokenStream(['count', 'by'], ['identifier', 'keyword']);
      let pos = 0;

      const targetNode: ASTNode = {
        type: 'identifier',
        name: 'count',
        start: 0,
        end: 5,
        line: 1,
        column: 0,
      };

      let parseExprCallCount = 0;
      const ctx = createMockParserContext(tokens, {
        check: vi.fn((val: string) => tokens[pos]?.value === val),
        advance: vi.fn(() => {
          const t = tokens[pos];
          pos++;
          (ctx as any).current = pos;
          return t;
        }),
        peek: vi.fn(
          () => tokens[pos] || { kind: 'eof', value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        match: vi.fn((val: string) => {
          if (tokens[pos]?.value === val) {
            pos++;
            (ctx as any).current = pos;
            return true;
          }
          return false;
        }),
        isAtEnd: vi.fn(() => pos >= tokens.length),
        parseExpression: vi.fn(() => {
          parseExprCallCount++;
          if (parseExprCallCount === 1) {
            // First call: parse the target 'count'
            pos++;
            (ctx as any).current = pos;
            return targetNode;
          }
          // Second call: no amount available after 'by'
          return null;
        }),
        parsePrimary: vi.fn(() => null),
        previous: vi.fn(
          () => tokens[Math.max(0, pos - 1)] || { value: '', start: 0, end: 0, line: 1, column: 0 }
        ),
        getPosition: vi.fn(() => ({ start: 0, end: pos, line: 1, column: pos })),
      });

      (ctx as any).current = 0;
      (ctx as any).tokens = tokens;

      const commandToken = createToken('increment');
      expect(() => parseIncrementDecrementCommand(ctx, commandToken)).toThrow(
        "Expected amount after 'by' in increment command"
      );
    });
  });
});
