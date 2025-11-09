/**
 * Pseudo-Command Implementation
 * Allows treating a method on an object as a top-level command
 *
 * Syntax: <method name>(<arg list>) [(to | on | with | into | from | at)] <expression>
 *
 * Examples:
 *   getElementById("d1") from the document
 *   reload() the location of the window
 *   setAttribute('foo', 'bar') on me
 *   foo() on me
 *
 * This implements the official _hyperscript pseudo-command feature
 * See: https://hyperscript.org/commands/pseudo-commands/
 */

import type { CommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import type { UnifiedValidationResult } from '../../types/unified-types';
import type { ValidationError } from '../../types/base-types';

export interface PseudoCommandInput {
  methodName: string;
  methodArgs: unknown[];
  preposition?: 'from' | 'on' | 'with' | 'into' | 'at' | 'to';
  targetExpression: unknown;
}

export interface PseudoCommandOutput {
  result: unknown;
  methodName: string;
  target: unknown;
}

/**
 * Pseudo-Command with full type safety and validation
 * Implements official _hyperscript pseudo-command behavior
 */
export class PseudoCommand
  implements CommandImplementation<PseudoCommandInput, PseudoCommandOutput, TypedExecutionContext>
{
  name = 'pseudo-command';

  metadata = {
    name: 'pseudo-command',
    description:
      'Pseudo-commands allow you to treat a method on an object as a top level command. The method name must be followed by an argument list, then optional prepositional syntax to clarify the code, then an expression.',
    examples: [
      'getElementById("d1") from the document',
      'reload() the location of the window',
      'setAttribute("foo", "bar") on me',
      'foo() on me',
      'bar.foo() me',
      'getValue() with myObject',
    ],
    syntax: '<method name>(<arg list>) [(to | on | with | into | from | at)] <expression>',
    category: 'execution' as const,
    version: '1.0.0',
  };

  validation = {
    validate(input: unknown): UnifiedValidationResult<PseudoCommandInput> {
      const errors: ValidationError[] = [];

      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [
            {
              type: 'syntax-error',
              message: 'Pseudo-command requires an object input',
              suggestions: ['Provide an object with methodName, methodArgs, and targetExpression'],
            },
          ],
          suggestions: ['Provide an object with methodName, methodArgs, and targetExpression'],
        };
      }

      const inputObj = input as Record<string, unknown>;

      // Validate method name is present and is a string
      if (!inputObj.methodName) {
        errors.push({
          type: 'missing-argument',
          message: 'Pseudo-command requires a method name',
          suggestions: ['Provide a method name to call on the target object'],
        });
      } else if (typeof inputObj.methodName !== 'string') {
        errors.push({
          type: 'type-mismatch',
          message: 'Method name must be a string',
          suggestions: ['Provide a valid method name as a string'],
        });
      }

      // Validate method args is an array
      if (inputObj.methodArgs !== undefined && !Array.isArray(inputObj.methodArgs)) {
        errors.push({
          type: 'type-mismatch',
          message: 'Method arguments must be an array',
          suggestions: ['Provide method arguments as an array, or omit for no arguments'],
        });
      }

      // Validate preposition if provided
      if (inputObj.preposition !== undefined) {
        const validPrepositions = ['from', 'on', 'with', 'into', 'at', 'to'];
        if (!validPrepositions.includes(inputObj.preposition as string)) {
          errors.push({
            type: 'syntax-error',
            message: `Invalid preposition "${inputObj.preposition}"`,
            suggestions: ['Use one of: from, on, with, into, at, to'],
          });
        }
      }

      // Validate target expression is present
      if (inputObj.targetExpression === undefined) {
        errors.push({
          type: 'missing-argument',
          message: 'Pseudo-command requires a target expression',
          suggestions: ['Provide an object to call the method on'],
        });
      }

      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          suggestions: [
            'Pseudo-commands must be function calls',
            'Provide a target expression after the optional preposition',
            'Example: getElementById("test") from the document',
          ],
        };
      }

      // Use conditional spread to satisfy exactOptionalPropertyTypes
      const data: PseudoCommandInput = {
        methodName: inputObj.methodName as string,
        methodArgs: (inputObj.methodArgs as unknown[]) || [],
        targetExpression: inputObj.targetExpression,
        ...(inputObj.preposition !== undefined
          ? {
              preposition: inputObj.preposition as 'from' | 'on' | 'with' | 'into' | 'at' | 'to',
            }
          : {}),
      };

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data,
      };
    },
  };

  async execute(
    input: PseudoCommandInput,
    context: TypedExecutionContext
  ): Promise<PseudoCommandOutput> {
    const { methodName, methodArgs, targetExpression } = input;

    try {
      // Resolve the target object
      const target = await this.resolveTarget(targetExpression, context);

      if (target === null || target === undefined) {
        throw new Error(`Target expression resolved to ${target}`);
      }

      // Check if the method exists on the target
      const method = this.resolveMethod(target, methodName);

      if (!method) {
        throw new Error(`Method "${methodName}" not found on target object`);
      }

      if (typeof method !== 'function') {
        throw new Error(`"${methodName}" is not a function (it's a ${typeof method})`);
      }

      // Call the method with proper binding and arguments
      const result = await this.executeMethod(method, target, methodArgs);

      // Store result in context (standard _hyperscript behavior)
      context.locals.set('result', result);

      // Also set 'it' for compatibility with other commands
      Object.assign(context, { it: result });

      return {
        result,
        methodName,
        target,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Pseudo-command failed: ${errorMessage}`);
    }
  }

  /**
   * Resolve the target expression to an object
   */
  private async resolveTarget(
    targetExpression: unknown,
    context: TypedExecutionContext
  ): Promise<unknown> {
    // If already an object, return it
    if (typeof targetExpression === 'object' && targetExpression !== null) {
      return targetExpression;
    }

    // If it's a string, try to resolve it from context
    if (typeof targetExpression === 'string') {
      // Check context variables
      if (context.locals.has(targetExpression)) {
        return context.locals.get(targetExpression);
      }

      if (context.variables?.has(targetExpression)) {
        return context.variables.get(targetExpression);
      }

      if (context.globals.has(targetExpression)) {
        return context.globals.get(targetExpression);
      }

      // Check special context references
      if (targetExpression === 'me' && context.me) {
        return context.me;
      }

      if (targetExpression === 'it' && context.it) {
        return context.it;
      }

      if (targetExpression === 'document') {
        return typeof document !== 'undefined' ? document : null;
      }

      if (targetExpression === 'window') {
        return typeof window !== 'undefined'
          ? window
          : typeof globalThis !== 'undefined'
            ? globalThis
            : null;
      }

      // Try to evaluate as a property path
      return this.resolvePropertyPath(targetExpression, context);
    }

    // For other types, return as-is
    return targetExpression;
  }

  /**
   * Resolve a property path like "window.location" or "document.body"
   */
  private resolvePropertyPath(path: string, context: TypedExecutionContext): unknown {
    const parts = path.split('.');

    // Start with global context
    let current: any =
      typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
          ? globalThis
          : null;

    // Also check context variables as starting point
    if (context.locals.has(parts[0])) {
      current = context.locals.get(parts[0]);
      parts.shift(); // Remove first part as we've resolved it
    } else if (context.variables?.has(parts[0])) {
      current = context.variables.get(parts[0]);
      parts.shift();
    } else if (context.globals.has(parts[0])) {
      current = context.globals.get(parts[0]);
      parts.shift();
    }

    // Navigate the property path
    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Resolve a method from the target object
   * Supports nested paths like "location.reload"
   */
  private resolveMethod(target: any, methodName: string): Function | null {
    if (!target) {
      return null;
    }

    // Handle direct method access
    if (methodName in target) {
      return target[methodName];
    }

    // Handle nested method paths (e.g., "location.reload")
    const parts = methodName.split('.');
    let current: any = target;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (current === null || current === undefined) {
        return null;
      }

      if (!(part in current)) {
        return null;
      }

      current = current[part];

      // If this is the last part, it should be a function
      if (i === parts.length - 1 && typeof current === 'function') {
        return current;
      }
    }

    return null;
  }

  /**
   * Execute a method with proper binding and argument handling
   */
  private async executeMethod(method: Function, target: any, args: unknown[]): Promise<unknown> {
    try {
      // Call the method with proper 'this' binding
      const result = method.apply(target, args);

      // Handle promise results
      if (result && typeof result === 'object' && 'then' in result) {
        return await result;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Method execution failed: ${errorMessage}`);
    }
  }
}

/**
 * Factory function to create the pseudo-command
 */
export function createPseudoCommand(): PseudoCommand {
  return new PseudoCommand();
}

export default PseudoCommand;
