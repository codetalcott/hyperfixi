/**
 * SetCommand - Standalone V2 Implementation
 *
 * Sets values to variables, element attributes, or properties
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * **Scope**: Core assignment patterns (most common use cases)
 * - Variables: set x to value
 * - Attributes: set @attribute to value
 * - Properties: set my property to value
 *
 * **Not included**: Complex validation, object literals, CSS shorthand, "the X of Y" syntax
 * (can be added in future if needed)
 *
 * Syntax:
 *   set myVar to "value"              # Variable assignment
 *   set @data-theme to "dark"         # Attribute assignment
 *   set my innerHTML to "content"     # Property assignment (me)
 *   set its textContent to "text"     # Property assignment (it)
 *
 * @example
 *   set count to 10
 *   set @aria-label to "Button"
 *   set my textContent to "Click me"
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/ast';
import type { ExpressionEvaluator } from '../../runtime/expression-evaluator';

/**
 * Typed input for SetCommand
 * Represents parsed arguments ready for execution
 */
export interface SetCommandInput {
  /** Target: variable name, '@attribute', or property descriptor */
  target: string | { element: HTMLElement; property: string };
  /** Value to set */
  value: unknown;
}

/**
 * Output from SetCommand execution
 */
export interface SetCommandOutput {
  /** Target that was set */
  target: string | HTMLElement;
  /** Value that was set */
  value: unknown;
  /** Type of target */
  targetType: 'variable' | 'attribute' | 'property';
}

/**
 * SetCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Focuses on core assignment patterns without complex validation.
 *
 * V1 Size: 748 lines (with Zod validation, complex syntax, CSS properties, object literals)
 * V2 Size: ~350 lines (core patterns only, 53% reduction)
 */
