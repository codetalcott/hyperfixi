/**
 * TDD Fix for Dot Notation Property Access
 * 
 * Current issue: me.className throws "Unexpected token: . at position 1"
 * Expected: Should access properties using standard JavaScript dot notation
 */

import { describe, it, expect } from 'vitest';
import { parseAndEvaluateExpression } from './expression-parser';
import type { ExecutionContext } from '../types/core';

describe('Dot Notation Property Access - TDD Fix', () => {
  describe('Basic Dot Notation', () => {
    it('should handle simple property access: obj.prop', async () => {
      const context = {
        me: null,
        you: null,
        it: null,
        result: null,
        locals: new Map([['obj', { prop: 'value' }]]),
        globals: new Map(),
        parent: null,
        halted: false,
        returned: false,
        broke: false,
        continued: false,
        async: false
      };

      const result = await parseAndEvaluateExpression('obj.prop', context);
      expect(result).toBe('value');
    });

    it('should handle me.property access', async () => {
      const mockElement = { 
        className: 'test-class',
        tagName: 'DIV',
        textContent: 'test content'
      };

      const context = {
        me: mockElement,
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

      const result = await parseAndEvaluateExpression('me.className', context);
      expect(result).toBe('test-class');
    });

    it('should handle chained property access: obj.nested.prop', async () => {
      const context = {
        me: null,
        you: null,
        it: null,
        result: null,
        locals: new Map([['obj', { nested: { prop: 'deep-value' } }]]),
        globals: new Map(),
        parent: null,
        halted: false,
        returned: false,
        broke: false,
        continued: false,
        async: false
      };

      const result = await parseAndEvaluateExpression('obj.nested.prop', context);
      expect(result).toBe('deep-value');
    });
  });

  describe('Mixed Property Access', () => {
    it('should handle dot notation with possessive: my.prop vs my prop', async () => {
      const mockData = { prop: 'dot-value', otherProp: 'possessive-value' };

      const context = {
        me: mockData,
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

      // Test dot notation
      const dotResult = await parseAndEvaluateExpression('me.prop', context);
      expect(dotResult).toBe('dot-value');

      // Test possessive should still work
      const possessiveResult = await parseAndEvaluateExpression('my otherProp', context);
      expect(possessiveResult).toBe('possessive-value');
    });
  });

  describe('Edge Cases', () => {
    it('should handle property access on literals', async () => {
      const context = {
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

      // Test string length property
      const result = await parseAndEvaluateExpression('"hello".length', context);
      expect(result).toBe(5);
    });

    it('should handle property access with null/undefined gracefully', async () => {
      const context = {
        me: null,
        you: null,
        it: null,
        result: null,
        locals: new Map([['nullObj', null]]),
        globals: new Map(),
        parent: null,
        halted: false,
        returned: false,
        broke: false,
        continued: false,
        async: false
      };

      // Should throw error for null property access
      await expect(parseAndEvaluateExpression('nullObj.prop', context))
        .rejects
        .toThrow(/null|undefined/i);
    });
  });

  describe('Current Behavior Documentation', () => {
    it('documents dot notation now working correctly', async () => {
      const context = {
        me: { className: 'test' },
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

      // Fixed: dot notation now works correctly
      const result = await parseAndEvaluateExpression('me.className', context);
      expect(result).toBe('test');
    });
  });
});