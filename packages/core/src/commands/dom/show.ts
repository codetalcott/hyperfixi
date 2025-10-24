/**
 * Enhanced Show Command - Deep TypeScript Integration
 * Shows elements by restoring display or removing CSS classes
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
import { dispatchCustomEvent } from '../../core/events';
import { asHTMLElement } from '../../utils/dom-utils';

export interface ShowCommandOptions {
  useClass?: boolean;
  className?: string;
  defaultDisplay?: string;
}

/**
 * Input validation schema for LLM understanding
 */
const ShowCommandInputSchema = v.tuple([
  v.union([
    v.custom((value: unknown) => value instanceof HTMLElement),
    v.array(v.custom((value: unknown) => value instanceof HTMLElement)),
    v.string(), // CSS selector
    v.null(),   // Use implicit target (me)
    v.undefined()
  ]).optional()
]);

type ShowCommandInput = any; // Inferred from RuntimeValidator

/**
 * Enhanced Show Command with full type safety for LLM agents
 */
export class ShowCommand implements TypedCommandImplementation<
  ShowCommandInput,
  HTMLElement[],  // Returns list of shown elements
  TypedExecutionContext
> {
  public readonly name = 'show' as const;
  public readonly syntax = 'show [<target-expression>]';
  public readonly description = 'Shows one or more elements by restoring display or removing CSS classes';
  public readonly inputSchema = ShowCommandInputSchema;
  public readonly outputType = 'element-list' as const;

  public readonly metadata: CommandMetadata = {
    category: 'DOM',
    complexity: 'simple',
    sideEffects: ['dom-mutation'],
    examples: [
      {
        code: 'show me',
        description: 'Show the current element',
        expectedOutput: []
      },
      {
        code: 'show <.hidden/>',
        description: 'Show all elements with hidden class',
        expectedOutput: []
      }
    ],
    relatedCommands: ['hide', 'toggle']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Shows HTML elements by restoring their display property or removing CSS classes',
    parameters: [
      {
        name: 'target',
        type: 'element',
        description: 'Element(s) to show. If omitted, shows the current element (me)',
        optional: true,
        examples: ['me', '<#modal/>', '<.hidden/>']
      }
    ],
    returns: {
      type: 'element-list',
      description: 'Array of elements that were shown',
      examples: [[]]
    },
    examples: [
      {
        title: 'Show current element',
        code: 'on click show me',
        explanation: 'When clicked, the button shows itself',
        output: []
      },
      {
        title: 'Show hidden modal',
        code: 'on click show <#modal/>',
        explanation: 'Click to reveal a previously hidden modal',
        output: []
      }
    ],
    seeAlso: ['hide', 'toggle', 'remove-class'],
    tags: ['dom', 'visibility', 'css']
  };
  
  private options: ShowCommandOptions;

  constructor(options: ShowCommandOptions = {}) {
    this.options = {
      useClass: false,
      className: 'hyperscript-hidden',
      defaultDisplay: 'block',
      ...options,
    };
  }

  async execute(
    input: ShowCommandInput[0],
    context: TypedExecutionContext
  ): Promise<EvaluationResult<HTMLElement[]>> {
    try {
      // Type-safe target resolution
      const elements = this.resolveTargets(context, input);
      
      // Process elements with enhanced error handling
      const shownElements: HTMLElement[] = [];
      
      for (const element of elements) {
        const showResult = this.showElement(element, context);
        if (showResult.success) {
          shownElements.push(element);
        }
      }

      return {
        success: true,
        value: shownElements,
        type: 'element-list'
      };

    } catch (error) {
      return {
        success: false,
        error: {
                    type: 'runtime-error',
                    message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SHOW_EXECUTION_FAILED',
          suggestions: [ 'Check if element exists', 'Verify element is not null']
        },
        type: 'error'
      };
    }
  }

  private resolveTargets(
    context: TypedExecutionContext,
    target?: ShowCommandInput[0]
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

  private showElement(element: HTMLElement, context: TypedExecutionContext): EvaluationResult<HTMLElement> {
    try {
      if (this.options.useClass) {
        this.showWithClass(element);
      } else {
        this.showWithDisplay(element);
      }

      // Dispatch enhanced show event with rich metadata
      dispatchCustomEvent(element, 'hyperscript:shown', {
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
                    message: error instanceof Error ? error.message : 'Failed to show element',
          code: 'ELEMENT_SHOW_FAILED',
          suggestions: [ 'Check if element is still in DOM', 'Verify element is not null']
        },
        type: 'error'
      };
    }
  }

  private showWithDisplay(element: HTMLElement): void {
    // Restore original display value if available
    const originalDisplay = element.dataset.originalDisplay;
    
    if (originalDisplay !== undefined) {
      // Use original display or default if original was empty
      element.style.display = originalDisplay || this.options.defaultDisplay!;
      
      // Clean up the data attribute
      delete element.dataset.originalDisplay;
    } else {
      // No original display stored, use default if currently hidden
      if (element.style.display === 'none') {
        element.style.display = this.options.defaultDisplay!;
      }
    }
  }

  private showWithClass(element: HTMLElement): void {
    if (this.options.className) {
      element.classList.remove(this.options.className);
    }
  }

  validate(args: unknown[]): UnifiedValidationResult {
    try {
      // Schema validation
      const parsed = ShowCommandInputSchema.safeParse(args);
      
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
      const [target] = parsed.data;
      
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

  private getValidationSuggestion(errorCode: string): string {
    const suggestions: Record<string, string> = {
      'invalid_type': 'Use HTMLElement, string (CSS selector), or omit argument',
      'invalid_union': 'Target must be an element, CSS selector, or null',
      'too_big': 'Too many arguments - show command takes 0-1 arguments'
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
 * @llm-description Type-safe show command with validation
 */
export function createShowCommand(options?: ShowCommandOptions): ShowCommand {
  return new ShowCommand(options);
}

// Default export for convenience
export default ShowCommand;