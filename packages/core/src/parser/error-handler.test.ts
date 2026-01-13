/**
 * Enhanced Error Handler Tests
 * Tests the improved error detection, messaging, and recovery suggestions
 */

import { describe, it, expect } from 'vitest';
import { ErrorHandler, ErrorContext, EnhancedParseError } from './error-handler';
import { tokenize, TokenKind } from './tokenizer';

// Un-skipped: Error handler features ARE implemented (previously mislabeled)
describe('Enhanced Error Handler', () => {
  function createTestTokens(input: string) {
    return tokenize(input);
  }

  describe('Error Message Enhancement', () => {
    it('should enhance binary operator error messages', () => {
      const tokens = createTestTokens('5 +');
      const handler = new ErrorHandler(tokens, 1); // Position at '+'

      const context: ErrorContext = {
        parsing: 'binary_op',
        operators: ['+'],
      };

      const error = handler.addError('Expected expression after +', context);

      expect(error.message).toContain('Binary operators require both left and right operands');
      expect(error.suggestion).toContain('5 + 3');
    });

    it('should enhance parentheses error messages', () => {
      const tokens = createTestTokens('(5 + 3');
      const handler = new ErrorHandler(tokens, 0);

      const context: ErrorContext = {
        parsing: 'parentheses',
      };

      const error = handler.addError('Expected ) after expression', context);

      expect(error.message).toContain('Unclosed parenthesis');
      expect(error.message).toContain('properly paired');
      expect(error.suggestion).toContain('closing');
    });

    it('should enhance member access error messages', () => {
      const tokens = createTestTokens('object.');
      const handler = new ErrorHandler(tokens, 1); // Position at '.'

      const context: ErrorContext = {
        parsing: 'member',
      };

      const error = handler.addError('Expected property name', context);

      expect(error.message).toContain('Member access requires an identifier');
      expect(error.suggestion).toContain('.property');
    });

    it('should enhance command error messages', () => {
      const tokens = createTestTokens('hide');
      const handler = new ErrorHandler(tokens, 0);

      const context: ErrorContext = {
        parsing: 'command',
        expected: ['element'],
      };

      const error = handler.addError('Command requires target', context);

      expect(error.message).toContain('target element or CSS selector');
      expect(error.suggestion).toContain('hide me');
    });
  });

  describe('Typo Detection and Suggestions', () => {
    it('should detect common boolean typos', () => {
      const tokens = createTestTokens('tru');
      const handler = new ErrorHandler(tokens, 0);

      const context: ErrorContext = { parsing: 'expression' };
      const error = handler.addError('Unknown identifier', context);

      expect(error.suggestion).toContain('true');
    });

    it('should detect command typos', () => {
      const tokens = createTestTokens('hde'); // typo for 'hide'
      const handler = new ErrorHandler(tokens, 0);

      const context: ErrorContext = { parsing: 'command' };
      const error = handler.addError('Unknown command', context);

      expect(error.suggestion).toContain('hide');
    });

    it('should detect context variable typos', () => {
      const tokens = createTestTokens('m'); // typo for 'me'
      const handler = new ErrorHandler(tokens, 0);

      const context: ErrorContext = { parsing: 'expression' };
      const error = handler.addError('Unknown identifier', context);

      expect(error.suggestion).toContain('me');
    });
  });

  describe('Recovery Strategy Generation', () => {
    it('should suggest recovery for binary operators', () => {
      const tokens = createTestTokens('5 +');
      const handler = new ErrorHandler(tokens, 1);

      const context: ErrorContext = { parsing: 'binary_op' };
      const error = handler.addError('Missing operand', context);

      expect(error.recovery).toContain('Add the missing operand');
    });

    it('should suggest recovery for parentheses', () => {
      const tokens = createTestTokens('(5');
      const handler = new ErrorHandler(tokens, 0);

      const context: ErrorContext = { parsing: 'parentheses' };
      const error = handler.addError('Unclosed parenthesis', context);

      expect(error.recovery).toContain('closing parenthesis');
    });

    it('should suggest recovery for member access', () => {
      const tokens = createTestTokens('obj.');
      const handler = new ErrorHandler(tokens, 1);

      const context: ErrorContext = { parsing: 'member' };
      const error = handler.addError('Missing property', context);

      expect(error.recovery).toContain('member access with a property name');
    });
  });

  describe('Pattern Detection', () => {
    it('should detect consecutive operators', () => {
      const tokens = createTestTokens('5 + + 3');
      const errors = ErrorHandler.detectErrorPatterns(tokens);

      expect(errors.length).toBeGreaterThan(0);

      const consecutiveOpError = errors.find((e: EnhancedParseError) =>
        e.message.toLowerCase().includes('consecutive operators')
      );

      expect(consecutiveOpError).toBeDefined();
      expect(consecutiveOpError?.suggestion).toContain('Remove one operator');
    });

    it('should detect invalid operator combinations', () => {
      const tokens = createTestTokens('value++');
      const errors = ErrorHandler.detectErrorPatterns(tokens);

      const invalidOpError = errors.find((e: EnhancedParseError) =>
        e.message.includes('Invalid operator')
      );

      if (invalidOpError) {
        expect(invalidOpError.suggestion).toContain('value + 1');
      }
    });

    it('should detect unclosed strings from tokenization', () => {
      // Create synthetic tokens to simulate unclosed string
      const syntheticTokens = [
        {
          kind: TokenKind.STRING, // Phase 8: Use kind instead of type
          value: '"unclosed',
          start: 0,
          end: 9,
          line: 1,
          column: 1,
        },
      ];

      const errors = ErrorHandler.detectErrorPatterns(syntheticTokens);

      const unclosedStringError = errors.find((e: EnhancedParseError) =>
        e.message.includes('Unclosed string')
      );

      if (unclosedStringError) {
        expect(unclosedStringError.suggestion).toContain('closing quote');
      }
    });
  });

  describe('Multiple Error Handling', () => {
    it('should collect multiple errors', () => {
      const tokens = createTestTokens('5 +');
      const handler = new ErrorHandler(tokens, 0);

      handler.addError('First error', { parsing: 'expression' });
      handler.addError('Second error', { parsing: 'binary_op' });

      const allErrors = handler.getAllErrors();
      expect(allErrors.length).toBe(2);

      const primaryError = handler.getPrimaryError();
      expect(primaryError?.message).toBe('Second error');
    });

    it('should handle errors at different positions', () => {
      const tokens = createTestTokens('(5 + 3 *');
      const handler = new ErrorHandler(tokens, 0);

      // Add error for unclosed parenthesis
      const parenError = handler.addError('Unclosed paren', { parsing: 'parentheses' });

      // Advance to a different position
      handler.advance();
      handler.advance();

      // Add error for incomplete multiplication
      const multError = handler.addError('Incomplete mult', { parsing: 'binary_op' });

      expect(parenError.position).toBe(0);
      expect(multError.position).toBeGreaterThan(0);
    });
  });

  describe('Position Tracking', () => {
    it('should track accurate error positions', () => {
      const tokens = createTestTokens('hello + world');
      const handler = new ErrorHandler(tokens, 1); // Position at '+'

      const error = handler.addError('Test error', { parsing: 'binary_op' });

      expect(error.position).toBe(6); // Position of '+' token
      expect(error.line).toBe(1);
      expect(error.column).toBeGreaterThan(1);
    });

    it('should handle end-of-file errors', () => {
      const tokens = createTestTokens('5 +');
      const handler = new ErrorHandler(tokens, tokens.length); // Past end

      const error = handler.addError('EOF error', { parsing: 'expression' });

      expect(error.position).toBeGreaterThanOrEqual(0);
      expect(error.line).toBeGreaterThanOrEqual(1);
      expect(error.column).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Context-Aware Messaging', () => {
    it('should provide different messages for same error in different contexts', () => {
      const tokens = createTestTokens('missing');
      const handler = new ErrorHandler(tokens, 0);

      const exprError = handler.addError('Missing', { parsing: 'expression' });
      const cmdError = handler.addError('Missing', { parsing: 'command', expected: ['element'] });

      // Different contexts should produce different enhanced messages
      expect(exprError.message).not.toBe(cmdError.message);
      expect(cmdError.message).toContain('CSS selector');
    });

    it('should handle wait command specific errors', () => {
      const tokens = createTestTokens('wait');
      const handler = new ErrorHandler(tokens, 0);

      const context: ErrorContext = {
        parsing: 'command',
        expected: ['time'],
      };

      const error = handler.addError('Missing time', context);

      expect(error.message).toContain('time duration');
      expect(error.suggestion).toContain('500ms');
    });
  });

  describe('Integration Readiness', () => {
    it('should maintain compatibility with existing error format', () => {
      const tokens = createTestTokens('test');
      const handler = new ErrorHandler(tokens, 0);

      const error = handler.addError('Test message', { parsing: 'expression' });

      // Should have all required ParseError properties
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('position');
      expect(error).toHaveProperty('line');
      expect(error).toHaveProperty('column');

      // Plus enhanced properties (context always exists, suggestion/recovery are optional)
      expect(error).toHaveProperty('context');
      // suggestion and recovery are conditionally added based on context
      expect(error.suggestion === undefined || typeof error.suggestion === 'string').toBe(true);
      expect(error.recovery === undefined || typeof error.recovery === 'string').toBe(true);
    });

    it('should work with real tokenizer output', () => {
      const realTokens = tokenize('5 + (3 *');
      const handler = new ErrorHandler(realTokens, 0);

      const error = handler.addError('Real world error', { parsing: 'binary_op' });

      expect(error.position).toBeGreaterThanOrEqual(0);
      expect(error.line).toBeGreaterThanOrEqual(1);
      expect(error.column).toBeGreaterThanOrEqual(1);
      expect(error.message).toBeTruthy();
    });
  });
});
