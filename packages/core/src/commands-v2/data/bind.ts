/**
 * BindCommand - Standalone V2 Implementation
 *
 * Two-way data binding between variables and DOM elements
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Three binding directions: to, from, bidirectional
 * - Event-based synchronization (no signals library)
 * - MutationObserver for DOM change detection
 * - Property access: value, checked, textContent, attributes, nested properties
 * - Cleanup system for memory management
 *
 * Syntax:
 *   bind :variable to <element>.<property>
 *   bind :variable from <element>.<property>
 *   bind :variable to <element>.<property> bidirectional
 *
 * @example
 *   bind :username to my.value
 *   bind :count from #display.textContent
 *   bind :message to #input.value bidirectional
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for BindCommand
 */
export interface BindCommandInput {
  /** Variable name (without : prefix) */
  variable: string;
  /** Target element */
  target: HTMLElement;
  /** Element property to bind (default: 'value') */
  property: string;
  /** Binding direction */
  direction: 'to' | 'from' | 'bidirectional';
}

/**
 * Output from Bind command execution
 */
export interface BindCommandOutput {
  success: boolean;
  variable: string;
  element: HTMLElement;
  property: string;
  direction: 'to' | 'from' | 'bidirectional';
  bindingId: string;
}

/**
 * Active binding registry
 */
interface ActiveBinding {
  id: string;
  variable: string;
  element: HTMLElement;
  property: string;
  direction: 'to' | 'from' | 'bidirectional';
  cleanup: () => void;
}

/**
 * Global binding registry (shared across all BindCommand instances)
 */
const activeBindings: Map<string, ActiveBinding> = new Map();

/**
 * BindCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 496 lines (with validation, event system, MutationObserver)
 * V2 Target: ~480 lines (3% reduction, all features preserved)
 */
