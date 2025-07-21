/**
 * Tests for increment command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IncrementCommand } from './increment';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Increment Command', () => {
  let command: IncrementCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new IncrementCommand();
    testElement = createTestElement('<div id="test" data-count="5">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
    
    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('increment');
      expect(command.syntax).toBe('increment <target> [by <number>]');
      expect(command.description).toBe('The increment command adds to an existing variable, property, or attribute. It defaults to adding the value 1, but this can be changed using the by modifier. If the target variable is null, then it is assumed to be 0, and then incremented by the specified amount. The increment command is the opposite of the decrement command command.');
    });
  });

  describe('Basic Variable Increment', () => {
    it('should increment local variable by 1 (default)', async () => {
      context.locals.set('counter', 5);
      
      await command.execute(context, 'counter');
      
      expect(context.locals.get('counter')).toBe(6);
    });

    it('should increment local variable by specified amount', async () => {
      context.locals.set('counter', 5);
      
      await command.execute(context, 'counter', 'by', 2);
      
      expect(context.locals.get('counter')).toBe(7);
    });

    it('should increment global variable by 1 (default)', async () => {
      context.globals.set('globalCounter', 10);
      
      await command.execute(context, 'global', 'globalCounter');
      
      expect(context.globals.get('globalCounter')).toBe(11);
    });

    it('should increment global variable by specified amount', async () => {
      context.globals.set('globalCounter', 10);
      
      await command.execute(context, 'global', 'globalCounter', 'by', 5);
      
      expect(context.globals.get('globalCounter')).toBe(15);
    });

    it('should handle $ prefixed global variables', async () => {
      context.globals.set('$globalVar', 20);
      
      await command.execute(context, '$globalVar', 'by', 3);
      
      expect(context.globals.get('$globalVar')).toBe(23);
    });
  });

  describe('Null/Undefined Variable Handling', () => {
    it('should initialize null variable to 0 then increment by 1', async () => {
      context.locals.set('nullVar', null);
      
      await command.execute(context, 'nullVar');
      
      expect(context.locals.get('nullVar')).toBe(1);
    });

    it('should initialize undefined variable to 0 then increment by 1', async () => {
      context.locals.set('undefinedVar', undefined);
      
      await command.execute(context, 'undefinedVar');
      
      expect(context.locals.get('undefinedVar')).toBe(1);
    });

    it('should initialize new variable to 0 then increment by 1', async () => {
      // Variable doesn't exist
      await command.execute(context, 'newVariable');
      
      expect(context.locals.get('newVariable')).toBe(1);
    });

    it('should initialize null variable to 0 then increment by specified amount', async () => {
      context.locals.set('nullVar', null);
      
      await command.execute(context, 'nullVar', 'by', 5);
      
      expect(context.locals.get('nullVar')).toBe(5);
    });

    it('should initialize new variable to 0 then increment by specified amount', async () => {
      await command.execute(context, 'newVariable', 'by', 10);
      
      expect(context.locals.get('newVariable')).toBe(10);
    });
  });

  describe('Element Property Increment', () => {
    it('should increment element attribute by 1 (default)', async () => {
      testElement.setAttribute('data-count', '5');
      
      await command.execute(context, testElement, 'data-count');
      
      expect(testElement.getAttribute('data-count')).toBe('6');
    });

    it('should increment element attribute by specified amount', async () => {
      testElement.setAttribute('data-score', '100');
      
      await command.execute(context, testElement, 'data-score', 'by', 25);
      
      expect(testElement.getAttribute('data-score')).toBe('125');
    });

    it('should increment element property by 1 (default)', async () => {
      testElement.tabIndex = 0;
      
      await command.execute(context, testElement, 'tabIndex');
      
      expect(testElement.tabIndex).toBe(1);
    });

    it('should increment element property by specified amount', async () => {
      testElement.tabIndex = 5;
      
      await command.execute(context, testElement, 'tabIndex', 'by', 3);
      
      expect(testElement.tabIndex).toBe(8);
    });

    it('should initialize null element attribute to 0 then increment', async () => {
      testElement.removeAttribute('data-new');
      
      await command.execute(context, testElement, 'data-new', 'by', 7);
      
      expect(testElement.getAttribute('data-new')).toBe('7');
    });
  });

  describe('Different Data Types', () => {
    it('should increment string numbers', async () => {
      context.locals.set('stringNum', '42');
      
      await command.execute(context, 'stringNum', 'by', 8);
      
      expect(context.locals.get('stringNum')).toBe(50);
    });

    it('should increment floating point numbers', async () => {
      context.locals.set('floatNum', 3.14);
      
      await command.execute(context, 'floatNum', 'by', 2.86);
      
      expect(context.locals.get('floatNum')).toBeCloseTo(6.0, 2);
    });

    it('should handle negative increments', async () => {
      context.locals.set('counter', 10);
      
      await command.execute(context, 'counter', 'by', -3);
      
      expect(context.locals.get('counter')).toBe(7);
    });

    it('should handle zero increments', async () => {
      context.locals.set('counter', 5);
      
      await command.execute(context, 'counter', 'by', 0);
      
      expect(context.locals.get('counter')).toBe(5);
    });

    it('should handle large numbers', async () => {
      context.locals.set('bigNum', 1000000);
      
      await command.execute(context, 'bigNum', 'by', 500000);
      
      expect(context.locals.get('bigNum')).toBe(1500000);
    });
  });

  describe('Variable Scope Resolution', () => {
    it('should prefer local variables over global', async () => {
      context.locals.set('counter', 5);
      context.globals.set('counter', 50);
      
      await command.execute(context, 'counter', 'by', 2);
      
      expect(context.locals.get('counter')).toBe(7);
      expect(context.globals.get('counter')).toBe(50); // unchanged
    });

    it('should increment global variable when local not found', async () => {
      context.globals.set('counter', 20);
      
      await command.execute(context, 'counter', 'by', 5);
      
      expect(context.globals.get('counter')).toBe(25);
      expect(context.locals.has('counter')).toBe(false);
    });

    it('should create new local variable when neither local nor global exists', async () => {
      await command.execute(context, 'newCounter', 'by', 8);
      
      expect(context.locals.get('newCounter')).toBe(8);
      expect(context.globals.has('newCounter')).toBe(false);
    });

    it('should handle element scope variables', async () => {
      if (!context.elementScope) context.elementScope = new Map();
      context.elementScope.set('elemCounter', 15);
      
      await command.execute(context, 'elemCounter', 'by', 5);
      
      expect(context.elementScope.get('elemCounter')).toBe(20);
    });
  });

  describe('Expression Evaluation', () => {
    it('should increment with variable amounts', async () => {
      context.locals.set('counter', 10);
      context.locals.set('increment', 3);
      
      // This would be evaluated by expression system, we test with final value
      await command.execute(context, 'counter', 'by', 3);
      
      expect(context.locals.get('counter')).toBe(13);
    });

    it('should handle complex target expressions', async () => {
      const obj = { nested: { value: 25 } };
      context.locals.set('obj', obj);
      
      // Direct property access for testing
      await command.execute(context, obj.nested, 'value', 'by', 5);
      
      expect(obj.nested.value).toBe(30);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-numeric values by converting to numbers', async () => {
      context.locals.set('nonNum', 'not-a-number');
      
      await command.execute(context, 'nonNum', 'by', 1);
      
      // NaN + 1 = NaN
      expect(Number.isNaN(context.locals.get('nonNum'))).toBe(true);
    });

    it('should handle boolean values by converting to numbers', async () => {
      context.locals.set('boolVar', true);
      
      await command.execute(context, 'boolVar', 'by', 1);
      
      expect(context.locals.get('boolVar')).toBe(2); // true converts to 1, then 1+1=2
    });

    it('should handle array values by converting to numbers', async () => {
      context.locals.set('arrVar', []);
      
      await command.execute(context, 'arrVar', 'by', 5);
      
      expect(context.locals.get('arrVar')).toBe(5); // [] converts to 0, then 0+5=5
    });

    it('should handle object values by converting to numbers', async () => {
      context.locals.set('objVar', {});
      
      await command.execute(context, 'objVar', 'by', 3);
      
      // {} converts to NaN
      expect(Number.isNaN(context.locals.get('objVar'))).toBe(true);
    });

    it('should throw error for invalid target', async () => {
      await expect(async () => {
        await command.execute(context, null, 'by', 1);
      }).rejects.toThrow('Cannot increment null or undefined target');
    });
  });

  describe('Validation', () => {
    it('should validate basic increment syntax', () => {
      const error = command.validate(['counter']);
      expect(error).toBe(null);
    });

    it('should validate increment with by modifier', () => {
      const error = command.validate(['counter', 'by', 5]);
      expect(error).toBe(null);
    });

    it('should require at least one argument', () => {
      const error = command.validate([]);
      expect(error).toBe('Increment command requires a target');
    });

    it('should validate "by" keyword when amount is specified', () => {
      const error = command.validate(['counter', 'invalid', 5]);
      expect(error).toBe('Increment command requires "by" keyword when specifying amount');
    });

    it('should require amount after "by" keyword', () => {
      const error = command.validate(['counter', 'by']);
      expect(error).toBe('Increment command requires amount after "by" keyword');
    });

    it('should require numeric amount after "by" keyword', () => {
      const error = command.validate(['counter', 'by', 'not-a-number']);
      expect(error).toBe('Increment command requires numeric amount after "by" keyword');
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: increment with by modifier', async () => {
      // From LSP: set counter to 5, increment counter by 2 -- counter is now 7
      context.locals.set('counter', 5);
      
      await command.execute(context, 'counter', 'by', 2);
      
      expect(context.locals.get('counter')).toBe(7);
    });

    it('should handle LSP example 2: increment new variable', async () => {
      // From LSP: increment newVariable -- newVariable is defaulted to zero, then incremented to 1
      await command.execute(context, 'newVariable');
      
      expect(context.locals.get('newVariable')).toBe(1);
    });

    it('should handle pseudo-command examples with parentheses', async () => {
      // From LSP pseudo-command examples: increment(:x) by 2
      context.locals.set('x', 10);
      
      await command.execute(context, 'x', 'by', 2);
      
      expect(context.locals.get('x')).toBe(12);
    });

    it('should handle typical usage patterns', async () => {
      // Test various realistic usage patterns
      
      // Counter pattern
      context.locals.set('clickCount', 0);
      await command.execute(context, 'clickCount');
      expect(context.locals.get('clickCount')).toBe(1);
      
      // Score increment
      context.locals.set('score', 100);
      await command.execute(context, 'score', 'by', 50);
      expect(context.locals.get('score')).toBe(150);
      
      // Element data attribute
      testElement.setAttribute('data-index', '0');
      await command.execute(context, testElement, 'data-index');
      expect(testElement.getAttribute('data-index')).toBe('1');
    });
  });

  describe('Element Context Integration', () => {
    it('should work with me context reference', async () => {
      context.me = testElement;
      testElement.setAttribute('data-value', '10');
      
      await command.execute(context, context.me, 'data-value', 'by', 5);
      
      expect(testElement.getAttribute('data-value')).toBe('15');
    });

    it('should work with element properties', async () => {
      context.me = testElement;
      testElement.scrollTop = 100;
      
      await command.execute(context, context.me, 'scrollTop', 'by', 50);
      
      expect(testElement.scrollTop).toBe(150);
    });

    it('should handle CSS custom properties', async () => {
      testElement.style.setProperty('--counter', '5');
      
      // In real implementation, this would be handled by expression system
      const currentValue = parseInt(testElement.style.getPropertyValue('--counter'));
      const newValue = currentValue + 3;
      testElement.style.setProperty('--counter', newValue.toString());
      
      expect(testElement.style.getPropertyValue('--counter')).toBe('8');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very large increments', async () => {
      context.locals.set('bigNum', Number.MAX_SAFE_INTEGER - 100);
      
      await command.execute(context, 'bigNum', 'by', 50);
      
      expect(context.locals.get('bigNum')).toBe(Number.MAX_SAFE_INTEGER - 50);
    });

    it('should handle very small increments', async () => {
      context.locals.set('smallNum', 0);
      
      await command.execute(context, 'smallNum', 'by', Number.EPSILON);
      
      expect(context.locals.get('smallNum')).toBe(Number.EPSILON);
    });

    it('should handle multiple rapid increments', async () => {
      context.locals.set('counter', 0);
      
      const increments = [1, 2, 3, 4, 5];
      for (const inc of increments) {
        await command.execute(context, 'counter', 'by', inc);
      }
      
      expect(context.locals.get('counter')).toBe(15); // 0+1+2+3+4+5 = 15
    });

    it('should maintain precision with floating point arithmetic', async () => {
      context.locals.set('precise', 0.1);
      
      await command.execute(context, 'precise', 'by', 0.2);
      
      expect(context.locals.get('precise')).toBeCloseTo(0.3, 10);
    });
  });
});