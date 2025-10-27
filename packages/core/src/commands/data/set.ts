/**
 * Enhanced Set Command Implementation
 * Sets values to variables, element properties, or attributes
 * 
 * Syntax: set <target> to <value>
 * 
 * Modernized with CommandImplementation interface and Zod validation
 */

import { v, z } from '../../validation/lightweight-validators';
import type { CommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import type { UnifiedValidationResult } from '../../types/unified-types';
import { asHTMLElement } from '../../utils/dom-utils';

/**
 * Zod schema for SET command input validation
 */
export const SetCommandInputSchema = v.object({
  target: v.union([
    v.string().min(1),
    v.custom((value: unknown) => value instanceof HTMLElement),
  ]).describe('Target variable, element property, or attribute'),
  
  value: v.unknown().describe('Value to set'),
  
  toKeyword: v.literal('to').optional().describe('Syntax keyword "to"'),
  
  scope: z.enum(['global', 'local']).optional().describe('Variable scope')
}).describe('SET command input parameters');

// Input type definition
export interface SetCommandInput {
  target: string | HTMLElement;
  value: unknown;
  toKeyword?: 'to'; // For syntax validation
  scope?: 'global' | 'local';
}

type SetCommandInputType = any; // Inferred from RuntimeValidator

// Output type definition  
export interface SetCommandOutput {
  target: string | HTMLElement;
  value: unknown;
  previousValue?: unknown;
  targetType: 'variable' | 'attribute' | 'property' | 'element';
}

/**
 * Enhanced Set Command with full type safety and validation
 */
export class SetCommand implements CommandImplementation<
  SetCommandInput,
  SetCommandOutput,
  TypedExecutionContext
> {
  public readonly name = 'set' as const;
  public readonly syntax = 'set <target> to <value>';
  public readonly description = 'The set command assigns values to variables, element properties, or attributes. It supports both local and global scope assignment.';
  public readonly inputSchema = SetCommandInputSchema;
  public readonly outputType = 'object' as const;
  
  public readonly metadata = {
    name: 'set',
    description: 'The set command assigns values to variables, element properties, or attributes. It supports both local and global scope assignment.',
    syntax: 'set <target> to <value>',
    category: 'data',
    examples: [
      'set myVar to "value"',
      'set @data-theme to "dark"',
      'set my innerHTML to "content"',
      'set the textContent of #element to "text"',
      'set global count to 10'
    ],
    version: '2.0.0'
  };

  public readonly validation = {
    validate: (input: unknown): UnifiedValidationResult<SetCommandInput> => this.validateInput(input)
  };

  /**
   * Validate input using Zod schema
   */
  validateInput(input: unknown): UnifiedValidationResult<SetCommandInput> {
    try {
      const result = SetCommandInputSchema.safeParse(input);
      
      if (result.success) {
        return {
          isValid: true,
          errors: [],
          suggestions: [],
          data: result.data as SetCommandInput
        };
      } else {
        // Convert Zod errors to our format
        const errors = result.error?.errors.map(err => ({
          type: 'validation-error' as const,
          message: `${Array.isArray(err.path) ? err.path.join('.') : ''}: ${err.message}`,
          suggestions: this.generateSuggestions(err.code ?? 'unknown', (Array.isArray(err.path) ? err.path : []) as (string | number)[])
        })) ?? [];

        const suggestions = errors.flatMap(err => err.suggestions);

        return {
          isValid: false,
          errors,
          suggestions
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'validation-error',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestions: ['Check input format and try again']
        }],
        suggestions: ['Check input format and try again']
      };
    }
  }

  /**
   * Generate helpful suggestions based on Zod validation errors
   */
  private generateSuggestions(errorCode: string, path: (string | number)[]): string[] {
    const suggestions: string[] = [];
    
    if (path.includes('target')) {
      suggestions.push('Provide a target: variable name, @attribute, my property, or "the property of selector"');
      suggestions.push('Examples: "myVar", "@data-value", "my textContent", "the innerHTML of #element"');
    }
    
    if (path.includes('value')) {
      suggestions.push('Provide a value to set');
      suggestions.push('Examples: "text", 42, true, variable');
    }
    
    if (errorCode === 'invalid_type') {
      suggestions.push('Check the data type of your input');
    }
    
    if (errorCode === 'too_small') {
      suggestions.push('Target must not be empty');
    }

    // Add general syntax suggestions
    if (suggestions.length === 0) {
      suggestions.push('Use syntax: set <target> to <value>');
      suggestions.push('See examples in command metadata');
    }
    
    return suggestions;
  }

  async execute(
    input: SetCommandInputType,
    context: TypedExecutionContext
  ): Promise<SetCommandOutput> {
    console.log('🚨🚨🚨 ENHANCED SET COMMAND EXECUTE CALLED 🚨🚨🚨');
    console.log('🔧 Enhanced SET command executing with:', { input, contextMe: context.me?.id });
    console.log('🔧 Input type:', typeof input, 'Input value:', input);
    
    // Detailed input validation
    if (!input) {
      throw new Error('SET command received null/undefined input');
    }
    if (typeof input !== 'object') {
      throw new Error(`SET command received non-object input: ${typeof input}`);
    }
    
    console.log('🔧 Input object keys:', Object.keys(input));
    console.log('🔧 Input object entries:', Object.entries(input));
    
    // Debug the actual input structure
    console.log('🔍 SET Debug - Raw input:', input);
    console.log('🔍 SET Debug - Input type:', typeof input);
    console.log('🔍 SET Debug - Input is array:', Array.isArray(input));
    console.log('🔍 SET Debug - Input keys:', input && typeof input === 'object' ? Object.keys(input) : 'no keys');
    
    // Try to handle different input formats
    let target, value, scope;
    
    if (Array.isArray(input)) {
      console.log('🔍 SET Debug - Input is array, processing as arguments');
      [target, value] = input;
      scope = undefined;
    } else if (input && typeof input === 'object' && 'target' in input) {
      console.log('🔍 SET Debug - Input is object with target property');
      ({ target, value, scope } = input);
    } else {
      console.log('🔍 SET Debug - Input format not recognized, attempting fallback');
      // Fallback: treat as target
      target = input;
      value = undefined;
      scope = undefined;
    }

    console.log('🔍 SET Debug - Final extracted values:', { target, value, scope });

    // Handle different target types
    if (typeof target === 'string') {
      // Handle attribute syntax: @attr or @data-attr
      if (target.startsWith('@')) {
        return this.setElementAttribute(context, target.substring(1), value);
      }

      // Handle possessive expressions like "my innerHTML", "my textContent", "me textContent"
      const possessiveMatch = target.match(/^(my|me|its?|your?)\s+(.+)$/);
      if (possessiveMatch) {
        const [, possessive, property] = possessiveMatch;
        console.log('🔧 SET: Parsed possessive syntax:', { possessive, property, originalTarget: target });
        return this.setElementProperty(context, possessive, property, value);
      }

      // Handle "the X of Y" syntax like "the textContent of #element"
      const theOfMatch = target.match(/^the\s+(.+?)\s+of\s+(.+)$/);
      if (theOfMatch) {
        const [, property, selector] = theOfMatch;
        console.log('🔧 SET: Parsed "the X of Y" syntax:', { property, selector, originalTarget: target });
        return this.setElementPropertyBySelector(context, selector, property, value);
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
                         context.variables?.get(variableName) ||
                         (context as any)[variableName];

    // Special handling for context properties (result, it, etc.)
    // These are set directly on the context object, not in locals Map
    if (variableName === 'result') {
      Object.assign(context, { result: value });
      Object.assign(context, { it: value });
      return {
        target: variableName,
        value,
        previousValue,
        targetType: 'variable'
      };
    }

    // Regular variable handling - store in locals Map
    context.locals.set(variableName, value);

    // Set in context.it
    Object.assign(context, { it: value });

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
    Object.assign(context, { it: value });

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
    Object.assign(context, { it: value });

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
      case 'me':
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

    // Get previous property value
    const previousValue = this.getElementProperty(targetElement, property);

    // Set the property
    this.setElementPropertyValue(targetElement, property, value);
    Object.assign(context, { it: value });

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
    Object.assign(context, { it: value });

    return {
      target: element,
      value,
      previousValue,
      targetType: 'element'
    };
  }

  private getElementProperty(element: HTMLElement, property: string): unknown {
    // Handle common properties
    if (property === 'textContent') return element.textContent;
    if (property === 'innerHTML') return element.innerHTML;
    if (property === 'innerText') return element.innerText;
    if (property === 'value' && 'value' in element) return (element as HTMLInputElement).value;
    if (property === 'id') return element.id;
    if (property === 'className') return element.className;

    // Handle style properties
    if (property.includes('-') || property in element.style) {
      return element.style.getPropertyValue(property) || (element.style as unknown as Record<string, string>)[property];
    }

    // Handle generic property
    return (element as unknown as Record<string, unknown>)[property];
  }

  private setElementPropertyValue(element: HTMLElement, property: string, value: unknown): void {
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
      (element as HTMLInputElement).value = String(value);
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
    (element as unknown as Record<string, unknown>)[property] = value;
  }

  private getElementValue(element: HTMLElement): unknown {
    if ('value' in element) {
      return (element as HTMLInputElement).value;
    }
    return element.textContent;
  }

  private setElementValueDirect(element: HTMLElement, value: unknown): void {
    if ('value' in element) {
      (element as HTMLInputElement).value = String(value);
    } else {
      element.textContent = String(value);
    }
  }

  private setElementPropertyBySelector(
    context: TypedExecutionContext,
    selector: string,
    property: string,
    value: unknown
  ): SetCommandOutput {
    // Query for element using selector
    const element = this.queryElement(selector, context);
    if (!element) {
      throw new Error(`No element found for selector: ${selector}`);
    }

    // Get previous property value
    const previousValue = this.getElementProperty(element, property);

    // Set the property
    this.setElementPropertyValue(element, property, value);
    Object.assign(context, { it: value });

    return {
      target: `the ${property} of ${selector}`,
      value,
      previousValue,
      targetType: 'property'
    };
  }

  private queryElement(selector: string, context: TypedExecutionContext): HTMLElement | null {
    // Handle 'me' selector as special case
    if (selector === 'me') {
      return (context.me as HTMLElement) || null;
    }
    
    // Handle simple selectors
    if (typeof document === 'undefined') {
      return null; // In non-browser environment
    }

    try {
      const element = document.querySelector(selector);
      console.log(`🔍 querySelector("${selector}"):`, element);
      return element as HTMLElement | null;
    } catch (error) {
      console.warn('Invalid selector:', selector, error);
      return null;
    }
  }
}

/**
 * Factory function to create the enhanced set command
 */
export function createSetCommand(): SetCommand {
  return new SetCommand();
}

export default SetCommand;