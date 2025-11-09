/**
 * Tests for Enhanced Commands
 * Validates that TypedCommandImplementation commands work correctly
 */

import { describe, it, expect } from 'vitest';
import {
  createEnhancedIncrementCommand,
  createEnhancedSetCommand,
  createEnhancedCallCommand,
} from './command-registry';
import { createTypedExecutionContext } from '../test-utilities';

describe('Enhanced Commands', () => {
  describe('Enhanced Increment Command', () => {
    it('should increment a variable by 1 by default', async () => {
      const command = createEnhancedIncrementCommand();
      const context = createTypedExecutionContext();
      context.variables = new Map([['counter', 5]]);

      const input = {
        target: 'counter',
      };

      const result = await command.execute(input, context);

      expect(result.oldValue).toBe(5);
      expect(result.newValue).toBe(6);
      expect(context.variables.get('counter')).toBe(6);
      expect(context.it).toBe(6);
    });

    it('should increment by specified amount', async () => {
      const command = createEnhancedIncrementCommand();
      const context = createTypedExecutionContext();
      context.variables = new Map([['score', 10]]);

      const input = {
        target: 'score',
        amount: 5,
      };

      const result = await command.execute(input, context);

      expect(result.oldValue).toBe(10);
      expect(result.newValue).toBe(15);
      expect(context.variables.get('score')).toBe(15);
    });

    it('should validate input correctly', () => {
      const command = createEnhancedIncrementCommand();

      // Valid input
      const validResult = command.validation.validate({
        target: 'counter',
        amount: 5,
      });
      expect(validResult.success).toBe(true);

      // Invalid input - missing target
      const invalidResult = command.validation.validate({
        amount: 5,
      });
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error?.type).toBe('missing-argument');
    });
  });

  describe('Enhanced Set Command', () => {
    it('should set a variable value', async () => {
      const command = createEnhancedSetCommand();
      const context = createTypedExecutionContext();

      const input = {
        target: 'username',
        value: 'john_doe',
      };

      const result = await command.execute(input, context);

      expect(result.newValue).toBe('john_doe');
      expect(result.targetType).toBe('variable');
      expect(context.locals?.get('username')).toBe('john_doe');
    });

    it('should set context variables', async () => {
      const command = createEnhancedSetCommand();
      const context = createTypedExecutionContext();

      const input = {
        target: 'it',
        value: 'test_result',
      };

      const result = await command.execute(input, context);

      expect(result.newValue).toBe('test_result');
      expect(result.targetType).toBe('context');
      expect(context.it).toBe('test_result');
    });
  });

  describe('Enhanced Call Command', () => {
    it('should execute a function and return result', async () => {
      const command = createEnhancedCallCommand();
      const context = createTypedExecutionContext();

      const testFunction = () => 'function_result';
      const input = {
        expression: testFunction,
      };

      const result = await command.execute(input, context);

      expect(result.result).toBe('function_result');
      expect(result.expressionType).toBe('function');
      expect(result.wasAsync).toBe(false);
      expect(context.it).toBe('function_result');
    });

    it('should handle literal values', async () => {
      const command = createEnhancedCallCommand();
      const context = createTypedExecutionContext();

      const input = {
        expression: 'literal_value',
      };

      const result = await command.execute(input, context);

      expect(result.result).toBe('literal_value');
      expect(result.expressionType).toBe('value');
      expect(result.wasAsync).toBe(false);
      expect(context.it).toBe('literal_value');
    });

    it('should handle async functions', async () => {
      const command = createEnhancedCallCommand();
      const context = createTypedExecutionContext();

      const asyncFunction = async () => 'async_result';
      const input = {
        expression: asyncFunction,
      };

      const result = await command.execute(input, context);

      expect(result.result).toBe('async_result');
      expect(result.expressionType).toBe('function');
      expect(result.wasAsync).toBe(true);
      expect(context.it).toBe('async_result');
    });
  });

  describe('Command Metadata', () => {
    it('should have proper metadata structure', () => {
      const command = createEnhancedIncrementCommand();
      const metadata = command.metadata;

      expect(metadata.name).toBe('increment');
      expect(metadata.description).toBeDefined();
      expect(Array.isArray(metadata.examples)).toBe(true);
      expect(metadata.examples.length).toBeGreaterThan(0);
      expect(metadata.syntax).toBeDefined();
      expect(metadata.category).toBe('data');
      expect(metadata.version).toBe('2.0.0');
    });
  });
});
