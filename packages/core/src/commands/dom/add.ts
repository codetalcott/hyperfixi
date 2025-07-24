/**
 * Enhanced Add Command - Deep TypeScript Integration
 * Adds CSS classes or attributes to elements
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
} from '../../types/enhanced-core.ts';
import { dispatchCustomEvent } from '../../core/events.ts';

export interface AddCommandOptions {
  delimiter?: string;
}

/**
 * Input validation schema for LLM understanding
 */
const AddCommandInputSchema = z.tuple([
  z.union([
    z.string(),                                    // Class names or attribute syntax
    z.array(z.string()),                          // Array of class names
  ]),
  z.union([
    z.instanceof(HTMLElement),
    z.array(z.instanceof(HTMLElement)), 
    z.string(), // CSS selector
    z.null(),   // Use implicit target (me)
    z.undefined()
  ]).optional()
]);

type AddCommandInput = z.infer<typeof AddCommandInputSchema>;

/**
 * Enhanced Add Command with full type safety for LLM agents
 */
export class AddCommand implements TypedCommandImplementation<
  AddCommandInput,
  HTMLElement[],  // Returns list of modified elements
  TypedExecutionContext
> {
  public readonly name = 'add' as const;
  public readonly syntax = 'add <class-expression> [to <target-expression>]';
  public readonly description = 'Adds CSS classes or attributes to elements';
  public readonly inputSchema = AddCommandInputSchema;
  public readonly outputType = 'element-list' as const;
  
  public readonly metadata: CommandMetadata = {
    category: 'dom-manipulation',
    complexity: 'medium',
    sideEffects: ['dom-mutation'],
    examples: [
      {
        code: 'add .highlighted to me',
        description: 'Add highlighted class to current element',
        expectedOutput: []
      },
      {
        code: 'add "active selected" to <.buttons/>',
        description: 'Add multiple classes to elements with buttons class',
        expectedOutput: []
      },
      {
        code: 'add [@data-loaded="true"] to <#content/>',
        description: 'Add data attribute to content element',
        expectedOutput: []
      }
    ],
    relatedCommands: ['remove', 'toggle', 'set']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Adds CSS classes or HTML attributes to elements',
    parameters: [
      {
        name: 'classExpression',
        type: 'string | string[]',
        description: 'CSS class names to add or attribute syntax [@name="value"]',
        optional: false,
        examples: ['.active', 'highlighted', 'active selected', '[@data-state="loaded"]']
      },
      {
        name: 'target',
        type: 'element',
        description: 'Element(s) to modify. If omitted, uses the current element (me)',
        optional: true,
        examples: ['me', '<#sidebar/>', '<.buttons/>']
      }
    ],
    returns: {
      type: 'element-list',
      description: 'Array of elements that were modified',
      examples: [[]]
    },
    examples: [
      {
        title: 'Add single class',
        code: 'on click add .active to me',
        explanation: 'When clicked, adds the "active" class to the element',
        output: []
      },
      {
        title: 'Add multiple classes',
        code: 'add "loading spinner" to <#submit-btn/>',
        explanation: 'Adds both "loading" and "spinner" classes to submit button',
        output: []
      },
      {
        title: 'Add data attribute',
        code: 'add [@data-processed="true"] to <.items/>',
        explanation: 'Sets data-processed attribute to "true" on all items',
        output: []
      }
    ],
    seeAlso: ['remove', 'toggle', 'set-attribute'],
    tags: ['dom', 'css', 'classes', 'attributes']
  };
  
  private options: AddCommandOptions;

  constructor(options: AddCommandOptions = {}) {
    this.options = {
      delimiter: ' ',
      ...options,
    };
  }

  async execute(
    context: TypedExecutionContext,
    classExpression: AddCommandInput[0],
    target?: AddCommandInput[1]
  ): Promise<EvaluationResult<HTMLElement[]>> {
    try {
      // Runtime validation for type safety
      const validationResult = this.validate([classExpression, target]);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validationResult.errors[0]?.message || 'Invalid input',
            code: 'ADD_VALIDATION_FAILED',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      // Type-safe target resolution
      const elements = this.resolveTargets(context, target);
      
      if (!elements.length) {
        return {
          success: false,
          error: {
            name: 'AddCommandError',
            message: 'No target elements found',
            code: 'NO_TARGET_ELEMENTS',
            suggestions: ['Check if target selector is valid', 'Ensure elements exist in DOM']
          },
          type: 'error'
        };
      }
      
      // Process elements with enhanced error handling
      const modifiedElements: HTMLElement[] = [];
      
      // Check if this is attribute syntax
      if (typeof classExpression === 'string' && this.isAttributeSyntax(classExpression)) {
        for (const element of elements) {
          const attributeResult = await this.addAttributesToElement(element, classExpression, context);
          if (attributeResult.success) {
            modifiedElements.push(element);
          }
        }
      } else {
        // Handle as CSS classes
        const classes = this.parseClasses(classExpression);
        if (!classes.length) {
          return {
            success: false,
            error: {
              name: 'AddCommandError',
              message: 'No valid classes provided to add',
              code: 'NO_VALID_CLASSES',
              suggestions: ['Provide valid CSS class names', 'Check class name syntax']
            },
            type: 'error'
          };
        }
        
        for (const element of elements) {
          const classResult = await this.addClassesToElement(element, classes, context);
          if (classResult.success) {
            modifiedElements.push(element);
          }
        }
      }

      return {
        success: true,
        value: modifiedElements,
        type: 'element-list'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'AddCommandError',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'ADD_EXECUTION_FAILED',
          suggestions: ['Check if elements exist', 'Verify class names are valid']
        },
        type: 'error'
      };
    }
  }

  private parseClasses(classExpression: any): string[] {
    if (!classExpression) {
      return [];
    }

    if (typeof classExpression === 'string') {
      // Handle hyperscript class syntax like '.class-name'
      const cleanExpression = classExpression.trim();
      
      // Check if this is an attribute syntax like [@data-test="value"]
      if (cleanExpression.startsWith('[@') && cleanExpression.endsWith(']')) {
        // This is attribute syntax, not class syntax - return empty for now
        // TODO: Handle attribute syntax in a separate method
        return [];
      }
      
      // Split by various delimiters and clean up class names
      return cleanExpression
        .split(/[\s,]+/)
        .map(cls => {
          // Remove leading dot from CSS class selectors
          const trimmed = cls.trim();
          return trimmed.startsWith('.') ? trimmed.substring(1) : trimmed;
        })
        .filter(cls => cls.length > 0 && this.isValidClassName(cls));
    }

    if (Array.isArray(classExpression)) {
      return classExpression
        .map(cls => {
          const trimmed = String(cls).trim();
          return trimmed.startsWith('.') ? trimmed.substring(1) : trimmed;
        })
        .filter(cls => cls.length > 0 && this.isValidClassName(cls));
    }

    // Convert other types to string
    const str = String(classExpression).trim();
    const cleanStr = str.startsWith('.') ? str.substring(1) : str;
    return cleanStr.length > 0 && this.isValidClassName(cleanStr) ? [cleanStr] : [];
  }

  private resolveTargets(
    context: TypedExecutionContext,
    target?: AddCommandInput[1]
  ): HTMLElement[] {
    // If no target specified, use implicit target (me)
    if (target === undefined || target === null) {
      return context.me ? [context.me] : [];
    }

    // Handle HTMLElement
    if (target instanceof HTMLElement) {
      return [target];
    }

    // Handle NodeList or HTMLCollection
    if (target instanceof NodeList || target instanceof HTMLCollection) {
      return Array.from(target) as HTMLElement[];
    }

    // Handle Array of elements
    if (Array.isArray(target)) {
      return target.filter(item => item instanceof HTMLElement) as HTMLElement[];
    }

    // Handle CSS selector string
    if (typeof target === 'string') {
      try {
        const elements = document.querySelectorAll(target);
        return Array.from(elements) as HTMLElement[];
      } catch (_error) {
        throw new Error(`Invalid CSS selector: "${target}"`);
      }
    }

    return [];
  }

  private async addClassesToElement(
    element: HTMLElement, 
    classes: string[], 
    context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement>> {
    try {
      const addedClasses: string[] = [];
      
      // Add classes with validation
      for (const className of classes) {
        if (this.isValidClassName(className)) {
          if (!element.classList.contains(className)) {
            element.classList.add(className);
            addedClasses.push(className);
          }
        } else {
          return {
            success: false,
            error: {
              name: 'AddClassError',
              message: `Invalid class name: "${className}"`,
              code: 'INVALID_CLASS_NAME',
              suggestions: ['Use valid CSS class names', 'Check for special characters']
            },
            type: 'error'
          };
        }
      }

      // Dispatch enhanced add event with rich metadata
      if (addedClasses.length > 0) {
        dispatchCustomEvent(element, 'hyperscript:add', {
          element,
          context,
          command: this.name,
          type: 'classes',
          classes: addedClasses,
          allClasses: classes,
          timestamp: Date.now(),
          metadata: this.metadata,
          result: 'success'
        });
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
          name: 'AddClassError',
          message: error instanceof Error ? error.message : 'Failed to add classes',
          code: 'CLASS_ADD_FAILED',
          suggestions: ['Check if element is still in DOM', 'Verify class names are valid']
        },
        type: 'error'
      };
    }
  }

  private isAttributeSyntax(expression: string): boolean {
    const trimmed = expression.trim();
    return trimmed.startsWith('[@') && trimmed.endsWith(']');
  }

  private async addAttributesToElement(
    element: HTMLElement, 
    attributeExpression: string, 
    context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement>> {
    try {
      const attributes = this.parseAttributes(attributeExpression);
      
      for (const [name, value] of attributes) {
        if (!this.isValidAttributeName(name)) {
          return {
            success: false,
            error: {
              name: 'AddAttributeError',
              message: `Invalid attribute name: "${name}"`,
              code: 'INVALID_ATTRIBUTE_NAME',
              suggestions: ['Use valid HTML attribute names', 'Check attribute syntax']
            },
            type: 'error'
          };
        }
        
        element.setAttribute(name, value);
        
        // Dispatch enhanced add attribute event with rich metadata
        dispatchCustomEvent(element, 'hyperscript:add', {
          element,
          context,
          command: this.name,
          type: 'attribute',
          attribute: { name, value },
          timestamp: Date.now(),
          metadata: this.metadata,
          result: 'success'
        });
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
          name: 'AddAttributeError',
          message: error instanceof Error ? error.message : 'Failed to add attributes',
          code: 'ATTRIBUTE_ADD_FAILED',
          suggestions: ['Check attribute syntax', 'Verify element exists']
        },
        type: 'error'
      };
    }
  }

  private parseAttributes(attributeExpression: string): Array<[string, string]> {
    // Parse [@data-test="value"] or [@data-test=value] syntax
    const trimmed = attributeExpression.trim();
    
    // Remove [@ and ] brackets
    const inner = trimmed.slice(2, -1);
    
    // Split on = to get name and value
    const equalIndex = inner.indexOf('=');
    if (equalIndex === -1) {
      // No value, treat as boolean attribute
      return [[inner.trim(), '']];
    }
    
    const name = inner.slice(0, equalIndex).trim();
    let value = inner.slice(equalIndex + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    return [[name, value]];
  }

  private isValidClassName(className: string): boolean {
    // CSS class names must not be empty and must not contain invalid characters
    if (!className || className.trim().length === 0) {
      return false;
    }

    // Check for basic CSS class name validity
    // Class names cannot start with a digit or contain certain special characters
    const cssClassNameRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
    return cssClassNameRegex.test(className.trim());
  }

  validate(args: unknown[]): ValidationResult {
    try {
      // Schema validation
      const parsed = AddCommandInputSchema.safeParse(args);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch' as const,
            message: `Invalid argument: ${err.message}`,
            suggestion: this.getValidationSuggestion(err.code, err.path)
          })),
          suggestions: ['Use string or string array for classes, and valid target selector']
        };
      }

      // Additional semantic validation
      const [classExpression, target] = parsed.data;
      
      // Validate class expression is not empty
      if (!classExpression || (typeof classExpression === 'string' && classExpression.trim().length === 0)) {
        return {
          isValid: false,
          errors: [{
            type: 'empty-input',
            message: 'Class expression cannot be empty',
            suggestion: 'Provide valid CSS class names or attribute syntax'
          }],
          suggestions: ['Use class names like "active"', 'Use attribute syntax like [@data-test="value"]']
        };
      }
      
      // Validate target selector if provided
      if (typeof target === 'string' && !this.isValidCSSSelector(target)) {
        return {
          isValid: false,
          errors: [{
            type: 'invalid-syntax',
            message: `Invalid CSS selector: "${target}"`,
            suggestion: 'Use valid CSS selector syntax like "#id", ".class", or "element"'
          }],
          suggestions: ['Check CSS selector syntax', 'Use document.querySelector() test']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: []
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestion: 'Check input types and values'
        }],
        suggestions: ['Ensure arguments match expected types']
      };
    }
  }

  private getValidationSuggestion(errorCode: string, _path: (string | number)[]): string {
    const suggestions: Record<string, string> = {
      'invalid_type': 'Use string or string array for classes, HTMLElement or selector for target',
      'invalid_union': 'Classes must be string or string array, target must be element or selector',
      'too_small': 'Add command requires at least a class expression',
      'too_big': 'Too many arguments - add command takes 1-2 arguments'
    };
    
    return suggestions[errorCode] || 'Check argument types and syntax';
  }

  private isValidCSSSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  private isValidAttributeName(name: string): boolean {
    // HTML attribute names must not be empty and follow naming rules
    if (!name || name.trim().length === 0) {
      return false;
    }

    // Basic HTML attribute name validation
    // Attribute names can contain letters, digits, hyphens, periods, and underscores
    const attributeNameRegex = /^[a-zA-Z_][a-zA-Z0-9._-]*$/;
    return attributeNameRegex.test(name.trim());
  }
}

// ============================================================================
// Plugin Export for Tree-Shaking
// ============================================================================

/**
 * Plugin factory for modular imports
 * @llm-bundle-size 4KB
 * @llm-description Type-safe add command with class and attribute support
 */
export function createAddCommand(options?: AddCommandOptions): AddCommand {
  return new AddCommand(options);
}

// Default export for convenience
export default AddCommand;