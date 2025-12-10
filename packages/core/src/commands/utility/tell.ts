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
import { command, meta, createFactory } from '../decorators';

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
@meta({
  description: 'Execute commands in the context of target elements',
  syntax: ['tell <target> <command> [<command> ...]'],
  examples: ['tell #sidebar hide', 'tell .buttons add .disabled', 'tell closest <form/> submit'],
  sideEffects: ['context-switching', 'command-execution'],
})
@command({ name: 'tell', category: 'utility' })
export class TellCommand {
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
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
  ): Promise<TellCommandOutput> {
    const { target, commands } = input;
    const targetElements = resolveElements(target, context);

    if (targetElements.length === 0) {
      throw new Error('tell command found no target elements');
    }

    const commandResults: any[] = [];

    for (const targetElement of targetElements) {
      const tellContext: TypedExecutionContext = {
        ...context,
        you: targetElement,
      };

      for (const cmd of commands) {
        try {
          const result = await this.executeCommand(cmd, tellContext);
          commandResults.push(result);
          Object.assign(tellContext, { it: result });
        } catch (error) {
          throw new Error(
            `Command execution failed in tell block: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    }

    return {
      targetElements,
      commandResults,
      executionCount: targetElements.length * commands.length,
    };
  }

  private async executeCommand(cmd: any, context: TypedExecutionContext): Promise<any> {
    if (typeof cmd === 'function') {
      return await cmd(context);
    }

    if (cmd && typeof cmd === 'object' && typeof cmd.execute === 'function') {
      return await cmd.execute(context);
    }

    throw new Error('Invalid command: must be a function or object with execute method');
  }
}

export const createTellCommand = createFactory(TellCommand);
export default TellCommand;
