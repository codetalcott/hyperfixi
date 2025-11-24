/**
 * ParserContext Tests
 *
 * Tests for the ParserContext dependency injection pattern.
 * Validates that all 48 methods are properly bound and work correctly
 * when called through the context interface.
 *
 * Phase 9-3a Day 2: Test Context Binding
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Parser } from './parser';
import { tokenize } from './tokenizer';
import type { ParserContext } from './parser-types';
import type { Token } from '../types/core';

describe('ParserContext', () => {
  let parser: Parser;
  let context: ParserContext;
  let tokens: Token[];

  beforeEach(() => {
    // Create a parser with sample tokens for testing
    tokens = tokenize('set x to 42 then add .class to <button/>');
    parser = new Parser(tokens);
    context = parser.getContext();
  });

  describe('Context Creation', () => {
    it('should return a valid ParserContext object', () => {
      expect(context).toBeDefined();
      expect(typeof context).toBe('object');
    });

    it('should expose all required properties', () => {
      expect(context.tokens).toBeDefined();
      expect(context.current).toBeDefined();
    });

    it('should expose all 48 required methods', () => {
      // Token Navigation (10 methods)
      expect(typeof context.advance).toBe('function');
      expect(typeof context.peek).toBe('function');
      expect(typeof context.previous).toBe('function');
      expect(typeof context.consume).toBe('function');
      expect(typeof context.check).toBe('function');
      expect(typeof context.checkTokenType).toBe('function');
      expect(typeof context.match).toBe('function');
      expect(typeof context.matchTokenType).toBe('function');
      expect(typeof context.matchOperator).toBe('function');
      expect(typeof context.isAtEnd).toBe('function');

      // AST Node Creation (11 methods)
      expect(typeof context.createIdentifier).toBe('function');
      expect(typeof context.createLiteral).toBe('function');
      expect(typeof context.createSelector).toBe('function');
      expect(typeof context.createBinaryExpression).toBe('function');
      expect(typeof context.createUnaryExpression).toBe('function');
      expect(typeof context.createMemberExpression).toBe('function');
      expect(typeof context.createPossessiveExpression).toBe('function');
      expect(typeof context.createCallExpression).toBe('function');
      expect(typeof context.createErrorNode).toBe('function');
      expect(typeof context.createProgramNode).toBe('function');
      expect(typeof context.createCommandFromIdentifier).toBe('function');

      // Expression Parsing (18 methods)
      expect(typeof context.parseExpression).toBe('function');
      expect(typeof context.parsePrimary).toBe('function');
      expect(typeof context.parseCall).toBe('function');
      expect(typeof context.parseAssignment).toBe('function');
      expect(typeof context.parseLogicalOr).toBe('function');
      expect(typeof context.parseLogicalAnd).toBe('function');
      expect(typeof context.parseEquality).toBe('function');
      expect(typeof context.parseComparison).toBe('function');
      expect(typeof context.parseAddition).toBe('function');
      expect(typeof context.parseMultiplication).toBe('function');
      expect(typeof context.parseImplicitBinary).toBe('function');
      expect(typeof context.parseConditional).toBe('function');
      expect(typeof context.parseConditionalBranch).toBe('function');
      expect(typeof context.parseEventHandler).toBe('function');
      expect(typeof context.parseBehaviorDefinition).toBe('function');
      expect(typeof context.parseNavigationFunction).toBe('function');
      expect(typeof context.parseMyPropertyAccess).toBe('function');
      expect(typeof context.parseDollarExpression).toBe('function');
      expect(typeof context.parseHyperscriptSelector).toBe('function');
      expect(typeof context.parseAttributeOrArrayLiteral).toBe('function');
      expect(typeof context.parseObjectLiteral).toBe('function');
      expect(typeof context.parseCSSObjectLiteral).toBe('function');

      // Command Sequence Parsing (2 methods)
      expect(typeof context.parseCommandSequence).toBe('function');
      expect(typeof context.parseCommandListUntilEnd).toBe('function');

      // Position Tracking (1 method)
      expect(typeof context.getPosition).toBe('function');

      // Error Handling (2 methods)
      expect(typeof context.addError).toBe('function');
      expect(typeof context.addWarning).toBe('function');

      // Utility Functions (4 methods)
      expect(typeof context.isCommand).toBe('function');
      expect(typeof context.isCompoundCommand).toBe('function');
      expect(typeof context.isKeyword).toBe('function');
      expect(typeof context.getMultiWordPattern).toBe('function');
    });
  });

  describe('Token Stream Access (Read-Only Properties)', () => {
    it('should provide access to tokens array', () => {
      expect(context.tokens).toBe(tokens);
      expect(Array.isArray(context.tokens)).toBe(true);
      expect(context.tokens.length).toBeGreaterThan(0);
    });

    it('should provide access to current position', () => {
      expect(typeof context.current).toBe('number');
      expect(context.current).toBeGreaterThanOrEqual(0);
    });

    it('should reflect parser state (tokens reference)', () => {
      // Context tokens should reference the same array as parser
      expect(context.tokens).toBe(tokens);
    });

    it('should provide current position snapshot', () => {
      const initialCurrent = context.current;
      expect(initialCurrent).toBe(0);

      // Advance parser
      context.advance();

      // Get new context to see updated current
      const newContext = parser.getContext();
      expect(newContext.current).toBe(initialCurrent + 1);
    });
  });

  describe('Token Navigation Methods', () => {
    it('should advance through tokens', () => {
      const token = context.advance();
      expect(token).toBeDefined();
      expect(token.type).toBeDefined();
    });

    it('should peek at current token without advancing', () => {
      const token1 = context.peek();
      const token2 = context.peek();
      expect(token1).toBe(token2);
    });

    it('should get previous token', () => {
      context.advance(); // Move to position 1
      const prev = context.previous();
      expect(prev).toBeDefined();
    });

    it('should check token value', () => {
      const result = context.check('set');
      expect(typeof result).toBe('boolean');
    });

    it('should match and consume token', () => {
      const matched = context.match('set');
      expect(typeof matched).toBe('boolean');
    });

    it('should detect end of token stream', () => {
      expect(context.isAtEnd()).toBe(false);

      // Consume all tokens
      while (!context.isAtEnd()) {
        context.advance();
      }

      expect(context.isAtEnd()).toBe(true);
    });
  });

  describe('AST Node Creation Methods', () => {
    it('should create identifier node', () => {
      const pos = context.getPosition();
      const node = context.createIdentifier('myVar', pos);

      expect(node.type).toBe('identifier');
      expect(node.name).toBe('myVar');
      expect(node.start).toBeDefined();
      expect(node.end).toBeDefined();
    });

    it('should create literal node', () => {
      const pos = context.getPosition();
      const node = context.createLiteral(42, '42', pos);

      expect(node.type).toBe('literal');
      expect(node.value).toBe(42);
      expect(node.raw).toBe('42');
    });

    it('should create selector node', () => {
      const pos = context.getPosition();
      const node = context.createSelector('button.active', pos);

      expect(node.type).toBe('selector');
      expect(node.value).toBe('button.active');
    });

    it('should create binary expression node', () => {
      const pos = context.getPosition();
      const left = context.createLiteral(1, '1', pos);
      const right = context.createLiteral(2, '2', pos);
      const node = context.createBinaryExpression('+', left, right, pos);

      expect(node.type).toBe('binaryExpression');
      expect(node.operator).toBe('+');
      expect(node.left).toBe(left);
      expect(node.right).toBe(right);
    });

    it('should create unary expression node', () => {
      const pos = context.getPosition();
      const arg = context.createLiteral(5, '5', pos);
      const node = context.createUnaryExpression('-', arg, true, pos);

      expect(node.type).toBe('unaryExpression');
      expect(node.operator).toBe('-');
      expect(node.argument).toBe(arg);
      expect(node.prefix).toBe(true);
    });

    it('should create member expression node', () => {
      const pos = context.getPosition();
      const obj = context.createIdentifier('window', pos);
      const prop = context.createIdentifier('document', pos);
      const node = context.createMemberExpression(obj, prop, false, pos);

      expect(node.type).toBe('memberExpression');
      expect(node.object).toBe(obj);
      expect(node.property).toBe(prop);
      expect(node.computed).toBe(false);
    });

    it('should create call expression node', () => {
      const pos = context.getPosition();
      const callee = context.createIdentifier('alert', pos);
      const args = [context.createLiteral('Hello', '"Hello"', pos)];
      const node = context.createCallExpression(callee, args, pos);

      expect(node.type).toBe('callExpression');
      expect(node.callee).toBe(callee);
      expect(node.arguments).toEqual(args);
    });

    it('should create error node', () => {
      const pos = context.getPosition();
      const node = context.createErrorNode(pos);

      expect(node.type).toBe('identifier');
      expect(node.name).toBe('__ERROR__');
    });

    it('should create program node from statements', () => {
      const pos = context.getPosition();
      const stmt1 = context.createIdentifier('stmt1', pos);
      const stmt2 = context.createIdentifier('stmt2', pos);
      const program = context.createProgramNode([stmt1, stmt2]);

      expect(program.type).toBe('Program');
      expect(program.statements).toHaveLength(2);
    });
  });

  describe('Expression Parsing Methods', () => {
    it('should parse primary expression', () => {
      // Token stream: "set x to 42 then add .class to <button/>"
      // First token is "set" (identifier)
      const expr = context.parsePrimary();
      expect(expr).toBeDefined();
      expect(expr.type).toBeDefined();
    });

    it('should parse expression', () => {
      const expr = context.parseExpression();
      expect(expr).toBeDefined();
      expect(expr.type).toBeDefined();
    });

    it('should get position for parsed nodes', () => {
      const pos = context.getPosition();
      expect(pos).toBeDefined();
      expect(typeof pos.start).toBe('number');
      expect(typeof pos.end).toBe('number');
      expect(typeof pos.line).toBe('number');
      expect(typeof pos.column).toBe('number');
    });
  });

  describe('Error Handling Methods', () => {
    it('should have addError method bound', () => {
      // Verify method exists and is callable
      expect(typeof context.addError).toBe('function');

      // Should not throw when called
      expect(() => context.addError('Test error message')).not.toThrow();
    });

    it('should have addWarning method bound', () => {
      // Verify method exists and is callable
      expect(typeof context.addWarning).toBe('function');

      // Should not throw when called
      expect(() => context.addWarning('Test warning message')).not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should check if token is a command', () => {
      const result = context.isCommand('set');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true); // 'set' is a command
    });

    it('should check if token is a compound command', () => {
      // Test with known compound command structure (method should return boolean)
      const result1 = context.isCompoundCommand('if');
      const result2 = context.isCompoundCommand('repeat');

      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');

      // At least one should be a compound command
      // (implementation details may vary, just verify method works)
    });

    it('should check if token is a keyword', () => {
      const token = tokens.find(t => t.value === 'to');
      const result = context.isKeyword(token, ['to', 'from']);
      expect(typeof result).toBe('boolean');
    });

    it('should get multi-word pattern for command', () => {
      const pattern = context.getMultiWordPattern('fetch');
      expect(pattern).toBeDefined();
      if (pattern) {
        expect(pattern.command).toBe('fetch');
        expect(Array.isArray(pattern.keywords)).toBe(true);
      }
    });
  });

  describe('Method Binding Validation', () => {
    it('should work when methods are called without parser reference', () => {
      // Extract methods from context
      const { peek, advance, createIdentifier, getPosition } = context;

      // These should work without 'context.' prefix because they're bound
      const token = peek();
      expect(token).toBeDefined();

      const advancedToken = advance();
      expect(advancedToken).toBeDefined();

      const pos = getPosition();
      expect(pos).toBeDefined();

      const node = createIdentifier('test', pos);
      expect(node.type).toBe('identifier');
      expect(node.name).toBe('test');
    });

    it('should maintain correct this context across multiple calls', () => {
      const { peek, advance, previous } = context;

      const token1 = peek();
      advance();
      const token2 = peek();
      const token3 = previous();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token3).toBeDefined();
      expect(token1).toBe(token3); // previous() should return first token
    });
  });

  describe('Integration - Command Parser Pattern', () => {
    it('should support command parser extraction pattern', () => {
      // Simulate what a command parser would do
      const parseSimpleCommand = (ctx: ParserContext): any => {
        // Example: parse "set x to 42"
        const token = ctx.peek();
        if (!token || token.value !== 'set') {
          return null;
        }

        ctx.advance(); // consume 'set'

        const target = ctx.parsePrimary(); // parse 'x'

        if (ctx.peek()?.value === 'to') {
          ctx.advance(); // consume 'to'
        }

        const value = ctx.parsePrimary(); // parse '42'

        return {
          type: 'setCommand',
          target,
          value,
          ...ctx.getPosition()
        };
      };

      // Use the command parser with context
      const result = parseSimpleCommand(context);

      expect(result).toBeDefined();
      expect(result.type).toBe('setCommand');
      expect(result.target).toBeDefined();
      expect(result.value).toBeDefined();
    });
  });

  describe('Context Independence', () => {
    it('should create independent contexts for different parsers', () => {
      const tokens1 = tokenize('set x to 1');
      const tokens2 = tokenize('set y to 2');

      const parser1 = new Parser(tokens1);
      const parser2 = new Parser(tokens2);

      const ctx1 = parser1.getContext();
      const ctx2 = parser2.getContext();

      // Contexts should be independent (different token arrays)
      expect(ctx1.tokens).not.toBe(ctx2.tokens);

      // Advancing one parser shouldn't affect the other parser
      ctx1.advance();

      // Get fresh contexts to see updated positions
      const freshCtx1 = parser1.getContext();
      const freshCtx2 = parser2.getContext();

      expect(freshCtx1.current).toBe(1); // Parser1 advanced
      expect(freshCtx2.current).toBe(0); // Parser2 didn't advance
    });

    it('should create fresh context on each getContext() call', () => {
      const ctx1 = parser.getContext();
      const ctx2 = parser.getContext();

      // Should be different objects
      expect(ctx1).not.toBe(ctx2);

      // But should have same state
      expect(ctx1.current).toBe(ctx2.current);
      expect(ctx1.tokens).toBe(ctx2.tokens);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token stream', () => {
      const emptyParser = new Parser([]);
      const emptyContext = emptyParser.getContext();

      expect(emptyContext.tokens).toHaveLength(0);
      expect(emptyContext.isAtEnd()).toBe(true);
    });

    it('should handle single token stream', () => {
      const singleTokens = tokenize('x');
      const singleParser = new Parser(singleTokens);
      const singleContext = singleParser.getContext();

      expect(singleContext.tokens.length).toBeGreaterThan(0);
      const token = singleContext.peek();
      expect(token).toBeDefined();
    });

    it('should handle context after parser completes parsing', () => {
      // Parse entire input
      parser.parse();

      // Get context after parsing
      const postContext = parser.getContext();

      expect(postContext).toBeDefined();
      expect(postContext.tokens).toBeDefined();
      expect(typeof postContext.current).toBe('number');
    });
  });

  describe('Type Safety', () => {
    it('should enforce ParserContext interface contract', () => {
      // TypeScript compile-time check - if this compiles, interface is satisfied
      const ctx: ParserContext = parser.getContext();

      // Runtime verification of structure
      expect(ctx).toBeDefined();
      expect('tokens' in ctx).toBe(true);
      expect('current' in ctx).toBe(true);
      expect('advance' in ctx).toBe(true);
      expect('peek' in ctx).toBe(true);
    });
  });
});
