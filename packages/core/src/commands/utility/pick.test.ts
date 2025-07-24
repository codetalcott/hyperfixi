/**
 * Pick Command Tests
 * Test array/string slicing and regex matching operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../../test-setup.js';
import { PickCommand } from './pick.js';
import type { ExecutionContext } from '../../types/core.js';

describe('Pick Command', () => {
  let pickCommand: PickCommand;
  let context: ExecutionContext;

  beforeEach(() => {
    pickCommand = new PickCommand();
    context = {
      locals: new Map(),
    };
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(pickCommand.name).toBe('pick');
      expect(pickCommand.isBlocking).toBe(false);
      expect(typeof pickCommand.syntax).toBe('string');
      expect(typeof pickCommand.description).toBe('string');
    });
  });

  describe('Array Slicing', () => {
    const testArray = [10, 11, 12, 13, 14, 15, 16];

    it('should pick items from an array with range', async () => {
      const result = await pickCommand.execute(context, 'items', 1, 'to', 3, 'from', testArray);
      
      expect(result).toEqual([11, 12]);
    });

    it('should pick a single item from an array', async () => {
      const result = await pickCommand.execute(context, 'item', 2, 'from', testArray);
      
      expect(result).toEqual([12]);
    });

    it('should handle "end" keyword', async () => {
      const result = await pickCommand.execute(context, 'item', 4, 'to', 'end', 'from', testArray);
      
      expect(result).toEqual([14, 15, 16]);
    });

    it('should handle "start" keyword', async () => {
      const result = await pickCommand.execute(context, 'items', 'start', 'to', 3, 'from', testArray);
      
      expect(result).toEqual([10, 11, 12]);
    });

    it('should handle negative indices', async () => {
      const result = await pickCommand.execute(context, 'items', 0, 'to', -4, 'from', testArray);
      
      expect(result).toEqual([10, 11, 12]);
    });

    it('should handle single item with "items" keyword', async () => {
      const result = await pickCommand.execute(context, 'items', 2, 'from', testArray);
      
      expect(result).toEqual([12]);
    });

    it('should handle out of bounds indices gracefully', async () => {
      const result = await pickCommand.execute(context, 'items', 5, 'to', 10, 'from', testArray);
      
      expect(result).toEqual([15, 16]);
    });

    it('should handle empty range', async () => {
      const result = await pickCommand.execute(context, 'items', 3, 'to', 3, 'from', testArray);
      
      expect(result).toEqual([]);
    });
  });

  describe('String Slicing', () => {
    const testString = "abcdefghijklmnopqrstuvwxyz";

    it('should pick characters from a string with range', async () => {
      const result = await pickCommand.execute(context, 'items', 1, 'to', 3, 'from', testString);
      
      expect(result).toBe('bc');
    });

    it('should pick a single character from a string', async () => {
      const result = await pickCommand.execute(context, 'item', 2, 'from', testString);
      
      expect(result).toBe('c');
    });

    it('should handle "end" keyword with strings', async () => {
      const result = await pickCommand.execute(context, 'item', 4, 'to', 'end', 'from', testString);
      
      expect(result).toBe('efghijklmnopqrstuvwxyz');
    });

    it('should handle "start" keyword with strings', async () => {
      const result = await pickCommand.execute(context, 'items', 'start', 'to', 3, 'from', testString);
      
      expect(result).toBe('abc');
    });

    it('should handle negative indices with strings', async () => {
      const result = await pickCommand.execute(context, 'items', 0, 'to', -4, 'from', testString);
      
      expect(result).toBe('abcdefghijklmnopqrstuv');
    });

    it('should handle single character with "items" keyword', async () => {
      const result = await pickCommand.execute(context, 'items', 2, 'from', testString);
      
      expect(result).toBe('c');
    });

    it('should handle out of bounds indices gracefully', async () => {
      const result = await pickCommand.execute(context, 'items', 20, 'to', 30, 'from', testString);
      
      expect(result).toBe('uvwxyz');
    });
  });

  describe('Regex Matching', () => {
    const haystack = "The 32 quick brown foxes jumped 12 times over the 149 lazy dogs";

    it('should pick a single regex match', async () => {
      const result = await pickCommand.execute(context, 'match', 'of', '\\d+', 'from', haystack);
      
      expect(Array.from(result as Iterable<string>)).toEqual(['32']);
    });

    it('should pick all regex matches', async () => {
      const result = await pickCommand.execute(context, 'matches', 'of', '\\d+', 'from', haystack);
      
      expect(Array.from(result as Iterable<Iterable<string>>).map(match => Array.from(match))).toEqual([['32'], ['12'], ['149']]);
    });

    it('should pick regex match with flags', async () => {
      const result = await pickCommand.execute(context, 'match', 'of', 't.e', '|', 'i', 'from', haystack);
      
      expect(Array.from(result as Iterable<string>)).toEqual(['The']);
    });

    it('should handle no regex matches', async () => {
      const result = await pickCommand.execute(context, 'match', 'of', 'xyz123', 'from', haystack);
      
      expect(result).toBeNull();
    });

    it('should handle regex with multiple groups', async () => {
      const result = await pickCommand.execute(context, 'match', 'of', '(\\d+)\\s+(\\w+)', 'from', haystack);
      
      const matchArray = Array.from(result as Iterable<string>);
      expect(matchArray[0]).toBe('32 quick'); // Full match
      expect(matchArray[1]).toBe('32'); // First group
      expect(matchArray[2]).toBe('quick'); // Second group
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid syntax', async () => {
      await expect(pickCommand.execute(context, 'invalid', 'more', 'args'))
        .rejects.toThrow('Invalid pick command syntax');
    });

    it('should throw error for missing "from" keyword', async () => {
      await expect(pickCommand.execute(context, 'items', 1, 'to', 3, 'missing', [1, 2, 3]))
        .rejects.toThrow('Pick command requires "from" keyword');
    });

    it('should throw error for invalid source type', async () => {
      await expect(pickCommand.execute(context, 'items', 1, 'to', 3, 'from', 123))
        .rejects.toThrow('Pick source must be array, string, or iterable');
    });

    it('should throw error for invalid range', async () => {
      await expect(pickCommand.execute(context, 'items', 'invalid', 'to', 3, 'from', [1, 2, 3]))
        .rejects.toThrow('Pick indices must be numbers, "start", or "end"');
    });
  });

  describe('Variable Sources', () => {
    it('should pick from variable in context', async () => {
      context.locals?.set('testArray', [1, 2, 3, 4, 5]);
      
      // Simulate resolving variable reference
      const testArray = context.locals.get('testArray');
      const result = await pickCommand.execute(context, 'items', 1, 'to', 3, 'from', testArray);
      
      expect(result).toEqual([2, 3]);
    });

    it('should pick from string variable', async () => {
      context.locals?.set('testString', 'hello world');
      
      const testString = context.locals.get('testString');
      const result = await pickCommand.execute(context, 'items', 0, 'to', 5, 'from', testString);
      
      expect(result).toBe('hello');
    });
  });

  describe('Validation', () => {
    it('should validate correct array syntax', () => {
      expect(pickCommand.validate(['items', 1, 'to', 3, 'from', [1, 2, 3]])).toBeNull();
      expect(pickCommand.validate(['item', 2, 'from', [1, 2, 3]])).toBeNull();
    });

    it('should validate correct regex syntax', () => {
      expect(pickCommand.validate(['match', 'of', 'pattern', 'from', 'string'])).toBeNull();
      expect(pickCommand.validate(['matches', 'of', 'pattern', 'from', 'string'])).toBeNull();
    });

    it('should reject invalid syntax', () => {
      expect(pickCommand.validate([])).toContain('requires at least');
      expect(pickCommand.validate(['invalid', 'more', 'args'])).toContain('Invalid pick command syntax');
      expect(pickCommand.validate(['items', 1, 'invalid', 3, 'from', []])).toContain('Expected "from" keyword');
    });
  });
});