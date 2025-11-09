/**
 * Beep Command Implementation
 * Provides debugging output for expressions with type information
 *
 * Syntax: beep! <expression> [, <expression> ...]
 *
 * Modernized with TypedCommandImplementation interface
 */

import { debug, debugGroup } from '../../utils/debug';
import type { ValidationResult, TypedExecutionContext } from '../../types/index';

// Define TypedCommandImplementation locally for now
interface TypedCommandImplementation<TInput, TOutput, TContext> {
  readonly metadata: {
    readonly name: string;
    readonly description: string;
    readonly examples: string[];
    readonly syntax: string;
    readonly category: string;
    readonly version: string;
  };
  readonly validation: {
    validate(input: unknown): ValidationResult<TInput>;
  };
  execute(input: TInput, context: TContext): Promise<TOutput>;
}

// Input type definition
export interface BeepCommandInput {
  expressions?: any[]; // Expressions to debug (optional)
}

// Output type definition
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
 * Beep Command with full type safety and validation
 */
export class BeepCommand
  implements TypedCommandImplementation<BeepCommandInput, BeepCommandOutput, TypedExecutionContext>
{
  metadata = {
    name: 'beep',
    description:
      'The beep command provides debugging output for expressions by printing their values and types to the console. It helps developers inspect values during hyperscript execution.',
    examples: ['beep!', 'beep! myValue', 'beep! me.id, me.className', 'beep! user.name, user.age'],
    syntax: 'beep! <expression> [, <expression> ...]',
    category: 'advanced' as const,
    version: '2.0.0',
  };

  validation = {
    validate(input: unknown): ValidationResult<BeepCommandInput> {
      // Beep command accepts any input including no input
      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          expressions: Array.isArray(input) ? input : input !== undefined ? [input] : [],
        },
      };
    },
  };

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

    // Process each expression
    for (const expression of expressions) {
      const output = await this.debugExpression(context, expression);
      outputs.push(output);
    }

    return {
      expressionCount: expressions.length,
      debugged: true,
      outputs,
    };
  }

  private debugContext(context: TypedExecutionContext): void {
    debugGroup.start('🔔 Beep! Hyperscript Context Debug');
    debug.command('me:', context.me);
    debug.command('it:', context.it);
    debug.command('you:', context.you);
    debug.command('locals:', context.locals);
    debug.command('globals:', context.globals);
    debug.command('variables:', context.variables);
    debugGroup.end();
  }

  private async debugExpression(
    context: TypedExecutionContext,
    value: any
  ): Promise<{ value: any; type: string; representation: string }> {
    // Create hyperscript:beep event first to allow cancellation
    const beepEvent = new CustomEvent('hyperscript:beep', {
      detail: { value },
      cancelable: true,
      bubbles: true,
    });

    // Dispatch event on the current element
    const eventCanceled = context.me ? !context.me.dispatchEvent(beepEvent) : false;

    // If event was canceled, don't log
    if (eventCanceled) {
      return {
        value,
        type: typeof value,
        representation: 'cancelled',
      };
    }

    // Generate debug output
    const representation = this.getSourceRepresentation(value);
    const type = this.getDetailedType(value);

    // Log to console with beep styling
    debugGroup.start('🔔 Beep!');
    debug.command('Value:', value);
    debug.command('Type:', type);
    debug.command('Representation:', representation);
    debugGroup.end();

    return {
      value,
      type,
      representation,
    };
  }

  private getSourceRepresentation(value: any): string {
    // Handle different value types for readable output
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value.toString();
    }

    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }

    if (value instanceof HTMLElement) {
      const tag = value.tagName.toLowerCase();
      const id = value.id ? `#${value.id}` : '';
      const classes = value.className ? `.${value.className.split(' ').join('.')}` : '';
      return `<${tag}${id}${classes}/>`;
    }

    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }

    if (typeof value === 'object') {
      try {
        const keys = Object.keys(value);
        return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;
      } catch {
        return '[Object]';
      }
    }

    return String(value);
  }

  private getDetailedType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    if (Array.isArray(value)) return 'array';
    if (value instanceof HTMLElement) return 'HTMLElement';
    if (value instanceof Date) return 'Date';
    if (value instanceof RegExp) return 'RegExp';
    if (value instanceof Error) return 'Error';

    return typeof value;
  }
}

/**
 * Factory function to create the enhanced beep command
 */
export function createBeepCommand(): BeepCommand {
  return new BeepCommand();
}

export default BeepCommand;
