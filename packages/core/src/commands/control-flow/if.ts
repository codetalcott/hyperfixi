/**
 * IfCommand - Standalone V2 Implementation
 *
 * Conditional execution based on boolean expressions
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Condition evaluation (boolean, string, number, objects)
 * - Then branch execution (when condition is true)
 * - Else branch execution (when condition is false, optional)
 * - Variable lookup in context (locals, globals, variables)
 * - Smart truthiness evaluation (JavaScript semantics)
 *
 * Syntax:
 *   if <condition> then <commands>
 *   if <condition> then <commands> else <commands>
 *
 * @example
 *   if x > 5 then add .active
 *   if user.isAdmin then show #adminPanel else hide #adminPanel
 *   if form.checkValidity() then submit else show .error
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { evaluateCondition } from '../helpers/condition-helpers';

/**
 * Typed input for IfCommand
 * Represents parsed condition and command branches ready for execution
 */
export interface IfCommandInput {
  /** Evaluated condition value (already evaluated by parseInput) */
  condition: any;
  /** Commands to execute when condition is true (AST nodes) */
  thenCommands: any;
  /** Commands to execute when condition is false (AST nodes, optional) */
  elseCommands?: any;
}

/**
 * Output from If command execution
 */
export interface IfCommandOutput {
  /** Boolean result of condition evaluation */
  conditionResult: boolean;
  /** Which branch was executed */
  executedBranch: 'then' | 'else' | 'none';
  /** Result from executed branch */
  result: any;
}

/**
 * IfCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 310 lines (with validation, type guards, debug logging)
 * V2 Target: ~250 lines (19% reduction, all features preserved)
 */
export class IfCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'if';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Conditional execution based on boolean expressions',
    syntax: [
      'if <condition> then <commands>',
      'if <condition> then <commands> else <commands>',
    ],
    examples: [
      'if x > 5 then add .active',
      'if user.isAdmin then show #adminPanel else hide #adminPanel',
      'if localStorage.getItem("theme") == "dark" then add .dark-mode',
      'if form.checkValidity() then submit else show .error',
    ],
    category: 'control-flow',
    sideEffects: ['conditional-execution'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Extracts condition and command branches from AST.
   * The condition is NOT evaluated here - it's passed as-is to execute()
   * which will evaluate it using the context at execution time.
   *
   * Note: The parser structures the AST in TWO possible ways:
   * 1. Args-based (from parser):
   *    - raw.args[0] = condition expression
   *    - raw.args[1] = then block (type: 'block', commands: [...])
   *    - raw.args[2] = else block (optional)
   * 2. Modifiers-based (alternative):
   *    - raw.args[0] = condition expression
   *    - raw.modifiers.then = then branch commands
   *    - raw.modifiers.else = else branch commands (optional)
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<IfCommandInput> {
    // Validate that we have a condition
    if (!raw.args || raw.args.length === 0) {
      throw new Error('if command requires a condition to evaluate');
    }

    // Determine then/else branches - check both args and modifiers
    // Parser puts blocks in args[1]/args[2], but some paths may use modifiers
    let thenCommands: any;
    let elseCommands: any;

    // Check args-based format first (primary parser output)
    if (raw.args.length >= 2 && raw.args[1]) {
      thenCommands = raw.args[1];
      elseCommands = raw.args.length >= 3 ? raw.args[2] : undefined;
    }
    // Fallback to modifiers-based format
    else if (raw.modifiers?.then) {
      thenCommands = raw.modifiers.then;
      elseCommands = raw.modifiers.else;
    }

    // Validate that we have then commands
    if (!thenCommands) {
      throw new Error('if command requires "then" branch with commands');
    }

    // Evaluate the condition
    const condition = await evaluator.evaluate(raw.args[0], context);

    return {
      condition,
      thenCommands,
      elseCommands,
    };
  }

  /**
   * Execute the if command
   *
   * Evaluates the condition to a boolean and executes the appropriate branch.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Result indicating which branch was executed and its result
   */
  async execute(
    input: IfCommandInput,
    context: TypedExecutionContext
  ): Promise<IfCommandOutput> {
    const { condition, thenCommands, elseCommands } = input;

    // Evaluate condition to boolean
    const conditionResult = evaluateCondition(condition, context);

    let executedBranch: 'then' | 'else' | 'none';
    let result: any = undefined;

    if (conditionResult) {
      // Execute then branch
      executedBranch = 'then';
      result = await this.executeCommandsOrBlock(thenCommands, context);
    } else if (elseCommands) {
      // Execute else branch (if present)
      executedBranch = 'else';
      result = await this.executeCommandsOrBlock(elseCommands, context);
    } else {
      // No branch executed (condition false, no else)
      executedBranch = 'none';
    }

    return {
      conditionResult,
      executedBranch,
      result,
    };
  }

  // ========== Private Utility Methods ==========

  /**
   * Execute commands or block node
   *
   * Handles different command formats:
   * - Block node (type: 'block', commands: [...]) - from parser
   * - Array of commands - from simplified syntax
   * - Single command or value - literal
   *
   * @param commandsOrBlock - Commands to execute
   * @param context - Execution context
   * @returns Result of execution
   */
  private async executeCommandsOrBlock(
    commandsOrBlock: any,
    context: TypedExecutionContext
  ): Promise<any> {
    // Handle block nodes from parser
    if (
      commandsOrBlock &&
      typeof commandsOrBlock === 'object' &&
      commandsOrBlock.type === 'block'
    ) {
      return this.executeBlock(commandsOrBlock, context);
    }

    // Handle array of commands
    if (Array.isArray(commandsOrBlock)) {
      return this.executeCommands(commandsOrBlock, context);
    }

    // Single command or value
    return commandsOrBlock;
  }

  /**
   * Execute a block node using runtime
   *
   * Block nodes are structured as: { type: 'block', commands: [...] }
   * We use the runtime's execute function from context to run each command.
   *
   * @param block - Block node from parser
   * @param context - Execution context
   * @returns Result of last command in block
   */
  private async executeBlock(block: any, context: TypedExecutionContext): Promise<any> {
    // Get the runtime execute function from context
    const runtimeExecute = context.locals.get('_runtimeExecute') as any;
    if (!runtimeExecute) {
      throw new Error('Runtime execute function not available in context');
    }

    let lastResult: any = undefined;

    // Execute each command in the block
    if (block.commands && Array.isArray(block.commands)) {
      for (const command of block.commands) {
        lastResult = await runtimeExecute(command, context);
      }
    }

    return lastResult;
  }

  /**
   * Execute an array of commands
   *
   * Each command can be:
   * - Command object with execute() method
   * - Function to call
   * - Literal value or expression
   *
   * @param commands - Array of commands to execute
   * @param context - Execution context
   * @returns Result of last command
   */
  private async executeCommands(commands: any[], context: TypedExecutionContext): Promise<any> {
    let lastResult: any = undefined;

    for (const command of commands) {
      if (command && typeof command.execute === 'function') {
        // Command object
        lastResult = await command.execute(context);
      } else if (typeof command === 'function') {
        // Function
        lastResult = await command();
      } else {
        // Literal value
        lastResult = command;
      }
    }

    return lastResult;
  }
}

/**
 * Factory function to create IfCommand instance
 */
export function createIfCommand(): IfCommand {
  return new IfCommand();
}
