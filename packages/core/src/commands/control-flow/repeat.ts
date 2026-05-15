/**
 * RepeatCommand - Optimized Implementation
 *
 * Provides iteration in the hyperscript language using unified loop executor.
 *
 * Syntax:
 *   repeat for <var> in <collection> [index <indexVar>] { <commands> }
 *   repeat <count> times [index <indexVar>] { <commands> }
 *   repeat while <condition> [index <indexVar>] { <commands> }
 *   repeat until <condition> [index <indexVar>] { <commands> }
 *   repeat forever [index <indexVar>] { <commands> }
 *
 * Optimized: 704 lines → ~150 lines using unified loop executor
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import { evaluateCondition } from '../helpers/condition-helpers';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import {
  executeLoop,
  createForLoopConfig,
  createTimesLoopConfig,
  createWhileLoopConfig,
  createUntilLoopConfig,
  createUntilEventLoopConfig,
  createForeverLoopConfig,
} from '../helpers/loop-executor';

/** Typed input for RepeatCommand */
export interface RepeatCommandInput {
  type: 'for' | 'times' | 'while' | 'until' | 'until-event' | 'forever';
  variable?: string;
  collection?: unknown[];
  condition?: unknown;
  count?: number;
  indexVariable?: string;
  commands?: unknown;
  /** Else branch — executed when the loop completes with zero iterations */
  elseCommands?: unknown;
  /**
   * Bottom-tested flag. True for `repeat <body> until/while <expr> end`,
   * where the body runs unconditionally before the first condition check
   * (upstream `_hyperscript` controlflow.js:268-281).
   */
  bottomTested?: boolean;
  eventName?: string;
  eventTarget?: EventTarget;
}

/** Output from Repeat command execution */
export interface RepeatCommandOutput {
  type: string;
  iterations: number;
  completed: boolean;
  lastResult?: unknown;
  interrupted?: boolean;
}

@meta({
  description:
    'Iteration in hyperscript - for-in, counted, conditional, event-driven, and infinite loops',
  syntax: [
    'repeat for <var> in <collection> { <commands> }',
    'repeat <count> times { <commands> }',
    'repeat while <condition> { <commands> }',
    'repeat until <condition> { <commands> }',
    'repeat forever { <commands> }',
  ],
  examples: ['repeat for item in items { log item }', 'repeat 5 times { log "hello" }'],
  sideEffects: ['iteration', 'conditional-execution'],
})
@command({ name: 'repeat', category: 'control-flow' })
export class RepeatCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<RepeatCommandInput> {
    // Extract index variable if present
    let indexVariable: string | undefined;
    if (raw.modifiers?.index) {
      const indexValue = await evaluator.evaluate(raw.modifiers.index, context);
      if (typeof indexValue === 'string') indexVariable = indexValue;
    }

    // Extract commands block(s). The body is always the first 'block' arg
    // scanning right-to-left. If a second block immediately precedes it (also
    // scanning right-to-left), that's the body and the later one is the else.
    let commands: unknown = raw.modifiers?.block || raw.modifiers?.commands;
    let elseCommands: unknown = undefined;
    if (!commands) {
      const blocks: unknown[] = [];
      for (let i = raw.args.length - 1; i >= 0; i--) {
        const arg = raw.args[i] as unknown as { type?: string; commands?: unknown };
        if (arg?.type === 'block' && arg.commands) {
          blocks.unshift(arg);
          if (blocks.length === 2) break;
        }
      }
      if (blocks.length === 2) {
        commands = blocks[0];
        elseCommands = blocks[1];
      } else if (blocks.length === 1) {
        commands = blocks[0];
      }
    }

    // Detect loop type from args[0]
    const firstArg = raw.args[0] as { type?: string; name?: string };
    const loopType = firstArg?.type === 'identifier' ? firstArg.name : null;

    // Bottom-tested flag from parser (set when `repeat <body> until/while
    // <expr> end` is used). Encoded as a modifier literal so it survives
    // the args/modifier split without polluting the loop-type discriminant.
    const bottomTested = raw.modifiers?.bottomTested
      ? ((await evaluator.evaluate(raw.modifiers.bottomTested, context)) as boolean)
      : false;

    // Parse based on loop type
    if (loopType === 'for' || raw.modifiers?.for) {
      const varArg = raw.args[1] as { value?: string; name?: string };
      const variable = varArg?.value || varArg?.name;
      const collection = raw.args[2] ? await evaluator.evaluate(raw.args[2], context) : undefined;
      if (!variable || collection === undefined)
        throw new Error('for loops require variable and collection');
      return {
        type: 'for',
        variable,
        collection: Array.isArray(collection) ? collection : [collection],
        indexVariable,
        commands,
        elseCommands,
      };
    }

    if (loopType === 'times' || raw.modifiers?.times) {
      const countArg = raw.args[1];
      const countValue = countArg ? await evaluator.evaluate(countArg, context) : undefined;
      const count = typeof countValue === 'number' ? countValue : parseInt(String(countValue), 10);
      if (isNaN(count)) throw new Error('times loops require a count number');
      return { type: 'times', count, indexVariable, commands, elseCommands };
    }

    if (loopType === 'while' || raw.modifiers?.while) {
      const condition = raw.args[1] || raw.modifiers?.while;
      if (!condition) throw new Error('while loops require a condition');
      return { type: 'while', condition, indexVariable, commands, elseCommands, bottomTested };
    }

