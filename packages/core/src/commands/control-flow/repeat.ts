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
import { isNodeOfKind } from '../../ast/guards';
import {
  commandMeta,
  command,
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

/**
 * The text a slot carries: a string/literal/identifier node's own text, or the
 * evaluated value when it is one. The parser emits the loop form, variable,
 * event and index names as string literals (Arc 3 step 3); a hand-built node
 * may carry an identifier or an expression instead.
 */
async function slotText(
  node: ExpressionNode | undefined,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<string | undefined> {
  if (!node) return undefined;
  // Read as `unknown`: the legacy `ExpressionNode` type does not overlap the
  // union members, so a guard on it would narrow to `never`.
  const n: unknown = node;
  if (isNodeOfKind(n, 'string')) return n.value;
  if (isNodeOfKind(n, 'literal') && typeof n.value === 'string') return n.value;
  if (isNodeOfKind(n, 'identifier')) return n.name;
  const v = await evaluator.evaluate(node, context);
  return typeof v === 'string' ? v : undefined;
}

@command({ name: 'repeat' })
export class RepeatCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description:
      'Iteration in hyperscript - for-in, counted, conditional, event-driven, and infinite loops',
    syntax: [
      'repeat for <var> in <collection> { <commands> }',
      'repeat <count> times { <commands> }',
      'repeat while <condition> { <commands> }',
      'repeat until <condition> { <commands> }',
      'repeat forever { <commands> }',
    ],
    examples: [
      'repeat for item in items { log item }',
      'repeat 5 times { log "hello" }',
      'repeat for item in items index i log i end',
    ],
    sideEffects: ['iteration', 'conditional-execution'],
    category: 'control-flow',
    compatibility: 'standard',
  });

  get metadata() {
    return RepeatCommand.metadata;
  }

  declare readonly name: string;

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
    // The parser carries the form and every operand as slots (Arc 3 step 3);
    // only the body block(s) are positional, found above.
    const m = raw.modifiers ?? {};
    const text = (node: ExpressionNode | undefined) => slotText(node, evaluator, context);
    const loopType = (await text(m.loopType)) ?? null;
    const bottomTested = m.bottomTested
      ? ((await evaluator.evaluate(m.bottomTested, context)) as boolean)
      : false;
    if (loopType === 'for' || m.for) {
      const variable = await text(m.for);
      const collection = m.in && (await evaluator.evaluate(m.in, context));
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
    if (loopType === 'times' || m.times) {
      const countValue = m.times && (await evaluator.evaluate(m.times, context));
      const count = typeof countValue === 'number' ? countValue : parseInt(String(countValue), 10);
      if (isNaN(count)) throw new Error('times loops require a count number');
      return { type: 'times', count, indexVariable, commands, elseCommands };
    }
    if (loopType === 'while' || m.while) {
      const condition = m.while;
      if (!condition) throw new Error('while loops require a condition');
      return { type: 'while', condition, indexVariable, commands, elseCommands, bottomTested };
    }
    if (loopType === 'until-event' || m.event) {
      const eventName = await text(m.event);
      if (!eventName) throw new Error('until-event loops require an event name');
      let eventTarget: EventTarget = context.me as EventTarget;
      if (m.from) {
        const from: unknown = m.from;
        const targetName = isNodeOfKind(from, 'identifier') ? from.name : undefined;
        if (targetName === 'document') {
          eventTarget = document;
        } else if (targetName === 'window' && typeof window !== 'undefined') {
          eventTarget = window;
        } else {
          const target = await evaluator.evaluate(m.from, context);
          if (target instanceof EventTarget) eventTarget = target;
          else if (target === 'document') eventTarget = document;
          else if (typeof window !== 'undefined' && target === window) eventTarget = window;
        }
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
    if (loopType === 'until' || m.until) {
      const condition = m.until;
      if (!condition) throw new Error('until loops require a condition');
      return { type: 'until', condition, indexVariable, commands, elseCommands, bottomTested };
    }
    if (loopType === 'forever' || m.forever) {
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
        ((cmd: unknown, ctx: TypedExecutionContext) => Promise<unknown>) | undefined;
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
