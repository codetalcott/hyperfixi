/**
 * Enhanced Make Command Implementation
 * The make command can be used to create class instances or DOM elements.
 * 
 * Syntax: make (a|an) <expression> [from <arg-list>] [called <identifier>]
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface MakeCommandInput {
  article: 'a' | 'an';
  expression: string | HTMLElement;
  constructorArgs?: any[];
  variableName?: string;
}

// Output type definition  
export interface MakeCommandOutput {
  instance: any;
  type: 'dom-element' | 'class-instance';
  variableName?: string;
}

/**
 * Enhanced Make Command with full type safety and validation
 */
export class EnhancedMakeCommand implements TypedCommandImplementation<
  MakeCommandInput,
  MakeCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'make',
    description: 'The make command can be used to create class instances or DOM elements. In the first form: make a URL from "/path/", "https://origin.example.com" is equal to the JavaScript new URL("/path/", "https://origin.example.com"). In the second form: make an <a.navlink/> will create an <a> element and add the class "navlink" to it.',
    examples: [
      'make a URL from "/path/", "https://origin.example.com"',
      'make an <a.navlink/> called linkElement',
      'make a Date from "2023-01-01"',
      'make an <div#content.container/>',
      'make a Map called myMap'
    ],
    syntax: 'make (a|an) <expression> [from <arg-list>] [called <identifier>]',
    category: 'utility' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<MakeCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'Make command requires an object input',
            suggestion: 'Provide an object with article and expression properties'
          }
        };
      }

      const inputObj = input as any;

      // Validate article
      if (!inputObj.article) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Make command requires "a" or "an" article',
            suggestion: 'Use "a" before consonant sounds, "an" before vowel sounds'
          }
        };
      }

      if (inputObj.article !== 'a' && inputObj.article !== 'an') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'Make command requires "a" or "an" article',
            suggestion: 'Use "a" or "an" as the article'
          }
        };
      }

      // Validate expression
      if (!inputObj.expression) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Make command requires class name or DOM element expression',
            suggestion: 'Provide a class name like "URL" or DOM element like "<div/>"'
          }
        };
      }

      if (typeof inputObj.expression !== 'string' && !(inputObj.expression instanceof HTMLElement)) {
        return {
          success: false,
          error: {
            type: 'type-mismatch',
            message: 'Expression must be a string (class name or DOM element) or HTMLElement',
            suggestion: 'Use a string like "URL" or "<div/>"'
          }
        };
      }

      // Validate constructorArgs if provided
      if (inputObj.constructorArgs !== undefined && !Array.isArray(inputObj.constructorArgs)) {
        return {
          success: false,
          error: {
            type: 'type-mismatch',
            message: 'Constructor arguments must be an array',
            suggestion: 'Provide an array of constructor arguments'
          }
        };
      }

      // Validate variableName if provided
      if (inputObj.variableName !== undefined && typeof inputObj.variableName !== 'string') {
        return {
          success: false,
          error: {
            type: 'type-mismatch',
            message: 'Variable name must be a string',
            suggestion: 'Provide a valid identifier string'
          }
        };
      }

      return {
        success: true,
        data: {
          article: inputObj.article,
          expression: inputObj.expression,
          constructorArgs: inputObj.constructorArgs || [],
          variableName: inputObj.variableName
        }
      };
    }
  };

  async execute(
    input: MakeCommandInput,
    context: TypedExecutionContext
  ): Promise<MakeCommandOutput> {
    const { article, expression, constructorArgs = [], variableName } = input;

    let result: any;
    let type: 'dom-element' | 'class-instance';

    // Check if this is a DOM element expression (starts with < and ends with />)
    if (typeof expression === 'string' && expression.startsWith('<') && expression.endsWith('/>')) {
      result = this.createDOMElement(expression, context);
      type = 'dom-element';
    } else {
      // This is a JavaScript class instantiation
      result = this.createClassInstance(expression, constructorArgs, context);
      type = 'class-instance';
    }

    // Set the result in context.it
    context.it = result;

    // Store in variable if specified
    if (variableName) {
      this.setVariableValue(variableName, result, context);
    }

    return {
      instance: result,
      type,
      variableName
    };
  }

  private createDOMElement(elementExpression: string, context: TypedExecutionContext): HTMLElement {
    // Parse the element expression: <tag#id.class1.class2/>
    const content = elementExpression.slice(1, -2); // Remove < and />
    
    // Extract tag name
    let tagName = 'div'; // default
    let remainder = content;
    
    // Find where tag name ends (at first . or # or end)
    const tagMatch = content.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    if (tagMatch) {
      tagName = tagMatch[1];
      remainder = content.slice(tagMatch[0].length);
    }
    
    // Create the element
    const element = document.createElement(tagName);
    
    // Parse classes and ID
    const parts = remainder.split(/(?=[.#])/); // Split on . or # but keep the delimiter
    
    for (const part of parts) {
      if (part.startsWith('#')) {
        // Set ID
        const id = part.slice(1);
        if (id) {
          element.id = id;
        }
      } else if (part.startsWith('.')) {
        // Add class
        const className = part.slice(1);
        if (className) {
          element.classList.add(className);
        }
      }
    }
    
    return element;
  }

  private createClassInstance(className: string | HTMLElement, constructorArgs: any[], context: TypedExecutionContext): any {
    if (className instanceof HTMLElement) {
      return className;
    }

    const classNameStr = String(className);
    
    try {
      // Try to resolve the class constructor
      let Constructor: any;
      
      // Check common global constructors
      if (typeof window !== 'undefined') {
        Constructor = (window as any)[classNameStr];
      }
      
      // Fallback to global object
      if (!Constructor && typeof global !== 'undefined') {
        Constructor = (global as any)[classNameStr];
      }
      
      // Check context variables for custom classes
      if (!Constructor && context.variables && context.variables.has(classNameStr)) {
        Constructor = context.variables.get(classNameStr);
      }
      
      if (!Constructor || typeof Constructor !== 'function') {
        throw new Error(`Constructor '${classNameStr}' not found or is not a function`);
      }
      
      // Create the instance with constructor arguments
      if (constructorArgs.length === 0) {
        return new Constructor();
      } else {
        return new Constructor(...constructorArgs);
      }
    } catch (error) {
      throw new Error(`Failed to create instance of '${classNameStr}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private setVariableValue(name: string, value: any, context: TypedExecutionContext): void {
    // Set in local variables by default
    if (!context.locals) {
      context.locals = new Map();
    }
    context.locals.set(name, value);
  }
}

/**
 * Factory function to create the enhanced make command
 */
export function createEnhancedMakeCommand(): EnhancedMakeCommand {
  return new EnhancedMakeCommand();
}

export default EnhancedMakeCommand;