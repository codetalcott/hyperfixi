/**
 * Enhanced Remove Command - Deep TypeScript Integration
 * Removes CSS classes from elements
 * Enhanced for LLM code agents with full type safety
 */

import { z } from 'zod';
import type { 
  TypedCommandImplementation,
  TypedExecutionContext,
  EvaluationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/enhanced-core.ts';
import type { UnifiedValidationResult } from '../../types/unified-types.ts';
import { dispatchCustomEvent } from '../../core/events';

export interface RemoveCommandOptions {
  delimiter?: string;
}

/**
 * Input validation schema for LLM understanding
 */
const RemoveCommandInputSchema = z.tuple([
  z.union([
    z.string(),                                    // Class names
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

type RemoveCommandInput = z.infer<typeof RemoveCommandInputSchema>;

/**
 * Enhanced Remove Command with full type safety for LLM agents
 */
export class RemoveCommand implements TypedCommandImplementation<
  RemoveCommandInput,
  HTMLElement[],  // Returns list of modified elements
  TypedExecutionContext
> {
  public readonly name = 'remove' as const;
  public readonly syntax = 'remove <class-expression> [from <target-expression>]';
  public readonly description = 'Removes CSS classes from elements';
  public readonly inputSchema = RemoveCommandInputSchema;
  public readonly outputType = 'element-list' as const;
  
  public readonly metadata: CommandMetadata = {
    category: 'dom-manipulation',
    complexity: 'simple',
    sideEffects: ['dom-mutation'],
    examples: [
      {
        code: 'remove .active from me',
        description: 'Remove active class from current element',
        expectedOutput: []
      },
      {
        code: 'remove "loading spinner" from <.buttons/>',
        description: 'Remove multiple classes from elements with buttons class',
        expectedOutput: []
      }
    ],
    relatedCommands: ['add', 'toggle', 'hide']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Removes CSS classes from HTML elements',
    parameters: [
      {
        name: 'classExpression',
        type: 'string',
        description: 'CSS class names to remove',
        optional: false,
        examples: ['.active', 'highlighted', 'loading spinner']
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
        title: 'Remove single class',
        code: 'on click remove .active from me',
        explanation: 'When clicked, removes the "active" class from the element',
        output: []
      },
      {
        title: 'Remove multiple classes',
        code: 'remove "loading error" from <#submit-btn/>',
        explanation: 'Removes both "loading" and "error" classes from submit button',
        output: []
      }
    ],
    seeAlso: ['add', 'toggle', 'hide', 'show'],
    tags: ['dom', 'css', 'classes']
  };
  
  private readonly _options: RemoveCommandOptions; // Reserved for future enhancements - configuration storage

  constructor(options: RemoveCommandOptions = {}) {
    this._options = {
      delimiter: ' ',
      ...options,
    };
  }

  get options(): RemoveCommandOptions {
    return this._options;
  }

  async execute(
    context: TypedExecutionContext,
    classExpression: RemoveCommandInput[0],
    target?: RemoveCommandInput[1]
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
            code: 'REMOVE_VALIDATION_FAILED',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      // Parse and validate classes
      const classes = this.parseClasses(classExpression);
      if (!classes.length) {
        return {
          success: false,
          error: {
            name: 'RemoveCommandError',
            message: 'No valid classes provided to remove',
            code: 'NO_VALID_CLASSES',
            suggestions: [ 'Provide valid CSS class names', 'Check class name syntax']
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
            name: 'RemoveCommandError',
            message: 'No target elements found',
            code: 'NO_TARGET_ELEMENTS',
            suggestions: [ 'Check if target selector is valid', 'Ensure elements exist in DOM']
          },
          type: 'error'
        };
      }
      
      // Process elements with enhanced error handling
      const modifiedElements: HTMLElement[] = [];
      
      for (const element of elements) {
        const classResult = await this.removeClassesFromElement(element, classes, context);
        if (classResult.success) {
          modifiedElements.push(element);
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
          name: 'RemoveCommandError',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'REMOVE_EXECUTION_FAILED',
          suggestions: [ 'Check if elements exist', 'Verify class names are valid']
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
      // Split by various delimiters and clean up class names (like ADD command)
      return classExpression
        .split(/[\s,]+/)
        .map(cls => {
          // Remove leading dot from CSS class selectors (same as ADD command)
          const trimmed = cls.trim();
          return trimmed.startsWith('.') ? trimmed.substring(1) : trimmed;
        })
        .filter(cls => cls.length > 0);
    }

    if (Array.isArray(classExpression)) {
      return classExpression
        .map(cls => String(cls).trim())
        .filter(cls => cls.length > 0);
    }

    // Convert other types to string
    return [String(classExpression).trim()].filter(cls => cls.length > 0);
  }

  private resolveTargets(
    context: TypedExecutionContext,
    target?: RemoveCommandInput[1]
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

  private async removeClassesFromElement(
    element: HTMLElement, 
    classes: string[], 
    context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement>> {
    try {
      const removedClasses: string[] = [];
      
      // Remove classes with validation
      for (const className of classes) {
        if (this.isValidClassName(className)) {
          if (element.classList.contains(className)) {
            element.classList.remove(className);
            removedClasses.push(className);
          }
        } else {
          return {
            success: false,
            error: {
              name: 'RemoveClassError',
              message: `Invalid class name: "${className}"`,
              code: 'INVALID_CLASS_NAME',
              suggestions: [ 'Use valid CSS class names', 'Check for special characters']
            },
            type: 'error'
          };
        }
      }

      // Dispatch enhanced remove event with rich metadata
      if (removedClasses.length > 0) {
        dispatchCustomEvent(element, 'hyperscript:remove', {
          element,
          context,
          command: this.name,
          type: 'classes',
          classes: removedClasses,
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
          name: 'RemoveClassError',
          message: error instanceof Error ? error.message : 'Failed to remove classes',
          code: 'CLASS_REMOVE_FAILED',
          suggestions: [ 'Check if element is still in DOM', 'Verify class names are valid']
        },
        type: 'error'
      };
    }
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

  validate(args: unknown[]): UnifiedValidationResult {
    try {
      // Schema validation
      const parsed = RemoveCommandInputSchema.safeParse(args);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch' as const,
            message: `Invalid argument: ${err.message}`,
            suggestions: [this.getValidationSuggestion(err.code, err.path)]
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
            type: 'missing-argument',
            message: 'Class expression cannot be empty',
            suggestions: ['Provide valid CSS class names']
          }],
          suggestions: [ 'Use class names like "active"', 'Use space-separated class names like "loading error"']
        };
      }
      
      // Validate target selector if provided
      if (typeof target === 'string' && !this.isValidCSSSelector(target)) {
        return {
          isValid: false,
          errors: [{
            type: 'syntax-error',
            message: `Invalid CSS selector: "${target}"`,
            suggestions: ['Use valid CSS selector syntax like "#id", ".class", or "element"']
          }],
          suggestions: [ 'Check CSS selector syntax', 'Use document.querySelector() test']
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
          suggestions: ['Check input types and values']
        }],
        suggestions: ['Ensure arguments match expected types']
      };
    }
  }

  private getValidationSuggestion(errorCode: string, _path: (string | number)[]): string {
    const suggestions: Record<string, string> = {
      'invalid_type': 'Use string or string array for classes, HTMLElement or selector for target',
      'invalid_union': 'Classes must be string or string array, target must be element or selector',
      'too_small': 'Remove command requires at least a class expression',
      'too_big': 'Too many arguments - remove command takes 1-2 arguments'
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
}

// ============================================================================
// Plugin Export for Tree-Shaking
// ============================================================================

/**
 * Plugin factory for modular imports
 * @llm-bundle-size 3KB
 * @llm-description Type-safe remove command for CSS class manipulation
 */
export function createRemoveCommand(options?: RemoveCommandOptions): RemoveCommand {
  return new RemoveCommand(options);
}

// Default export for convenience
export default RemoveCommand;