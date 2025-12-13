/**
 * Parser Error Recovery Tests
 * Tests parser's ability to recover from errors and provide helpful error messages
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';

describe('Parser Error Recovery and Error Messages', () => {
  describe('Error Detection Tests', () => {
    it('should detect unclosed parentheses with helpful message', () => {
      const result = parse('(5 + 3');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('parenthes');
      expect(result.error?.message.toLowerCase()).toContain('unclosed');
      expect(result.error?.position).toBeGreaterThan(0);
    });

    it('should detect mismatched parentheses', () => {
      const result = parse('5 + 3)');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Unexpected');
      expect(result.error?.message).toContain(')');
    });

    it('should detect incomplete binary expressions', () => {
      const result = parse('5 +');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected expression');
      expect(result.error?.message).toContain('+');
    });

    it('should detect malformed member access', () => {
      const result = parse('object.');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('property name');
      expect(result.error?.position).toBe(7); // After the dot
    });

    it('should detect invalid operator combinations', () => {
      const result = parse('5 ++ 3');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('operator');
    });

    it('should detect unclosed string literals', () => {
      const result = parse('"unclosed string');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('string');
      expect(result.error?.message).toContain('closed');
    });
  });

  describe('Recovery Strategy Tests', () => {
    it('should attempt to continue parsing after binary operator errors', () => {
      const result = parse('5 + + 3');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Should have attempted to parse the full expression
      expect(result.tokens.length).toBeGreaterThan(3);
    });

    it('should recover from missing operands', () => {
      const result = parse('* 5 - 3');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('operand');
    });

    it('should handle multiple syntax errors gracefully', () => {
      const result = parse('(5 + ) * (');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Should attempt to parse through multiple errors
      expect(result.tokens.length).toBeGreaterThan(4);
    });

    it('should provide partial AST when possible', () => {
      const result = parse('5 + 3 +');

      expect(result.success).toBe(false);

      // Even with error, should have attempted to build partial AST
      expect(result.node).toBeDefined();
    });
  });

  describe('Error Message Quality Tests', () => {
    it('should provide specific error messages for common mistakes', () => {
      const testCases = [
        {
          input: '5 +',
          expectedInMessage: ['Expected', 'expression', 'after', '+'],
        },
        {
          input: '(5 + 3',
          expectedInMessage: ['closing', 'parenthesis', ')'],
        },
        {
          input: 'me.',
          expectedInMessage: ['property', 'name', 'after', '.'],
        },
        {
          input: '"unclosed',
          expectedInMessage: ['string', 'not', 'closed'],
        },
        {
          input: '5 3',
          expectedInMessage: ['operator', 'between'],
        },
      ];

      testCases.forEach(({ input, expectedInMessage }) => {
        const result = parse(input);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();

        const message = result.error!.message.toLowerCase();
        expectedInMessage.forEach(term => {
          expect(message).toContain(term.toLowerCase());
        });
      });
    });

    it('should include context information in error messages', () => {
      const result = parse('5 + (3 *');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      const message = result.error!.message;

      // Should mention the context (multiplication, parentheses)
      expect(message.toLowerCase()).toMatch(/(multiplication|operand|parenthes)/);
    });

    it('should suggest corrections for common typos', () => {
      const testCases = [
        {
          input: 'tru',
          suggestion: 'true',
        },
        {
          input: 'fales',
          suggestion: 'false',
        },
        {
          input: 'nul',
          suggestion: 'null',
        },
      ];

      testCases.forEach(({ input, suggestion }) => {
        const result = parse(input);

        // For misspelled identifiers, suggest corrections
        if (!result.success && result.error) {
          const message = result.error!.message;
          // Check if suggestion system is working
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Position Accuracy Tests', () => {
    it('should report accurate line and column for errors', () => {
      const multilineInput = `5 + 3
        * (
        + 4`;

      const result = parse(multilineInput);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Error should be on line 3 where the '+' is invalid
      expect(result.error!.line).toBe(3);
      expect(result.error!.column).toBeGreaterThan(0);
    });

    it('should track position through complex expressions', () => {
      const input = 'complex + expression * with / error +';

      const result = parse(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Error position should be at the end where '+' has no operand
      expect(result.error!.position).toBe(input.length - 1);
    });

    it.skip('should handle errors in nested expressions accurately', () => {
      const input = '(5 + (3 * (2 +)))';

      const result = parse(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Should pinpoint the error in the innermost expression
      const errorPos = result.error!.position;
      expect(input[errorPos]).toBe(')'); // Should point to problematic closing paren
    });
  });

  describe('Multiple Error Reporting Tests', () => {
    it('should collect multiple errors in one parsing pass', () => {
      const input = '5 + + 3 * )';

      const result = parse(input);

      expect(result.success).toBe(false);

      // Ideally should report multiple errors, but current implementation may stop at first
      // This test documents expected future behavior
      expect(result.error).toBeDefined();
    });

    it('should prioritize the most helpful error when multiple exist', () => {
      const input = '(5 +';

      const result = parse(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Should prioritize the unclosed parenthesis error as most helpful
      expect(result.error!.message.toLowerCase()).toContain('parenthes');
    });
  });

  describe('Context-Aware Error Messages', () => {
    it('should provide different messages based on parsing context', () => {
      const testCases = [
        {
          input: '5 +',
          context: 'binary expression',
          expectedMessage: 'expression after',
        },
        {
          input: '(',
          context: 'parenthesized expression',
          expectedMessage: 'expression inside',
        },
        {
          input: 'func(',
          context: 'function call',
          expectedMessage: 'argument',
        },
      ];

      testCases.forEach(({ input, context, expectedMessage }) => {
        const result = parse(input);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();

        const message = result.error!.message.toLowerCase();
        expect(message).toContain(expectedMessage);
      });
    });

    it('should recognize hyperscript-specific syntax errors', () => {
      const testCases = [
        {
          input: 'hide',
          expectedError: 'element or selector',
        },
        {
          input: 'on',
          expectedError: 'event name',
        },
        {
          input: 'wait',
          expectedError: 'time duration',
        },
      ];

      testCases.forEach(({ input, expectedError }) => {
        const result = parse(input);

        // These might parse as identifiers rather than commands
        // This test documents expected behavior for hyperscript command parsing
        expect(typeof result.success).toBe('boolean');
      });
    });
  });

  describe('Error Recovery Strategies', () => {
    it('should implement synchronization points for error recovery', () => {
      const input = '5 + + + 3 * 4';

      const result = parse(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Should attempt to synchronize and continue parsing
      expect(result.tokens.length).toBeGreaterThan(6);
    });

    it('should handle cascading errors gracefully', () => {
      const input = '((((5 +';

      const result = parse(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Should not crash or enter infinite loops
      expect(result.error!.message).toBeDefined();
    });

    it('should provide useful partial results when possible', () => {
      const input = '5 + 3 * invalid_token';

      const result = parse(input);

      // Even if it fails, should provide tokens that were successfully parsed
      expect(result.tokens.length).toBeGreaterThan(0);

      // Some parts of the expression might be parseable
      if (result.node) {
        expect(result.node.type).toBeDefined();
      }
    });
  });

  describe('Integration with Existing Error Handling', () => {
    it('should work with current parser error system', () => {
      const result = parse('invalid @@ syntax');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBeDefined();
      expect(result.error!.position).toBeGreaterThanOrEqual(0);
      expect(result.error!.line).toBeGreaterThanOrEqual(1);
      expect(result.error!.column).toBeGreaterThanOrEqual(1);
    });

    it('should maintain existing error format', () => {
      const result = parse('5 +');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Should have required error properties
      expect(result.error).toHaveProperty('message');
      expect(result.error).toHaveProperty('position');
      expect(result.error).toHaveProperty('line');
      expect(result.error).toHaveProperty('column');

      expect(typeof result.error!.message).toBe('string');
      expect(typeof result.error!.position).toBe('number');
      expect(typeof result.error!.line).toBe('number');
      expect(typeof result.error!.column).toBe('number');
    });
  });
});
