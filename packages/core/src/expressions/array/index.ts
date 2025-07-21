/**
 * Array Operations Expressions
 * Comprehensive implementation of hyperscript array manipulation capabilities
 * Generated from LSP data with TDD implementation
 */

import { ExpressionImplementation, ExecutionContext } from '../../types/core';

/**
 * Array creation expression
 */
export class ArrayExpression implements ExpressionImplementation {
  name = 'array';
  category = 'Array';
  description = 'Creates an array from provided arguments';

  async evaluate(context: ExecutionContext, ...elements: any[]): Promise<any[]> {
    return [...elements];
  }

  validate(args: any[]): string | null {
    return null; // Arrays can be empty
  }
}

/**
 * Array length expression
 */
export class LengthExpression implements ExpressionImplementation {
  name = 'length';
  category = 'Array';
  description = 'Returns the length of an array or string';

  async evaluate(context: ExecutionContext, arrayLike: any): Promise<number> {
    if (Array.isArray(arrayLike)) {
      return arrayLike.length;
    }
    if (typeof arrayLike === 'string') {
      return arrayLike.length;
    }
    if (arrayLike && typeof arrayLike.length === 'number') {
      return arrayLike.length;
    }
    return 0;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array or string required for length';
    return null;
  }
}

/**
 * Array push expression
 */
export class PushExpression implements ExpressionImplementation {
  name = 'push';
  category = 'Array';
  description = 'Adds elements to the end of an array';

  async evaluate(context: ExecutionContext, array: any[], ...elements: any[]): Promise<number> {
    if (!Array.isArray(array)) return 0;
    return array.push(...elements);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and at least one element required';
    return null;
  }
}

/**
 * Array pop expression
 */
export class PopExpression implements ExpressionImplementation {
  name = 'pop';
  category = 'Array';
  description = 'Removes and returns the last element of an array';

  async evaluate(context: ExecutionContext, array: any[]): Promise<any> {
    if (!Array.isArray(array)) return undefined;
    return array.pop();
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array required for pop operation';
    return null;
  }
}

/**
 * Array shift expression
 */
export class ShiftExpression implements ExpressionImplementation {
  name = 'shift';
  category = 'Array';
  description = 'Removes and returns the first element of an array';

  async evaluate(context: ExecutionContext, array: any[]): Promise<any> {
    if (!Array.isArray(array)) return undefined;
    return array.shift();
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array required for shift operation';
    return null;
  }
}

/**
 * Array unshift expression
 */
export class UnshiftExpression implements ExpressionImplementation {
  name = 'unshift';
  category = 'Array';
  description = 'Adds elements to the beginning of an array';

  async evaluate(context: ExecutionContext, array: any[], ...elements: any[]): Promise<number> {
    if (!Array.isArray(array)) return 0;
    return array.unshift(...elements);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and at least one element required';
    return null;
  }
}

/**
 * Array at expression
 */
export class AtExpression implements ExpressionImplementation {
  name = 'at';
  category = 'Array';
  description = 'Returns element at specified index (supports negative indices)';

  async evaluate(context: ExecutionContext, array: any[], index: any): Promise<any> {
    if (!Array.isArray(array)) return undefined;
    
    const idx = parseInt(String(index));
    if (isNaN(idx)) return undefined;
    
    return array.at(idx);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and index required';
    return null;
  }
}

/**
 * Array slice expression
 */
export class SliceExpression implements ExpressionImplementation {
  name = 'slice';
  category = 'Array';
  description = 'Returns a shallow copy of a portion of an array';

  async evaluate(context: ExecutionContext, array: any[], start?: number, end?: number): Promise<any[]> {
    if (!Array.isArray(array)) return [];
    return array.slice(start, end);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array required for slicing';
    return null;
  }
}

/**
 * Array splice expression
 */
export class SpliceExpression implements ExpressionImplementation {
  name = 'splice';
  category = 'Array';
  description = 'Changes array contents by removing/adding elements';

