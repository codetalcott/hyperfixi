/**
 * Unit Tests for TellCommand
 *
 * Tests the TellCommand which executes commands in the context of target elements.
 * Verifies context switching (me/you), command dispatch (AST nodes, functions, objects),
 * multi-target iteration, error handling, and end-to-end integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TellCommand } from '../tell';
import type { TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// Mock element resolution helper
vi.mock('../../helpers/element-resolution', () => ({
  resolveElements: vi.fn((target: unknown, context: { me?: Element | null }) => {
    if (Array.isArray(target)) return target;
    if (target instanceof HTMLElement) return [target];
    if (typeof target === 'string' && target === 'me') return context.me ? [context.me] : [];
    return [];
  }),
}));

// ========== Test Utilities ==========

function createMockContext(overrides: Partial<TypedExecutionContext> = {}): TypedExecutionContext {
  const locals = new Map<string, unknown>();
  return {
    me: document.createElement('div'),
    you: null,
    it: null,
    result: null,
    locals,
    globals: new Map(),
    event: null,
    ...overrides,
  } as TypedExecutionContext;
}

function createMockEvaluator(
  evaluateFn?: (node: ASTNode, context: unknown) => Promise<unknown>
): ExpressionEvaluator {
  return {
    evaluate:
      evaluateFn ??
      (async (node: ASTNode) => {
        if (typeof node === 'object' && node !== null && 'value' in node) {
          return (node as unknown as { value: unknown }).value;
        }
        return node;
      }),
  } as unknown as ExpressionEvaluator;
}

// ========== Tests ==========

describe('TellCommand', () => {
  let command: TellCommand;

  beforeEach(() => {
    command = new TellCommand();
  });

  // ---------- 1. metadata ----------

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('tell');
    });

    it('should have description referencing context or target', () => {
      expect(command.metadata).toBeDefined();
      const desc = command.metadata.description.toLowerCase();
      expect(desc).toMatch(/context|target/);
    });

    it('should have syntax defined', () => {
      const syntax = command.metadata.syntax;
      const syntaxStr = Array.isArray(syntax) ? syntax.join(' ') : syntax;
      expect(syntaxStr).toContain('tell');
    });

    it('should declare sideEffects including context-switching and command-execution', () => {
      expect(command.metadata.sideEffects).toBeDefined();
      expect(command.metadata.sideEffects).toContain('context-switching');
      expect(command.metadata.sideEffects).toContain('command-execution');
    });
  });

  // ---------- 2. parseInput ----------

  describe('parseInput', () => {
    it('should throw when fewer than 2 args are provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow(/target.*command|at least/i);

      await expect(
        command.parseInput(
          { args: [{ type: 'identifier', value: '#sidebar' }], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow(/target.*command|at least/i);
    });

    it('should evaluate the first arg as the target', async () => {
      const targetEl = document.createElement('section');
      const evaluator = createMockEvaluator(async () => targetEl);
      const context = createMockContext();

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', value: '#sidebar' },
            { type: 'command', name: 'hide' },
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe(targetEl);
    });

    it('should capture remaining args as raw command nodes (not evaluated)', async () => {
      const targetEl = document.createElement('div');
      const evaluator = createMockEvaluator(async () => targetEl);
      const context = createMockContext();

      const cmdNode1 = { type: 'command', name: 'hide' } as ASTNode;
      const cmdNode2 = { type: 'command', name: 'add' } as ASTNode;

      const input = await command.parseInput(
        { args: [{ type: 'identifier', value: '#sidebar' }, cmdNode1, cmdNode2], modifiers: {} },
        evaluator,
        context
      );

      expect(input.commands).toHaveLength(2);
      expect(input.commands[0]).toBe(cmdNode1);
      expect(input.commands[1]).toBe(cmdNode2);
    });
  });

  // ---------- 3. execute - context switching ----------

  describe('execute - context switching', () => {
    it('should set me to the target element in the tell context', async () => {
      const targetEl = document.createElement('span');
      const originalMe = document.createElement('div');

      let capturedMe: unknown;
      const cmdFn = vi.fn(async (ctx: TypedExecutionContext) => {
        capturedMe = ctx.me;
        return 'done';
      });

      const context = createMockContext({ me: originalMe });

      await command.execute({ target: targetEl, commands: [cmdFn] }, context);

      expect(capturedMe).toBe(targetEl);
      // Original context unchanged
      expect(context.me).toBe(originalMe);
    });

    it('should set you to the target element in the tell context', async () => {
      const targetEl = document.createElement('span');

      let capturedYou: unknown;
      const cmdFn = vi.fn(async (ctx: TypedExecutionContext) => {
        capturedYou = ctx.you;
        return 'ok';
      });

      const context = createMockContext();

      await command.execute({ target: targetEl, commands: [cmdFn] }, context);

      expect(capturedYou).toBe(targetEl);
    });

    it('should execute command objects with .execute method', async () => {
      const targetEl = document.createElement('div');
      const executeSpy = vi.fn(async () => 'executed');
      const cmdObj = { execute: executeSpy };

      const context = createMockContext();

      const result = await command.execute({ target: targetEl, commands: [cmdObj] }, context);

      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(result.commandResults).toContain('executed');
    });

    it('should return targetElements and commandResults', async () => {
      const targetEl = document.createElement('article');
      const cmdFn = vi.fn(async () => 'result-value');

      const context = createMockContext();

      const result = await command.execute({ target: targetEl, commands: [cmdFn] }, context);

      expect(result.targetElements).toContain(targetEl);
      expect(result.commandResults).toEqual(['result-value']);
    });
  });

  // ---------- 4. execute - command types ----------

  describe('execute - command types', () => {
    it('should execute AST command nodes via _runtimeExecute', async () => {
      const targetEl = document.createElement('div');
      const runtimeExecute = vi.fn(async (_cmd: unknown, _ctx: unknown) => 'runtime-result');

      const locals = new Map<string, unknown>();
      locals.set('_runtimeExecute', runtimeExecute);
      const context = createMockContext({ locals });

      const astCmd = { type: 'command', name: 'hide' };

      const result = await command.execute({ target: targetEl, commands: [astCmd] }, context);

      expect(runtimeExecute).toHaveBeenCalledTimes(1);
      // First arg is the AST node
      expect(runtimeExecute.mock.calls[0][0]).toBe(astCmd);
      // Second arg is the tell context (me overridden to targetEl)
      expect((runtimeExecute.mock.calls[0][1] as TypedExecutionContext).me).toBe(targetEl);
      expect(result.commandResults).toEqual(['runtime-result']);
    });

    it('should execute function commands', async () => {
      const targetEl = document.createElement('div');
      const cmdFn = vi.fn(async (ctx: TypedExecutionContext) => {
        return `called-on-${(ctx.me as HTMLElement).tagName}`;
      });

      const context = createMockContext();

      const result = await command.execute({ target: targetEl, commands: [cmdFn] }, context);

      expect(cmdFn).toHaveBeenCalledTimes(1);
      expect(result.commandResults).toEqual(['called-on-DIV']);
    });

    it('should throw for invalid command types', async () => {
      const targetEl = document.createElement('div');
      const context = createMockContext();

      await expect(
        command.execute({ target: targetEl, commands: [42 as unknown] }, context)
      ).rejects.toThrow(/command execution failed|invalid command/i);
    });
  });

  // ---------- 5. execute - multiple targets ----------

  describe('execute - multiple targets', () => {
    it('should execute commands for each target element', async () => {
      const el1 = document.createElement('li');
      const el2 = document.createElement('li');
      const el3 = document.createElement('li');

      const capturedMeValues: unknown[] = [];
      const cmdFn = vi.fn(async (ctx: TypedExecutionContext) => {
        capturedMeValues.push(ctx.me);
        return 'ok';
      });

      const context = createMockContext();

      const result = await command.execute({ target: [el1, el2, el3], commands: [cmdFn] }, context);

      expect(cmdFn).toHaveBeenCalledTimes(3);
      expect(capturedMeValues).toEqual([el1, el2, el3]);
      expect(result.targetElements).toEqual([el1, el2, el3]);
    });

    it('should report executionCount = targets * commands', async () => {
      const el1 = document.createElement('p');
      const el2 = document.createElement('p');

      const cmdFn1 = vi.fn(async () => 'a');
      const cmdFn2 = vi.fn(async () => 'b');
      const cmdFn3 = vi.fn(async () => 'c');

      const context = createMockContext();

      const result = await command.execute(
        { target: [el1, el2], commands: [cmdFn1, cmdFn2, cmdFn3] },
        context
      );

      // 2 targets * 3 commands = 6
      expect(result.executionCount).toBe(6);
      expect(result.commandResults).toHaveLength(6);
    });
  });

  // ---------- 6. execute - error handling ----------

  describe('execute - error handling', () => {
    it('should throw when no target elements are found', async () => {
      const context = createMockContext();
      const cmdFn = vi.fn(async () => 'ok');

      // Pass a string that resolveElements mock returns [] for
      await expect(
        command.execute({ target: 'nonexistent-selector', commands: [cmdFn] }, context)
      ).rejects.toThrow(/no target elements/i);
    });

    it('should throw when a command execution fails', async () => {
      const targetEl = document.createElement('div');
      const failingCmd = vi.fn(async () => {
        throw new Error('inner command broke');
      });

      const context = createMockContext();

      await expect(
        command.execute({ target: targetEl, commands: [failingCmd] }, context)
      ).rejects.toThrow(/command execution failed.*inner command broke/i);
    });
  });

  // ---------- 7. execute - it propagation ----------

  describe('execute - it propagation between commands', () => {
    it('should set tellContext.it to the result of each command', async () => {
      const targetEl = document.createElement('div');

      let capturedIt: unknown;
      const cmd1 = vi.fn(async () => 'first-result');
      const cmd2 = vi.fn(async (ctx: TypedExecutionContext) => {
        capturedIt = ctx.it;
        return 'second-result';
      });

      const context = createMockContext();

      await command.execute({ target: targetEl, commands: [cmd1, cmd2] }, context);

      // cmd2 should see the result of cmd1 as 'it'
      expect(capturedIt).toBe('first-result');
    });
  });

  // ---------- 8. integration ----------

  describe('integration', () => {
    it('should work end-to-end with a single target', async () => {
      const targetEl = document.createElement('button');
      const evaluator = createMockEvaluator(async () => targetEl);

      const cmdNode = { type: 'command', name: 'add' } as ASTNode;
      const runtimeExecute = vi.fn(async () => 'added');

      const locals = new Map<string, unknown>();
      locals.set('_runtimeExecute', runtimeExecute);
      const context = createMockContext({ locals });

      // 1. parseInput
      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', value: '#btn' }, cmdNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe(targetEl);
      expect(input.commands).toHaveLength(1);

      // 2. execute
      const result = await command.execute(input, context);

      expect(runtimeExecute).toHaveBeenCalledTimes(1);
      expect(result.targetElements).toContain(targetEl);
      expect(result.commandResults).toEqual(['added']);
      expect(result.executionCount).toBe(1);
    });

    it('should work end-to-end with multiple commands on multiple targets', async () => {
      const el1 = document.createElement('li');
      const el2 = document.createElement('li');
      const targets = [el1, el2];

      const evaluator = createMockEvaluator(async () => targets);

      const cmdA = { type: 'command', name: 'add' } as ASTNode;
      const cmdB = { type: 'command', name: 'remove' } as ASTNode;

      const runtimeExecute = vi.fn(async (_cmd: unknown, ctx: TypedExecutionContext) => {
        return `executed-on-${(ctx.me as HTMLElement).tagName}`;
      });

      const locals = new Map<string, unknown>();
      locals.set('_runtimeExecute', runtimeExecute);
      const context = createMockContext({ locals });

      // 1. parseInput
      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', value: '.items' }, cmdA, cmdB],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.commands).toHaveLength(2);

      // 2. execute
      const result = await command.execute(input, context);

      // 2 targets * 2 commands = 4 executions
      expect(runtimeExecute).toHaveBeenCalledTimes(4);
      expect(result.executionCount).toBe(4);
      expect(result.targetElements).toEqual([el1, el2]);
      expect(result.commandResults).toHaveLength(4);
    });
  });
});