export class BindCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'bind';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Create two-way data binding between variables and DOM elements',
    syntax: [
      'bind :variable to <element>.<property>',
      'bind :variable from <element>.<property>',
      'bind :variable to <element>.<property> bidirectional',
    ],
    examples: [
      'bind :username to my.value',
      'bind :count from #display.textContent',
      'bind :message to #input.value bidirectional',
      'bind :checked to #checkbox.checked',
      'bind :theme from @data-theme',
    ],
    category: 'data',
    sideEffects: ['data-binding', 'event-listeners', 'dom-observation'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Expected patterns:
   * - bind :variable to <target>.<property>
   * - bind :variable from <target>.<property>
   * - bind :variable to <target>.<property> bidirectional
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
  ): Promise<BindCommandInput> {
    // Validate arguments
    if (!raw.args || raw.args.length < 1) {
      throw new Error('bind command requires a variable name');
    }

    // Parse variable name (first argument, may have : prefix)
    const variableRaw = await evaluator.evaluate(raw.args[0], context);
    const variable = typeof variableRaw === 'string' && variableRaw.startsWith(':')
      ? variableRaw.substring(1)
      : String(variableRaw);

    // Determine direction (default: 'to')
    let direction: 'to' | 'from' | 'bidirectional' = 'to';
    if (raw.modifiers?.bidirectional || (raw as any).bidirectional) {
      direction = 'bidirectional';
    } else if (raw.modifiers?.to || (raw as any).direction === 'to') {
      direction = 'to';
    } else if (raw.modifiers?.from || (raw as any).direction === 'from') {
      direction = 'from';
    }

    // Parse target and property
    // Pattern: <target>.<property> or just <target> (property defaults to 'value')
    let target: any;
    let property = 'value'; // default property

    if (raw.modifiers?.to || raw.modifiers?.from) {
      // Parse from modifier (e.g., "to my.value" or "from #display.textContent")
      const targetExpr = raw.modifiers.to || raw.modifiers.from;
      const targetValue = await evaluator.evaluate(targetExpr, context);

      if (targetValue instanceof HTMLElement) {
        target = targetValue;
      } else if (typeof targetValue === 'string') {
        // Parse property from string (e.g., "my.value" → target=me, property=value)
        const parts = targetValue.split('.');
        if (parts.length > 1) {
          target = parts[0]; // "my", "#element", etc.
          property = parts.slice(1).join('.'); // "value", "style.color", etc.
        } else {
          target = targetValue;
        }
      } else {
        target = targetValue;
      }
    } else if ((raw as any).target) {
      target = (raw as any).target;
      property = (raw as any).property || 'value';
    } else {
      throw new Error('bind command requires a target element (to/from)');
    }

    // Resolve target to HTMLElement
    const targetElement = await this.resolveElement(target, evaluator, context);

    if (!targetElement) {
      throw new Error(`Cannot resolve target element: ${target}`);
    }

    return {
      variable,
      target: targetElement,
      property,
      direction,
    };
  }

  /**
   * Execute the bind command
   *
   * Creates bidirectional data binding between variable and element property.
   * Sets up event listeners and MutationObserver for synchronization.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Binding result with ID for cleanup
   */
  async execute(
    input: BindCommandInput,
    context: TypedExecutionContext
  ): Promise<BindCommandOutput> {
    const { variable, target: element, property, direction } = input;

    // Create binding based on direction
    const bindingId = this.createBinding(variable, element, property, direction, context);

    // Dispatch bind event
    this.dispatchEvent(context, 'bind:created', {
      variable,
      element,
      property,
      direction,
      bindingId,
    });

    return {
      success: true,
      variable,
      element,
      property,
      direction,
      bindingId,
    };
  }

  // ========== Private Binding Logic ==========

  /**
   * Create a binding between variable and element property
   *
   * Sets up event listeners and observers based on direction:
   * - 'to': Element → Variable (element changes update variable)
   * - 'from': Variable → Element (variable changes update element)
   * - 'bidirectional': Both directions
   *
   * @param variable - Variable name
   * @param element - Target element
   * @param property - Element property to bind
   * @param direction - Binding direction
   * @param context - Execution context
   * @returns Binding ID for cleanup
   */
  private createBinding(
    variable: string,
    element: HTMLElement,
    property: string,
    direction: 'to' | 'from' | 'bidirectional',
    context: TypedExecutionContext
  ): string {
    const bindingId = `bind-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cleanupFunctions: Array<() => void> = [];

    // Direction: 'to' - Element changes update variable
    if (direction === 'to' || direction === 'bidirectional') {
      const updateVariable = () => {
        const value = this.getElementProperty(element, property);

        // Update variable in context
        context.locals.set(variable, value);

        // Dispatch custom event for other bindings to listen
        // Include originElement to prevent update loops
        const event = new CustomEvent(`variable:${variable}:change`, {
          detail: { value, source: 'variable', originElement: element },
          bubbles: true,
        });
        element.dispatchEvent(event);
      };

      // Listen to appropriate events based on property
      const eventType = this.getEventTypeForProperty(property);
      element.addEventListener(eventType, updateVariable);
      cleanupFunctions.push(() => element.removeEventListener(eventType, updateVariable));

      // Initial sync - but only for 'to' direction, not bidirectional
      // (bidirectional initial sync happens in 'from' direction to preserve variable value)
      if (direction === 'to') {
        updateVariable();
      }
    }

    // Direction: 'from' - Variable changes update element
    if (direction === 'from' || direction === 'bidirectional') {
      const updateElement = (event: Event) => {
        const customEvent = event as CustomEvent;
        const value = customEvent.detail?.value ?? context.locals.get(variable);

        // Only update if this element is not the origin of the change
        const originElement = customEvent.detail?.originElement;
        if (!originElement || originElement !== element) {
          this.setElementProperty(element, property, value);
        }
      };

      // Listen to variable change events
      element.addEventListener(`variable:${variable}:change`, updateElement as EventListener);
      cleanupFunctions.push(() =>
        element.removeEventListener(`variable:${variable}:change`, updateElement as EventListener)
      );

      // Also use MutationObserver for attribute changes
      if (property.startsWith('@') || property === 'textContent' || property === 'innerHTML') {
        const observer = new MutationObserver(() => {
          const value = context.locals.get(variable);
          this.setElementProperty(element, property, value);
        });

        observer.observe(element, {
          attributes: true,
          childList: true,
          characterData: true,
        });

        cleanupFunctions.push(() => observer.disconnect());
      }

      // Initial sync
      const initialValue = context.locals.get(variable);
      if (initialValue !== undefined) {
        this.setElementProperty(element, property, initialValue);
      }
    }

    // Store binding for cleanup
    activeBindings.set(bindingId, {
      id: bindingId,
      variable,
      element,
      property,
      direction,
      cleanup: () => cleanupFunctions.forEach(fn => fn()),
    });

    return bindingId;
  }

  // ========== Private Utility Methods ==========

  /**
   * Resolve element from target expression
   *
   * Handles:
   * - HTMLElement (passthrough)
   * - Context references (me, my, it, its, you, your)
   * - CSS selectors (#id, .class, etc.)
   *
   * @param target - Target expression
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Resolved HTML element or null
   */
  private async resolveElement(
    target: any,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HTMLElement | null> {
    // If already an element, return it
    if (target instanceof HTMLElement) {
      return target;
    }

    // Evaluate if it's an AST node
    if (target && typeof target === 'object' && target.type) {
      target = await evaluator.evaluate(target, context);
    }

    // Handle string targets
    if (typeof target === 'string') {
      // Handle special context references
      if (target === 'me' || target === 'my') {
        return context.me as HTMLElement;
      }
      if (target === 'it' || target === 'its') {
        return context.it instanceof HTMLElement ? context.it : null;
      }
      if (target === 'you' || target === 'your') {
        return context.you as HTMLElement;
      }

      // Try querySelector
      if (typeof document !== 'undefined') {
        try {
          return document.querySelector(target) as HTMLElement;
        } catch {
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Get appropriate event type for property
   *
   * Maps properties to their standard DOM events:
   * - value: 'input' (text inputs)
   * - checked: 'change' (checkboxes)
   * - textContent/innerHTML: 'input'
   * - default: 'change'
   *
   * @param property - Property name
   * @returns Event type string
   */
  private getEventTypeForProperty(property: string): string {
    const eventMap: Record<string, string> = {
      'value': 'input',
      'checked': 'change',
      'textContent': 'input',
      'innerHTML': 'input',
    };

    return eventMap[property] || 'change';
  }

  /**
   * Get property value from element
   *
   * Handles:
   * - Attributes (@attribute)
   * - Special properties (value, checked, textContent, innerHTML)
   * - Nested properties (style.color)
   * - Generic property access
   *
   * @param element - Target element
   * @param property - Property path
   * @returns Property value
   */
  private getElementProperty(element: HTMLElement, property: string): any {
    // Handle attribute syntax (@attribute)
    if (property.startsWith('@')) {
      return element.getAttribute(property.substring(1));
    }

    // Handle common properties
    if (property === 'textContent') return element.textContent;
    if (property === 'innerHTML') return element.innerHTML;
    if (property === 'value' && 'value' in element) {
      return (element as HTMLInputElement).value;
    }
    if (property === 'checked' && 'checked' in element) {
      return (element as HTMLInputElement).checked;
    }

    // Handle nested properties (e.g., 'style.color')
    if (property.includes('.')) {
      const parts = property.split('.');
      let value: any = element;
      for (const part of parts) {
        value = value[part];
        if (value === undefined) break;
      }
      return value;
    }

    // Generic property access
    return (element as any)[property];
  }

  /**
   * Set property value on element
   *
   * Handles:
   * - Attributes (@attribute)
   * - Special properties (value, checked, textContent, innerHTML)
   * - Nested properties (style.color)
   * - Generic property setting
   *
   * @param element - Target element
   * @param property - Property path
   * @param value - Value to set
   */
  private setElementProperty(element: HTMLElement, property: string, value: any): void {
    // Handle attribute syntax (@attribute)
    if (property.startsWith('@')) {
      element.setAttribute(property.substring(1), String(value));
      return;
    }

    // Handle common properties
    if (property === 'textContent') {
      element.textContent = String(value);
      return;
    }
    if (property === 'innerHTML') {
      element.innerHTML = String(value);
      return;
    }
    if (property === 'value' && 'value' in element) {
      (element as HTMLInputElement).value = String(value);
      return;
    }
    if (property === 'checked' && 'checked' in element) {
      (element as HTMLInputElement).checked = Boolean(value);
      return;
    }

    // Handle nested properties (e.g., 'style.color')
    if (property.includes('.')) {
      const parts = property.split('.');
      let target: any = element;
      for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = value;
      return;
    }

    // Generic property setting
    (element as any)[property] = value;
  }

  /**
   * Dispatch custom events for bind operations
   *
   * @param context - Execution context
   * @param eventName - Event name
   * @param detail - Event detail object
   */
  private dispatchEvent(
    context: TypedExecutionContext,
    eventName: string,
    detail: Record<string, any>
  ): void {
    if (context.me instanceof HTMLElement) {
      const event = new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: false,
      });
      context.me.dispatchEvent(event);
    }
  }
}

/**
 * Factory function to create BindCommand instance
 */
export function createBindCommand(): BindCommand {
  return new BindCommand();
}

// ========== Utility Functions ==========

/**
 * Unbind a specific binding by ID
 *
 * @param bindingId - Binding ID to remove
 * @returns true if binding was found and removed
 */
export function unbind(bindingId: string): boolean {
  const binding = activeBindings.get(bindingId);
  if (binding) {
    binding.cleanup();
    activeBindings.delete(bindingId);
    return true;
  }
  return false;
}

/**
 * Unbind all bindings for a variable
 *
 * @param variable - Variable name
 * @returns Number of bindings removed
 */
export function unbindVariable(variable: string): number {
  let count = 0;
  for (const [id, binding] of activeBindings.entries()) {
    if (binding.variable === variable) {
      binding.cleanup();
      activeBindings.delete(id);
      count++;
    }
  }
  return count;
}

/**
 * Get all active bindings
 *
 * @returns Array of all active bindings
 */
export function getActiveBindings(): ActiveBinding[] {
  return Array.from(activeBindings.values());
}
