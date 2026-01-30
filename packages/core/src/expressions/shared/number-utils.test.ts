import { describe, it, expect } from 'vitest';
import {
  toNumber,
  toNumberOrNull,
  ensureFinite,
  isNumeric,
  safeDivide,
  safeModulo,
} from './number-utils';

describe('number-utils', () => {
  describe('toNumber', () => {
    it('should pass through number values unchanged', () => {
      expect(toNumber(42, 'test')).toBe(42);
      expect(toNumber(0, 'test')).toBe(0);
      expect(toNumber(-17.5, 'test')).toBe(-17.5);
      expect(toNumber(3.14159, 'test')).toBe(3.14159);
    });

    it('should convert numeric strings to numbers', () => {
      expect(toNumber('42', 'test')).toBe(42);
      expect(toNumber('0', 'test')).toBe(0);
      expect(toNumber('-17.5', 'test')).toBe(-17.5);
      expect(toNumber('3.14159', 'test')).toBe(3.14159);
      expect(toNumber('  123  ', 'test')).toBe(123);
    });

    it('should convert booleans to numbers', () => {
      expect(toNumber(true, 'test')).toBe(1);
      expect(toNumber(false, 'test')).toBe(0);
    });

    it('should convert null and undefined to 0', () => {
      expect(toNumber(null, 'test')).toBe(0);
      expect(toNumber(undefined, 'test')).toBe(0);
    });

    it('should convert empty and whitespace strings to 0', () => {
      expect(toNumber('', 'test')).toBe(0);
      expect(toNumber('   ', 'test')).toBe(0);
      expect(toNumber('\t\n', 'test')).toBe(0);
    });

    it('should support objects with valueOf() method', () => {
      const objWithValueOf = {
        valueOf() {
          return 99;
        },
      };
      expect(toNumber(objWithValueOf, 'test')).toBe(99);
    });

    it('should throw on non-numeric strings', () => {
      expect(() => toNumber('not a number', 'test context')).toThrow(
        'test context cannot be converted to number: "not a number"'
      );
      expect(() => toNumber('abc', 'operation')).toThrow(
        'operation cannot be converted to number: "abc"'
      );
    });

    it('should throw on Infinity values', () => {
      expect(() => toNumber(Infinity, 'test')).toThrow(
        'test must be a finite number, got Infinity'
      );
      expect(() => toNumber(-Infinity, 'test')).toThrow(
        'test must be a finite number, got -Infinity'
      );
    });

    it('should throw on NaN values', () => {
      expect(() => toNumber(NaN, 'test')).toThrow('test must be a finite number, got NaN');
    });
  });

  describe('toNumberOrNull', () => {
    it('should convert valid numeric values to numbers', () => {
      expect(toNumberOrNull(42)).toBe(42);
      expect(toNumberOrNull('123')).toBe(123);
      expect(toNumberOrNull(true)).toBe(1);
      expect(toNumberOrNull(false)).toBe(0);
      expect(toNumberOrNull(null)).toBe(0);
      expect(toNumberOrNull(undefined)).toBe(0);
      expect(toNumberOrNull('')).toBe(0);
    });

    it('should return null for objects (including those with valueOf)', () => {
      const objWithValueOf = {
        valueOf() {
          return 42;
        },
      };
      expect(toNumberOrNull(objWithValueOf)).toBeNull();
      expect(toNumberOrNull({})).toBeNull();
    });

    it('should return null for non-numeric strings', () => {
      expect(toNumberOrNull('not a number')).toBeNull();
      expect(toNumberOrNull('abc123')).toBeNull();
      expect(toNumberOrNull('xyz')).toBeNull();
    });

    it('should return null for Infinity and NaN', () => {
      expect(toNumberOrNull(Infinity)).toBeNull();
      expect(toNumberOrNull(-Infinity)).toBeNull();
      expect(toNumberOrNull(NaN)).toBeNull();
    });
  });

  describe('ensureFinite', () => {
    it('should accept finite numbers', () => {
      expect(ensureFinite(42, 'test')).toBe(42);
      expect(ensureFinite(0, 'test')).toBe(0);
      expect(ensureFinite(-17.5, 'test')).toBe(-17.5);
      expect(ensureFinite(Number.MAX_SAFE_INTEGER, 'test')).toBe(Number.MAX_SAFE_INTEGER);
      expect(ensureFinite(Number.MIN_SAFE_INTEGER, 'test')).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('should throw on NaN with descriptive message', () => {
      expect(() => ensureFinite(NaN, 'addition')).toThrow(
        'addition resulted in non-finite value: NaN'
      );
      expect(() => ensureFinite(NaN, 'calculation')).toThrow(
        'calculation resulted in non-finite value: NaN'
      );
    });

    it('should throw on Infinity with descriptive message', () => {
      expect(() => ensureFinite(Infinity, 'division')).toThrow(
        'division resulted in non-finite value: Infinity'
      );
      expect(() => ensureFinite(-Infinity, 'subtraction')).toThrow(
        'subtraction resulted in non-finite value: -Infinity'
      );
    });
  });

  describe('isNumeric', () => {
    it('should return true for finite numbers', () => {
      expect(isNumeric(42)).toBe(true);
      expect(isNumeric(0)).toBe(true);
      expect(isNumeric(-17.5)).toBe(true);
      expect(isNumeric(3.14159)).toBe(true);
    });

    it('should return true for numeric strings', () => {
      expect(isNumeric('42')).toBe(true);
      expect(isNumeric('0')).toBe(true);
      expect(isNumeric('-17.5')).toBe(true);
      expect(isNumeric('3.14159')).toBe(true);
      expect(isNumeric('  123  ')).toBe(true);
    });

    it('should return false for NaN, Infinity, and non-numeric values', () => {
      expect(isNumeric(NaN)).toBe(false);
      expect(isNumeric(Infinity)).toBe(false);
      expect(isNumeric(-Infinity)).toBe(false);
      expect(isNumeric('not a number')).toBe(false);
      expect(isNumeric('abc')).toBe(false);
      expect(isNumeric({})).toBe(false);
      expect(isNumeric([])).toBe(false);
    });
  });

  describe('safeDivide', () => {
    it('should perform normal division', () => {
      expect(safeDivide(10, 2)).toBe(5);
      expect(safeDivide(7, 2)).toBe(3.5);
      expect(safeDivide(-10, 2)).toBe(-5);
      expect(safeDivide(0, 5)).toBe(0);
    });

    it('should return Infinity when dividing by zero with allowInfinity=true', () => {
      expect(safeDivide(10, 0, true)).toBe(Infinity);
      expect(safeDivide(-10, 0, true)).toBe(-Infinity);
    });

    it('should return NaN for 0/0 with allowInfinity=true', () => {
      expect(safeDivide(0, 0, true)).toBeNaN();
    });

    it('should throw when dividing by zero with allowInfinity=false', () => {
      expect(() => safeDivide(10, 0, false)).toThrow('Division by zero');
      expect(() => safeDivide(-5, 0, false)).toThrow('Division by zero');
      expect(() => safeDivide(0, 0, false)).toThrow('Division by zero');
    });

    it('should default allowInfinity to true', () => {
      expect(safeDivide(10, 0)).toBe(Infinity);
      expect(safeDivide(-10, 0)).toBe(-Infinity);
    });
  });

  describe('safeModulo', () => {
    it('should perform normal modulo operation', () => {
      expect(safeModulo(10, 3)).toBe(1);
      expect(safeModulo(7, 2)).toBe(1);
      expect(safeModulo(15, 5)).toBe(0);
      expect(safeModulo(-10, 3)).toBe(-1);
      expect(safeModulo(0, 5)).toBe(0);
    });

    it('should throw when modulo by zero', () => {
      expect(() => safeModulo(10, 0)).toThrow('Modulo by zero');
      expect(() => safeModulo(5, 0)).toThrow('Modulo by zero');
      expect(() => safeModulo(0, 0)).toThrow('Modulo by zero');
    });
  });
});
