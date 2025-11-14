/**
 * Enhanced Toggle Command - Deep TypeScript Integration
 * Toggles CSS classes on elements
 * Enhanced for LLM code agents with full type safety
 */

import { v } from '../../validation/lightweight-validators';
import type {
  TypedCommandImplementation,
  TypedExecutionContext,
  EvaluationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/command-types';
// Removed TypedResult import '../../types/base-types.ts';
import type { UnifiedValidationResult } from '../../types/unified-types.ts';
import { dispatchCustomEvent } from '../../core/events';
import { asHTMLElement } from '../../utils/dom-utils';
import { createToggleUntil } from '../../runtime/temporal-modifiers';

export interface ToggleCommandOptions {
  delimiter?: string;
}

/**
 * Input validation schema for LLM understanding
 */
const ToggleCommandInputSchema = v.tuple([
  v.union([
    v.string(), // Class names
    v.array(v.string()), // Array of class names
  ]),
  v
    .union([
      v.custom((value: unknown) => value instanceof HTMLElement),
      v.array(v.custom((value: unknown) => value instanceof HTMLElement)),
      v.string(), // CSS selector
      v.null(), // Use implicit target (me)
      v.undefined(),
    ])
    .optional(),
]);

type ToggleCommandInput = any; // Inferred from RuntimeValidator

/**
 * Enhanced Toggle Command with full type safety for LLM agents
 */
export class ToggleCommand
  implements
    TypedCommandImplementation<
      ToggleCommandInput,
      HTMLElement[], // Returns list of modified elements
      TypedExecutionContext
    >
{
  public readonly name = 'toggle' as const;
  public readonly syntax = 'toggle <class-expression|@attribute> [on|from <target-expression>] [until <event>]';
  public readonly description = 'Toggles CSS classes or attributes on elements with optional temporal modifier (supports "on", "from", @attribute, [@attribute="value"], and "until" syntax)';
  public readonly inputSchema = ToggleCommandInputSchema;
  public readonly outputType = 'element-list' as const;

  public readonly metadata: CommandMetadata = {
    category: 'DOM',
    complexity: 'simple',
    sideEffects: ['dom-mutation'],
    examples: [
      {
        code: 'toggle .active on me',
        description: 'Toggle active class on current element (official _hyperscript syntax)',
        expectedOutput: [],
      },
      {
        code: 'toggle @disabled',
        description: 'Toggle disabled attribute on current element (cookbook pattern)',
        expectedOutput: [],
      },
      {
        code: 'toggle [@disabled="true"]',
        description: 'Toggle disabled attribute with explicit value (advanced cookbook pattern)',
        expectedOutput: [],
      },
      {
        code: 'toggle @disabled until htmx:afterOnLoad',
        description: 'Toggle disabled attribute until event fires (temporal modifier - Cookbook Example #4)',
        expectedOutput: [],
      },
      {
        code: 'toggle "loading spinner" on <.buttons/>',
        description: 'Toggle multiple classes on elements with buttons class',
        expectedOutput: [],
      },
    ],
    relatedCommands: ['add', 'remove', 'hide', 'show', 'set'],
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Toggles CSS classes or attributes on HTML elements',
    parameters: [
      {
        name: 'expression',
        type: 'string',
        description: 'CSS class names (.class), attributes (@attr), or attributes with values ([@attr="value"]) to toggle',
        optional: false,
        examples: ['.active', '@disabled', '[@disabled="true"]', 'loading spinner'],
      },
      {
        name: 'target',
        type: 'element',
        description: 'Element(s) to modify. If omitted, uses the current element (me)',
        optional: true,
        examples: ['me', '<#sidebar/>', '<.buttons/>'],
      },
    ],
    returns: {
      type: 'element-list',
      description: 'Array of elements that were modified',
      examples: [[]],
    },
    examples: [
      {
        title: 'Toggle CSS class (official _hyperscript syntax)',
        code: 'on click toggle .active on me',
        explanation: 'When clicked, toggles the "active" class on the element',
        output: [],
      },
      {
        title: 'Toggle attribute (cookbook pattern)',
        code: 'on click toggle @disabled',
        explanation: 'When clicked, toggles the disabled attribute on/off',
        output: [],
      },
      {
        title: 'Toggle attribute with value (advanced cookbook)',
        code: 'toggle [@disabled="true"]',
        explanation: 'Toggles disabled="true" attribute (sets if not present, removes if present with that value)',
        output: [],
      },
      {
        title: 'Toggle multiple classes',
        code: 'toggle "loading complete" on <#submit-btn/>',
        explanation: 'Toggles both "loading" and "complete" classes on submit button',
        output: [],
      },
    ],
    seeAlso: ['add', 'remove', 'hide', 'show', 'set'],
    tags: ['dom', 'css', 'classes', 'attributes'],
  };

  private readonly _options: ToggleCommandOptions; // Reserved for future enhancements - configuration storage

  constructor(options: ToggleCommandOptions = {}) {
    this._options = {
      delimiter: ' ',
      ...options,
    };
  }

  get options(): ToggleCommandOptions {
    return this._options;
  }

  async execute(
    context: TypedExecutionContext,
    ...args: ToggleCommandInput
  ): Promise<EvaluationResult<HTMLElement[]>> {
    const [expression, target, untilEvent] = args;
    try {
      // Runtime validation for type safety
      const validationResult = this.validate([expression, target]);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'validation-error',
            message: validationResult.errors[0]?.message || 'Invalid input',
            code: 'TOGGLE_VALIDATION_FAILED',
            suggestions: validationResult.suggestions,
          },
          type: 'error',
        };
      }

      // Determine if this is an attribute or class toggle
      const isAttribute = this.isAttributeExpression(expression);

      // Parse and validate
      if (isAttribute) {
        const attributes = this.parseAttributes(expression);
        if (!attributes.length) {
          return {
            success: false,
            error: {
              name: 'ValidationError',
              type: 'missing-argument',
              message: 'No valid attributes provided to toggle',
              code: 'NO_VALID_ATTRIBUTES',
              suggestions: ['Provide valid attribute names like @disabled or [@disabled="true"]'],
            },
            type: 'error',
          };
        }

        // Type-safe target resolution
        const elements = this.resolveTargets(context, target);
        if (!elements.length) {
          return {
            success: false,
            error: {
              name: 'ValidationError',
              type: 'missing-argument',
              message: 'No target elements found',
              code: 'NO_TARGET_ELEMENTS',
              suggestions: ['Check if target selector is valid', 'Ensure elements exist in DOM'],
            },
            type: 'error',
          };
        }

        // Toggle attributes on elements
        const modifiedElements: HTMLElement[] = [];
        for (const element of elements) {
          const attrResult = await this.toggleAttributesOnElement(element, attributes, context);
          if (attrResult.success) {
            modifiedElements.push(element);

            // If untilEvent is specified, register temporal modifier
            if (untilEvent && typeof untilEvent === 'string') {
              const attr = attributes[0]; // Use first attribute for temporal modifier
              createToggleUntil(element, 'attribute', attr.name, untilEvent);
            }
          }
        }

        return {
          success: true,
          value: modifiedElements,
          type: 'element-list',
        };
      } else {
        // Original class toggle logic
        const classes = this.parseClasses(expression);
        if (!classes.length) {
          return {
            success: false,
            error: {
              name: 'ValidationError',
              type: 'missing-argument',
              message: 'No valid classes provided to toggle',
              code: 'NO_VALID_CLASSES',
              suggestions: ['Provide valid CSS class names', 'Check class name syntax'],
            },
            type: 'error',
          };
        }

        // Type-safe target resolution
        const elements = this.resolveTargets(context, target);
        if (!elements.length) {
          return {
            success: false,
            error: {
              name: 'ValidationError',
              type: 'missing-argument',
              message: 'No target elements found',
              code: 'NO_TARGET_ELEMENTS',
              suggestions: ['Check if target selector is valid', 'Ensure elements exist in DOM'],
            },
            type: 'error',
          };
        }

        // Process elements with enhanced error handling
        const modifiedElements: HTMLElement[] = [];
        for (const element of elements) {
          const classResult = await this.toggleClassesOnElement(element, classes, context);
          if (classResult.success) {
            modifiedElements.push(element);

            // If untilEvent is specified, register temporal modifier
            if (untilEvent && typeof untilEvent === 'string') {
              const className = classes[0]; // Use first class for temporal modifier
              createToggleUntil(element, 'class', className, untilEvent);
            }
          }
        }

        return {
          success: true,
          value: modifiedElements,
          type: 'element-list',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ValidationError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'TOGGLE_EXECUTION_FAILED',
          suggestions: ['Check if elements exist', 'Verify class names or attributes are valid'],
        },
        type: 'error',
      };
    }
  }

  private parseClasses(classExpression: any): string[] {
    if (!classExpression) {
      return [];
    }

    if (typeof classExpression === 'string') {
      // Split by various delimiters and filter out empty strings
      return classExpression
        .split(/[\s,]+/)
        .map(cls => cls.trim())
        .map(cls => cls.startsWith('.') ? cls.slice(1) : cls) // Strip leading dot from CSS selectors
        .filter(cls => cls.length > 0);
    }

    if (Array.isArray(classExpression)) {
      return classExpression
        .map(cls => String(cls).trim())
        .map(cls => cls.startsWith('.') ? cls.slice(1) : cls) // Strip leading dot from CSS selectors
        .filter(cls => cls.length > 0);
    }

    // Convert other types to string and strip leading dot
    return [String(classExpression).trim()]
      .map(cls => cls.startsWith('.') ? cls.slice(1) : cls) // Strip leading dot from CSS selectors
      .filter(cls => cls.length > 0);
  }

  private resolveTargets(
    context: TypedExecutionContext,
    target?: ToggleCommandInput[1]
  ): HTMLElement[] {
    // If no target specified, use implicit target (me)
    if (target === undefined || target === null) {
      if (!context.me) {
        throw new Error('Context element "me" is null');
      }
      const htmlElement = asHTMLElement(context.me);
      if (!htmlElement) {
        throw new Error('Context element "me" is not an HTMLElement');
      }
      return [htmlElement];
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
      return target.filter(item => item instanceof HTMLElement);
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

  private async toggleClassesOnElement(
    element: HTMLElement,
    classes: string[],
    context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement>> {
    try {
      const toggledClasses: string[] = [];

      // Toggle classes with validation
      for (const className of classes) {
        if (this.isValidClassName(className)) {
          element.classList.toggle(className);
          toggledClasses.push(className);
        } else {
          return {
            success: false,
            error: {
              name: 'ValidationError',
              type: 'invalid-argument',
              message: `Invalid class name: "${className}"`,
              code: 'INVALID_CLASS_NAME',
              suggestions: ['Use valid CSS class names', 'Check for special characters'],
            },
            type: 'error',
          };
        }
      }

      // Dispatch enhanced toggle event with rich metadata
      if (toggledClasses.length > 0) {
        dispatchCustomEvent(element, 'hyperscript:toggle', {
          element,
          context,
          command: this.name,
          type: 'classes',
          classes: toggledClasses,
          allClasses: classes,
          timestamp: Date.now(),
          metadata: this.metadata,
          result: 'success',
        });
      }

      return {
        success: true,
        value: element,
        type: 'element',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ValidationError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Failed to toggle classes',
          code: 'CLASS_TOGGLE_FAILED',
          suggestions: ['Check if element is still in DOM', 'Verify class names are valid'],
        },
        type: 'error',
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

  /**
   * Check if expression is an attribute toggle (starts with @ or [@)
   */
  private isAttributeExpression(expression: any): boolean {
    if (typeof expression !== 'string') {
      return false;
    }
    const trimmed = expression.trim();
    return trimmed.startsWith('@') || trimmed.startsWith('[@');
  }

  /**
   * Parse attribute expressions like @disabled or [@disabled="true"]
   * Returns array of {name, value} objects
   */
  private parseAttributes(expression: any): Array<{name: string; value?: string}> {
    if (!expression || typeof expression !== 'string') {
      return [];
    }

    const trimmed = expression.trim();

    // Handle bracket syntax: [@disabled="true"] or [@data-value="foo"]
    if (trimmed.startsWith('[@') && trimmed.includes(']')) {
      const bracketMatch = trimmed.match(/\[@([a-zA-Z][a-zA-Z0-9-]*)\s*(?:=\s*["']([^"']*)["'])?\]/);
      if (bracketMatch) {
        return [{
          name: bracketMatch[1],
          value: bracketMatch[2] // undefined if no value specified
        }];
      }
    }

    // Handle simple syntax: @disabled or @data-value
    if (trimmed.startsWith('@')) {
      const simpleName = trimmed.slice(1).trim();
      if (simpleName.length > 0 && /^[a-zA-Z][a-zA-Z0-9-]*$/.test(simpleName)) {
        return [{name: simpleName}];
      }
    }

    return [];
  }

  /**
   * Toggle attributes on an element
   */
  private async toggleAttributesOnElement(
    element: HTMLElement,
    attributes: Array<{name: string; value?: string}>,
    context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement>> {
    try {
      const toggledAttributes: string[] = [];

      for (const attr of attributes) {
        // Check if attribute currently exists
        const hasAttribute = element.hasAttribute(attr.name);

        if (attr.value !== undefined) {
          // Toggle with specific value
          if (hasAttribute && element.getAttribute(attr.name) === attr.value) {
            // Remove if it has the specified value
            element.removeAttribute(attr.name);
          } else {
            // Set to the specified value
            element.setAttribute(attr.name, attr.value);
          }
        } else {
          // Simple toggle (boolean attributes like disabled, readonly)
          if (hasAttribute) {
            element.removeAttribute(attr.name);
          } else {
            element.setAttribute(attr.name, '');
          }
        }

        toggledAttributes.push(attr.name);
      }

      // Dispatch enhanced toggle event with rich metadata
      if (toggledAttributes.length > 0) {
        dispatchCustomEvent(element, 'hyperscript:toggle', {
          element,
          context,
          command: this.name,
          type: 'attributes',
          attributes: toggledAttributes,
          allAttributes: attributes,
          timestamp: Date.now(),
          metadata: this.metadata,
          result: 'success',
        });
      }

      return {
        success: true,
        value: element,
        type: 'element',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ValidationError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Failed to toggle attributes',
          code: 'ATTRIBUTE_TOGGLE_FAILED',
          suggestions: ['Check if element is still in DOM', 'Verify attribute names are valid'],
        },
        type: 'error',
      };
    }
  }

  validate(args: unknown[]): UnifiedValidationResult {
    try {
      // Schema validation
      const parsed = ToggleCommandInputSchema.safeParse(args);

      if (!parsed.success) {
        return {
          isValid: false,
          errors:
            parsed.error?.errors.map(err => ({
              type: 'type-mismatch' as const,
              message: `Invalid argument: ${err.message}`,
              suggestions: [this.getValidationSuggestion(err.code ?? 'unknown')],
            })) ?? [],
          suggestions: ['Use string or string array for classes, and valid target selector'],
        };
      }

      // Additional semantic validation
      const [classExpression, target] = parsed.data as [string | string[], unknown];

      // Validate class expression is not empty
      if (
        !classExpression ||
        (typeof classExpression === 'string' && classExpression.trim().length === 0)
      ) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Class expression cannot be empty',
              suggestions: ['Provide valid CSS class names'],
            },
          ],
          suggestions: [
            'Use class names like "active"',
            'Use space-separated class names like "loading error"',
          ],
        };
      }

      // Validate target selector if provided
      if (typeof target === 'string' && !this.isValidCSSSelector(target)) {
        return {
          isValid: false,
          errors: [
            {
              type: 'syntax-error',
              message: `Invalid CSS selector: "${target}"`,
              suggestions: ['Use valid CSS selector syntax like "#id", ".class", or "element"'],
            },
          ],
          suggestions: ['Check CSS selector syntax', 'Use document.querySelector() test'],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            type: 'runtime-error',
            message: 'Validation failed with exception',
            suggestions: ['Check input types and values'],
          },
        ],
        suggestions: ['Ensure arguments match expected types'],
      };
    }
  }

  private getValidationSuggestion(errorCode: string): string {
    const suggestions: Record<string, string> = {
      invalid_type: 'Use string or string array for classes, HTMLElement or selector for target',
      invalid_union: 'Classes must be string or string array, target must be element or selector',
      too_small: 'Toggle command requires at least a class expression',
      too_big: 'Too many arguments - toggle command takes 1-2 arguments',
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
 * @llm-description Type-safe toggle command with validation and hide/show composition
 */
export function createToggleCommand(options?: ToggleCommandOptions): ToggleCommand {
  return new ToggleCommand(options);
}

// Default export for convenience
export default ToggleCommand;