export class SetCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'set';

  /**
   * Command metadata for documentation and tooling
   */
  readonly metadata = {
    description: 'Set values to variables, attributes, or properties',
    syntax: 'set <target> to <value>',
    examples: [
      'set myVar to "value"',
      'set @data-theme to "dark"',
      'set my innerHTML to "content"',
      'set its textContent to "text"',
    ],
    category: 'data',
    sideEffects: ['state-mutation', 'dom-mutation'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Extracts target and value from args and modifiers.
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
  ): Promise<SetCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('set command requires a target');
    }

    // Extract target from first arg
    const targetArg = raw.args[0];
    const targetValue = await evaluator.evaluate(targetArg, context);

    // Parse target into structured form
    const target = this.parseTarget(targetValue, context);

    // Extract value from 'to' modifier or second argument
    let value: unknown;
    if (raw.modifiers.to) {
      value = await evaluator.evaluate(raw.modifiers.to, context);
    } else if (raw.args.length >= 2) {
      value = await evaluator.evaluate(raw.args[1], context);
    } else {
      throw new Error('set command requires a value (use "to" keyword)');
    }

    return { target, value };
  }

  /**
   * Execute the set command
   *
   * Sets value to variable, attribute, or property based on target type.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Output with target type and value
   */
  async execute(
    input: SetCommandInput,
    context: TypedExecutionContext
  ): Promise<SetCommandOutput> {
    const { target, value } = input;

    // Handle different target types
    if (typeof target === 'string') {
      // Attribute syntax: @attribute
      if (target.startsWith('@')) {
        return this.setAttribute(context, target.substring(1), value);
      }

      // Variable assignment
      return this.setVariable(context, target, value);
    }

    // Property assignment: { element, property }
    if (typeof target === 'object' && 'element' in target && 'property' in target) {
      return this.setProperty(context, target.element, target.property, value);
    }

    throw new Error(`Invalid set target: ${typeof target}`);
  }

  /**
   * Validate parsed input (optional but recommended)
   *
   * Runtime validation to catch parsing errors early.
   *
   * @param input - Input to validate
   * @returns true if input is valid SetCommandInput
   */
  validate(input: unknown): input is SetCommandInput {
    if (typeof input !== 'object' || input === null) return false;

    const typed = input as Partial<SetCommandInput>;

    // Check target
    if (!typed.target) return false;
    if (
      typeof typed.target !== 'string' &&
      !(
        typeof typed.target === 'object' &&
        'element' in typed.target &&
        'property' in typed.target
      )
    ) {
      return false;
    }

    // Value can be anything (including undefined/null)
    return true;
  }

  // ========== Private Utility Methods ==========

  /**
   * Parse target string into structured target descriptor
   *
   * Handles:
   * - Variable names: "myVar", "count"
   * - Attributes: "@data-theme", "@aria-label"
   * - Properties: "my innerHTML", "its textContent"
   *
   * @param targetValue - Evaluated target value
   * @param context - Execution context
   * @returns Parsed target (string or property descriptor)
   */
  private parseTarget(
    targetValue: unknown,
    context: ExecutionContext
  ): string | { element: HTMLElement; property: string } {
    if (typeof targetValue !== 'string') {
      throw new Error('set target must be a string');
    }

    // Attribute syntax: @attribute
    if (targetValue.startsWith('@')) {
      return targetValue; // Keep @ prefix for execute() to recognize
    }

    // Possessive syntax: "my property", "its property", "your property"
    const possessiveMatch = targetValue.match(/^(my|me|its?|your?)\s+(.+)$/);
    if (possessiveMatch) {
      const [, possessive, property] = possessiveMatch;
      const element = this.resolvePossessive(possessive, context);
      return { element, property };
    }

    // Plain variable name
    return targetValue;
  }

  /**
   * Resolve possessive reference to HTMLElement
   *
   * Handles: my, me, its, it, your, you
   *
   * @param possessive - Possessive keyword
   * @param context - Execution context
   * @returns Resolved HTMLElement
   */
  private resolvePossessive(
    possessive: string,
    context: ExecutionContext
  ): HTMLElement {
    switch (possessive.toLowerCase()) {
      case 'my':
      case 'me':
        if (!context.me) throw new Error('No "me" element in context');
        if (!(context.me instanceof HTMLElement)) throw new Error('context.me is not an HTMLElement');
        return context.me;

      case 'its':
      case 'it':
        if (!context.it) throw new Error('No "it" value in context');
        if (!(context.it instanceof HTMLElement)) throw new Error('context.it is not an HTMLElement');
        return context.it;

      case 'your':
      case 'you':
        if (!context.you) throw new Error('No "you" element in context');
        if (!(context.you instanceof HTMLElement)) throw new Error('context.you is not an HTMLElement');
        return context.you;

      default:
        throw new Error(`Unknown possessive: ${possessive}`);
    }
  }

  /**
   * Set variable in execution context
   *
   * Always sets in context.locals for proper scoping.
   *
   * @param context - Execution context
   * @param variableName - Variable name
   * @param value - Value to set
   * @returns Output descriptor
   */
  private setVariable(
    context: TypedExecutionContext,
    variableName: string,
    value: unknown
  ): SetCommandOutput {
    // Set in locals (proper scoping)
    context.locals.set(variableName, value);

    // Also set special context properties for commonly used variables
    if (variableName === 'result' || variableName === 'it') {
      Object.assign(context, { [variableName]: value });
    }

    // Update context.it
    Object.assign(context, { it: value });

    return {
      target: variableName,
      value,
      targetType: 'variable',
    };
  }

  /**
   * Set element attribute
   *
   * Sets attribute on context.me element.
   *
   * @param context - Execution context
   * @param attributeName - Attribute name (without @ prefix)
   * @param value - Value to set
   * @returns Output descriptor
   */
  private setAttribute(
    context: TypedExecutionContext,
    attributeName: string,
    value: unknown
  ): SetCommandOutput {
    if (!context.me) {
      throw new Error('No element context available for attribute setting');
    }

    if (!(context.me instanceof HTMLElement)) {
      throw new Error('context.me is not an HTMLElement');
    }

    // Set the attribute
    context.me.setAttribute(attributeName, String(value));

    // Update context.it
    Object.assign(context, { it: value });

    return {
      target: `@${attributeName}`,
      value,
      targetType: 'attribute',
    };
  }

  /**
   * Set element property
   *
   * Sets property on the specified element.
   * Handles common properties like textContent, innerHTML, value, className, etc.
   *
   * @param context - Execution context
   * @param element - Target element
   * @param property - Property name
   * @param value - Value to set
   * @returns Output descriptor
   */
  private setProperty(
    context: TypedExecutionContext,
    element: HTMLElement,
    property: string,
    value: unknown
  ): SetCommandOutput {
    // Handle common properties
    if (property === 'textContent') {
      element.textContent = String(value);
    } else if (property === 'innerHTML') {
      element.innerHTML = String(value);
    } else if (property === 'innerText') {
      element.innerText = String(value);
    } else if (property === 'value' && 'value' in element) {
      (element as HTMLInputElement).value = String(value);
    } else if (property === 'id') {
      element.id = String(value);
    } else if (property === 'className') {
      element.className = String(value);
    } else if (property.includes('-') || property in element.style) {
      // Style property
      element.style.setProperty(property, String(value));
    } else {
      // Generic property
      try {
        (element as any)[property] = value;
      } catch (error) {
        // Handle readonly properties gracefully
        if (error instanceof TypeError && error.message.includes('only a getter')) {
          return {
            target: element,
            value,
            targetType: 'property',
          };
        }
        throw new Error(
          `Cannot set property '${property}': ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Update context.it
    Object.assign(context, { it: value });

    return {
      target: element,
      value,
      targetType: 'property',
    };
  }
}

// ========== Factory Function ==========

/**
 * Factory function for creating SetCommand instances
 * Maintains compatibility with existing command registration patterns
 *
 * @returns New SetCommand instance
 */
export function createSetCommand(): SetCommand {
  return new SetCommand();
}

// Default export for convenience
export default SetCommand;

// ========== Usage Example ==========
//
// import { SetCommand } from './commands-v2/data/set-standalone';
// import { RuntimeBase } from './runtime/runtime-base';
//
// const runtime = new RuntimeBase({
//   registry: {
//     set: new SetCommand(),
//   },
// });
//
// // Now only SetCommand is bundled, not all V1 dependencies!
// // Bundle size: ~4-5 KB (vs ~230 KB with V1 inheritance)