    if ((loopType === 'until' && raw.modifiers?.from) || loopType === 'until-event') {
      const eventArg = raw.args[1] as { value?: string; name?: string };
      const eventName = eventArg?.value || eventArg?.name;
      if (!eventName) throw new Error('until-event loops require an event name');
      let eventTarget: EventTarget = context.me as EventTarget;
      if (raw.args[2]) {
        const target = await evaluator.evaluate(raw.args[2], context);
        if (target instanceof EventTarget) eventTarget = target;
        else if (target === 'document') eventTarget = document;
      }
      return {
        type: 'until-event',
        eventName,
        eventTarget,
        indexVariable,
        commands,
        elseCommands,
      };
    }

    if (loopType === 'until' || raw.modifiers?.until) {
      const condition = raw.args[1] || raw.modifiers?.until;
      if (!condition) throw new Error('until loops require a condition');
      return { type: 'until', condition, indexVariable, commands, elseCommands, bottomTested };
    }

    if (loopType === 'forever' || raw.modifiers?.forever) {
      return { type: 'forever', indexVariable, commands, elseCommands };
    }

    throw new Error('repeat command requires a loop type (for/times/while/until/forever)');
  }

  async execute(
    input: RepeatCommandInput,
    context: TypedExecutionContext
  ): Promise<RepeatCommandOutput> {
    const {
      type,
      variable,
      collection,
      condition,
      count,
      indexVariable,
      commands,
      elseCommands,
      bottomTested,
      eventName,
      eventTarget,
    } = input;

    // Create loop config based on type
    let config, iterCtx;

    switch (type) {
      case 'for':
        ({ config, iterCtx } = createForLoopConfig(collection!, variable!, indexVariable));
        break;
      case 'times':
        ({ config, iterCtx } = createTimesLoopConfig(count!, indexVariable));
        break;
      case 'while':
        ({ config, iterCtx } = createWhileLoopConfig(
          condition,
          evaluateCondition,
          context,
          indexVariable
        ));
        break;
      case 'until':
        ({ config, iterCtx } = createUntilLoopConfig(
          condition,
          evaluateCondition,
          context,
          indexVariable
        ));
        break;
      case 'until-event':
        ({ config, iterCtx } = createUntilEventLoopConfig(eventName!, eventTarget!, indexVariable));
        break;
      case 'forever':
        ({ config, iterCtx } = createForeverLoopConfig(indexVariable));
        break;
      default:
        throw new Error(`Unknown repeat type: ${type}`);
    }

    // Bottom-tested loops (`repeat <body> until/while <expr> end`) run the
    // body unconditionally on iteration 0, then check the condition normally.
    // Mirrors upstream _hyperscript controlflow.js:56-57 (bottomTested branch).
    if (bottomTested) {
      const originalShouldContinue = config.shouldContinue;
      config.shouldContinue = async ctx => {
        if (ctx.index === 0) return true;
        return await originalShouldContinue(ctx);
      };
    }

    // Execute loop using unified executor
    try {
      const result = await executeLoop(
        config,
        commands,
        context,
        iterCtx,
        this.executeCommands.bind(this)
      );

      // Run else branch if loop completed naturally with zero iterations.
      // Mirrors upstream _hyperscript controlflow.js:125 (didIterate flag).
      if (result.iterations === 0 && !result.interrupted && elseCommands) {
        const elseResult = await this.executeCommands(elseCommands, context);
        Object.assign(context, { it: elseResult });
        return {
          type,
          iterations: 0,
          completed: true,
          lastResult: elseResult,
        };
      }

      // Update context.it to last result
      Object.assign(context, { it: result.lastResult });

      return {
        type,
        iterations: result.iterations,
        completed: !result.interrupted,
        lastResult: result.lastResult,
        interrupted: result.interrupted,
      };
    } catch (error) {
      // Handle top-level control flow errors
      if (error instanceof Error) {
        if (error.message.includes('BREAK') || error.message.includes('CONTINUE')) {
          return {
            type,
            iterations: 0,
            completed: true,
            interrupted: error.message.includes('BREAK'),
          };
        }
      }
      throw error;
    }
  }

  /** Execute commands block or array */
  private async executeCommands(
    commands: unknown,
    context: TypedExecutionContext
  ): Promise<unknown> {
    // Handle block nodes from parser
    if (
      commands &&
      typeof commands === 'object' &&
      (commands as { type?: string }).type === 'block'
    ) {
      const block = commands as { commands?: unknown[] };
      const runtimeExecute = context.locals.get('_runtimeExecute') as
        | ((cmd: unknown, ctx: TypedExecutionContext) => Promise<unknown>)
        | undefined;
      if (!runtimeExecute) throw new Error('Runtime execute function not available');
      let lastResult: unknown;
      if (block.commands) {
        for (const cmd of block.commands) {
          lastResult = await runtimeExecute(cmd, context);
        }
      }
      return lastResult;
    }

    // Handle array of commands
    if (Array.isArray(commands)) {
      let lastResult: unknown;
      for (const cmd of commands) {
        if (typeof cmd === 'function') lastResult = await cmd(context);
        else if (cmd && typeof (cmd as { execute?: Function }).execute === 'function') {
          lastResult = await (cmd as { execute: Function }).execute(context);
        } else lastResult = cmd;
      }
      return lastResult;
    }

    // Single command or function
    if (typeof commands === 'function') return await commands(context);
    return commands;
  }
}

export const createRepeatCommand = createFactory(RepeatCommand);
export default RepeatCommand;
