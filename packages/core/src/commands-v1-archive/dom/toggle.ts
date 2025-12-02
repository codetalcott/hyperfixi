/**
 * Enhanced Toggle Command - Deep TypeScript Integration
 * Toggles CSS classes on elements
 * Enhanced for LLM code agents with full type safety
 */

import { v } from '../../validation/lightweight-validators';
import { validators } from '../../validation/common-validators.ts';
import type {
  TypedCommandImplementation,
  TypedExecutionContext,
  EvaluationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/command-types';
// Removed TypedResult import '../../types/base-types.ts';
import type { ValidationResult } from '../../types/unified-types.ts';
import { dispatchCustomEvent } from '../../core/events';
import { resolveTargets } from '../../utils/dom-utils.ts';
import { createToggleUntil } from '../../runtime/temporal-modifiers';

export interface ToggleCommandOptions {
  delimiter?: string;
}

/**
 * Input validation schema for LLM understanding
 */
const ToggleCommandInputSchema = v.tuple([
  v.union([
    v.string(), // Class names, CSS selectors, or attributes
    v.array(v.string()), // Array of class names
    validators.htmlElement, // Direct element reference
    validators.htmlElementArray, // Array of elements
  ]),
  validators.elementTarget.optional(),
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
  public readonly syntax = 'toggle <class-expression|@attribute|element-selector> [on|from <target-expression>] [until <event>] [as modal|dialog]';
  public readonly description = 'Toggles CSS classes, attributes, or interactive elements (<dialog>, <details>, <summary>, <select>) with smart detection. Summary elements toggle their parent details. For dialogs: defaults to non-modal (show), use "as modal" for modal mode';
  public readonly inputSchema = ToggleCommandInputSchema;
  public readonly outputType = 'element-list' as const;

  public readonly metadata: CommandMetadata = (
    typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
      ? undefined
      : {
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
            {
              code: 'toggle #myDialog',
              description: 'Toggle dialog element (non-modal by default using show/close)',
              expectedOutput: [],
            },
            {
              code: 'toggle #confirmDialog as modal',
              description: 'Toggle dialog in modal mode (using showModal/close)',
              expectedOutput: [],
            },
            {
              code: 'toggle me',
              description: 'Toggle current element (if it\'s a dialog, toggles open/closed state)',
              expectedOutput: [],
            },
            {
              code: 'toggle #faqSection',
              description: 'Toggle details element (expands/collapses content)',
              expectedOutput: [],
            },
            {
              code: 'toggle #countrySelect',
              description: 'Toggle select dropdown (opens/closes options)',
              expectedOutput: [],
            },
            {
              code: 'toggle me',
              description: 'When used on a summary element, toggles parent details element',
              expectedOutput: [],
            },
          ],
          relatedCommands: ['add', 'remove', 'hide', 'show', 'set', 'call'],
        }
  ) as CommandMetadata;

  public readonly documentation: LLMDocumentation = (
    typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
      ? undefined
      : {
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
            {
              title: 'Toggle dialog (non-modal)',
              code: 'on click toggle #myDialog',
              explanation: 'Toggles dialog open/closed using show() (non-modal, default behavior)',
              output: [],
            },
            {
              title: 'Toggle dialog (modal)',
              code: 'on click toggle #confirmDialog as modal',
              explanation: 'Toggles dialog in modal mode using showModal() (blocks page, traps focus)',
              output: [],
            },
            {
              title: 'Toggle dialog from inside',
              code: 'on click toggle me',
              explanation: 'When used inside a dialog, toggles the dialog itself (closes it)',
              output: [],
            },
            {
              title: 'Toggle details element',
              code: 'on click toggle #faqItem',
              explanation: 'Toggles details element open/closed (for accordions, FAQs, etc.)',
              output: [],
            },
            {
              title: 'Toggle select dropdown',
              code: 'on focus toggle #dropdown',
              explanation: 'Opens/closes select dropdown programmatically',
              output: [],
            },
            {
              title: 'Toggle from summary element',
              code: '<details><summary _="on click toggle me">FAQ</summary><p>Answer</p></details>',
              explanation: 'When used on a summary element, automatically toggles the parent details element',
              output: [],
            },
          ],
          seeAlso: ['add', 'remove', 'hide', 'show', 'set', 'call'],
          tags: ['dom', 'css', 'classes', 'attributes', 'dialog', 'modal', 'details', 'summary', 'select', 'interactive'],
        }
  ) as LLMDocumentation;

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
    const [expression, target, untilEvent, mode] = args;
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

      // Check for smart element toggle: dialog, details, select, etc.
      const smartElement = await this.checkSmartElementToggle(expression, target, context);
      if (smartElement.type === 'summary-orphan') {
        // Summary element without parent details - return empty success
        return {
          success: true,
          value: [],
          type: 'element-list',
        };
      }
      if (smartElement.type !== 'none') {
        return await this.executeSmartElementToggle(
          smartElement.elements!,
          smartElement.type,
          mode as string | undefined,
          context
        );
      }

      // Determine toggle type: CSS property, attribute, or class
      const isCSSProperty = this.isCSSPropertyExpression(expression);
      const isAttribute = !isCSSProperty && this.isAttributeExpression(expression);

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
        const elements = resolveTargets(context, target);
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
      } else if (isCSSProperty) {
        // CSS property toggle logic (*display, *visibility, *opacity)
        const property = this.parseCSSProperty(expression);
        if (!property) {
          return {
            success: false,
            error: {
              name: 'ValidationError',
              type: 'missing-argument',
              message: 'No valid CSS property provided to toggle',
              code: 'NO_VALID_CSS_PROPERTY',
              suggestions: ['Use *display, *visibility, or *opacity'],
            },
            type: 'error',
          };
        }

        // Type-safe target resolution
        const elements = resolveTargets(context, target);
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

        // Toggle CSS property on elements
        const modifiedElements: HTMLElement[] = [];
        for (const element of elements) {
          const propResult = await this.toggleCSSPropertyOnElement(element, property, context);
          if (propResult.success) {
            modifiedElements.push(element);
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
        const elements = resolveTargets(context, target);
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

  validate(args: unknown[]): ValidationResult {
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
      const [classExpression, target] = parsed.data as [string | string[] | HTMLElement | HTMLElement[], unknown];

      // Skip validation if expression is an HTMLElement (smart toggle)
      if (classExpression instanceof HTMLElement || Array.isArray(classExpression) && classExpression.every(e => e instanceof HTMLElement)) {
        // HTMLElement references are always valid
        return {
          isValid: true,
          errors: [],
          suggestions: [],
        };
      }

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

  /**
   * Check if expression is a CSS property toggle (starts with *)
   */
  private isCSSPropertyExpression(expression: any): boolean {
    if (typeof expression !== 'string') {
      return false;
    }
    const trimmed = expression.trim();
    return trimmed.startsWith('*');
  }

  /**
   * Parse CSS property expression like *display, *visibility, *opacity
   * Returns the property name (display, visibility, opacity)
   */
  private parseCSSProperty(expression: any): string | null {
    if (!expression || typeof expression !== 'string') {
      return null;
    }

    const trimmed = expression.trim();

    // Remove leading * and get property name
    if (trimmed.startsWith('*')) {
      const property = trimmed.slice(1).trim();

      // Validate it's a supported CSS property
      const supportedProperties = ['display', 'visibility', 'opacity'];
      if (supportedProperties.includes(property)) {
        return property;
      }
    }

    return null;
  }

  /**
   * Toggle CSS property on an element
   */
  private async toggleCSSPropertyOnElement(
    element: HTMLElement,
    property: string,
    context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement>> {
    try {
      const currentStyle = window.getComputedStyle(element);

      switch (property) {
        case 'display':
          // Toggle between 'none' and previous display value (or 'block' as default)
          if (currentStyle.display === 'none') {
            // Restore previous display value or use 'block'
            const previousDisplay = element.getAttribute('data-previous-display') || 'block';
            element.style.display = previousDisplay;
            element.removeAttribute('data-previous-display');
          } else {
            // Save current display value before hiding
            element.setAttribute('data-previous-display', currentStyle.display);
            element.style.display = 'none';
          }
          break;

        case 'visibility':
          // Toggle between 'hidden' and 'visible'
          if (currentStyle.visibility === 'hidden') {
            element.style.visibility = 'visible';
          } else {
            element.style.visibility = 'hidden';
          }
          break;

        case 'opacity':
          // Toggle between '0' and '1'
          const currentOpacity = parseFloat(currentStyle.opacity);
          if (currentOpacity === 0) {
            element.style.opacity = '1';
          } else {
            element.style.opacity = '0';
          }
          break;

        default:
          return {
            success: false,
            error: {
              name: 'ValidationError',
              type: 'invalid-argument',
              message: `Unsupported CSS property: "${property}"`,
              code: 'UNSUPPORTED_CSS_PROPERTY',
              suggestions: ['Use display, visibility, or opacity'],
            },
            type: 'error',
          };
      }

      // Dispatch enhanced toggle event
      dispatchCustomEvent(element, 'hyperscript:toggle', {
        element,
        context,
        command: this.name,
        type: 'css-property',
        property,
        timestamp: Date.now(),
        metadata: this.metadata,
        result: 'success',
      });

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
          message: error instanceof Error ? error.message : 'Failed to toggle CSS property',
          code: 'CSS_PROPERTY_TOGGLE_FAILED',
          suggestions: ['Check if element is still in DOM', 'Verify property name is valid'],
        },
        type: 'error',
      };
    }
  }

  /**
   * Check if this is a smart element toggle (dialog, details, select, etc.)
   * Returns element type and elements if expression resolves to interactive elements
   */
  private async checkSmartElementToggle(
    expression: any,
    target: any,
    context: TypedExecutionContext
  ): Promise<{type: 'dialog' | 'details' | 'select' | 'none'; elements?: HTMLElement[]}> {
    // Skip if expression is a class, attribute, or CSS property
    if (
      this.isAttributeExpression(expression) ||
      this.isCSSPropertyExpression(expression) ||
      (typeof expression === 'string' && expression.startsWith('.'))
    ) {
      return {type: 'none'};
    }

    // Try to resolve elements
    let elements: HTMLElement[] = [];

    // If target is undefined/null, expression might be the selector or element
    if (target === undefined || target === null) {
      // expression is the target selector or element
      try {
        // Handle direct HTMLElement or array of HTMLElements
        if (expression instanceof HTMLElement) {
          elements = [expression];
        } else if (Array.isArray(expression) && expression.every(e => e instanceof HTMLElement)) {
          elements = expression;
        } else {
          // Try to resolve as selector
          elements = resolveTargets(context, expression);
        }
      } catch {
        return {type: 'none'};
      }
    } else {
      // Standard pattern: expression is class/attr, target is selector
      // Not a smart element toggle
      return {type: 'none'};
    }

    // Check if no elements found
    if (elements.length === 0) {
      return {type: 'none'};
    }

    // Check element types (all must be the same type for smart toggle)
    const firstTag = elements[0].tagName;
    const allSameType = elements.every(el => el.tagName === firstTag);

    if (!allSameType) {
      return {type: 'none'};
    }

    // Detect element type
    switch (firstTag) {
      case 'DIALOG':
        return {type: 'dialog', elements: elements as HTMLDialogElement[]};
      case 'DETAILS':
        return {type: 'details', elements: elements as HTMLDetailsElement[]};
      case 'SELECT':
        return {type: 'select', elements: elements as HTMLSelectElement[]};
      case 'SUMMARY':
        // Summary elements toggle their parent details element
        const parentDetails = elements
          .map(el => el.closest('details'))
          .filter((parent): parent is HTMLDetailsElement => parent !== null);

        if (parentDetails.length > 0) {
          return {type: 'details', elements: parentDetails};
        }
        // Summary without parent details - return special marker for empty success
        return {type: 'summary-orphan' as any};
      default:
        return {type: 'none'};
    }
  }

  /**
   * Execute smart element toggle (dialog, details, select)
   * Handles different element types with appropriate toggle logic
   */
  private async executeSmartElementToggle(
    elements: HTMLElement[],
    elementType: 'dialog' | 'details' | 'select',
    mode: string | undefined,
    context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement[]>> {
    try {
      const modifiedElements: HTMLElement[] = [];

      for (const element of elements) {
        let state: 'opened' | 'closed' = 'closed';

        switch (elementType) {
          case 'dialog':
            state = await this.toggleDialog(element as HTMLDialogElement, mode);
            break;
          case 'details':
            state = this.toggleDetails(element as HTMLDetailsElement);
            break;
          case 'select':
            state = this.toggleSelect(element as HTMLSelectElement);
            break;
        }

        modifiedElements.push(element);

        // Dispatch toggle event with element-specific metadata
        dispatchCustomEvent(element, 'hyperscript:toggle', {
          element,
          context,
          command: this.name,
          type: elementType,
          mode: elementType === 'dialog' && mode === 'modal' ? 'modal' : 'non-modal',
          state,
          timestamp: Date.now(),
          metadata: this.metadata,
          result: 'success',
        });
      }

      return {
        success: true,
        value: modifiedElements,
        type: 'element-list',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ValidationError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : `Failed to toggle ${elementType}`,
          code: `${elementType.toUpperCase()}_TOGGLE_FAILED`,
          suggestions: [
            'Ensure element is in the DOM',
            'Check if element is properly initialized',
            elementType === 'dialog' && mode === 'modal' ? 'For modal dialogs, ensure page allows modal dialogs' : 'Verify element state',
          ],
        },
        type: 'error',
      };
    }
  }

  /**
   * Toggle dialog element
   */
  private async toggleDialog(dialog: HTMLDialogElement, mode?: string): Promise<'opened' | 'closed'> {
    const useModal = mode === 'modal';

    if (dialog.open) {
      dialog.close();
      return 'closed';
    } else {
      if (useModal) {
        dialog.showModal(); // Modal mode (blocks page, traps focus)
      } else {
        dialog.show(); // Non-modal mode (default)
      }
      return 'opened';
    }
  }

  /**
   * Toggle details element
   */
  private toggleDetails(details: HTMLDetailsElement): 'opened' | 'closed' {
    details.open = !details.open;
    return details.open ? 'opened' : 'closed';
  }

  /**
   * Toggle select dropdown
   */
  private toggleSelect(select: HTMLSelectElement): 'opened' | 'closed' {
    // Select elements don't have a native "open" property
    // We can trigger focus/blur or dispatch events
    if (document.activeElement === select) {
      select.blur();
      return 'closed';
    } else {
      select.focus();
      // Trigger click to open dropdown (browser-dependent)
      const clickEvent = new MouseEvent('mousedown', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      select.dispatchEvent(clickEvent);
      return 'opened';
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
