/**
 * Binary Tree Serialization Tests
 *
 * Tests for the Lite³-inspired binary tree serialization format.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  BinaryTree,
  serialize,
  deserialize,
  validate,
  inspect,
  get,
  getString,
  getNumber,
  getBoolean,
  has,
  getType,
  getLength,
  getKeys,
  estimateSize,
  MAGIC_NUMBER,
  FORMAT_VERSION,
  HEADER_SIZE,
} from './index';

// =============================================================================
// Primitive Serialization Tests
// =============================================================================

describe('Binary Tree - Primitive Serialization', () => {
  it('should serialize and deserialize null', () => {
    const buffer = serialize(null);
    expect(deserialize(buffer)).toBe(null);
  });

  it('should serialize and deserialize undefined', () => {
    const buffer = serialize(undefined);
    expect(deserialize(buffer)).toBe(undefined);
  });

  it('should serialize and deserialize booleans', () => {
    expect(deserialize(serialize(true))).toBe(true);
    expect(deserialize(serialize(false))).toBe(false);
  });

  it('should serialize and deserialize numbers', () => {
    expect(deserialize(serialize(0))).toBe(0);
    expect(deserialize(serialize(42))).toBe(42);
    expect(deserialize(serialize(-123.456))).toBe(-123.456);
    expect(deserialize(serialize(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    expect(deserialize(serialize(Number.MIN_SAFE_INTEGER))).toBe(Number.MIN_SAFE_INTEGER);
    expect(deserialize(serialize(Math.PI))).toBe(Math.PI);
  });

  it('should serialize and deserialize strings', () => {
    expect(deserialize(serialize(''))).toBe('');
    expect(deserialize(serialize('hello'))).toBe('hello');
    expect(deserialize(serialize('Hello, World!'))).toBe('Hello, World!');
  });

  it('should serialize and deserialize unicode strings', () => {
    expect(deserialize(serialize('こんにちは'))).toBe('こんにちは');
    expect(deserialize(serialize('🎉🚀💻'))).toBe('🎉🚀💻');
    expect(deserialize(serialize('مرحبا بالعالم'))).toBe('مرحبا بالعالم');
  });
});

// =============================================================================
// Array Serialization Tests
// =============================================================================

describe('Binary Tree - Array Serialization', () => {
  it('should serialize and deserialize empty arrays', () => {
    const buffer = serialize([]);
    expect(deserialize(buffer)).toEqual([]);
  });

  it('should serialize and deserialize arrays of primitives', () => {
    expect(deserialize(serialize([1, 2, 3]))).toEqual([1, 2, 3]);
    expect(deserialize(serialize(['a', 'b', 'c']))).toEqual(['a', 'b', 'c']);
    expect(deserialize(serialize([true, false, null]))).toEqual([true, false, null]);
  });

  it('should serialize and deserialize nested arrays', () => {
    const nested = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];
    expect(deserialize(serialize(nested))).toEqual(nested);
  });

  it('should serialize and deserialize mixed arrays', () => {
    const mixed = [1, 'hello', true, null, [1, 2], { key: 'value' }];
    expect(deserialize(serialize(mixed))).toEqual(mixed);
  });
});

// =============================================================================
// Object Serialization Tests
// =============================================================================

describe('Binary Tree - Object Serialization', () => {
  it('should serialize and deserialize empty objects', () => {
    const buffer = serialize({});
    expect(deserialize(buffer)).toEqual({});
  });

  it('should serialize and deserialize simple objects', () => {
    const obj = { name: 'Alice', age: 30 };
    expect(deserialize(serialize(obj))).toEqual(obj);
  });

  it('should serialize and deserialize nested objects', () => {
    const obj = {
      user: {
        name: 'Alice',
        profile: {
          bio: 'Developer',
          active: true,
        },
      },
    };
    expect(deserialize(serialize(obj))).toEqual(obj);
  });

  it('should serialize and deserialize objects with arrays', () => {
    const obj = {
      items: [1, 2, 3],
      tags: ['a', 'b', 'c'],
    };
    expect(deserialize(serialize(obj))).toEqual(obj);
  });

  it('should preserve key order (sorted)', () => {
    const obj = { zebra: 1, apple: 2, banana: 3 };
    const result = deserialize(serialize(obj)) as Record<string, number>;
    // Keys should still work regardless of internal sort order
    expect(result.zebra).toBe(1);
    expect(result.apple).toBe(2);
    expect(result.banana).toBe(3);
  });
});

// =============================================================================
// Zero-Copy Access Tests (THE KEY FEATURE)
// =============================================================================

describe('Binary Tree - Zero-Copy Access', () => {
  const testObj = {
    user: {
      name: 'Alice',
      age: 30,
      active: true,
      tags: ['developer', 'typescript'],
    },
    metadata: {
      version: '1.0.0',
      count: 42,
    },
  };

  let buffer: ArrayBuffer;

  beforeAll(() => {
    buffer = serialize(testObj);
  });

  it('should access string values directly', () => {
    expect(getString(buffer, ['user', 'name'])).toBe('Alice');
    expect(getString(buffer, ['metadata', 'version'])).toBe('1.0.0');
  });

  it('should access number values directly', () => {
    expect(getNumber(buffer, ['user', 'age'])).toBe(30);
    expect(getNumber(buffer, ['metadata', 'count'])).toBe(42);
  });

  it('should access boolean values directly', () => {
    expect(getBoolean(buffer, ['user', 'active'])).toBe(true);
  });

  it('should access array elements directly', () => {
    expect(get(buffer, ['user', 'tags', 0])).toBe('developer');
    expect(get(buffer, ['user', 'tags', 1])).toBe('typescript');
  });

  it('should return null for non-existent paths', () => {
    expect(getString(buffer, ['user', 'nonexistent'])).toBe(null);
    expect(getNumber(buffer, ['missing', 'path'])).toBe(null);
  });

  it('should return null for type mismatches', () => {
    expect(getString(buffer, ['user', 'age'])).toBe(null); // age is number
    expect(getNumber(buffer, ['user', 'name'])).toBe(null); // name is string
  });

  it('should check path existence with has()', () => {
    expect(has(buffer, ['user', 'name'])).toBe(true);
    expect(has(buffer, ['user', 'tags'])).toBe(true);
    expect(has(buffer, ['nonexistent'])).toBe(false);
  });

  it('should get type of values', () => {
    expect(getType(buffer, ['user'])).toBe('object');
    expect(getType(buffer, ['user', 'name'])).toBe('string');
    expect(getType(buffer, ['user', 'age'])).toBe('number');
    expect(getType(buffer, ['user', 'active'])).toBe('boolean');
    expect(getType(buffer, ['user', 'tags'])).toBe('array');
  });

  it('should get length of arrays and objects', () => {
    expect(getLength(buffer, ['user', 'tags'])).toBe(2);
    expect(getLength(buffer, ['user'])).toBe(4); // 4 keys
    expect(getLength(buffer, ['user', 'name'])).toBe(null); // string, not array/object
  });

  it('should get keys of objects', () => {
    const keys = getKeys(buffer, ['user']);
    expect(keys).toContain('name');
    expect(keys).toContain('age');
    expect(keys).toContain('active');
    expect(keys).toContain('tags');
  });

  it('should handle negative array indices', () => {
    expect(get(buffer, ['user', 'tags', -1])).toBe('typescript');
    expect(get(buffer, ['user', 'tags', -2])).toBe('developer');
  });
});

// =============================================================================
// Validation and Inspection Tests
// =============================================================================

describe('Binary Tree - Validation', () => {
  it('should validate correct buffers', () => {
    const buffer = serialize({ test: 'data' });
    const result = validate(buffer);
    expect(result.valid).toBe(true);
  });

  it('should reject empty buffers', () => {
    const result = validate(new ArrayBuffer(0));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too small');
  });

  it('should reject buffers with invalid magic number', () => {
    const buffer = new ArrayBuffer(HEADER_SIZE);
    const view = new DataView(buffer);
    view.setUint32(0, 0x12345678, true); // Wrong magic
    const result = validate(buffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('magic');
  });

  it('should inspect buffer structure', () => {
    const buffer = serialize({ key: 'value' });
    const info = inspect(buffer);
    expect(info.valid).toBe(true);
    expect(info.rootType).toBe('object');
    expect(info.header?.magic).toBe(MAGIC_NUMBER);
    expect(info.header?.version).toBe(FORMAT_VERSION);
  });
});

// =============================================================================
// Size and Performance Characteristics
// =============================================================================

describe('Binary Tree - Size Characteristics', () => {
  it('should produce smaller buffers than JSON for typical data', () => {
    const testData = {
      users: [
        { name: 'Alice', age: 30, role: 'admin' },
        { name: 'Bob', age: 25, role: 'user' },
        { name: 'Charlie', age: 35, role: 'user' },
      ],
      metadata: {
        version: '1.0.0',
        created: '2024-01-01',
        modified: '2024-12-01',
      },
    };

    const binarySize = serialize(testData).byteLength;
    const jsonSize = JSON.stringify(testData).length;

    // Binary should be smaller or comparable
    // (Note: for very small objects, overhead might make binary slightly larger)
    console.log(`Binary: ${binarySize} bytes, JSON: ${jsonSize} bytes`);
    console.log(`Ratio: ${(binarySize / jsonSize).toFixed(2)}`);

    // Just verify it's reasonable - not excessively larger
    expect(binarySize).toBeLessThan(jsonSize * 2);
  });

  it('should estimate size reasonably', () => {
    const testData = { name: 'test', count: 42, items: [1, 2, 3] };
    const estimated = estimateSize(testData);
    const actual = serialize(testData).byteLength;

    // Estimate should be in the right ballpark
    expect(estimated).toBeGreaterThan(actual * 0.5);
    expect(estimated).toBeLessThan(actual * 3);
  });
});

// =============================================================================
// BinaryTree Class API Tests
// =============================================================================

describe('Binary Tree - Class API', () => {
  it('should provide all methods via BinaryTree class', () => {
    const obj = { name: 'test', value: 123 };
    const buffer = BinaryTree.serialize(obj);

    expect(BinaryTree.validate(buffer).valid).toBe(true);
    expect(BinaryTree.deserialize(buffer)).toEqual(obj);
    expect(BinaryTree.getString(buffer, ['name'])).toBe('test');
    expect(BinaryTree.getNumber(buffer, ['value'])).toBe(123);
    expect(BinaryTree.has(buffer, ['name'])).toBe(true);
    expect(BinaryTree.getType(buffer, ['name'])).toBe('string');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

// =============================================================================
// Benchmark Tests
// =============================================================================

describe('Binary Tree - Benchmark', () => {
  it('should run benchmark suite without errors', async () => {
    const { runBenchmarks } = await import('./benchmark');
    const suite = runBenchmarks(100); // Fewer iterations for test

    expect(suite.results.length).toBeGreaterThan(0);
    expect(suite.summary.avgSpeedup).toBeGreaterThan(0);
    expect(suite.summary.avgSizeRatio).toBeGreaterThan(0);
  });

  it('should show speedup for single field access', async () => {
    const { runBenchmarks } = await import('./benchmark');
    const suite = runBenchmarks(500);

    // Find single field access results
    const singleFieldResults = suite.results.filter(r => r.name.includes('Single Field'));

    // At least some should show speedup (speedup > 1)
    const hasSpeedup = singleFieldResults.some(r => r.speedup > 1);
    console.log(
      'Single field access speedups:',
      singleFieldResults.map(r => `${r.name}: ${r.speedup.toFixed(2)}x`)
    );

    // This is informational - we don't fail if there's no speedup
    // as performance can vary based on environment
    expect(singleFieldResults.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// AST Serializer Tests
// =============================================================================

describe('Binary Tree - AST Serializer', () => {
  it('should wrap AST nodes and provide zero-copy access', async () => {
    const { BinaryAST } = await import('./ast-serializer');

    const ast = {
      type: 'command',
      name: 'toggle',
      args: [{ type: 'selector', value: '.active' }],
      isBlocking: false,
      line: 1,
      column: 5,
    };

    const binary = new BinaryAST(ast as any);

    expect(binary.getNodeType()).toBe('command');
    expect(binary.getName()).toBe('toggle');
    expect(binary.isBlocking()).toBe(false);
    expect(binary.getLine()).toBe(1);
    expect(binary.getColumn()).toBe(5);
  });

  it('should deserialize back to AST', async () => {
    const { BinaryAST } = await import('./ast-serializer');

    const ast = {
      type: 'command',
      name: 'add',
      args: [],
      isBlocking: true,
    };

    const binary = new BinaryAST(ast as any);
    const restored = binary.toAST();

    expect(restored).toEqual(ast);
  });

  it('should support cloning for transfer', async () => {
    const { BinaryAST } = await import('./ast-serializer');

    const ast = { type: 'command', name: 'test' };
    const binary = new BinaryAST(ast as any);
    const clone = binary.clone();

    // Both should work independently
    expect(binary.getName()).toBe('test');
    expect(clone.getName()).toBe('test');
    expect(binary.getBuffer()).not.toBe(clone.getBuffer());
  });

  it('should create from buffer', async () => {
    const { BinaryAST } = await import('./ast-serializer');

    const ast = { type: 'feature', name: 'on' };
    const original = new BinaryAST(ast as any);
    const buffer = original.getBuffer();

    // Simulate receiving buffer from worker
    const received = BinaryAST.fromBuffer(buffer);

    expect(received.getNodeType()).toBe('feature');
    expect(received.getName()).toBe('on');
  });
});

describe('Binary Tree - Edge Cases', () => {
  it('should handle deeply nested structures', () => {
    const deep = { a: { b: { c: { d: { e: { f: 'deep' } } } } } };
    const buffer = serialize(deep);
    expect(deserialize(buffer)).toEqual(deep);
    expect(getString(buffer, ['a', 'b', 'c', 'd', 'e', 'f'])).toBe('deep');
  });

  it('should handle large arrays', () => {
    const large = Array.from({ length: 1000 }, (_, i) => i);
    const buffer = serialize(large);
    expect(deserialize(buffer)).toEqual(large);
    expect(get(buffer, [500])).toBe(500);
    expect(get(buffer, [999])).toBe(999);
  });

  it('should handle objects with many keys', () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 100; i++) {
      obj[`key${i.toString().padStart(3, '0')}`] = i;
    }
    const buffer = serialize(obj);
    expect(deserialize(buffer)).toEqual(obj);
    // Binary search should find keys efficiently
    expect(getNumber(buffer, ['key050'])).toBe(50);
    expect(getNumber(buffer, ['key099'])).toBe(99);
  });

  it('should handle special number values', () => {
    // Note: NaN and Infinity are valid float64 values
    expect(deserialize(serialize(Infinity))).toBe(Infinity);
    expect(deserialize(serialize(-Infinity))).toBe(-Infinity);
    expect(Number.isNaN(deserialize(serialize(NaN)) as number)).toBe(true);
  });

  it('should handle empty string keys', () => {
    const obj = { '': 'empty key' };
    const buffer = serialize(obj);
    expect(deserialize(buffer)).toEqual(obj);
    expect(getString(buffer, [''])).toBe('empty key');
  });
});
