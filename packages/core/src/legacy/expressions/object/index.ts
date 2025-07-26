/**
 * Object Operations Expressions
 * Comprehensive implementation of hyperscript object manipulation capabilities
 * Generated from LSP data with TDD implementation
 */

import { ExpressionImplementation, ExecutionContext } from '../../types/core';

/**
 * Object creation expression
 */
export class ObjectExpression implements ExpressionImplementation {
  name = 'object';
  category = 'Object';
  description = 'Creates an object from key-value pairs';

  async evaluate(context: ExecutionContext, ...args: any[]): Promise<any> {
    const result: any = {};
    
    // Process pairs of arguments as key-value pairs
    for (let i = 0; i < args.length; i += 2) {
      if (i + 1 < args.length) {
        const key = String(args[i]);
        const value = args[i + 1];
        result[key] = value;
      }
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length % 2 !== 0) {
      return 'Even number of arguments required for key-value pairs';
    }
    return null;
  }
}

/**
 * Object keys expression
 */
export class KeysExpression implements ExpressionImplementation {
  name = 'keys';
  category = 'Object';
  description = 'Returns array of object keys';

  async evaluate(context: ExecutionContext, obj: any): Promise<string[]> {
    if (!obj || typeof obj !== 'object') return [];
    return Object.keys(obj);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Object required to get keys';
    return null;
  }
}

/**
 * Object values expression
 */
export class ValuesExpression implements ExpressionImplementation {
  name = 'values';
  category = 'Object';
  description = 'Returns array of object values';

  async evaluate(context: ExecutionContext, obj: any): Promise<any[]> {
    if (!obj || typeof obj !== 'object') return [];
    return Object.values(obj);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Object required to get values';
    return null;
  }
}

/**
 * Object entries expression
 */
export class EntriesExpression implements ExpressionImplementation {
  name = 'entries';
  category = 'Object';
  description = 'Returns array of [key, value] pairs';

  async evaluate(context: ExecutionContext, obj: any): Promise<[string, any][]> {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Object required to get entries';
    return null;
  }
}

/**
 * Property access expressions
 */
export class HasPropertyExpression implements ExpressionImplementation {
  name = 'hasProperty';
  category = 'Object';
  description = 'Checks if object has a property';

  async evaluate(context: ExecutionContext, obj: any, property: string): Promise<boolean> {
    if (!obj || typeof obj !== 'object') return false;
    return Object.prototype.hasOwnProperty.call(obj, property);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and property name required';
    return null;
  }
}

export class GetPropertyExpression implements ExpressionImplementation {
  name = 'getProperty';
  category = 'Object';
  description = 'Gets property value from object';

  async evaluate(context: ExecutionContext, obj: any, property: string): Promise<any> {
    if (!obj || typeof obj !== 'object') return undefined;
    return obj[property];
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and property name required';
    return null;
  }
}

export class SetPropertyExpression implements ExpressionImplementation {
  name = 'setProperty';
  category = 'Object';
  description = 'Sets property value on object';

  async evaluate(context: ExecutionContext, obj: any, property: string, value: any): Promise<void> {
    if (!obj || typeof obj !== 'object') return;
    if (!property) return; // Skip empty/null property names
    
    obj[property] = value;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object, property name, and value required';
    if (args.length < 3) return 'Value required for property setting';
    return null;
  }
}

export class DeletePropertyExpression implements ExpressionImplementation {
  name = 'deleteProperty';
  category = 'Object';
  description = 'Deletes property from object';

  async evaluate(context: ExecutionContext, obj: any, property: string): Promise<boolean> {
    if (!obj || typeof obj !== 'object') return false;
    return delete obj[property];
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and property name required';
    return null;
  }
}

/**
 * Object transformation expressions
 */
export class MergeExpression implements ExpressionImplementation {
  name = 'merge';
  category = 'Object';
  description = 'Merges multiple objects into new object';

  async evaluate(context: ExecutionContext, ...objects: any[]): Promise<any> {
    const result: any = {};
    
    for (const obj of objects) {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        Object.assign(result, obj);
      }
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'At least one object required for merging';
    return null;
  }
}

export class PickExpression implements ExpressionImplementation {
  name = 'pick';
  category = 'Object';
  description = 'Creates object with only specified properties';

  async evaluate(context: ExecutionContext, obj: any, keys: string[]): Promise<any> {
    if (!obj || typeof obj !== 'object' || !Array.isArray(keys)) return {};
    
    const result: any = {};
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = obj[key];
      }
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and keys array required';
    return null;
  }
}

export class OmitExpression implements ExpressionImplementation {
  name = 'omit';
  category = 'Object';
  description = 'Creates object without specified properties';

  async evaluate(context: ExecutionContext, obj: any, keys: string[]): Promise<any> {
    if (!obj || typeof obj !== 'object' || !Array.isArray(keys)) return {};
    
    const result: any = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and keys array required';
    return null;
  }
}

