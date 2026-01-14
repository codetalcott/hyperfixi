/**
 * Tests for Type Validation Utility
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
} from '../../../src/parser/utils/type-validation';
import type { SemanticValue } from '../../../src/types';

describe('Type Validation Utility', () => {
  describe('isTypeCompatible', () => {
    it('should return true for direct type match', () => {
      expect(isTypeCompatible('selector', ['selector', 'reference'])).toBe(true);
    });

    it('should return true when expression is expected (wildcard)', () => {
      expect(isTypeCompatible('selector', ['expression'])).toBe(true);
      expect(isTypeCompatible('literal', ['expression'])).toBe(true);
    });

    it('should return true for property-path with compatible types', () => {
      expect(isTypeCompatible('property-path', ['selector'])).toBe(true);
      expect(isTypeCompatible('property-path', ['reference'])).toBe(true);
      expect(isTypeCompatible('property-path', ['expression'])).toBe(true);
    });

    it('should return false for property-path with incompatible types', () => {
      expect(isTypeCompatible('property-path', ['literal'])).toBe(false);
    });

    it('should return true for empty expected types', () => {
      expect(isTypeCompatible('anything', [])).toBe(true);
    });

    it('should return false when no match found', () => {
      expect(isTypeCompatible('selector', ['literal', 'reference'])).toBe(false);
    });
  });

  describe('validateValueType', () => {
    it('should return true for matching value type', () => {
      const value: SemanticValue = { type: 'selector', value: '.active' };
      expect(validateValueType(value, ['selector'])).toBe(true);
    });

    it('should return true for empty expected types', () => {
      const value: SemanticValue = { type: 'selector', value: '.active' };
      expect(validateValueType(value, [])).toBe(true);
      expect(validateValueType(value, undefined)).toBe(true);
    });

    it('should return false for non-matching type', () => {
      const value: SemanticValue = { type: 'selector', value: '.active' };
      expect(validateValueType(value, ['literal'])).toBe(false);
    });
  });

  describe('isCSSSelector', () => {
    it('should return true for class selectors', () => {
      expect(isCSSSelector('.active')).toBe(true);
      expect(isCSSSelector('.foo-bar')).toBe(true);
    });

    it('should return true for ID selectors', () => {
      expect(isCSSSelector('#main')).toBe(true);
      expect(isCSSSelector('#my-element')).toBe(true);
    });

    it('should return true for HTML selectors', () => {
      expect(isCSSSelector('<div/>')).toBe(true);
      expect(isCSSSelector('<button.primary/>')).toBe(true);
    });

    it('should return false for non-selectors', () => {
      expect(isCSSSelector('active')).toBe(false);
      expect(isCSSSelector('*display')).toBe(false);
    });
  });

  describe('isClassName', () => {
    it('should return true for class names', () => {
      expect(isClassName('.active')).toBe(true);
      expect(isClassName('.foo')).toBe(true);
    });

    it('should return false for non-class selectors', () => {
      expect(isClassName('#id')).toBe(false);
      expect(isClassName('active')).toBe(false);
    });
  });

  describe('isIdSelector', () => {
    it('should return true for ID selectors', () => {
      expect(isIdSelector('#main')).toBe(true);
      expect(isIdSelector('#my-element')).toBe(true);
    });

    it('should return false for non-ID selectors', () => {
      expect(isIdSelector('.class')).toBe(false);
      expect(isIdSelector('id')).toBe(false);
    });
  });

  describe('isCSSPropertyRef', () => {
    it('should return true for CSS property references', () => {
      expect(isCSSPropertyRef('*display')).toBe(true);
      expect(isCSSPropertyRef('*opacity')).toBe(true);
      expect(isCSSPropertyRef('*background-color')).toBe(true);
    });

    it('should return false for non-property refs', () => {
      expect(isCSSPropertyRef('display')).toBe(false);
      expect(isCSSPropertyRef('.class')).toBe(false);
    });
  });

  describe('isNumericValue', () => {
    it('should return true for integers', () => {
      expect(isNumericValue('42')).toBe(true);
      expect(isNumericValue('0')).toBe(true);
      expect(isNumericValue('-5')).toBe(true);
    });

    it('should return true for decimals', () => {
      expect(isNumericValue('3.14')).toBe(true);
      expect(isNumericValue('0.5')).toBe(true);
    });

    it('should return true for duration values', () => {
      expect(isNumericValue('100ms')).toBe(true);
      expect(isNumericValue('2s')).toBe(true);
      expect(isNumericValue('1.5h')).toBe(true);
    });

    it('should return false for non-numeric values', () => {
      expect(isNumericValue('abc')).toBe(false);
      expect(isNumericValue('.active')).toBe(false);
    });
  });

  describe('isPropertyName', () => {
    it('should return true for valid property names', () => {
      expect(isPropertyName('innerHTML')).toBe(true);
      expect(isPropertyName('textContent')).toBe(true);
      expect(isPropertyName('_private')).toBe(true);
    });

    it('should return false for invalid property names', () => {
      expect(isPropertyName('123abc')).toBe(false);
      expect(isPropertyName('.class')).toBe(false);
      expect(isPropertyName('foo-bar')).toBe(false);
    });
  });

  describe('isVariableRef', () => {
    it('should return true for variable references', () => {
      expect(isVariableRef(':count')).toBe(true);
      expect(isVariableRef(':myVar')).toBe(true);
    });

    it('should return false for non-variables', () => {
      expect(isVariableRef('count')).toBe(false);
      expect(isVariableRef('#id')).toBe(false);
    });
  });

  describe('isBuiltInReference', () => {
    it('should return true for built-in references', () => {
      expect(isBuiltInReference('me')).toBe(true);
      expect(isBuiltInReference('you')).toBe(true);
      expect(isBuiltInReference('it')).toBe(true);
      expect(isBuiltInReference('result')).toBe(true);
      expect(isBuiltInReference('event')).toBe(true);
      expect(isBuiltInReference('target')).toBe(true);
      expect(isBuiltInReference('body')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isBuiltInReference('Me')).toBe(true);
      expect(isBuiltInReference('ME')).toBe(true);
    });

    it('should return false for non-built-ins', () => {
      expect(isBuiltInReference('element')).toBe(false);
      expect(isBuiltInReference('foo')).toBe(false);
    });
  });
});
