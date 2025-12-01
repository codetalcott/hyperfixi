/**
 * DecrementCommand V2 - Standalone Implementation (Zero V1 Dependencies)
 *
 * Decreases the value of a variable or element property by a specified amount with full support for:
 * - Variables: decrement counter, decrement global score by 10
 * - Element properties: decrement me.scrollTop by 100
 * - Scoped variables: decrement :global counter, decrement :local counter
 * - Default decrement: 1 (if no 'by' amount specified)
 *
 * Part of Phase 5: Hybrid Tree-Shaking Architecture
 * Week 5 Migration - Complete standalone rewrite with zero V1 dependencies
 */

import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface DecrementCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Typed input after parsing
 */
export interface DecrementCommandInput {
  target: string | HTMLElement | number;
  property?: string;
  scope?: 'global' | 'local';
  amount: number;
}

/**
 * Standalone DecrementCommand V2 - Zero V1 dependencies
 *
 * This implementation completely rewrites decrement command logic with:
 * - Inlined utilities (zero external dependencies)
 * - parseInput() for AST parsing
 * - execute() for command execution
 * - Type-only imports for tree-shaking
 */
export class DecrementCommand {
  readonly name = 'decrement';

  // ============================================================================
  // INLINED UTILITIES (Zero External Dependencies)
  // ============================================================================

  /**
   * Convert any value to a number for decrement operations
   *
   * Handles:
   * - null/undefined → 0 (default start value)
   * - number → number (preserved)
   * - string → parseFloat (NaN if invalid)
   * - boolean → 0/1
   * - array → length
   * - object → length property or valueOf()
   *
   * @param value - Value to convert
   * @returns Numeric value (may be NaN for invalid strings)
   */
  private convertToNumber(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'number') {
      return isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return parsed; // Return NaN if invalid string to preserve test expectations
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    if (Array.isArray(value)) {
      return value.length;
    }

    if (typeof value === 'object') {
      // Try to get length or valueOf
      if ('length' in value && typeof value.length === 'number') {
        return value.length;
      }
      if (typeof value.valueOf === 'function') {
        const result = value.valueOf();
        if (typeof result === 'number') {
          return result;
        }
      }
      // Return NaN for objects that can't be converted
      return NaN;
    }

    return 0;
  }