export class CloneExpression implements ExpressionImplementation {
  name = 'clone';
  category = 'Object';
  description = 'Creates shallow copy of object';

  async evaluate(context: ExecutionContext, obj: any): Promise<any> {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return [...obj];
    return { ...obj };
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Object required for cloning';
    return null;
  }
}

export class DeepCloneExpression implements ExpressionImplementation {
  name = 'deepClone';
  category = 'Object';
  description = 'Creates deep copy of object';

  async evaluate(context: ExecutionContext, obj: any): Promise<any> {
    return this.deepCloneHelper(obj, new WeakMap());
  }

  private deepCloneHelper(obj: any, visited: WeakMap<object, any>): any {
    // Handle primitives
    if (obj === null || typeof obj !== 'object') return obj;
    
    // Handle circular references
    if (visited.has(obj)) return visited.get(obj);
    
    // Handle dates
    if (obj instanceof Date) return new Date(obj.getTime());
    
    // Handle arrays
    if (Array.isArray(obj)) {
      const arrClone: any[] = [];
      visited.set(obj, arrClone);
      for (let i = 0; i < obj.length; i++) {
        arrClone[i] = this.deepCloneHelper(obj[i], visited);
      }
      return arrClone;
    }
    
    // Handle objects
    const objClone: any = {};
    visited.set(obj, objClone);
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        objClone[key] = this.deepCloneHelper(obj[key], visited);
      }
    }
    
    return objClone;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Object required for deep cloning';
    return null;
  }
}

export class MapEntriesExpression implements ExpressionImplementation {
  name = 'mapEntries';
  category = 'Object';
  description = 'Maps object entries to new object';

  async evaluate(context: ExecutionContext, obj: any, mapperName: string): Promise<any> {
    if (!obj || typeof obj !== 'object') return {};
    
    const mapper = context.locals?.get(mapperName) || context.globals?.get(mapperName);
    if (!mapper || typeof mapper !== 'function') return obj;
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const [newKey, newValue] = mapper([key, value]);
      result[newKey] = newValue;
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and mapper function required';
    return null;
  }
}

export class FilterEntriesExpression implements ExpressionImplementation {
  name = 'filterEntries';
  category = 'Object';
  description = 'Filters object entries by predicate';

  async evaluate(context: ExecutionContext, obj: any, predicateName: string): Promise<any> {
    if (!obj || typeof obj !== 'object') return {};
    
    const predicate = context.locals?.get(predicateName) || context.globals?.get(predicateName);
    if (!predicate || typeof predicate !== 'function') return obj;
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (predicate([key, value])) {
        result[key] = value;
      }
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and predicate function required';
    return null;
  }
}

/**
 * Object testing expressions
 */
export class IsObjectExpression implements ExpressionImplementation {
  name = 'isObject';
  category = 'Object';
  description = 'Checks if value is a plain object';

  async evaluate(context: ExecutionContext, value: any): Promise<boolean> {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Value required to test if object';
    return null;
  }
}

export class IsEmptyExpression implements ExpressionImplementation {
  name = 'isEmpty';
  category = 'Object';
  description = 'Checks if object has no properties';

  async evaluate(context: ExecutionContext, obj: any): Promise<boolean> {
    if (obj === null || obj === undefined) return true;
    if (typeof obj !== 'object') return false;
    return Object.keys(obj).length === 0;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Object required for empty check';
    return null;
  }
}

export class SizeExpression implements ExpressionImplementation {
  name = 'size';
  category = 'Object';
  description = 'Returns number of properties in object';

  async evaluate(context: ExecutionContext, obj: any): Promise<number> {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.keys(obj).length;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Object required to get size';
    return null;
  }
}

export class EqualsExpression implements ExpressionImplementation {
  name = 'equals';
  category = 'Object';
  description = 'Deep equality comparison of objects';

  async evaluate(context: ExecutionContext, obj1: any, obj2: any): Promise<boolean> {
    return this.deepEquals(obj1, obj2);
  }

  private deepEquals(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (a === null || b === null || a === undefined || b === undefined) {
      return a === b;
    }
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a !== 'object') return a === b;
    
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEquals(a[key], b[key])) return false;
    }
    
    return true;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Two objects required for comparison';
    return null;
  }
}

/**
 * Path-based operations
 */
export class DestructureExpression implements ExpressionImplementation {
  name = 'destructure';
  category = 'Object';
  description = 'Destructures object properties into new object';

  async evaluate(context: ExecutionContext, obj: any, keys: string[]): Promise<any> {
    if (!obj || typeof obj !== 'object' || !Array.isArray(keys)) return {};
    
    const result: any = {};
    for (const key of keys) {
      result[key] = this.getNestedProperty(obj, key);
    }
    
    return result;
  }

  private getNestedProperty(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      
      // Handle array access like hobbies[0]
      if (key.includes('[') && key.includes(']')) {
        const [prop, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        current = current[prop];
        if (Array.isArray(current) && !isNaN(index)) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        current = current[key];
      }
    }
    
    return current;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and keys array required';
    return null;
  }
}

