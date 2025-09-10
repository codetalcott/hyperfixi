/**
 * Tests for lightweight runtime validators (zod-free)
 * These validators are generated from zod schemas during build time
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStringValidator,
  createObjectValidator,
  createArrayValidator,
  createTupleValidator,
  createUnionValidator,
  ValidationResult,
  RuntimeValidator
} from './lightweight-validators';

describe('Lightweight Validators', () => {
  describe('String Validator', () => {
    it('should validate strings correctly', () => {
      const validator = createStringValidator({ minLength: 3, maxLength: 10 });
      
      expect(validator.validate('hello')).toEqual({
        success: true,
        data: 'hello'
      });
      
      expect(validator.validate('hi')).toEqual({
        success: false,
        error: {
          message: 'String must be at least 3 characters long',
          path: []
        }
      });
    });

    it('should handle optional strings', () => {
      const validator = createStringValidator({ optional: true });
      
      expect(validator.validate(undefined)).toEqual({
        success: true,
        data: undefined
      });
      
      expect(validator.validate('test')).toEqual({
        success: true,
        data: 'test'
      });
    });
  });

  describe('Object Validator', () => {
    it('should validate objects with required fields', () => {
      const validator = createObjectValidator({
        name: createStringValidator({}),
        age: createStringValidator({ pattern: /^\d+$/ })
      });

      expect(validator.validate({ name: 'John', age: '25' })).toEqual({
        success: true,
        data: { name: 'John', age: '25' }
      });

      expect(validator.validate({ name: 'John' })).toEqual({
        success: false,
        error: {
          message: 'Required field "age" is missing',
          path: ['age']
        }
      });
    });
  });

  describe('Array Validator', () => {
    it('should validate arrays of items', () => {
      const validator = createArrayValidator(createStringValidator({}));

      expect(validator.validate(['a', 'b', 'c'])).toEqual({
        success: true,
        data: ['a', 'b', 'c']
      });

      expect(validator.validate(['a', 123, 'c'])).toEqual({
        success: false,
        error: {
          message: 'Expected string, received number',
          path: [1]
        }
      });
    });
  });

  describe('Tuple Validator', () => {
    it('should validate fixed-length tuples', () => {
      const validator = createTupleValidator([
        createStringValidator({}),
        createStringValidator({ pattern: /^from$/ }),
        createStringValidator({})
      ]);

      expect(validator.validate(['property', 'from', 'element'])).toEqual({
        success: true,
        data: ['property', 'from', 'element']
      });

      expect(validator.validate(['property', 'to', 'element'])).toEqual({
        success: false,
        error: {
          message: 'Expected "from", received "to"',
          path: [1]
        }
      });
    });
  });

  describe('Union Validator', () => {
    it('should validate union types', () => {
      const validator = createUnionValidator([
        createStringValidator({}),
        createStringValidator({ pattern: /^\d+$/ })
      ]);

      expect(validator.validate('hello')).toEqual({
        success: true,
        data: 'hello'
      });

      expect(validator.validate('123')).toEqual({
        success: true,
        data: '123'
      });

      expect(validator.validate(123)).toEqual({
        success: false,
        error: {
          message: 'Value does not match any union type',
          path: []
        }
      });
    });
  });

  describe('Environment-based validation', () => {
    it('should skip validation in production mode', () => {
      process.env.NODE_ENV = 'production';
      const validator = createStringValidator({ minLength: 10 });

      // In production, validation should pass through without checking
      expect(validator.validate('short')).toEqual({
        success: true,
        data: 'short'
      });
    });

    it('should perform validation in development mode', () => {
      process.env.NODE_ENV = 'development';
      const validator = createStringValidator({ minLength: 10 });

      expect(validator.validate('short')).toEqual({
        success: false,
        error: {
          message: 'String must be at least 10 characters long',
          path: []
        }
      });
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
        createStringValidator({ pattern: /^HTMLElement$/, description: 'HTMLElement' })
      ])
    ]);

    expect(takeCommandValidator.validate(['class', 'from', '#element'])).toEqual({
      success: true,
      data: ['class', 'from', '#element']
    });

    expect(takeCommandValidator.validate(['class', 'to', '#element'])).toEqual({
      success: false,
      error: {
        message: 'Expected "from", received "to"',
        path: [1]
      }
    });
  });
});