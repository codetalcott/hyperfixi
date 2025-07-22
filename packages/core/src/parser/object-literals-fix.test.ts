/**
 * TDD Fix for Object Literal Expressions
 * 
 * Current issue: Object literals {} and {key: value} not being parsed properly
 * Expected: Support for empty objects, simple key-value pairs, and string keys
 */

import { describe, it, expect } from 'vitest';
import { parseAndEvaluateExpression } from './expression-parser.js';
import type { ExecutionContext } from '../types/core.js';

const context: ExecutionContext = {
  me: null,
  you: null,
  it: null,
  result: null,
  locals: new Map(),
  globals: new Map(),
  parent: null,
  halted: false,
  returned: false,
  broke: false,
  continued: false,
  async: false
};

describe('Object Literal - TDD Fix', () => {
  describe('Basic Object Literals', () => {
    it('should handle empty object: {}', async () => {
      const result = await parseAndEvaluateExpression('{}', context);
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(false);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle simple object with identifier keys: {x: 1, y: 2}', async () => {
      const result = await parseAndEvaluateExpression('{x: 1, y: 2}', context);
      expect(typeof result).toBe('object');
      expect(result.x).toBe(1);
      expect(result.y).toBe(2);
    });

    it('should handle object with string keys: {"name": "John", "age": 30}', async () => {
      const result = await parseAndEvaluateExpression('{"name": "John", "age": 30}', context);
      expect(typeof result).toBe('object');
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
    });

    it('should handle mixed key types: {id: 1, "name": "test", active: true}', async () => {
      const result = await parseAndEvaluateExpression('{id: 1, "name": "test", active: true}', context);
      expect(result.id).toBe(1);
      expect(result.name).toBe('test');
      expect(result.active).toBe(true);
    });
  });

  describe('Object Values and Expressions', () => {
    it('should handle complex values: {a: [1, 2, 3], b: {nested: true}}', async () => {
      const result = await parseAndEvaluateExpression('{a: [1, 2, 3], b: {nested: true}}', context);
      expect(Array.isArray(result.a)).toBe(true);
      expect(result.a).toEqual([1, 2, 3]);
      expect(typeof result.b).toBe('object');
      expect(result.b.nested).toBe(true);
    });

    it('should handle computed values: {sum: 2 + 3, text: "Hello" + " World"}', async () => {
      const result = await parseAndEvaluateExpression('{sum: 2 + 3, text: "Hello" + " World"}', context);
      expect(result.sum).toBe(5);
      expect(result.text).toBe('Hello World');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single property: {test: 42}', async () => {
      const result = await parseAndEvaluateExpression('{test: 42}', context);
      expect(result.test).toBe(42);
    });

    it('should handle boolean values: {active: true, disabled: false}', async () => {
      const result = await parseAndEvaluateExpression('{active: true, disabled: false}', context);
      expect(result.active).toBe(true);
      expect(result.disabled).toBe(false);
    });

    it('should handle null values: {value: null}', async () => {
      const result = await parseAndEvaluateExpression('{value: null}', context);
      expect(result.value).toBeNull();
    });
  });

  describe('Object Literal Success Verification', () => {
    it('confirms object literals are now working correctly', async () => {
      // Fixed! Now works properly
      const result = await parseAndEvaluateExpression('{}', context);
      expect(typeof result).toBe('object');
      expect(Object.keys(result)).toHaveLength(0);
    });
  });
});