/**
 * PutCommand V2 - Enhanced with parseInput() for RuntimeBase
 * Non-destructive wrapper that extends the original PutCommand
 */

import { PutCommand as PutCommandV1 } from '../../commands/dom/put';
import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface PutCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Enhanced PutCommand with parseInput() method for tree-shakable RuntimeBase
 *
 * This wrapper extends the original PutCommand and adds argument parsing
 * logic that was previously in Runtime.executePutCommand() (lines 2335-2419).
 */
export class PutCommand extends PutCommandV1 {
  /**
   * Parse raw AST input into evaluated arguments tuple
   *
   * Put command syntax: "put <content> (into|before|after|at start of|at end of) <target>"
   *
   * This mirrors Runtime.executePutCommand() logic (lines 2335-2419):
   * - Find preposition keyword to split arguments
   * - Evaluate content (everything before preposition)
   * - Extract preposition string (not evaluated)
   * - Handle target (everything after preposition) with special resolution
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Tuple [content, position, target]
   */
  async parseInput(
    raw: PutCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any[]> {
    const rawArgs = raw.args;

    if (!rawArgs || rawArgs.length === 0) {
      return [undefined, undefined, undefined];
    }

    // Helper to get node type
    const nodeType = (node: ASTNode): string => {
      if (!node || typeof node !== 'object') return 'unknown';
      return (node as any).type || 'unknown';
    };

    // Find the preposition keyword to split the arguments
    let prepositionIndex = -1;
    let prepositionArg: string | null = null;

    const validPrepositions = ['into', 'before', 'after', 'at', 'at start of', 'at end of'];

    for (let i = 0; i < rawArgs.length; i++) {
      const arg = rawArgs[i];
      const argType = nodeType(arg);
      const argValue = (argType === 'literal' ? (arg as any).value : (arg as any).name) as string;

      if (
        (argType === 'literal' || argType === 'identifier') &&
        validPrepositions.includes(argValue)
      ) {
        prepositionIndex = i;
        prepositionArg = argValue;
        break;
      }
    }

    // Parse arguments based on preposition location
    let contentArg: ASTNode | null = null;
    let targetArg: ASTNode | null = null;

    if (prepositionIndex === -1) {
      // Fallback to old logic: [content, preposition, target]
      if (rawArgs.length >= 3) {
        contentArg = rawArgs[0];
        prepositionArg = (rawArgs[1] as any)?.value || (rawArgs[1] as any)?.name || null;
        targetArg = rawArgs[2];
      }
    } else {
      // Split arguments around the preposition
      const contentArgs = rawArgs.slice(0, prepositionIndex);
      const targetArgs = rawArgs.slice(prepositionIndex + 1);

      // Use first content arg (or combine if multiple)
      contentArg = contentArgs.length > 0 ? contentArgs[0] : null;
      targetArg = targetArgs.length > 0 ? targetArgs[0] : null;
    }

    // Evaluate content
    const content = contentArg ? await evaluator.evaluate(contentArg, context) : undefined;

    // Preposition is already a string
    const preposition = prepositionArg;

    // Handle target resolution with special cases
    let target: any;

    if (targetArg) {
      const targetType = nodeType(targetArg);

      // Handle 'me' identifier specially
      if (targetType === 'identifier' && (targetArg as any).name === 'me') {
        target = context.me;
      }
      // Handle other identifiers as strings (for CSS selectors or context lookup)
      else if (targetType === 'identifier') {
        target = (targetArg as any).name;
      }
      // Handle literals (string selectors)
      else if (targetType === 'literal') {
        target = (targetArg as any).value;
      }
      // Handle selectors (CSS selectors)
      else if (targetType === 'selector') {
        target = (targetArg as any).value;
      }
      // Handle memberExpression (property access like "#target.innerHTML")
      else if (targetType === 'memberExpression') {
        // Reconstruct the selector string with property access
        let selector = '';
        const obj = (targetArg as any).object;
        const prop = (targetArg as any).property;

        if (obj?.type === 'selector') {
          selector = obj.value;
        } else if (obj?.type === 'identifier') {
          selector = obj.name;
        }

        if (selector && prop?.name) {
          target = `${selector}.${prop.name}`;
        } else {
          // Fallback: evaluate if we can't reconstruct
          target = await evaluator.evaluate(targetArg, context);
        }
      }
      // For other types, evaluate them
      else {
        target = await evaluator.evaluate(targetArg, context);
      }
    } else {
      target = undefined;
    }

    // Return tuple for execute(context, ...args)
    return [content, preposition, target];
  }

  // execute() is inherited from PutCommandV1 - no changes needed!
}

/**
 * Factory function for creating PutCommand instances
 * Maintains compatibility with existing command registration
 */
export function createPutCommand(): PutCommand {
  return new PutCommand();
}
