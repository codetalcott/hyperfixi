/**
 * Unit Tests for UnlessCommand
 *
 * Tests the unless command which is a re-export of ConditionalCommand from if.ts.
 * The key behavior for "unless" mode:
 * - parseInput detects mode from raw.commandName: if commandName === 'unless' -> mode='unless'
 * - In unless mode: requires condition + at least one command (args.length >= 2),
 *   thenCommands = args[1] — the parser's single block node, exactly as `if`
 *   (a stray else block at args[2] is ignored; unless has no else)
 * - execute: evaluateCondition gets rawConditionResult, then
 *   shouldExecuteThen = !rawConditionResult (inverted for unless)
 * - When shouldExecuteThen=true, executes the commands; `it` is left to the
 *   body's own commands (parity with if — no unless-only self-assign)
 * - No else branch support for unless
 *
 * The mock-based sections feed parseInput/execute hand-built inputs; the
 * end-to-end describe at the bottom goes through the REAL parser and runtime,
 * because mock-only coverage is how the body-never-executes bug survived.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnlessCommand } from '../unless';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';
import { ok, err, isSignal } from '../../../types/result';
import type { ExecutionSignal } from '../../../types/result';
import type { Op } from '../../../types/program';

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

// ========== Test Utilities ==========

function createMockContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext & TypedExecutionContext {
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
    ...overrides,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(returnValue?: unknown): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (returnValue !== undefined) {
        return returnValue;
      }
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

function createMockCommand(result: unknown) {
  return {
    execute: vi.fn().mockResolvedValue(result),
  };
}

// ========== Tests ==========

describe('UnlessCommand', () => {
  let command: UnlessCommand;

  beforeEach(() => {
    command = new UnlessCommand();
  });

  // ---------- 1. metadata ----------

  describe('metadata', () => {
    it('should have command name "if" (since it is a re-export of ConditionalCommand)', () => {
      expect(command.name).toBe('if');
    });

    it('should have metadata defined with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description).toBeTruthy();
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should include "unless" in aliases', () => {
      expect(command.metadata.aliases).toContain('unless');
    });

    it('should have conditional-execution in sideEffects', () => {
      expect(command.metadata.sideEffects).toContain('conditional-execution');
    });
  });

  // ---------- 2. parseInput - unless mode ----------

  describe('parseInput - unless mode', () => {
    it('should detect unless mode from commandName', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(false);

      const conditionNode = { type: 'literal', value: false } as unknown as ASTNode;
      const commandNode = { type: 'command', name: 'log' } as unknown as ASTNode;

      const input = await command.parseInput(
        rawWithBodies({ args: [conditionNode, commandNode], modifiers: {}, commandName: 'unless' }),
        evaluator,
        context
      );

      expect(input.mode).toBe('unless');
    });

    it('should require at least 2 args (condition + command)', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(false);

      const conditionNode = { type: 'literal', value: false } as unknown as ASTNode;

      await expect(
        command.parseInput(
          rawWithBodies({ args: [conditionNode], modifiers: {}, commandName: 'unless' }),
          evaluator,
          context
        )
      ).rejects.toThrow('unless command requires a condition and at least one command');
    });

    it("should take the parser's block node as thenCommands (parity with if)", async () => {
      // The parser wraps every unless body in a single block node at args[1]
      // — same as if. The old `args.slice(1)` contract produced an ARRAY,
      // which executeCommands could not execute (parsed AST nodes have no
      // .execute method), so every unless body was silently a no-op. The
      // end-to-end describe at the bottom of this file is the regression gate.
      const context = createMockContext();
      const evaluator = createMockEvaluator(true);

      const conditionNode = { type: 'literal', value: true } as unknown as ASTNode;
      const block = {
        type: 'block',
        commands: [{ type: 'command', name: 'add' }],
      } as unknown as ASTNode;

      const input = await command.parseInput(
        rawWithBodies({ args: [conditionNode, block], modifiers: {}, commandName: 'unless' }),
        evaluator,
        context
      );

      expect(input.thenCommands).toBeTypeOf('function');
    });

    it('should ignore a stray else block — unless has no else', async () => {
      // The shared if/unless parser can attach an else block at args[2].
      // unless must not execute it, so parseInput drops it rather than letting
      // a slice(1) hand BOTH blocks to the executor.
      const context = createMockContext();
      const evaluator = createMockEvaluator(true);

      const conditionNode = { type: 'literal', value: true } as unknown as ASTNode;
      const thenBlock = { type: 'block', commands: [] } as unknown as ASTNode;
      const elseBlock = { type: 'block', commands: [] } as unknown as ASTNode;

      const input = await command.parseInput(
        rawWithBodies({
          args: [conditionNode, thenBlock, elseBlock],
          modifiers: {},
          commandName: 'unless',
        }),
        evaluator,
        context
      );

      expect(input.thenCommands).toBeTypeOf('function');
      expect(input.elseCommands).toBeUndefined();
    });

    it('should set condition from first arg evaluation', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('evaluated-condition');

      const conditionNode = { type: 'literal', value: 'something' } as unknown as ASTNode;
      const commandNode = { type: 'command', name: 'log' } as unknown as ASTNode;

      const input = await command.parseInput(
        rawWithBodies({ args: [conditionNode, commandNode], modifiers: {}, commandName: 'unless' }),
        evaluator,
        context
      );

      expect(input.condition).toBe('evaluated-condition');
    });
  });

  // ---------- 3. execute - condition inversion ----------

  describe('execute - condition inversion', () => {
    it('should execute commands when condition is FALSE (falsy)', async () => {
      const context = createMockContext();
      const mockCmd = createMockCommand('executed');

      const result = outputOf(
        await command.execute(
          {
            mode: 'unless',
            condition: false,
            thenCommands: testBody([mockCmd]),
          },
          context
        )
      );

      expect(result.executedBranch).toBe('then');
      expect(mockCmd.execute).toHaveBeenCalled();
    });

    it('should skip commands when condition is TRUE (truthy)', async () => {
      const context = createMockContext();
      const mockCmd = createMockCommand('should-not-run');

      const result = outputOf(
        await command.execute(
          {
            mode: 'unless',
            condition: true,
            thenCommands: testBody([mockCmd]),
          },
          context
        )
      );

      expect(result.executedBranch).toBe('none');
      expect(mockCmd.execute).not.toHaveBeenCalled();
    });

    it('should handle various falsy values (0, empty string, null, undefined, false)', async () => {
      const falsyValues = [0, '', null, undefined, false];

      for (const falsyValue of falsyValues) {
        const context = createMockContext();
        const mockCmd = createMockCommand(`ran-for-${falsyValue}`);

        const result = outputOf(
          await command.execute(
            {
              mode: 'unless',
              condition: falsyValue,
              thenCommands: testBody([mockCmd]),
            },
            context
          )
        );

        expect(result.executedBranch).toBe('then');
        expect(mockCmd.execute).toHaveBeenCalled();
      }
    });

    it('should handle various truthy values (non-zero, non-empty string, objects)', async () => {
      const truthyValues = [1, -1, 'hello', { key: 'value' }, [1, 2, 3], true];

      for (const truthyValue of truthyValues) {
        const context = createMockContext();
        const mockCmd = createMockCommand('should-not-run');

        const result = outputOf(
          await command.execute(
            {
              mode: 'unless',
              condition: truthyValue,
              thenCommands: testBody([mockCmd]),
            },
            context
          )
        );

        expect(result.executedBranch).toBe('none');
        expect(mockCmd.execute).not.toHaveBeenCalled();
      }
    });
  });

  // ---------- 4. execute - command execution ----------

  describe('execute - command execution', () => {
    it('should execute array of command objects', async () => {
      const context = createMockContext();
      const mockCmd1 = createMockCommand('result1');
      const mockCmd2 = createMockCommand('result2');

      const result = outputOf(
        await command.execute(
          {
            mode: 'unless',
            condition: false,
            thenCommands: testBody([mockCmd1, mockCmd2]),
          },
          context
        )
      );

      expect(mockCmd1.execute).toHaveBeenCalledWith(context);
      expect(mockCmd2.execute).toHaveBeenCalledWith(context);
      expect(result.result).toBe('result2');
    });

    it('should NOT touch context.it (parity with if)', async () => {
      // unless used to carry an unless-only `Object.assign(context, { it })`,
      // which in practice propagated the UNEXECUTED body node into `it` (the
      // body never ran — see the end-to-end describe below). `if` has never
      // assigned `it` here; the body's own commands do. unless now matches.
      const context = createMockContext({ it: 'keep me' } as never);
      const mockCmd = createMockCommand('final-result');

      await command.execute(
        {
          mode: 'unless',
          condition: false,
          thenCommands: testBody([mockCmd]),
        },
        context
      );

      expect((context as any).it).toBe('keep me');
    });

    it('should return mode "unless" and executedBranch "then" or "none"', async () => {
      const context = createMockContext();
      const mockCmd = createMockCommand('ok');

      // When condition is falsy: executedBranch = 'then'
      const resultExecuted = outputOf(
        await command.execute(
          {
            mode: 'unless',
            condition: false,
            thenCommands: testBody([mockCmd]),
          },
          context
        )
      );

      expect(resultExecuted.mode).toBe('unless');
      expect(resultExecuted.executedBranch).toBe('then');

      // When condition is truthy: executedBranch = 'none'
      const resultSkipped = outputOf(
        await command.execute(
          {
            mode: 'unless',
            condition: true,
            thenCommands: testBody([mockCmd]),
          },
          context
        )
      );

      expect(resultSkipped.mode).toBe('unless');
      expect(resultSkipped.executedBranch).toBe('none');
    });
  });

  // ---------- 5. execute - no else branch ----------

  describe('execute - no else branch', () => {
    it('should return executedBranch "none" when condition is truthy', async () => {
      const context = createMockContext();
      const mockCmd = createMockCommand('should-not-run');

      const result = outputOf(
        await command.execute(
          {
            mode: 'unless',
            condition: true,
            thenCommands: testBody([mockCmd]),
            elseCommands: testBody([{ type: 'command', name: 'elseCmd' }]),
          },
          context
        )
      );

      expect(result.executedBranch).toBe('none');
      expect(result.result).toBeUndefined();
    });

    it('should never execute else branch even if elseCommands provided', async () => {
      const context = createMockContext();
      const thenCmd = createMockCommand('then-result');
      const elseCmd = createMockCommand('else-result');

      // Condition truthy: unless skips, but should NOT fall through to else
      const resultTruthy = outputOf(
        await command.execute(
          {
            mode: 'unless',
            condition: true,
            thenCommands: testBody([thenCmd]),
            elseCommands: testBody([elseCmd]),
          },
          context
        )
      );

      expect(resultTruthy.executedBranch).toBe('none');
      expect(thenCmd.execute).not.toHaveBeenCalled();
      expect(elseCmd.execute).not.toHaveBeenCalled();

      // Condition falsy: unless executes thenCommands, still no else
      const resultFalsy = outputOf(
        await command.execute(
          {
            mode: 'unless',
            condition: false,
            thenCommands: testBody([thenCmd]),
            elseCommands: testBody([elseCmd]),
          },
          context
        )
      );

      expect(resultFalsy.executedBranch).toBe('then');
      expect(thenCmd.execute).toHaveBeenCalled();
      expect(elseCmd.execute).not.toHaveBeenCalled();
    });
  });

  // ---------- 6. integration ----------

  describe('integration', () => {
    it('should parse and execute end-to-end with falsy condition (commands run)', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(false);

      const conditionNode = { type: 'literal', value: false } as unknown as ASTNode;
      const mockCmd = createMockCommand('integration-result');

      // Parse
      const input = await command.parseInput(
        rawWithBodies({
          args: [conditionNode, mockCmd as unknown as ASTNode],
          modifiers: {},
          commandName: 'unless',
        }),
        evaluator,
        context
      );

      expect(input.mode).toBe('unless');
      expect(input.condition).toBe(false);

      // Execute
      const result = outputOf(await command.execute(input, context));

      expect(result.mode).toBe('unless');
      expect(result.executedBranch).toBe('then');
      expect(result.conditionResult).toBe(false);
      expect(mockCmd.execute).toHaveBeenCalled();
      // Body result surfaces on the output; `it` is left to the body's own
      // commands (parity with if — the unless-only self-assign is gone).
      expect(result.result).toBe('integration-result');
      expect((context as any).it).toBeUndefined();
    });

    it('should parse and execute end-to-end with truthy condition (commands skipped)', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(true);

      const conditionNode = { type: 'literal', value: true } as unknown as ASTNode;
      const mockCmd = createMockCommand('should-not-run');

      // Parse
      const input = await command.parseInput(
        rawWithBodies({
          args: [conditionNode, mockCmd as unknown as ASTNode],
          modifiers: {},
          commandName: 'unless',
        }),
        evaluator,
        context
      );

      expect(input.mode).toBe('unless');
      expect(input.condition).toBe(true);

      // Execute
      const result = outputOf(await command.execute(input, context));

      expect(result.mode).toBe('unless');
      expect(result.executedBranch).toBe('none');
      expect(result.conditionResult).toBe(true);
      expect(mockCmd.execute).not.toHaveBeenCalled();
    });
  });

  // ---------- 8. end-to-end through the REAL parser ----------
  //
  // Everything above feeds parseInput/execute hand-built inputs, and for six
  // months that hid the real bug: mocks carried `.execute()` — a shape the
  // parser never produces — so the one executeCommands branch that worked was
  // the only one ever tested, while every parser-produced `unless` body was a
  // silent no-op (parseInput's old args.slice(1) handed executeCommands an
  // array holding a block NODE, whose fallthrough returned it unexecuted).
  //
  // These tests are the regression gate: real source, real parser, real
  // runtime, asserting on the DOM the body was supposed to mutate.
  describe('end-to-end through the real parser (the bug the mocks hid)', () => {
    let host: HTMLElement;
    let probe: HTMLElement;

    beforeEach(async () => {
      const { hyperscript } = await import('../../../api/hyperscript-api');
      void hyperscript; // ensure module is loaded before fixtures reset
      document.body.innerHTML = '<div id="host"></div><div id="probe"></div>';
      host = document.getElementById('host') as HTMLElement;
      probe = document.getElementById('probe') as HTMLElement;
    });

    async function evalHs(src: string): Promise<void> {
      const { hyperscript } = await import('../../../api/hyperscript-api');
      await hyperscript.eval(src, host);
    }

    it('executes the body when the condition is false (then/end form)', async () => {
      await evalHs('unless false then add .ran to #probe end');
      expect(probe.classList.contains('ran')).toBe(true);
    });

    it('executes the body in the bare single-line form', async () => {
      await evalHs('unless false add .ran to #probe');
      expect(probe.classList.contains('ran')).toBe(true);
    });

    it('executes a multi-command body in order', async () => {
      await evalHs('unless false then add .a to #probe then add .b to #probe end');
      expect(probe.classList.contains('a')).toBe(true);
      expect(probe.classList.contains('b')).toBe(true);
    });

    it('skips the body when the condition is true', async () => {
      await evalHs('unless true then add .ran to #probe end');
      expect(probe.classList.contains('ran')).toBe(false);
    });

    it('leaves `it` alone instead of clobbering it with an AST node', async () => {
      // Pre-fix, `it` held the unexecuted block node after any unless — this
      // pins both halves: the body ran, and `it` survived (parity with if).
      await evalHs(
        'set x to 7 then unless false then add .ran to #probe end then put x into #probe'
      );
      expect(probe.classList.contains('ran')).toBe(true);
      expect(probe.textContent).toBe('7');
    });

    it('executes inside an event handler body', async () => {
      await evalHs('on probe unless false add .ran to #probe');
      host.dispatchEvent(new CustomEvent('probe'));
      const deadline = Date.now() + 2000;
      while (!probe.classList.contains('ran') && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 5));
      }
      expect(probe.classList.contains('ran')).toBe(true);
    });
  });
});
