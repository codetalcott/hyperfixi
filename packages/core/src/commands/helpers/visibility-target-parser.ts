/**
 * Shared Parser for Visibility Commands (show/hide)
 *
 * Extracts common parsing logic to eliminate duplication.
 */

import type { ASTNode, ExecutionContext, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { resolveTargetsFromArgs } from './element-resolution';

/**
 * Raw input from RuntimeBase
 */
export interface VisibilityRawInput {
  args: ASTNode[];
  modifiers: Record<string, ExpressionNode>;
}

/**
 * Typed input for visibility commands
 */
export interface VisibilityInput {
  targets: HTMLElement[];
}

/**
 * Parse raw AST input for show/hide commands
 *
 * @param raw - Raw AST input from parser
 * @param evaluator - Expression evaluator
 * @param context - Execution context
 * @param commandName - Command name for error messages
 * @returns Parsed input with resolved target elements
 */
export async function parseVisibilityInput(
  raw: VisibilityRawInput,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext,
  commandName: string
): Promise<VisibilityInput> {
  const targets = await resolveTargetsFromArgs(raw.args, evaluator, context, commandName);
  return { targets };
}

/**
 * Split `targets` by a `when`/`where` condition evaluated ONCE PER ELEMENT.
 *
 * `show <blockquote/> when its textContent contains my value` is a FILTER, not
 * a guard: upstream (`runtime.implicitLoopWhen`) shows every element the
 * condition holds for and HIDES the rest, evaluating the condition with the
 * element under test bound to `it`/`its`. That is the whole point of the form —
 * a search filter re-runs on each keystroke and must un-hide what now matches.
 *
 * It is therefore NOT the same `when` as the one `CommandAdapterV2` applies to
 * every other command, which skips the command outright on a falsy result. The
 * adapter defers to us here via `ownsConditionalModifier`; see the comment on
 * its guard.
 *
 * Upstream keeps the element under test in a dedicated `beingTested` slot that
 * `it`/`its` prefer over `context.result`. hyperfixi has one `it`/`result` slot,
 * so the element is written into `context.it` for the duration of the test and
 * the previous value is restored afterwards — visible behaviour is the same,
 * and the restore is in a `finally` so a throwing condition cannot leak the
 * element into the rest of the handler.
 */
export async function partitionByCondition(
  targets: HTMLElement[],
  condition: ASTNode,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<{ matched: HTMLElement[]; unmatched: HTMLElement[] }> {
  const matched: HTMLElement[] = [];
  const unmatched: HTMLElement[] = [];
  const previousIt = context.it;

  try {
    for (const element of targets) {
      context.it = element;
      const holds = await evaluator.evaluate(condition, context);
      (holds ? matched : unmatched).push(element);
    }
  } finally {
    context.it = previousIt;
  }

  return { matched, unmatched };
}
