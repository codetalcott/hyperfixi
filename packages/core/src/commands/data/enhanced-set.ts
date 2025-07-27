/**
 * Enhanced Set Command Implementation
 * Sets values to variables, element properties, or attributes
 * 
 * Syntax: set <target> to <value>
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface SetCommandInput {
  target: string | HTMLElement;
  value: any;
  toKeyword?: 'to'; // For syntax validation
  scope?: 'global' | 'local';
}

// Output type definition  
export interface SetCommandOutput {
  target: string | HTMLElement;
  value: any;
  previousValue?: any;
  targetType: 'variable' | 'attribute' | 'property' | 'element';
}

/**
 * Enhanced Set Command with full type safety and validation
 */
export class EnhancedSetCommand implements TypedCommandImplementation<
  SetCommandInput,
  SetCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'set',
    description: 'The set command assigns values to variables, element properties, or attributes. It supports both local and global scope assignment.',
    examples: [
      'set myVar to "value"',
      'set @data-theme to "dark"',
      'set my innerHTML to "content"',
      'set global count to 10'
    ],
    syntax: 'set <target> to <value>',
    category: 'data' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<SetCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Set command requires target and value',
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
            message: 'Set command requires a target',
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
            message: 'Set command requires a value',
            suggestions: ['Provide a value to set']
          }],
          suggestions: ['Provide a value to set']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          target: inputObj.target,
          value: inputObj.value,
          toKeyword: inputObj.toKeyword,
          scope: inputObj.scope
        }
      };
    }
  };

  async execute(
    input: SetCommandInput,
    context: TypedExecutionContext
  ): Promise<SetCommandOutput> {
    const { target, value, scope } = input;

    // Handle different target types
    if (typeof target === 'string') {
      // Handle attribute syntax: @attr or @data-attr
      if (target.startsWith('@')) {
        return this.setElementAttribute(context, target.substring(1), value);
      }

      // Handle possessive expressions like "my innerHTML", "my textContent"
      const possessiveMatch = target.match(/^(my|its?|your?)\\s+(.+)$/);
      if (possessiveMatch) {
        const [, possessive, property] = possessiveMatch;
        return this.setElementProperty(context, possessive, property, value);
      }

      // Handle scoped variables
      if (scope === 'global') {
        return this.setGlobalVariable(context, target, value);
      }

      // Handle regular variable
      return this.setLocalVariable(context, target, value);
    }

    // Handle HTML element
    if (target instanceof HTMLElement) {
      return this.setElementValue(context, target, value);
    }

    throw new Error(`Invalid target type: ${typeof target}`);
  }

  private setLocalVariable(
    context: TypedExecutionContext,
    variableName: string,
    value: any
  ): SetCommandOutput {
    // Get previous value
    const previousValue = context.locals?.get(variableName) || 
                         context.globals?.get(variableName) || 
                         context.variables?.get(variableName);

    // Set the value
    context.locals.set(variableName, value);

    // Set in context.it
    context.it = value;

    return {
      target: variableName,
      value,
      previousValue,
      targetType: 'variable'
    };
  }

  private setGlobalVariable(
    context: TypedExecutionContext,
    variableName: string,
    value: any
  ): SetCommandOutput {
    // Get previous value
    const previousValue = context.globals?.get(variableName) || 
                         context.locals?.get(variableName) || 
                         context.variables?.get(variableName);

    // Set the value in global scope
    context.globals.set(variableName, value);

    // Set in context.it
    context.it = value;

    return {
      target: variableName,
      value,
      previousValue,
      targetType: 'variable'
    };
  }

  private setElementAttribute(
    context: TypedExecutionContext,
    attributeName: string,
    value: any
  ): SetCommandOutput {
    if (!context.me) {
      throw new Error('No element context available for attribute setting');
    }

    const previousValue = context.me.getAttribute(attributeName);

    // Set the attribute
    context.me.setAttribute(attributeName, String(value));
    context.it = value;

    return {
      target: `@${attributeName}`,
      value,
      previousValue,
      targetType: 'attribute'
    };
  }

  private setElementProperty(
    context: TypedExecutionContext,
    possessive: string,
    property: string,
    value: any
  ): SetCommandOutput {
    let targetElement: HTMLElement;

    // Resolve possessive reference
    switch (possessive) {
      case 'my':
        if (!context.me) throw new Error('No "me" element in context');
        targetElement = context.me;
        break;
      case 'its':
      case 'it':
        if (!(context.it instanceof HTMLElement)) throw new Error('Context "it" is not an element');
        targetElement = context.it;
        break;
      case 'your':
      case 'you':
        if (!context.you) throw new Error('No "you" element in context');
        targetElement = context.you;
        break;
      default:
        throw new Error(`Unknown possessive: ${possessive}`);
    }

    // Get previous property value
    const previousValue = this.getElementProperty(targetElement, property);

    // Set the property
    this.setElementPropertyValue(targetElement, property, value);
    context.it = value;

    return {
      target: `${possessive} ${property}`,
      value,
      previousValue,
      targetType: 'property'
    };
  }

  private setElementValue(
    context: TypedExecutionContext,
    element: HTMLElement,
    value: any
  ): SetCommandOutput {
    const previousValue = this.getElementValue(element);

    // Set the value
    this.setElementValueDirect(element, value);
    context.it = value;

    return {
      target: element,
      value,
      previousValue,
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

  private setElementPropertyValue(element: HTMLElement, property: string, value: any): void {
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

  private setElementValueDirect(element: HTMLElement, value: any): void {
    if ('value' in element) {
      (element as any).value = value;
    } else {
      element.textContent = String(value);
    }
  }
}

/**
 * Factory function to create the enhanced set command
 */
export function createEnhancedSetCommand(): EnhancedSetCommand {
  return new EnhancedSetCommand();
}

export default EnhancedSetCommand;