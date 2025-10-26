/**
 * Enhanced Hide Command - Deep TypeScript Integration
 * Hides elements by setting display: none or adding CSS classes
 * Enhanced for LLM code agents with full type safety
 */

import { v } from '../../validation/lightweight-validators';
import type {
  TypedCommandImplementation,
  TypedExecutionContext,
  EvaluationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/enhanced-core.ts';
import type { UnifiedValidationResult } from '../../types/unified-types.ts';
import { asHTMLElement } from '../../utils/dom-utils';
import { dispatchCustomEvent } from '../../core/events';

export interface HideCommandOptions {
  useClass?: boolean;
  className?: string;
}

/**
 * Input validation schema for LLM understanding
 */
const HideCommandInputSchema = v.tuple([
  v.union([
    v.custom((value: unknown) => value instanceof HTMLElement),
    v.array(v.custom((value: unknown) => value instanceof HTMLElement)),
    v.string(), // CSS selector
    v.null(),   // Use implicit target (me)
    v.undefined()
  ]).optional()
]);

type HideCommandInput = any; // Inferred from RuntimeValidator

/**
 * Enhanced Hide Command with full type safety for LLM agents
 */
export class HideCommand implements TypedCommandImplementation<
  HideCommandInput,
  HTMLElement[],  // Returns list of hidden elements
  TypedExecutionContext
> {
  public readonly name = 'hide' as const;
  public readonly syntax = 'hide [<target-expression>]';
  public readonly description = 'Hides one or more elements by setting display: none or adding CSS classes';
  public readonly inputSchema = HideCommandInputSchema;
  public readonly outputType = 'element-list' as const;

  public readonly metadata: CommandMetadata = {
    category: 'DOM',
    complexity: 'simple',
    sideEffects: ['dom-mutation'],
    examples: [
      {
        code: 'hide me',
        description: 'Hide the current element',
        expectedOutput: []
      },
      {
        code: 'hide <.modal/>',
        description: 'Hide all elements with modal class',
        expectedOutput: []
      }
    ],
    relatedCommands: ['show', 'toggle']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Hides HTML elements from view using CSS display property or classes',
    parameters: [
      {
        name: 'target',
        type: 'element',
        description: 'Element(s) to hide. If omitted, hides the current element (me)',
        optional: true,
        examples: ['me', '<#modal/>', '<.button/>']
      }
    ],
    returns: {
      type: 'element-list',
      description: 'Array of elements that were hidden',
      examples: [[]]
    },
    examples: [
      {
        title: 'Hide current element',
        code: 'on click hide me',
        explanation: 'When clicked, the button hides itself',
        output: []
      },
      {
        title: 'Hide modal dialog',
        code: 'on escape hide <#modal/>',
        explanation: 'Press escape to hide modal with id "modal"',
        output: []
      }
    ],
    seeAlso: ['show', 'toggle', 'add-class'],
    tags: ['dom', 'visibility', 'css']
  };
  
  private options: HideCommandOptions;

  constructor(options: HideCommandOptions = {}) {
    this.options = {
      useClass: false,
      className: 'hyperscript-hidden',
      ...options,
    };
  }

  async execute(
    input: HideCommandInput[0],
    context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement[]>> {
    try {
      // Type-safe target resolution
      const elements = this.resolveTargets(context, input);

      // Process elements with enhanced error handling
      const hiddenElements: HTMLElement[] = [];

      for (const element of elements) {
        const hideResult = this.hideElement(element, context);
        if (hideResult.success) {
          hiddenElements.push(element);
        }
      }

      return {
        success: true,
        value: hiddenElements,
        type: 'element-list'
      };

    } catch (error) {
      // Re-throw critical context errors instead of wrapping them
      if (error instanceof Error && error.message.includes('Context element')) {
        throw error;
      }

      return {
        success: false,
        error: {
                    type: 'runtime-error',
                    message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HIDE_EXECUTION_FAILED',
          suggestions: ['Check if element exists', 'Verify element is not null']
        },
        type: 'error'
      };
    }
  }

  private resolveTargets(
    context: TypedExecutionContext,
    target?: HideCommandInput[0]
  ): HTMLElement[] {
    // Default to context.me if no target specified
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

  private hideElement(element: HTMLElement, context: TypedExecutionContext): EvaluationResult<HTMLElement> {
    try {
      if (this.options.useClass) {
        this.hideWithClass(element);
      } else {
        this.hideWithDisplay(element);
      }

      // Dispatch enhanced hide event with rich metadata
      dispatchCustomEvent(element, 'hyperscript:hidden', {
        element,
        context,
        command: this.name,
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
                    type: 'runtime-error',
                    message: error instanceof Error ? error.message : 'Failed to hide element',
          code: 'ELEMENT_HIDE_FAILED',
          suggestions: ['Check if element is still in DOM', 'Verify element is not null']
        },
        type: 'error'
      };
    }
  }

  private hideWithDisplay(element: HTMLElement): void {
    // Preserve original display value if not already stored
    if (!element.dataset.originalDisplay) {
      const currentDisplay = element.style.display;
      element.dataset.originalDisplay = currentDisplay === 'none' ? '' : currentDisplay;
    }

    // Hide the element
    element.style.display = 'none';
  }

  private hideWithClass(element: HTMLElement): void {
    if (this.options.className) {
      element.classList.add(this.options.className);
    }
  }

  validate(args: unknown[]): UnifiedValidationResult {
    try {
      // Schema validation
      const parsed = HideCommandInputSchema.safeParse(args);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch' as const,
            message: `Invalid argument: ${err.message}`,
            suggestions: [this.getValidationSuggestion(err.code ?? "unknown")]
          })) ?? [],
          suggestions: ['Use HTMLElement, CSS selector string, or omit for implicit target']
        };
      }

      // Additional semantic validation
      const [target] = parsed.data as [unknown];
      
      if (typeof target === 'string' && !this.isValidCSSSelector(target)) {
        return {
          isValid: false,
          errors: [{
            type: 'syntax-error',
            message: `Invalid CSS selector: "${target}"`,
            suggestions: ['Use valid CSS selector syntax like "#id", ".class", or "element"']
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
          suggestions: ['Check input types and values']
        }],
        suggestions: ['Ensure arguments match expected types']
      };
    }
  }

  private getValidationSuggestion(errorCode: string): string {
    const suggestions: Record<string, string> = {
      'invalid_type': 'Use HTMLElement, string (CSS selector), or omit argument',
      'invalid_union': 'Target must be an element, CSS selector, or null',
      'too_big': 'Too many arguments - hide command takes 0-1 arguments'
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
 * @llm-bundle-size 2KB
 * @llm-description Type-safe hide command with validation
 */
export function createHideCommand(options?: HideCommandOptions): HideCommand {
  return new HideCommand(options);
}

// Default export for convenience
export default HideCommand;