/**
 * Expression Type Registry Tests
 *
 * Tests for the centralized expression type system inspired by napi-rs patterns.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExpressionTypeRegistry,
  expressionTypeRegistry,
  inferExpressionType,
  coerceToType,
  canCoerceToType,
  getHyperScriptTypeName,
  coerceToString,
  coerceToNumber,
  coerceToBoolean,
  coerceToArray,
  coerceToElement,
  coerceToElementList,
} from './type-registry';

describe('ExpressionTypeRegistry', () => {
  let registry: ExpressionTypeRegistry;

  beforeEach(() => {
    registry = new ExpressionTypeRegistry();
  });

  describe('type inference', () => {
    it('should infer String type', () => {
      expect(registry.inferType('hello')).toBe('String');
      expect(registry.inferType('')).toBe('String');
    });

    it('should infer Number type', () => {
      expect(registry.inferType(42)).toBe('Number');
      expect(registry.inferType(3.14)).toBe('Number');
      expect(registry.inferType(0)).toBe('Number');
      expect(registry.inferType(-1)).toBe('Number');
    });

    it('should infer Boolean type', () => {
      expect(registry.inferType(true)).toBe('Boolean');
      expect(registry.inferType(false)).toBe('Boolean');
    });

    it('should infer Null type', () => {
      expect(registry.inferType(null)).toBe('Null');
    });

    it('should infer Undefined type', () => {
      expect(registry.inferType(undefined)).toBe('Undefined');
    });

    it('should infer Array type', () => {
      expect(registry.inferType([])).toBe('Array');
      expect(registry.inferType([1, 2, 3])).toBe('Array');
    });

    it('should infer Object type', () => {
      expect(registry.inferType({})).toBe('Object');
      expect(registry.inferType({ key: 'value' })).toBe('Object');
    });

    it('should infer Function type', () => {
      expect(registry.inferType(() => {})).toBe('Function');
      expect(registry.inferType(function () {})).toBe('Function');
    });
  });

  describe('type coercion', () => {
    describe('to String', () => {
      it('should coerce number to string', () => {
        expect(registry.coerce(42, 'String')).toBe('42');
        expect(registry.coerce(3.14, 'String')).toBe('3.14');
      });

      it('should coerce boolean to string', () => {
        expect(registry.coerce(true, 'String')).toBe('true');
        expect(registry.coerce(false, 'String')).toBe('false');
      });

      it('should coerce null/undefined to empty string', () => {
        expect(registry.coerce(null, 'String')).toBe('');
        expect(registry.coerce(undefined, 'String')).toBe('');
      });

      it('should coerce array to comma-separated string', () => {
        expect(registry.coerce([1, 2, 3], 'String')).toBe('1, 2, 3');
        expect(registry.coerce(['a', 'b'], 'String')).toBe('a, b');
      });

      it('should coerce object to JSON string', () => {
        expect(registry.coerce({ a: 1 }, 'String')).toBe('{"a":1}');
      });
    });

    describe('to Number', () => {
      it('should coerce numeric string to number', () => {
        expect(registry.coerce('42', 'Number')).toBe(42);
        expect(registry.coerce('3.14', 'Number')).toBe(3.14);
        expect(registry.coerce('-1', 'Number')).toBe(-1);
      });

      it('should coerce boolean to number', () => {
        expect(registry.coerce(true, 'Number')).toBe(1);
        expect(registry.coerce(false, 'Number')).toBe(0);
      });

      it('should return null for non-numeric string', () => {
        expect(registry.coerce('hello', 'Number')).toBeNull();
      });

      it('should coerce null to 0', () => {
        expect(registry.coerce(null, 'Number')).toBe(0);
      });
    });

    describe('to Boolean', () => {
      it('should coerce truthy strings to true', () => {
        expect(registry.coerce('true', 'Boolean')).toBe(true);
        expect(registry.coerce('yes', 'Boolean')).toBe(true);
        expect(registry.coerce('1', 'Boolean')).toBe(true);
        expect(registry.coerce('non-empty', 'Boolean')).toBe(true);
      });

      it('should coerce falsy strings to false', () => {
        expect(registry.coerce('false', 'Boolean')).toBe(false);
        expect(registry.coerce('no', 'Boolean')).toBe(false);
        expect(registry.coerce('0', 'Boolean')).toBe(false);
        expect(registry.coerce('', 'Boolean')).toBe(false);
      });

      it('should coerce numbers to boolean', () => {
        expect(registry.coerce(1, 'Boolean')).toBe(true);
        expect(registry.coerce(0, 'Boolean')).toBe(false);
        expect(registry.coerce(-1, 'Boolean')).toBe(true);
      });

      it('should coerce null/undefined to false', () => {
        expect(registry.coerce(null, 'Boolean')).toBe(false);
        expect(registry.coerce(undefined, 'Boolean')).toBe(false);
      });

      it('should coerce arrays to boolean based on length', () => {
        expect(registry.coerce([1, 2, 3], 'Boolean')).toBe(true);
        expect(registry.coerce([], 'Boolean')).toBe(false);
      });
    });

    describe('to Array', () => {
      it('should coerce comma-separated string to array', () => {
        expect(registry.coerce('a,b,c', 'Array')).toEqual(['a', 'b', 'c']);
        expect(registry.coerce('1, 2, 3', 'Array')).toEqual(['1', '2', '3']);
      });

      it('should coerce JSON array string to array', () => {
        expect(registry.coerce('[1, 2, 3]', 'Array')).toEqual([1, 2, 3]);
        expect(registry.coerce('["a", "b"]', 'Array')).toEqual(['a', 'b']);
      });

      it('should coerce object values to array', () => {
        expect(registry.coerce({ a: 1, b: 2 }, 'Array')).toEqual([1, 2]);
      });
    });

    describe('to Object', () => {
      it('should coerce JSON object string to object', () => {
        expect(registry.coerce('{"a":1}', 'Object')).toEqual({ a: 1 });
      });

      it('should coerce array to indexed object', () => {
        expect(registry.coerce(['a', 'b'], 'Object')).toEqual({ '0': 'a', '1': 'b' });
      });

      it('should return null for non-object JSON', () => {
        expect(registry.coerce('[1,2,3]', 'Object')).toBeNull();
        expect(registry.coerce('invalid json', 'Object')).toBeNull();
      });
    });
  });

  describe('canCoerce', () => {
    it('should return true for same type', () => {
      expect(registry.canCoerce('hello', 'String')).toBe(true);
      expect(registry.canCoerce(42, 'Number')).toBe(true);
    });

    it('should return true for defined coercion paths', () => {
      expect(registry.canCoerce(42, 'String')).toBe(true);
      expect(registry.canCoerce('42', 'Number')).toBe(true);
      expect(registry.canCoerce([1, 2], 'Boolean')).toBe(true);
    });

    it('should return false for unknown target types', () => {
      expect(registry.canCoerce('hello', 'UnknownType')).toBe(false);
    });
  });

  describe('getHyperScriptType', () => {
    it('should return hyperscript type names', () => {
      expect(registry.getHyperScriptType('hello')).toBe('string');
      expect(registry.getHyperScriptType(42)).toBe('number');
      expect(registry.getHyperScriptType(true)).toBe('boolean');
      expect(registry.getHyperScriptType(null)).toBe('null');
      expect(registry.getHyperScriptType([])).toBe('array');
      expect(registry.getHyperScriptType({})).toBe('object');
    });
  });

  describe('custom type registration', () => {
    it('should allow registering custom types', () => {
      registry.register({
        name: 'CustomType',
        hyperscriptType: 'object',
        tsType: 'CustomType',
        isType: (v): v is { custom: true } =>
          typeof v === 'object' && v !== null && 'custom' in v && v.custom === true,
        defaultValue: null,
        description: 'A custom type for testing',
      });

      // Custom type is registered and retrievable
      expect(registry.has('CustomType')).toBe(true);
      const customDef = registry.get('CustomType');
      expect(customDef).toBeDefined();
      expect(customDef?.name).toBe('CustomType');

      // Custom type's isType function works correctly
      expect(customDef?.isType({ custom: true })).toBe(true);
      expect(customDef?.isType({ custom: false })).toBe(false);

      // Note: inferType iterates in registration order, so built-in types
      // (registered first) may match before custom types. This is expected.
      // For custom types to take priority, they should be registered before
      // conflicting built-in types, or use a priority system.
    });
  });

  describe('stats', () => {
    it('should return registry statistics', () => {
      const stats = registry.getStats();
      expect(stats.typeCount).toBeGreaterThan(10); // Built-in types
      expect(stats.cacheSize).toBe(0);
      expect(stats.typeNames).toContain('String');
      expect(stats.typeNames).toContain('Number');
      expect(stats.typeNames).toContain('Boolean');
    });
  });
});

describe('Utility Functions', () => {
  describe('inferExpressionType', () => {
    it('should use default registry', () => {
      expect(inferExpressionType('hello')).toBe('String');
      expect(inferExpressionType(42)).toBe('Number');
    });
  });

  describe('coerceToType', () => {
    it('should use default registry', () => {
      expect(coerceToType(42, 'String')).toBe('42');
      expect(coerceToType('42', 'Number')).toBe(42);
    });
  });

  describe('canCoerceToType', () => {
    it('should use default registry', () => {
      expect(canCoerceToType(42, 'String')).toBe(true);
      expect(canCoerceToType('hello', 'Number')).toBe(true);
    });
  });

  describe('getHyperScriptTypeName', () => {
    it('should use default registry', () => {
      expect(getHyperScriptTypeName('hello')).toBe('string');
      expect(getHyperScriptTypeName(42)).toBe('number');
    });
  });

  describe('typed coercion helpers', () => {
    it('coerceToString should return string', () => {
      expect(coerceToString(42)).toBe('42');
      expect(coerceToString(null)).toBe('');
    });

    it('coerceToNumber should return number or null', () => {
      expect(coerceToNumber('42')).toBe(42);
      expect(coerceToNumber('hello')).toBeNull();
    });

    it('coerceToBoolean should return boolean', () => {
      expect(coerceToBoolean(1)).toBe(true);
      expect(coerceToBoolean(0)).toBe(false);
      expect(coerceToBoolean(null)).toBe(false);
    });

    it('coerceToArray should return array', () => {
      expect(coerceToArray('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(coerceToArray(null)).toEqual([]);
    });
  });
});
