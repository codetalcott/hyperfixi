/**
 * Tests for lightweight runtime validators (zod-free)
 * These validators are generated from zod schemas during build time
 */

import { describe, it, expect } from 'vitest';
import {
  createStringValidator,
  createObjectValidator,
  createArrayValidator,
  createTupleValidator,
  createUnionValidator,
} from './lightweight-validators';

describe('Lightweight Validators', () => {
  describe('String Validator', () => {
    it('should validate strings correctly', () => {
      const validator = createStringValidator({ minLength: 3, maxLength: 10 });

      expect(validator.validate('hello')).toEqual({
        success: true,
        data: 'hello',
      });

      const result = validator.validate('hi');
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        type: 'runtime-error',
        message: 'String must be at least 3 characters long',
      });
    });

    it('should handle optional strings', () => {
      const validator = createStringValidator({ optional: true });

      expect(validator.validate(undefined)).toEqual({
        success: true,
        data: undefined,
      });

      expect(validator.validate('test')).toEqual({
        success: true,
        data: 'test',
      });
    });
  });

  describe('Object Validator', () => {
    it('should validate objects with required fields', () => {
      const validator = createObjectValidator({
        name: createStringValidator({}),
        age: createStringValidator({ pattern: /^\d+$/ }),
      });

      expect(validator.validate({ name: 'John', age: '25' })).toEqual({
        success: true,
        data: { name: 'John', age: '25' },
      });

      const result = validator.validate({ name: 'John' });
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        type: 'missing-argument',
        message: 'Required field "age" is missing',
        path: 'age',
      });
    });
  });

  describe('Array Validator', () => {
    it('should validate arrays of items', () => {
      const validator = createArrayValidator(createStringValidator({}));

      expect(validator.validate(['a', 'b', 'c'])).toEqual({
        success: true,
        data: ['a', 'b', 'c'],
      });

      const result = validator.validate(['a', 123, 'c']);
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        message: 'Expected string, received number',
        path: '1',
      });
    });
  });

  describe('Tuple Validator', () => {
    it('should validate fixed-length tuples', () => {
      const validator = createTupleValidator([
        createStringValidator({}),
        createStringValidator({ pattern: /^from$/ }),
        createStringValidator({}),
      ]);

      expect(validator.validate(['property', 'from', 'element'])).toEqual({
        success: true,
        data: ['property', 'from', 'element'],
      });

      const result = validator.validate(['property', 'to', 'element']);
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        message: 'Expected "from", received "to"',
        path: '1',
      });
    });
  });

  describe('Union Validator', () => {
    it('should validate union types', () => {
      const validator = createUnionValidator([
        createStringValidator({}),
        createStringValidator({ pattern: /^\d+$/ }),
      ]);

      expect(validator.validate('hello')).toEqual({
        success: true,
        data: 'hello',
      });

      expect(validator.validate('123')).toEqual({
        success: true,
        data: '123',
      });

      const result = validator.validate(123);
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        type: 'type-mismatch',
        message: 'Value does not match any union type',
      });
    });
  });

  describe('Environment-based validation', () => {
    // Note: skipValidation is computed at module load time, so changing
    // process.env.NODE_ENV after import has no effect on existing validators.
    // These tests verify current behavior (dev mode since tests run in test env).

    it('should perform validation in development/test mode', () => {
      const validator = createStringValidator({ minLength: 10 });

      const result = validator.validate('short');
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        type: 'runtime-error',
        message: 'String must be at least 10 characters long',
      });
    });

    it('should pass valid values in development/test mode', () => {
      const validator = createStringValidator({ minLength: 3 });

      const result = validator.validate('hello world');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello world');
    });
  });
});

describe('Integration with HyperScript Commands', () => {
  it('should validate take command arguments', () => {
    // Simulate the take command validator from enhanced-take.ts
    const takeCommandValidator = createTupleValidator([
      createStringValidator({ description: 'Property or attribute name to take' }),
      createStringValidator({ pattern: /^from$/, description: 'Keyword: from' }),
      createUnionValidator([
        createStringValidator({ description: 'CSS selector' }),
        createStringValidator({ pattern: /^HTMLElement$/, description: 'HTMLElement' }),
      ]),
    ]);

    expect(takeCommandValidator.validate(['class', 'from', '#element'])).toEqual({
      success: true,
      data: ['class', 'from', '#element'],
    });

    const result = takeCommandValidator.validate(['class', 'to', '#element']);
    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({
      message: 'Expected "from", received "to"',
      path: '1',
    });
  });
});
