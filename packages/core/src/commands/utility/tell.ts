/**
 * TellCommand - Decorated Implementation
 *
 * Executes commands in the context of target elements.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   tell <target> <command> [<command> ...]
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { resolveElements } from '../helpers/element-resolution';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import type { CommandRaw } from '../../ast/command-slots';
import { isOk, isSignal } from '../../types/result';
import type { ExecutionResult, ExecutionSignal } from '../../types/result';

/**
 * Typed input for TellCommand
 */
export interface TellCommandInput {
  target: HTMLElement | HTMLElement[] | string;
  commands: any[];
}

/**
 * Output from tell command execution
 */
export interface TellCommandOutput {
  targetElements: HTMLElement[];
  commandResults: any[];
  executionCount: number;
}

/**
 * TellCommand - Executes commands in target element context
 *
 * Before: 204 lines
 * After: ~90 lines (56% reduction)
 */
@command({ name: 'tell' })
export class TellCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Execute commands in the context of target elements',
    syntax: ['tell <target> <command> [<command> ...]'],
    examples: ['tell #sidebar hide', 'tell .buttons add .disabled', 'tell closest <form/> submit'],
    sideEffects: ['context-switching', 'command-execution'],
    category: 'utility',
    compatibility: 'standard',
  });

  get metadata() {
    return TellCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'tell'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<TellCommandInput> {
    if (raw.args.length < 2) {
      throw new Error('tell command requires a target and at least one command');
    }

    const target = await evaluator.evaluate(raw.args[0], context);
    const commands = raw.args.slice(1);

    return { target, commands };
  }

  async execute(
    input: TellCommandInput,
    context: TypedExecutionContext
  ): Promise<TellCommandOutput | ExecutionSignal> {
    const { target, commands } = input;
    const targetElements = resolveElements(target, context);

    if (targetElements.length === 0) {
      throw new Error('tell command found no target elements');
    }

    // Get runtime execute function for AST command nodes (same pattern as RepeatCommand)
    const runtimeExecute = context.locals.get('_runtimeExecute') as RuntimeExecute | undefined;

    const commandResults: any[] = [];

    for (const targetElement of targetElements) {
      // In hyperscript, within a tell block, `me` refers to the element being told —
      // this allows commands like `add .highlight` to operate on the target element.
      //
      // Divergence from upstream `_hyperscript`: upstream binds ONLY `you` to the
      // current target (controlflow.js:454, `context.you = iterator.value[iterator.index]`).
      // Hyperfixi binds BOTH `me` and `you`. This is intentionally more permissive —
      // user code can reference either pronoun inside a tell block. Locked in by tests
      // in __tests__/tell.test.ts ("should set me to..." and "should set you to..."
      // plus the multi-target iteration test). Don't tighten without a migration plan
      // for downstream callers.
      const tellContext: TypedExecutionContext = {
        ...context,
        me: targetElement,
        you: targetElement,
      };

      for (const cmd of commands) {
        let result: unknown;
        try {
          result = await this.executeCommand(cmd, tellContext, runtimeExecute);
        } catch (error) {
          throw new Error(
            `Command execution failed in tell block: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
        // A signal (halt/exit/break/continue/return) is not a failure: `tell`
        // passes it through to the boundary that owns it.
        if (isSignal(result)) return result;
        commandResults.push(result);
        Object.assign(tellContext, { it: result });
      }
    }

    return {
      targetElements,
      commandResults,
      executionCount: targetElements.length * commands.length,
    };
  }

  private async executeCommand(
    cmd: any,
    context: TypedExecutionContext,
    runtimeExecute?: RuntimeExecute
  ): Promise<unknown> {
    // Handle AST command nodes using runtime execute (same pattern as RepeatCommand)
    if (cmd && typeof cmd === 'object' && cmd.type === 'command' && runtimeExecute) {
      const result = await runtimeExecute(cmd, context);
      return isOk(result) ? result.value : result.error;
    }

    if (typeof cmd === 'function') {
      return await cmd(context);
    }

    if (cmd && typeof cmd === 'object' && typeof cmd.execute === 'function') {
      return await cmd.execute(context);
    }

    throw new Error('Invalid command: must be a function or object with execute method');
  }
}

type RuntimeExecute = (
  cmd: unknown,
  ctx: TypedExecutionContext
) => Promise<ExecutionResult<unknown>>;

export const createTellCommand = createFactory(TellCommand);
export default TellCommand;