  async evaluate(context: ExecutionContext, array: any[], start: number, deleteCount?: number, ...items: any[]): Promise<any[]> {
    if (!Array.isArray(array)) return [];
    return array.splice(start, deleteCount, ...items);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and start index required';
    return null;
  }
}

/**
 * Array first expression
 */
export class FirstExpression implements ExpressionImplementation {
  name = 'first';
  category = 'Array';
  description = 'Returns the first element of an array';

  async evaluate(context: ExecutionContext, array: any[]): Promise<any> {
    if (!Array.isArray(array) || array.length === 0) return undefined;
    return array[0];
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array required';
    return null;
  }
}

/**
 * Array last expression
 */
export class LastExpression implements ExpressionImplementation {
  name = 'last';
  category = 'Array';
  description = 'Returns the last element of an array';

  async evaluate(context: ExecutionContext, array: any[]): Promise<any> {
    if (!Array.isArray(array) || array.length === 0) return undefined;
    return array[array.length - 1];
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array required';
    return null;
  }
}

/**
 * Array functional methods
 */
export class MapExpression implements ExpressionImplementation {
  name = 'map';
  category = 'Array';
  description = 'Creates new array with results of calling function on every element';

  async evaluate(context: ExecutionContext, arrayLike: any, callbackName: string): Promise<any[]> {
    const array = this.ensureArray(arrayLike);
    const callback = this.getCallback(context, callbackName);
    
    if (!callback) {
      // If no callback function found, return the converted array
      return array;
    }
    
    return array.map(callback);
  }

  private ensureArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [...value];
    if (value && typeof value.length === 'number') return Array.from(value);
    return [];
  }

  private getCallback(context: ExecutionContext, name: string): Function | null {
    return context.locals?.get(name) || context.globals?.get(name) || null;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array and callback function required';
    if (args.length === 1) return 'Callback function required';
    return null;
  }
}

export class FilterExpression implements ExpressionImplementation {
  name = 'filter';
  category = 'Array';
  description = 'Creates new array with all elements that pass the test';

  async evaluate(context: ExecutionContext, arrayLike: any, callbackName: string): Promise<any[]> {
    const array = this.ensureArray(arrayLike);
    const callback = this.getCallback(context, callbackName);
    
    if (!callback) return [];
    
    return array.filter(callback);
  }

  private ensureArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [...value];
    if (value && typeof value.length === 'number') return Array.from(value);
    return [];
  }

  private getCallback(context: ExecutionContext, name: string): Function | null {
    return context.locals?.get(name) || context.globals?.get(name) || null;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array and callback function required';
    if (args.length === 1) return 'Callback function required';
    return null;
  }
}

export class ReduceExpression implements ExpressionImplementation {
  name = 'reduce';
  category = 'Array';
  description = 'Reduces array to single value using reducer function';

  async evaluate(context: ExecutionContext, array: any[], callbackName: string, initialValue?: any): Promise<any> {
    if (!Array.isArray(array)) return initialValue;
    
    const callback = context.locals?.get(callbackName) || context.globals?.get(callbackName);
    if (!callback) return initialValue;
    
    if (initialValue !== undefined) {
      return array.reduce(callback, initialValue);
    } else {
      return array.reduce(callback);
    }
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and callback function required';
    return null;
  }
}

export class FindExpression implements ExpressionImplementation {
  name = 'find';
  category = 'Array';
  description = 'Returns first element that satisfies testing function';

  async evaluate(context: ExecutionContext, array: any[], callbackName: string): Promise<any> {
    if (!Array.isArray(array)) return undefined;
    
    const callback = context.locals?.get(callbackName) || context.globals?.get(callbackName);
    if (!callback) return undefined;
    
    return array.find(callback);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and callback function required';
    return null;
  }
}

export class FindIndexExpression implements ExpressionImplementation {
  name = 'findIndex';
  category = 'Array';
  description = 'Returns index of first element that satisfies testing function';

