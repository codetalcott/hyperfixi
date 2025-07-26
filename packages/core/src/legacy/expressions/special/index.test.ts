/**
 * Tests for special expressions
 * Covering literal values, mathematical operations, and unary expressions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockHyperscriptContext } from '../../test-setup.js';
import { 
  specialExpressions, 
  ensureNumber, 
  interpolateString 
} from './index.js';
import type { ExecutionContext } from '../../types/core.js';

describe('Special Expressions', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = createMockHyperscriptContext();
    // Clear cookie storage for tests
    (globalThis as any).__cookieStorage__ = {};
  });

  describe('Literal Expressions', () => {
    describe('stringLiteral expression', () => {
      it('should return string unchanged', async () => {
        const result = await specialExpressions.stringLiteral.evaluate(context, 'hello world');
        expect(result).toBe('hello world');
      });

      it('should handle empty strings', async () => {
        const result = await specialExpressions.stringLiteral.evaluate(context, '');
        expect(result).toBe('');
      });

      it('should handle string interpolation', async () => {
        const result = await specialExpressions.stringLiteral.evaluate(context, 'Hello $name');
        expect(result).toBe('Hello [name]');
      });

      it('should handle template literal interpolation', async () => {
        const result = await specialExpressions.stringLiteral.evaluate(context, 'Result: ${1 + 2}');
        expect(result).toBe('Result: [1 + 2]');
      });

      it('should throw error for non-string input', async () => {
        await expect(specialExpressions.stringLiteral.evaluate(context, 123 as any))
          .rejects.toThrow('String literal must be a string');
      });

      it('should validate arguments', () => {
        expect(specialExpressions.stringLiteral.validate!(['hello'])).toBeNull();
        expect(specialExpressions.stringLiteral.validate!([])).toContain('exactly one argument');
        expect(specialExpressions.stringLiteral.validate!(['hello', 'world'])).toContain('exactly one argument');
        expect(specialExpressions.stringLiteral.validate!([123])).toContain('must be a string');
      });
    });

    describe('numberLiteral expression', () => {
      it('should return numbers unchanged', async () => {
        expect(await specialExpressions.numberLiteral.evaluate(context, 42)).toBe(42);
        expect(await specialExpressions.numberLiteral.evaluate(context, 3.14159)).toBe(3.14159);
        expect(await specialExpressions.numberLiteral.evaluate(context, -7)).toBe(-7);
        expect(await specialExpressions.numberLiteral.evaluate(context, 0)).toBe(0);
      });

      it('should throw error for non-number input', async () => {
        await expect(specialExpressions.numberLiteral.evaluate(context, 'hello' as any))
          .rejects.toThrow('Number literal must be a number');
      });

      it('should throw error for infinite values', async () => {
        await expect(specialExpressions.numberLiteral.evaluate(context, Infinity))
          .rejects.toThrow('Number literal must be finite');
        await expect(specialExpressions.numberLiteral.evaluate(context, -Infinity))
          .rejects.toThrow('Number literal must be finite');
        await expect(specialExpressions.numberLiteral.evaluate(context, NaN))
          .rejects.toThrow('Number literal must be finite');
      });

      it('should validate arguments', () => {
        expect(specialExpressions.numberLiteral.validate!([42])).toBeNull();
        expect(specialExpressions.numberLiteral.validate!([])).toContain('exactly one argument');
        expect(specialExpressions.numberLiteral.validate!([42, 24])).toContain('exactly one argument');
        expect(specialExpressions.numberLiteral.validate!(['42'])).toContain('must be a number');
        expect(specialExpressions.numberLiteral.validate!([Infinity])).toContain('must be finite');
      });
    });

    describe('booleanLiteral expression', () => {
      it('should return booleans unchanged', async () => {
        expect(await specialExpressions.booleanLiteral.evaluate(context, true)).toBe(true);
        expect(await specialExpressions.booleanLiteral.evaluate(context, false)).toBe(false);
      });

      it('should throw error for non-boolean input', async () => {
        await expect(specialExpressions.booleanLiteral.evaluate(context, 'true' as any))
          .rejects.toThrow('Boolean literal must be a boolean');
      });

      it('should validate arguments', () => {
        expect(specialExpressions.booleanLiteral.validate!([true])).toBeNull();
        expect(specialExpressions.booleanLiteral.validate!([false])).toBeNull();
        expect(specialExpressions.booleanLiteral.validate!([])).toContain('exactly one argument');
        expect(specialExpressions.booleanLiteral.validate!([true, false])).toContain('exactly one argument');
        expect(specialExpressions.booleanLiteral.validate!(['true'])).toContain('must be a boolean');
      });
    });

    describe('nullLiteral expression', () => {
      it('should return null', async () => {
        const result = await specialExpressions.nullLiteral.evaluate(context);
        expect(result).toBeNull();
      });

      it('should validate arguments', () => {
        expect(specialExpressions.nullLiteral.validate!([])).toBeNull();
        expect(specialExpressions.nullLiteral.validate!([null])).toContain('takes no arguments');
      });
    });

    describe('arrayLiteral expression', () => {
      it('should return array of elements', async () => {
        expect(await specialExpressions.arrayLiteral.evaluate(context)).toEqual([]);
        expect(await specialExpressions.arrayLiteral.evaluate(context, 1, 2, 3)).toEqual([1, 2, 3]);
        expect(await specialExpressions.arrayLiteral.evaluate(context, 'a', 'b', 'c')).toEqual(['a', 'b', 'c']);
        expect(await specialExpressions.arrayLiteral.evaluate(context, 1, 'hello', true, null)).toEqual([1, 'hello', true, null]);
      });

      it('should validate arguments', () => {
        expect(specialExpressions.arrayLiteral.validate!([])).toBeNull();
        expect(specialExpressions.arrayLiteral.validate!([1, 2, 3])).toBeNull();
      });
    });

    describe('objectLiteral expression', () => {
      it('should return copy of object', async () => {
        const obj = { key1: 'value1', key2: 42, key3: true };
        const result = await specialExpressions.objectLiteral.evaluate(context, obj);
        
        expect(result).toEqual(obj);
        expect(result).not.toBe(obj); // Should be a copy
      });

      it('should handle empty objects', async () => {
        const result = await specialExpressions.objectLiteral.evaluate(context, {});
        expect(result).toEqual({});
      });

      it('should throw error for non-object input', async () => {
        await expect(specialExpressions.objectLiteral.evaluate(context, null as any))
          .rejects.toThrow('Object literal must be an object');
        await expect(specialExpressions.objectLiteral.evaluate(context, [] as any))
          .rejects.toThrow('Object literal must be an object');
        await expect(specialExpressions.objectLiteral.evaluate(context, 'string' as any))
          .rejects.toThrow('Object literal must be an object');
      });

      it('should validate arguments', () => {
        expect(specialExpressions.objectLiteral.validate!([{}])).toBeNull();
        expect(specialExpressions.objectLiteral.validate!([{ key: 'value' }])).toBeNull();
        expect(specialExpressions.objectLiteral.validate!([])).toContain('exactly one argument');
        expect(specialExpressions.objectLiteral.validate!([{}, {}])).toContain('exactly one argument');
        expect(specialExpressions.objectLiteral.validate!([null])).toContain('must be an object');
        expect(specialExpressions.objectLiteral.validate!([[]])).toContain('must be an object');
      });
    });
  });

  describe('Mathematical Expressions', () => {
    describe('addition expression', () => {
      it('should add two numbers', async () => {
        expect(await specialExpressions.addition.evaluate(context, 3, 4)).toBe(7);
        expect(await specialExpressions.addition.evaluate(context, 1.5, 2.5)).toBe(4);
        expect(await specialExpressions.addition.evaluate(context, -2, 5)).toBe(3);
        expect(await specialExpressions.addition.evaluate(context, 0, 0)).toBe(0);
      });

      it('should convert string numbers', async () => {
        expect(await specialExpressions.addition.evaluate(context, '3', '4')).toBe(7);
        expect(await specialExpressions.addition.evaluate(context, 3, '4')).toBe(7);
      });

      it('should convert booleans', async () => {
        expect(await specialExpressions.addition.evaluate(context, true, false)).toBe(1);
        expect(await specialExpressions.addition.evaluate(context, true, true)).toBe(2);
      });

      it('should handle null as zero', async () => {
        expect(await specialExpressions.addition.evaluate(context, 5, null)).toBe(5);
        expect(await specialExpressions.addition.evaluate(context, null, null)).toBe(0);
      });

      it('should throw error for invalid operands', async () => {
        await expect(specialExpressions.addition.evaluate(context, 'invalid', 2))
          .rejects.toThrow('Left operand cannot be converted to number');
        await expect(specialExpressions.addition.evaluate(context, 2, 'invalid'))
          .rejects.toThrow('Right operand cannot be converted to number');
      });

      it('should validate arguments', () => {
        expect(specialExpressions.addition.validate!([3, 4])).toBeNull();
        expect(specialExpressions.addition.validate!([3])).toContain('exactly two arguments');
        expect(specialExpressions.addition.validate!([3, 4, 5])).toContain('exactly two arguments');
      });

      it('should have correct metadata', () => {
        expect(specialExpressions.addition.category).toBe('Mathematical');
        expect(specialExpressions.addition.evaluatesTo).toBe('Number');
        expect(specialExpressions.addition.precedence).toBe(6);
        expect(specialExpressions.addition.associativity).toBe('Left');
        expect(specialExpressions.addition.operators).toContain('+');
      });
    });

    describe('subtraction expression', () => {
      it('should subtract two numbers', async () => {
        expect(await specialExpressions.subtraction.evaluate(context, 7, 3)).toBe(4);
        expect(await specialExpressions.subtraction.evaluate(context, 2.5, 1.5)).toBe(1);
        expect(await specialExpressions.subtraction.evaluate(context, -2, 3)).toBe(-5);
        expect(await specialExpressions.subtraction.evaluate(context, 0, 5)).toBe(-5);
      });

      it('should have correct metadata', () => {
        expect(specialExpressions.subtraction.precedence).toBe(6);
        expect(specialExpressions.subtraction.associativity).toBe('Left');
        expect(specialExpressions.subtraction.operators).toContain('-');
      });
    });

    describe('multiplication expression', () => {
      it('should multiply two numbers', async () => {
        expect(await specialExpressions.multiplication.evaluate(context, 3, 4)).toBe(12);
        expect(await specialExpressions.multiplication.evaluate(context, 2.5, 2)).toBe(5);
        expect(await specialExpressions.multiplication.evaluate(context, -2, 3)).toBe(-6);
        expect(await specialExpressions.multiplication.evaluate(context, 0, 100)).toBe(0);
      });

      it('should have correct metadata', () => {
        expect(specialExpressions.multiplication.precedence).toBe(7);
        expect(specialExpressions.multiplication.associativity).toBe('Left');
        expect(specialExpressions.multiplication.operators).toContain('*');
      });
    });

    describe('division expression', () => {
      it('should divide two numbers', async () => {
        expect(await specialExpressions.division.evaluate(context, 12, 3)).toBe(4);
        expect(await specialExpressions.division.evaluate(context, 5, 2)).toBe(2.5);
        expect(await specialExpressions.division.evaluate(context, -6, 2)).toBe(-3);
      });

      it('should throw error for division by zero', async () => {
        await expect(specialExpressions.division.evaluate(context, 5, 0))
          .rejects.toThrow('Division by zero');
      });

      it('should have correct metadata', () => {
        expect(specialExpressions.division.precedence).toBe(7);
        expect(specialExpressions.division.associativity).toBe('Left');
        expect(specialExpressions.division.operators).toContain('/');
      });
    });

    describe('modulo expression', () => {
      it('should calculate modulo', async () => {
        expect(await specialExpressions.modulo.evaluate(context, 10, 3)).toBe(1);
        expect(await specialExpressions.modulo.evaluate(context, 15, 4)).toBe(3);
        expect(await specialExpressions.modulo.evaluate(context, 8, 2)).toBe(0);
      });

      it('should throw error for modulo by zero', async () => {
        await expect(specialExpressions.modulo.evaluate(context, 5, 0))
          .rejects.toThrow('Modulo by zero');
      });

      it('should have correct metadata', () => {
        expect(specialExpressions.modulo.precedence).toBe(7);
        expect(specialExpressions.modulo.associativity).toBe('Left');
        expect(specialExpressions.modulo.operators).toContain('mod');
        expect(specialExpressions.modulo.operators).toContain('%');
      });
    });

    describe('exponentiation expression', () => {
      it('should calculate powers', async () => {
        expect(await specialExpressions.exponentiation.evaluate(context, 2, 3)).toBe(8);
        expect(await specialExpressions.exponentiation.evaluate(context, 5, 2)).toBe(25);
        expect(await specialExpressions.exponentiation.evaluate(context, 3, 0)).toBe(1);
        expect(await specialExpressions.exponentiation.evaluate(context, 4, 0.5)).toBe(2);
      });

      it('should have correct metadata', () => {
        expect(specialExpressions.exponentiation.precedence).toBe(8);
        expect(specialExpressions.exponentiation.associativity).toBe('Right');
        expect(specialExpressions.exponentiation.operators).toContain('^');
        expect(specialExpressions.exponentiation.operators).toContain('**');
      });
    });
  });

  describe('Unary Expressions', () => {
    describe('unaryMinus expression', () => {
      it('should negate numbers', async () => {
        expect(await specialExpressions.unaryMinus.evaluate(context, 5)).toBe(-5);
        expect(await specialExpressions.unaryMinus.evaluate(context, -3)).toBe(3);
        expect(await specialExpressions.unaryMinus.evaluate(context, 0)).toBe(-0);
        expect(await specialExpressions.unaryMinus.evaluate(context, 2.5)).toBe(-2.5);
      });

      it('should convert and negate', async () => {
        expect(await specialExpressions.unaryMinus.evaluate(context, '5')).toBe(-5);
        expect(await specialExpressions.unaryMinus.evaluate(context, true)).toBe(-1);
        expect(await specialExpressions.unaryMinus.evaluate(context, false)).toBe(-0);
      });

      it('should throw error for invalid operand', async () => {
        await expect(specialExpressions.unaryMinus.evaluate(context, 'invalid'))
          .rejects.toThrow('Operand cannot be converted to number');
      });

      it('should validate arguments', () => {
        expect(specialExpressions.unaryMinus.validate!([5])).toBeNull();
        expect(specialExpressions.unaryMinus.validate!([])).toContain('exactly one argument');
        expect(specialExpressions.unaryMinus.validate!([5, 3])).toContain('exactly one argument');
      });

      it('should have correct metadata', () => {
        expect(specialExpressions.unaryMinus.category).toBe('Mathematical');
        expect(specialExpressions.unaryMinus.evaluatesTo).toBe('Number');
        expect(specialExpressions.unaryMinus.precedence).toBe(9);
        expect(specialExpressions.unaryMinus.associativity).toBe('Right');
        expect(specialExpressions.unaryMinus.operators).toContain('-');
      });
    });

    describe('unaryPlus expression', () => {
      it('should convert to positive numbers', async () => {
        expect(await specialExpressions.unaryPlus.evaluate(context, 5)).toBe(5);
        expect(await specialExpressions.unaryPlus.evaluate(context, -3)).toBe(-3);
        expect(await specialExpressions.unaryPlus.evaluate(context, '5')).toBe(5);
        expect(await specialExpressions.unaryPlus.evaluate(context, true)).toBe(1);
        expect(await specialExpressions.unaryPlus.evaluate(context, false)).toBe(0);
      });

      it('should have correct metadata', () => {
        expect(specialExpressions.unaryPlus.precedence).toBe(9);
        expect(specialExpressions.unaryPlus.associativity).toBe('Right');
        expect(specialExpressions.unaryPlus.operators).toContain('+');
      });
    });
  });

  describe('Grouping Expressions', () => {
    describe('parentheses expression', () => {
      it('should return inner expression unchanged', async () => {
        expect(await specialExpressions.parentheses.evaluate(context, 42)).toBe(42);
        expect(await specialExpressions.parentheses.evaluate(context, 'hello')).toBe('hello');
        expect(await specialExpressions.parentheses.evaluate(context, true)).toBe(true);
        expect(await specialExpressions.parentheses.evaluate(context, null)).toBeNull();
        
        const obj = { key: 'value' };
        expect(await specialExpressions.parentheses.evaluate(context, obj)).toBe(obj);
      });

      it('should validate arguments', () => {
        expect(specialExpressions.parentheses.validate!([42])).toBeNull();
        expect(specialExpressions.parentheses.validate!([])).toContain('exactly one argument');
        expect(specialExpressions.parentheses.validate!([42, 24])).toContain('exactly one argument');
      });

      it('should have correct metadata', () => {
        expect(specialExpressions.parentheses.category).toBe('Grouping');
        expect(specialExpressions.parentheses.evaluatesTo).toBe('Any');
        expect(specialExpressions.parentheses.precedence).toBe(10);
        expect(specialExpressions.parentheses.operators).toContain('(');
        expect(specialExpressions.parentheses.operators).toContain(')');
      });
    });
  });

  describe('Helper Functions', () => {
    describe('ensureNumber', () => {
      it('should handle numbers', () => {
        expect(ensureNumber(42, 'Test')).toBe(42);
        expect(ensureNumber(3.14, 'Test')).toBe(3.14);
        expect(ensureNumber(-7, 'Test')).toBe(-7);
        expect(ensureNumber(0, 'Test')).toBe(0);
      });

      it('should convert string numbers', () => {
        expect(ensureNumber('42', 'Test')).toBe(42);
        expect(ensureNumber('3.14', 'Test')).toBe(3.14);
        expect(ensureNumber('-7', 'Test')).toBe(-7);
      });

      it('should convert booleans', () => {
        expect(ensureNumber(true, 'Test')).toBe(1);
        expect(ensureNumber(false, 'Test')).toBe(0);
      });

      it('should convert null/undefined to zero', () => {
        expect(ensureNumber(null, 'Test')).toBe(0);
        expect(ensureNumber(undefined, 'Test')).toBe(0);
      });

      it('should throw error for infinite numbers', () => {
        expect(() => ensureNumber(Infinity, 'Test')).toThrow('Test must be a finite number');
        expect(() => ensureNumber(-Infinity, 'Test')).toThrow('Test must be a finite number');
        expect(() => ensureNumber(NaN, 'Test')).toThrow('Test must be a finite number');
      });

      it('should throw error for invalid strings', () => {
        expect(() => ensureNumber('invalid', 'Test')).toThrow('Test cannot be converted to number: "invalid"');
        expect(() => ensureNumber('', 'Test')).toThrow('Test cannot be converted to number: ""');
      });

      it('should throw error for unconvertible values', () => {
        expect(() => ensureNumber({}, 'Test')).toThrow('Test cannot be converted to number');
        expect(() => ensureNumber([], 'Test')).toThrow('Test cannot be converted to number');
        expect(() => ensureNumber(() => {}, 'Test')).toThrow('Test cannot be converted to number');
      });
    });

    describe('interpolateString', () => {
      it('should handle simple variable interpolation', () => {
        expect(interpolateString('Hello $name', context)).toBe('Hello [name]');
        expect(interpolateString('$greeting $name', context)).toBe('[greeting] [name]');
        expect(interpolateString('Value: $value123', context)).toBe('Value: [value123]');
      });

      it('should handle expression interpolation', () => {
        expect(interpolateString('Result: ${1 + 2}', context)).toBe('Result: [1 + 2]');
        expect(interpolateString('${greeting} ${name}!', context)).toBe('[greeting] [name]!');
        expect(interpolateString('Complex: ${user.name.toUpperCase()}', context)).toBe('Complex: [user.name.toUpperCase()]');
      });

      it('should handle mixed interpolation', () => {
        expect(interpolateString('$simple and ${complex}', context)).toBe('[simple] and [complex]');
      });

      it('should handle strings with no interpolation', () => {
        expect(interpolateString('No interpolation here', context)).toBe('No interpolation here');
        expect(interpolateString('$ without variable', context)).toBe('$ without variable');
        expect(interpolateString('{ without dollar }', context)).toBe('{ without dollar }');
      });
    });
  });

  describe('Expression Metadata', () => {
    it('should have correct categories', () => {
      // Literal expressions
      expect(specialExpressions.stringLiteral.category).toBe('Literal');
      expect(specialExpressions.numberLiteral.category).toBe('Literal');
      expect(specialExpressions.booleanLiteral.category).toBe('Literal');
      expect(specialExpressions.nullLiteral.category).toBe('Literal');
      expect(specialExpressions.arrayLiteral.category).toBe('Literal');
      expect(specialExpressions.objectLiteral.category).toBe('Literal');
      
      // Mathematical expressions
      expect(specialExpressions.addition.category).toBe('Mathematical');
      expect(specialExpressions.subtraction.category).toBe('Mathematical');
      expect(specialExpressions.multiplication.category).toBe('Mathematical');
      expect(specialExpressions.division.category).toBe('Mathematical');
      expect(specialExpressions.modulo.category).toBe('Mathematical');
      expect(specialExpressions.exponentiation.category).toBe('Mathematical');
      expect(specialExpressions.unaryMinus.category).toBe('Mathematical');
      expect(specialExpressions.unaryPlus.category).toBe('Mathematical');
      
      // Grouping expressions
      expect(specialExpressions.parentheses.category).toBe('Grouping');
    });

    it('should have appropriate evaluation types', () => {
      expect(specialExpressions.stringLiteral.evaluatesTo).toBe('String');
      expect(specialExpressions.numberLiteral.evaluatesTo).toBe('Number');
      expect(specialExpressions.booleanLiteral.evaluatesTo).toBe('Boolean');
      expect(specialExpressions.nullLiteral.evaluatesTo).toBe('Null');
      expect(specialExpressions.arrayLiteral.evaluatesTo).toBe('Array');
      expect(specialExpressions.objectLiteral.evaluatesTo).toBe('Object');
      
      // All mathematical expressions should return Number
      expect(specialExpressions.addition.evaluatesTo).toBe('Number');
      expect(specialExpressions.subtraction.evaluatesTo).toBe('Number');
      expect(specialExpressions.multiplication.evaluatesTo).toBe('Number');
      expect(specialExpressions.division.evaluatesTo).toBe('Number');
      expect(specialExpressions.modulo.evaluatesTo).toBe('Number');
      expect(specialExpressions.exponentiation.evaluatesTo).toBe('Number');
      expect(specialExpressions.unaryMinus.evaluatesTo).toBe('Number');
      expect(specialExpressions.unaryPlus.evaluatesTo).toBe('Number');
      
      expect(specialExpressions.parentheses.evaluatesTo).toBe('Any');
    });

    it('should have correct precedence ordering', () => {
      // Higher precedence = evaluated first
      expect(specialExpressions.parentheses.precedence).toBe(10); // Highest
      expect(specialExpressions.unaryMinus.precedence).toBe(9);
      expect(specialExpressions.unaryPlus.precedence).toBe(9);
      expect(specialExpressions.exponentiation.precedence).toBe(8);
      expect(specialExpressions.multiplication.precedence).toBe(7);
      expect(specialExpressions.division.precedence).toBe(7);
      expect(specialExpressions.modulo.precedence).toBe(7);
      expect(specialExpressions.addition.precedence).toBe(6);
      expect(specialExpressions.subtraction.precedence).toBe(6);
    });

    it('should have correct associativity', () => {
      // Most operations are left-associative
      expect(specialExpressions.addition.associativity).toBe('Left');
      expect(specialExpressions.subtraction.associativity).toBe('Left');
      expect(specialExpressions.multiplication.associativity).toBe('Left');
      expect(specialExpressions.division.associativity).toBe('Left');
      expect(specialExpressions.modulo.associativity).toBe('Left');
      
      // Exponentiation and unary operations are right-associative
      expect(specialExpressions.exponentiation.associativity).toBe('Right');
      expect(specialExpressions.unaryMinus.associativity).toBe('Right');
      expect(specialExpressions.unaryPlus.associativity).toBe('Right');
    });

    it('should have correct operator definitions', () => {
      expect(specialExpressions.addition.operators).toContain('+');
      expect(specialExpressions.subtraction.operators).toContain('-');
      expect(specialExpressions.multiplication.operators).toContain('*');
      expect(specialExpressions.division.operators).toContain('/');
      expect(specialExpressions.modulo.operators).toContain('mod');
      expect(specialExpressions.modulo.operators).toContain('%');
      expect(specialExpressions.exponentiation.operators).toContain('^');
      expect(specialExpressions.exponentiation.operators).toContain('**');
      expect(specialExpressions.unaryMinus.operators).toContain('-');
      expect(specialExpressions.unaryPlus.operators).toContain('+');
      expect(specialExpressions.parentheses.operators).toContain('(');
      expect(specialExpressions.parentheses.operators).toContain(')');
    });
  });

  describe('Global Objects', () => {
    describe('cookies expression', () => {
      let cookies: any;

      beforeEach(async () => {
        // Clear all cookies before each test
        (globalThis as any).__cookieStorage__ = {};
        
        // Get a fresh cookies object for each test
        cookies = await specialExpressions.cookies.evaluate(context);
        
        // Extra safety: clear all cookies using the API
        cookies.clearAll();
      });

      it('should return undefined for non-existent cookies', async () => {
        const result = cookies.foo;
        expect(result).toBeUndefined();
      });

      it('should set and get cookie values', async () => {
        // Set cookie value
        cookies.foo = 'bar';
        
        // Get cookie value
        const result = cookies.foo;
        expect(result).toBe('bar');
      });

      it('should update cookie values', async () => {
        cookies.foo = 'bar';
        expect(cookies.foo).toBe('bar');
        
        cookies.foo = 'doh';
        expect(cookies.foo).toBe('doh');
      });

      it('should clear specific cookies', async () => {
        cookies.foo = 'bar';
        expect(cookies.foo).toBe('bar');
        
        cookies.clear('foo');
        expect(cookies.foo).toBeUndefined();
      });

      it('should clear all cookies', async () => {
        cookies.foo = 'bar';
        cookies.baz = 'qux';
        expect(cookies.foo).toBe('bar');
        expect(cookies.baz).toBe('qux');
        
        cookies.clearAll();
        expect(cookies.foo).toBeUndefined();
        expect(cookies.baz).toBeUndefined();
      });

      it('should iterate over cookies', async () => {
        cookies.foo = 'bar';
        cookies.test = 'value';
        
        const names: string[] = [];
        const values: string[] = [];
        
        for (const cookie of cookies) {
          names.push(cookie.name);
          values.push(cookie.value);
        }
        
        expect(names).toContain('foo');
        expect(names).toContain('test');
        expect(values).toContain('bar');
        expect(values).toContain('value');
      });

      it('should handle getAll method', async () => {
        cookies.alpha = 'beta';
        cookies.gamma = 'delta';
        
        const allCookies = cookies.getAll();
        expect(allCookies).toHaveLength(2);
        expect(allCookies.find((c: any) => c.name === 'alpha')?.value).toBe('beta');
        expect(allCookies.find((c: any) => c.name === 'gamma')?.value).toBe('delta');
      });

      it('should handle complex cookie values', async () => {
        const complexValue = 'complex value with spaces & symbols';
        cookies.complex = complexValue;
        expect(cookies.complex).toBe(complexValue);
      });

      it('should handle empty cookie values', async () => {
        cookies.empty = '';
        expect(cookies.empty).toBe('');
      });

      it('should handle numeric-like cookie values', async () => {
        cookies.number = '123';
        expect(cookies.number).toBe('123');
        
        cookies.float = '45.67';
        expect(cookies.float).toBe('45.67');
      });

      it('should support property existence checks', async () => {
        cookies.exists = 'yes';
        
        expect('exists' in cookies).toBe(true);
        expect('notExists' in cookies).toBe(false);
      });

      it('should validate without arguments', () => {
        expect(specialExpressions.cookies.validate!()).toBeNull();
      });

      it('should have correct metadata', () => {
        expect(specialExpressions.cookies.name).toBe('cookies');
        expect(specialExpressions.cookies.category).toBe('Global');
        expect(specialExpressions.cookies.evaluatesTo).toBe('Object');
      });

      it('should handle multiple cookies independently', async () => {
        const cookies1 = await specialExpressions.cookies.evaluate(context);
        const cookies2 = await specialExpressions.cookies.evaluate(context);
        
        // Both should access the same underlying storage
        cookies1.shared = 'value1';
        expect(cookies2.shared).toBe('value1');
        
        cookies2.shared = 'value2';
        expect(cookies1.shared).toBe('value2');
      });

      it('should persist across cookie object recreations', async () => {
        cookies.persistent = 'data';
        
        // Create a new cookies object
        const newCookies = await specialExpressions.cookies.evaluate(context);
        expect(newCookies.persistent).toBe('data');
      });
    });
  });
});