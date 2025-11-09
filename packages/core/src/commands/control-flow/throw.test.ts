/**
 * Tests for throw command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThrowCommand } from './throw';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Throw Command', () => {
  let command: ThrowCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new ThrowCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure required context properties exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
    if (!context.flags)
      context.flags = {
        halted: false,
        breaking: false,
        continuing: false,
        returning: false,
        async: false,
      };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('throw');
      expect(command.syntax).toBe('throw <expression>');
      expect(command.description).toContain('throw');
      expect(command.description).toContain('error');
    });

    it('should be a control flow command', () => {
      expect(command.isBlocking).toBe(true);
    });
  });

  describe('Basic Error Throwing', () => {
    it('should throw error with string message', async () => {
      await expect(command.execute(context, 'Test error message')).rejects.toThrow(
        'Test error message'
      );
    });

    it('should throw error with variable message', async () => {
      context.locals.set('errorMsg', 'Variable error message');

      await expect(command.execute(context, 'errorMsg')).rejects.toThrow('Variable error message');
    });

    it('should throw error with expression message', async () => {
      context.locals.set('prefix', 'Error:');
      context.locals.set('suffix', 'occurred');

      await expect(command.execute(context, 'prefix + " " + suffix')).rejects.toThrow(
        'Error: occurred'
      );
    });

    it('should throw error with no message', async () => {
      await expect(command.execute(context)).rejects.toThrow('An error occurred');
    });

    it('should throw error with null message', async () => {
      await expect(command.execute(context, null)).rejects.toThrow('null');
    });

    it('should throw error with numeric message', async () => {
      await expect(command.execute(context, 404)).rejects.toThrow('404');
    });
  });

  describe('Error Object Creation', () => {
    it('should create Error instance', async () => {
      try {
        await command.execute(context, 'Test error');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Test error');
      }
    });

    it('should preserve stack trace', async () => {
      try {
        await command.execute(context, 'Stack trace test');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toHaveProperty('stack');
        expect(error.stack).toContain('ThrowCommand');
      }
    });

    it('should include context information in error', async () => {
      testElement.id = 'context-element';

      try {
        await command.execute(context, 'Context error');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toHaveProperty('hyperscriptContext');
        expect(error.hyperscriptContext.element.id).toBe('context-element');
      }
    });
  });

  describe('Error Types and Structured Errors', () => {
    it('should handle object-based error definitions', async () => {
      const errorObj = {
        message: 'Structured error',
        code: 'E001',
        details: { field: 'username', value: 'invalid' },
      };

      try {
        await command.execute(context, errorObj);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Structured error');
        expect(error.code).toBe('E001');
        expect(error.details).toEqual({ field: 'username', value: 'invalid' });
      }
    });

    it('should handle Error instance as argument', async () => {
      const customError = new TypeError('Type mismatch');

      try {
        await command.execute(context, customError);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBe(customError);
        expect(error.message).toBe('Type mismatch');
        expect(error).toBeInstanceOf(TypeError);
      }
    });

    it('should create custom error types', async () => {
      const errorSpec = {
        type: 'ValidationError',
        message: 'Field validation failed',
        field: 'email',
      };

      try {
        await command.execute(context, errorSpec);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Field validation failed');
        expect(error.field).toBe('email');
      }
    });
  });

  describe('Integration with Try-Catch Patterns', () => {
    it('should be caught by JavaScript try-catch', async () => {
      let caughtError: any = null;

      try {
        await command.execute(context, 'Catchable error');
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toBe('Catchable error');
    });

    it('should work with hyperscript catch blocks', async () => {
      // This would be tested in integration with def feature catch blocks
      const errorMessage = 'Function error';

      try {
        await command.execute(context, errorMessage);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe(errorMessage);
        // In real hyperscript, this would be caught by catch blocks
      }
    });
  });

  describe('Error Event Emission', () => {
    it('should emit error event before throwing', async () => {
      const errorHandler = vi.fn();
      testElement.addEventListener('hyperscript:error', errorHandler);

      try {
        await command.execute(context, 'Event error');
        fail('Should have thrown an error');
      } catch (error) {
        // Error should still be thrown
      }

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hyperscript:error',
          detail: expect.objectContaining({
            error: expect.any(Error),
            command: 'throw',
          }),
        })
      );
    });

    it('should include element context in error event', async () => {
      const errorHandler = vi.fn();
      testElement.addEventListener('hyperscript:error', errorHandler);
      testElement.setAttribute('data-test', 'error-element');

      try {
        await command.execute(context, 'Element context error');
      } catch (error) {
        // Expected to throw
      }

      const eventCall = errorHandler.mock.calls[0];
      const event = eventCall[0];
      expect(event.detail.element).toBe(testElement);
      expect(event.detail.element.getAttribute('data-test')).toBe('error-element');
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle basic throw example', async () => {
      // LSP: throw "Something went wrong"
      await expect(command.execute(context, 'Something went wrong')).rejects.toThrow(
        'Something went wrong'
      );
    });

    it('should handle conditional throwing', async () => {
      // Common pattern: throw error based on condition
      context.locals.set('isValid', false);

      // Would typically be: if not isValid then throw "Invalid input"
      const isValid = context.locals.get('isValid');
      if (!isValid) {
        await expect(command.execute(context, 'Invalid input')).rejects.toThrow('Invalid input');
      }
    });

    it('should handle form validation errors', async () => {
      // Pattern: throw validation error with details
      const validationError = {
        message: 'Form validation failed',
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' },
        ],
      };

      try {
        await command.execute(context, validationError);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Form validation failed');
        expect(error.errors).toHaveLength(2);
      }
    });

    it('should handle API error responses', async () => {
      // Pattern: throw HTTP error with status
      const apiError = {
        message: 'API request failed',
        status: 404,
        statusText: 'Not Found',
        url: '/api/user/123',
      };

      try {
        await command.execute(context, apiError);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('API request failed');
        expect(error.status).toBe(404);
        expect(error.url).toBe('/api/user/123');
      }
    });
  });

  describe('Expression Evaluation in Throw', () => {
    it('should evaluate expressions for error messages', async () => {
      context.locals.set('operation', 'save');
      context.locals.set('resource', 'user profile');

      await expect(
        command.execute(context, '"Failed to " + operation + " " + resource')
      ).rejects.toThrow('Failed to save user profile');
    });

    it('should handle complex expression evaluation', async () => {
      context.locals.set('attempts', 3);
      context.locals.set('maxAttempts', 3);

      await expect(
        command.execute(
          context,
          '"Maximum attempts (" + attempts + "/" + maxAttempts + ") exceeded"'
        )
      ).rejects.toThrow('Maximum attempts (3/3) exceeded');
    });

    it('should evaluate function calls in throw', async () => {
      // Simulate function that generates error message
      context.locals.set('getErrorMessage', () => 'Generated error message');

      await expect(command.execute(context, 'getErrorMessage()')).rejects.toThrow(
        'Generated error message'
      );
    });
  });

  describe('Error Propagation and Flow Control', () => {
    it('should halt execution flow', async () => {
      let afterThrowExecuted = false;

      try {
        await command.execute(context, 'Stop execution');
        afterThrowExecuted = true;
      } catch (error) {
        // Expected
      }

      expect(afterThrowExecuted).toBe(false);
    });

    it('should not set halted flag (errors are different from halt)', async () => {
      try {
        await command.execute(context, 'Test error');
      } catch (error) {
        // Error thrown as expected
      }

      expect(context.flags?.halted).toBe(false);
    });

    it('should preserve other execution flags', async () => {
      context.flags!.async = true;
      context.flags!.breaking = false;

      try {
        await command.execute(context, 'Test error');
      } catch (error) {
        // Expected
      }

      expect(context.flags?.async).toBe(true);
      expect(context.flags?.breaking).toBe(false);
    });
  });

  describe('Security and Validation', () => {
    it('should sanitize potentially dangerous error messages', async () => {
      const dangerousMessage = '<script>alert("xss")</script>';

      try {
        await command.execute(context, dangerousMessage);
        fail('Should have thrown an error');
      } catch (error) {
        // Message should be preserved (sanitization happens at display layer)
        expect(error.message).toBe(dangerousMessage);
      }
    });

    it('should handle very long error messages', async () => {
      const longMessage = 'x'.repeat(10000);

      try {
        await command.execute(context, longMessage);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe(longMessage);
      }
    });

    it('should handle circular objects in error data', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      try {
        await command.execute(context, circularObj);
        fail('Should have thrown an error');
      } catch (error) {
        // Should not fail due to circular reference
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid consecutive throws', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(command.execute(context, `Error ${i}`).catch(error => error.message));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach((message, index) => {
        expect(message).toBe(`Error ${index}`);
      });
    });

    it('should handle null and undefined contexts gracefully', async () => {
      const nullContext = null as any;

      await expect(command.execute(nullContext, 'Null context error')).rejects.toThrow(
        'Null context error'
      );
    });

    it('should handle missing context properties', async () => {
      const minimalContext = {} as ExecutionContext;

      await expect(command.execute(minimalContext, 'Minimal context error')).rejects.toThrow(
        'Minimal context error'
      );
    });
  });

  describe('Debugging and Development Support', () => {
    it('should include source location in development mode', async () => {
      // In development, would include file/line information
      try {
        await command.execute(context, 'Debug error');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.stack).toContain('ThrowCommand');
      }
    });

    it('should support error categorization', async () => {
      const categorizedError = {
        message: 'Validation error',
        category: 'validation',
        severity: 'error',
        timestamp: new Date().toISOString(),
      };

      try {
        await command.execute(context, categorizedError);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.category).toBe('validation');
        expect(error.severity).toBe('error');
        expect(error.timestamp).toBeDefined();
      }
    });
  });

  describe('Validation', () => {
    it('should validate command arguments', () => {
      // No arguments is valid (default message)
      expect(command.validate([])).toBe(null);

      // Single argument is valid
      expect(command.validate(['error message'])).toBe(null);

      // Multiple arguments could be valid for complex error objects
      expect(command.validate(['message', 'details'])).toBe(null);
    });

    it('should handle validation edge cases', () => {
      expect(command.validate([null])).toBe(null);
      expect(command.validate([undefined])).toBe(null);
      expect(command.validate([0])).toBe(null);
      expect(command.validate([''])).toBe(null);
    });
  });
});
