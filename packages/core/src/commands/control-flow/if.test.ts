/**
 * ConditionalCommand (if/unless) Unit Tests
 *
 * Comprehensive tests for if/unless conditional execution:
 * - Basic if/else conditions
 * - Unless mode (inverted logic)
 * - Condition evaluation
 * - Branch execution tracking
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConditionalCommand, createConditionalCommand, type ConditionalCommandInput } from './if';
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
    halted: false,
    it: undefined,
  };
}

function createMockEvaluator(returnValue: any = true): ExpressionEvaluator {
  return {
    evaluate: vi.fn(async () => returnValue),
  } as unknown as ExpressionEvaluator;
}

function createMockBlock(commands: any[] = []): Op {
  return testBody(commands);
}

/** A parser-shaped block node, for parseInput tests (the runtime compiles it to an Op). */
function mockBlockNode(commands: any[] = []): ExpressionNode {
  return { type: 'block', commands } as unknown as ExpressionNode;
}

// =============================================================================
// Test Suite
// =============================================================================

describe('ConditionalCommand', () => {
  let command: ConditionalCommand;

  beforeEach(() => {
    command = new ConditionalCommand();
  });

  describe('Factory Function', () => {
    it('should create command instance via factory', () => {
      const cmd = createConditionalCommand();
      expect(cmd).toBeDefined();
      expect(typeof cmd.execute).toBe('function');
    });
  });

  describe('If Mode - Parsing', () => {
    it('should parse basic if condition with then branch', async () => {
      const evaluator = createMockEvaluator(true);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: true } as ASTNode;
      const thenBlock = mockBlockNode([{ type: 'command' }]);

      const input = await command.parseInput(
        rawWithBodies({ args: [conditionNode, thenBlock], modifiers: {}, commandName: 'if' }),
        evaluator,
        context
      );

      expect(input.mode).toBe('if');
      expect(input.condition).toBe(true);
      expect(input.thenCommands).toBeDefined();
    });

    it('should parse if-else with both branches', async () => {
      const evaluator = createMockEvaluator(false);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: false } as ASTNode;
      const thenBlock = mockBlockNode([{ type: 'command', name: 'then-cmd' }]);
      const elseBlock = mockBlockNode([{ type: 'command', name: 'else-cmd' }]);

      const input = await command.parseInput(
        rawWithBodies({
          args: [conditionNode, thenBlock, elseBlock],
          modifiers: {},
          commandName: 'if',
        }),
        evaluator,
        context
      );

      expect(input.mode).toBe('if');
      expect(input.thenCommands).toBeDefined();
      expect(input.elseCommands).toBeDefined();
    });

    it('should throw error if no condition provided', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      await expect(
        command.parseInput(
          rawWithBodies({ args: [], modifiers: {}, commandName: 'if' }),
          evaluator,
          context
        )
      ).rejects.toThrow('if command requires a condition');
    });

    it('should throw error if no then branch provided', async () => {
      const evaluator = createMockEvaluator(true);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: true } as ASTNode;

      await expect(
        command.parseInput(
          rawWithBodies({ args: [conditionNode], modifiers: {}, commandName: 'if' }),
          evaluator,
          context
        )
      ).rejects.toThrow('if command requires "then" branch');
    });
  });

  describe('Unless Mode - Parsing', () => {
    it('should parse unless command with inverted logic', async () => {
      const evaluator = createMockEvaluator(false);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: false } as ASTNode;
      const commandNode = { type: 'command', name: 'show' } as ASTNode;

      const input = await command.parseInput(
        rawWithBodies({ args: [conditionNode, commandNode], modifiers: {}, commandName: 'unless' }),
        evaluator,
        context
      );

      expect(input.mode).toBe('unless');
      expect(input.condition).toBe(false);
      // args[1] verbatim — the parser wraps every unless body in one block
      // node there, same as if. The old slice(1) array shape is what made
      // unless bodies silently unexecutable (see unless.test.ts end-to-end).
      expect(input.thenCommands).toBeTypeOf('function');
    });

    it('should throw error if unless has no commands', async () => {
      const evaluator = createMockEvaluator(true);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: true } as ASTNode;

      await expect(
        command.parseInput(
          rawWithBodies({ args: [conditionNode], modifiers: {}, commandName: 'unless' }),
          evaluator,
          context
        )
      ).rejects.toThrow('unless command requires a condition and at least one command');
    });
  });

  describe('Execution - If Mode', () => {
    it('should execute then branch when condition is true', async () => {
      const context = createMockContext();
      const mockExecute = vi.fn(async () => 'then-result');
      context.locals.set('_testExecute', mockExecute);

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: true,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.mode).toBe('if');
      expect(output.conditionResult).toBe(true);
      expect(output.executedBranch).toBe('then');
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should execute else branch when condition is false', async () => {
      const context = createMockContext();
      const mockExecute = vi.fn(async () => 'else-result');
      context.locals.set('_testExecute', mockExecute);

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: false,
        thenCommands: createMockBlock([{ type: 'command', name: 'then' }]),
        elseCommands: createMockBlock([{ type: 'command', name: 'else' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.mode).toBe('if');
      expect(output.conditionResult).toBe(false);
      expect(output.executedBranch).toBe('else');
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should execute neither branch when condition is false and no else', async () => {
      const context = createMockContext();

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: false,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.conditionResult).toBe(false);
      expect(output.executedBranch).toBe('none');
    });

    it('should evaluate truthy values as true', async () => {
      const context = createMockContext();

      const truthyValues = [1, 'non-empty', {}, [], -1];

      for (const value of truthyValues) {
        const input: ConditionalCommandInput = {
          mode: 'if',
          condition: value,
          thenCommands: createMockBlock(),
        };

        const output = outputOf(await command.execute(input, context));
        expect(output.conditionResult).toBe(true);
        expect(output.executedBranch).toBe('then');
      }
    });

    it('should evaluate falsy values as false', async () => {
      const context = createMockContext();

      const falsyValues = [0, '', null, undefined, false];

      for (const value of falsyValues) {
        const input: ConditionalCommandInput = {
          mode: 'if',
          condition: value,
          thenCommands: createMockBlock(),
        };

        const output = outputOf(await command.execute(input, context));
        expect(output.conditionResult).toBe(false);
        expect(output.executedBranch).toBe('none');
      }
    });
  });

  describe('Execution - Unless Mode', () => {
    it('should execute commands when condition is false (inverted logic)', async () => {
      const context = createMockContext();
      const mockExecute = vi.fn(async () => 'result');
      context.locals.set('_testExecute', mockExecute);

      const input: ConditionalCommandInput = {
        mode: 'unless',
        condition: false,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.conditionResult).toBe(false);
      expect(output.executedBranch).toBe('then');
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should NOT execute commands when condition is true', async () => {
      const context = createMockContext();
      const mockExecute = vi.fn();
      context.locals.set('_testExecute', mockExecute);

      const input: ConditionalCommandInput = {
        mode: 'unless',
        condition: true,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.conditionResult).toBe(true);
      expect(output.executedBranch).toBe('none');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should leave context.it alone in unless mode (parity with if)', async () => {
      // The unless-only `Object.assign(context, { it })` is gone — it existed
      // only to propagate the body's last result, and in practice propagated
      // the UNEXECUTED body node (the args.slice(1) bug). `if` never assigned
      // `it` here; the body's own commands do. The body result still surfaces
      // on the command output.
      const context = createMockContext();
      const expectedResult = 'unless-result';
      context.locals.set(
        '_testExecute',
        vi.fn(async () => expectedResult)
      );

      const input: ConditionalCommandInput = {
        mode: 'unless',
        condition: false,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.result).toBe(expectedResult);
      expect(context.it).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty blocks', async () => {
      const context = createMockContext();

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: true,
        thenCommands: createMockBlock([]),
      };

      const output = outputOf(await command.execute(input, context));
      expect(output.executedBranch).toBe('then');
    });

    it('should handle complex condition expressions', async () => {
      const context = createMockContext();
      context.locals.set('x', 10);
      context.locals.set('y', 5);

      // Simulate a complex condition (x > y)
      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: 10 > 5,
        thenCommands: createMockBlock(),
      };

      const output = outputOf(await command.execute(input, context));
      expect(output.conditionResult).toBe(true);
      expect(output.executedBranch).toBe('then');
    });

    it('should handle array of commands', async () => {
      const context = createMockContext();

      const cmd1 = { type: 'command', execute: vi.fn(async () => 'cmd1') } as ASTNode;
      const cmd2 = { type: 'command', execute: vi.fn(async () => 'cmd2') } as ASTNode;

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: true,
        thenCommands: createMockBlock([cmd1, cmd2]),
      };

      const output = outputOf(await command.execute(input, context));

      expect(output.executedBranch).toBe('then');
      expect(cmd1.execute).toHaveBeenCalled();
      expect(cmd2.execute).toHaveBeenCalled();
    });
  });

  describe('Return Values', () => {
    it('should return result from then branch', async () => {
      const context = createMockContext();
      const expectedResult = { value: 42 };
      context.locals.set(
        '_testExecute',
        vi.fn(async () => expectedResult)
      );

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: true,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));
      expect(output.result).toBe(expectedResult);
    });

    it('should return result from else branch', async () => {
      const context = createMockContext();
      const expectedResult = { value: 99 };
      context.locals.set(
        '_testExecute',
        vi.fn(async () => expectedResult)
      );

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: false,
        thenCommands: createMockBlock(),
        elseCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = outputOf(await command.execute(input, context));
      expect(output.result).toBe(expectedResult);
    });
  });
});