  async evaluate(context: ExecutionContext, array: any[], callbackName: string): Promise<number> {
    if (!Array.isArray(array)) return -1;
    
    const callback = context.locals?.get(callbackName) || context.globals?.get(callbackName);
    if (!callback) return -1;
    
    return array.findIndex(callback);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and callback function required';
    return null;
  }
}

export class SomeExpression implements ExpressionImplementation {
  name = 'some';
  category = 'Array';
  description = 'Tests whether at least one element passes the test';

  async evaluate(context: ExecutionContext, array: any[], callbackName: string): Promise<boolean> {
    if (!Array.isArray(array)) return false;
    
    const callback = context.locals?.get(callbackName) || context.globals?.get(callbackName);
    if (!callback) return false;
    
    return array.some(callback);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and callback function required';
    return null;
  }
}

export class EveryExpression implements ExpressionImplementation {
  name = 'every';
  category = 'Array';
  description = 'Tests whether all elements pass the test';

  async evaluate(context: ExecutionContext, array: any[], callbackName: string): Promise<boolean> {
    if (!Array.isArray(array)) return true; // Vacuous truth
    
    const callback = context.locals?.get(callbackName) || context.globals?.get(callbackName);
    if (!callback) return true;
    
    return array.every(callback);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and callback function required';
    return null;
  }
}

export class ForEachExpression implements ExpressionImplementation {
  name = 'forEach';
  category = 'Array';
  description = 'Executes function for each array element';

  async evaluate(context: ExecutionContext, array: any[], callbackName: string): Promise<void> {
    if (!Array.isArray(array)) return;
    
    const callback = context.locals?.get(callbackName) || context.globals?.get(callbackName);
    if (!callback) return;
    
    array.forEach(callback);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and callback function required';
    return null;
  }
}

/**
 * Array search expressions
 */
export class IncludesExpression implements ExpressionImplementation {
  name = 'includes';
  category = 'Array';
  description = 'Determines whether array includes certain element';

  async evaluate(context: ExecutionContext, array: any[], searchElement: any, fromIndex?: number): Promise<boolean> {
    if (!Array.isArray(array)) return false;
    return array.includes(searchElement, fromIndex);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and search element required';
    return null;
  }
}

export class IndexOfExpression implements ExpressionImplementation {
  name = 'indexOf';
  category = 'Array';
  description = 'Returns first index at which element can be found';

  async evaluate(context: ExecutionContext, array: any[], searchElement: any, fromIndex?: number): Promise<number> {
    if (!Array.isArray(array)) return -1;
    return array.indexOf(searchElement, fromIndex);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and search element required';
    return null;
  }
}

export class LastIndexOfExpression implements ExpressionImplementation {
  name = 'lastIndexOf';
  category = 'Array';
  description = 'Returns last index at which element can be found';

  async evaluate(context: ExecutionContext, array: any[], searchElement: any, fromIndex?: number): Promise<number> {
    if (!Array.isArray(array)) return -1;
    
    if (fromIndex !== undefined) {
      return array.lastIndexOf(searchElement, fromIndex);
    }
    return array.lastIndexOf(searchElement);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and search element required';
    return null;
  }
}

export class IsArrayExpression implements ExpressionImplementation {
  name = 'isArray';
  category = 'Array';
  description = 'Determines whether value is an array';

  async evaluate(context: ExecutionContext, value: any): Promise<boolean> {
    return Array.isArray(value);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Value required to test if array';
    return null;
  }
}

/**
 * Array transformation expressions
 */
export class JoinExpression implements ExpressionImplementation {
  name = 'join';
  category = 'Array';
  description = 'Joins all elements into a string';

  async evaluate(context: ExecutionContext, array: any[], separator: string = ','): Promise<string> {
    if (!Array.isArray(array)) return '';
    return array.join(separator);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array required for joining';
    return null;
  }
}

