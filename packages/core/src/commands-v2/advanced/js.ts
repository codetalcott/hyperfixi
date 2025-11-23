/**
 * JsCommand - Standalone V2 Implementation
 *
 * Executes inline JavaScript code with access to hyperscript context
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Execute JavaScript code using new Function()
 * - Access to hyperscript context (me, it, you, locals, globals)
 * - Optional parameter passing
 * - Result stored in context.it
 * - Error handling with context
 *
 * Syntax:
 *   js <code> end
 *   js([param1, param2]) <code> end
 *
 * @example
 *   js console.log("Hello World") end
 *   js([x, y]) return x + y end
 *   js me.style.color = "red" end
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for JsCommand
 */
export interface JsCommandInput {
  /** JavaScript code to execute */
  code: string;
  /** Optional parameter names */
  parameters?: string[];
}

/**
 * Output from js command execution
 */
export interface JsCommandOutput {
  result: any;
  executed: boolean;
  codeLength: number;
  parameters?: string[];
}

/**
 * JsCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 297 lines
 * V2 Target: ~280 lines (inline utilities, standalone)
 */
export class JsCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'js';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Execute inline JavaScript code with access to hyperscript context',
    syntax: ['js <code> end', 'js([params]) <code> end'],
    examples: [
      'js console.log("Hello") end',
      'js([x, y]) return x + y end',
      'js me.style.color = "red" end',
      'js([element]) element.classList.add("active") end',
    ],
    category: 'advanced',
    sideEffects: ['code-execution', 'data-mutation'],
  };

  /**
   * Parse raw AST nodes into typed command input
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
  ): Promise<JsCommandInput> {
    let code: string;
    let parameters: string[] | undefined;

    // Check if first arg is parameters array
    if (raw.args.length >= 2 && Array.isArray(raw.args[0])) {
      // Format: js([param1, param2]) <code> end
      parameters = raw.args[0] as string[];
      code = String(await evaluator.evaluate(raw.args[1], context));
    } else if (raw.args.length >= 1) {
      // Format: js <code> end
      code = String(await evaluator.evaluate(raw.args[0], context));
    } else {
      throw new Error('js command requires JavaScript code');
    }

    return {
      code,
      parameters,
    };
  }

  /**
   * Execute the js command
   *
   * Executes JavaScript code with access to hyperscript context.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Execution result with code result
   */
  async execute(
    input: JsCommandInput,
    context: TypedExecutionContext
  ): Promise<JsCommandOutput> {
    const { code, parameters = [] } = input;

    // Skip execution if code is empty or only whitespace
    if (!code.trim()) {
      return {
        result: undefined,
        executed: false,
        codeLength: code.length,
        parameters,
      };
    }

    try {
      // Create execution context with access to hyperscript variables
      const executionContext = this.createExecutionContext(context, parameters);

      // Execute the JavaScript code
      const func = new Function(...Object.keys(executionContext), code);
      const result = await func(...Object.values(executionContext));

      // Set the result in context
      Object.assign(context, { it: result });

      return {
        result,
        executed: true,
        codeLength: code.length,
        parameters,
      };
    } catch (error) {
      throw new Error(
        `JavaScript execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ========== Private Utility Methods ==========

  /**
   * Create execution context for JavaScript code
   *
   * Provides access to hyperscript context variables and parameters.
   *
   * @param context - Hyperscript execution context
   * @param parameters - Parameter names to extract from context
   * @returns Execution context object for Function constructor
   */
  private createExecutionContext(
    context: TypedExecutionContext,
    parameters: string[]
  ): Record<string, any> {
    const executionContext: Record<string, any> = {
      // Hyperscript context variables
      me: context.me,
      it: context.it,
      you: context.you,

      // Access to context data
      locals: context.locals,
      globals: context.globals,
      variables: context.variables,

      // Utility functions
      console,
      document: typeof document !== 'undefined' ? document : undefined,
      window: typeof window !== 'undefined' ? window : undefined,

      // Parameter values from context
      ...parameters.reduce(
        (acc, param) => {
          acc[param] = context.locals?.get(param);
          return acc;
        },
        {} as Record<string, any>
      ),
    };

    return executionContext;
  }
}

/**
 * Factory function to create JsCommand instance
 */
export function createJsCommand(): JsCommand {
  return new JsCommand();
}
