import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseClasses,
  isDynamicClass,
  extractDynamicExpression,
  isValidClassName,
  normalizeClassName,
  resolveDynamicClasses,
} from '../class-manipulation';
import type { TypedExecutionContext } from '../../../types/core';

describe('Class Manipulation Helpers', () => {
  describe('parseClasses', () => {
    it('should parse a single class name without dot', () => {
      const result = parseClasses('active');
      expect(result).toEqual(['active']);
    });

    it('should parse a single class name with leading dot', () => {
      const result = parseClasses('.active');
      expect(result).toEqual(['active']);
    });

    it('should parse multiple space-separated class names', () => {
      const result = parseClasses('.active .disabled .selected');
      expect(result).toEqual(['active', 'disabled', 'selected']);
    });

    it('should parse comma-separated class names', () => {
      const result = parseClasses('.active, .disabled, .selected');
      expect(result).toEqual(['active', 'disabled', 'selected']);
    });

    it('should parse mixed whitespace and comma separators', () => {
      const result = parseClasses('.active .disabled, .selected');
      expect(result).toEqual(['active', 'disabled', 'selected']);
    });

    it('should parse array of class names', () => {
      const result = parseClasses(['.active', 'disabled', '.selected']);
      expect(result).toEqual(['active', 'disabled', 'selected']);
    });

    it('should handle empty string', () => {
      const result = parseClasses('');
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = parseClasses([]);
      expect(result).toEqual([]);
    });

    it('should filter out invalid class names', () => {
      const result = parseClasses('.valid 123invalid .another-valid');
      expect(result).toEqual(['valid', 'another-valid']);
    });

    it('should preserve dynamic class expressions', () => {
      const result = parseClasses('.active {dynamicClass} .disabled');
      expect(result).toEqual(['active', '{dynamicClass}', 'disabled']);
    });

    it('should handle whitespace around class names', () => {
      const result = parseClasses('  .active   .disabled  ');
      expect(result).toEqual(['active', 'disabled']);
    });

    it('should handle non-string/non-array input gracefully', () => {
      const result = parseClasses(null as any);
      expect(result).toEqual([]);
    });
  });

  describe('isDynamicClass', () => {
    it('should detect dynamic class with curly braces', () => {
      expect(isDynamicClass('{myClass}')).toBe(true);
      expect(isDynamicClass('{someVariable}')).toBe(true);
      expect(isDynamicClass('{a}')).toBe(true);
    });

    it('should reject non-dynamic class names', () => {
      expect(isDynamicClass('active')).toBe(false);
      expect(isDynamicClass('.active')).toBe(false);
      expect(isDynamicClass('my-class')).toBe(false);
    });

    it('should reject partial dynamic expressions', () => {
      expect(isDynamicClass('{incomplete')).toBe(false);
      expect(isDynamicClass('incomplete}')).toBe(false);
      expect(isDynamicClass('not{dynamic}')).toBe(false);
    });

    it('should reject empty braces', () => {
      expect(isDynamicClass('{}')).toBe(false);
    });
  });

  describe('extractDynamicExpression', () => {
    it('should extract variable name from dynamic expression', () => {
      expect(extractDynamicExpression('{myClass}')).toBe('myClass');
      expect(extractDynamicExpression('{someVariable}')).toBe('someVariable');
      expect(extractDynamicExpression('{a}')).toBe('a');
    });

    it('should return original string if not dynamic', () => {
      expect(extractDynamicExpression('active')).toBe('active');
      expect(extractDynamicExpression('.active')).toBe('.active');
    });

    it('should trim whitespace inside braces', () => {
      expect(extractDynamicExpression('{ myClass }')).toBe('myClass');
    });
  });

  describe('isValidClassName', () => {
    it('should validate correct class names', () => {
      expect(isValidClassName('active')).toBe(true);
      expect(isValidClassName('my-class')).toBe(true);
      expect(isValidClassName('my_class')).toBe(true);
      expect(isValidClassName('MyClass')).toBe(true);
      expect(isValidClassName('class-123')).toBe(true);
      expect(isValidClassName('_private')).toBe(true);
      expect(isValidClassName('-webkit-transition')).toBe(true);
    });

    it('should reject class names starting with digit', () => {
      expect(isValidClassName('123invalid')).toBe(false);
      expect(isValidClassName('9class')).toBe(false);
    });

    it('should reject class names with invalid characters', () => {
      expect(isValidClassName('my class')).toBe(false);
      expect(isValidClassName('my@class')).toBe(false);
      expect(isValidClassName('my.class')).toBe(false);
    });

    it('should accept dynamic class expressions', () => {
      expect(isValidClassName('{myClass}')).toBe(true);
      expect(isValidClassName('{someVariable}')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidClassName('')).toBe(false);
    });

    it('should reject class names with leading dot', () => {
      expect(isValidClassName('.active')).toBe(false);
    });
  });

  describe('normalizeClassName', () => {
    it('should remove leading dot from class name', () => {
      expect(normalizeClassName('.active')).toBe('active');
      expect(normalizeClassName('.my-class')).toBe('my-class');
    });

    it('should leave class name unchanged if no leading dot', () => {
      expect(normalizeClassName('active')).toBe('active');
      expect(normalizeClassName('my-class')).toBe('my-class');
    });

    it('should handle empty string', () => {
      expect(normalizeClassName('')).toBe('');
    });

    it('should only remove first dot', () => {
      expect(normalizeClassName('.class.name')).toBe('class.name');
    });
  });

  describe('resolveDynamicClasses', () => {
    let mockContext: TypedExecutionContext;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockContext = {
        locals: new Map<string, unknown>(),
        globals: new Map<string, unknown>(),
      } as TypedExecutionContext;

      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('should resolve dynamic class from locals', () => {
      mockContext.locals.set('myClass', 'active');
      const result = resolveDynamicClasses(['{myClass}'], mockContext);
      expect(result).toEqual(['active']);
    });

    it('should resolve dynamic class from globals if not in locals', () => {
      mockContext.globals.set('myClass', 'disabled');
      const result = resolveDynamicClasses(['{myClass}'], mockContext);
      expect(result).toEqual(['disabled']);
    });

    it('should prefer locals over globals', () => {
      mockContext.locals.set('myClass', 'active');
      mockContext.globals.set('myClass', 'disabled');
      const result = resolveDynamicClasses(['{myClass}'], mockContext);
      expect(result).toEqual(['active']);
    });

    it('should resolve multiple dynamic classes', () => {
      mockContext.locals.set('class1', 'active');
      mockContext.locals.set('class2', 'selected');
      const result = resolveDynamicClasses(['{class1}', '{class2}'], mockContext);
      expect(result).toEqual(['active', 'selected']);
    });

    it('should mix static and dynamic classes', () => {
      mockContext.locals.set('dynamicClass', 'active');
      const result = resolveDynamicClasses(['static', '{dynamicClass}', 'another'], mockContext);
      expect(result).toEqual(['static', 'active', 'another']);
    });

    it('should warn when dynamic variable not found', () => {
      const result = resolveDynamicClasses(['{missing}'], mockContext);
      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic class variable 'missing' not found")
      );
    });

    it('should skip undefined dynamic variables without adding to result', () => {
      mockContext.locals.set('defined', 'active');
      const result = resolveDynamicClasses(['{defined}', '{missing}', 'static'], mockContext);
      expect(result).toEqual(['active', 'static']);
    });

    it('should handle empty array', () => {
      const result = resolveDynamicClasses([], mockContext);
      expect(result).toEqual([]);
    });

    it('should handle all static classes', () => {
      const result = resolveDynamicClasses(['active', 'disabled', 'selected'], mockContext);
      expect(result).toEqual(['active', 'disabled', 'selected']);
    });

    it('should handle whitespace in resolved dynamic class values', () => {
      mockContext.locals.set('classes', 'active disabled selected');
      const result = resolveDynamicClasses(['{classes}'], mockContext);
      expect(result).toEqual(['active disabled selected']);
    });

    it('should convert non-string dynamic values to string', () => {
      mockContext.locals.set('numClass', 42);
      mockContext.locals.set('boolClass', true);
      const result = resolveDynamicClasses(['{numClass}', '{boolClass}'], mockContext);
      expect(result).toEqual(['42', 'true']);
    });
  });
});
