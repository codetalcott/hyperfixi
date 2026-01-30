import { describe, it, expect } from 'vitest';
import {
  compareValues,
  areStrictlyEqual,
  areLooselyEqual,
  isGreaterThan,
  isLessThan,
  isGreaterThanOrEqual,
  isLessThanOrEqual,
  coerceToComparable,
  type ComparisonOperator,
} from './comparison-utils';

describe('Comparison Utilities', () => {
  describe('compareValues', () => {
    describe('numeric comparisons', () => {
      it('should compare with > operator', () => {
        expect(compareValues(10, 5, '>')).toBe(true);
        expect(compareValues(5, 10, '>')).toBe(false);
        expect(compareValues(5, 5, '>')).toBe(false);
      });

      it('should compare with < operator', () => {
        expect(compareValues(5, 10, '<')).toBe(true);
        expect(compareValues(10, 5, '<')).toBe(false);
        expect(compareValues(5, 5, '<')).toBe(false);
      });

      it('should compare with >= operator', () => {
        expect(compareValues(10, 5, '>=')).toBe(true);
        expect(compareValues(5, 5, '>=')).toBe(true);
        expect(compareValues(5, 10, '>=')).toBe(false);
      });

      it('should compare with <= operator', () => {
        expect(compareValues(5, 10, '<=')).toBe(true);
        expect(compareValues(5, 5, '<=')).toBe(true);
        expect(compareValues(10, 5, '<=')).toBe(false);
      });

      it('should compare with == operator', () => {
        expect(compareValues(5, 5, '==')).toBe(true);
        expect(compareValues(5, 10, '==')).toBe(false);
      });

      it('should compare with != operator', () => {
        expect(compareValues(5, 10, '!=')).toBe(true);
        expect(compareValues(5, 5, '!=')).toBe(false);
      });

      it('should compare with === operator', () => {
        expect(compareValues(5, 5, '===')).toBe(true);
        expect(compareValues(5, 10, '===')).toBe(false);
        expect(compareValues(5, '5', '===')).toBe(false);
      });

      it('should compare with !== operator', () => {
        expect(compareValues(5, 10, '!==')).toBe(true);
        expect(compareValues(5, 5, '!==')).toBe(false);
        expect(compareValues(5, '5', '!==')).toBe(true);
      });
    });

    describe('null/undefined handling', () => {
      it('should handle both values null', () => {
        expect(compareValues(null, null, '==')).toBe(true);
        expect(compareValues(null, null, '===')).toBe(true);
        expect(compareValues(null, null, '!=')).toBe(false);
        expect(compareValues(null, null, '!==')).toBe(false);
      });

      it('should handle both values undefined', () => {
        expect(compareValues(undefined, undefined, '==')).toBe(true);
        expect(compareValues(undefined, undefined, '===')).toBe(true);
        expect(compareValues(undefined, undefined, '!=')).toBe(false);
        expect(compareValues(undefined, undefined, '!==')).toBe(false);
      });

      it('should handle null == undefined', () => {
        expect(compareValues(null, undefined, '==')).toBe(true);
        expect(compareValues(undefined, null, '==')).toBe(true);
        expect(compareValues(null, undefined, '===')).toBe(false);
        expect(compareValues(undefined, null, '===')).toBe(false);
      });

      it('should handle null vs non-null values', () => {
        expect(compareValues(null, 5, '==')).toBe(false);
        expect(compareValues(5, null, '==')).toBe(false);
        expect(compareValues(null, 0, '==')).toBe(false);
        expect(compareValues(null, '', '==')).toBe(false);
      });

      it('should handle undefined vs defined values', () => {
        expect(compareValues(undefined, 5, '==')).toBe(false);
        expect(compareValues(5, undefined, '==')).toBe(false);
        expect(compareValues(undefined, 0, '==')).toBe(false);
        expect(compareValues(undefined, '', '==')).toBe(false);
      });
    });

    describe('type coercion', () => {
      it('should coerce string to number for == comparison', () => {
        expect(compareValues(5, '5', '==')).toBe(true);
        expect(compareValues('5', 5, '==')).toBe(true);
      });

      it('should handle boolean coercion with ==', () => {
        expect(compareValues(true, 1, '==')).toBe(true);
        expect(compareValues(1, true, '==')).toBe(true);
        expect(compareValues(false, 0, '==')).toBe(true);
        expect(compareValues(0, false, '==')).toBe(true);
      });

      it('should handle numeric string comparison', () => {
        expect(compareValues('10', 2, '>')).toBe(true);
        expect(compareValues('2', 10, '<')).toBe(true);
        expect(compareValues('5', '5', '==')).toBe(true);
      });

      it('should handle string comparison', () => {
        expect(compareValues('abc', 'xyz', '<')).toBe(true);
        expect(compareValues('xyz', 'abc', '>')).toBe(true);
        expect(compareValues('abc', 'abc', '==')).toBe(true);
      });

      it('should handle mixed types defaulting to string comparison', () => {
        expect(compareValues('abc', 123, '==')).toBe(false);
        expect(compareValues('abc', 'abc', '==')).toBe(true);
      });

      it('should not coerce for === operator', () => {
        expect(compareValues(5, '5', '===')).toBe(false);
        expect(compareValues(true, 1, '===')).toBe(false);
        expect(compareValues(false, 0, '===')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle NaN comparisons', () => {
        expect(compareValues(NaN, NaN, '==')).toBe(false);
        expect(compareValues(NaN, NaN, '===')).toBe(false);
        expect(compareValues(NaN, NaN, '!=')).toBe(true);
        expect(compareValues(NaN, NaN, '!==')).toBe(true);
        expect(compareValues(NaN, 5, '==')).toBe(false);
      });

      it('should handle Infinity', () => {
        expect(compareValues(Infinity, 1000, '>')).toBe(true);
        expect(compareValues(Infinity, Infinity, '==')).toBe(true);
        expect(compareValues(Infinity, -Infinity, '>')).toBe(true);
      });

      it('should handle -Infinity', () => {
        expect(compareValues(-Infinity, -1000, '<')).toBe(true);
        expect(compareValues(-Infinity, -Infinity, '==')).toBe(true);
        expect(compareValues(-Infinity, Infinity, '<')).toBe(true);
      });

      it('should handle scientific notation', () => {
        expect(compareValues('1e3', 1000, '==')).toBe(true);
        expect(compareValues('1e3', 999, '>')).toBe(true);
        expect(compareValues('1e-3', 0.001, '==')).toBe(true);
      });
    });
  });

  describe('helper functions', () => {
    it('should check strict equality with areStrictlyEqual', () => {
      expect(areStrictlyEqual(5, 5)).toBe(true);
      expect(areStrictlyEqual(5, '5')).toBe(false);
      expect(areStrictlyEqual(null, null)).toBe(true);
      expect(areStrictlyEqual(null, undefined)).toBe(false);
    });

    it('should check loose equality with areLooselyEqual', () => {
      expect(areLooselyEqual(5, 5)).toBe(true);
      expect(areLooselyEqual(5, '5')).toBe(true);
      expect(areLooselyEqual(null, undefined)).toBe(true);
      expect(areLooselyEqual(true, 1)).toBe(true);
    });

    it('should check greater than with isGreaterThan and isGreaterThanOrEqual', () => {
      expect(isGreaterThan(10, 5)).toBe(true);
      expect(isGreaterThan(5, 10)).toBe(false);
      expect(isGreaterThan(5, 5)).toBe(false);

      expect(isGreaterThanOrEqual(10, 5)).toBe(true);
      expect(isGreaterThanOrEqual(5, 5)).toBe(true);
      expect(isGreaterThanOrEqual(5, 10)).toBe(false);
    });

    it('should check less than with isLessThan and isLessThanOrEqual', () => {
      expect(isLessThan(5, 10)).toBe(true);
      expect(isLessThan(10, 5)).toBe(false);
      expect(isLessThan(5, 5)).toBe(false);

      expect(isLessThanOrEqual(5, 10)).toBe(true);
      expect(isLessThanOrEqual(5, 5)).toBe(true);
      expect(isLessThanOrEqual(10, 5)).toBe(false);
    });
  });

  describe('coerceToComparable', () => {
    it('should return [number, number] for numeric values', () => {
      const result = coerceToComparable(5, 10);
      expect(result).toEqual([5, 10]);
      expect(typeof result[0]).toBe('number');
      expect(typeof result[1]).toBe('number');
    });

    it('should return [string, string] for non-numeric values', () => {
      const result1 = coerceToComparable('abc', 'xyz');
      expect(result1).toEqual(['abc', 'xyz']);
      expect(typeof result1[0]).toBe('string');
      expect(typeof result1[1]).toBe('string');

      const result2 = coerceToComparable('abc', 123);
      expect(result2).toEqual(['abc', '123']);
      expect(typeof result2[0]).toBe('string');
      expect(typeof result2[1]).toBe('string');
    });

    it('should coerce numeric strings to numbers', () => {
      const result = coerceToComparable('5', '10');
      expect(result).toEqual([5, 10]);
      expect(typeof result[0]).toBe('number');
      expect(typeof result[1]).toBe('number');
    });

    it('should handle mixed numeric and numeric string', () => {
      const result = coerceToComparable('5', 10);
      expect(result).toEqual([5, 10]);
      expect(typeof result[0]).toBe('number');
      expect(typeof result[1]).toBe('number');
    });
  });
});
