/**
 * AppendCommand - Standalone V2 Implementation
 *
 * Adds content to the end of a string, array, or HTML element
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Append to variables (creates if doesn't exist)
 * - Append to arrays (push operation)
 * - Append to HTML elements (innerHTML +=)
 * - Append to result variable (context.it) by default
 * - Context references (me, it, you)
 *
 * Syntax:
 *   append <content>
 *   append <content> to <target>
 *
 * @example
 *   append "Hello"
 *   append "World" to greeting
 *   append item to myArray
 *   append "<p>New</p>" to #content
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for AppendCommand
 */
export interface AppendCommandInput {
  /** Content to append */
  content: unknown;
  /** Target (variable name, element, or array) */
  target?: string | HTMLElement | unknown[];
}

/**
 * Output from Append command execution
 */
export interface AppendCommandOutput {
  result: unknown;
  targetType: 'result' | 'variable' | 'array' | 'element' | 'string';
  target?: string | HTMLElement;
}

/**
 * AppendCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 309 lines (with validation, multiple target types)
 * V2 Target: ~290 lines (6% reduction, all features preserved)
 */
export class AppendCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'append';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Add content to the end of a string, array, or HTML element',
    syntax: [
      'append <content>',
      'append <content> to <target>',
    ],
    examples: [
      'append "Hello"',
      'append "World" to greeting',
      'append item to myArray',
      'append "<p>New paragraph</p>" to #content',
      'append text to me',
    ],
    category: 'content',
    sideEffects: ['data-mutation', 'dom-mutation'],
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
  ): Promise<AppendCommandInput> {
    // Validate content argument
    if (!raw.args || raw.args.length === 0) {
      throw new Error('append command requires content to append');
    }

    // Evaluate content
    const content = await evaluator.evaluate(raw.args[0], context);

    // Evaluate target (optional)
    let target: string | HTMLElement | unknown[] | undefined;
    if (raw.modifiers?.to) {
      target = await evaluator.evaluate(raw.modifiers.to, context);
    } else if ((raw as any).target) {
      target = (raw as any).target;
    }

    return {
      content,
      target,
    };
  }

  /**
   * Execute the append command
   *
   * Appends content to target based on target type:
   * - No target: Append to context.it
   * - Variable: Append to variable value (string or array)
   * - Array: Push to array
   * - Element: Append to innerHTML
   * - Selector: Query and append to innerHTML
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Append result with target info
   */
  async execute(
    input: AppendCommandInput,
    context: TypedExecutionContext
  ): Promise<AppendCommandOutput> {
    const { content, target } = input;

    // Convert content to string for most operations
    const contentStr = content == null ? String(content) : String(content);

    // If no target specified, append to result variable (it)
    if (!target) {
      if (context.it === undefined) {
        Object.assign(context, { it: contentStr });
      } else {
        Object.assign(context, { it: String(context.it) + contentStr });
      }
      return {
        result: context.it,
        targetType: 'result',
      };
    }

    // Handle different target types
    if (typeof target === 'string') {
      // Check if this is a CSS selector
      if (target.startsWith('#') || target.startsWith('.') || target.includes('[')) {
        const element = this.resolveDOMElement(target);
        element.innerHTML += contentStr;
        return {
          result: element,
          targetType: 'element',
          target: element,
        };
      }

      // Check if this is a context reference
      if (target === 'me' || target === 'it' || target === 'you') {
        const contextTarget = this.resolveContextReference(target, context);
        if (contextTarget instanceof HTMLElement) {
          contextTarget.innerHTML += contentStr;
          return {
            result: contextTarget,
            targetType: 'element',
            target: contextTarget,
          };
        }
      }

      // Handle variable operations
      const variableExists = this.variableExists(target, context);

      if (variableExists) {
        const currentValue = this.getVariableValue(target, context);

        // Special handling for arrays
        if (Array.isArray(currentValue)) {
          currentValue.push(content);
          return {
            result: currentValue,
            targetType: 'array',
            target,
          };
        }

        // Handle strings and other types
        const newValue = (currentValue == null ? '' : String(currentValue)) + contentStr;
        this.setVariableValue(target, newValue, context);
        return {
          result: newValue,
          targetType: 'variable',
          target,
        };
      } else {
        // Create new variable
        this.setVariableValue(target, contentStr, context);
        return {
          result: contentStr,
          targetType: 'variable',
          target,
        };
      }
    } else if (Array.isArray(target)) {
      // Direct array target
      target.push(content);
      return {
        result: target,
        targetType: 'array',
      };
    } else if (target instanceof HTMLElement) {
      // Direct element target
      target.innerHTML += contentStr;
      return {
        result: target,
        targetType: 'element',
        target,
      };
    } else {
      // Handle other object types by converting to string
      const newValue = String(target) + contentStr;
      Object.assign(context, { it: newValue });
      return {
        result: newValue,
        targetType: 'string',
      };
    }
  }

  // ========== Private Utility Methods ==========

  /**
   * Resolve DOM element from CSS selector
   *
   * @param selector - CSS selector string
   * @returns Resolved HTML element
   * @throws Error if element not found
   */
  private resolveDOMElement(selector: string): HTMLElement {
    if (typeof document === 'undefined') {
      throw new Error('DOM not available - cannot resolve element selector');
    }

    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    return element as HTMLElement;
  }

  /**
   * Resolve context reference (me, it, you)
   *
   * @param ref - Context reference name
   * @param context - Execution context
   * @returns Referenced value
   * @throws Error if reference unknown
   */
  private resolveContextReference(ref: string, context: TypedExecutionContext): any {
    switch (ref) {
      case 'me':
        return context.me;
      case 'it':
        return context.it;
      case 'you':
        return context.you;
      default:
        throw new Error(`Unknown context reference: ${ref}`);
    }
  }

  /**
   * Check if variable exists in context
   *
   * @param name - Variable name
   * @param context - Execution context
   * @returns true if variable exists
   */
  private variableExists(name: string, context: TypedExecutionContext): boolean {
    return (
      !!(context.locals && context.locals.has(name)) ||
      !!(context.globals && context.globals.has(name)) ||
      !!(context.variables && context.variables.has(name))
    );
  }

  /**
   * Get variable value from context
   *
   * Searches in order: locals, globals, variables
   *
   * @param name - Variable name
   * @param context - Execution context
   * @returns Variable value or undefined
   */
  private getVariableValue(name: string, context: TypedExecutionContext): any {
    // Check local variables first
    if (context.locals && context.locals.has(name)) {
      return context.locals.get(name);
    }

    // Check global variables
    if (context.globals && context.globals.has(name)) {
      return context.globals.get(name);
    }

    // Check general variables
    if (context.variables && context.variables.has(name)) {
      return context.variables.get(name);
    }

    return undefined;
  }

  /**
   * Set variable value in context
   *
   * Updates existing variable or creates new local variable
   *
   * @param name - Variable name
   * @param value - Value to set
   * @param context - Execution context
   */
  private setVariableValue(name: string, value: any, context: TypedExecutionContext): void {
    // If variable exists in local scope, update it
    if (context.locals && context.locals.has(name)) {
      context.locals.set(name, value);
      return;
    }

    // If variable exists in global scope, update it
    if (context.globals && context.globals.has(name)) {
      context.globals.set(name, value);
      return;
    }

    // If variable exists in general variables, update it
    if (context.variables && context.variables.has(name)) {
      context.variables.set(name, value);
      return;
    }

    // Create new local variable
    context.locals.set(name, value);
  }
}

/**
 * Factory function to create AppendCommand instance
 */
export function createAppendCommand(): AppendCommand {
  return new AppendCommand();
}