  /**
   * Get variable value from execution context
   *
   * Search order (unless preferredScope specified):
   * 1. Local variables
   * 2. Global variables
   * 3. General variables
   * 4. window/globalThis (browser globals)
   *
   * @param name - Variable name
   * @param context - Execution context
   * @param preferredScope - 'global' to check globals first
   * @returns Variable value or undefined
   */
  private getVariableValue(
    name: string,
    context: ExecutionContext,
    preferredScope?: string
  ): unknown {
    // If preferred scope is specified, check that first
    if (preferredScope === 'global' && context.globals && context.globals.has(name)) {
      return context.globals.get(name);
    }

    // Check local variables first (unless global is preferred)
    if (preferredScope !== 'global' && context.locals && context.locals.has(name)) {
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

    // Check local variables as fallback
    if (preferredScope === 'global' && context.locals && context.locals.has(name)) {
      return context.locals.get(name);
    }

    // Check window/globalThis as final fallback (for browser globals)
    if (typeof window !== 'undefined' && name in window) {
      return (window as any)[name];
    }
    if (typeof globalThis !== 'undefined' && name in globalThis) {
      return (globalThis as any)[name];
    }

    // Return undefined if not found (will be converted to 0)
    return undefined;
  }

  /**
   * Set variable value in execution context
   *
   * Strategy:
   * - If preferredScope='global', always set in globals + window
   * - If variable exists in local scope, update it
   * - If variable exists in global scope, update it (+ window)
   * - If variable exists in general variables, update it
   * - If variable exists on window, update it (+ globals)
   * - Otherwise, create new local variable
   *
   * @param name - Variable name
   * @param value - Value to set
   * @param context - Execution context
   * @param preferredScope - 'global' to force global scope
   */
  private setVariableValue(
    name: string,
    value: number,
    context: ExecutionContext,
    preferredScope?: string
  ): void {
    // If preferred scope is specified, handle it
    if (preferredScope === 'global') {
      context.globals.set(name, value);
      // Also set on window for browser globals
      if (typeof window !== 'undefined') {
        (window as any)[name] = value;
      }
      return;
    }

    // If variable exists in local scope, update it
    if (context.locals && context.locals.has(name)) {
      context.locals.set(name, value);
      return;
    }

    // If variable exists in global scope, update it
    if (context.globals && context.globals.has(name)) {
      context.globals.set(name, value);
      // Also update on window if it exists there
      if (typeof window !== 'undefined' && name in window) {
        (window as any)[name] = value;
      }
      return;
    }

    // If variable exists in general variables, update it
    if (context.variables && context.variables.has(name)) {
      context.variables.set(name, value);
      return;
    }

    // Check if variable exists on window (browser global)
    if (typeof window !== 'undefined' && name in window) {
      (window as any)[name] = value;
      // Also store in globals for consistency
      context.globals.set(name, value);
      return;
    }

    // Create new local variable
    context.locals.set(name, value);
  }

  /**
   * Get element property value from property path
   *
   * Handles:
   * - me.value → context.me.value
   * - it.scrollTop → context.it.scrollTop
   * - you.textContent → context.you.textContent
   * - element.value → resolve 'element' variable, then get 'value'
   *
   * @param propertyPath - Property path (e.g., "me.value")
   * @param context - Execution context
   * @returns Numeric value
   */
  private getElementProperty(propertyPath: string, context: ExecutionContext): number {
    const parts = propertyPath.split('.');
    const elementRef = parts[0];
    const property = parts[1];

    let element: HTMLElement | unknown = null;

    // Resolve element reference
    if (elementRef === 'me') {
      element = context.me;
    } else if (elementRef === 'it') {
      element = context.it;
    } else if (elementRef === 'you') {
      element = context.you;
    } else {
      // Try to resolve as variable
      element = this.getVariableValue(elementRef, context);
    }

    if (!element) {
      return 0;
    }

    // Get property value
    const value = (element as Record<string, unknown>)[property];
    return this.convertToNumber(value);
  }

  /**
   * Set element property value from property path
   *
   * @param propertyPath - Property path (e.g., "me.value")
   * @param value - Value to set
   * @param context - Execution context
   */
  private setElementProperty(
    propertyPath: string,
    value: number,
    context: ExecutionContext
  ): void {
    const parts = propertyPath.split('.');
    const elementRef = parts[0];
    const property = parts[1];

    let element: HTMLElement | unknown = null;

    // Resolve element reference
    if (elementRef === 'me') {
      element = context.me;
    } else if (elementRef === 'it') {
      element = context.it;
    } else if (elementRef === 'you') {
      element = context.you;
    } else {
      // Try to resolve as variable
      element = this.getVariableValue(elementRef, context);
    }

    if (element) {
      (element as Record<string, unknown>)[property] = value;
    }
  }

  /**
   * Get current value from target
   *
   * Handles multiple target types:
   * - number: return as-is
   * - HTMLElement: get value/textContent or property
   * - string (variable name): resolve variable
   * - string (property path): resolve element property
   * - context references: me, it, you
   *
   * @param target - Target identifier
   * @param property - Optional property name
   * @param scope - Optional scope ('global' or 'local')
   * @param context - Execution context
   * @returns Current numeric value
   */
  private getCurrentValue(
    target: string | HTMLElement | number,
    property: string | undefined,
    scope: string | undefined,
    context: ExecutionContext
  ): number {
    // Handle direct numeric values
    if (typeof target === 'number') {
      return target;
    }

    // Handle HTMLElement
    if (isHTMLElement(target)) {
      const element = target as HTMLElement;
      if (property) {
        // Get element property or attribute
        if (
          property.startsWith('data-') ||
          ['id', 'class', 'title', 'alt', 'src', 'href'].includes(property)
        ) {
          const value = element.getAttribute(property);
          return this.convertToNumber(value);
        } else {
          const value = (element as any)[property];
          return this.convertToNumber(value);
        }
      } else {
        // Use element's text content or value
        const value = (element as any).value || element.textContent;
        return this.convertToNumber(value);
      }
    }

    // Handle string (variable name or element reference)
    if (typeof target === 'string') {
      // Handle scoped variables
      if (scope === 'global') {
        const value = this.getVariableValue(target, context, 'global');
        return this.convertToNumber(value);
      }

      // Handle element property references (e.g., "me.value", "element.scrollTop")
      if (target.includes('.')) {
        return this.getElementProperty(target, context);
      }

      // Handle context references
      if (target === 'me' && context.me) {
        return this.convertToNumber((context.me as any).value || 0);
      } else if (target === 'it') {
        return this.convertToNumber(context.it || 0);
      } else if (target === 'you' && context.you) {
        return this.convertToNumber((context.you as any).value || 0);
      }

      // Get variable value
      const value = this.getVariableValue(target, context);
      return this.convertToNumber(value);
    }

    return this.convertToNumber(target);
  }

  /**
   * Perform decrement operation
   *
   * @param currentValue - Current value
   * @param decrementBy - Amount to subtract
   * @returns New value
   */
  private performDecrement(currentValue: number, decrementBy: number): number {
    // If current value is NaN, preserve NaN
    if (isNaN(currentValue)) {
      return NaN;
    }

    // Handle special cases for decrementBy
    if (!isFinite(decrementBy)) {
      decrementBy = 1;
    }

    return currentValue - decrementBy;
  }

  /**
   * Set new value to target
   *
   * Handles multiple target types:
   * - HTMLElement: set value/textContent or property
   * - string (variable name): set variable
   * - string (property path): set element property
   * - context references: me, it, you
   *
   * @param target - Target identifier
   * @param property - Optional property name
   * @param scope - Optional scope ('global' or 'local')
   * @param newValue - New value to set
   * @param context - Execution context
   */
  private setTargetValue(
    target: string | HTMLElement | number,
    property: string | undefined,
    scope: string | undefined,
    newValue: number,
    context: ExecutionContext
  ): void {
    // Handle HTMLElement
    if (isHTMLElement(target)) {
      const element = target as HTMLElement;
      if (property) {
        // Set element property or attribute
        if (
          property.startsWith('data-') ||
          ['id', 'class', 'title', 'alt', 'src', 'href'].includes(property)
        ) {
          element.setAttribute(property, String(newValue));
        } else {
          (element as any)[property] = newValue;
        }
      } else {
        // Set element's text content or value
        if ('value' in element && (element as any).value !== undefined) {
          (element as any).value = String(newValue);
        } else {
          element.textContent = String(newValue);
        }
      }
      return;
    }

    // Handle string (variable name or element reference)
    if (typeof target === 'string') {
      // Handle scoped variables
      if (scope === 'global') {
        this.setVariableValue(target, newValue, context, 'global');
        return;
      }

      // Handle element property references
      if (target.includes('.')) {
        this.setElementProperty(target, newValue, context);
        return;
      }

      // Handle context references
      if (target === 'me' && context.me) {
        (context.me as any).value = newValue;
        return;
      } else if (target === 'it') {
        Object.assign(context, { it: newValue });
        return;
      } else if (target === 'you' && context.you) {
        (context.you as any).value = newValue;
        return;
      }

      // Set variable value
      this.setVariableValue(target, newValue, context);
    }
  }

  // ============================================================================
  // COMMAND INTERFACE
  // ============================================================================

  /**
   * Parse raw AST input into structured input object
   *
   * Decrement command syntax: "decrement <target> [by <amount>]"
   * Also supports: "decrement global <target> by <amount>"
   *
   * Examples:
   * - decrement counter
   * - decrement counter by 5
   * - decrement global score by 10
   * - decrement element.value by 2
   * - decrement me.scrollTop by 100
   *
   * AST structure:
   * - args[0]: target (identifier, literal, or expression)
   * - args[1+]: amount or 'global' keyword
   * - modifiers.by: amount value
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Structured input object { target, amount, scope? }
   */
  async parseInput(
    raw: DecrementCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<DecrementCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('Decrement command requires a target');
    }

    // Helper to get node type
    const nodeType = (node: ASTNode): string => {
      if (!node || typeof node !== 'object') return 'unknown';
      return (node as any).type || 'unknown';
    };

    // Extract target from first argument
    const targetArg = raw.args[0];
    let target: string | number;
    let extractedScope: 'global' | 'local' | undefined;

    // Extract variable name AND scope from AST node without fully evaluating
    if (nodeType(targetArg) === 'identifier') {
      target = (targetArg as any).name;
      // Extract scope if present (from :variable syntax)
      if ((targetArg as any).scope) {
        extractedScope = (targetArg as any).scope;
      }
    } else if (nodeType(targetArg) === 'literal') {
      target = (targetArg as any).value;
    } else {
      // Fallback: evaluate if it's a complex expression (e.g., selector)
      const evaluated = await evaluator.evaluate(targetArg, context);
      // If evaluation returns an array (from selector), extract first element
      if (Array.isArray(evaluated) && evaluated.length > 0) {
        target = evaluated[0];
      } else {
        target = evaluated as string | number;
      }
    }

    // Check for "by <amount>" pattern and "global" scope marker
    let amount = 1;
    let scope: 'global' | 'local' | undefined = extractedScope;

    // Check each arg to find amount and/or global scope
    for (let i = 1; i < raw.args.length; i++) {
      const arg = raw.args[i];
      if (arg && (arg as any).type === 'literal') {
        const literalValue = (arg as any).value;
        if (literalValue === 'global') {
          scope = 'global';
        } else if (typeof literalValue === 'number') {
          amount = literalValue;
        }
      } else if (arg && (arg as any).type !== 'literal') {
        // Non-literal, evaluate it (could be expression for amount)
        const evaluated = await evaluator.evaluate(arg, context);
        if (typeof evaluated === 'number') {
          amount = evaluated;
        }
      }
    }

    return {
      target,
      amount,
      ...(scope && { scope }),
    };
  }

