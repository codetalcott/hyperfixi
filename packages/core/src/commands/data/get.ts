/**
 * GetCommand - Standalone V2 Implementation
 *
 * Evaluates an expression and stores the result in `it`
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by avoiding all shared utilities.
 *
 * Syntax:
 *   get <expression>              # Evaluate expression, store in 'it'
 *   get <expression> then ...     # Evaluate and chain with next command
 *
 * @example
 *   get #my-dialog
 *   call it.showModal()
 *
 *   get #count then set x to it.textContent
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for GetCommand
 * Represents parsed arguments ready for execution
 */
export interface GetCommandInput {
  /** The evaluated value to store in 'it' */
  value: unknown;
}

/**
 * Typed output for GetCommand
 * Represents the result of the get command
 */
export interface GetCommandOutput {
  /** The value that was stored in 'it' */
  value: unknown;
}

/**
 * GetCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Evaluates an expression and stores the result in the execution context's `it`.
 */
export class GetCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'get';

  /**
   * Command metadata for documentation and tooling
   */
  readonly metadata = {
    description: 'Evaluate an expression and store the result in it',
    syntax: 'get <expression>',
    examples: [
      'get #my-dialog',
      'get <button/>',
      'get me.parentElement',
      'get #count then set x to it.textContent',
    ],
    category: 'data',
    sideEffects: ['context-mutation'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Evaluates the expression argument to get the value to store.
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
  ): Promise<GetCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('get command requires an expression argument');
    }

    // Evaluate the first argument to get the value
    const firstArg = raw.args[0];
    const value = await evaluator.evaluate(firstArg, context);

    // Handle NodeList/array - if it's a single element, unwrap it
    if (value instanceof NodeList && value.length === 1) {
      return { value: value[0] };
    }
    if (Array.isArray(value) && value.length === 1) {
      return { value: value[0] };
    }

    return { value };
  }

  /**
   * Execute the get command
   *
   * Stores the value in the execution context's `it` property.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns The value that was stored
   */
  execute(
    input: GetCommandInput,
    context: TypedExecutionContext
  ): GetCommandOutput {
    // Store the value in 'it' for subsequent commands
    // TypeScript marks 'it' as readonly but hyperscript semantics require mutation
    (context as { it: unknown }).it = input.value;

    return { value: input.value };
  }

  /**
   * Validate parsed input (optional but recommended)
   *
   * @param input - Input to validate
   * @returns true if input is valid GetCommandInput
   */
  validate(input: unknown): input is GetCommandInput {
    if (typeof input !== 'object' || input === null) return false;

    const typed = input as Partial<GetCommandInput>;

    // Value can be anything (undefined, null, elements, etc.)
    return 'value' in typed;
  }
}

// ========== Factory Function ==========

/**
 * Factory function for creating GetCommand instances
 * Maintains compatibility with existing command registration patterns
 *
 * @returns New GetCommand instance
 */
export function createGetCommand(): GetCommand {
  return new GetCommand();
}

// Default export for convenience
export default GetCommand;
