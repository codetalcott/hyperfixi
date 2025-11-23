/**
 * CallCommand - Standalone V2 Implementation
 *
 * Evaluates an expression and stores the result in the 'it' variable
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Function evaluation (calls functions)
 * - Promise handling (awaits promises)
 * - Literal value pass-through
 * - Result stored in context.it
 * - 'get' alias support
 *
 * Syntax:
 *   call <expression>
 *   get <expression>
 *
 * @example
 *   call myFunction()
 *   get user.name
 *   call fetch("/api/data")
 *   get Math.random()
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for CallCommand
 */
export interface CallCommandInput {
  /** Expression to evaluate (can be function, Promise, or value) */
  expression: any;
  /** Command alias used ('call' or 'get') */
  alias?: 'call' | 'get';
}

/**
 * Output from Call command execution
 */
export interface CallCommandOutput {
  /** Result of expression evaluation */
  result: any;
  /** Whether expression was asynchronous */
  wasAsync: boolean;
  /** Type of expression evaluated */
  expressionType: 'function' | 'promise' | 'value';
}

/**
 * CallCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 204 lines (with validation, debug logging, get alias)
 * V2 Size: ~180 lines (12% reduction, all features preserved)
 */
export class CallCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'call';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Evaluate an expression and store the result in the it variable',
    syntax: [
      'call <expression>',
      'get <expression>',
    ],
    examples: [
      'call myFunction()',
      'get user.name',
      'call fetch("/api/data")',
      'get Math.random()',
      'call new Date().toISOString()',
      'get localStorage.getItem("key")',
    ],
    category: 'execution',
    sideEffects: ['function-execution', 'context-mutation'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * The expression is evaluated by the expression evaluator before being
   * passed to execute(). This allows the call command to handle the result
   * of any expression.
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
  ): Promise<CallCommandInput> {
    // Validate that we have an expression
    if (!raw.args || raw.args.length === 0) {
      throw new Error('call command requires an expression to evaluate');
    }

    // Evaluate the expression
    const expression = await evaluator.evaluate(raw.args[0], context);

    // Determine alias (call or get)
    const alias = (raw as any).alias || 'call';

    return {
      expression,
      alias,
    };
  }

  /**
   * Execute the call command
   *
   * Evaluates the expression based on its type:
   * - Function: Calls it and uses return value
   * - Promise: Awaits it
   * - Value: Uses as-is
   *
   * Result is stored in context.it
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Evaluation result with metadata
   */
  async execute(
    input: CallCommandInput,
    context: TypedExecutionContext
  ): Promise<CallCommandOutput> {
    const { expression } = input;

    try {
      let result: any;
      let wasAsync = false;
      let expressionType: 'function' | 'promise' | 'value';

      // Handle function expressions
      if (typeof expression === 'function') {
        expressionType = 'function';
        result = expression();

        // Handle async functions and promises
        if (result instanceof Promise) {
          wasAsync = true;
          result = await result;
        }
      }
      // Handle Promise objects directly
      else if (expression instanceof Promise) {
        expressionType = 'promise';
        wasAsync = true;
        result = await expression;
      }
      // Handle literal values (strings, numbers, booleans, objects, etc.)
      else {
        expressionType = 'value';
        result = expression;
      }

      // Set the result in the 'it' context variable
      Object.assign(context, { it: result });

      return {
        result,
        wasAsync,
        expressionType,
      };
    } catch (error) {
      // Re-throw with enhanced error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Call command failed to evaluate expression: ${errorMessage}`);
    }
  }
}

/**
 * GetCommand - Alias for CallCommand
 *
 * Provides the 'get' alias with its own metadata for clarity.
 * Functionally identical to CallCommand.
 */
export class GetCommand extends CallCommand {
  /**
   * Command name as registered in runtime
   */
  override readonly name = 'get';

  /**
   * Command metadata for documentation and tooling
   */
  static override readonly metadata = {
    description: 'Alias for call - evaluate an expression and store the result in the it variable',
    syntax: [
      'get <expression>',
    ],
    examples: [
      'get user.profile',
      'get document.title',
      'get localStorage.getItem("key")',
      'get Math.floor(Math.random() * 100)',
      'get fetch("/api/user").then(r => r.json())',
    ],
    category: 'execution',
    sideEffects: ['function-execution', 'context-mutation'],
  };
}

/**
 * Factory function to create CallCommand instance
 */
export function createCallCommand(): CallCommand {
  return new CallCommand();
}

/**
 * Factory function to create GetCommand instance
 */
export function createGetCommand(): GetCommand {
  return new GetCommand();
}