  /**
   * Execute the decrement command
   *
   * Algorithm:
   * 1. Get current value from target
   * 2. Subtract decrement amount
   * 3. Set new value to target
   * 4. Update context.it
   *
   * @param input - Parsed input from parseInput()
   * @param context - Execution context
   * @returns New value after decrement
   */
  async execute(input: DecrementCommandInput, context: ExecutionContext): Promise<number> {
    const { target, property, scope, amount = 1 } = input;

    // Get current value
    const currentValue = this.getCurrentValue(target, property, scope, context);

    // Perform decrement
    const newValue = this.performDecrement(currentValue, amount);

    // Set the new value
    this.setTargetValue(target, property, scope, newValue, context);

    // Update context
    Object.assign(context, { it: newValue });

    return newValue;
  }

  // ============================================================================
  // METADATA
  // ============================================================================

  static metadata = {
    description:
      'The decrement command subtracts from an existing variable, property, or attribute. It defaults to subtracting the value 1, but this can be changed using the by modifier. If the target variable is null, then it is assumed to be 0, and then decremented by the specified amount.',
    syntax: 'decrement <target> [by <number>]',
    examples: [
      'decrement counter',
      'decrement counter by 5',
      'decrement global score by 10',
      'decrement element.value by 2',
      'decrement me.scrollTop by 100',
    ],
    category: 'data',
  };
}

/**
 * Factory function for creating DecrementCommand instances
 * Maintains compatibility with existing command registration
 */
export function createDecrementCommand(): DecrementCommand {
  return new DecrementCommand();
}
