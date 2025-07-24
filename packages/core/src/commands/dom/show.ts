/**
 * Enhanced Show Command - Deep TypeScript Integration
 * Shows elements by restoring display or removing CSS classes
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

export interface ShowCommandOptions {
  useClass?: boolean;
  className?: string;
  defaultDisplay?: string;
}

/**
 * Input validation schema for LLM understanding
 */
const ShowCommandInputSchema = z.tuple([
  z.union([
    z.instanceof(HTMLElement),
    z.array(z.instanceof(HTMLElement)), 
    z.string(), // CSS selector
    z.null(),   // Use implicit target (me)
    z.undefined()
  ]).optional()
]);

type ShowCommandInput = z.infer<typeof ShowCommandInputSchema>;

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
    category: 'dom-manipulation',
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
    context: TypedExecutionContext,
    target?: ShowCommandInput[0]
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
            code: 'SHOW_VALIDATION_FAILED',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      // Type-safe target resolution
      const elements = this.resolveTargets(context, target);
      
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
          name: 'ShowCommandError',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SHOW_EXECUTION_FAILED',
          suggestions: ['Check if element exists', 'Verify element is not null']
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
          name: 'ShowElementError',
          message: error instanceof Error ? error.message : 'Failed to show element',
          code: 'ELEMENT_SHOW_FAILED',
          suggestions: ['Check if element is still in DOM', 'Verify element is not null']
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

  validate(args: unknown[]): ValidationResult {
    try {
      // Schema validation
      const parsed = ShowCommandInputSchema.safeParse(args);
      
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