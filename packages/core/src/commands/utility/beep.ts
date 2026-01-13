/**
 * BeepCommand - Decorated Implementation
 *
 * Provides debugging output for expressions with type information.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   beep!
 *   beep! <expression>
 *   beep! <expression>, <expression>, ...
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

/**
 * Typed input for BeepCommand
 */
export interface BeepCommandInput {
  expressions?: any[];
}

/**
 * Output from beep command execution
 */
export interface BeepCommandOutput {
  expressionCount: number;
  debugged: boolean;
  outputs: Array<{ value: any; type: string; representation: string }>;
}

/**
 * BeepCommand - Debug output with type information
 *
 * Before: 279 lines
 * After: ~130 lines (53% reduction)
 */
@meta({
  description: 'Debug output for expressions with type information',
  syntax: ['beep!', 'beep! <expression>', 'beep! <expression>, <expression>, ...'],
  examples: ['beep!', 'beep! myValue', 'beep! me.id, me.className'],
  sideEffects: ['console-output', 'debugging'],
})
@command({ name: 'beep', category: 'utility' })
export class BeepCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<BeepCommandInput> {
    if (raw.args.length === 0) return { expressions: [] };
    const expressions = await Promise.all(raw.args.map(arg => evaluator.evaluate(arg, context)));
    return { expressions };
  }

  async execute(
    input: BeepCommandInput,
    context: TypedExecutionContext
  ): Promise<BeepCommandOutput> {
    const expressions = input.expressions || [];

    if (expressions.length === 0) {
      this.debugContext(context);
      return { expressionCount: 0, debugged: true, outputs: [] };
    }

    const outputs: Array<{ value: any; type: string; representation: string }> = [];
    console.group('🔔 beep! Debug Output');

    for (const expression of expressions) {
      const output = this.debugExpression(expression);
      outputs.push(output);
      console.log(`Value:`, expression);
      console.log(`Type:`, output.type);
      console.log(`Representation:`, output.representation);
      console.log('---');
    }

    console.groupEnd();
    return { expressionCount: expressions.length, debugged: true, outputs };
  }

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

  private debugExpression(expression: any): { value: any; type: string; representation: string } {
    return {
      value: expression,
      type: this.getType(expression),
      representation: this.getRepresentation(expression),
    };
  }

  private getType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (isHTMLElement(value)) return 'HTMLElement';
    if (value instanceof Element) return 'Element';
    if (value instanceof Node) return 'Node';
    if (value instanceof Error) return 'Error';
    if (value instanceof Date) return 'Date';
    if (value instanceof RegExp) return 'RegExp';
    return typeof value;
  }

  private getRepresentation(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) {
      return `Array(${value.length}) [${value
        .slice(0, 3)
        .map(v => this.getRepresentation(v))
        .join(', ')}${value.length > 3 ? '...' : ''}]`;
    }
    if (isHTMLElement(value)) {
      const el = value as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
      return `<${tag}${id}${classes}/>`;
    }
    if (value instanceof Error) return `Error: ${value.message}`;
    if (typeof value === 'string')
      return value.length > 50 ? `"${value.substring(0, 47)}..."` : `"${value}"`;
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

export const createBeepCommand = createFactory(BeepCommand);
export default BeepCommand;