export class GetPathExpression implements ExpressionImplementation {
  name = 'getPath';
  category = 'Object';
  description = 'Gets nested property by dot notation path';

  async evaluate(context: ExecutionContext, obj: any, path: string): Promise<any> {
    if (!obj || typeof obj !== 'object' || !path) return undefined;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    
    return current;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and path required';
    return null;
  }
}

export class SetPathExpression implements ExpressionImplementation {
  name = 'setPath';
  category = 'Object';
  description = 'Sets nested property by dot notation path';

  async evaluate(context: ExecutionContext, obj: any, path: string, value: any): Promise<void> {
    if (!obj || typeof obj !== 'object' || !path) return;
    
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] === null || current[key] === undefined || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  validate(args: any[]): string | null {
    if (args.length < 3) return 'Object, path, and value required';
    return null;
  }
}

export class HasPathExpression implements ExpressionImplementation {
  name = 'hasPath';
  category = 'Object';
  description = 'Checks if nested property path exists';

  async evaluate(context: ExecutionContext, obj: any, path: string): Promise<boolean> {
    if (!obj || typeof obj !== 'object' || !path) return false;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(current, key)) return false;
      current = current[key];
    }
    
    return true;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and path required';
    return null;
  }
}

/**
 * JSON operations
 */
export class ToJsonExpression implements ExpressionImplementation {
  name = 'toJson';
  category = 'Object';
  description = 'Converts object to JSON string';

  async evaluate(context: ExecutionContext, obj: any, indent?: number): Promise<string> {
    try {
      return JSON.stringify(obj, null, indent);
    } catch (error) {
      return '{}';
    }
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Object required for JSON conversion';
    return null;
  }
}

export class FromJsonExpression implements ExpressionImplementation {
  name = 'fromJson';
  category = 'Object';
  description = 'Parses JSON string to object';

  async evaluate(context: ExecutionContext, jsonString: string): Promise<any> {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return null;
    }
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'JSON string required for parsing';
    return null;
  }
}

/**
 * Advanced object operations
 */
export class FromEntriesExpression implements ExpressionImplementation {
  name = 'fromEntries';
  category = 'Object';
  description = 'Creates object from array of [key, value] pairs';

  async evaluate(context: ExecutionContext, entries: [string, any][]): Promise<any> {
    if (!Array.isArray(entries)) return {};
    
    const result: any = {};
    for (const [key, value] of entries) {
      result[key] = value;
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Entries array required';
    return null;
  }
}

export class GroupByExpression implements ExpressionImplementation {
  name = 'groupBy';
  category = 'Object';
  description = 'Groups array elements by key function';

  async evaluate(context: ExecutionContext, array: any[], keyFnName: string): Promise<any> {
    if (!Array.isArray(array)) return {};
    
    const keyFn = context.locals?.get(keyFnName) || context.globals?.get(keyFnName);
    if (!keyFn || typeof keyFn !== 'function') return {};
    
    const result: any = {};
    for (const item of array) {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and key function required';
    return null;
  }
}

export class InvertExpression implements ExpressionImplementation {
  name = 'invert';
  category = 'Object';
  description = 'Inverts object keys and values';

  async evaluate(context: ExecutionContext, obj: any): Promise<any> {
    if (!obj || typeof obj !== 'object') return {};
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[String(value)] = key;
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Object required for inversion';
    return null;
  }
}

export class DefaultsExpression implements ExpressionImplementation {
  name = 'defaults';
  category = 'Object';
  description = 'Merges object with default values';

  async evaluate(context: ExecutionContext, obj: any, defaults: any): Promise<any> {
    if (!obj || typeof obj !== 'object') obj = {};
    if (!defaults || typeof defaults !== 'object') defaults = {};
    
    const result = { ...defaults, ...obj };
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Object and defaults required';
    return null;
  }
}

/**
 * Export all object expressions
 */
export const objectExpressions: ExpressionImplementation[] = [
  new ObjectExpression(),
  new KeysExpression(),
  new ValuesExpression(),
  new EntriesExpression(),
  new HasPropertyExpression(),
  new GetPropertyExpression(),
  new SetPropertyExpression(),
  new DeletePropertyExpression(),
  new MergeExpression(),
  new PickExpression(),
  new OmitExpression(),
  new CloneExpression(),
  new DeepCloneExpression(),
  new MapEntriesExpression(),
  new FilterEntriesExpression(),
  new IsObjectExpression(),
  new IsEmptyExpression(),
  new SizeExpression(),
  new EqualsExpression(),
  new DestructureExpression(),
  new GetPathExpression(),
  new SetPathExpression(),
  new HasPathExpression(),
  new ToJsonExpression(),
  new FromJsonExpression(),
  new FromEntriesExpression(),
  new GroupByExpression(),
  new InvertExpression(),
  new DefaultsExpression(),
];

export default objectExpressions;