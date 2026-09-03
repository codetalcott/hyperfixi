/**
 * ConditionalCommand - Consolidated If/Unless Implementation
 *
 * Conditional execution based on boolean expressions.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   if <condition> then <commands>
 *   if <condition> then <commands> else <commands>
 *   unless <condition> <commands>
 */

import { isOk } from '../../types/result';
import type { ExecutionSignal } from '../../types/result';
import type { Op } from '../../types/program';
import { bodyOp } from '../helpers/body-ops';
import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { evaluateCondition } from '../helpers/condition-helpers';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import type { CommandRaw } from '../../ast/command-slots';

/** Conditional mode type */
export type ConditionalMode = 'if' | 'unless';

/**
 * Typed input for ConditionalCommand
 */
export interface ConditionalCommandInput {
  /** The mode determines condition interpretation: 'if' executes on TRUE, 'unless' on FALSE */
  mode: ConditionalMode;
  /** The evaluated condition value (will be coerced to boolean) */
  condition: unknown;
  /** The compiled then branch (or the `unless` body) — a closure handed in by the runtime (Arc 4b) */
  thenCommands: Op;
  /** The compiled else branch, `if` only */
  elseCommands?: Op;
}

// Backwards compatibility type aliases
export interface IfCommandInput extends ConditionalCommandInput {}
export interface UnlessCommandInput {
  condition: unknown;
  commands: ASTNode[];
}

/**
 * Output from ConditionalCommand execution
 */
export interface ConditionalCommandOutput {
  mode: ConditionalMode;
  conditionResult: boolean;
  executedBranch: 'then' | 'else' | 'none';
  /** Result from the executed branch (unknown type depends on commands) */
  result: unknown;
}

// Backwards compatibility type alias
export interface IfCommandOutput extends ConditionalCommandOutput {}

/**
 * ConditionalCommand - Consolidated if/unless execution
 *
 * Handles both 'if' and 'unless' syntax through mode detection.
 * - 'if' mode: executes then-branch when condition is TRUE
 * - 'unless' mode: executes then-branch when condition is FALSE
 */
@command({ name: 'if' })
export class ConditionalCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Conditional execution based on boolean expressions',
    syntax: [
      'if <condition> then <commands>',
      'if <condition> then <commands> else <commands>',
      'unless <condition> <commands>',
    ],
    examples: [
      'if x > 5 then add .active',
      'if user.isAdmin then show #adminPanel else hide #adminPanel',
      'unless user.isLoggedIn showLoginForm',
    ],
    sideEffects: ['conditional-execution'],
    aliases: ['unless'],
    category: 'control-flow',
    compatibility: 'standard',
  });

  get metadata() {
    return ConditionalCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'if'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ConditionalCommandInput> {
    // Detect mode from command name
    const mode: ConditionalMode = raw.commandName?.toLowerCase() === 'unless' ? 'unless' : 'if';

    if (!raw.args || raw.args.length === 0) {
      throw new Error(`${mode} command requires a condition to evaluate`);
    }

    let thenCommands: Op | undefined;
    let elseCommands: Op | undefined;

    if (mode === 'unless') {
      // unless <condition> <commands> — simpler syntax, no else branch.
      //
      // The parser wraps the body in a single block node at args[1] for EVERY
      // surface form (then/end, bare single-line, multi-command, inside a
      // handler) — exactly as it does for `if`; see parseIfCommand. Take that
      // node, not `raw.args.slice(1)`: the array path routed the body through
      // executeCommands, whose fallthrough returned a parsed AST node verbatim
      // instead of executing it — so every `unless` body was silently a no-op
      // (and the returned node leaked into `it` via a since-removed
      // unless-only self-assign).
      //
      // A stray else block the parser may have attached (args[2]) is
      // deliberately ignored: unless has no else, and execute() never runs
      // elseCommands in unless mode.
      if (raw.args.length < 2) {
        throw new Error('unless command requires a condition and at least one command');
      }
      thenCommands = bodyOp(raw, 1);
    } else {
      // if <condition> then <commands> [else <commands>]
      if (raw.args.length >= 2 && raw.args[1]) {
        thenCommands = bodyOp(raw, 1);
        elseCommands = raw.args.length >= 3 ? bodyOp(raw, 2) : undefined;
      }

      if (!thenCommands) {
        throw new Error('if command requires "then" branch with commands');
      }
    }

    const condition = await evaluator.evaluate(raw.args[0], context);
    return { mode, condition, thenCommands: thenCommands!, elseCommands };
  }

  async execute(
    input: ConditionalCommandInput,
    context: TypedExecutionContext
  ): Promise<ConditionalCommandOutput | ExecutionSignal> {
    const { mode, condition, thenCommands, elseCommands } = input;
    const rawConditionResult = evaluateCondition(condition, context);

    // For 'unless' mode, we invert the condition logic:
    // - 'if' executes then-branch when TRUE
    // - 'unless' executes then-branch when FALSE
    const shouldExecuteThen = mode === 'unless' ? !rawConditionResult : rawConditionResult;

    let executedBranch: 'then' | 'else' | 'none';
    let result: unknown;
    let branch: Op | undefined;

    if (shouldExecuteThen) {
      executedBranch = 'then';
      branch = thenCommands;
      // No `it` assignment: parity with `if`, which leaves `it` to the body's
      // own commands. The removed unless-only self-assign existed only to
      // propagate the body's last result — and in practice propagated the
      // unexecuted AST node (see parseInput's unless comment).
    } else if (elseCommands && mode === 'if') {
      executedBranch = 'else';
      branch = elseCommands;
    } else {
      executedBranch = 'none';
    }
    if (branch) {
      const outcome = await branch(context);
      // A signal from the branch passes through to the boundary that owns it.
      if (!isOk(outcome)) return outcome.error;
      result = outcome.value;
    }

    return { mode, conditionResult: rawConditionResult, executedBranch, result };
  }
}

// Primary exports
export const createConditionalCommand = createFactory(ConditionalCommand);

// Backwards compatibility - IfCommand alias
export { ConditionalCommand as IfCommand };
export const createIfCommand = createConditionalCommand;

// Backwards compatibility - UnlessCommand alias
export { ConditionalCommand as UnlessCommand };
export const createUnlessCommand = createConditionalCommand;

export default ConditionalCommand;
