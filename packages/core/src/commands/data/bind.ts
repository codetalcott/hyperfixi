/**
 * Bind Command Implementation
 * Two-way data binding using explicit event-based pattern
 *
 * Syntax:
 *   bind :variable to <element-property>
 *   bind :variable from <element-property>
 *
 * Examples:
 *   bind :username to my.value              (element → variable)
 *   bind :username from #display.textContent (variable → element)
 *   bind :count to my.textContent bidirectional
 *
 * Philosophy: Explicit event-based binding (no implicit reactivity)
 * - Uses custom events for synchronization
 * - MutationObserver for DOM changes
 * - Clear data flow direction
 */

import { v } from '../../validation/lightweight-validators';
import type { CommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import type { UnifiedValidationResult } from '../../types/unified-types';

/**
 * Zod schema for BIND command input validation
 */
export const BindCommandInputSchema = v.object({
  variable: v.string().min(1).describe('Variable name (with or without : prefix)'),
  target: v.any().describe('Target element (string selector or HTMLElement)'),
  property: v.string().optional().describe('Element property to bind (value, textContent, etc.)'),
  direction: v.enum(['to', 'from', 'bidirectional']).optional().describe('Binding direction'),
}).describe('BIND command input parameters');

// Input type definition
export interface BindCommandInput {
  variable: string;
  target: string | HTMLElement;
  property?: string;
  direction?: 'to' | 'from' | 'bidirectional';
}

type BindCommandInputType = any; // Inferred from RuntimeValidator

// Output type definition
export interface BindCommandOutput {
  success: boolean;
  variable: string;
  element: HTMLElement;
  property: string;
  direction: 'to' | 'from' | 'bidirectional';
  bindingId: string;
}

/**
 * Binding registry to track active bindings
 */
interface ActiveBinding {
  id: string;
  variable: string;
  element: HTMLElement;
  property: string;
  direction: 'to' | 'from' | 'bidirectional';
  cleanup: () => void;
}

const activeBindings: Map<string, ActiveBinding> = new Map();

/**
 * Bind Command with event-based two-way data binding
 * No signals library - uses explicit events and observers
 */
export class BindCommand implements CommandImplementation<
  BindCommandInputType,
  BindCommandOutput,
  TypedExecutionContext
> {
  name = 'bind' as const;
  inputSchema = BindCommandInputSchema;

  metadata = {
    name: 'bind',
    description: 'Create two-way data binding between variables and DOM elements',
    examples: [
      'bind :username to my.value',
      'bind :count from #display.textContent',
      'bind :message to #input.value bidirectional'
    ],
    syntax: 'bind :variable to|from <element>.<property> [bidirectional]',
    category: 'data',
    version: '1.0.0'
  };

  validation = {
    validate: (input: unknown) => this.validate(input)
  };

  async execute(
    input: BindCommandInputType,
    context: TypedExecutionContext
  ): Promise<BindCommandOutput> {
    // Parse input
    let normalizedInput: BindCommandInput;

    if (typeof input === 'object' && input !== null) {
      normalizedInput = input as BindCommandInput;
    } else {
      throw new Error('Invalid bind command input');
    }

    const {
      variable: rawVariable,
      target,
      property = 'value',
      direction = 'to'
    } = normalizedInput;

    // Normalize variable name (remove : prefix if present)
    const variable = rawVariable.startsWith(':') ? rawVariable.substring(1) : rawVariable;

    // Resolve target element
    const element = this.resolveElement(target, context);

    if (!element) {
      throw new Error(`Cannot resolve target element: ${target}`);
    }

    // Create binding based on direction
    const bindingId = this.createBinding(variable, element, property, direction, context);

    // Dispatch bind event
    this.dispatchEvent(context, 'bind:created', {
      variable,
      element,
      property,
      direction,
      bindingId
    });

    return {
      success: true,
      variable,
      element,
      property,
      direction,
      bindingId
    };
  }

  /**
   * Resolve element from target (string selector or HTMLElement)
   */
  private resolveElement(target: string | HTMLElement, context: TypedExecutionContext): HTMLElement | null {
    if (target instanceof HTMLElement) {
      return target;
    }

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

    return null;
  }

  /**
   * Create a binding between variable and element property
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
        // Include originElement to prevent updating the element that triggered the change
        const event = new CustomEvent(`variable:${variable}:change`, {
          detail: { value, source: 'variable', originElement: element },
          bubbles: true
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
          characterData: true
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
      cleanup: () => cleanupFunctions.forEach(fn => fn())
    });

    return bindingId;
  }

  /**
   * Get appropriate event type for property
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
   */
  private getElementProperty(element: HTMLElement, property: string): any {
    // Handle attribute syntax
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
   */
  private setElementProperty(element: HTMLElement, property: string, value: any): void {
    // Handle attribute syntax
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

    // Handle nested properties
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
        cancelable: false
      });
      context.me.dispatchEvent(event);
    }
  }

  validate(input: unknown): UnifiedValidationResult<BindCommandInputType> {
    try {
      // Normalize input to ensure defaults are applied and types are correct
      let normalizedInput: any = input;

      // If input is an object, ensure it has valid structure
      if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
        const inputObj = input as any;

        // Basic validation
        if (!inputObj.variable) {
          throw new Error('Variable is required');
        }
        if (!inputObj.target) {
          throw new Error('Target is required');
        }

        // Normalize with defaults
        normalizedInput = {
          variable: inputObj.variable,
          target: inputObj.target,
          property: inputObj.property,
          direction: inputObj.direction || 'to'
        };

        // Validate direction if provided
        if (inputObj.direction && !['to', 'from', 'bidirectional'].includes(inputObj.direction)) {
          throw new Error('Invalid direction. Must be "to", "from", or "bidirectional"');
        }
      }

      // Return success - detailed schema validation happens in execute()
      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: normalizedInput
      };
    } catch (error: any) {
      // Construct helpful error message and suggestions
      const suggestions = [
        'bind :username to my.value',
        'bind :count from #display.textContent',
        'bind :message to #input.value bidirectional'
      ];

      const errorMessage = error?.message || 'Invalid BIND command input';

      return {
        isValid: false,
        errors: [{
          type: 'validation-error',
          code: 'VALIDATION_ERROR',
          message: `BIND command validation failed: ${errorMessage}`,
          path: '',
          suggestions
        }],
        suggestions
      };
    }
  }
}

/**
 * Unbind a specific binding by ID
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
 */
export function getActiveBindings(): ActiveBinding[] {
  return Array.from(activeBindings.values());
}

/**
 * Factory function to create a new BindCommand instance
 */
export function createBindCommand(): BindCommand {
  return new BindCommand();
}

// Export command instance for direct use
export const enhancedBindCommand = createBindCommand();