export class ReverseExpression implements ExpressionImplementation {
  name = 'reverse';
  category = 'Array';
  description = 'Reverses array in place';

  async evaluate(context: ExecutionContext, array: any[]): Promise<any[]> {
    if (!Array.isArray(array)) return [];
    return array.reverse();
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array required for reversal';
    return null;
  }
}

export class SortExpression implements ExpressionImplementation {
  name = 'sort';
  category = 'Array';
  description = 'Sorts array elements';

  async evaluate(context: ExecutionContext, array: any[], compareFnName?: string): Promise<any[]> {
    if (!Array.isArray(array)) return [];
    
    if (compareFnName) {
      const compareFn = context.locals?.get(compareFnName) || context.globals?.get(compareFnName);
      if (compareFn) {
        return array.sort(compareFn);
      }
    }
    
    return array.sort();
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array required for sorting';
    return null;
  }
}

export class ConcatExpression implements ExpressionImplementation {
  name = 'concat';
  category = 'Array';
  description = 'Merges arrays into new array';

  async evaluate(context: ExecutionContext, ...arrays: any[]): Promise<any[]> {
    const result: any[] = [];
    
    for (const arr of arrays) {
      if (Array.isArray(arr)) {
        result.push(...arr);
      } else {
        result.push(arr);
      }
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'At least one array required for concatenation';
    return null;
  }
}

export class FlatExpression implements ExpressionImplementation {
  name = 'flat';
  category = 'Array';
  description = 'Flattens nested arrays to specified depth';

  async evaluate(context: ExecutionContext, array: any[], depth: number = 1): Promise<any[]> {
    if (!Array.isArray(array)) return [];
    return array.flat(depth);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array required for flattening';
    return null;
  }
}

export class FlatMapExpression implements ExpressionImplementation {
  name = 'flatMap';
  category = 'Array';
  description = 'Maps each element then flattens result';

  async evaluate(context: ExecutionContext, array: any[], callbackName: string): Promise<any[]> {
    if (!Array.isArray(array)) return [];
    
    const callback = context.locals?.get(callbackName) || context.globals?.get(callbackName);
    if (!callback) return [];
    
    return array.flatMap(callback);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and callback function required';
    return null;
  }
}

/**
 * Array generation expressions
 */
export class RangeExpression implements ExpressionImplementation {
  name = 'range';
  category = 'Array';
  description = 'Creates array of numbers in specified range';

  async evaluate(context: ExecutionContext, startOrLength: number, end?: number, step: number = 1): Promise<number[]> {
    let start: number, length: number;
    
    if (end === undefined) {
      // Single argument - create range from 0 to n-1
      start = 0;
      length = startOrLength;
    } else {
      // Two or three arguments - create range from start to end-1
      start = startOrLength;
      length = end - start;
    }
    
    const result: number[] = [];
    for (let i = 0; i < length; i += step) {
      result.push(start + i);
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Range parameters required';
    return null;
  }
}

export class FillExpression implements ExpressionImplementation {
  name = 'fill';
  category = 'Array';
  description = 'Fills array with static value';

  async evaluate(context: ExecutionContext, array: any[], value: any, start?: number, end?: number): Promise<any[]> {
    if (!Array.isArray(array)) return [];
    return array.fill(value, start, end);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and fill value required';
    return null;
  }
}

export class FromExpression implements ExpressionImplementation {
  name = 'from';
  category = 'Array';
  description = 'Creates array from iterable object';

  async evaluate(context: ExecutionContext, arrayLike: any, mapFnName?: string): Promise<any[]> {
    try {
      if (mapFnName) {
        const mapFn = context.locals?.get(mapFnName) || context.globals?.get(mapFnName);
        if (mapFn) {
          return Array.from(arrayLike, mapFn);
        }
      }
      
      return Array.from(arrayLike);
    } catch (error) {
      return [];
    }
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Iterable object required';
    return null;
  }
}

/**
 * Advanced array operations
 */
export class DestructureExpression implements ExpressionImplementation {
  name = 'destructure';
  category = 'Array';
  description = 'Destructures array into named variables';

