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
  /** AST node(s) for the then branch commands (or 'unless' commands) */
  thenCommands: ASTNode | ASTNode[];
  /** AST node(s) for the else branch commands (optional, only for 'if' mode) */
  elseCommands?: ASTNode | ASTNode[];
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
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode>; commandName?: string },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ConditionalCommandInput> {
    // Detect mode from command name
    const mode: ConditionalMode = raw.commandName?.toLowerCase() === 'unless' ? 'unless' : 'if';

    if (!raw.args || raw.args.length === 0) {
      throw new Error(`${mode} command requires a condition to evaluate`);
    }

    let thenCommands: ASTNode | ASTNode[] | undefined;
    let elseCommands: ASTNode | ASTNode[] | undefined;

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
      thenCommands = raw.args[1];
    } else {
      // if <condition> then <commands> [else <commands>]
      if (raw.args.length >= 2 && raw.args[1]) {
        thenCommands = raw.args[1];
        elseCommands = raw.args.length >= 3 ? raw.args[2] : undefined;
      } else if (raw.modifiers?.then) {
        thenCommands = raw.modifiers.then;
        elseCommands = raw.modifiers.else;
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
  ): Promise<ConditionalCommandOutput> {
    const { mode, condition, thenCommands, elseCommands } = input;
    const rawConditionResult = evaluateCondition(condition, context);

    // For 'unless' mode, we invert the condition logic:
    // - 'if' executes then-branch when TRUE
    // - 'unless' executes then-branch when FALSE
    const shouldExecuteThen = mode === 'unless' ? !rawConditionResult : rawConditionResult;

    let executedBranch: 'then' | 'else' | 'none';
    let result: any;

    if (shouldExecuteThen) {
      executedBranch = 'then';
      result = await this.executeCommandsOrBlock(thenCommands, context);
      // No `it` assignment: parity with `if`, which leaves `it` to the body's
      // own commands. The removed unless-only self-assign existed only to
      // propagate the body's last result — and in practice propagated the
      // unexecuted AST node (see parseInput's unless comment).
    } else if (elseCommands && mode === 'if') {
      executedBranch = 'else';
      result = await this.executeCommandsOrBlock(elseCommands, context);
    } else {
      executedBranch = 'none';
    }

    return { mode, conditionResult: rawConditionResult, executedBranch, result };
  }

  private async executeCommandsOrBlock(
    commandsOrBlock: any,
    context: TypedExecutionContext
  ): Promise<any> {
    if (commandsOrBlock?.type === 'block') {
      return this.executeBlock(commandsOrBlock, context);
    }
    if (Array.isArray(commandsOrBlock)) {
      return this.executeCommands(commandsOrBlock, context);
    }
    // A single body value (an executable, or one AST command node) executes
    // through the same path as a one-element array. The old `return
    // commandsOrBlock` fallthrough handed the body back UNEXECUTED — the same
    // silent no-op class as the unless args.slice(1) bug; executeCommands
    // still passes plain values through untouched.
    return this.executeCommands([commandsOrBlock], context);
  }

  private async executeBlock(block: any, context: TypedExecutionContext): Promise<any> {
    const runtimeExecute = context.locals.get('_runtimeExecute') as any;
    if (!runtimeExecute) throw new Error('Runtime execute function not available');

    let lastResult: any;
    if (block.commands?.length) {
      for (const cmd of block.commands) {
        lastResult = await runtimeExecute(cmd, context);
      }
    }
    return lastResult;
  }

  private async executeCommands(commands: any[], context: TypedExecutionContext): Promise<any> {
    let lastResult: any;
    for (const cmd of commands) {
      if (cmd?.execute) lastResult = await cmd.execute(context);
      else if (typeof cmd === 'function') lastResult = await cmd();
      else if (cmd && typeof cmd === 'object' && typeof cmd.type === 'string') {
        // A parsed AST node has neither an execute method nor callability; it
        // must go through the runtime, same as executeBlock. Returning it
        // verbatim (the old fallthrough) is how `unless` bodies silently never
        // executed — keep this branch so an array-of-nodes input from a direct
        // API caller executes instead of reproducing that bug.
        const runtimeExecute = context.locals.get('_runtimeExecute') as any;
        if (!runtimeExecute) throw new Error('Runtime execute function not available');
        lastResult = await runtimeExecute(cmd, context);
      } else lastResult = cmd;
    }
    return lastResult;
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
