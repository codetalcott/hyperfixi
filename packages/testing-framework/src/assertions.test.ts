/**
 * Tests for Assertion Library
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createExpectAPI, createAssertAPI, AssertionError } from './assertions';

describe('Assertions Library', () => {
  describe('createExpectAPI', () => {
    const expectFn = createExpectAPI();

    describe('toBe', () => {
      it('should pass for same values', () => {
        expect(() => expectFn(5).toBe(5)).not.toThrow();
        expect(() => expectFn('hello').toBe('hello')).not.toThrow();
        expect(() => expectFn(null).toBe(null)).not.toThrow();
      });

      it('should fail for different values', () => {
        expect(() => expectFn(5).toBe(6)).toThrow(AssertionError);
        expect(() => expectFn('hello').toBe('world')).toThrow(AssertionError);
      });

      it('should handle reference equality', () => {
        const obj = { a: 1 };
        expect(() => expectFn(obj).toBe(obj)).not.toThrow();
        expect(() => expectFn({ a: 1 }).toBe({ a: 1 })).toThrow(AssertionError);
      });
    });

    describe('toEqual', () => {
      it('should pass for deeply equal objects', () => {
        expect(() => expectFn({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 })).not.toThrow();
        expect(() => expectFn([1, 2, 3]).toEqual([1, 2, 3])).not.toThrow();
      });

      it('should fail for non-equal objects', () => {
        expect(() => expectFn({ a: 1 }).toEqual({ a: 2 })).toThrow(AssertionError);
        expect(() => expectFn([1, 2]).toEqual([1, 2, 3])).toThrow(AssertionError);
      });

      it('should handle nested objects', () => {
        expect(() => expectFn({ a: { b: 1 } }).toEqual({ a: { b: 1 } })).not.toThrow();
        expect(() => expectFn({ a: { b: 1 } }).toEqual({ a: { b: 2 } })).toThrow(AssertionError);
      });

      it('should handle Date objects', () => {
        const date = new Date('2024-01-01');
        expect(() => expectFn(date).toEqual(new Date('2024-01-01'))).not.toThrow();
      });

      it('should handle RegExp objects', () => {
        expect(() => expectFn(/abc/).toEqual(/abc/)).not.toThrow();
        expect(() => expectFn(/abc/i).toEqual(/abc/)).toThrow(AssertionError);
      });
    });

    describe('toBeTruthy', () => {
      it('should pass for truthy values', () => {
        expect(() => expectFn(true).toBeTruthy()).not.toThrow();
        expect(() => expectFn(1).toBeTruthy()).not.toThrow();
        expect(() => expectFn('hello').toBeTruthy()).not.toThrow();
        expect(() => expectFn({}).toBeTruthy()).not.toThrow();
        expect(() => expectFn([]).toBeTruthy()).not.toThrow();
      });

      it('should fail for falsy values', () => {
        expect(() => expectFn(false).toBeTruthy()).toThrow(AssertionError);
        expect(() => expectFn(0).toBeTruthy()).toThrow(AssertionError);
        expect(() => expectFn('').toBeTruthy()).toThrow(AssertionError);
        expect(() => expectFn(null).toBeTruthy()).toThrow(AssertionError);
        expect(() => expectFn(undefined).toBeTruthy()).toThrow(AssertionError);
      });
    });

    describe('toBeFalsy', () => {
      it('should pass for falsy values', () => {
        expect(() => expectFn(false).toBeFalsy()).not.toThrow();
        expect(() => expectFn(0).toBeFalsy()).not.toThrow();
        expect(() => expectFn('').toBeFalsy()).not.toThrow();
        expect(() => expectFn(null).toBeFalsy()).not.toThrow();
        expect(() => expectFn(undefined).toBeFalsy()).not.toThrow();
      });

      it('should fail for truthy values', () => {
        expect(() => expectFn(true).toBeFalsy()).toThrow(AssertionError);
        expect(() => expectFn(1).toBeFalsy()).toThrow(AssertionError);
        expect(() => expectFn('hello').toBeFalsy()).toThrow(AssertionError);
      });
    });

    describe('toBeNull', () => {
      it('should pass for null', () => {
        expect(() => expectFn(null).toBeNull()).not.toThrow();
      });

      it('should fail for non-null values', () => {
        expect(() => expectFn(undefined).toBeNull()).toThrow(AssertionError);
        expect(() => expectFn(0).toBeNull()).toThrow(AssertionError);
        expect(() => expectFn('').toBeNull()).toThrow(AssertionError);
      });
    });

    describe('toBeUndefined', () => {
      it('should pass for undefined', () => {
        expect(() => expectFn(undefined).toBeUndefined()).not.toThrow();
      });

      it('should fail for defined values', () => {
        expect(() => expectFn(null).toBeUndefined()).toThrow(AssertionError);
        expect(() => expectFn(0).toBeUndefined()).toThrow(AssertionError);
      });
    });

    describe('toBeDefined', () => {
      it('should pass for defined values', () => {
        expect(() => expectFn(null).toBeDefined()).not.toThrow();
        expect(() => expectFn(0).toBeDefined()).not.toThrow();
        expect(() => expectFn('').toBeDefined()).not.toThrow();
      });

      it('should fail for undefined', () => {
        expect(() => expectFn(undefined).toBeDefined()).toThrow(AssertionError);
      });
    });

    describe('toBeNaN', () => {
      it('should pass for NaN', () => {
        expect(() => expectFn(NaN).toBeNaN()).not.toThrow();
      });

      it('should fail for non-NaN values', () => {
        expect(() => expectFn(123).toBeNaN()).toThrow(AssertionError);
        expect(() => expectFn('not a number').toBeNaN()).toThrow(AssertionError);
      });
    });

    describe('toBeInstanceOf', () => {
      it('should pass for correct instances', () => {
        expect(() => expectFn(new Date()).toBeInstanceOf(Date)).not.toThrow();
        expect(() => expectFn([]).toBeInstanceOf(Array)).not.toThrow();
        expect(() => expectFn(new Error()).toBeInstanceOf(Error)).not.toThrow();
      });

      it('should fail for incorrect instances', () => {
        expect(() => expectFn({}).toBeInstanceOf(Array)).toThrow(AssertionError);
        expect(() => expectFn('').toBeInstanceOf(Number)).toThrow(AssertionError);
      });
    });

    describe('toBeCloseTo', () => {
      it('should pass for close numbers', () => {
        expect(() => expectFn(0.1 + 0.2).toBeCloseTo(0.3)).not.toThrow();
        expect(() => expectFn(Math.PI).toBeCloseTo(3.14, 2)).not.toThrow();
      });

      it('should fail for distant numbers', () => {
        expect(() => expectFn(0.5).toBeCloseTo(0.3)).toThrow(AssertionError);
      });

      it('should throw for non-numbers', () => {
        expect(() => expectFn('hello').toBeCloseTo(5)).toThrow(AssertionError);
      });
    });

    describe('toMatch', () => {
      it('should pass for matching strings', () => {
        expect(() => expectFn('hello world').toMatch('world')).not.toThrow();
        expect(() => expectFn('hello world').toMatch(/world/)).not.toThrow();
        expect(() => expectFn('Hello World').toMatch(/hello/i)).not.toThrow();
      });

      it('should fail for non-matching strings', () => {
        expect(() => expectFn('hello').toMatch('world')).toThrow(AssertionError);
        expect(() => expectFn('hello').toMatch(/World/)).toThrow(AssertionError);
      });

      it('should throw for non-strings', () => {
        expect(() => expectFn(123).toMatch('123')).toThrow(AssertionError);
      });
    });

    describe('toContain', () => {
      it('should pass for string containing substring', () => {
        expect(() => expectFn('hello world').toContain('world')).not.toThrow();
      });

      it('should pass for array containing item', () => {
        expect(() => expectFn([1, 2, 3]).toContain(2)).not.toThrow();
        expect(() => expectFn(['a', 'b', 'c']).toContain('b')).not.toThrow();
      });

      it('should fail for non-containing values', () => {
        expect(() => expectFn('hello').toContain('world')).toThrow(AssertionError);
        expect(() => expectFn([1, 2, 3]).toContain(4)).toThrow(AssertionError);
      });
    });

    describe('toHaveLength', () => {
      it('should pass for correct length', () => {
        expect(() => expectFn('hello').toHaveLength(5)).not.toThrow();
        expect(() => expectFn([1, 2, 3]).toHaveLength(3)).not.toThrow();
      });

      it('should fail for incorrect length', () => {
        expect(() => expectFn('hello').toHaveLength(10)).toThrow(AssertionError);
        expect(() => expectFn([1, 2]).toHaveLength(5)).toThrow(AssertionError);
      });

      it('should throw for values without length', () => {
        expect(() => expectFn(123).toHaveLength(3)).toThrow(AssertionError);
        expect(() => expectFn(null).toHaveLength(0)).toThrow(AssertionError);
      });
    });

    describe('toContainEqual', () => {
      it('should pass for array containing equal object', () => {
        expect(() => expectFn([{ a: 1 }, { b: 2 }]).toContainEqual({ a: 1 })).not.toThrow();
      });

      it('should fail for array not containing equal object', () => {
        expect(() => expectFn([{ a: 1 }]).toContainEqual({ a: 2 })).toThrow(AssertionError);
      });

      it('should throw for non-arrays', () => {
        expect(() => expectFn('hello').toContainEqual('h')).toThrow(AssertionError);
      });
    });

    describe('toHaveProperty', () => {
      it('should pass for existing property', () => {
        expect(() => expectFn({ a: 1 }).toHaveProperty('a')).not.toThrow();
        expect(() => expectFn({ a: { b: 2 } }).toHaveProperty('a.b')).not.toThrow();
      });

      it('should pass for property with specific value', () => {
        expect(() => expectFn({ a: 1 }).toHaveProperty('a', 1)).not.toThrow();
      });

      it('should fail for non-existing property', () => {
        expect(() => expectFn({ a: 1 }).toHaveProperty('b')).toThrow(AssertionError);
      });

      it('should fail for property with wrong value', () => {
        expect(() => expectFn({ a: 1 }).toHaveProperty('a', 2)).toThrow(AssertionError);
      });
    });

    describe('toMatchObject', () => {
      it('should pass for matching partial object', () => {
        expect(() => expectFn({ a: 1, b: 2, c: 3 }).toMatchObject({ a: 1, b: 2 })).not.toThrow();
      });

      it('should fail for non-matching object', () => {
        expect(() => expectFn({ a: 1 }).toMatchObject({ a: 2 })).toThrow(AssertionError);
      });

      it('should throw for non-objects', () => {
        expect(() => expectFn('hello').toMatchObject({ length: 5 })).toThrow(AssertionError);
        expect(() => expectFn(null).toMatchObject({})).toThrow(AssertionError);
      });
    });

    describe('not modifier', () => {
      it('should invert toBe', () => {
        expect(() => expectFn(5).not.toBe(6)).not.toThrow();
        expect(() => expectFn(5).not.toBe(5)).toThrow(AssertionError);
      });

      it('should invert toEqual', () => {
        expect(() => expectFn({ a: 1 }).not.toEqual({ a: 2 })).not.toThrow();
        expect(() => expectFn({ a: 1 }).not.toEqual({ a: 1 })).toThrow(AssertionError);
      });

      it('should invert toBeTruthy', () => {
        expect(() => expectFn(false).not.toBeTruthy()).not.toThrow();
        expect(() => expectFn(true).not.toBeTruthy()).toThrow(AssertionError);
      });

      it('should invert toContain', () => {
        expect(() => expectFn([1, 2, 3]).not.toContain(5)).not.toThrow();
        expect(() => expectFn([1, 2, 3]).not.toContain(2)).toThrow(AssertionError);
      });
    });
  });

  describe('createAssertAPI', () => {
    const assert = createAssertAPI();

    describe('ok', () => {
      it('should pass for truthy values', () => {
        expect(() => assert.ok(true)).not.toThrow();
        expect(() => assert.ok(1)).not.toThrow();
        expect(() => assert.ok('hello')).not.toThrow();
      });

      it('should fail for falsy values', () => {
        expect(() => assert.ok(false)).toThrow(AssertionError);
        expect(() => assert.ok(0)).toThrow(AssertionError);
        expect(() => assert.ok('')).toThrow(AssertionError);
      });

      it('should use custom message', () => {
        expect(() => assert.ok(false, 'Custom message')).toThrow('Custom message');
      });
    });

    describe('equal', () => {
      it('should pass for loosely equal values', () => {
        expect(() => assert.equal(1, 1)).not.toThrow();
        expect(() => assert.equal('1', 1)).not.toThrow();
        expect(() => assert.equal(null, undefined)).not.toThrow();
      });

      it('should fail for non-equal values', () => {
        expect(() => assert.equal(1, 2)).toThrow(AssertionError);
        expect(() => assert.equal('hello', 'world')).toThrow(AssertionError);
      });
    });

    describe('strictEqual', () => {
      it('should pass for strictly equal values', () => {
        expect(() => assert.strictEqual(1, 1)).not.toThrow();
        expect(() => assert.strictEqual('hello', 'hello')).not.toThrow();
      });

      it('should fail for loosely equal but not strictly equal', () => {
        expect(() => assert.strictEqual('1', 1)).toThrow(AssertionError);
        expect(() => assert.strictEqual(null, undefined)).toThrow(AssertionError);
      });
    });

    describe('notEqual', () => {
      it('should pass for non-equal values', () => {
        expect(() => assert.notEqual(1, 2)).not.toThrow();
        expect(() => assert.notEqual('hello', 'world')).not.toThrow();
      });

      it('should fail for equal values', () => {
        expect(() => assert.notEqual(1, 1)).toThrow(AssertionError);
        expect(() => assert.notEqual('1', 1)).toThrow(AssertionError);
      });
    });

    describe('notStrictEqual', () => {
      it('should pass for loosely equal but not strictly equal', () => {
        expect(() => assert.notStrictEqual('1', 1)).not.toThrow();
        expect(() => assert.notStrictEqual(null, undefined)).not.toThrow();
      });

      it('should fail for strictly equal values', () => {
        expect(() => assert.notStrictEqual(1, 1)).toThrow(AssertionError);
        expect(() => assert.notStrictEqual('hello', 'hello')).toThrow(AssertionError);
      });
    });

    describe('throws', () => {
      it('should pass when function throws', () => {
        expect(() =>
          assert.throws(() => {
            throw new Error('test');
          })
        ).not.toThrow();
      });

      it('should fail when function does not throw', () => {
        expect(() => assert.throws(() => {})).toThrow(AssertionError);
      });

      it('should match error message', () => {
        expect(() =>
          assert.throws(() => {
            throw new Error('test');
          }, 'test')
        ).not.toThrow();
        expect(() =>
          assert.throws(() => {
            throw new Error('test');
          }, 'other')
        ).toThrow(AssertionError);
      });

      it('should match error type', () => {
        expect(() =>
          assert.throws(() => {
            throw new TypeError('test');
          }, TypeError)
        ).not.toThrow();
        expect(() =>
          assert.throws(() => {
            throw new Error('test');
          }, TypeError)
        ).toThrow(AssertionError);
      });

      it('should match error regex', () => {
        expect(() =>
          assert.throws(() => {
            throw new Error('test error');
          }, /test/)
        ).not.toThrow();
        expect(() =>
          assert.throws(() => {
            throw new Error('test error');
          }, /other/)
        ).toThrow(AssertionError);
      });
    });

    describe('doesNotThrow', () => {
      it('should pass when function does not throw', () => {
        expect(() => assert.doesNotThrow(() => {})).not.toThrow();
        expect(() => assert.doesNotThrow(() => 123)).not.toThrow();
      });

      it('should fail when function throws', () => {
        expect(() =>
          assert.doesNotThrow(() => {
            throw new Error('test');
          })
        ).toThrow(AssertionError);
      });
    });

    describe('ifError', () => {
      it('should pass for falsy values', () => {
        expect(() => assert.ifError(null)).not.toThrow();
        expect(() => assert.ifError(undefined)).not.toThrow();
        expect(() => assert.ifError(false)).not.toThrow();
      });

      it('should throw the value for truthy values', () => {
        const error = new Error('test');
        expect(() => assert.ifError(error)).toThrow(error);
        expect(() => assert.ifError('error string')).toThrow('error string');
      });
    });

    describe('rejects', () => {
      it('should pass when promise rejects', async () => {
        await expect(assert.rejects(Promise.reject(new Error('test')))).resolves.toBeUndefined();
      });

      it('should fail when promise resolves', async () => {
        await expect(assert.rejects(Promise.resolve())).rejects.toThrow(AssertionError);
      });

      it('should match error message', async () => {
        await expect(
          assert.rejects(Promise.reject(new Error('test')), 'test')
        ).resolves.toBeUndefined();
        await expect(assert.rejects(Promise.reject(new Error('test')), 'other')).rejects.toThrow(
          AssertionError
        );
      });
    });

    describe('doesNotReject', () => {
      it('should pass when promise resolves', async () => {
        await expect(assert.doesNotReject(Promise.resolve())).resolves.toBeUndefined();
      });

      it('should fail when promise rejects', async () => {
        await expect(assert.doesNotReject(Promise.reject(new Error('test')))).rejects.toThrow(
          AssertionError
        );
      });
    });
  });

  describe('AssertionError', () => {
    it('should be an instance of Error', () => {
      const error = new AssertionError('test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AssertionError);
    });

    it('should have correct name', () => {
      const error = new AssertionError('test');
      expect(error.name).toBe('AssertionError');
    });

    it('should store expected and actual values', () => {
      const error = new AssertionError('test', 'expected', 'actual', 'toBe');
      expect(error.expected).toBe('expected');
      expect(error.actual).toBe('actual');
      expect(error.operator).toBe('toBe');
    });
  });
});
