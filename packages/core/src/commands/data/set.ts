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
import type { ASTNode, ExpressionNode } from '../../types/base-types.ts';
import type { ExpressionEvaluator } from '../../core/expression-evaluator.ts';
import { isHTMLElement } from '../../utils/element-check';
import {
  resolveElement as resolveElementHelper,
  resolveElements as resolveElementsHelper,
  resolvePossessive,
} from '../helpers/element-resolution';

/**
 * Typed input for SetCommand (Discriminated Union)
 * Represents parsed arguments ready for execution
 *
 * Supports multiple assignment types:
 * - Variable: set x to value
 * - Attribute: set @attr to value
 * - Property: set my property to value, set the property of element to value
 * - Style: set *property to value
 * - Object literal: set { prop: value } on element
 */
export type SetCommandInput =
  | {
      type: 'variable';
      name: string;
      value: unknown;
    }
  | {
      type: 'attribute';
      element: HTMLElement;
      name: string;
      value: unknown;
    }
  | {
      type: 'property';
      element: HTMLElement;
      property: string;
      value: unknown;
    }
  | {
      type: 'style';
      element: HTMLElement;
      property: string;
      value: string;
    }
  | {
      type: 'object-literal';
      properties: Record<string, unknown>;
      targets: HTMLElement[];
    };

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
   * Detects input type and parses accordingly:
   * - Object literal: set { x: 1 } on element
   * - CSS shorthand: set *property to value
   * - "the X of Y": set the property of element to value
   * - Attribute: set @attr to value
   * - Property: set my property to value
   * - Variable: set x to value
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

    // Extract first argument
    const firstArg = raw.args[0] as any;

    // Handle identifier nodes directly without evaluation
    // For "set x to 42", x is an identifier node that should become a variable name
    // not evaluated as a variable lookup (which would return undefined)
    //
    // Parser may create:
    // - { type: 'identifier', name: 'x' } - standard identifier
    // - { type: 'variable', name: 'x' } - alternative variable node
    let firstValue: unknown;
    const argName = firstArg?.name || firstArg?.value;

    // Handle possessiveExpression for element property/style access: "set #element's *opacity to X"
    // Parser creates: { type: 'possessiveExpression', object: {selector}, property: {cssProperty} }
    // Must handle BEFORE evaluation to extract element and property separately
    if (firstArg?.type === 'possessiveExpression') {
      const objectNode = firstArg['object'] as any;
      const propertyNode = firstArg['property'] as any;

      // Evaluate the object to get the element
      let element = await evaluator.evaluate(objectNode, context);

      // Handle array result from selector (querySelectorAll returns NodeList converted to array)
      if (Array.isArray(element) && element.length > 0) {
        element = element[0];
      }

      if (!isHTMLElement(element)) {
        throw new Error('set command: possessive object must resolve to an HTMLElement');
      }

      // Get property name
      const propertyName = propertyNode?.name || propertyNode?.value;

      if (!propertyName) {
        throw new Error('set command: possessive property name not found');
      }

      const value = await this.extractValue(raw, evaluator, context);

      // Check if it's a CSS style property (from *opacity syntax)
      // Parser creates { type: 'cssProperty', name: 'opacity' } for *opacity
      if (propertyNode?.type === 'cssProperty' || propertyName.startsWith('*')) {
        const styleProp = propertyName.startsWith('*') ? propertyName.substring(1) : propertyName;
        return {
          type: 'style',
          element,
          property: styleProp,
          value: String(value),
        };
      }

      // Regular property assignment
      return {
        type: 'property',
        element,
        property: propertyName,
        value,
      };
    }

    // Handle memberExpression for possessive property access: "set my innerHTML to X"
    // Parser creates: { type: 'memberExpression', object: {name: 'me'}, property: {name: 'innerHTML'} }
    if (firstArg?.type === 'memberExpression') {
      const objectNode = firstArg['object'] as { type: string; name?: string } | undefined;
      const propertyNode = firstArg['property'] as { type: string; name?: string } | undefined;

      if (objectNode?.name && propertyNode?.name) {
        const objectName = objectNode.name.toLowerCase();
        // Check if object is a possessive context reference
        if (['me', 'my', 'it', 'its', 'you', 'your'].includes(objectName)) {
          const element = resolvePossessive(objectName, context);
          const value = await this.extractValue(raw, evaluator, context);
          return {
            type: 'property',
            element,
            property: propertyNode.name,
            value,
          };
        }
      }
    }

    // Check for identifier or variable node types
    // These should NOT be evaluated (would return undefined for undefined variables)
    if (
      (firstArg?.type === 'identifier' || firstArg?.type === 'variable') &&
      typeof argName === 'string'
    ) {
      // Use identifier name directly for variable assignment
      firstValue = argName;
    } else {
      firstValue = await evaluator.evaluate(firstArg, context);
    }

    // Check for object literal: set { x: 1, y: 2 } on element
    if (this.isPlainObject(firstValue)) {
      const targets = await this.resolveTargets(raw.modifiers.on, evaluator, context);
      return {
        type: 'object-literal',
        properties: firstValue as Record<string, unknown>,
        targets,
      };
    }

    // Check for "the X of Y" syntax: set the property of element to value
    if (typeof firstValue === 'string' && firstValue.toLowerCase().startsWith('the ')) {
      return this.parseTheXofY(firstValue, raw, evaluator, context);
    }

    // Check for CSS shorthand: *property
    if (typeof firstValue === 'string' && firstValue.startsWith('*')) {
      const property = firstValue.substring(1);
      const value = await this.extractValue(raw, evaluator, context);
      const element = await this.resolveElement(raw.modifiers.on, evaluator, context);
      return {
        type: 'style',
        element,
        property,
        value: String(value),
      };
    }

    // Check for attribute syntax: @attr
    if (typeof firstValue === 'string' && firstValue.startsWith('@')) {
      const attributeName = firstValue.substring(1);
      const value = await this.extractValue(raw, evaluator, context);
      const element = await this.resolveElement(raw.modifiers.on, evaluator, context);
      return {
        type: 'attribute',
        element,
        name: attributeName,
        value,
      };
    }

    // Check for possessive syntax: my/its property
    if (typeof firstValue === 'string') {
      const possessiveMatch = firstValue.match(/^(my|me|its?|your?)\s+(.+)$/i);
      if (possessiveMatch) {
        const [, possessive, property] = possessiveMatch;
        const element = resolvePossessive(possessive, context);
        const value = await this.extractValue(raw, evaluator, context);
        return {
          type: 'property',
          element,
          property,
          value,
        };
      }
    }

    // Default: variable assignment
    if (typeof firstValue !== 'string') {
      throw new Error('set command target must be a string or object literal');
    }

    const value = await this.extractValue(raw, evaluator, context);
    return {
      type: 'variable',
      name: firstValue,
      value,
    };
  }

  /**
   * Execute the set command
   *
   * Sets value based on input type using discriminated union.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Output with target type and value
   */
  async execute(
    input: SetCommandInput,
    context: TypedExecutionContext
  ): Promise<SetCommandOutput> {
    switch (input.type) {
      case 'variable':
        return this.setVariable(context, input.name, input.value);

      case 'attribute':
        input.element.setAttribute(input.name, String(input.value));
        Object.assign(context, { it: input.value });
        return {
          target: `@${input.name}`,
          value: input.value,
          targetType: 'attribute',
        };

      case 'property':
        return this.setProperty(context, input.element, input.property, input.value);

      case 'style':
        input.element.style.setProperty(input.property, input.value);
        Object.assign(context, { it: input.value });
        return {
          target: input.element,
          value: input.value,
          targetType: 'property',
        };

      case 'object-literal':
        // Set multiple properties on all targets
        for (const target of input.targets) {
          for (const [key, value] of Object.entries(input.properties)) {
            await this.setProperty(context, target, key, value);
          }
        }
        Object.assign(context, { it: input.properties });
        return {
          target: input.targets[0] || 'unknown',
          value: input.properties,
          targetType: 'property',
        };

      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = input;
        throw new Error(`Unknown input type: ${(_exhaustive as any).type}`);
    }
  }

  /**
   * Validate parsed input (discriminated union)
   *
   * Runtime validation to catch parsing errors early.
   *
   * @param input - Input to validate
   * @returns true if input is valid SetCommandInput
   */
  validate(input: unknown): input is SetCommandInput {
    if (typeof input !== 'object' || input === null) return false;

    const typed = input as Partial<SetCommandInput>;

    // Check type discriminator
    if (!typed.type || !['variable', 'attribute', 'property', 'style', 'object-literal'].includes(typed.type)) {
      return false;
    }

    // Type-specific validation
    if (typed.type === 'variable') {
      const varInput = input as Partial<{ type: 'variable'; name: string; value: unknown }>;
      if (typeof varInput.name !== 'string' || varInput.name.length === 0) return false;
    } else if (typed.type === 'attribute') {
      const attrInput = input as Partial<{ type: 'attribute'; element: unknown; name: string; value: unknown }>;
      if (!isHTMLElement(attrInput.element)) return false;
      if (typeof attrInput.name !== 'string' || attrInput.name.length === 0) return false;
    } else if (typed.type === 'property') {
      const propInput = input as Partial<{ type: 'property'; element: unknown; property: string; value: unknown }>;
      if (!isHTMLElement(propInput.element)) return false;
      if (typeof propInput.property !== 'string' || propInput.property.length === 0) return false;
    } else if (typed.type === 'style') {
      const styleInput = input as Partial<{ type: 'style'; element: unknown; property: string; value: unknown }>;
      if (!isHTMLElement(styleInput.element)) return false;
      if (typeof styleInput.property !== 'string' || styleInput.property.length === 0) return false;
      if (typeof styleInput.value !== 'string') return false;
    } else if (typed.type === 'object-literal') {
      const objInput = input as Partial<{ type: 'object-literal'; properties: unknown; targets: unknown }>;
      if (typeof objInput.properties !== 'object' || objInput.properties === null) return false;
      if (!Array.isArray(objInput.targets)) return false;
      if (objInput.targets.length === 0) return false;
      if (!objInput.targets.every(t => isHTMLElement(t))) return false;
    }

    return true;
  }

  // ========== Private Utility Methods ==========

  /**
   * Check if value is a plain object (not array, not null, not class instance)
   *
   * @param value - Value to check
   * @returns true if plain object
   */
  private isPlainObject(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    if (Array.isArray(value)) return false;
    if (isHTMLElement(value)) return false;
    if (value instanceof Node) return false;
    // Check if it's a plain object (not a class instance)
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  /**
   * Extract value from "to" modifier or second argument
   *
   * @param raw - Raw command node
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Extracted value
   */
  private async extractValue(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<unknown> {
    // Check modifiers.to first (some parsers put value there)
    if (raw.modifiers.to) {
      return await evaluator.evaluate(raw.modifiers.to, context);
    }

    // Parser puts args as [target, 'to', value] - find the 'to' marker and get value after it
    const toIndex = raw.args.findIndex(
      arg => arg.type === 'identifier' && arg['name'] === 'to'
    );

    if (toIndex >= 0 && raw.args.length > toIndex + 1) {
      // Value is after the 'to' keyword
      const valueNode = raw.args[toIndex + 1];
      return await evaluator.evaluate(valueNode, context);
    }

    // Fallback: if no 'to' marker, try second arg (legacy format)
    if (raw.args.length >= 2) {
      return await evaluator.evaluate(raw.args[1], context);
    }

    throw new Error('set command requires a value (use "to" keyword)');
  }

  /**
   * Resolve single element from "on" modifier or context.me
   *
   * @param onModifier - "on" modifier expression
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Resolved HTMLElement
   */
  private async resolveElement(
    onModifier: ExpressionNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HTMLElement> {
    if (!onModifier) {
      return resolveElementHelper(undefined, context);
    }
    const evaluated = await evaluator.evaluate(onModifier, context);
    return resolveElementHelper(evaluated as string | HTMLElement | undefined, context);
  }

  /**
   * Resolve multiple target elements from "on" modifier
   *
   * @param onModifier - "on" modifier expression
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Array of resolved HTMLElements
   */
  private async resolveTargets(
    onModifier: ExpressionNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HTMLElement[]> {
    if (!onModifier) {
      return resolveElementsHelper(undefined, context);
    }
    const evaluated = await evaluator.evaluate(onModifier, context);
    return resolveElementsHelper(evaluated as string | HTMLElement | HTMLElement[] | NodeList | undefined, context);
  }

  /**
   * Parse "the X of Y" syntax: set the property of element to value
   *
   * @param expression - Expression starting with "the"
   * @param raw - Raw command node
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Parsed property input
   */
  private async parseTheXofY(
    expression: string,
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SetCommandInput> {
    // Pattern: "the <property> of <target>"
    const match = expression.match(/^the\s+(.+?)\s+of\s+(.+)$/i);
    if (!match) {
      throw new Error('Invalid "the X of Y" syntax');
    }

    const [, property, targetExpr] = match;
    const element = resolveElementHelper(targetExpr, context);
    const value = await this.extractValue(raw, evaluator, context);

    return {
      type: 'property',
      element,
      property: property.trim(),
      value,
    };
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
