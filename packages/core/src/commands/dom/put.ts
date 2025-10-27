
/**
 * Enhanced Put Command - Deep TypeScript Integration
 * Inserts content into DOM elements or properties with comprehensive validation
 * Enhanced for LLM code agents with full type safety
 */

import { v, z } from '../../validation/lightweight-validators';
import type {
  TypedCommandImplementation,
  TypedExecutionContext,
  EvaluationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/enhanced-core.ts';
import type { TypedResult } from '../../types/base-types.ts';
import type { UnifiedValidationResult } from '../../types/unified-types.ts';
import { dispatchCustomEvent } from '../../core/events';
import { asHTMLElement } from '../../utils/dom-utils';

export interface PutCommandOptions {
  sanitizeHTML?: boolean;
  allowScripts?: boolean;
}

/**
 * Input validation schema for LLM understanding
 */
const PutCommandInputSchema = v.tuple([
  v.union([
    v.string(),
    v.number(),
    v.boolean(),
    v.custom((value: unknown) => value instanceof HTMLElement),
    v.array(v.unknown()),
    z.record(v.string(), v.unknown()),
    v.null(),
    v.undefined()
  ]).describe('Content to insert'),
  z.enum(['into', 'before', 'after', 'at start of', 'at end of']).describe('Insertion position'),
  v.union([
    v.custom((value: unknown) => value instanceof HTMLElement),
    v.string(), // CSS selector or property access
    v.null(),   // Use implicit target (me)
    v.undefined()
  ]).describe('Target element or property')
]);

type PutCommandInput = any; // Inferred from RuntimeValidator

/**
 * Enhanced Put Command with full type safety for LLM agents
 */
export class PutCommand implements TypedCommandImplementation<
  PutCommandInput,
  HTMLElement,  // Returns the target element
  TypedExecutionContext
> {
  public readonly name = 'put' as const;
  public readonly syntax = 'put <content> (into | before | after | at start of | at end of) <target>';
  public readonly description = 'Inserts content into DOM elements or properties with validation';
  public readonly inputSchema = PutCommandInputSchema;
  public readonly outputType = 'element' as const;

  public readonly metadata: CommandMetadata = {
    category: 'DOM',
    complexity: 'medium',
    sideEffects: ['dom-mutation'],
    examples: [
      {
        code: 'put "Hello World" into me',
        description: 'Insert text content into current element',
        expectedOutput: 'HTMLElement'
      },
      {
        code: 'put <div>Content</div> before <#target/>',
        description: 'Insert HTML before target element',
        expectedOutput: 'HTMLElement'
      }
    ],
    relatedCommands: ['take', 'add', 'remove']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Inserts content into DOM elements with precise positioning control',
    parameters: [
      {
        name: 'content',
        type: 'string',
        description: 'Content to insert (text, HTML, or values)',
        optional: false,
        examples: ['"Hello"', '<div>HTML</div>', 'variable']
      },
      {
        name: 'position',
        type: 'string',
        description: 'Where to insert the content',
        optional: false,
        examples: ['into', 'before', 'after', 'at start of', 'at end of']
      },
      {
        name: 'target',
        type: 'element',
        description: 'Target element or property. If omitted, uses current element (me)',
        optional: true,
        examples: ['me', '<#content/>', 'me.innerHTML']
      }
    ],
    returns: {
      type: 'element',
      description: 'The target element that was modified',
      examples: ['HTMLElement']
    },
    examples: [
      {
        title: 'Insert text content',
        code: 'put "Hello World" into me',
        explanation: 'Inserts text into the current element',
        output: 'HTMLElement'
      },
      {
        title: 'Insert HTML before element',
        code: 'put <span>New</span> before <.target/>',
        explanation: 'Inserts HTML content before elements with target class',
        output: 'HTMLElement'
      },
      {
        title: 'Append to element',
        code: 'put "More content" at end of <#container/>',
        explanation: 'Appends content to the end of container element',
        output: 'HTMLElement'
      }
    ],
    seeAlso: ['take', 'add-class', 'remove-class', 'append'],
    tags: ['dom', 'content', 'insertion', 'html']
  };
  
  private options: PutCommandOptions;

  constructor(options: PutCommandOptions = {}) {
    this.options = {
      sanitizeHTML: false,
      allowScripts: false,
      ...options,
    };
  }

  async execute(
    context: TypedExecutionContext,
    ...args: PutCommandInput
  ): Promise<EvaluationResult<HTMLElement>> {
    const [content, position, target] = args;
    try {
      // Runtime validation for type safety
      const validationResult = this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
                        name: 'ValidationError',
          type: 'validation-error',
                        message: validationResult.errors[0]?.message || 'Invalid input',
            code: 'PUT_VALIDATION_FAILED',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      // Resolve target element and optional property
      const targetResult = this.resolveTarget(target, context);
      if (!targetResult.success) {
        return {
          success: false,
          error: targetResult.error ?? {
            type: 'runtime-error',
            message: 'Unknown error occurred',
            suggestions: []
          },
          type: 'error'
        };
      }

      const { element: targetElement, property } = targetResult.value!
      
      // Convert content to string, handling null/undefined
      const contentStr = content == null ? '' : String(content);
      
      // Debug logging
      console.log('🔧 PUT command execution:', {
        content: contentStr,
        position,
        targetElement,
        property
      });

      // Execute the put operation
      const putResult = this.performPutOperation(
        contentStr, 
        position, 
        targetElement, 
        property,
        context
      );

      console.log('🔧 PUT command result:', putResult);

      if (!putResult.success) {
        return putResult;
      }

      // Dispatch enhanced put event with rich metadata
      dispatchCustomEvent(targetElement, 'hyperscript:put', {
        element: targetElement,
        context,
        command: this.name,
        content: contentStr,
        position,
        property,
        timestamp: Date.now(),
        metadata: this.metadata,
        result: 'success'
      });

      return {
        success: true,
        value: targetElement,
        type: 'element'
      };

    } catch (error) {
      return {
        success: false,
        error: {
                    name: 'ValidationError',
          type: 'runtime-error',
                    message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PUT_EXECUTION_FAILED',
          suggestions: ['Check if target element exists', 'Verify content is valid', 'Ensure position is supported']
        },
        type: 'error'
      };
    }
  }

  validate(args: unknown[]): UnifiedValidationResult {
    try {
      // Schema validation - the schema expects a tuple, so we need to validate the args as a tuple
      const parsed = this.inputSchema.safeParse(args.slice(0, 3)); // Take first 3 args for tuple validation
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch' as const,
            message: `Invalid argument: ${err.message}`,
            suggestions: [this.getValidationSuggestion(err.code ?? "unknown")]
          })) ?? [],
          suggestions: ['Provide content, position, and target', 'Use valid position keywords', 'Ensure target is element or selector']
        };
      }

      // Additional semantic validation
      const [_content, position, target] = parsed.data as [unknown, unknown, unknown];
      
      // Validate position is supported
      const validPositions = ['into', 'before', 'after', 'at start of', 'at end of'];
      if (!validPositions.includes(position as string)) {
        return {
          isValid: false,
          errors: [{
            type: 'syntax-error' as const,
            message: `Invalid position: "${position}". Must be one of: ${validPositions.join(', ')}`,
            suggestions: ['Use supported position keywords']
          }],
          suggestions: ['Use: into, before, after, at start of, at end of']
        };
      }

      // Validate target selector if provided as string
      if (typeof target === 'string' && !this.isValidCSSSelector(target)) {
        return {
          isValid: false,
          errors: [{
            type: 'syntax-error' as const,
            message: `Invalid CSS selector: "${target}"`,
            suggestions: ['Use valid CSS selector syntax like "#id", ".class", or "element"']
          }],
          suggestions: ['Check CSS selector syntax', 'Test with document.querySelector()']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [] 
      };

    } catch (_error) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error' as const,
          message: 'Validation failed with exception',
          suggestions: ['Check input types and values']
        }],
        suggestions: ['Ensure arguments match expected types']
      };
    }
  }

  private resolveTarget(
    target: PutCommandInput[2], 
    context: TypedExecutionContext
  ): EvaluationResult<{ element: HTMLElement; property?: string }> {
    try {
      // Default to context.me if no target specified
      if (target === undefined || target === null) {
        if (!context.me) {
          return {
            success: false,
            error: {
                            type: 'missing-argument',
                            message: 'No target element available - context.me is undefined',
              code: 'NO_TARGET_ELEMENT',
              suggestions: ['Ensure command is called within element context', 'Provide explicit target element']
            },
            type: 'error'
          };
        }
        const htmlElement = asHTMLElement(context.me);
        if (!htmlElement) {
          return {
            success: false,
            error: {
                            type: 'invalid-argument',
                            message: 'context.me is not an HTMLElement',
              code: 'INVALID_CONTEXT_ELEMENT',
              suggestions: ['Ensure context.me is an HTMLElement']
            },
            type: 'error'
          };
        }
        return {
          success: true,
          value: { element: htmlElement },
          type: 'object'
        };
      }

      // Handle HTMLElement directly
      if (target instanceof HTMLElement) {
        return {
          success: true,
          value: { element: target },
          type: 'object'
        };
      }

      // Handle arrays of HTMLElements (take the first one)
      if (Array.isArray(target) && target.length > 0 && target[0] instanceof HTMLElement) {
        return {
          success: true,
          value: { element: target[0] },
          type: 'object'
        };
      }
      
      // Handle string selector with optional property access
      if (typeof target === 'string') {
        // Check for property access syntax like "#element.innerHTML"
        const propertyMatch = target.match(/^(.+)\.(\w+)$/);
        
        if (propertyMatch) {
          const [, selector, property] = propertyMatch;
          const element = this.querySelector(selector, context);
          
          if (!element) {
            return {
              success: false,
              error: {
                                name: 'ValidationError',
          type: 'runtime-error',
                                message: `Target element not found: ${selector}`,
                code: 'TARGET_NOT_FOUND',
                suggestions: ['Check if element exists in DOM', 'Verify selector syntax']
              },
              type: 'error'
            };
          }
          
          return {
            success: true,
            value: { element, property },
            type: 'object'
          };
        } else {
          // Regular CSS selector without property access
          const element = this.querySelector(target, context);
          
          if (!element) {
            return {
              success: false,
              error: {
                                name: 'ValidationError',
          type: 'runtime-error',
                                message: `Target element not found: ${target}`,
                code: 'TARGET_NOT_FOUND',
                suggestions: ['Check if element exists in DOM', 'Verify selector syntax']
              },
              type: 'error'
            };
          }
          
          return {
            success: true,
            value: { element },
            type: 'object'
          };
        }
      }
      
      return {
        success: false,
        error: {
          type: 'invalid-argument',
          message: `Invalid target type: ${typeof target}`,
          code: 'INVALID_TARGET_TYPE',
          suggestions: ['Use HTMLElement, CSS selector string, or omit for implicit target']
        },
        type: 'error'
      };

    } catch (error) {
      return {
        success: false,
        error: {
                    name: 'ValidationError',
          type: 'runtime-error',
                    message: error instanceof Error ? error.message : 'Target resolution failed',
          code: 'TARGET_RESOLUTION_FAILED',
          suggestions: ['Check target syntax and availability']
        },
        type: 'error'
      };
    }
  }

  private querySelector(selector: string, context: TypedExecutionContext): HTMLElement | null {
    // Handle 'me' selector as special case
    if (selector === 'me') {
      return (context.me as HTMLElement) || null;
    }
    
    // Use document.querySelector if available
    if (typeof document !== 'undefined' && document.querySelector) {
      const element = document.querySelector(selector);
      return element as HTMLElement | null;
    }
    
    // Test environment fallback
    return null;
  }

  private performPutOperation(
    content: string,
    position: PutCommandInput[1],
    targetElement: HTMLElement,
    property: string | undefined,
    _context: TypedExecutionContext
  ): EvaluationResult<HTMLElement> {
    try {
      // If a specific property is targeted, handle it directly
      if (property) {
        switch (position) {
          case 'into':
            (targetElement as unknown as Record<string, unknown>)[property] = content;
            break;
          default:
            return {
              success: false,
              error: {
                                type: 'invalid-argument',
                                message: `Property access (${property}) only supports 'into' position`,
                code: 'INVALID_PROPERTY_POSITION',
                suggestions: ['Use "into" position for property access', 'Remove property access for other positions']
              },
              type: 'error'
            };
        }
      } else {
        // Execute based on position for the element itself
        switch (position) {
          case 'into':
            this.putInto(targetElement, content);
            break;
          case 'before':
            this.putBefore(targetElement, content);
            break;
          case 'after':
            this.putAfter(targetElement, content);
            break;
          case 'at start of':
            this.putAtStartOf(targetElement, content);
            break;
          case 'at end of':
            this.putAtEndOf(targetElement, content);
            break;
          default:
            return {
              success: false,
              error: {
                                type: 'invalid-argument',
                                message: `Invalid position: ${position}`,
                code: 'INVALID_POSITION',
                suggestions: ['Use: into, before, after, at start of, at end of']
              },
              type: 'error'
            };
        }
      }

      return {
        success: true,
        value: targetElement,
        type: 'element'
      };

    } catch (error) {
      return {
        success: false,
        error: {
                    name: 'ValidationError',
          type: 'runtime-error',
                    message: error instanceof Error ? error.message : 'Put operation failed',
          code: 'OPERATION_FAILED',
          suggestions: ['Check if element is still in DOM', 'Verify content is valid']
        },
        type: 'error'
      };
    }
  }

  private putInto(element: HTMLElement, content: string): void {
    // Check if content contains HTML by looking for < and > characters
    if (this.containsHTML(content)) {
      if (this.options.sanitizeHTML) {
        element.innerHTML = this.sanitizeHTML(content);
      } else {
        element.innerHTML = content;
      }
    } else {
      element.textContent = content;
    }
  }

  private putBefore(element: HTMLElement, content: string): void {
    if (!element.parentNode) {
      throw new Error('Cannot insert before element - no parent node');
    }
    
    if (this.containsHTML(content)) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.options.sanitizeHTML ? this.sanitizeHTML(content) : content;
      while (tempDiv.firstChild) {
        element.parentNode.insertBefore(tempDiv.firstChild, element);
      }
    } else {
      const textNode = document.createTextNode(content);
      element.parentNode.insertBefore(textNode, element);
    }
  }

  private putAfter(element: HTMLElement, content: string): void {
    if (!element.parentNode) {
      throw new Error('Cannot insert after element - no parent node');
    }
    
    if (this.containsHTML(content)) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.options.sanitizeHTML ? this.sanitizeHTML(content) : content;
      const nextSibling = element.nextSibling;
      while (tempDiv.firstChild) {
        element.parentNode.insertBefore(tempDiv.firstChild, nextSibling);
      }
    } else {
      const textNode = document.createTextNode(content);
      element.parentNode.insertBefore(textNode, element.nextSibling);
    }
  }

  private putAtStartOf(element: HTMLElement, content: string): void {
    const sanitizedContent = this.options.sanitizeHTML && this.containsHTML(content) 
      ? this.sanitizeHTML(content) 
      : content;
    element.innerHTML = sanitizedContent + element.innerHTML;
  }

  private putAtEndOf(element: HTMLElement, content: string): void {
    const sanitizedContent = this.options.sanitizeHTML && this.containsHTML(content) 
      ? this.sanitizeHTML(content) 
      : content;
    element.innerHTML = element.innerHTML + sanitizedContent;
  }

  private containsHTML(content: string): boolean {
    return content.includes('<') && content.includes('>');
  }

  private sanitizeHTML(content: string): string {
    // Basic HTML sanitization - remove script tags and event handlers
    if (!this.options.allowScripts) {
      content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      content = content.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    }
    return content;
  }

  private getValidationSuggestion(errorCode: string): string {
    const suggestions: Record<string, string> = {
      'invalid_type': 'Provide content, position keyword, and target element',
      'invalid_enum_value': 'Use valid position: into, before, after, at start of, at end of',
      'too_small': 'Put command requires content, position, and target arguments',
      'too_big': 'Put command takes 2-3 arguments maximum'
    };
    
    return suggestions[errorCode] || 'Check argument types and syntax';
  }

  private isValidCSSSelector(selector: string): boolean {
    try {
      if (typeof document !== 'undefined' && document.querySelector) {
        document.querySelector(selector);
        return true;
      }
      return true; // Assume valid in test environment
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
 * @llm-bundle-size 4KB
 * @llm-description Type-safe put command with DOM manipulation validation
 */
export function createPutCommand(options?: PutCommandOptions): PutCommand {
  return new PutCommand(options);
}

// Default export for convenience
export default PutCommand;