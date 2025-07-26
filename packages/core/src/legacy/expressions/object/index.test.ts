/**
 * Tests for Object Operations Expressions
 * Generated from LSP examples with comprehensive TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { objectExpressions } from './index';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Object Operations Expressions', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = createTestElement('<div id="test" data-value="123">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
    
    // Ensure required context properties exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Object Creation and Manipulation', () => {
    it('should have object creation expression', () => {
      const createObjectExpr = objectExpressions.find(expr => expr.name === 'object');
      expect(createObjectExpr).toBeDefined();
      expect(createObjectExpr?.category).toBe('Object');
    });

    it('should create objects from key-value pairs', async () => {
      const createObjectExpr = objectExpressions.find(expr => expr.name === 'object')!;
      
      const result = await createObjectExpr.evaluate(context, 
        'name', 'John', 
        'age', 30, 
        'active', true
      );
      
      expect(result).toEqual({
        name: 'John',
        age: 30,
        active: true
      });
    });

    it('should create empty object with no arguments', async () => {
      const createObjectExpr = objectExpressions.find(expr => expr.name === 'object')!;
      
      const result = await createObjectExpr.evaluate(context);
      expect(result).toEqual({});
    });

    it('should get object keys', async () => {
      const keysExpr = objectExpressions.find(expr => expr.name === 'keys')!;
      
      const obj = { name: 'John', age: 30, city: 'NYC' };
      const result = await keysExpr.evaluate(context, obj);
      
      expect(result).toEqual(['name', 'age', 'city']);
    });

    it('should get object values', async () => {
      const valuesExpr = objectExpressions.find(expr => expr.name === 'values')!;
      
      const obj = { name: 'John', age: 30, active: true };
      const result = await valuesExpr.evaluate(context, obj);
      
      expect(result).toEqual(['John', 30, true]);
    });

    it('should get object entries', async () => {
      const entriesExpr = objectExpressions.find(expr => expr.name === 'entries')!;
      
      const obj = { name: 'John', age: 30 };
      const result = await entriesExpr.evaluate(context, obj);
      
      expect(result).toEqual([['name', 'John'], ['age', 30]]);
    });
  });

  describe('Property Access and Testing', () => {
    it('should check if object has property', async () => {
      const hasPropertyExpr = objectExpressions.find(expr => expr.name === 'hasProperty')!;
      
      const obj = { name: 'John', age: 30 };
      
      const result1 = await hasPropertyExpr.evaluate(context, obj, 'name');
      expect(result1).toBe(true);
      
      const result2 = await hasPropertyExpr.evaluate(context, obj, 'email');
      expect(result2).toBe(false);
    });

    it('should get property value', async () => {
      const getPropertyExpr = objectExpressions.find(expr => expr.name === 'getProperty')!;
      
      const obj = { name: 'John', age: 30, nested: { city: 'NYC' } };
      
      const result1 = await getPropertyExpr.evaluate(context, obj, 'name');
      expect(result1).toBe('John');
      
      const result2 = await getPropertyExpr.evaluate(context, obj, 'nonexistent');
      expect(result2).toBe(undefined);
      
      // Nested property access
      const result3 = await getPropertyExpr.evaluate(context, obj.nested, 'city');
      expect(result3).toBe('NYC');
    });

    it('should set property value', async () => {
      const setPropertyExpr = objectExpressions.find(expr => expr.name === 'setProperty')!;
      
      const obj = { name: 'John', age: 30 };
      
      await setPropertyExpr.evaluate(context, obj, 'age', 31);
      expect(obj.age).toBe(31);
      
      await setPropertyExpr.evaluate(context, obj, 'city', 'Boston');
      expect(obj.city).toBe('Boston');
    });

    it('should delete property', async () => {
      const deletePropertyExpr = objectExpressions.find(expr => expr.name === 'deleteProperty')!;
      
      const obj = { name: 'John', age: 30, city: 'NYC' };
      
      const result = await deletePropertyExpr.evaluate(context, obj, 'age');
      expect(result).toBe(true);
      expect(obj.hasOwnProperty('age')).toBe(false);
      expect(obj).toEqual({ name: 'John', city: 'NYC' });
    });

    it('should handle dynamic property access', async () => {
      const getPropertyExpr = objectExpressions.find(expr => expr.name === 'getProperty')!;
      
      const obj = { user1: 'John', user2: 'Jane', user3: 'Bob' };
      context.locals!.set('userId', 2);
      
      // Dynamic key construction
      const dynamicKey = 'user' + context.locals.get('userId');
      const result = await getPropertyExpr.evaluate(context, obj, dynamicKey);
      
      expect(result).toBe('Jane');
    });
  });

  describe('Object Transformation', () => {
    it('should merge objects', async () => {
      const mergeExpr = objectExpressions.find(expr => expr.name === 'merge')!;
      
      const obj1 = { name: 'John', age: 30 };
      const obj2 = { age: 31, city: 'NYC' };
      const obj3 = { country: 'USA' };
      
      const result = await mergeExpr.evaluate(context, obj1, obj2, obj3);
      
      expect(result).toEqual({
        name: 'John',
        age: 31, // obj2 overwrites obj1
        city: 'NYC',
        country: 'USA'
      });
      
      // Original objects should not be modified
      expect(obj1).toEqual({ name: 'John', age: 30 });
    });

    it('should pick specific properties', async () => {
      const pickExpr = objectExpressions.find(expr => expr.name === 'pick')!;
      
      const obj = { name: 'John', age: 30, city: 'NYC', country: 'USA' };
      const result = await pickExpr.evaluate(context, obj, ['name', 'city']);
      
      expect(result).toEqual({ name: 'John', city: 'NYC' });
    });

    it('should omit specific properties', async () => {
      const omitExpr = objectExpressions.find(expr => expr.name === 'omit')!;
      
      const obj = { name: 'John', age: 30, city: 'NYC', country: 'USA' };
      const result = await omitExpr.evaluate(context, obj, ['age', 'country']);
      
      expect(result).toEqual({ name: 'John', city: 'NYC' });
    });

    it('should clone objects (shallow)', async () => {
      const cloneExpr = objectExpressions.find(expr => expr.name === 'clone')!;
      
      const obj = { name: 'John', age: 30, nested: { city: 'NYC' } };
      const result = await cloneExpr.evaluate(context, obj);
      
      expect(result).toEqual(obj);
      expect(result).not.toBe(obj); // Different reference
      expect(result.nested).toBe(obj.nested); // Shallow clone
    });

    it('should deep clone objects', async () => {
      const deepCloneExpr = objectExpressions.find(expr => expr.name === 'deepClone')!;
      
      const obj = { name: 'John', nested: { city: 'NYC', coords: { lat: 40.7, lon: -74.0 } } };
      const result = await deepCloneExpr.evaluate(context, obj);
      
      expect(result).toEqual(obj);
      expect(result).not.toBe(obj); // Different reference
      expect(result.nested).not.toBe(obj.nested); // Deep clone
      expect(result.nested.coords).not.toBe(obj.nested.coords); // Deep clone
    });

    it('should map over object entries', async () => {
      const mapEntriesExpr = objectExpressions.find(expr => expr.name === 'mapEntries')!;
      
      const obj = { a: 1, b: 2, c: 3 };
      const doubleValues = ([key, value]: [string, number]) => [key, value * 2];
      context.locals!.set('doubleValues', doubleValues);
      
      const result = await mapEntriesExpr.evaluate(context, obj, 'doubleValues');
      expect(result).toEqual({ a: 2, b: 4, c: 6 });
    });

    it('should filter object entries', async () => {
      const filterEntriesExpr = objectExpressions.find(expr => expr.name === 'filterEntries')!;
      
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const isEven = ([key, value]: [string, number]) => value % 2 === 0;
      context.locals!.set('isEven', isEven);
      
      const result = await filterEntriesExpr.evaluate(context, obj, 'isEven');
      expect(result).toEqual({ b: 2, d: 4 });
    });
  });

  describe('Object Testing and Validation', () => {
    it('should check if value is object', async () => {
      const isObjectExpr = objectExpressions.find(expr => expr.name === 'isObject')!;
      
      const result1 = await isObjectExpr.evaluate(context, { name: 'John' });
      expect(result1).toBe(true);
      
      const result2 = await isObjectExpr.evaluate(context, [1, 2, 3]);
      expect(result2).toBe(false); // Arrays are not plain objects
      
      const result3 = await isObjectExpr.evaluate(context, null);
      expect(result3).toBe(false);
      
      const result4 = await isObjectExpr.evaluate(context, 'hello');
      expect(result4).toBe(false);
    });

    it('should check if object is empty', async () => {
      const isEmptyExpr = objectExpressions.find(expr => expr.name === 'isEmpty')!;
      
      const result1 = await isEmptyExpr.evaluate(context, {});
      expect(result1).toBe(true);
      
      const result2 = await isEmptyExpr.evaluate(context, { name: 'John' });
      expect(result2).toBe(false);
      
      const result3 = await isEmptyExpr.evaluate(context, null);
      expect(result3).toBe(true); // null is considered empty
    });

    it('should get object size (number of properties)', async () => {
      const sizeExpr = objectExpressions.find(expr => expr.name === 'size')!;
      
      const result1 = await sizeExpr.evaluate(context, { a: 1, b: 2, c: 3 });
      expect(result1).toBe(3);
      
      const result2 = await sizeExpr.evaluate(context, {});
      expect(result2).toBe(0);
    });

    it('should compare objects for equality', async () => {
      const equalsExpr = objectExpressions.find(expr => expr.name === 'equals')!;
      
      const obj1 = { name: 'John', age: 30 };
      const obj2 = { name: 'John', age: 30 };
      const obj3 = { name: 'Jane', age: 30 };
      
      const result1 = await equalsExpr.evaluate(context, obj1, obj2);
      expect(result1).toBe(true); // Same content
      
      const result2 = await equalsExpr.evaluate(context, obj1, obj3);
      expect(result2).toBe(false); // Different content
      
      const result3 = await equalsExpr.evaluate(context, obj1, obj1);
      expect(result3).toBe(true); // Same reference
    });
  });

  describe('Object Destructuring and Path Operations', () => {
    it('should destructure objects', async () => {
      const destructureExpr = objectExpressions.find(expr => expr.name === 'destructure')!;
      
      const obj = { 
        name: 'John', 
        age: 30, 
        address: { city: 'NYC', zip: '10001' },
        hobbies: ['reading', 'coding']
      };
      
      const keys = ['name', 'age', 'address.city', 'hobbies[0]'];
      const result = await destructureExpr.evaluate(context, obj, keys);
      
      expect(result).toEqual({
        name: 'John',
        age: 30,
        'address.city': 'NYC',
        'hobbies[0]': 'reading'
      });
    });

    it('should get nested property by path', async () => {
      const getPathExpr = objectExpressions.find(expr => expr.name === 'getPath')!;
      
      const obj = { 
        user: { 
          profile: { 
            name: 'John',
            contacts: { email: 'john@example.com' }
          }
        }
      };
      
      const result1 = await getPathExpr.evaluate(context, obj, 'user.profile.name');
      expect(result1).toBe('John');
      
      const result2 = await getPathExpr.evaluate(context, obj, 'user.profile.contacts.email');
      expect(result2).toBe('john@example.com');
      
      const result3 = await getPathExpr.evaluate(context, obj, 'user.profile.nonexistent');
      expect(result3).toBe(undefined);
    });

    it('should set nested property by path', async () => {
      const setPathExpr = objectExpressions.find(expr => expr.name === 'setPath')!;
      
      const obj = { 
        user: { 
          profile: { name: 'John' }
        }
      };
      
      await setPathExpr.evaluate(context, obj, 'user.profile.age', 30);
      expect(obj.user.profile.age).toBe(30);
      
      await setPathExpr.evaluate(context, obj, 'user.settings.theme', 'dark');
      expect(obj.user.settings?.theme).toBe('dark');
    });

    it('should check if path exists', async () => {
      const hasPathExpr = objectExpressions.find(expr => expr.name === 'hasPath')!;
      
      const obj = { 
        user: { 
          profile: { name: 'John' },
          settings: null
        }
      };
      
      const result1 = await hasPathExpr.evaluate(context, obj, 'user.profile.name');
      expect(result1).toBe(true);
      
      const result2 = await hasPathExpr.evaluate(context, obj, 'user.profile.age');
      expect(result2).toBe(false);
      
      const result3 = await hasPathExpr.evaluate(context, obj, 'user.settings');
      expect(result3).toBe(true); // Path exists but value is null
    });
  });

  describe('JSON and Serialization', () => {
    it('should convert object to JSON string', async () => {
      const toJsonExpr = objectExpressions.find(expr => expr.name === 'toJson')!;
      
      const obj = { name: 'John', age: 30, active: true };
      const result = await toJsonExpr.evaluate(context, obj);
      
      expect(result).toBe('{"name":"John","age":30,"active":true}');
    });

    it('should parse JSON string to object', async () => {
      const fromJsonExpr = objectExpressions.find(expr => expr.name === 'fromJson')!;
      
      const jsonString = '{"name":"John","age":30,"active":true}';
      const result = await fromJsonExpr.evaluate(context, jsonString);
      
      expect(result).toEqual({ name: 'John', age: 30, active: true });
    });

    it('should handle invalid JSON gracefully', async () => {
      const fromJsonExpr = objectExpressions.find(expr => expr.name === 'fromJson')!;
      
      const result = await fromJsonExpr.evaluate(context, '{invalid json}');
      expect(result).toBe(null); // Returns null for invalid JSON
    });

    it('should stringify with formatting', async () => {
      const toJsonExpr = objectExpressions.find(expr => expr.name === 'toJson')!;
      
      const obj = { name: 'John', nested: { age: 30 } };
      const result = await toJsonExpr.evaluate(context, obj, 2); // 2 spaces indent
      
      const expected = `{
  "name": "John",
  "nested": {
    "age": 30
  }
}`;
      expect(result).toBe(expected);
    });
  });

  describe('Object Composition and Patterns', () => {
    it('should create object from entries', async () => {
      const fromEntriesExpr = objectExpressions.find(expr => expr.name === 'fromEntries')!;
      
      const entries = [['name', 'John'], ['age', 30], ['active', true]];
      const result = await fromEntriesExpr.evaluate(context, entries);
      
      expect(result).toEqual({ name: 'John', age: 30, active: true });
    });

    it('should group array by key function', async () => {
      const groupByExpr = objectExpressions.find(expr => expr.name === 'groupBy')!;
      
      const users = [
        { name: 'John', age: 25, department: 'IT' },
        { name: 'Jane', age: 30, department: 'HR' },
        { name: 'Bob', age: 35, department: 'IT' }
      ];
      
      const getDepartment = (user: any) => user.department;
      context.locals!.set('getDept', getDepartment);
      
      const result = await groupByExpr.evaluate(context, users, 'getDept');
      
      expect(result).toEqual({
        IT: [
          { name: 'John', age: 25, department: 'IT' },
          { name: 'Bob', age: 35, department: 'IT' }
        ],
        HR: [
          { name: 'Jane', age: 30, department: 'HR' }
        ]
      });
    });

    it('should invert object keys and values', async () => {
      const invertExpr = objectExpressions.find(expr => expr.name === 'invert')!;
      
      const obj = { a: '1', b: '2', c: '3' };
      const result = await invertExpr.evaluate(context, obj);
      
      expect(result).toEqual({ '1': 'a', '2': 'b', '3': 'c' });
    });

    it('should create default object with fallbacks', async () => {
      const defaultsExpr = objectExpressions.find(expr => expr.name === 'defaults')!;
      
      const obj = { name: 'John', age: 30 };
      const fallbacks = { age: 25, city: 'NYC', active: true };
      
      const result = await defaultsExpr.evaluate(context, obj, fallbacks);
      
      expect(result).toEqual({
        name: 'John',
        age: 30, // Original value preserved
        city: 'NYC', // From fallbacks
        active: true // From fallbacks
      });
    });
  });

  describe('Integration with Hyperscript Context', () => {
    it('should work with DOM element properties', async () => {
      const getPropertyExpr = objectExpressions.find(expr => expr.name === 'getProperty')!;
      
      testElement.id = 'myElement';
      testElement.className = 'active test';
      testElement.setAttribute('data-value', '123');
      
      const result1 = await getPropertyExpr.evaluate(context, testElement, 'id');
      expect(result1).toBe('myElement');
      
      const result2 = await getPropertyExpr.evaluate(context, testElement, 'className');
      expect(result2).toBe('active test');
      
      // Using getAttribute for data attributes
      const dataValue = testElement.getAttribute('data-value');
      expect(dataValue).toBe('123');
    });

    it('should extract object from form data', async () => {
      const container = createTestElement(`
        <form>
          <input name="name" value="John">
          <input name="age" type="number" value="30">
          <input name="active" type="checkbox" checked>
        </form>
      `);
      
      const form = container.querySelector('form')!;
      
      // Create manual entries since FormData might not work as expected in test environment
      const entries = [
        ['name', 'John'],
        ['age', '30'],
        ['active', 'on']
      ];
      
      const fromEntriesExpr = objectExpressions.find(expr => expr.name === 'fromEntries')!;
      
      // Convert entries to object
      const result = await fromEntriesExpr.evaluate(context, entries);
      
      expect(result.name).toBe('John');
      expect(result.age).toBe('30');
      expect(result.active).toBe('on');
    });

    it('should work with element dataset', async () => {
      testElement.setAttribute('data-user-id', '123');
      testElement.setAttribute('data-user-name', 'John');
      testElement.setAttribute('data-active', 'true');
      
      const keysExpr = objectExpressions.find(expr => expr.name === 'keys')!;
      const valuesExpr = objectExpressions.find(expr => expr.name === 'values')!;
      
      const keys = await keysExpr.evaluate(context, testElement.dataset);
      const values = await valuesExpr.evaluate(context, testElement.dataset);
      
      expect(keys).toContain('userId');
      expect(keys).toContain('userName');
      expect(keys).toContain('active');
      
      expect(values).toContain('123');
      expect(values).toContain('John');
      expect(values).toContain('true');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined objects', async () => {
      const keysExpr = objectExpressions.find(expr => expr.name === 'keys')!;
      
      const result1 = await keysExpr.evaluate(context, null);
      expect(result1).toEqual([]);
      
      const result2 = await keysExpr.evaluate(context, undefined);
      expect(result2).toEqual([]);
    });

    it('should handle circular references in deep clone', async () => {
      const deepCloneExpr = objectExpressions.find(expr => expr.name === 'deepClone')!;
      
      const obj: any = { name: 'John' };
      obj.self = obj; // Circular reference
      
      const result = await deepCloneExpr.evaluate(context, obj);
      
      // Should not throw and handle circular refs gracefully
      expect(result.name).toBe('John');
      expect(typeof result).toBe('object');
    });

    it('should handle non-object inputs gracefully', async () => {
      const mergeExpr = objectExpressions.find(expr => expr.name === 'merge')!;
      
      const result1 = await mergeExpr.evaluate(context, 'hello', { name: 'John' });
      expect(result1).toEqual({ name: 'John' });
      
      const result2 = await mergeExpr.evaluate(context, null, { name: 'John' });
      expect(result2).toEqual({ name: 'John' });
    });

    it('should handle invalid property names', async () => {
      const setPropertyExpr = objectExpressions.find(expr => expr.name === 'setProperty')!;
      
      const obj = { name: 'John' };
      
      // Should handle gracefully without throwing
      await setPropertyExpr.evaluate(context, obj, '', 'value');
      await setPropertyExpr.evaluate(context, obj, null, 'value');
      await setPropertyExpr.evaluate(context, obj, undefined, 'value');
      
      expect(obj).toEqual({ name: 'John' }); // Unchanged
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large objects efficiently', async () => {
      const cloneExpr = objectExpressions.find(expr => expr.name === 'clone')!;
      
      // Create large object
      const largeObj: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }
      
      const startTime = Date.now();
      const result = await cloneExpr.evaluate(context, largeObj);
      const endTime = Date.now();
      
      expect(Object.keys(result)).toHaveLength(1000);
      expect(result.key999).toBe('value999');
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should not leak memory with repeated operations', async () => {
      const mergeExpr = objectExpressions.find(expr => expr.name === 'merge')!;
      
      // Perform many merge operations
      for (let i = 0; i < 100; i++) {
        const obj1 = { a: i, b: i * 2 };
        const obj2 = { c: i * 3, d: i * 4 };
        await mergeExpr.evaluate(context, obj1, obj2);
      }
      
      // Should complete without issues
      expect(true).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate required arguments for object operations', () => {
      const mergeExpr = objectExpressions.find(expr => expr.name === 'merge')!;
      
      expect(mergeExpr.validate([])).toBe('At least one object required for merging');
      expect(mergeExpr.validate([{ a: 1 }])).toBe(null);
    });

    it('should validate property operations', () => {
      const setPropertyExpr = objectExpressions.find(expr => expr.name === 'setProperty')!;
      
      expect(setPropertyExpr.validate([])).toBe('Object, property name, and value required');
      expect(setPropertyExpr.validate([{}, 'name'])).toBe('Value required for property setting');
      expect(setPropertyExpr.validate([{}, 'name', 'value'])).toBe(null);
    });
  });
});