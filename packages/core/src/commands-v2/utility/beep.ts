/**
 * BeepCommand - Standalone V2 Implementation
 *
 * Provides debugging output for expressions with type information
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Debug output to console
 * - Type information display
 * - Multiple expression support
 * - Context inspection
 * - Inline debug utilities
 *
 * Syntax:
 *   beep!
 *   beep! <expression>
 *   beep! <expression>, <expression>, ...
 *
 * @example
 *   beep!
 *   beep! myValue
 *   beep! me.id, me.className
 *   beep! user.name, user.age
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for BeepCommand
 */
export interface BeepCommandInput {
  /** Expressions to debug (optional) */
  expressions?: any[];
}

/**
 * Output from beep command execution
 */
export interface BeepCommandOutput {
  expressionCount: number;
  debugged: boolean;
  outputs: Array<{
    value: any;
    type: string;
    representation: string;
  }>;
}

/**
 * BeepCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining debug utilities.
 *
 * V1 Size: 223 lines (with debug utils dependency)
 * V2 Target: ~240 lines (inline debug utilities, standalone)
 */
export class BeepCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'beep';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Debug output for expressions with type information',
    syntax: ['beep!', 'beep! <expression>', 'beep! <expression>, <expression>, ...'],
    examples: [
      'beep!',
      'beep! myValue',
      'beep! me.id, me.className',
      'beep! user.name, user.age',
    ],
    category: 'utility',
    sideEffects: ['console-output', 'debugging'],
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
  ): Promise<BeepCommandInput> {
    // beep! can be called with no arguments (debug context)
    if (raw.args.length === 0) {
      return { expressions: [] };
    }

    // Evaluate all expressions
    const expressions = await Promise.all(
      raw.args.map((arg) => evaluator.evaluate(arg, context))
    );

    return { expressions };
  }

  /**
   * Execute the beep command
   *
   * Outputs debug information to console.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Debug operation result
   */
  async execute(
    input: BeepCommandInput,
    context: TypedExecutionContext
  ): Promise<BeepCommandOutput> {
    const expressions = input.expressions || [];

    // If no expressions, beep with context info
    if (expressions.length === 0) {
      this.debugContext(context);
      return {
        expressionCount: 0,
        debugged: true,
        outputs: [],
      };
    }

    const outputs: Array<{ value: any; type: string; representation: string }> = [];

    // Start debug group
    console.group('🔔 beep! Debug Output');

    // Process each expression
    for (const expression of expressions) {
      const output = this.debugExpression(expression);
      outputs.push(output);

      // Log to console
      console.log(`Value:`, expression);
      console.log(`Type:`, output.type);
      console.log(`Representation:`, output.representation);
      console.log('---');
    }

    console.groupEnd();

    return {
      expressionCount: expressions.length,
      debugged: true,
      outputs,
    };
  }

  // ========== Private Utility Methods ==========

  /**
   * Debug context information
   * (Inline utility replacing V1 debug.ts dependency)
   *
   * @param context - Execution context
   */
  private debugContext(context: TypedExecutionContext): void {
    console.group('🔔 beep! Context Debug');
    console.log('me:', context.me);
    console.log('it:', context.it);
    console.log('you:', context.you);
    console.log('locals:', context.locals);
    console.log('globals:', context.globals);
    console.log('variables:', context.variables);
    console.groupEnd();
  }

  /**
   * Debug expression value
   * (Inline utility replacing V1 debug.ts dependency)
   *
   * @param expression - Expression value to debug
   * @returns Debug information
   */
  private debugExpression(expression: any): {
    value: any;
    type: string;
    representation: string;
  } {
    const type = this.getType(expression);
    const representation = this.getRepresentation(expression);

    return {
      value: expression,
      type,
      representation,
    };
  }

  /**
   * Get type string for value
   * (Inline utility replacing V1 debug.ts dependency)
   *
   * @param value - Value to get type for
   * @returns Type string
   */
  private getType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (value instanceof HTMLElement) return 'HTMLElement';
    if (value instanceof Element) return 'Element';
    if (value instanceof Node) return 'Node';
    if (value instanceof Error) return 'Error';
    if (value instanceof Date) return 'Date';
    if (value instanceof RegExp) return 'RegExp';
    return typeof value;
  }

  /**
   * Get string representation of value
   * (Inline utility replacing V1 debug.ts dependency)
   *
   * @param value - Value to get representation for
   * @returns String representation
   */
  private getRepresentation(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    if (Array.isArray(value)) {
      return `Array(${value.length}) [${value.slice(0, 3).map(v => this.getRepresentation(v)).join(', ')}${value.length > 3 ? '...' : ''}]`;
    }

    if (value instanceof HTMLElement) {
      const tag = value.tagName.toLowerCase();
      const id = value.id ? `#${value.id}` : '';
      const classes = value.className ? `.${value.className.split(' ').join('.')}` : '';
      return `<${tag}${id}${classes}/>`;
    }

    if (value instanceof Error) {
      return `Error: ${value.message}`;
    }

    if (typeof value === 'string') {
      return value.length > 50 ? `"${value.substring(0, 47)}..."` : `"${value}"`;
    }

    if (typeof value === 'object') {
      try {
        const keys = Object.keys(value);
        return `Object {${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
      } catch {
        return '[Object]';
      }
    }

    return String(value);
  }
}

/**
 * Factory function to create BeepCommand instance
 */
export function createBeepCommand(): BeepCommand {
  return new BeepCommand();
}
