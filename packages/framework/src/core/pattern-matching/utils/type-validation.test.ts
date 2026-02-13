/**
 * Type Validation Tests
 *
 * Tests the type compatibility and validation utilities used by PatternMatcher.
 */

import { describe, it, expect } from 'vitest';
import {
  isTypeCompatible,
  validateValueType,
  isCSSSelector,
  isClassName,
  isIdSelector,
  isCSSPropertyRef,
  isNumericValue,
  isPropertyName,
  isVariableRef,
  isBuiltInReference,
} from './type-validation';
import type { SemanticValue } from '../../types';

describe('Type Validation', () => {
  describe('isTypeCompatible', () => {
    it('should return true for empty expected types array', () => {
      expect(isTypeCompatible('literal', [])).toBe(true);
      expect(isTypeCompatible('selector', [])).toBe(true);
      expect(isTypeCompatible('unknown', [])).toBe(true);
    });

    it('should return true for direct type match', () => {
      expect(isTypeCompatible('literal', ['literal'])).toBe(true);
      expect(isTypeCompatible('selector', ['selector'])).toBe(true);
      expect(isTypeCompatible('reference', ['reference'])).toBe(true);
      expect(isTypeCompatible('expression', ['expression'])).toBe(true);
      expect(isTypeCompatible('property-path', ['property-path'])).toBe(true);
    });

    it('should return true for type in expected types list', () => {
      expect(isTypeCompatible('literal', ['literal', 'selector'])).toBe(true);
      expect(isTypeCompatible('selector', ['literal', 'selector', 'reference'])).toBe(true);
    });

    it('should return false for type not in expected types', () => {
      expect(isTypeCompatible('literal', ['selector'])).toBe(false);
      expect(isTypeCompatible('reference', ['literal', 'selector'])).toBe(false);
    });

    it('should treat expression as wildcard (matches everything)', () => {
      expect(isTypeCompatible('literal', ['expression'])).toBe(true);
      expect(isTypeCompatible('selector', ['expression'])).toBe(true);
      expect(isTypeCompatible('reference', ['expression'])).toBe(true);
      expect(isTypeCompatible('property-path', ['expression'])).toBe(true);
    });

    it('should allow property-path to match selector', () => {
      expect(isTypeCompatible('property-path', ['selector'])).toBe(true);
    });

    it('should allow property-path to match reference', () => {
      expect(isTypeCompatible('property-path', ['reference'])).toBe(true);
    });

    it('should allow property-path to match expression', () => {
      expect(isTypeCompatible('property-path', ['expression'])).toBe(true);
    });

    it('should not allow property-path to match literal', () => {
      expect(isTypeCompatible('property-path', ['literal'])).toBe(false);
    });

    it('should handle multiple expected types with property-path', () => {
      expect(isTypeCompatible('property-path', ['literal', 'selector'])).toBe(true);
      expect(isTypeCompatible('property-path', ['literal', 'reference'])).toBe(true);
      expect(isTypeCompatible('property-path', ['literal', 'expression'])).toBe(true);
    });
  });

  describe('validateValueType', () => {
    it('should return true for undefined expected types', () => {
      const value: SemanticValue = { type: 'literal', value: 'test' };
      expect(validateValueType(value, undefined)).toBe(true);
      expect(validateValueType(value, [])).toBe(true);
    });

    it('should validate literal values', () => {
      const literal: SemanticValue = { type: 'literal', value: 'hello' };
      expect(validateValueType(literal, ['literal'])).toBe(true);
      expect(validateValueType(literal, ['selector'])).toBe(false);
    });

    it('should validate selector values', () => {
      const selector: SemanticValue = { type: 'selector', value: '.button' };
      expect(validateValueType(selector, ['selector'])).toBe(true);
      expect(validateValueType(selector, ['literal'])).toBe(false);
    });

    it('should validate reference values', () => {
      const reference: SemanticValue = { type: 'reference', value: 'me' };
      expect(validateValueType(reference, ['reference'])).toBe(true);
      expect(validateValueType(reference, ['literal'])).toBe(false);
    });

    it('should validate expression values', () => {
      const expression: SemanticValue = { type: 'expression', raw: 'x + y' };
      expect(validateValueType(expression, ['expression'])).toBe(true);
      expect(validateValueType(expression, ['literal'])).toBe(false);
    });

    it('should validate property-path values', () => {
      const propertyPath: SemanticValue = {
        type: 'property-path',
        object: { type: 'reference', value: 'me' },
        property: 'value',
      };
      expect(validateValueType(propertyPath, ['property-path'])).toBe(true);
      expect(validateValueType(propertyPath, ['selector'])).toBe(true);
      expect(validateValueType(propertyPath, ['reference'])).toBe(true);
      expect(validateValueType(propertyPath, ['expression'])).toBe(true);
      expect(validateValueType(propertyPath, ['literal'])).toBe(false);
    });

    it('should allow any type when expression is expected', () => {
      const literal: SemanticValue = { type: 'literal', value: 'test' };
      const selector: SemanticValue = { type: 'selector', value: '.btn' };
      const reference: SemanticValue = { type: 'reference', value: 'me' };

      expect(validateValueType(literal, ['expression'])).toBe(true);
      expect(validateValueType(selector, ['expression'])).toBe(true);
      expect(validateValueType(reference, ['expression'])).toBe(true);
    });
  });

  describe('CSS Selector Detection', () => {
    describe('isCSSSelector', () => {
      it('should detect class selectors', () => {
        expect(isCSSSelector('.button')).toBe(true);
        expect(isCSSSelector('.my-class')).toBe(true);
      });

      it('should detect ID selectors', () => {
        expect(isCSSSelector('#header')).toBe(true);
        expect(isCSSSelector('#my-id')).toBe(true);
      });

      it('should detect element selectors', () => {
        expect(isCSSSelector('<button/>')).toBe(true);
        expect(isCSSSelector('<div/>')).toBe(true);
      });

      it('should not detect non-selectors', () => {
        expect(isCSSSelector('button')).toBe(false);
        expect(isCSSSelector('myVariable')).toBe(false);
        expect(isCSSSelector('123')).toBe(false);
      });
    });

    describe('isClassName', () => {
      it('should detect class names', () => {
        expect(isClassName('.active')).toBe(true);
        expect(isClassName('.my-class')).toBe(true);
      });

      it('should not detect non-class selectors', () => {
        expect(isClassName('#id')).toBe(false);
        expect(isClassName('<div/>')).toBe(false);
        expect(isClassName('button')).toBe(false);
      });
    });

    describe('isIdSelector', () => {
      it('should detect ID selectors', () => {
        expect(isIdSelector('#header')).toBe(true);
        expect(isIdSelector('#my-id')).toBe(true);
      });

      it('should not detect non-ID selectors', () => {
        expect(isIdSelector('.class')).toBe(false);
        expect(isIdSelector('<div/>')).toBe(false);
        expect(isIdSelector('button')).toBe(false);
      });
    });

    describe('isCSSPropertyRef', () => {
      it('should detect CSS property references', () => {
        expect(isCSSPropertyRef('*display')).toBe(true);
        expect(isCSSPropertyRef('*width')).toBe(true);
      });

      it('should not detect non-property references', () => {
        expect(isCSSPropertyRef('.class')).toBe(false);
        expect(isCSSPropertyRef('#id')).toBe(false);
        expect(isCSSPropertyRef('display')).toBe(false);
      });
    });
  });

  describe('Value Type Detection', () => {
    describe('isNumericValue', () => {
      it('should detect integer values', () => {
        expect(isNumericValue('0')).toBe(true);
        expect(isNumericValue('42')).toBe(true);
        expect(isNumericValue('999')).toBe(true);
      });

      it('should detect decimal values', () => {
        expect(isNumericValue('3.14')).toBe(true);
        expect(isNumericValue('0.5')).toBe(true);
        expect(isNumericValue('99.99')).toBe(true);
      });

      it('should detect duration values', () => {
        expect(isNumericValue('100ms')).toBe(true);
        expect(isNumericValue('2s')).toBe(true);
        expect(isNumericValue('5m')).toBe(true);
        expect(isNumericValue('1h')).toBe(true);
        expect(isNumericValue('2.5s')).toBe(true);
      });

      it('should not detect non-numeric values', () => {
        expect(isNumericValue('abc')).toBe(false);
        expect(isNumericValue('test')).toBe(false);
        expect(isNumericValue('')).toBe(false);
      });

      it('should not detect invalid numbers', () => {
        expect(isNumericValue('NaN')).toBe(false);
        expect(isNumericValue('Infinity')).toBe(false);
      });
    });

    describe('isPropertyName', () => {
      it('should detect valid property names', () => {
        expect(isPropertyName('value')).toBe(true);
        expect(isPropertyName('innerHTML')).toBe(true);
        expect(isPropertyName('_private')).toBe(true);
        expect(isPropertyName('camelCase')).toBe(true);
        expect(isPropertyName('snake_case')).toBe(true);
      });

      it('should not detect invalid property names', () => {
        expect(isPropertyName('123')).toBe(false); // starts with digit
        expect(isPropertyName('my-prop')).toBe(false); // contains hyphen
        expect(isPropertyName('.class')).toBe(false); // starts with dot
        expect(isPropertyName('#id')).toBe(false); // starts with hash
        expect(isPropertyName('has space')).toBe(false); // contains space
      });
    });

    describe('isVariableRef', () => {
      it('should detect variable references', () => {
        expect(isVariableRef(':myVar')).toBe(true);
        expect(isVariableRef(':count')).toBe(true);
        expect(isVariableRef(':_temp')).toBe(true);
      });

      it('should not detect non-variable values', () => {
        expect(isVariableRef('myVar')).toBe(false);
        expect(isVariableRef('.class')).toBe(false);
        expect(isVariableRef('#id')).toBe(false);
      });
    });

    describe('isBuiltInReference', () => {
      it('should detect built-in references', () => {
        expect(isBuiltInReference('me')).toBe(true);
        expect(isBuiltInReference('you')).toBe(true);
        expect(isBuiltInReference('it')).toBe(true);
        expect(isBuiltInReference('result')).toBe(true);
        expect(isBuiltInReference('event')).toBe(true);
        expect(isBuiltInReference('target')).toBe(true);
        expect(isBuiltInReference('body')).toBe(true);
      });

      it('should be case-insensitive', () => {
        expect(isBuiltInReference('ME')).toBe(true);
        expect(isBuiltInReference('You')).toBe(true);
        expect(isBuiltInReference('IT')).toBe(true);
      });

      it('should not detect non-built-in references', () => {
        expect(isBuiltInReference('myVar')).toBe(false);
        expect(isBuiltInReference('custom')).toBe(false);
        expect(isBuiltInReference('element')).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined gracefully in isTypeCompatible', () => {
      expect(isTypeCompatible('literal', null as any)).toBe(true);
      expect(isTypeCompatible('literal', undefined as any)).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(isCSSSelector('')).toBe(false);
      expect(isClassName('')).toBe(false);
      expect(isIdSelector('')).toBe(false);
      expect(isPropertyName('')).toBe(false);
      expect(isNumericValue('')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isPropertyName(' value')).toBe(false);
      expect(isPropertyName('value ')).toBe(false);
      // Note: parseFloat handles leading/trailing whitespace
      expect(isNumericValue(' 42')).toBe(true);
      expect(isNumericValue('42 ')).toBe(true);
    });

    it('should handle special characters in property names', () => {
      expect(isPropertyName('prop$')).toBe(false);
      expect(isPropertyName('prop@')).toBe(false);
      expect(isPropertyName('prop-name')).toBe(false);
    });
  });
});
