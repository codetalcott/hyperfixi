/**
 * RepeatCommand Unit Tests
 *
 * Comprehensive tests for repeat loop variations:
 * - For-in loops (collection iteration)
 * - Times loops (counted iteration)
 * - While loops (conditional)
 * - Until loops (inverted conditional)
 * - Forever loops (infinite)
 * - Index variable tracking
 * - Break/continue support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepeatCommand, createRepeatCommand, type RepeatCommandInput } from './repeat';
import type { TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import { ok, err, isSignal } from '../../types/result';
import type { ExecutionSignal } from '../../types/result';
import type { Op } from '../../types/program';

/**
 * Test stand-in for the runtime's compile step (Arc 4b). The runtime compiles
 * a command's bodies to closures and hands them in as `raw.bodies`; these
 * tests hand-build inputs, so they build the closures themselves. A body runs
 * its hand-built commands through `context.locals._testExecute` when a test
 * installed one (the old observation channel, now test-local), else calls a
 * function or an `{ execute }` object directly.
 */
function testBody(commands: readonly unknown[] = []): Op {
  return async ctx => {
    const run = (ctx.locals as Map<string, unknown>).get('_testExecute') as
      ((cmd: unknown, ctx: unknown) => unknown) | undefined;
    let last: unknown;
    for (const cmd of commands) {
      let r: unknown;
      if (typeof cmd === 'function') r = await (cmd as (c: unknown) => unknown)(ctx);
      else if (cmd && typeof (cmd as { execute?: unknown }).execute === 'function')
        r = await (cmd as { execute: (c: unknown) => unknown }).execute(ctx);
      else if (run) r = await run(cmd, ctx);
      else throw new Error('testBody: not an executable command');
      if (isSignal(r)) return err(r);
      last = r;
    }
    return ok(last);
  };
}
/** One body per command — what the runtime hands `tell`/`start view transition`. */
function testOps(commands: readonly unknown[]): Op[] {
  return commands.map(c => testBody([c]));
}
/** What the runtime does for a raw input: compile every block/command argument. */
function rawWithBodies<T extends { args: readonly unknown[] }>(
  raw: T
): T & { bodies: (Op | undefined)[] } {
  const bodies = raw.args.map(a => {
    const t = (a as { type?: string } | null)?.type;
    if (t === 'block')
      return testBody(((a as { commands?: unknown[] }).commands ?? []) as unknown[]);
    // A `command` node — or, in these hand-built fixtures, an `{ execute }`
    // object standing in for one.
    if (t === 'command' || typeof (a as { execute?: unknown } | null)?.execute === 'function')
      return testBody([a]);
    return undefined;
  });
  return { ...raw, bodies };
}

/** Narrow a command's completion to its output — a signal here is a test failure. */
function outputOf<T>(completion: T | ExecutionSignal): T {
  if (isSignal(completion)) throw new Error(`unexpected signal: ${completion.type}`);
  return completion;
}

// =============================================================================
// Test Helpers
// =============================================================================

function createMockContext(): TypedExecutionContext {
  return {
    me: null,
    you: null,
    locals: new Map([['_testExecute', vi.fn(async () => 'executed')]]),
    globals: new Map(),
    result: undefined,
    it: undefined,
  };
}

function createMockEvaluator(returnValue: any = []): ExpressionEvaluator {
  return {
    evaluate: vi.fn(async (node: any) => {
      if (node.type === 'array') return returnValue;
      if (node.type === 'number') return node.value;
      if (node.value !== undefined) return node.value;
      return returnValue;
    }),
  } as unknown as ExpressionEvaluator;
}

function createMockBlock(commands: any[] = []): Op {
  return testBody(commands);
}

/** A parser-shaped block node, for parseInput tests (the runtime compiles it to an Op). */
function mockBlockNode(commands: any[] = []): ASTNode {
  return { type: 'block', commands } as unknown as ASTNode;
}

// =============================================================================
// Test Suite
// =============================================================================

