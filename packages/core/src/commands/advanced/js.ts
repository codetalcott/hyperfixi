/**
 * JsCommand - Decorated Implementation
 *
 * Executes inline JavaScript code with access to hyperscript context.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   js <code> end
 *   js(param1, param2) <code> end
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

export interface JsCommandInput {
  code: string;
  parameters?: string[];
}

export interface JsCommandOutput {
  result: any;
  executed: boolean;
  codeLength: number;
  parameters?: string[];
}

/**
 * JsCommand - Execute inline JavaScript
 *
 * Before: 241 lines
 * After: ~160 lines (34% reduction)
 */
@meta({
  description: 'Execute inline JavaScript code with access to hyperscript context',
  syntax: ['js <code> end', 'js(param1, param2) <code> end'],
  examples: ['js console.log("Hello") end', 'js(x, y) return x + y end', 'js me.style.color = "red" end'],
  sideEffects: ['code-execution', 'data-mutation'],
})
@command({ name: 'js', category: 'advanced' })
export class JsCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: ExpressionEvaluator,
    _context: ExecutionContext
  ): Promise<JsCommandInput> {
    let code: string;
    let parameters: string[] | undefined;

    if (raw.args.length === 0) {
      throw new Error('js command requires JavaScript code');
    }

    // New format from parseJsCommand:
    // args[0] = { type: 'literal', value: 'code string' }
    // args[1] = { type: 'arrayLiteral', elements: [{type: 'literal', value: 'paramName'}, ...] }
    const codeNode = raw.args[0] as ASTNode & { value?: unknown };
    const paramsNode = raw.args[1] as ASTNode & { elements?: Array<ASTNode & { value?: unknown }> };

    // Extract code from literal node
    if (codeNode && codeNode.type === 'literal' && typeof codeNode.value === 'string') {
      code = codeNode.value;
    } else if (codeNode && typeof codeNode.value !== 'undefined') {
      // Fallback: value might be directly on the node
      code = String(codeNode.value);
    } else {
      throw new Error('js command requires JavaScript code');
    }

    // Extract parameter names from arrayLiteral node
    if (paramsNode && paramsNode.type === 'arrayLiteral' && Array.isArray(paramsNode.elements)) {
      parameters = paramsNode.elements
        .map((el) => (typeof el.value === 'string' ? el.value : String(el.value)))
        .filter((p) => p && p.length > 0);
    }

    const result: JsCommandInput = { code };
    if (parameters && parameters.length > 0) {
      result.parameters = parameters;
    }
    return result;
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

export const createJsCommand = createFactory(JsCommand);
export default JsCommand;
