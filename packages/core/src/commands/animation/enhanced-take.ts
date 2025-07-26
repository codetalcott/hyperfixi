/**
 * Enhanced Take Command - Deep TypeScript Integration
 * Moves classes, attributes, and properties between elements with comprehensive validation
 * Enhanced for LLM code agents with full type safety
 */

import { z } from 'zod';
import type { 
  TypedCommandImplementation,
  TypedExecutionContext,
  EvaluationResult,
  ValidationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/enhanced-core.js';
import { dispatchCustomEvent } from '../../core/events.js';

export interface TakeCommandOptions {
  validateProperties?: boolean;
  allowCrossDocument?: boolean;
}

/**
 * Input validation schema for LLM understanding
 */
const TakeCommandInputSchema = z.tuple([
  z.string().describe('Property or attribute name to take'),
  z.literal('from').describe('Keyword: from'),
  z.union([
    z.instanceof(HTMLElement),
    z.string(), // CSS selector
  ]).describe('Source element'),
  z.literal('and').optional().describe('Optional: and'),
  z.literal('put').optional().describe('Optional: put'),
  z.literal('it').optional().describe('Optional: it'),
  z.literal('on').optional().describe('Optional: on'),
  z.union([
    z.instanceof(HTMLElement),
    z.string(), // CSS selector
    z.null(),   // Use implicit target (me)
    z.undefined()
  ]).optional().describe('Target element')
]);

type TakeCommandInput = z.infer<typeof TakeCommandInputSchema>;

/**
 * Enhanced Take Command with full type safety for LLM agents
 */
export class EnhancedTakeCommand implements TypedCommandImplementation<
  TakeCommandInput,
  HTMLElement,  // Returns the target element that received the property
  TypedExecutionContext
> {
  public readonly name = 'take' as const;
  public readonly syntax = 'take <property> from <source> [and put it on <target>]';
  public readonly description = 'Moves classes, attributes, and properties from one element to another with validation';
  public readonly inputSchema = TakeCommandInputSchema;
  public readonly outputType = 'element' as const;

  public readonly metadata: CommandMetadata = {
    category: 'dom-manipulation',
    complexity: 'medium',
    sideEffects: ['dom-mutation', 'attribute-transfer'],
    examples: [
      {
        code: 'take class from <#source/> and put it on me',
        description: 'Move all classes from source element to current element',
        expectedOutput: 'HTMLElement'
      },
      {
        code: 'take @data-value from <.source/> and put it on <#target/>',
        description: 'Move data attribute from source to target element',
        expectedOutput: 'HTMLElement'
      },
      {
        code: 'take title from <#old-button/>',
        description: 'Take title attribute from old button (put on current element)',
        expectedOutput: 'HTMLElement'
      }
    ],
    relatedCommands: ['put', 'add', 'remove', 'copy']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Transfers properties, attributes, and classes between HTML elements',
    parameters: [
      {
        name: 'property',
        type: 'string',
        description: 'Property or attribute name to transfer (class, @attr, style properties)',
        optional: false,
        examples: ['class', '@data-value', 'title', 'background-color', '.active']
      },
      {
        name: 'source',
        type: 'element',
        description: 'Source element to take the property from',
        optional: false,
        examples: ['<#source-element/>', '<.source-class/>', 'me']
      },
      {
        name: 'target',
        type: 'element',
        description: 'Target element to put the property on. If omitted, uses current element (me)',
        optional: true,
        examples: ['me', '<#target-element/>', '<.target-class/>']
      }
    ],
    returns: {
      type: 'element',
      description: 'The target element that received the transferred property',
      examples: ['HTMLElement']
    },
    examples: [
      {
        title: 'Transfer all classes',
        code: 'take class from <#old-element/> and put it on <#new-element/>',
        explanation: 'Moves all CSS classes from old element to new element',
        output: 'HTMLElement'
      },
      {
        title: 'Transfer specific attribute',
        code: 'take @data-config from <.source/> and put it on me',
        explanation: 'Moves data-config attribute from source element to current element',
        output: 'HTMLElement'
      },
      {
        title: 'Transfer to implicit target',
        code: 'take title from <#tooltip-source/>',
        explanation: 'Takes title attribute from source and puts it on current element',
        output: 'HTMLElement'
      },
      {
        title: 'Transfer CSS property',
        code: 'take background-color from <.theme-source/> and put it on <.theme-target/>',
        explanation: 'Moves background-color style property between elements',
        output: 'HTMLElement'
      }
    ],
    seeAlso: ['put', 'add-class', 'remove-class', 'copy-attribute'],
    tags: ['dom', 'transfer', 'properties', 'attributes', 'classes']
  };
  
  private options: TakeCommandOptions;

  constructor(options: TakeCommandOptions = {}) {
    this.options = {
      validateProperties: true,
      allowCrossDocument: false,
      ...options,
    };
  }

  async execute(
    context: TypedExecutionContext,
    ...args: unknown[]
  ): Promise<EvaluationResult<HTMLElement>> {
    try {
      // Runtime validation for type safety
      const validationResult = this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validationResult.errors[0]?.message || 'Invalid input',
            code: 'TAKE_VALIDATION_FAILED',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      // Parse arguments using enhanced parsing
      const parseResult = this.parseArguments(args, context);
      if (!parseResult.success) {
        return parseResult as EvaluationResult<HTMLElement>;
      }

      const { property, source, target } = parseResult.value;

      // Take the property from source
      const takeResult = await this.takeProperty(source, property, context);
      if (!takeResult.success) {
        return takeResult as EvaluationResult<HTMLElement>;
      }

      const takenValue = takeResult.value;

      // Put it on target
      const putResult = await this.putProperty(target, property, takenValue, context);
      if (!putResult.success) {
        return putResult as EvaluationResult<HTMLElement>;
      }

      // Dispatch enhanced take event with rich metadata
      dispatchCustomEvent(target, 'hyperscript:take', {
        element: target,
        context,
        command: this.name,
        property,
        source,
        target,
        value: takenValue,
        timestamp: Date.now(),
        metadata: this.metadata,
        result: 'success'
      });

      return {
        success: true,
        value: target,
        type: 'element'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TakeCommandError',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'TAKE_EXECUTION_FAILED',
          suggestion: 'Check if elements exist and verify property names are valid'
        },
        type: 'error'
      };
    }
  }

  validate(args: unknown[]): ValidationResult {
    try {
      // Basic argument count validation
      if (args.length < 3) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument' as const,
            message: 'Take command requires property, "from", and source element',
            suggestion: 'Use: take <property> from <source> [and put it on <target>]'
          }],
          suggestion: 'Use: take class from <element>', 'Use: take @attr from <element> and put it on <target>'
        };
      }

      // Validate property name
      const property = args[0];
      if (typeof property !== 'string' || property.trim().length === 0) {
        return {
          isValid: false,
          errors: [{
            type: 'invalid-syntax' as const,
            message: 'Property name must be a non-empty string',
            suggestion: 'Use valid property names like "class", "@data-attr", or "title"'
          }],
          suggestion: 'Use: class, title, id, @data-*', 'Use: CSS property names', 'Use: .className for specific classes'
        };
      }

      // Validate "from" keyword
      if (args[1] !== 'from') {
        return {
          isValid: false,
          errors: [{
            type: 'invalid-syntax' as const,
            message: 'Expected "from" keyword after property name',
            suggestion: 'Use syntax: take <property> from <source>'
          }],
          suggestion: 'Use: take class from <element>', 'Include "from" keyword between property and source'
        };
      }

      // Validate source element
      const source = args[2];
      if (!this.isValidElementReference(source)) {
        return {
          isValid: false,
          errors: [{
            type: 'invalid-argument' as const,
            message: 'Source must be an HTMLElement or valid CSS selector',
            suggestion: 'Use HTMLElement or CSS selector like "#id", ".class", "tag"'
          }],
          suggestion: 'Use: <#element-id/>', 'Use: <.class-name/>', 'Use: HTMLElement references'
        };
      }

      // Validate optional "and put it on" clause
      if (args.length > 3) {
        const expectedSequence = ['and', 'put', 'it', 'on'];
        let index = 3;
        let sequenceIndex = 0;

        // Allow partial sequences like just providing target without full clause
        if (args.length >= 4 && this.isValidElementReference(args[3])) {
          // Direct target without full clause - acceptable
          return {
            isValid: true,
            errors: [],
            suggestion: 
          };
        }

        // Check for full "and put it on" sequence
        while (index < args.length && sequenceIndex < expectedSequence.length) {
          if (args[index] === expectedSequence[sequenceIndex]) {
            index++;
            sequenceIndex++;
          } else if (sequenceIndex === expectedSequence.length && this.isValidElementReference(args[index])) {
            // Target element after sequence
            break;
          } else {
            return {
              isValid: false,
              errors: [{
                type: 'invalid-syntax' as const,
                message: `Invalid take syntax. Expected "${expectedSequence[sequenceIndex]}" but got "${args[index]}"`,
                suggestion: 'Use: take <property> from <source> and put it on <target>'
              }],
              suggestion: 'Use full syntax: and put it on <target>', 'Or just provide target element directly'
            };
          }
        }

        // Validate target element if provided
        if (index < args.length) {
          const target = args[index];
          if (!this.isValidElementReference(target)) {
            return {
              isValid: false,
              errors: [{
                type: 'invalid-argument' as const,
                message: 'Target must be an HTMLElement or valid CSS selector',
                suggestion: 'Use HTMLElement or CSS selector like "#id", ".class", "tag"'
              }],
              suggestion: 'Use: <#element-id/>', 'Use: <.class-name/>', 'Use: HTMLElement references'
            };
          }
        }
      }

      return {
        isValid: true,
        errors: [],
        suggestion: 
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error' as const,
          message: 'Validation failed with exception',
          suggestion: 'Check input types and values'
        }],
        suggestion: 'Ensure arguments match expected types'
      };
    }
  }

  private isValidElementReference(value: unknown): boolean {
    return value instanceof HTMLElement || 
           (typeof value === 'string' && value.trim().length > 0) ||
           value === null || 
           value === undefined;
  }

  private parseArguments(
    args: unknown[], 
    context: TypedExecutionContext
  ): EvaluationResult<{ property: string; source: HTMLElement; target: HTMLElement }> {
    try {
      const property = String(args[0]);
      
      // Resolve source element
      const sourceResult = this.resolveElement(args[2], context);
      if (!sourceResult.success) {
        return {
          success: false,
          error: {
            name: 'TakeParseError',
            message: `Cannot resolve source element: ${sourceResult.error?.message}`,
            code: 'SOURCE_RESOLUTION_FAILED',
            suggestion: 'Check if source element exists in DOM', 'Verify selector syntax'
          },
          type: 'error'
        };
      }

      // Resolve target element
      let targetElement: HTMLElement;
      if (args.length > 3) {
        // Look for target element - could be after "and put it on" or directly provided
        let targetArg: unknown;
        
        if (args[3] === 'and' && args.length >= 7) {
          // Full "and put it on <target>" syntax
          targetArg = args[6];
        } else if (this.isValidElementReference(args[3])) {
          // Direct target provision
          targetArg = args[3];
        } else {
          // Look for target at end of arguments
          targetArg = args[args.length - 1];
        }

        const targetResult = this.resolveElement(targetArg, context);
        if (!targetResult.success) {
          return {
            success: false,
            error: {
              name: 'TakeParseError',
              message: `Cannot resolve target element: ${targetResult.error?.message}`,
              code: 'TARGET_RESOLUTION_FAILED',
              suggestion: 'Check if target element exists in DOM', 'Verify selector syntax'
            },
            type: 'error'
          };
        }
        targetElement = targetResult.value;
      } else {
        // Default to context.me
        if (!context.me) {
          return {
            success: false,
            error: {
              name: 'TakeParseError',
              message: 'No target element available - context.me is undefined',
              code: 'NO_TARGET_ELEMENT',
              suggestion: 'Ensure command is called within element context', 'Provide explicit target element'
            },
            type: 'error'
          };
        }
        targetElement = context.me;
      }

      return {
        success: true,
        value: {
          property,
          source: sourceResult.value,
          target: targetElement
        },
        type: 'object'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TakeParseError',
          message: error instanceof Error ? error.message : 'Failed to parse take arguments',
          code: 'PARSE_FAILED',
          suggestion: 'Check argument syntax and types'
        },
        type: 'error'
      };
    }
  }

  private resolveElement(
    element: unknown, 
    context: TypedExecutionContext
  ): EvaluationResult<HTMLElement> {
    try {
      // Handle HTMLElement directly
      if (element instanceof HTMLElement) {
        return {
          success: true,
          value: element,
          type: 'element'
        };
      }

      // Handle string selector
      if (typeof element === 'string') {
        // Handle context references
        const trimmed = element.trim();
        if (trimmed === 'me' && context.me) {
          return {
            success: true,
            value: context.me,
            type: 'element'
          };
        }
        if (trimmed === 'it' && context.it instanceof HTMLElement) {
          return {
            success: true,
            value: context.it,
            type: 'element'
          };
        }
        if (trimmed === 'you' && context.you) {
          return {
            success: true,
            value: context.you,
            type: 'element'
          };
        }

        // Handle CSS selector
        if (typeof document !== 'undefined') {
          try {
            const found = document.querySelector(trimmed);
            if (found instanceof HTMLElement) {
              return {
                success: true,
                value: found,
                type: 'element'
              };
            }
          } catch (selectorError) {
            return {
              success: false,
              error: {
                name: 'ElementResolutionError',
                message: `Invalid CSS selector: "${trimmed}"`,
                code: 'INVALID_SELECTOR',
                suggestion: 'Use valid CSS selector syntax', 'Check for typos in selector'
              },
              type: 'error'
            };
          }
        }

        return {
          success: false,
          error: {
            name: 'ElementResolutionError',
            message: `Element not found: "${trimmed}"`,
            code: 'ELEMENT_NOT_FOUND',
            suggestion: 'Check if element exists in DOM', 'Verify selector matches existing elements'
          },
          type: 'error'
        };
      }

      return {
        success: false,
        error: {
          name: 'ElementResolutionError',
          message: `Invalid element reference: ${typeof element}`,
          code: 'INVALID_ELEMENT_REFERENCE',
          suggestion: 'Use HTMLElement or CSS selector string'
        },
        type: 'error'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ElementResolutionError',
          message: error instanceof Error ? error.message : 'Element resolution failed',
          code: 'RESOLUTION_FAILED',
          suggestion: 'Check element reference validity'
        },
        type: 'error'
      };
    }
  }

  private async takeProperty(
    element: HTMLElement, 
    property: string, 
    _context: TypedExecutionContext
  ): Promise<EvaluationResult<unknown>> {
    try {
      const prop = property.trim();
      const lowerProp = prop.toLowerCase();
      
      // Validate property if validation is enabled
      if (this.options.validateProperties && !this.isValidProperty(prop)) {
        return {
          success: false,
          error: {
            name: 'TakePropertyError',
            message: `Invalid property name: "${prop}"`,
            code: 'INVALID_PROPERTY',
            suggestion: 'Use valid property names', 'Check property syntax'
          },
          type: 'error'
        };
      }

      // Handle CSS classes
      if (lowerProp === 'class' || lowerProp === 'classes') {
        const classes = Array.from(element.classList);
        element.className = ''; // Remove all classes
        return {
          success: true,
          value: classes,
          type: 'array'
        };
      }
      
      // Handle specific class
      if (prop.startsWith('.')) {
        const className = prop.substring(1);
        if (element.classList.contains(className)) {
          element.classList.remove(className);
          return {
            success: true,
            value: className,
            type: 'string'
          };
        }
        return {
          success: true,
          value: null,
          type: 'null'
        };
      }
      
      // Handle attributes
      if (prop.startsWith('@') || prop.startsWith('data-')) {
        const attrName = prop.startsWith('@') ? prop.substring(1) : prop;
        const value = element.getAttribute(attrName);
        element.removeAttribute(attrName);
        return {
          success: true,
          value: value,
          type: 'string'
        };
      }
      
      // Handle common properties
      if (lowerProp === 'id') {
        const value = element.id;
        element.id = '';
        return {
          success: true,
          value: value,
          type: 'string'
        };
      }
      
      if (lowerProp === 'title') {
        const value = element.title;
        element.title = '';
        return {
          success: true,
          value: value,
          type: 'string'
        };
      }
      
      if (lowerProp === 'value' && 'value' in element) {
        const value = (element as HTMLInputElement).value;
        (element as HTMLInputElement).value = '';
        return {
          success: true,
          value: value,
          type: 'string'
        };
      }
      
      // Handle CSS properties  
      const camelProperty = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Check if it's a CSS property
      if (prop.includes('-') || camelProperty in element.style || prop in element.style) {
        let value: string;
        
        if (camelProperty in element.style) {
          value = (element.style as Record<string, string>)[camelProperty];
          (element.style as Record<string, string>)[camelProperty] = '';
        } else if (prop in element.style) {
          value = (element.style as Record<string, string>)[prop];
          (element.style as Record<string, string>)[prop] = '';
        } else {
          value = element.style.getPropertyValue(prop);
          element.style.removeProperty(prop);
        }
        
        return {
          success: true,
          value: value,
          type: 'string'
        };
      }
      
      // Handle generic attributes
      const value = element.getAttribute(property);
      if (value !== null) {
        element.removeAttribute(property);
        return {
          success: true,
          value: value,
          type: 'string'
        };
      }
      
      return {
        success: true,
        value: null,
        type: 'null'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TakePropertyError',
          message: error instanceof Error ? error.message : 'Failed to take property',
          code: 'PROPERTY_TAKE_FAILED',
          suggestion: 'Check if element supports the property', 'Verify property name is valid'
        },
        type: 'error'
      };
    }
  }

  private async putProperty(
    element: HTMLElement, 
    property: string, 
    value: unknown, 
    _context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement>> {
    try {
      if (value === null || value === undefined) {
        // Nothing to put, but this is not an error
        return {
          success: true,
          value: element,
          type: 'element'
        };
      }
      
      const prop = property.trim();
      const lowerProp = prop.toLowerCase();
      
      // Handle CSS classes
      if (lowerProp === 'class' || lowerProp === 'classes') {
        if (Array.isArray(value)) {
          value.forEach(className => {
            if (className && typeof className === 'string') {
              element.classList.add(className);
            }
          });
        } else if (typeof value === 'string') {
          element.className = value;
        }
        return {
          success: true,
          value: element,
          type: 'element'
        };
      }
      
      // Handle specific class
      if (prop.startsWith('.')) {
        const className = prop.substring(1);
        if (value) {
          element.classList.add(className);
        }
        return {
          success: true,
          value: element,
          type: 'element'
        };
      }
      
      // Handle attributes
      if (prop.startsWith('@') || prop.startsWith('data-')) {
        const attrName = prop.startsWith('@') ? prop.substring(1) : prop;
        if (value) {
          element.setAttribute(attrName, String(value));
        }
        return {
          success: true,
          value: element,
          type: 'element'
        };
      }
      
      // Handle common properties
      if (lowerProp === 'id') {
        element.id = String(value || '');
        return {
          success: true,
          value: element,
          type: 'element'
        };
      }
      
      if (lowerProp === 'title') {
        element.title = String(value || '');
        return {
          success: true,
          value: element,
          type: 'element'
        };
      }
      
      if (lowerProp === 'value' && 'value' in element) {
        (element as HTMLInputElement).value = String(value || '');
        return {
          success: true,
          value: element,
          type: 'element'
        };
      }
      
      // Handle CSS properties
      const camelProperty = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (prop.includes('-') || camelProperty in element.style || prop in element.style) {
        if (camelProperty in element.style) {
          (element.style as Record<string, string>)[camelProperty] = String(value);
        } else if (prop in element.style) {
          (element.style as Record<string, string>)[prop] = String(value);
        } else {
          element.style.setProperty(prop, String(value));
        }
        return {
          success: true,
          value: element,
          type: 'element'
        };
      }
      
      // Handle generic attributes
      if (value) {
        element.setAttribute(property, String(value));
      }

      return {
        success: true,
        value: element,
        type: 'element'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'PutPropertyError',
          message: error instanceof Error ? error.message : 'Failed to put property',
          code: 'PROPERTY_PUT_FAILED',
          suggestion: 'Check if element supports the property', 'Verify property value is valid'
        },
        type: 'error'
      };
    }
  }

  private isValidProperty(property: string): boolean {
    // Basic property validation
    if (!property || property.trim().length === 0) {
      return false;
    }

    // Allow common patterns
    const validPatterns = [
      /^[a-zA-Z][a-zA-Z0-9-]*$/, // Standard properties
      /^@[a-zA-Z][a-zA-Z0-9-]*$/, // Attributes with @
      /^data-[a-zA-Z][a-zA-Z0-9-]*$/, // Data attributes
      /^\.[a-zA-Z][a-zA-Z0-9-]*$/, // Class names with .
      /^[a-zA-Z][a-zA-Z0-9]*$/, // Camel case properties
    ];

    return validPatterns.some(pattern => pattern.test(property.trim()));
  }
}

// ============================================================================
// Plugin Export for Tree-Shaking
// ============================================================================

/**
 * Plugin factory for modular imports
 * @llm-bundle-size 5KB
 * @llm-description Type-safe take command for property and attribute transfer
 */
export function createEnhancedTakeCommand(options?: TakeCommandOptions): EnhancedTakeCommand {
  return new EnhancedTakeCommand(options);
}

// Default export for convenience
export default EnhancedTakeCommand;