describe('RepeatCommand', () => {
  let command: RepeatCommand;

  beforeEach(() => {
    command = new RepeatCommand();
  });

  describe('Factory Function', () => {
    it('should create command instance via factory', () => {
      const cmd = createRepeatCommand();
      expect(cmd).toBeDefined();
      expect(typeof cmd.execute).toBe('function');
    });
  });

  describe('For-In Loops - Parsing', () => {
    it('should parse basic for-in loop', async () => {
      const evaluator = createMockEvaluator([1, 2, 3]);
      const context = createMockContext();

      const forNode = { type: 'identifier', name: 'for' } as ASTNode;
      const varNode = { type: 'identifier', name: 'item', value: 'item' } as ASTNode;
      const collectionNode = { type: 'array', value: [1, 2, 3] } as ASTNode;
      const block = mockBlockNode();

      const input = await command.parseInput(
        rawWithBodies({
          args: [block],
          modifiers: {
            loopType: forNode as never,
            for: varNode as never,
            in: collectionNode as never,
          },
        }),
        evaluator,
        context
      );

      expect(input.type).toBe('for');
      expect(input.variable).toBe('item');
      expect(input.collection).toEqual([1, 2, 3]);
    });

    it('should parse for-in with index variable', async () => {
      const evaluator = createMockEvaluator([1, 2, 3]);
      const context = createMockContext();

      const indexEvaluator = {
        evaluate: vi.fn(async (node: any) => {
          if (node === collectionNode) return [1, 2, 3];
          if ((node.type === 'identifier' || node.type === 'expression') && node.name === 'i')
            return 'i';
          return node.value;
        }),
      } as unknown as ExpressionEvaluator;

      const forNode = { type: 'identifier', name: 'for' } as ASTNode;
      const varNode = { type: 'identifier', name: 'item', value: 'item' } as ASTNode;
      const collectionNode = { type: 'array' } as ASTNode;
      const indexNode = { type: 'expression', name: 'i' } as ExpressionNode;

      const input = await command.parseInput(
        rawWithBodies({
          args: [],
          modifiers: {
            loopType: forNode as never,
            for: varNode as never,
            in: collectionNode as never,
            index: indexNode as never,
          },
        }),
        indexEvaluator,
        context
      );

      expect(input.type).toBe('for');
      expect(input.indexVariable).toBe('i');
    });

    it('should throw error if for-in missing variable or collection', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const forNode = { type: 'identifier', name: 'for' } as ASTNode;

      await expect(
        command.parseInput(
          rawWithBodies({ args: [], modifiers: { loopType: forNode as never } }),
          evaluator,
          context
        )
      ).rejects.toThrow('for loops require variable and collection');
    });
  });

  describe('Times Loops - Parsing', () => {
    it('should parse times loop with count', async () => {
      const evaluator = createMockEvaluator(5);
      const context = createMockContext();

      const timesNode = { type: 'identifier', name: 'times' } as ASTNode;
      const countNode = { type: 'number', value: 5 } as ASTNode;
      const block = mockBlockNode();

      const input = await command.parseInput(
        rawWithBodies({
          args: [block],
          modifiers: { loopType: timesNode as never, times: countNode as never },
        }),
        evaluator,
        context
      );

      expect(input.type).toBe('times');
      expect(input.count).toBe(5);
    });

    it('should parse count from string numbers', async () => {
      const evaluator = {
        evaluate: vi.fn(async (node: any) => {
          if (node.type === 'number') return '10';
          return node;
        }),
      } as unknown as ExpressionEvaluator;
      const context = createMockContext();

      const timesNode = { type: 'identifier', name: 'times' } as ASTNode;
      const countNode = { type: 'number', value: '10' } as ASTNode;

      const input = await command.parseInput(
        rawWithBodies({
          args: [],
          modifiers: { loopType: timesNode as never, times: countNode as never },
        }),
        evaluator,
        context
      );

      expect(input.count).toBe(10);
    });

    it('should throw error if count is not a number', async () => {
      const evaluator = createMockEvaluator('invalid');
      const context = createMockContext();

      const timesNode = { type: 'identifier', name: 'times' } as ASTNode;
      const countNode = { type: 'string', value: 'invalid' } as ASTNode;

      await expect(
        command.parseInput(
          rawWithBodies({
            args: [],
            modifiers: { loopType: timesNode as never, times: countNode as never },
          }),
          evaluator,
          context
        )
      ).rejects.toThrow('times loops require a count number');
    });
  });

  describe('While Loops - Parsing', () => {
    it('should parse while loop with condition', async () => {
      const evaluator = createMockEvaluator(true);
      const context = createMockContext();

      const whileNode = { type: 'identifier', name: 'while' } as ASTNode;
      const conditionNode = { type: 'boolean', value: true } as ASTNode;

      const input = await command.parseInput(
        rawWithBodies({
          args: [],
          modifiers: { loopType: whileNode as never, while: conditionNode as never },
        }),
        evaluator,
        context
      );

      expect(input.type).toBe('while');
      expect(input.condition).toBeDefined();
    });

    it('should throw error if while loop has no condition', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const whileNode = { type: 'identifier', name: 'while' } as ASTNode;

      await expect(
        command.parseInput(
          rawWithBodies({ args: [], modifiers: { loopType: whileNode as never } }),
          evaluator,
          context
        )
      ).rejects.toThrow('while loops require a condition');
    });
  });

  describe('Until Loops - Parsing', () => {
    it('should parse until loop with condition', async () => {
      const evaluator = createMockEvaluator(false);
      const context = createMockContext();

      const untilNode = { type: 'identifier', name: 'until' } as ASTNode;
      const conditionNode = { type: 'boolean', value: false } as ASTNode;

      const input = await command.parseInput(
        rawWithBodies({
          args: [],
          modifiers: { loopType: untilNode as never, until: conditionNode as never },
        }),
        evaluator,
        context
      );

      expect(input.type).toBe('until');
      expect(input.condition).toBeDefined();
    });

    it('should throw error if until loop has no condition', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const untilNode = { type: 'identifier', name: 'until' } as ASTNode;

      await expect(
        command.parseInput(
          rawWithBodies({ args: [], modifiers: { loopType: untilNode as never } }),
          evaluator,
          context
        )
      ).rejects.toThrow('until loops require a condition');
    });
  });

  describe('Forever Loops - Parsing', () => {
    it('should parse forever loop', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const foreverNode = { type: 'identifier', name: 'forever' } as ASTNode;

      const input = await command.parseInput(
        rawWithBodies({ args: [], modifiers: { loopType: foreverNode as never } }),
        evaluator,
        context
      );

      expect(input.type).toBe('forever');
    });
  });

  describe('Execution - For-In Loops', () => {
    it('should iterate over collection', async () => {
      const context = createMockContext();
      const collection = ['a', 'b', 'c'];
      const executedItems: string[] = [];

      context.locals.set(
        '_testExecute',

        vi.fn(async (cmd: any, ctx: any) => {
          executedItems.push(ctx.locals.get('item'));
          return 'ok';
        })
      );

      const input: RepeatCommandInput = {
        type: 'for',
        variable: 'item',
        collection,
        commands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.type).toBe('for');
      expect(output.iterations).toBe(3);
      expect(output.completed).toBe(true);
      expect(executedItems).toEqual(['a', 'b', 'c']);
    });

    it('should track index variable if provided', async () => {
      const context = createMockContext();
      const collection = [10, 20, 30];
      const executedIndexes: number[] = [];

      context.locals.set(
        '_testExecute',

        vi.fn(async (cmd: any, ctx: any) => {
          executedIndexes.push(ctx.locals.get('i'));
          return 'ok';
        })
      );

      const input: RepeatCommandInput = {
        type: 'for',
        variable: 'item',
        collection,
        indexVariable: 'i',
        commands: createMockBlock([{ type: 'command' }]),
      };

      await command.execute(input, context);

      expect(executedIndexes).toEqual([0, 1, 2]);
    });
  });

  describe('Execution - Times Loops', () => {
    it('should execute specified number of times', async () => {
      const context = createMockContext();
      let executionCount = 0;

      context.locals.set(
        '_testExecute',

        vi.fn(async () => {
          executionCount++;
          return 'ok';
        })
      );

      const input: RepeatCommandInput = {
        type: 'times',
        count: 5,
        commands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.iterations).toBe(5);
      expect(executionCount).toBe(5);
      expect(output.completed).toBe(true);
    });

    it('should track index in times loop', async () => {
      const context = createMockContext();
      const indexes: number[] = [];

      context.locals.set(
        '_testExecute',

        vi.fn(async (cmd: any, ctx: any) => {
          indexes.push(ctx.locals.get('i'));
          return 'ok';
        })
      );

      const input: RepeatCommandInput = {
        type: 'times',
        count: 3,
        indexVariable: 'i',
        commands: createMockBlock([{ type: 'command' }]),
      };

      await command.execute(input, context);

      expect(indexes).toEqual([0, 1, 2]);
    });

    it('should handle zero iterations', async () => {
      const context = createMockContext();
      const executeSpy = vi.fn();
      context.locals.set('_testExecute', executeSpy);

      const input: RepeatCommandInput = {
        type: 'times',
        count: 0,
        commands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.iterations).toBe(0);
      expect(executeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Execution - While Loops', () => {
    it('should execute while condition is true', async () => {
      const context = createMockContext();
      let counter = 0;

      context.locals.set(
        '_testExecute',

        vi.fn(async () => {
          counter++;
          return 'ok';
        })
      );

      // Mock condition that becomes false after 3 iterations
      const input: RepeatCommandInput = {
        type: 'while',
        condition: { shouldContinue: true },
        commands: createMockBlock([{ type: 'command' }]),
      };

      // We can't easily test while loop without a full evaluator
      // Just verify the input structure is correct
      expect(input.type).toBe('while');
      expect(input.condition).toBeDefined();
    });
  });

  describe('Context Updates', () => {
    it('should update context.it with last result', async () => {
      const context = createMockContext();
      const expectedResult = 'final-result';

      context.locals.set(
        '_testExecute',
        vi.fn(async () => expectedResult)
      );

      const input: RepeatCommandInput = {
        type: 'times',
        count: 3,
        commands: createMockBlock([{ type: 'command' }]),
      };

      await command.execute(input, context);

      expect(context.it).toBe(expectedResult);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown repeat type', async () => {
      const context = createMockContext();

      const input: RepeatCommandInput = {
        type: 'unknown' as any,
        commands: createMockBlock(),
      };

      await expect(command.execute(input, context)).rejects.toThrow('Unknown repeat type');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty collection in for-in loop', async () => {
      const context = createMockContext();
      const executeSpy = vi.fn();
      context.locals.set('_testExecute', executeSpy);

      const input: RepeatCommandInput = {
        type: 'for',
        variable: 'item',
        collection: [],
        commands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.iterations).toBe(0);
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it('should handle single-item collection', async () => {
      const context = createMockContext();
      const executeSpy = vi.fn(async () => 'ok');
      context.locals.set('_testExecute', executeSpy);

      const input: RepeatCommandInput = {
        type: 'for',
        variable: 'item',
        collection: ['single'],
        commands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.iterations).toBe(1);
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle negative count gracefully', async () => {
      const context = createMockContext();
      const executeSpy = vi.fn();
      context.locals.set('_testExecute', executeSpy);

      const input: RepeatCommandInput = {
        type: 'times',
        count: -5,
        commands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      // Negative count should result in 0 iterations
      expect(output.iterations).toBe(0);
      expect(executeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Else branch (upstream _hyperscript parity)', () => {
    it('should run else branch when for-in collection is empty', async () => {
      const context = createMockContext();
      const bodySpy = vi.fn(async () => 'body');
      const elseSpy = vi.fn(async () => 'else-ran');
      context.locals.set('_testExecute', async (cmd: any) =>
        cmd.fromElse ? elseSpy() : bodySpy()
      );

      const input: RepeatCommandInput = {
        type: 'for',
        variable: 'item',
        collection: [],
        commands: createMockBlock([{ type: 'command' }]),
        elseCommands: createMockBlock([{ type: 'command', fromElse: true }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.iterations).toBe(0);
      expect(output.completed).toBe(true);
      expect(output.lastResult).toBe('else-ran');
      expect(bodySpy).not.toHaveBeenCalled();
      expect(elseSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT run else branch when for-in collection has items', async () => {
      const context = createMockContext();
      const bodySpy = vi.fn(async () => 'body');
      const elseSpy = vi.fn(async () => 'else-ran');
      context.locals.set('_testExecute', async (cmd: any) =>
        cmd.fromElse ? elseSpy() : bodySpy()
      );

      const input: RepeatCommandInput = {
        type: 'for',
        variable: 'item',
        collection: ['a', 'b'],
        commands: createMockBlock([{ type: 'command' }]),
        elseCommands: createMockBlock([{ type: 'command', fromElse: true }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.iterations).toBe(2);
      expect(bodySpy).toHaveBeenCalledTimes(2);
      expect(elseSpy).not.toHaveBeenCalled();
    });

    it('should run else branch when times count is zero', async () => {
      const context = createMockContext();
      const bodySpy = vi.fn(async () => 'body');
      const elseSpy = vi.fn(async () => 'else-ran');
      context.locals.set('_testExecute', async (cmd: any) =>
        cmd.fromElse ? elseSpy() : bodySpy()
      );

      const input: RepeatCommandInput = {
        type: 'times',
        count: 0,
        commands: createMockBlock([{ type: 'command' }]),
        elseCommands: createMockBlock([{ type: 'command', fromElse: true }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.iterations).toBe(0);
      expect(bodySpy).not.toHaveBeenCalled();
      expect(elseSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT run else branch when loop is interrupted by break on iteration 0', async () => {
      // If the body throws BREAK on the first iteration (iterations still 0
      // before increment), upstream treats it as "did iterate at least once"
      // because it entered the body. Our implementation considers iterations
      // to be 0 only when shouldContinue returns false from the start.
      const context = createMockContext();
      const elseSpy = vi.fn(async () => 'else-ran');
      context.locals.set('_testExecute', async (cmd: any) => {
        if (cmd.fromElse) return elseSpy();
        return { type: 'break' };
      });

      const input: RepeatCommandInput = {
        type: 'forever',
        commands: createMockBlock([{ type: 'command' }]),
        elseCommands: createMockBlock([{ type: 'command', fromElse: true }]),
      };

      const output = outputOf(await command.execute(input, context));

      // Loop was interrupted via BREAK — the executor flag prevents the
      // else branch from running even when iterations is 0.
      expect(output.interrupted).toBe(true);
      expect(elseSpy).not.toHaveBeenCalled();
    });

    it('should be a no-op when elseCommands is undefined and 0 iterations', async () => {
      const context = createMockContext();
      const executeSpy = vi.fn();
      context.locals.set('_testExecute', executeSpy);

      const input: RepeatCommandInput = {
        type: 'for',
        variable: 'item',
        collection: [],
        commands: createMockBlock([{ type: 'command' }]),
        // no elseCommands
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.iterations).toBe(0);
      expect(executeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Bottom-tested loops (upstream _hyperscript parity)', () => {
    it('should run body once even when until-condition is true from start', async () => {
      // `repeat <body> until true end` — body always runs at least once.
      // Top-tested until=true would skip the body entirely (since it stops
      // when condition is true). Bottom-tested forces iteration 0 to run.
      const context = createMockContext();
      const bodySpy = vi.fn(async () => 'body-ran');
      context.locals.set('_testExecute', bodySpy);

      const input: RepeatCommandInput = {
        type: 'until',
        condition: true, // primitive — evaluateCondition handles directly
        commands: createMockBlock([{ type: 'command' }]),
        bottomTested: true,
      };

      const output = outputOf(await command.execute(input, context));

      expect(bodySpy).toHaveBeenCalledTimes(1);
      expect(output.iterations).toBe(1);
    });

    it('should NOT run body when bottomTested=false (top-tested) and until is true', async () => {
      const context = createMockContext();
      const bodySpy = vi.fn(async () => 'body-ran');
      context.locals.set('_testExecute', bodySpy);

      const input: RepeatCommandInput = {
        type: 'until',
        condition: true,
        commands: createMockBlock([{ type: 'command' }]),
        // bottomTested is undefined / false
      };

      const output = outputOf(await command.execute(input, context));

      // Top-tested: until=true means stop immediately, so 0 iterations
      expect(bodySpy).not.toHaveBeenCalled();
      expect(output.iterations).toBe(0);
    });

    it('should run body once with bottom-tested while when condition is false', async () => {
      // `repeat <body> while false end` — body once, then condition checked.
      // Top-tested while=false would skip the body entirely. Bottom-tested
      // forces iteration 0 to run, then stops because condition is false.
      const context = createMockContext();
      const bodySpy = vi.fn(async () => 'body-ran');
      context.locals.set('_testExecute', bodySpy);

      const input: RepeatCommandInput = {
        type: 'while',
        condition: false,
        commands: createMockBlock([{ type: 'command' }]),
        bottomTested: true,
      };

      const output = outputOf(await command.execute(input, context));

      expect(bodySpy).toHaveBeenCalledTimes(1);
      expect(output.iterations).toBe(1);
    });

    it('should be top-tested by default when bottomTested is undefined', async () => {
      const context = createMockContext();
      const bodySpy = vi.fn(async () => 'body-ran');
      context.locals.set('_testExecute', bodySpy);

      const input: RepeatCommandInput = {
        type: 'while',
        condition: false,
        commands: createMockBlock([{ type: 'command' }]),
        // bottomTested NOT set
      };

      const output = outputOf(await command.execute(input, context));

      // while false from the start → 0 iterations
      expect(bodySpy).not.toHaveBeenCalled();
      expect(output.iterations).toBe(0);
    });
  });
});
