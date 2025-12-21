/**
 * PseudoCommand - Standalone V2 Implementation
 *
 * Allows treating a method on an object as a top-level command
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Method calls as commands
 * - Prepositional syntax (from, on, with, into, at, to)
 * - Property path resolution (window.location.reload)
 * - Target expression resolution
 * - Proper method binding
 * - Promise handling
 *
 * Syntax:
 *   <method name>(<arg list>) [(to | on | with | into | from | at)] <expression>
 *
 * @example
 *   getElementById("d1") from the document
 *   reload() the location of the window
 *   setAttribute('foo', 'bar') on me
 *   foo() on me
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for PseudoCommand
 */
export interface PseudoCommandInput {
  /** Method name to call */
  methodName: string;
  /** Arguments to pass to method */
  methodArgs: unknown[];
  /** Optional preposition for clarity */
  preposition?: 'from' | 'on' | 'with' | 'into' | 'at' | 'to';
  /** Target object to call method on */
  targetExpression: unknown;
}

/**
 * Output from pseudo-command execution
 */
export interface PseudoCommandOutput {
  result: unknown;
  methodName: string;
  target: unknown;
}

/**
 * PseudoCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 366 lines
 * V2 Target: ~360 lines (inline utilities, standalone)
 */
export class PseudoCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'pseudo-command';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Treat a method on an object as a top-level command',
    syntax: ['<method>(<args>) [(to|on|with|into|from|at)] <expression>'],
    examples: [
      'getElementById("d1") from the document',
      'reload() the location of the window',
      'setAttribute("foo", "bar") on me',
      'foo() on me',
    ],
    category: 'execution',
    sideEffects: ['method-execution'],
  } as const;

  /**
   * Instance accessor for metadata (backward compatibility)
   */
  get metadata() {
    return PseudoCommand.metadata;
  }

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
  ): Promise<PseudoCommandInput> {
    // The parser creates a pseudo-command node with a single objectLiteral argument
    // containing: methodName, methodArgs (arrayLiteral), preposition, target
    if (raw.args.length === 1 && (raw.args[0] as any).type === 'objectLiteral') {
      const objLiteral = raw.args[0] as any;
      const properties = objLiteral.properties || [];

      let methodName = '';
      let methodArgs: unknown[] = [];
      let preposition: PseudoCommandInput['preposition'];
      let targetExpression: unknown;

      for (const prop of properties) {
        const keyName = prop.key?.name || prop.key?.value;
        const valueNode = prop.value;

        switch (keyName) {
          case 'methodName':
            methodName = valueNode?.value || String(await evaluator.evaluate(valueNode, context));
            break;
          case 'methodArgs':
            // Handle both arrayLiteral format and literal with array value
            if (valueNode?.type === 'arrayLiteral' && valueNode.elements) {
              methodArgs = await Promise.all(
                valueNode.elements.map((el: ASTNode) => evaluator.evaluate(el, context))
              );
            } else if (valueNode?.type === 'literal' && Array.isArray(valueNode.value)) {
              // Parser stores AST nodes in literal.value array
              methodArgs = await Promise.all(
                valueNode.value.map((el: ASTNode) => evaluator.evaluate(el, context))
              );
            }
            break;
          case 'preposition':
            const prepValue = valueNode?.value;
            if (prepValue && prepValue !== 'null') {
              preposition = prepValue as PseudoCommandInput['preposition'];
            }
            break;
          case 'target':
          case 'targetExpression':
            targetExpression = await evaluator.evaluate(valueNode, context);
            break;
        }
      }

      if (!methodName) {
        throw new Error('pseudo-command requires method name');
      }
      if (targetExpression === undefined || targetExpression === null) {
        throw new Error('pseudo-command requires a target expression');
      }

      return { methodName, methodArgs, preposition, targetExpression };
    }

    // Legacy format: separate args
    if (raw.args.length < 2) {
      throw new Error('pseudo-command requires method name and target expression');
    }

    // First arg is method name
    const methodName = String(await evaluator.evaluate(raw.args[0], context));

    // Second arg is method arguments (array)
    const methodArgs = Array.isArray(raw.args[1])
      ? await Promise.all(raw.args[1].map((arg) => evaluator.evaluate(arg, context)))
      : [];

    // Third arg or modifier is target expression
    let targetExpression: unknown;
    let preposition: PseudoCommandInput['preposition'];

    // Check for prepositional modifiers
    const validPrepositions = ['from', 'on', 'with', 'into', 'at', 'to'] as const;
    for (const prep of validPrepositions) {
      if (raw.modifiers?.[prep]) {
        preposition = prep;
        targetExpression = await evaluator.evaluate(raw.modifiers[prep], context);
        break;
      }
    }

    // If no preposition modifier, use third arg
    if (!targetExpression && raw.args.length >= 3) {
      targetExpression = await evaluator.evaluate(raw.args[2], context);
    }

    if (!targetExpression) {
      throw new Error('pseudo-command requires a target expression');
    }

    return {
      methodName,
      methodArgs,
      preposition,
      targetExpression,
    };
  }

  /**
   * Execute the pseudo-command
   *
   * Calls the specified method on the target object.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Method execution result
   */
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

  // ========== Private Utility Methods ==========

  /**
   * Resolve the target expression to an object
   *
   * @param targetExpression - Expression to resolve
   * @param context - Execution context
   * @returns Resolved target object
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
   *
   * @param path - Property path to resolve
   * @param context - Execution context
   * @returns Resolved value
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
   *
   * @param target - Target object
   * @param methodName - Method name or path
   * @returns Method function or null
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
   *
   * @param method - Method to execute
   * @param target - Target object for binding
   * @param args - Arguments to pass
   * @returns Method result
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
 * Factory function to create PseudoCommand instance
 */
export function createPseudoCommand(): PseudoCommand {
  return new PseudoCommand();
}
