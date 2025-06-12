/**
 * Test suite for Hyperscript Tokenizer
 * Tests lexical analysis and token classification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Tokenizer,
  createTokenizer,
  tokenize,
  TokenType,
  type Token,
} from './tokenizer';

describe('Hyperscript Tokenizer', () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = createTokenizer();
  });

  describe('Basic Tokenization', () => {
    it('should tokenize simple command', () => {
      const input = 'on click hide me';
      const tokens = tokenize(input);
      
      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toMatchObject({
        type: TokenType.KEYWORD,
        value: 'on',
        start: 0,
        end: 2,
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.EVENT,
        value: 'click',
        start: 3,
        end: 8,
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.COMMAND,
        value: 'hide',
        start: 9,
        end: 13,
      });
      expect(tokens[3]).toMatchObject({
        type: TokenType.CONTEXT_VAR,
        value: 'me',
        start: 14,
        end: 16,
      });
    });

    it('should tokenize string literals', () => {
      const input = 'set x to "hello world"';
      const tokens = tokenize(input);
      
      expect(tokens).toHaveLength(4);
      expect(tokens[3]).toMatchObject({
        type: TokenType.STRING,
        value: '"hello world"',
        start: 9,
        end: 22,
      });
    });

    it('should tokenize numbers', () => {
      const input = 'wait 500ms';
      const tokens = tokenize(input);
      
      expect(tokens).toHaveLength(2);
      expect(tokens[1]).toMatchObject({
        type: TokenType.TIME_EXPRESSION,
        value: '500ms',
        start: 5,
        end: 10,
      });
    });

    it('should handle CSS selectors', () => {
      const input = 'put "text" into #target';
      const tokens = tokenize(input);
      
      expect(tokens).toHaveLength(4);
      expect(tokens[3]).toMatchObject({
        type: TokenType.ID_SELECTOR,
        value: '#target',
        start: 16,
        end: 23,
      });
    });
  });

  describe('Complex Expressions', () => {
    it('should tokenize property access', () => {
      const input = 'get my.value';
      const tokens = tokenize(input);
      
      expect(tokens).toHaveLength(2);
      expect(tokens[1]).toMatchObject({
        type: TokenType.PROPERTY_ACCESS,
        value: 'my.value',
        start: 4,
        end: 12,
      });
    });

    it('should tokenize array/object literals', () => {
      const input = 'set data to {x: 1, y: 2}';
      const tokens = tokenize(input);
      
      const objectToken = tokens.find(t => t.type === TokenType.OBJECT_LITERAL);
      expect(objectToken).toBeDefined();
      expect(objectToken?.value).toBe('{x: 1, y: 2}');
    });

    it('should handle nested parentheses', () => {
      const input = 'if (x > (y + 1))';
      const tokens = tokenize(input);
      
      const parenTokens = tokens.filter(t => t.type === TokenType.OPERATOR && (t.value === '(' || t.value === ')'));
      expect(parenTokens).toHaveLength(4);
    });
  });

  describe('Special Characters and Operators', () => {
    it('should tokenize comparison operators', () => {
      const input = 'if x >= 10';
      const tokens = tokenize(input);
      
      expect(tokens).toHaveLength(4);
      expect(tokens[2]).toMatchObject({
        type: TokenType.COMPARISON_OPERATOR,
        value: '>=',
        start: 5,
        end: 7,
      });
    });

    it('should tokenize logical operators', () => {
      const input = 'if x and y or z';
      const tokens = tokenize(input);
      
      const andToken = tokens.find(t => t.value === 'and');
      const orToken = tokens.find(t => t.value === 'or');
      
      expect(andToken?.type).toBe(TokenType.LOGICAL_OPERATOR);
      expect(orToken?.type).toBe(TokenType.LOGICAL_OPERATOR);
    });

    it('should handle special symbols', () => {
      const input = 'put @foo into it';
      const tokens = tokenize(input);
      
      const symbolToken = tokens.find(t => t.value === '@foo');
      expect(symbolToken?.type).toBe(TokenType.SYMBOL);
    });
  });

  describe('Error Handling', () => {
    it('should handle unterminated strings', () => {
      const input = 'set x to "unterminated';
      const tokens = tokenize(input);
      
      // Should still tokenize what it can: set, x, to, "unterminated
      expect(tokens).toHaveLength(4);
      expect(tokens[3]).toMatchObject({
        type: TokenType.STRING,
        value: '"unterminated',
        start: 9,
        end: 22,
      });
    });

    it('should handle empty input', () => {
      const tokens = tokenize('');
      expect(tokens).toHaveLength(0);
    });

    it('should handle whitespace-only input', () => {
      const tokens = tokenize('   \n\t  ');
      expect(tokens).toHaveLength(0);
    });
  });

  describe('Position Tracking', () => {
    it('should track line and column numbers', () => {
      const input = 'on click\n  hide me\n  show #other';
      const tokens = tokenize(input);
      
      // Find tokens on different lines
      const hideToken = tokens.find(t => t.value === 'hide');
      const showToken = tokens.find(t => t.value === 'show');
      
      expect(hideToken?.line).toBe(2);
      expect(hideToken?.column).toBe(3);
      expect(showToken?.line).toBe(3);
      expect(showToken?.column).toBe(3);
    });

    it('should handle various line endings', () => {
      const inputs = [
        'line1\nline2',
        'line1\r\nline2',
        'line1\rline2',
      ];
      
      inputs.forEach(input => {
        const tokens = tokenize(input);
        const line2Token = tokens.find(t => t.value === 'line2');
        expect(line2Token?.line).toBe(2);
      });
    });
  });

  describe('Context Classification', () => {
    it('should classify hyperscript keywords correctly', () => {
      const keywords = ['on', 'init', 'behavior', 'def', 'set', 'if', 'repeat', 'end'];
      
      keywords.forEach(keyword => {
        const tokens = tokenize(keyword);
        expect(tokens[0].type).toBe(TokenType.KEYWORD);
      });
    });

    it('should classify commands correctly', () => {
      const commands = ['hide', 'show', 'add', 'remove', 'toggle', 'put', 'get', 'fetch'];
      
      commands.forEach(command => {
        const tokens = tokenize(command);
        expect(tokens[0].type).toBe(TokenType.COMMAND);
      });
    });

    it('should classify context variables correctly', () => {
      const contextVars = ['me', 'it', 'you', 'result', 'my', 'its', 'your'];
      
      contextVars.forEach(contextVar => {
        const tokens = tokenize(contextVar);
        expect(tokens[0].type).toBe(TokenType.CONTEXT_VAR);
      });
    });
  });

  describe('Performance', () => {
    it('should tokenize large input efficiently', () => {
      const largeInput = 'on click '.repeat(1000) + 'hide me';
      const startTime = performance.now();
      
      const tokens = tokenize(largeInput);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(tokens.length).toBeGreaterThan(2000);
    });
  });
});