/**
 * Tests for StartViewTransitionCommand.
 *
 * Covers:
 *   - Parser: recognizes `start view transition [using <type>] <body> end`
 *   - Runtime: wraps body in `withViewTransition` when API supported
 *   - Fallback: runs body directly in JSDOM (API unavailable)
 *   - Modifier: `using <name>` sets the transition name
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StartViewTransitionCommand } from '../start-view-transition';
import * as viewTransitionsLib from '../../../lib/view-transitions';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode, ExpressionNode } from '../../../types/base-types';
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

// ---------- helpers ----------

function ctx(): ExecutionContext & TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: document.createElement('div'),
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function makeEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode | unknown) => {
      if (node && typeof node === 'object' && 'value' in node) {
        return (node as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

const lit = (value: unknown) => ({ type: 'literal', value }) as unknown as ExpressionNode;

describe('StartViewTransitionCommand', () => {
  const command = new StartViewTransitionCommand();

  describe('metadata', () => {
    it('has correct command name', () => {
      expect(command.name).toBe('start');
    });
    it('has animation category', () => {
      expect(command.metadata.category).toBe('animation');
    });
    it('lists view-transition syntax in examples', () => {
      const examples = (command.metadata.examples ?? []).join(' ');
      expect(examples).toMatch(/start view transition/);
    });
  });

  describe('parseInput', () => {
    it('extracts body from args and no transition name when modifier absent', async () => {
      const bodyCmd = { type: 'command', name: 'add' } as unknown as ASTNode;
      const input = await command.parseInput(
        rawWithBodies({ args: [bodyCmd], modifiers: {} }),
        makeEvaluator(),
        ctx()
      );
      expect(input.body).toHaveLength(1);
      expect(input.transitionName).toBeUndefined();
    });

    it('extracts transition name from modifiers.transitionName', async () => {
      const input = await command.parseInput(
        rawWithBodies({ args: [], modifiers: { transitionName: lit('slide-up') } }),
        makeEvaluator(),
        ctx()
      );
      expect(input.transitionName).toBe('slide-up');
    });
  });

  describe('execute', () => {
    let supportedSpy: ReturnType<typeof vi.spyOn>;
    let withTransitionSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      supportedSpy = vi.spyOn(viewTransitionsLib, 'isViewTransitionsSupported');
      withTransitionSpy = vi.spyOn(viewTransitionsLib, 'withViewTransition');
    });
    afterEach(() => {
      supportedSpy.mockRestore();
      withTransitionSpy.mockRestore();
    });

    it('falls back to direct execution when API unsupported (JSDOM)', async () => {
      supportedSpy.mockReturnValue(false);

      let ran = 0;
      const bodyCmd = async () => {
        ran++;
      };

      const output = outputOf(
        await command.execute({ transitionName: undefined, body: testOps([bodyCmd]) }, ctx())
      );

      expect(output.usedViewTransition).toBe(false);
      expect(output.commandsExecuted).toBe(1);
      expect(ran).toBe(1);
      expect(withTransitionSpy).not.toHaveBeenCalled();
    });

    it('wraps body in withViewTransition when API supported', async () => {
      supportedSpy.mockReturnValue(true);
      // Run the callback synchronously through the spy so we can count.
      withTransitionSpy.mockImplementation(async (cb: () => unknown) => {
        await cb();
      });

      let ran = 0;
      const bodyCmd = async () => {
        ran++;
      };

      const output = outputOf(
        await command.execute(
          {
            transitionName: 'fade',
            body: testOps([bodyCmd, bodyCmd]),
          },
          ctx()
        )
      );

      expect(output.usedViewTransition).toBe(true);
      expect(output.commandsExecuted).toBe(2);
      expect(ran).toBe(2);
      expect(withTransitionSpy).toHaveBeenCalledTimes(1);
      expect(withTransitionSpy.mock.calls[0][1]).toEqual({ transitionName: 'fade' });
    });

    it('routes through context.locals._testExecute when present', async () => {
      supportedSpy.mockReturnValue(false);

      const executed: unknown[] = [];
      const runtimeExecute = vi.fn(async (cmd: unknown) => {
        executed.push(cmd);
      });

      const context = ctx();
      context.locals.set('_testExecute', runtimeExecute);

      const astCmd1 = { type: 'command', name: 'add' };
      const astCmd2 = { type: 'command', name: 'remove' };

      await command.execute({ body: testOps([astCmd1, astCmd2]) }, context);

      expect(runtimeExecute).toHaveBeenCalledTimes(2);
      expect(executed).toEqual([astCmd1, astCmd2]);
    });
  });

  describe('end-to-end via parser', () => {
    it('parses `start view transition <body> end` with body in args', async () => {
      const { parse } = await import('../../../parser/parser');
      const result = parse('start view transition log "hi" end');
      if (!result.success) {
        throw new Error(`parse failed: ${result.error?.message ?? 'unknown'}`);
      }
      const cmdNode = (result.node as any).body?.[0] ?? result.node;
      expect(cmdNode.name).toBe('start');
      expect(Array.isArray(cmdNode.args)).toBe(true);
      expect(cmdNode.args.length).toBeGreaterThan(0);
      // Body is a log command
      expect(cmdNode.args[0].name).toBe('log');
    });

    it('parses `start view transition using "fade" <body> end`', async () => {
      const { parse } = await import('../../../parser/parser');
      const result = parse('start view transition using "fade" log "hi" end');
      if (!result.success) {
        throw new Error(`parse failed: ${result.error?.message ?? 'unknown'}`);
      }
      const cmdNode = (result.node as any).body?.[0] ?? result.node;
      expect(cmdNode.modifiers?.transitionName?.value).toBe('fade');
    });

    it('throws when `view transition` is not followed', async () => {
      const { parse } = await import('../../../parser/parser');
      const result = parse('start something else end');
      // Parser may either throw or produce a parse error node; either is fine.
      // What matters is it does NOT silently produce a successful start command.
      if (result.success) {
        const cmdNode = (result.node as any).body?.[0] ?? result.node;
        // If the parser recovers, the command shouldn't be `start view transition` shape.
        expect(cmdNode.name === 'start' && Array.isArray(cmdNode.args)).not.toBe(true);
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });
});
