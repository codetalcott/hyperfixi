/**
 * Enhanced Toggle Command - Deep TypeScript Integration
 * Toggles element visibility using enhanced hide/show functionality
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
import { HideCommand } from './hide.ts';
import { ShowCommand } from './show.ts';

export interface ToggleCommandOptions {
  useClass?: boolean;
  className?: string;
  defaultDisplay?: string;
}

/**
 * Input validation schema for LLM understanding
 */
const ToggleCommandInputSchema = z.tuple([
  z.union([
    z.instanceof(HTMLElement),
    z.array(z.instanceof(HTMLElement)), 
    z.string(), // CSS selector
    z.null(),   // Use implicit target (me)
    z.undefined()
  ]).optional()
]);

type ToggleCommandInput = z.infer<typeof ToggleCommandInputSchema>;

/**
 * Enhanced Toggle Command with full type safety for LLM agents
 */
export class ToggleCommand implements TypedCommandImplementation<
  ToggleCommandInput,
  HTMLElement[],  // Returns list of toggled elements
  TypedExecutionContext
> {
  public readonly name = 'toggle' as const;
  public readonly syntax = 'toggle [<target-expression>]';
  public readonly description = 'Toggles element visibility by switching between hide and show states';
  public readonly inputSchema = ToggleCommandInputSchema;
  public readonly outputType = 'element-list' as const;
  
  public readonly metadata: CommandMetadata = {
    category: 'dom-manipulation',
    complexity: 'simple',
    sideEffects: ['dom-mutation'],
    examples: [
      {
        code: 'toggle me',
        description: 'Toggle the current element visibility',
        expectedOutput: []
      },
      {
        code: 'toggle <.modal/>',
        description: 'Toggle all elements with modal class',
        expectedOutput: []
      }
    ],
    relatedCommands: ['hide', 'show']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Toggles HTML element visibility by switching between hidden and visible states',
    parameters: [
      {
        name: 'target',
        type: 'element',
        description: 'Element(s) to toggle. If omitted, toggles the current element (me)',
        optional: true,
        examples: ['me', '<#sidebar/>', '<.dropdown/>']
      }
    ],
    returns: {
      type: 'element-list',
      description: 'Array of elements that were toggled',
      examples: [[]]
    },
    examples: [
      {
        title: 'Toggle current element',
        code: 'on click toggle me',
        explanation: 'When clicked, toggles the element between visible and hidden',
        output: []
      },
      {
        title: 'Toggle dropdown menu',
        code: 'on click toggle <.dropdown-menu/>',
        explanation: 'Click to show/hide dropdown menu',
        output: []
      }
    ],
    seeAlso: ['hide', 'show', 'add-class', 'remove-class'],
    tags: ['dom', 'visibility', 'toggle', 'css']
  };
  
  private hideCommand: HideCommand;
  private showCommand: ShowCommand;
  private options: ToggleCommandOptions;

  constructor(options: ToggleCommandOptions = {}) {
    this.options = {
      useClass: false,
      className: 'hyperscript-hidden',
      defaultDisplay: 'block',
      ...options,
    };

    this.hideCommand = new HideCommand({
      useClass: this.options.useClass,
      className: this.options.className,
    });

    this.showCommand = new ShowCommand({
      useClass: this.options.useClass,
      className: this.options.className,
      defaultDisplay: this.options.defaultDisplay,
    });
  }

  async execute(
    context: TypedExecutionContext,
    target?: ToggleCommandInput[0]
  ): Promise<EvaluationResult<HTMLElement[]>> {
    try {
      // Runtime validation for type safety
      const validationResult = this.validate([target]);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validationResult.errors[0]?.message || 'Invalid input',
            code: 'TOGGLE_VALIDATION_FAILED',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      // Type-safe target resolution
      const elements = this.resolveTargets(context, target);
      
      // Process elements with enhanced error handling
      const toggledElements: HTMLElement[] = [];
      
      for (const element of elements) {
        const toggleResult = await this.toggleElement(element, context);
        if (toggleResult.success) {
          toggledElements.push(element);
        }
      }

      return {
        success: true,
        value: toggledElements,
        type: 'element-list'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ToggleCommandError',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'TOGGLE_EXECUTION_FAILED',
          suggestions: ['Check if element exists', 'Verify element is not null']
        },
        type: 'error'
      };
    }
  }

  private resolveTargets(
    context: TypedExecutionContext,
    target?: ToggleCommandInput[0]
  ): HTMLElement[] {
    // If no target specified, use implicit target (me)
    if (target === undefined || target === null) {
      return context.me ? [context.me] : [];
    }

    // Handle HTMLElement directly
    if (target instanceof HTMLElement) {
      return [target];
    }

    // Handle HTMLElement array
    if (Array.isArray(target)) {
      return target.filter((el): el is HTMLElement => el instanceof HTMLElement);
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

  private async toggleElement(
    element: HTMLElement, 
    context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement>> {
    try {
      const isVisible = this.isElementVisible(element);
      
      // Execute appropriate command based on current visibility
      const commandResult = isVisible 
        ? await this.hideCommand.execute(context, element)
        : await this.showCommand.execute(context, element);
      
      if (!commandResult.success) {
        return {
          success: false,
          error: {
            name: 'ToggleElementError',
            message: `Failed to ${isVisible ? 'hide' : 'show'} element: ${commandResult.error?.message}`,
            code: 'ELEMENT_TOGGLE_FAILED',
            suggestions: ['Check if element is still in DOM', 'Verify element is not null']
          },
          type: 'error'
        };
      }

      // Dispatch enhanced toggle event with rich metadata
      dispatchCustomEvent(element, 'hyperscript:toggle', {
        element,
        context,
        command: this.name,
        action: isVisible ? 'hide' : 'show',
        visible: !isVisible,
        timestamp: Date.now(),
        metadata: this.metadata,
        result: 'success'
      });

      return {
        success: true,
        value: element,
        type: 'element'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ToggleElementError',
          message: error instanceof Error ? error.message : 'Failed to toggle element',
          code: 'ELEMENT_TOGGLE_FAILED',
          suggestions: ['Check if element is still in DOM', 'Verify element is not null']
        },
        type: 'error'
      };
    }
  }

  private isElementVisible(element: HTMLElement): boolean {
    // Check for class-based hiding first
    if (this.options.useClass && this.options.className) {
      if (element.classList.contains(this.options.className)) {
        return false;
      }
    }

    // Check for display-based hiding
    if (element.style.display === 'none') {
      return false;
    }

    // Check computed styles for completely hidden elements
    if (typeof window !== 'undefined') {
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
        return false;
      }
    }

    return true;
  }

  validate(args: unknown[]): ValidationResult {
    try {
      // Schema validation
      const parsed = ToggleCommandInputSchema.safeParse(args);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch' as const,
            message: `Invalid argument: ${err.message}`,
            suggestion: this.getValidationSuggestion(err.code, err.path)
          })),
          suggestions: ['Use HTMLElement, CSS selector string, or omit for implicit target']
        };
      }

      // Additional semantic validation
      const [target] = parsed.data;
      
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
      'invalid_type': 'Use HTMLElement, string (CSS selector), or omit argument',
      'invalid_union': 'Target must be an element, CSS selector, or null',
      'too_big': 'Too many arguments - toggle command takes 0-1 arguments'
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