  async evaluate(context: ExecutionContext, array: any[], names: string[]): Promise<any> {
    if (!Array.isArray(array) || !Array.isArray(names)) return {};
    
    const result: any = {};
    
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (name === 'rest' && i === names.length - 1) {
        // Rest parameter - collect remaining elements
        result[name] = array.slice(i);
      } else {
        result[name] = array[i];
      }
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and names array required';
    return null;
  }
}

export class ChunkExpression implements ExpressionImplementation {
  name = 'chunk';
  category = 'Array';
  description = 'Splits array into chunks of specified size';

  async evaluate(context: ExecutionContext, array: any[], size: number): Promise<any[][]> {
    if (!Array.isArray(array) || size <= 0) return [];
    
    const chunks: any[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    
    return chunks;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and chunk size required';
    return null;
  }
}

export class UniqueExpression implements ExpressionImplementation {
  name = 'unique';
  category = 'Array';
  description = 'Returns array with duplicate values removed';

  async evaluate(context: ExecutionContext, array: any[]): Promise<any[]> {
    if (!Array.isArray(array)) return [];
    return [...new Set(array)];
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Array required for unique operation';
    return null;
  }
}

export class PartitionExpression implements ExpressionImplementation {
  name = 'partition';
  category = 'Array';
  description = 'Partitions array into two arrays based on predicate';

  async evaluate(context: ExecutionContext, array: any[], predicateName: string): Promise<[any[], any[]]> {
    if (!Array.isArray(array)) return [[], []];
    
    const predicate = context.locals?.get(predicateName) || context.globals?.get(predicateName);
    if (!predicate) return [[], []];
    
    const truthy: any[] = [];
    const falsy: any[] = [];
    
    for (const item of array) {
      if (predicate(item)) {
        truthy.push(item);
      } else {
        falsy.push(item);
      }
    }
    
    return [truthy, falsy];
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Array and predicate function required';
    return null;
  }
}

export class ZipExpression implements ExpressionImplementation {
  name = 'zip';
  category = 'Array';
  description = 'Zips multiple arrays together';

  async evaluate(context: ExecutionContext, ...arrays: any[]): Promise<any[][]> {
    if (arrays.length === 0) return [];
    
    const validArrays = arrays.filter(Array.isArray);
    if (validArrays.length === 0) return [];
    
    const minLength = Math.min(...validArrays.map(arr => arr.length));
    const result: any[][] = [];
    
    for (let i = 0; i < minLength; i++) {
      result.push(validArrays.map(arr => arr[i]));
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'At least one array required for zipping';
    return null;
  }
}

/**
 * Export all array expressions
 */
export const arrayExpressions: ExpressionImplementation[] = [
  new ArrayExpression(),
  new LengthExpression(),
  new PushExpression(),
  new PopExpression(),
  new ShiftExpression(),
  new UnshiftExpression(),
  new AtExpression(),
  new SliceExpression(),
  new SpliceExpression(),
  new FirstExpression(),
  new LastExpression(),
  new MapExpression(),
  new FilterExpression(),
  new ReduceExpression(),
  new FindExpression(),
  new FindIndexExpression(),
  new SomeExpression(),
  new EveryExpression(),
  new ForEachExpression(),
  new IncludesExpression(),
  new IndexOfExpression(),
  new LastIndexOfExpression(),
  new IsArrayExpression(),
  new JoinExpression(),
  new ReverseExpression(),
  new SortExpression(),
  new ConcatExpression(),
  new FlatExpression(),
  new FlatMapExpression(),
  new RangeExpression(),
  new FillExpression(),
  new FromExpression(),
  new DestructureExpression(),
  new ChunkExpression(),
  new UniqueExpression(),
  new PartitionExpression(),
  new ZipExpression(),
];

export default arrayExpressions;