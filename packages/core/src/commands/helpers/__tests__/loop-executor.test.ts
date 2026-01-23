/**
 * Unit Tests for Loop Executor Helper
 *
 * Tests the unified loop execution engine used by repeat, for, while, until commands.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  executeLoop,
  createForLoopConfig,
  createTimesLoopConfig,
  createWhileLoopConfig,
  createUntilLoopConfig,
  createUntilEventLoopConfig,
  createForeverLoopConfig,
  type LoopConfig,
  type LoopIterationContext,
} from '../loop-executor';
import type { TypedExecutionContext } from '../../../types/core';

// ========== Test Utilities ==========

function createMockContext(): TypedExecutionContext {
  const meElement = document.createElement('div');
  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    target: meElement,
    detail: undefined,
  } as unknown as TypedExecutionContext;
}

function createMockExecuteCommands() {
  return vi.fn(async (_commands: unknown, _context: TypedExecutionContext) => {
    return undefined;
  });
}

// ========== Tests ==========

describe('Loop Executor Helper', () => {
  let context: TypedExecutionContext;
  let executeCommands: ReturnType<typeof createMockExecuteCommands>;

  beforeEach(() => {
    context = createMockContext();
    executeCommands = createMockExecuteCommands();
  });

  // ========== executeLoop ==========

  describe('executeLoop', () => {
    describe('basic execution', () => {
      it('should execute loop until shouldContinue returns false', async () => {
        let callCount = 0;
        const config: LoopConfig = {
          type: 'times',
          shouldContinue: () => {
            callCount++;
            return callCount <= 3;
          },
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        const result = await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(result.iterations).toBe(3);
        expect(executeCommands).toHaveBeenCalledTimes(3);
      });

      it('should return last result from commands', async () => {
        executeCommands.mockResolvedValue('last-value');

        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 2,
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        const result = await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(result.lastResult).toBe('last-value');
      });

      it('should update iteration context index', async () => {
        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 3,
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(iterCtx.index).toBe(3);
      });

      it('should respect maxIterations safety limit', async () => {
        const config: LoopConfig = {
          type: 'forever',
          maxIterations: 5,
          shouldContinue: () => true, // Would run forever
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        const result = await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(result.iterations).toBe(5);
      });

      it('should use default maxIterations of 10000', async () => {
        let iterations = 0;
        const config: LoopConfig = {
          type: 'forever',
          shouldContinue: () => {
            iterations++;
            return true;
          },
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        const result = await executeLoop(config, null, context, iterCtx, executeCommands);

        // Should hit safety limit
        expect(result.iterations).toBe(10000);
      });
    });

    describe('beforeIteration callback', () => {
      it('should call beforeIteration before each iteration', async () => {
        const beforeIteration = vi.fn();
        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 3,
          beforeIteration,
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(beforeIteration).toHaveBeenCalledTimes(3);
      });

      it('should pass iteration context and execution context to beforeIteration', async () => {
        const beforeIteration = vi.fn();
        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 1,
          beforeIteration,
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(beforeIteration).toHaveBeenCalledWith(iterCtx, context);
      });

      it('should support async beforeIteration', async () => {
        let callOrder: string[] = [];
        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 2,
          beforeIteration: async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            callOrder.push('before');
          },
        };

        executeCommands.mockImplementation(async () => {
          callOrder.push('exec');
        });

        const iterCtx: LoopIterationContext = { index: 0 };
        await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(callOrder).toEqual(['before', 'exec', 'before', 'exec']);
      });
    });

    describe('index variable', () => {
      it('should set index variable in locals when specified', async () => {
        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 3,
        };

        const iterCtx: LoopIterationContext = {
          index: 0,
          indexVariable: 'i',
        };

        await executeLoop(config, null, context, iterCtx, executeCommands);

        // Last iteration sets index to 2 (0-indexed)
        expect(context.locals.get('i')).toBe(2);
      });

      it('should not set index variable when not specified', async () => {
        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 2,
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(context.locals.size).toBe(0);
      });

      it('should update index variable each iteration', async () => {
        const indices: number[] = [];

        executeCommands.mockImplementation(() => {
          indices.push(context.locals.get('i') as number);
        });

        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 3,
        };

        const iterCtx: LoopIterationContext = {
          index: 0,
          indexVariable: 'i',
        };

        await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(indices).toEqual([0, 1, 2]);
      });
    });

    describe('break handling', () => {
      it('should stop loop when BREAK error is thrown', async () => {
        executeCommands
          .mockResolvedValueOnce('iter1')
          .mockRejectedValueOnce(new Error('BREAK'))
          .mockResolvedValueOnce('iter3');

        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 5,
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        const result = await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(result.iterations).toBe(1);
        expect(result.interrupted).toBe(true);
        expect(executeCommands).toHaveBeenCalledTimes(2); // 1 success + 1 break
      });

      it('should set interrupted flag on break', async () => {
        executeCommands.mockRejectedValue(new Error('BREAK'));

        const config: LoopConfig = {
          type: 'forever',
          maxIterations: 100,
          shouldContinue: () => true,
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        const result = await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(result.interrupted).toBe(true);
      });
    });

    describe('continue handling', () => {
      it('should skip to next iteration when CONTINUE error is thrown', async () => {
        const results: string[] = [];

        executeCommands
          .mockResolvedValueOnce('iter1')
          .mockRejectedValueOnce(new Error('CONTINUE'))
          .mockResolvedValueOnce('iter3');

        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 3,
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(executeCommands).toHaveBeenCalledTimes(3);
      });

      it('should increment iteration counter on continue', async () => {
        executeCommands.mockRejectedValueOnce(new Error('CONTINUE')).mockResolvedValueOnce('done');

        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 2,
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        const result = await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(result.iterations).toBe(2);
      });

      it('should update iterCtx.index on continue', async () => {
        executeCommands.mockRejectedValueOnce(new Error('CONTINUE')).mockResolvedValue('done');

        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 3,
        };

        const iterCtx: LoopIterationContext = { index: 0 };
        await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(iterCtx.index).toBe(3);
      });
    });

    describe('event-driven loops', () => {
      it('should setup event listener when eventSetup is provided', async () => {
        const target = document.createElement('div');
        const iterCtx: LoopIterationContext = {
          index: 0,
          eventFired: false,
        };

        const config: LoopConfig = {
          type: 'until-event',
          shouldContinue: ctx => !ctx.eventFired,
          eventSetup: {
            eventName: 'click',
            target,
            onEvent: () => {
              iterCtx.eventFired = true;
            },
          },
        };

        // Dispatch event after a short delay to stop loop
        setTimeout(() => {
          target.dispatchEvent(new Event('click'));
        }, 10);

        const result = await executeLoop(config, null, context, iterCtx, executeCommands);

        // Loop should have stopped when event fired
        expect(iterCtx.eventFired).toBe(true);
      });

      it('should cleanup event listener if event does not fire', async () => {
        const target = document.createElement('div');
        const addEventListenerSpy = vi.spyOn(target, 'addEventListener');
        const removeEventListenerSpy = vi.spyOn(target, 'removeEventListener');

        const iterCtx: LoopIterationContext = {
          index: 0,
          eventFired: false,
        };

        const config: LoopConfig = {
          type: 'until-event',
          maxIterations: 2,
          shouldContinue: ctx => !ctx.eventFired,
          eventSetup: {
            eventName: 'click',
            target,
            onEvent: () => {
              iterCtx.eventFired = true;
            },
          },
        };

        await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(addEventListenerSpy).toHaveBeenCalled();
        expect(removeEventListenerSpy).toHaveBeenCalled();
      });

      it('should not cleanup event listener if event has fired', async () => {
        const target = document.createElement('div');
        const removeEventListenerSpy = vi.spyOn(target, 'removeEventListener');

        const iterCtx: LoopIterationContext = {
          index: 0,
          eventFired: true, // Event already fired
        };

        const config: LoopConfig = {
          type: 'until-event',
          shouldContinue: ctx => !ctx.eventFired,
          eventSetup: {
            eventName: 'click',
            target,
            onEvent: () => {},
          },
        };

        await executeLoop(config, null, context, iterCtx, executeCommands);

        expect(removeEventListenerSpy).not.toHaveBeenCalled();
      });

      it('should yield on each iteration for event loops', async () => {
        vi.useFakeTimers();

        const iterCtx: LoopIterationContext = {
          index: 0,
          eventFired: false,
        };

        const config: LoopConfig = {
          type: 'until-event',
          maxIterations: 3,
          shouldContinue: ctx => !ctx.eventFired,
        };

        const promise = executeLoop(config, null, context, iterCtx, executeCommands);

        // Advance timers to allow yielding
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result.iterations).toBe(3);

        vi.useRealTimers();
      });

      it('should yield on continue for event loops', async () => {
        vi.useFakeTimers();

        executeCommands.mockRejectedValueOnce(new Error('CONTINUE')).mockResolvedValueOnce('done');

        const iterCtx: LoopIterationContext = {
          index: 0,
          eventFired: false,
        };

        const config: LoopConfig = {
          type: 'until-event',
          maxIterations: 2,
          shouldContinue: ctx => !ctx.eventFired,
        };

        const promise = executeLoop(config, null, context, iterCtx, executeCommands);
        await vi.runAllTimersAsync();

        await promise;

        vi.useRealTimers();
      });
    });

    describe('error handling', () => {
      it('should rethrow non-break/continue errors', async () => {
        const customError = new Error('Custom error');
        executeCommands.mockRejectedValue(customError);

        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 3,
        };

        const iterCtx: LoopIterationContext = { index: 0 };

        await expect(executeLoop(config, null, context, iterCtx, executeCommands)).rejects.toThrow(
          'Custom error'
        );
      });

      it('should rethrow errors that are not Error instances', async () => {
        executeCommands.mockRejectedValue('string error');

        const config: LoopConfig = {
          type: 'times',
          shouldContinue: ctx => ctx.index < 2,
        };

        const iterCtx: LoopIterationContext = { index: 0 };

        await expect(executeLoop(config, null, context, iterCtx, executeCommands)).rejects.toBe(
          'string error'
        );
      });
    });
  });

  // ========== createForLoopConfig ==========

  describe('createForLoopConfig', () => {
    it('should create config with correct type', () => {
      const collection = [1, 2, 3];
      const { config } = createForLoopConfig(collection, 'item');

      expect(config.type).toBe('for');
    });

    it('should initialize iteration context with collection', () => {
      const collection = [1, 2, 3];
      const { iterCtx } = createForLoopConfig(collection, 'item');

      expect(iterCtx.collection).toBe(collection);
      expect(iterCtx.index).toBe(0);
    });

    it('should set item variable name in context', () => {
      const { iterCtx } = createForLoopConfig([1, 2, 3], 'myItem');

      expect(iterCtx.itemVariable).toBe('myItem');
    });

    it('should set index variable name when provided', () => {
      const { iterCtx } = createForLoopConfig([1, 2, 3], 'item', 'i');

      expect(iterCtx.indexVariable).toBe('i');
    });

    it('should continue while index < collection length', () => {
      const collection = [1, 2, 3];
      const { config, iterCtx } = createForLoopConfig(collection, 'item');

      expect(config.shouldContinue(iterCtx)).toBe(true);

      iterCtx.index = 3;
      expect(config.shouldContinue(iterCtx)).toBe(false);
    });

    it('should set current item in beforeIteration', async () => {
      const collection = ['a', 'b', 'c'];
      const { config, iterCtx } = createForLoopConfig(collection, 'item');

      iterCtx.index = 1;
      await config.beforeIteration?.(iterCtx, context);

      expect(iterCtx.item).toBe('b');
    });

    it('should set item variable in locals during beforeIteration', async () => {
      const collection = ['x', 'y', 'z'];
      const { config, iterCtx } = createForLoopConfig(collection, 'item');

      iterCtx.index = 0;
      await config.beforeIteration?.(iterCtx, context);

      expect(context.locals.get('item')).toBe('x');
    });

    it('should handle empty collection', () => {
      const { config, iterCtx } = createForLoopConfig([], 'item');

      expect(config.shouldContinue(iterCtx)).toBe(false);
    });
  });

  // ========== createTimesLoopConfig ==========

  describe('createTimesLoopConfig', () => {
    it('should create config with correct type', () => {
      const { config } = createTimesLoopConfig(5);

      expect(config.type).toBe('times');
    });

    it('should initialize iteration context with count', () => {
      const { iterCtx } = createTimesLoopConfig(10);

      expect(iterCtx.count).toBe(10);
      expect(iterCtx.index).toBe(0);
    });

    it('should set index variable name when provided', () => {
      const { iterCtx } = createTimesLoopConfig(5, 'i');

      expect(iterCtx.indexVariable).toBe('i');
    });

    it('should continue while index < count', () => {
      const { config, iterCtx } = createTimesLoopConfig(3);

      expect(config.shouldContinue(iterCtx)).toBe(true);

      iterCtx.index = 3;
      expect(config.shouldContinue(iterCtx)).toBe(false);
    });

    it('should set context.it to 1-indexed value in beforeIteration', async () => {
      const { config, iterCtx } = createTimesLoopConfig(5);

      iterCtx.index = 0;
      await config.beforeIteration?.(iterCtx, context);
      expect(context.it).toBe(1);

      iterCtx.index = 4;
      await config.beforeIteration?.(iterCtx, context);
      expect(context.it).toBe(5);
    });

    it('should handle zero count', () => {
      const { config, iterCtx } = createTimesLoopConfig(0);

      expect(config.shouldContinue(iterCtx)).toBe(false);
    });

    it('should handle negative count', () => {
      const { config, iterCtx } = createTimesLoopConfig(-5);

      expect(config.shouldContinue(iterCtx)).toBe(false);
    });
  });

  // ========== createWhileLoopConfig ==========

  describe('createWhileLoopConfig', () => {
    it('should create config with correct type', () => {
      const evaluateCondition = () => true;
      const { config } = createWhileLoopConfig('expr', evaluateCondition, context);

      expect(config.type).toBe('while');
    });

    it('should initialize iteration context with condition expression', () => {
      const expr = { type: 'comparison' };
      const evaluateCondition = () => true;
      const { iterCtx } = createWhileLoopConfig(expr, evaluateCondition, context);

      expect(iterCtx.conditionExpr).toBe(expr);
      expect(iterCtx.index).toBe(0);
    });

    it('should set index variable name when provided', () => {
      const evaluateCondition = () => true;
      const { iterCtx } = createWhileLoopConfig('expr', evaluateCondition, context, 'i');

      expect(iterCtx.indexVariable).toBe('i');
    });

    it('should continue while condition evaluates to true', () => {
      let shouldContinue = true;
      const evaluateCondition = () => shouldContinue;
      const { config } = createWhileLoopConfig('expr', evaluateCondition, context);

      expect(config.shouldContinue({} as LoopIterationContext)).toBe(true);

      shouldContinue = false;
      expect(config.shouldContinue({} as LoopIterationContext)).toBe(false);
    });

    it('should pass condition expression and context to evaluateCondition', () => {
      const expr = { type: 'test' };
      const evaluateCondition = vi.fn().mockReturnValue(true);
      const { config } = createWhileLoopConfig(expr, evaluateCondition, context);

      config.shouldContinue({} as LoopIterationContext);

      expect(evaluateCondition).toHaveBeenCalledWith(expr, context);
    });
  });

  // ========== createUntilLoopConfig ==========

  describe('createUntilLoopConfig', () => {
    it('should create config with correct type', () => {
      const evaluateCondition = () => false;
      const { config } = createUntilLoopConfig('expr', evaluateCondition, context);

      expect(config.type).toBe('until');
    });

    it('should initialize iteration context with condition expression', () => {
      const expr = { type: 'comparison' };
      const evaluateCondition = () => false;
      const { iterCtx } = createUntilLoopConfig(expr, evaluateCondition, context);

      expect(iterCtx.conditionExpr).toBe(expr);
      expect(iterCtx.index).toBe(0);
    });

    it('should set index variable name when provided', () => {
      const evaluateCondition = () => false;
      const { iterCtx } = createUntilLoopConfig('expr', evaluateCondition, context, 'i');

      expect(iterCtx.indexVariable).toBe('i');
    });

    it('should continue while condition evaluates to false', () => {
      let conditionMet = false;
      const evaluateCondition = () => conditionMet;
      const { config } = createUntilLoopConfig('expr', evaluateCondition, context);

      // Condition false => continue (until means "continue until true")
      expect(config.shouldContinue({} as LoopIterationContext)).toBe(true);

      conditionMet = true;
      expect(config.shouldContinue({} as LoopIterationContext)).toBe(false);
    });

    it('should pass condition expression and context to evaluateCondition', () => {
      const expr = { type: 'test' };
      const evaluateCondition = vi.fn().mockReturnValue(false);
      const { config } = createUntilLoopConfig(expr, evaluateCondition, context);

      config.shouldContinue({} as LoopIterationContext);

      expect(evaluateCondition).toHaveBeenCalledWith(expr, context);
    });
  });

  // ========== createUntilEventLoopConfig ==========

  describe('createUntilEventLoopConfig', () => {
    it('should create config with correct type', () => {
      const target = document.createElement('div');
      const { config } = createUntilEventLoopConfig('click', target);

      expect(config.type).toBe('until-event');
    });

    it('should initialize iteration context with eventFired=false', () => {
      const target = document.createElement('div');
      const { iterCtx } = createUntilEventLoopConfig('click', target);

      expect(iterCtx.eventFired).toBe(false);
      expect(iterCtx.index).toBe(0);
    });

    it('should set index variable name when provided', () => {
      const target = document.createElement('div');
      const { iterCtx } = createUntilEventLoopConfig('click', target, 'i');

      expect(iterCtx.indexVariable).toBe('i');
    });

    it('should continue while event has not fired', () => {
      const target = document.createElement('div');
      const { config, iterCtx } = createUntilEventLoopConfig('click', target);

      expect(config.shouldContinue(iterCtx)).toBe(true);

      iterCtx.eventFired = true;
      expect(config.shouldContinue(iterCtx)).toBe(false);
    });

    it('should create eventSetup with correct event name and target', () => {
      const target = document.createElement('div');
      const { config } = createUntilEventLoopConfig('customEvent', target);

      expect(config.eventSetup).toBeDefined();
      expect(config.eventSetup?.eventName).toBe('customEvent');
      expect(config.eventSetup?.target).toBe(target);
    });

    it('should set eventFired to true when onEvent is called', () => {
      const target = document.createElement('div');
      const { config, iterCtx } = createUntilEventLoopConfig('click', target);

      expect(iterCtx.eventFired).toBe(false);

      config.eventSetup?.onEvent();

      expect(iterCtx.eventFired).toBe(true);
    });
  });

  // ========== createForeverLoopConfig ==========

  describe('createForeverLoopConfig', () => {
    it('should create config with correct type', () => {
      const { config } = createForeverLoopConfig();

      expect(config.type).toBe('forever');
    });

    it('should initialize iteration context', () => {
      const { iterCtx } = createForeverLoopConfig();

      expect(iterCtx.index).toBe(0);
    });

    it('should set index variable name when provided', () => {
      const { iterCtx } = createForeverLoopConfig('i');

      expect(iterCtx.indexVariable).toBe('i');
    });

    it('should always return true for shouldContinue', () => {
      const { config } = createForeverLoopConfig();

      expect(config.shouldContinue({} as LoopIterationContext)).toBe(true);
      expect(config.shouldContinue({ index: 999999 } as LoopIterationContext)).toBe(true);
    });

    it('should use default maxIterations of 10000', () => {
      const { config } = createForeverLoopConfig();

      expect(config.maxIterations).toBe(10000);
    });

    it('should allow custom maxIterations', () => {
      const { config } = createForeverLoopConfig(undefined, 50);

      expect(config.maxIterations).toBe(50);
    });
  });
});
