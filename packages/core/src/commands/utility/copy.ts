/**
 * Copy Command Implementation
 * Copies text or element content to the system clipboard
 *
 * Syntax:
 *   copy <text>
 *   copy <element>
 *   copy <selector> to clipboard
 *
 * Examples:
 *   copy "Hello World"
 *   copy #code-snippet
 *   copy my textContent
 *
 * Uses Clipboard API with execCommand fallback for older browsers
 */

import { v } from '../../validation/lightweight-validators';
import type { CommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import type { UnifiedValidationResult } from '../../types/unified-types';

/**
 * Zod schema for COPY command input validation
 * Note: HTMLElement validation is lenient to support different test/runtime environments
 * Note: format field is optional; default value is handled in execute() method
 */
export const CopyCommandInputSchema = v.object({
  source: v.any().describe('Text string or HTML element to copy'),
  format: v.enum(['text', 'html']).describe('Format to copy (text or html - defaults to text)').optional(),
}).describe('COPY command input parameters');

// Input type definition
export interface CopyCommandInput {
  source: string | HTMLElement;
  format?: 'text' | 'html';
}

type CopyCommandInputType = any; // Inferred from RuntimeValidator

// Output type definition
export interface CopyCommandOutput {
  success: boolean;
  text: string;
  format: 'text' | 'html';
  method: 'clipboard-api' | 'execCommand' | 'fallback';
}

/**
 * Copy Command with full type safety and validation
 * Supports modern Clipboard API with graceful fallbacks
 */
export class CopyCommand implements CommandImplementation<
  CopyCommandInputType,
  CopyCommandOutput,
  TypedExecutionContext
> {
  name = 'copy' as const;
  inputSchema = CopyCommandInputSchema;

  metadata = {
    name: 'copy',
    description: 'Copy text or element content to the clipboard',
    examples: [
      'copy "Hello World"',
      'copy #code-snippet',
      'copy my textContent',
      'copy <div/> to clipboard'
    ],
    syntax: 'copy <source> [to clipboard]',
    category: 'utility',
    version: '1.0.0'
  };

  validation = {
    validate: (input: unknown) => this.validate(input)
  };

  async execute(
    input: CopyCommandInputType,
    context: TypedExecutionContext
  ): Promise<CopyCommandOutput> {
    // Parse input - handle different formats
    let source: string | HTMLElement;
    let format: 'text' | 'html' = 'text';

    if (typeof input === 'string') {
      source = input;
    } else if (input instanceof HTMLElement) {
      source = input;
    } else if (input && typeof input === 'object') {
      source = input.source;
      format = input.format || 'text';
    } else {
      throw new Error('Invalid copy input');
    }

    // Extract text from source
    const textToCopy = this.extractText(source, format, context);

    // Try modern Clipboard API first
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(textToCopy);

        // Dispatch success event
        this.dispatchCopyEvent(context, 'copy:success', {
          text: textToCopy,
          method: 'clipboard-api'
        });

        return {
          success: true,
          text: textToCopy,
          format,
          method: 'clipboard-api'
        };
      } catch (error) {
        // Fall through to execCommand fallback
        console.warn('Clipboard API failed, trying execCommand:', error);
      }
    }

    // Fallback to execCommand for older browsers
    try {
      const success = this.copyUsingExecCommand(textToCopy);

      if (success) {
        this.dispatchCopyEvent(context, 'copy:success', {
          text: textToCopy,
          method: 'execCommand'
        });

        return {
          success: true,
          text: textToCopy,
          format,
          method: 'execCommand'
        };
      }
    } catch (error) {
      console.warn('execCommand failed:', error);
    }

    // Final fallback - dispatch error event
    this.dispatchCopyEvent(context, 'copy:error', {
      text: textToCopy,
      error: 'All copy methods failed'
    });

    throw new Error('Failed to copy to clipboard. Please check browser permissions or try manual copy.');
  }

  /**
   * Extract text from source (string or element)
   */
  private extractText(
    source: string | HTMLElement,
    format: 'text' | 'html',
    context: TypedExecutionContext
  ): string {
    // If source is already a string, return it
    if (typeof source === 'string') {
      return source;
    }

    // If source is an element, extract content based on format
    if (source instanceof HTMLElement) {
      if (format === 'html') {
        return source.innerHTML;
      }
      // For text format, prefer textContent
      return source.textContent || '';
    }

    throw new Error('Invalid source for copy command');
  }

  /**
   * Fallback copy method using deprecated execCommand
   * Still useful for older browsers and certain contexts
   */
  private copyUsingExecCommand(text: string): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    // Create temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // Prevent scrolling
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';

    document.body.appendChild(textarea);

    try {
      textarea.select();
      textarea.setSelectionRange(0, text.length); // For mobile browsers

      const success = document.execCommand('copy');
      return success;
    } catch (error) {
      console.error('execCommand copy failed:', error);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }

  /**
   * Dispatch custom events for copy operations
   */
  private dispatchCopyEvent(
    context: TypedExecutionContext,
    eventName: string,
    detail: Record<string, any>
  ): void {
    if (context.me instanceof HTMLElement) {
      const event = new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: false
      });
      context.me.dispatchEvent(event);
    }
  }

  validate(input: unknown): UnifiedValidationResult<CopyCommandInputType> {
    try {
      // Handle both direct input (string/element) and object format
      let normalizedInput: any;

      if (typeof input === 'string' || input instanceof HTMLElement) {
        // Direct input format: copy "text" or copy element
        normalizedInput = { source: input };
      } else {
        // Object format: copy { source: "text", format: "html" }
        normalizedInput = input;
      }

      const validInput = this.inputSchema.parse(normalizedInput);
      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: validInput
      };
    } catch (error: any) {
      // Construct helpful error message and suggestions
      const suggestions = [
        'copy "text to copy"',
        'copy #element-id',
        'copy my textContent',
        'copy <selector/> to clipboard'
      ];

      const errorMessage = error?.issues?.[0]?.message ||
                          error?.message ||
                          'Invalid COPY command input';

      return {
        isValid: false,
        errors: [{
          type: 'validation-error',
          code: 'VALIDATION_ERROR',
          message: `COPY command validation failed: ${errorMessage}`,
          path: '',
          suggestions
        }],
        suggestions
      };
    }
  }
}

/**
 * Factory function to create a new CopyCommand instance
 */
export function createCopyCommand(): CopyCommand {
  return new CopyCommand();
}

// Export command instance for direct use
export const enhancedCopyCommand = createCopyCommand();
