import { describe, it, expect } from 'vitest';
import {
  validResult,
  invalidResult,
  createError,
  validateBinaryInput,
  validateUnaryInput,
  validateNotNull,
  validateNumber,
  validateString,
  validateBoolean,
  combineValidations,
} from './validation-utils';

describe('validation-utils', () => {
  describe('validResult', () => {
    it('should return correct structure with empty errors and suggestions', () => {
      const result = validResult();

      expect(result).toEqual({
        isValid: true,
        errors: [],
        suggestions: [],
      });
    });
  });

  describe('invalidResult', () => {
    it('should create invalid result with errors', () => {
      const errors = [createError('type-mismatch', 'Invalid type', [], 'error')];
      const result = invalidResult(errors);

      expect(result).toEqual({
        isValid: false,
        errors,
        suggestions: [],
      });
    });

    it('should include suggestions when provided', () => {
      const errors = [createError('type-mismatch', 'Invalid type', [], 'error')];
      const suggestions = ['Try using a string instead'];
      const result = invalidResult(errors, suggestions);

      expect(result).toEqual({
        isValid: false,
        errors,
        suggestions,
      });
    });
  });

  describe('createError', () => {
    it('should create error object with all fields', () => {
      const error = createError(
        'type-mismatch',
        'Invalid type',
        ['Use string or number'],
        'warning'
      );

      expect(error).toEqual({
        type: 'type-mismatch',
        message: 'Invalid type',
        suggestions: ['Use string or number'],
        severity: 'warning',
      });
    });

    it('should default severity to "error"', () => {
      const error = createError('type-mismatch', 'Invalid type', []);

      expect(error.severity).toBe('error');
    });

    it('should accept custom severity', () => {
      const error = createError('type-mismatch', 'Invalid type', [], 'warning');

      expect(error.severity).toBe('warning');
    });
  });

  describe('validateBinaryInput', () => {
    it('should return valid result for correct binary input', () => {
      const input = { left: 5, right: 10 };
      const result = validateBinaryInput(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when input is null', () => {
      const result = validateBinaryInput(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('null');
    });

    it('should return invalid when input is not an object', () => {
      const result = validateBinaryInput(42 as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('object');
    });

    it('should return invalid when left is missing', () => {
      const input = { right: 10 };
      const result = validateBinaryInput(input as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('left');
    });

    it('should return invalid when right is missing', () => {
      const input = { left: 5 };
      const result = validateBinaryInput(input as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('right');
    });
  });

  describe('validateUnaryInput', () => {
    it('should return valid result for correct unary input', () => {
      const input = { value: 42 };
      const result = validateUnaryInput(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when input is null', () => {
      const result = validateUnaryInput(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('null');
    });

    it('should return invalid when input is not an object', () => {
      const result = validateUnaryInput('string' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('object');
    });

    it('should return invalid when value is missing', () => {
      const input = {};
      const result = validateUnaryInput(input as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('value');
    });
  });

  describe('validateNotNull', () => {
    it('should return valid for non-null values', () => {
      expect(validateNotNull(42, 'number').isValid).toBe(true);
      expect(validateNotNull('text', 'string').isValid).toBe(true);
      expect(validateNotNull(false, 'boolean').isValid).toBe(true);
      expect(validateNotNull(0, 'zero').isValid).toBe(true);
      expect(validateNotNull('', 'emptyString').isValid).toBe(true);
    });

    it('should return invalid for null or undefined', () => {
      const nullResult = validateNotNull(null, 'value');
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors[0].message).toContain('value');
      expect(nullResult.errors[0].message).toContain('null');

      const undefinedResult = validateNotNull(undefined, 'value');
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors[0].message).toContain('value');
      expect(undefinedResult.errors[0].message).toContain('undefined');
    });
  });

  describe('validateNumber', () => {
    it('should return valid for valid numbers', () => {
      expect(validateNumber(42, 'num').isValid).toBe(true);
      expect(validateNumber(0, 'zero').isValid).toBe(true);
      expect(validateNumber(-3.14, 'negative').isValid).toBe(true);
      expect(validateNumber(1e10, 'scientific').isValid).toBe(true);
    });

    it('should return invalid for non-numbers', () => {
      const result = validateNumber('42' as any, 'value');

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('number');
    });

    it('should return invalid for NaN', () => {
      const result = validateNumber(NaN, 'value');

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('NaN');
    });

    it('should return invalid for Infinity', () => {
      const posInfResult = validateNumber(Infinity, 'value');
      expect(posInfResult.isValid).toBe(false);
      expect(posInfResult.errors[0].message).toContain('Infinity');

      const negInfResult = validateNumber(-Infinity, 'value');
      expect(negInfResult.isValid).toBe(false);
      expect(negInfResult.errors[0].message).toContain('Infinity');
    });
  });

  describe('validateString', () => {
    it('should return valid for valid strings', () => {
      expect(validateString('hello', 'str').isValid).toBe(true);
      expect(validateString('', 'empty').isValid).toBe(true);
      expect(validateString('   ', 'spaces').isValid).toBe(true);
    });

    it('should return invalid for non-strings', () => {
      const numResult = validateString(42 as any, 'value');
      expect(numResult.isValid).toBe(false);
      expect(numResult.errors[0].message).toContain('string');

      const boolResult = validateString(true as any, 'value');
      expect(boolResult.isValid).toBe(false);
      expect(boolResult.errors[0].message).toContain('string');
    });
  });

  describe('validateBoolean', () => {
    it('should return valid for valid booleans', () => {
      expect(validateBoolean(true, 'flag').isValid).toBe(true);
      expect(validateBoolean(false, 'flag').isValid).toBe(true);
    });

    it('should return invalid for non-booleans', () => {
      const numResult = validateBoolean(1 as any, 'value');
      expect(numResult.isValid).toBe(false);
      expect(numResult.errors[0].message).toContain('boolean');

      const strResult = validateBoolean('true' as any, 'value');
      expect(strResult.isValid).toBe(false);
      expect(strResult.errors[0].message).toContain('boolean');
    });
  });

  describe('combineValidations', () => {
    it('should return valid when all validations are valid', () => {
      const result1 = validResult();
      const result2 = validResult();
      const result3 = validResult();

      const combined = combineValidations(result1, result2, result3);

      expect(combined.isValid).toBe(true);
      expect(combined.errors).toHaveLength(0);
      expect(combined.suggestions).toHaveLength(0);
    });

    it('should return invalid when any validation is invalid', () => {
      const valid = validResult();
      const invalid = invalidResult([createError('type-mismatch', 'Invalid type', [], 'error')]);

      const combined = combineValidations(valid, invalid);

      expect(combined.isValid).toBe(false);
      expect(combined.errors).toHaveLength(1);
    });

    it('should merge all errors and suggestions from invalid results', () => {
      const invalid1 = invalidResult(
        [createError('missing-argument', 'Error 1', [], 'error')],
        ['Suggestion 1']
      );
      const invalid2 = invalidResult(
        [createError('type-mismatch', 'Error 2', [], 'error')],
        ['Suggestion 2']
      );
      const invalid3 = invalidResult(
        [
          createError('validation-error', 'Error 3a', [], 'error'),
          createError('invalid-input', 'Error 3b', [], 'warning'),
        ],
        ['Suggestion 3']
      );

      const combined = combineValidations(invalid1, invalid2, invalid3);

      expect(combined.isValid).toBe(false);
      expect(combined.errors).toHaveLength(4);
      expect(combined.errors[0].message).toBe('Error 1');
      expect(combined.errors[1].message).toBe('Error 2');
      expect(combined.errors[2].message).toBe('Error 3a');
      expect(combined.errors[3].message).toBe('Error 3b');
      expect(combined.suggestions).toHaveLength(3);
      expect(combined.suggestions).toContain('Suggestion 1');
      expect(combined.suggestions).toContain('Suggestion 2');
      expect(combined.suggestions).toContain('Suggestion 3');
    });
  });
});
