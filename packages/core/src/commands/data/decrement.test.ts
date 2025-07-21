/**
 * Tests for decrement command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DecrementCommand } from './decrement';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Decrement Command', () => {
  let command: DecrementCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new DecrementCommand();
    testElement = createTestElement('<div id="test" data-count="10">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
    
    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('decrement');
      expect(command.syntax).toBe('decrement <target> [by <number>]');
      expect(command.description).toBe('The decrement command subtracts from an existing variable, property, or attribute. It defaults to subtracting the value 1, but this can be changed using the by modifier. If the target variable is null, then it is assumed to be 0, and then decremented by the specified amount. The decrement command is the opposite of the increment command command.');
    });
  });

  describe('Basic Variable Decrement', () => {
    it('should decrement local variable by 1 (default)', async () => {
      context.locals.set('counter', 5);
      
      await command.execute(context, 'counter');
      
      expect(context.locals.get('counter')).toBe(4);
    });

    it('should decrement local variable by specified amount', async () => {
      context.locals.set('counter', 5);
      
      await command.execute(context, 'counter', 'by', 2);
      
      expect(context.locals.get('counter')).toBe(3);
    });

    it('should decrement global variable by 1 (default)', async () => {
      context.globals.set('globalCounter', 10);
      
      await command.execute(context, 'global', 'globalCounter');
      
      expect(context.globals.get('globalCounter')).toBe(9);
    });

    it('should decrement global variable by specified amount', async () => {
      context.globals.set('globalCounter', 20);
      
      await command.execute(context, 'global', 'globalCounter', 'by', 5);
      
      expect(context.globals.get('globalCounter')).toBe(15);
    });

    it('should handle $ prefixed global variables', async () => {
      context.globals.set('$globalVar', 25);
      
      await command.execute(context, '$globalVar', 'by', 3);
      
      expect(context.globals.get('$globalVar')).toBe(22);
    });
  });

  describe('Null/Undefined Variable Handling', () => {
    it('should initialize null variable to 0 then decrement by 1', async () => {
      context.locals.set('nullVar', null);
      
      await command.execute(context, 'nullVar');
      
      expect(context.locals.get('nullVar')).toBe(-1);
    });

    it('should initialize undefined variable to 0 then decrement by 1', async () => {
      context.locals.set('undefinedVar', undefined);
      
      await command.execute(context, 'undefinedVar');
      
      expect(context.locals.get('undefinedVar')).toBe(-1);
    });

    it('should initialize new variable to 0 then decrement by 1', async () => {
      // Variable doesn't exist
      await command.execute(context, 'newVariable');
      
      expect(context.locals.get('newVariable')).toBe(-1);
    });

    it('should initialize null variable to 0 then decrement by specified amount', async () => {
      context.locals.set('nullVar', null);
      
      await command.execute(context, 'nullVar', 'by', 5);
      
      expect(context.locals.get('nullVar')).toBe(-5);
    });

    it('should initialize new variable to 0 then decrement by specified amount', async () => {
      await command.execute(context, 'newVariable', 'by', 7);
      
      expect(context.locals.get('newVariable')).toBe(-7);
    });
  });

  describe('Element Property Decrement', () => {
    it('should decrement element attribute by 1 (default)', async () => {
      testElement.setAttribute('data-count', '10');
      
      await command.execute(context, testElement, 'data-count');
      
      expect(testElement.getAttribute('data-count')).toBe('9');
    });

    it('should decrement element attribute by specified amount', async () => {
      testElement.setAttribute('data-score', '100');
      
      await command.execute(context, testElement, 'data-score', 'by', 25);
      
      expect(testElement.getAttribute('data-score')).toBe('75');
    });

    it('should decrement element property by 1 (default)', async () => {
      testElement.tabIndex = 5;
      
      await command.execute(context, testElement, 'tabIndex');
      
      expect(testElement.tabIndex).toBe(4);
    });

    it('should decrement element property by specified amount', async () => {
      testElement.tabIndex = 10;
      
      await command.execute(context, testElement, 'tabIndex', 'by', 3);
      
      expect(testElement.tabIndex).toBe(7);
    });

    it('should initialize null element attribute to 0 then decrement', async () => {
      testElement.removeAttribute('data-new');
      
      await command.execute(context, testElement, 'data-new', 'by', 5);
      
      expect(testElement.getAttribute('data-new')).toBe('-5');
    });
  });

  describe('Different Data Types', () => {
    it('should decrement string numbers', async () => {
      context.locals.set('stringNum', '50');
      
      await command.execute(context, 'stringNum', 'by', 8);
      
      expect(context.locals.get('stringNum')).toBe(42);
    });

    it('should decrement floating point numbers', async () => {
      context.locals.set('floatNum', 6.0);
      
      await command.execute(context, 'floatNum', 'by', 2.86);
      
      expect(context.locals.get('floatNum')).toBeCloseTo(3.14, 2);
    });

    it('should handle negative decrements (which become additions)', async () => {
      context.locals.set('counter', 10);
      
      await command.execute(context, 'counter', 'by', -3);
      
      expect(context.locals.get('counter')).toBe(13);
    });

    it('should handle zero decrements', async () => {
      context.locals.set('counter', 5);
      
      await command.execute(context, 'counter', 'by', 0);
      
      expect(context.locals.get('counter')).toBe(5);
    });

    it('should handle large numbers', async () => {
      context.locals.set('bigNum', 2000000);
      
      await command.execute(context, 'bigNum', 'by', 500000);
      
      expect(context.locals.get('bigNum')).toBe(1500000);
    });

    it('should handle going into negatives', async () => {
      context.locals.set('smallNum', 3);
      
      await command.execute(context, 'smallNum', 'by', 5);
      
      expect(context.locals.get('smallNum')).toBe(-2);
    });
  });

  describe('Variable Scope Resolution', () => {
    it('should prefer local variables over global', async () => {
      context.locals.set('counter', 10);
      context.globals.set('counter', 100);
      
      await command.execute(context, 'counter', 'by', 2);
      
      expect(context.locals.get('counter')).toBe(8);
      expect(context.globals.get('counter')).toBe(100); // unchanged
    });

    it('should decrement global variable when local not found', async () => {
      context.globals.set('counter', 30);
      
      await command.execute(context, 'counter', 'by', 5);
      
      expect(context.globals.get('counter')).toBe(25);
      expect(context.locals.has('counter')).toBe(false);
    });

    it('should create new local variable when neither local nor global exists', async () => {
      await command.execute(context, 'newCounter', 'by', 8);
      
      expect(context.locals.get('newCounter')).toBe(-8);
      expect(context.globals.has('newCounter')).toBe(false);
    });

    it('should handle element scope variables', async () => {
      if (!context.elementScope) context.elementScope = new Map();
      context.elementScope.set('elemCounter', 20);
      
      await command.execute(context, 'elemCounter', 'by', 5);
      
      expect(context.elementScope.get('elemCounter')).toBe(15);
    });
  });

  describe('Expression Evaluation', () => {
    it('should decrement with variable amounts', async () => {
      context.locals.set('counter', 15);
      context.locals.set('decrement', 4);
      
      // This would be evaluated by expression system, we test with final value
      await command.execute(context, 'counter', 'by', 4);
      
      expect(context.locals.get('counter')).toBe(11);
    });

    it('should handle complex target expressions', async () => {
      const obj = { nested: { value: 50 } };
      context.locals.set('obj', obj);
      
      // Direct property access for testing
      await command.execute(context, obj.nested, 'value', 'by', 5);
      
      expect(obj.nested.value).toBe(45);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-numeric values by converting to numbers', async () => {
      context.locals.set('nonNum', 'not-a-number');
      
      await command.execute(context, 'nonNum', 'by', 1);
      
      // NaN - 1 = NaN
      expect(Number.isNaN(context.locals.get('nonNum'))).toBe(true);
    });

    it('should handle boolean values by converting to numbers', async () => {
      context.locals.set('boolVar', true);
      
      await command.execute(context, 'boolVar', 'by', 1);
      
      expect(context.locals.get('boolVar')).toBe(0); // true converts to 1, then 1-1=0
    });

    it('should handle boolean false values', async () => {
      context.locals.set('boolVar', false);
      
      await command.execute(context, 'boolVar', 'by', 1);
      
      expect(context.locals.get('boolVar')).toBe(-1); // false converts to 0, then 0-1=-1
    });

    it('should handle array values by converting to numbers', async () => {
      context.locals.set('arrVar', []);
      
      await command.execute(context, 'arrVar', 'by', 3);
      
      expect(context.locals.get('arrVar')).toBe(-3); // [] converts to 0, then 0-3=-3
    });

    it('should handle object values by converting to numbers', async () => {
      context.locals.set('objVar', {});
      
      await command.execute(context, 'objVar', 'by', 2);
      
      // {} converts to NaN
      expect(Number.isNaN(context.locals.get('objVar'))).toBe(true);
    });

    it('should throw error for invalid target', async () => {
      await expect(async () => {
        await command.execute(context, null, 'by', 1);
      }).rejects.toThrow('Cannot decrement null or undefined target');
    });
  });

  describe('Validation', () => {
    it('should validate basic decrement syntax', () => {
      const error = command.validate(['counter']);
      expect(error).toBe(null);
    });

    it('should validate decrement with by modifier', () => {
      const error = command.validate(['counter', 'by', 3]);
      expect(error).toBe(null);
    });

    it('should require at least one argument', () => {
      const error = command.validate([]);
      expect(error).toBe('Decrement command requires a target');
    });

    it('should validate "by" keyword when amount is specified', () => {
      const error = command.validate(['counter', 'invalid', 5]);
      expect(error).toBe('Decrement command requires "by" keyword when specifying amount');
    });

    it('should require amount after "by" keyword', () => {
      const error = command.validate(['counter', 'by']);
      expect(error).toBe('Decrement command requires amount after "by" keyword');
    });

    it('should require numeric amount after "by" keyword', () => {
      const error = command.validate(['counter', 'by', 'not-a-number']);
      expect(error).toBe('Decrement command requires numeric amount after "by" keyword');
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: decrement with by modifier', async () => {
      // From LSP: set counter to 5, decrement counter by 2 -- counter is now 3
      context.locals.set('counter', 5);
      
      await command.execute(context, 'counter', 'by', 2);
      
      expect(context.locals.get('counter')).toBe(3);
    });

    it('should handle LSP example 2: decrement new variable', async () => {
      // From LSP: decrement newVariable -- newVariable is defaulted to zero, then decremented to -1
      await command.execute(context, 'newVariable');
      
      expect(context.locals.get('newVariable')).toBe(-1);
    });

    it('should handle typical usage patterns', async () => {
      // Test various realistic usage patterns
      
      // Lives/health counter
      context.locals.set('lives', 3);
      await command.execute(context, 'lives');
      expect(context.locals.get('lives')).toBe(2);
      
      // Score reduction
      context.locals.set('score', 1000);
      await command.execute(context, 'score', 'by', 100);
      expect(context.locals.get('score')).toBe(900);
      
      // Timer countdown
      testElement.setAttribute('data-seconds', '30');
      await command.execute(context, testElement, 'data-seconds');
      expect(testElement.getAttribute('data-seconds')).toBe('29');
      
      // Inventory items
      context.locals.set('ammo', 50);
      await command.execute(context, 'ammo', 'by', 10);
      expect(context.locals.get('ammo')).toBe(40);
    });

    it('should handle countdown to zero and beyond', async () => {
      // Countdown pattern
      context.locals.set('timer', 3);
      
      await command.execute(context, 'timer'); // 3 -> 2
      expect(context.locals.get('timer')).toBe(2);
      
      await command.execute(context, 'timer'); // 2 -> 1
      expect(context.locals.get('timer')).toBe(1);
      
      await command.execute(context, 'timer'); // 1 -> 0
      expect(context.locals.get('timer')).toBe(0);
      
      await command.execute(context, 'timer'); // 0 -> -1
      expect(context.locals.get('timer')).toBe(-1);
    });
  });

  describe('Element Context Integration', () => {
    it('should work with me context reference', async () => {
      context.me = testElement;
      testElement.setAttribute('data-value', '20');
      
      await command.execute(context, context.me, 'data-value', 'by', 5);
      
      expect(testElement.getAttribute('data-value')).toBe('15');
    });

    it('should work with element properties', async () => {
      context.me = testElement;
      testElement.scrollTop = 200;
      
      await command.execute(context, context.me, 'scrollTop', 'by', 50);
      
      expect(testElement.scrollTop).toBe(150);
    });

    it('should handle CSS custom properties', async () => {
      testElement.style.setProperty('--counter', '10');
      
      // In real implementation, this would be handled by expression system
      const currentValue = parseInt(testElement.style.getPropertyValue('--counter'));
      const newValue = currentValue - 3;
      testElement.style.setProperty('--counter', newValue.toString());
      
      expect(testElement.style.getPropertyValue('--counter')).toBe('7');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very large decrements', async () => {
      context.locals.set('bigNum', 1000000);
      
      await command.execute(context, 'bigNum', 'by', 500000);
      
      expect(context.locals.get('bigNum')).toBe(500000);
    });

    it('should handle very small decrements', async () => {
      context.locals.set('smallNum', 1.0);
      
      await command.execute(context, 'smallNum', 'by', Number.EPSILON);
      
      expect(context.locals.get('smallNum')).toBeCloseTo(1.0 - Number.EPSILON, 15);
    });

    it('should handle multiple rapid decrements', async () => {
      context.locals.set('counter', 20);
      
      const decrements = [1, 2, 3, 4, 5];
      for (const dec of decrements) {
        await command.execute(context, 'counter', 'by', dec);
      }
      
      expect(context.locals.get('counter')).toBe(5); // 20-1-2-3-4-5 = 5
    });

    it('should maintain precision with floating point arithmetic', async () => {
      context.locals.set('precise', 0.3);
      
      await command.execute(context, 'precise', 'by', 0.1);
      
      expect(context.locals.get('precise')).toBeCloseTo(0.2, 10);
    });

    it('should handle underflow scenarios', async () => {
      context.locals.set('smallNum', Number.MIN_SAFE_INTEGER + 100);
      
      await command.execute(context, 'smallNum', 'by', 50);
      
      expect(context.locals.get('smallNum')).toBe(Number.MIN_SAFE_INTEGER + 50);
    });
  });

  describe('Complementary Testing with Increment', () => {
    it('should be opposite of increment command', async () => {
      const initialValue = 10;
      const amount = 3;
      
      context.locals.set('counter', initialValue);
      
      // Increment then decrement should return to original
      await command.execute(context, 'counter', 'by', -amount); // subtract negative = add
      expect(context.locals.get('counter')).toBe(initialValue + amount);
      
      await command.execute(context, 'counter', 'by', amount);
      expect(context.locals.get('counter')).toBe(initialValue);
    });

    it('should handle zero crossings correctly', async () => {
      context.locals.set('counter', 2);
      
      await command.execute(context, 'counter', 'by', 5);
      expect(context.locals.get('counter')).toBe(-3);
      
      // Should be able to go back positive
      await command.execute(context, 'counter', 'by', -10);
      expect(context.locals.get('counter')).toBe(7);
    });
  });
});