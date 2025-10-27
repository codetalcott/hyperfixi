/**
 * Enhanced Default Command Implementation
 * Sets values only if they don't already exist
 * 
 * Syntax: default <expression> to <expression>
 * 
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/enhanced-core';
import type { UnifiedValidationResult } from '../../types/unified-types';
import { asHTMLElement } from '../../utils/dom-utils';

// Input type definition
export interface DefaultCommandInput {
  target: string | HTMLElement; // Target variable, element, or attribute
  value: any; // Value to set if target doesn't exist
  toKeyword?: 'to'; // Syntax support
}

// Output type definition
export interface DefaultCommandOutput {
  target: string;
  value: any;
  wasSet: boolean; // Whether the default value was actually set
  existingValue?: any; // The existing value if it was already set
  targetType: 'variable' | 'attribute' | 'property' | 'element';
}

/**
 * Enhanced Default Command with full type safety and validation
 */
export class EnhancedDefaultCommand implements CommandImplementation<
  DefaultCommandInput,
  DefaultCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'default',
    description: 'The default command sets a value only if it doesn\'t already exist. It provides a way to set fallback values for variables, attributes, and properties.',
    examples: [
      'default myVar to "fallback"',
      'default @data-theme to "light"',
      'default my innerHTML to "No content"',
      'default count to 0'
    ],
    syntax: 'default <expression> to <expression>',
    category: 'data' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): UnifiedValidationResult<DefaultCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Default command requires target and value',
            suggestions: ['Provide target and value with "to" keyword']
          }],
          suggestions: ['Provide target and value with "to" keyword']
        };
      }

      const inputObj = input as any;

      if (!inputObj.target) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Default command requires a target',
            suggestions: ['Provide a variable name, attribute, or property reference']
          }],
          suggestions: ['Provide a variable name, attribute, or property reference']
        };
      }

      if (inputObj.value === undefined) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Default command requires a value',
            suggestions: ['Provide a default value to set']
          }],
          suggestions: ['Provide a default value to set']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          target: inputObj.target,
          value: inputObj.value,
          toKeyword: inputObj.toKeyword
        }
      };
    }
  };

  async execute(
    input: DefaultCommandInput,
    context: TypedExecutionContext
  ): Promise<DefaultCommandOutput> {
    const { target, value } = input;

    // Handle different target types
    if (typeof target === 'string') {
      // Handle attribute syntax: @attr or @data-attr
      if (target.startsWith('@')) {
        return this.defaultAttribute(context, target.substring(1), value);
      }

      // Handle possessive expressions like "my innerHTML", "my textContent"
      const possessiveMatch = target.match(/^(my|its?|your?)\s+(.+)$/);
      if (possessiveMatch) {
        const [, possessive, property] = possessiveMatch;
        return this.defaultElementProperty(context, possessive, property, value);
      }

      // Handle regular variable
      return this.defaultVariable(context, target, value);
    }

    // Handle HTML element
    if (target instanceof HTMLElement) {
      return this.defaultElementValue(context, target, value);
    }

    throw new Error(`Invalid target type: ${typeof target}`);
  }

  private defaultVariable(
    context: TypedExecutionContext,
    variableName: string,
    value: any
  ): DefaultCommandOutput {
    // Check if variable already exists
    const existingValue = context.locals?.get(variableName) || 
                         context.globals?.get(variableName) || 
                         context.variables?.get(variableName);

    if (existingValue !== undefined) {
      return {
        target: variableName,
        value,
        wasSet: false,
        existingValue,
        targetType: 'variable'
      };
    }

    // Set the default value
    if (context.locals) {
      context.locals.set(variableName, value);
    }

    // Set in context.it
    Object.assign(context, { it: value });

    return {
      target: variableName,
      value,
      wasSet: true,
      targetType: 'variable'
    };
  }

  private defaultAttribute(
    context: TypedExecutionContext,
    attributeName: string,
    value: any
  ): DefaultCommandOutput {
    if (!context.me) {
      throw new Error('No element context available for attribute default');
    }

    const existingValue = context.me.getAttribute(attributeName);

    if (existingValue !== null) {
      return {
        target: `@${attributeName}`,
        value,
        wasSet: false,
        existingValue,
        targetType: 'attribute'
      };
    }

    // Set the default value
    context.me.setAttribute(attributeName, String(value));
    Object.assign(context, { it: value });

    return {
      target: `@${attributeName}`,
      value,
      wasSet: true,
      targetType: 'attribute'
    };
  }

  private defaultElementProperty(
    context: TypedExecutionContext,
    possessive: string,
    property: string,
    value: any
  ): DefaultCommandOutput {
    let targetElement: HTMLElement;

    // Resolve possessive reference
    switch (possessive) {
      case 'my':
        if (!context.me) throw new Error('No "me" element in context');
        targetElement = asHTMLElement(context.me) || (() => { throw new Error('context.me is not an HTMLElement'); })();
        break;
      case 'its':
      case 'it':
        if (!(context.it instanceof HTMLElement)) throw new Error('Context "it" is not an element');
        targetElement = context.it;
        break;
      case 'your':
      case 'you':
        if (!context.you) throw new Error('No "you" element in context');
        targetElement = asHTMLElement(context.you) || (() => { throw new Error('context.you is not an HTMLElement'); })();
        break;
      default:
        throw new Error(`Unknown possessive: ${possessive}`);
    }

    // Get existing property value
    const existingValue = this.getElementProperty(targetElement, property);

    if (existingValue !== undefined && existingValue !== null && existingValue !== '') {
      return {
        target: `${possessive} ${property}`,
        value,
        wasSet: false,
        existingValue,
        targetType: 'property'
      };
    }

    // Set the default value
    this.setElementProperty(targetElement, property, value);
    Object.assign(context, { it: value });

    return {
      target: `${possessive} ${property}`,
      value,
      wasSet: true,
      targetType: 'property'
    };
  }

  private defaultElementValue(
    context: TypedExecutionContext,
    element: HTMLElement,
    value: any
  ): DefaultCommandOutput {
    const existingValue = this.getElementValue(element);

    if (existingValue !== undefined && existingValue !== null && existingValue !== '') {
      return {
        target: 'element',
        value,
        wasSet: false,
        existingValue,
        targetType: 'element'
      };
    }

    // Set the default value
    this.setElementValue(element, value);
    Object.assign(context, { it: value });

    return {
      target: 'element',
      value,
      wasSet: true,
      targetType: 'element'
    };
  }

  private getElementProperty(element: HTMLElement, property: string): any {
    // Handle common properties
    if (property === 'textContent') return element.textContent;
    if (property === 'innerHTML') return element.innerHTML;
    if (property === 'innerText') return element.innerText;
    if (property === 'value' && 'value' in element) return (element as any).value;
    if (property === 'id') return element.id;
    if (property === 'className') return element.className;

    // Handle style properties
    if (property.includes('-') || property in element.style) {
      return element.style.getPropertyValue(property) || (element.style as any)[property];
    }

    // Handle generic property
    return (element as any)[property];
  }

  private setElementProperty(element: HTMLElement, property: string, value: any): void {
    // Handle common properties
    if (property === 'textContent') {
      element.textContent = String(value);
      return;
    }
    if (property === 'innerHTML') {
      element.innerHTML = String(value);
      return;
    }
    if (property === 'innerText') {
      element.innerText = String(value);
      return;
    }
    if (property === 'value' && 'value' in element) {
      (element as any).value = value;
      return;
    }
    if (property === 'id') {
      element.id = String(value);
      return;
    }
    if (property === 'className') {
      element.className = String(value);
      return;
    }

    // Handle style properties
    if (property.includes('-') || property in element.style) {
      element.style.setProperty(property, String(value));
      return;
    }

    // Handle generic property
    (element as any)[property] = value;
  }

  private getElementValue(element: HTMLElement): any {
    if ('value' in element) {
      return (element as any).value;
    }
    return element.textContent;
  }

  private setElementValue(element: HTMLElement, value: any): void {
    if ('value' in element) {
      (element as any).value = value;
    } else {
      element.textContent = String(value);
    }
  }
}

/**
 * Factory function to create the enhanced default command
 */
export function createEnhancedDefaultCommand(): EnhancedDefaultCommand {
  return new EnhancedDefaultCommand();
}

export default EnhancedDefaultCommand;