/**
 * Tests for def feature - Function definitions in hyperscript
 * Generated from LSP examples with comprehensive TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DefFeature, FunctionDefinition } from './def';
import { createMockHyperscriptContext, createTestElement } from '../test-setup';
import { ExecutionContext } from '../types/core';

describe('Def Feature', () => {
  let defFeature: DefFeature;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    defFeature = new DefFeature();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
    
    // Ensure required context properties exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
    if (!context.flags) context.flags = {
      halted: false,
      breaking: false,
      continuing: false,
      returning: false,
      async: false
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature Properties', () => {
    it('should have correct feature metadata', () => {
      expect(defFeature.name).toBe('def');
      expect(defFeature.description).toContain('Function definition');
    });

    it('should initialize with empty function registry', () => {
      expect(defFeature.getFunctionNames()).toHaveLength(0);
    });

    it('should provide singleton instance', () => {
      const instance1 = DefFeature.getInstance();
      const instance2 = DefFeature.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Basic Function Definition', () => {
    it('should define simple function without parameters', () => {
      const commands = [{ type: 'command', name: 'return', args: [42] }];
      
      defFeature.defineFunction('theAnswer', [], commands, context);
      
      expect(defFeature.hasFunction('theAnswer')).toBe(true);
      expect(defFeature.getFunctionNames()).toContain('theAnswer');
    });

    it('should define function with parameters', () => {
      const commands = [{ type: 'command', name: 'return', args: ['value'] }];
      
      defFeature.defineFunction('echo', ['value'], commands, context);
      
      expect(defFeature.hasFunction('echo')).toBe(true);
      const func = defFeature.getFunction('echo');
      expect(func?.parameters).toEqual(['value']);
    });

    it('should define function with multiple parameters', () => {
      const commands = [{ type: 'command', name: 'return', args: ['i + j'] }];
      
      defFeature.defineFunction('add', ['i', 'j'], commands, context);
      
      const func = defFeature.getFunction('add');
      expect(func?.parameters).toEqual(['i', 'j']);
    });

    it('should store function body correctly', () => {
      const commands = [
        { type: 'command', name: 'set', args: ['result', 42] },
        { type: 'command', name: 'return', args: ['result'] }
      ];
      
      defFeature.defineFunction('complex', [], commands, context);
      
      const func = defFeature.getFunction('complex');
      expect(func?.body).toEqual(commands);
    });
  });

  describe('Function Execution', () => {
    it('should execute simple function without parameters', async () => {
      const commands = [{ type: 'command', name: 'return', args: [42] }];
      defFeature.defineFunction('theAnswer', [], commands, context);
      
      const result = await defFeature.executeFunction('theAnswer', [], context);
      
      expect(result).toBe(42);
    });

    it('should execute function with single parameter', async () => {
      const commands = [{ type: 'command', name: 'return', args: ['value'] }];
      defFeature.defineFunction('echo', ['value'], commands, context);
      
      const result = await defFeature.executeFunction('echo', ['hello'], context);
      
      expect(result).toBe('hello');
    });

    it('should execute function with multiple parameters', async () => {
      const commands = [{ type: 'command', name: 'return', args: ['i + j'] }];
      defFeature.defineFunction('add', ['i', 'j'], commands, context);
      
      const result = await defFeature.executeFunction('add', [5, 3], context);
      
      expect(result).toBe(8);
    });

    it('should bind parameters to local context', async () => {
      const commands = [
        { type: 'command', name: 'set', args: ['result', 'value * 2'] },
        { type: 'command', name: 'return', args: ['result'] }
      ];
      defFeature.defineFunction('double', ['value'], commands, context);
      
      const result = await defFeature.executeFunction('double', [21], context);
      
      expect(result).toBe(42);
    });

    it('should handle functions without return values', async () => {
      const commands = [
        { type: 'command', name: 'set', args: ['global', 'sideEffect', 'completed'] }
      ];
      defFeature.defineFunction('sideEffectFunc', [], commands, context);
      
      const result = await defFeature.executeFunction('sideEffectFunc', [], context);
      
      expect(result).toBe(undefined);
      expect(context.globals?.get('sideEffect')).toBe('completed');
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: delayTheAnswer function', async () => {
      // LSP: def delayTheAnswer() wait 2s return 42 end
      const commands = [
        { type: 'command', name: 'wait', args: ['2s'] },
        { type: 'command', name: 'return', args: [42] }
      ];
      
      defFeature.defineFunction('delayTheAnswer', [], commands, context);
      
      // Mock the wait command to resolve immediately for testing
      vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
        (fn as Function)();
        return 1 as any;
      });
      
      const result = await defFeature.executeFunction('delayTheAnswer', [], context);
      
      expect(result).toBe(42);
    });

    it('should handle LSP example 2: increment function', async () => {
      // LSP: def increment(i, j) return (i as int) + (j as int) end
      const commands = [
        { type: 'command', name: 'return', args: ['(i as int) + (j as int)'] }
      ];
      
      defFeature.defineFunction('increment', ['i', 'j'], commands, context);
      
      const result = await defFeature.executeFunction('increment', ['5', '3'], context);
      
      expect(result).toBe(8);
    });

    it('should handle namespaced functions (LSP: utils.delayTheAnswer)', () => {
      const commands = [{ type: 'command', name: 'return', args: [42] }];
      
      defFeature.defineFunction('utils.delayTheAnswer', [], commands, context);
      
      expect(defFeature.hasFunction('utils.delayTheAnswer')).toBe(true);
      const func = defFeature.getFunction('utils.delayTheAnswer');
      expect(func?.name).toBe('delayTheAnswer');
      expect(func?.namespace).toBe('utils');
    });
  });

  describe('Function Namespacing', () => {
    it('should support dot notation for namespacing', () => {
      const commands = [{ type: 'command', name: 'return', args: ['value'] }];
      
      defFeature.defineFunction('math.square', ['value'], commands, context);
      
      expect(defFeature.hasFunction('math.square')).toBe(true);
      const func = defFeature.getFunction('math.square');
      expect(func?.namespace).toBe('math');
      expect(func?.name).toBe('square');
    });

    it('should support nested namespacing', () => {
      const commands = [{ type: 'command', name: 'return', args: ['value'] }];
      
      defFeature.defineFunction('utils.math.advanced.calculate', ['value'], commands, context);
      
      expect(defFeature.hasFunction('utils.math.advanced.calculate')).toBe(true);
      const func = defFeature.getFunction('utils.math.advanced.calculate');
      expect(func?.namespace).toBe('utils.math.advanced');
      expect(func?.name).toBe('calculate');
    });

    it('should list functions by namespace', () => {
      const commands = [{ type: 'command', name: 'return', args: [42] }];
      
      defFeature.defineFunction('math.add', ['a', 'b'], commands, context);
      defFeature.defineFunction('math.subtract', ['a', 'b'], commands, context);
      defFeature.defineFunction('string.concat', ['a', 'b'], commands, context);
      
      const mathFunctions = defFeature.getFunctionsByNamespace('math');
      expect(mathFunctions).toHaveLength(2);
      expect(mathFunctions.map(f => f.name)).toContain('add');
      expect(mathFunctions.map(f => f.name)).toContain('subtract');
    });
  });

  describe('Parameter Binding and Scope', () => {
    it('should create isolated local scope for function execution', async () => {
      context.locals!.set('existingVar', 'original');
      
      const commands = [
        { type: 'command', name: 'set', args: ['local', 'existingVar', 'modified'] },
        { type: 'command', name: 'return', args: ['existingVar'] }
      ];
      defFeature.defineFunction('scopeTest', ['existingVar'], commands, context);
      
      const result = await defFeature.executeFunction('scopeTest', ['newValue'], context);
      
      expect(result).toBe('newValue');
      expect(context.locals!.get('existingVar')).toBe('original'); // Unchanged
    });

    it('should handle parameter shadowing correctly', async () => {
      context.locals!.set('param', 'outer');
      
      const commands = [{ type: 'command', name: 'return', args: ['param'] }];
      defFeature.defineFunction('shadowTest', ['param'], commands, context);
      
      const result = await defFeature.executeFunction('shadowTest', ['inner'], context);
      
      expect(result).toBe('inner'); // Parameter shadows outer variable
    });

    it('should maintain access to global variables', async () => {
      context.globals!.set('globalVar', 'global value');
      
      const commands = [{ type: 'command', name: 'return', args: ['globalVar'] }];
      defFeature.defineFunction('globalAccess', [], commands, context);
      
      const result = await defFeature.executeFunction('globalAccess', [], context);
      
      expect(result).toBe('global value');
    });

    it('should handle excess arguments gracefully', async () => {
      const commands = [{ type: 'command', name: 'return', args: ['param1'] }];
      defFeature.defineFunction('excessArgs', ['param1'], commands, context);
      
      const result = await defFeature.executeFunction('excessArgs', ['first', 'second', 'third'], context);
      
      expect(result).toBe('first'); // Extra args ignored
    });

    it('should handle missing arguments with undefined', async () => {
      const commands = [{ type: 'command', name: 'return', args: ['param2 || "default"'] }];
      defFeature.defineFunction('missingArgs', ['param1', 'param2'], commands, context);
      
      const result = await defFeature.executeFunction('missingArgs', ['first'], context);
      
      expect(result).toBe('default');
    });
  });

  describe('Error Handling with Catch/Finally', () => {
    it('should define function with catch block', () => {
      const commands = [{ type: 'command', name: 'throw', args: ['error'] }];
      const catchBlock = { parameter: 'e', body: [{ type: 'command', name: 'return', args: ['caught'] }] };
      
      defFeature.defineFunction('withCatch', [], commands, context, catchBlock);
      
      const func = defFeature.getFunction('withCatch');
      expect(func?.catchBlock).toBeDefined();
      expect(func?.catchBlock?.parameter).toBe('e');
    });

    it('should define function with finally block', () => {
      const commands = [{ type: 'command', name: 'return', args: [42] }];
      const finallyBlock = [{ type: 'command', name: 'set', args: ['global', 'cleanup', 'done'] }];
      
      defFeature.defineFunction('withFinally', [], commands, context, undefined, finallyBlock);
      
      const func = defFeature.getFunction('withFinally');
      expect(func?.finallyBlock).toEqual(finallyBlock);
    });

    it('should execute catch block on error', async () => {
      const commands = [{ type: 'command', name: 'throw', args: ['test error'] }];
      const catchBlock = { parameter: 'e', body: [{ type: 'command', name: 'return', args: ['caught: e.message'] }] };
      
      defFeature.defineFunction('errorTest', [], commands, context, catchBlock);
      
      const result = await defFeature.executeFunction('errorTest', [], context);
      
      expect(result).toContain('caught:');
    });

    it('should execute finally block regardless of success', async () => {
      const commands = [{ type: 'command', name: 'return', args: [42] }];
      const finallyBlock = [{ type: 'command', name: 'set', args: ['global', 'cleanup', 'executed'] }];
      
      defFeature.defineFunction('finallyTest', [], commands, context, undefined, finallyBlock);
      
      const result = await defFeature.executeFunction('finallyTest', [], context);
      
      expect(result).toBe(42);
      expect(context.globals?.get('cleanup')).toBe('executed');
    });

    it('should execute finally block after error and catch', async () => {
      const commands = [{ type: 'command', name: 'throw', args: ['error'] }];
      const catchBlock = { parameter: 'e', body: [{ type: 'command', name: 'return', args: ['handled'] }] };
      const finallyBlock = [{ type: 'command', name: 'set', args: ['global', 'cleanup', 'done'] }];
      
      defFeature.defineFunction('fullErrorTest', [], commands, context, catchBlock, finallyBlock);
      
      const result = await defFeature.executeFunction('fullErrorTest', [], context);
      
      expect(result).toBe('handled');
      expect(context.globals?.get('cleanup')).toBe('done');
    });
  });

  describe('Async Function Support', () => {
    it('should detect async functions with wait commands', () => {
      const commands = [
        { type: 'command', name: 'wait', args: ['1s'] },
        { type: 'command', name: 'return', args: [42] }
      ];
      
      defFeature.defineFunction('asyncFunc', [], commands, context);
      
      const func = defFeature.getFunction('asyncFunc');
      expect(func?.isAsync).toBe(true);
    });

    it('should detect async functions with fetch commands', () => {
      const commands = [
        { type: 'command', name: 'fetch', args: ['/api/data'] },
        { type: 'command', name: 'return', args: ['result'] }
      ];
      
      defFeature.defineFunction('fetchFunc', [], commands, context);
      
      const func = defFeature.getFunction('fetchFunc');
      expect(func?.isAsync).toBe(true);
    });

    it('should execute async functions correctly', async () => {
      const commands = [
        { type: 'command', name: 'wait', args: ['10ms'] },
        { type: 'command', name: 'return', args: ['async result'] }
      ];
      
      defFeature.defineFunction('asyncTest', [], commands, context);
      
      const result = await defFeature.executeFunction('asyncTest', [], context);
      
      expect(result).toBe('async result');
    });
  });

  describe('Function Registry Management', () => {
    it('should prevent function redefinition by default', () => {
      const commands1 = [{ type: 'command', name: 'return', args: [1] }];
      const commands2 = [{ type: 'command', name: 'return', args: [2] }];
      
      defFeature.defineFunction('testFunc', [], commands1, context);
      
      expect(() => {
        defFeature.defineFunction('testFunc', [], commands2, context);
      }).toThrow('Function testFunc is already defined');
    });

    it('should allow function redefinition with force flag', () => {
      const commands1 = [{ type: 'command', name: 'return', args: [1] }];
      const commands2 = [{ type: 'command', name: 'return', args: [2] }];
      
      defFeature.defineFunction('testFunc', [], commands1, context);
      defFeature.defineFunction('testFunc', [], commands2, context, undefined, undefined, true);
      
      expect(defFeature.getFunction('testFunc')?.body).toEqual(commands2);
    });

    it('should clear all functions', () => {
      defFeature.defineFunction('func1', [], [], context);
      defFeature.defineFunction('func2', [], [], context);
      
      expect(defFeature.getFunctionNames()).toHaveLength(2);
      
      defFeature.clear();
      
      expect(defFeature.getFunctionNames()).toHaveLength(0);
    });

    it('should remove specific function', () => {
      defFeature.defineFunction('keep', [], [], context);
      defFeature.defineFunction('remove', [], [], context);
      
      expect(defFeature.hasFunction('remove')).toBe(true);
      
      defFeature.removeFunction('remove');
      
      expect(defFeature.hasFunction('remove')).toBe(false);
      expect(defFeature.hasFunction('keep')).toBe(true);
    });
  });

  describe('JavaScript Integration', () => {
    it('should make functions callable from JavaScript', async () => {
      const commands = [{ type: 'command', name: 'return', args: ['param * 2'] }];
      defFeature.defineFunction('jsCallable', ['param'], commands, context);
      
      const jsFunction = defFeature.getJavaScriptFunction('jsCallable');
      
      expect(typeof jsFunction).toBe('function');
      const result = await jsFunction(21);
      expect(result).toBe(42);
    });

    it('should handle JavaScript function errors', async () => {
      const commands = [{ type: 'command', name: 'throw', args: ['js error'] }];
      defFeature.defineFunction('jsError', [], commands, context);
      
      const jsFunction = defFeature.getJavaScriptFunction('jsError');
      
      await expect(jsFunction()).rejects.toThrow('js error');
    });

    it('should provide function metadata for JavaScript', () => {
      const commands = [{ type: 'command', name: 'return', args: ['param'] }];
      defFeature.defineFunction('metadata', ['param'], commands, context);
      
      const metadata = defFeature.getFunctionMetadata('metadata');
      
      expect(metadata).toMatchObject({
        name: 'metadata',
        parameters: ['param'],
        isAsync: false,
        namespace: null
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of function definitions', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const commands = [{ type: 'command', name: 'return', args: [i] }];
        defFeature.defineFunction(`func${i}`, [], commands, context);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(defFeature.getFunctionNames()).toHaveLength(1000);
    });

    it('should handle recursive function calls', async () => {
      const commands = [
        { type: 'command', name: 'if', args: ['n <= 1', 'then', 'return', '1'] },
        { type: 'command', name: 'return', args: ['n * factorial(n - 1)'] }
      ];
      defFeature.defineFunction('factorial', ['n'], commands, context);
      
      const result = await defFeature.executeFunction('factorial', [5], context);
      
      expect(result).toBe(120); // 5! = 120
    });

    it('should handle functions with no commands', async () => {
      defFeature.defineFunction('empty', [], [], context);
      
      const result = await defFeature.executeFunction('empty', [], context);
      
      expect(result).toBe(undefined);
    });

    it('should handle circular references in parameters', async () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      
      const commands = [{ type: 'command', name: 'return', args: ['param.name'] }];
      defFeature.defineFunction('circular', ['param'], commands, context);
      
      const result = await defFeature.executeFunction('circular', [obj], context);
      
      expect(result).toBe('test');
    });
  });

  describe('Integration with Call Command', () => {
    it('should be callable via call command', async () => {
      const commands = [{ type: 'command', name: 'return', args: [42] }];
      defFeature.defineFunction('callableFunc', [], commands, context);
      
      // Simulate call command integration
      const func = defFeature.getFunction('callableFunc');
      expect(func).toBeDefined();
      
      const result = await defFeature.executeFunction('callableFunc', [], context);
      expect(result).toBe(42);
    });

    it('should integrate with existing call command patterns', async () => {
      const commands = [
        { type: 'command', name: 'set', args: ['local', 'message', '"Hello " + name'] },
        { type: 'command', name: 'return', args: ['message'] }
      ];
      defFeature.defineFunction('greet', ['name'], commands, context);
      
      const result = await defFeature.executeFunction('greet', ['World'], context);
      
      expect(result).toBe('Hello World');
    });
  });

  describe('Validation', () => {
    it('should validate function name format', () => {
      expect(() => {
        defFeature.defineFunction('', [], [], context);
      }).toThrow('Function name cannot be empty');
      
      expect(() => {
        defFeature.defineFunction('123invalid', [], [], context);
      }).toThrow('Invalid function name');
    });

    it('should validate parameter names', () => {
      expect(() => {
        defFeature.defineFunction('test', ['', 'valid'], [], context);
      }).toThrow('Parameter name cannot be empty');
      
      expect(() => {
        defFeature.defineFunction('test', ['123invalid'], [], context);
      }).toThrow('Invalid parameter name');
    });

    it('should validate duplicate parameters', () => {
      expect(() => {
        defFeature.defineFunction('test', ['param', 'param'], [], context);
      }).toThrow('Duplicate parameter name');
    });

    it('should validate reserved keywords as function names', () => {
      const reservedWords = ['if', 'then', 'else', 'return', 'def', 'end'];
      
      reservedWords.forEach(word => {
        expect(() => {
          defFeature.defineFunction(word, [], [], context);
        }).toThrow('Reserved keyword');
      });
    });
  });
});