/**
 * StartViewTransitionCommand - Decorated Implementation
 *
 * Wraps a block of commands in `document.startViewTransition()` so any DOM
 * mutations the block performs animate via the View Transitions API.
 *
 * Syntax (mirrors upstream `_hyperscript` `animations.js:298-372`):
 *
 *   start view transition [using <type>] <body> end
 *
 *   - <type>: optional transition name (mapped to CSS view-transition-name)
 *   - <body>: any sequence of commands; their DOM effects are captured by
 *     the transition
 *
 * Fallback: if the browser doesn't support `document.startViewTransition`
 * (Firefox <125, older Safari, JSDOM in tests), the body runs directly
 * without animation — same semantics as plain command execution.
 *
 * Abort: if a control-flow command inside the body short-circuits the
 * execution (break/return/halt/exit/continue), the transition is skipped.
 * In practice this matches upstream's `AbortViewTransition` behavior — the
 * runtime simply doesn't complete the callback, so the view transition
 * resolves with no captured snapshot.
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { withViewTransition, isViewTransitionsSupported } from '../../lib/view-transitions';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

export interface StartViewTransitionInput {
  /** Optional CSS view-transition-name. */
  transitionName?: string;
  /** AST nodes representing the commands inside the transition body. */
  body: ASTNode[];
}

export interface StartViewTransitionOutput {
  /** Whether the View Transitions API was actually used (false on fallback). */
  usedViewTransition: boolean;
  /** Number of commands executed in the body. */
  commandsExecuted: number;
}

@meta({
  description: 'Wrap a block of commands in document.startViewTransition()',
  syntax: ['start view transition [using <type>] <body> end'],
  examples: [
    'start view transition add .highlight to me end',
    'start view transition using "slide" then put result into #panel end',
  ],
  sideEffects: ['animation', 'dom-mutation'],
})
@command({ name: 'start', category: 'animation' })
export class StartViewTransitionCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<StartViewTransitionInput> {
    // Body is in args (the parser packs the command list there). Transition
    // name is in modifiers.transitionName (a literal node from parseStartCommand).
    const body = raw.args ?? [];
    let transitionName: string | undefined;
    if (raw.modifiers?.transitionName) {
      const value = await evaluator.evaluate(raw.modifiers.transitionName, context);
      transitionName = typeof value === 'string' ? value : String(value ?? '');
    }
    return { transitionName, body };
  }

  async execute(
    input: StartViewTransitionInput,
    context: TypedExecutionContext
  ): Promise<StartViewTransitionOutput> {
    const runtimeExecute = context.locals.get('_runtimeExecute') as
      | ((cmd: unknown, ctx: TypedExecutionContext) => Promise<unknown>)
      | undefined;

    let commandsExecuted = 0;

    const runBody = async () => {
      for (const cmd of input.body) {
        if (runtimeExecute) {
          await runtimeExecute(cmd, context);
        } else if (cmd && typeof (cmd as any).execute === 'function') {
          await (cmd as any).execute(context);
        } else if (typeof cmd === 'function') {
          await (cmd as any)(context);
        }
        commandsExecuted++;
      }
    };

    if (!isViewTransitionsSupported()) {
      // Fallback: run body directly. No animation, but commands still execute.
      await runBody();
      return { usedViewTransition: false, commandsExecuted };
    }

    // Forward the parsed `transitionName` (upstream `start view transition
    // using "slide"`) to the helper, which maps it to the View Transitions API
    // `types` so CSS can target the transition via
    // `:active-view-transition-type(...)`. No-op where the object form is
    // unsupported (names can also be applied per-element via CSS
    // `view-transition-name`).
    const options = input.transitionName ? { transitionName: input.transitionName } : undefined;
    await withViewTransition(runBody, options);
    return { usedViewTransition: true, commandsExecuted };
  }
}

export const createStartViewTransitionCommand = createFactory(StartViewTransitionCommand);
export default StartViewTransitionCommand;
