/**
 * Test suite for Hyperscript Tokenizer
 * Tests lexical analysis and token classification
 *
 * Phase 8: Updated to use TokenKind (lexical) + predicates (semantic)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Tokenizer, createTokenizer, tokenize, TokenKind, type Token } from './tokenizer';
import {
  isCommand,
  isKeyword,
  isEvent,
  isContextVar,
  isLogicalOperator,
  isComparisonOperator,
  isSymbol,
} from './token-predicates';

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
      // 'on' - lexically an identifier, semantically a keyword
      expect(tokens[0]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'on',
        start: 0,
        end: 2,
      });
      expect(isKeyword(tokens[0])).toBe(true);

      // 'click' - lexically an identifier, semantically an event
      expect(tokens[1]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'click',
        start: 3,
        end: 8,
      });
      expect(isEvent(tokens[1])).toBe(true);

      // 'hide' - lexically an identifier, semantically a command
      expect(tokens[2]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'hide',
        start: 9,
        end: 13,
      });
      expect(isCommand(tokens[2])).toBe(true);

      // 'me' - lexically an identifier, semantically a context var
      expect(tokens[3]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'me',
        start: 14,
        end: 16,
      });
      expect(isContextVar(tokens[3])).toBe(true);
    });

    it('should tokenize string literals', () => {
      const input = 'set x to "hello world"';
      const tokens = tokenize(input);

      expect(tokens).toHaveLength(4);
      expect(tokens[3]).toMatchObject({
        kind: TokenKind.STRING,
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
        kind: TokenKind.TIME,
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
        kind: TokenKind.SELECTOR,
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

      // Current tokenizer design tokenizes each element separately for parser flexibility
      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'get',
      });
      expect(isCommand(tokens[0])).toBe(true);

      expect(tokens[1]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'my',
      });
      expect(isContextVar(tokens[1])).toBe(true);

      expect(tokens[2]).toMatchObject({
        kind: TokenKind.OPERATOR,
        value: '.',
      });
      expect(tokens[3]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'value',
      });
    });

    it('should tokenize array/object literals', () => {
      const input = 'set data to {x: 1, y: 2}';
      const tokens = tokenize(input);

      // The tokenizer splits this into individual tokens rather than a single OBJECT_LITERAL
      // This is intentional - the parser handles the assembly of object literals from tokens
      expect(tokens.length).toBeGreaterThan(4);
      // Verify the curly braces are present as operators
      const openBrace = tokens.find(t => t.value === '{');
      const closeBrace = tokens.find(t => t.value === '}');
      expect(openBrace).toBeDefined();
      expect(closeBrace).toBeDefined();
    });

    it('should handle nested parentheses', () => {
      const input = 'if (x > (y + 1))';
      const tokens = tokenize(input);

      const parenTokens = tokens.filter(
        t => t.kind === TokenKind.OPERATOR && (t.value === '(' || t.value === ')')
      );
      expect(parenTokens).toHaveLength(4);
    });
  });

  describe('Special Characters and Operators', () => {
    it('should tokenize comparison operators', () => {
      const input = 'if x >= 10';
      const tokens = tokenize(input);

      expect(tokens).toHaveLength(4);
      expect(tokens[2]).toMatchObject({
        kind: TokenKind.OPERATOR,
        value: '>=',
        start: 5,
        end: 7,
      });
      expect(isComparisonOperator(tokens[2])).toBe(true);
    });

    it('should tokenize logical operators', () => {
      const input = 'if x and y or z';
      const tokens = tokenize(input);

      const andToken = tokens.find(t => t.value === 'and');
      const orToken = tokens.find(t => t.value === 'or');

      expect(andToken).toBeDefined();
      expect(orToken).toBeDefined();
      expect(isLogicalOperator(andToken!)).toBe(true);
      expect(isLogicalOperator(orToken!)).toBe(true);
    });

    it('should handle special symbols', () => {
      const input = 'put @foo into it';
      const tokens = tokenize(input);

      const symbolToken = tokens.find(t => t.value === '@foo');
      expect(symbolToken).toBeDefined();
      expect(symbolToken?.kind).toBe(TokenKind.SYMBOL);
      expect(isSymbol(symbolToken!)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unterminated strings', () => {
      const input = 'set x to "unterminated';
      const tokens = tokenize(input);

      // Should still tokenize what it can: set, x, to, "unterminated
      expect(tokens).toHaveLength(4);
      expect(tokens[3]).toMatchObject({
        kind: TokenKind.STRING,
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
      const inputs = ['line1\nline2', 'line1\r\nline2', 'line1\rline2'];

      inputs.forEach(input => {
        const tokens = tokenize(input);
        const line2Token = tokens.find(t => t.value === 'line2');
        expect(line2Token?.line).toBe(2);
      });
    });
  });

  describe('Context Classification (via predicates)', () => {
    it('should classify hyperscript keywords correctly', () => {
      // Pure keywords (only in KEYWORDS, not in COMMANDS)
      const pureKeywords = ['on', 'init', 'behavior', 'end', 'def'];
      pureKeywords.forEach(keyword => {
        const tokens = tokenize(keyword);
        expect(tokens[0].kind).toBe(TokenKind.IDENTIFIER);
        expect(isKeyword(tokens[0])).toBe(true);
      });

      // Dual-purpose tokens that are in both KEYWORDS and COMMANDS
      // These are semantically both keywords AND commands
      const dualPurpose = ['set', 'if', 'repeat'];
      dualPurpose.forEach(token => {
        const tokens = tokenize(token);
        expect(tokens[0].kind).toBe(TokenKind.IDENTIFIER);
        expect(isCommand(tokens[0])).toBe(true);
      });
    });

    it('should classify commands correctly', () => {
      const commands = ['hide', 'show', 'add', 'remove', 'toggle', 'put', 'get', 'fetch'];

      commands.forEach(command => {
        const tokens = tokenize(command);
        expect(tokens[0].kind).toBe(TokenKind.IDENTIFIER);
        expect(isCommand(tokens[0])).toBe(true);
      });
    });

    it('should classify context variables correctly', () => {
      const contextVars = ['me', 'it', 'you', 'result', 'my', 'its', 'your'];

      contextVars.forEach(contextVar => {
        const tokens = tokenize(contextVar);
        expect(tokens[0].kind).toBe(TokenKind.IDENTIFIER);
        expect(isContextVar(tokens[0])).toBe(true);
      });
    });
  });

  describe('CSS Selector Context Keywords', () => {
    it('should tokenize .class as CSS selector after positional keyword "first"', () => {
      const tokens = tokenize('first .active');

      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'first',
      });
      expect(tokens[1]).toMatchObject({
        kind: TokenKind.SELECTOR,
        value: '.active',
      });
    });

    it('should tokenize .class as CSS selector after positional keyword "last"', () => {
      const tokens = tokenize('last .item');

      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'last',
      });
      expect(tokens[1]).toMatchObject({
        kind: TokenKind.SELECTOR,
        value: '.item',
      });
    });

    it('should tokenize .class as CSS selector after "closest"', () => {
      const tokens = tokenize('closest .container');

      expect(tokens).toHaveLength(2);
      expect(tokens[1]).toMatchObject({
        kind: TokenKind.SELECTOR,
        value: '.container',
      });
    });

    it('should still tokenize . as member access after regular identifiers', () => {
      const tokens = tokenize('obj.property');

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'obj',
      });
      expect(tokens[1]).toMatchObject({
        kind: TokenKind.OPERATOR,
        value: '.',
      });
      expect(tokens[2]).toMatchObject({
        kind: TokenKind.IDENTIFIER,
        value: 'property',
      });
    });

    it('should tokenize adjacent dot after "previous" as member access, not CSS selector', () => {
      const tokens = tokenize('previous.innerText');

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'previous' });
      expect(tokens[1]).toMatchObject({ kind: TokenKind.OPERATOR, value: '.' });
      expect(tokens[2]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'innerText' });
    });

    it('should tokenize "my previous.innerText" as property access chain', () => {
      const tokens = tokenize('my previous.innerText');

      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'my' });
      expect(tokens[1]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'previous' });
      expect(tokens[2]).toMatchObject({ kind: TokenKind.OPERATOR, value: '.' });
      expect(tokens[3]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'innerText' });
    });

    it('should tokenize adjacent dot after "first" as member access', () => {
      const tokens = tokenize('first.property');

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'first' });
      expect(tokens[1]).toMatchObject({ kind: TokenKind.OPERATOR, value: '.' });
      expect(tokens[2]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'property' });
    });

    it('should tokenize adjacent dot after "closest" as member access', () => {
      const tokens = tokenize('closest.parentElement');

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'closest' });
      expect(tokens[1]).toMatchObject({ kind: TokenKind.OPERATOR, value: '.' });
      expect(tokens[2]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'parentElement' });
    });

    it('should tokenize adjacent dot after command as member access', () => {
      const tokens = tokenize('toggle.active');

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'toggle' });
      expect(tokens[1]).toMatchObject({ kind: TokenKind.OPERATOR, value: '.' });
      expect(tokens[2]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'active' });
    });

    it('should still tokenize spaced dot after "previous" as CSS selector', () => {
      const tokens = tokenize('previous .active');

      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ kind: TokenKind.IDENTIFIER, value: 'previous' });
      expect(tokens[1]).toMatchObject({ kind: TokenKind.SELECTOR, value: '.active' });
    });
  });

  describe('Performance', () => {
    it.skip('should tokenize large input efficiently', () => {
      const largeInput = 'on click '.repeat(1000) + 'hide me';
      const startTime = performance.now();

      const tokens = tokenize(largeInput);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete in under 200ms (generous for CI)
      expect(tokens.length).toBeGreaterThan(2000);
    });
  });
});
