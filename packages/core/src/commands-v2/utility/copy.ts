/**
 * CopyCommand - Standalone V2 Implementation
 *
 * Copies text or element content to the system clipboard
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Modern Clipboard API support
 * - execCommand fallback for older browsers
 * - Text and HTML format support
 * - Element content extraction
 * - Custom events for copy operations
 *
 * Syntax:
 *   copy <text>
 *   copy <element>
 *   copy <text> to clipboard
 *
 * @example
 *   copy "Hello World"
 *   copy #code-snippet
 *   copy my textContent
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for CopyCommand
 */
export interface CopyCommandInput {
  /** Text string or HTML element to copy */
  source: string | HTMLElement;
  /** Format to copy (text or html) */
  format?: 'text' | 'html';
}

/**
 * Output from copy command execution
 */
export interface CopyCommandOutput {
  success: boolean;
  text: string;
  format: 'text' | 'html';
  method: 'clipboard-api' | 'execCommand' | 'fallback';
}

/**
 * CopyCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 285 lines
 * V2 Target: ~280 lines (inline utilities, standalone)
 */
export class CopyCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'copy';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Copy text or element content to the clipboard',
    syntax: ['copy <source>', 'copy <source> to clipboard'],
    examples: [
      'copy "Hello World"',
      'copy #code-snippet',
      'copy my textContent',
      'copy <div/> to clipboard',
    ],
    category: 'utility',
    sideEffects: ['clipboard-write', 'custom-events'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<CopyCommandInput> {
    if (raw.args.length < 1) {
      throw new Error('copy command requires a source (text or element)');
    }

    // First arg is the source
    const source = await evaluator.evaluate(raw.args[0], context);

    // Optional format from modifier
    let format: 'text' | 'html' = 'text';
    if (raw.modifiers?.format) {
      const formatValue = await evaluator.evaluate(raw.modifiers.format, context);
      if (formatValue === 'html' || formatValue === 'text') {
        format = formatValue;
      }
    }

    return {
      source,
      format,
    };
  }

  /**
   * Execute the copy command
   *
   * Copies text to clipboard using best available method.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Copy operation result
   */
  async execute(
    input: CopyCommandInput,
    context: TypedExecutionContext
  ): Promise<CopyCommandOutput> {
    const { source, format = 'text' } = input;

    // Extract text from source
    const textToCopy = this.extractText(source, format, context);

    // Try modern Clipboard API first
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(textToCopy);

        // Dispatch success event
        this.dispatchCopyEvent(context, 'copy:success', {
          text: textToCopy,
          method: 'clipboard-api',
        });

        return {
          success: true,
          text: textToCopy,
          format,
          method: 'clipboard-api',
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
          method: 'execCommand',
        });

        return {
          success: true,
          text: textToCopy,
          format,
          method: 'execCommand',
        };
      }
    } catch (error) {
      console.warn('execCommand failed:', error);
    }

    // Final fallback - dispatch error event
    this.dispatchCopyEvent(context, 'copy:error', {
      text: textToCopy,
      error: 'All copy methods failed',
    });

    return {
      success: false,
      text: textToCopy,
      format,
      method: 'fallback',
    };
  }

  // ========== Private Utility Methods ==========

  /**
   * Extract text from source
   *
   * @param source - Text string or HTML element
   * @param format - Format to extract (text or html)
   * @param context - Execution context
   * @returns Extracted text
   */
  private extractText(
    source: string | HTMLElement,
    format: 'text' | 'html',
    context: TypedExecutionContext
  ): string {
    // Handle string source
    if (typeof source === 'string') {
      return source;
    }

    // Handle element source
    if (source instanceof HTMLElement) {
      if (format === 'html') {
        return source.outerHTML;
      } else {
        return source.textContent || '';
      }
    }

    // Handle context references (me, it, you)
    if (source === context.me && context.me instanceof HTMLElement) {
      return format === 'html' ? context.me.outerHTML : (context.me.textContent || '');
    }

    // Fallback: convert to string
    return String(source);
  }

  /**
   * Copy text using execCommand (fallback for older browsers)
   *
   * @param text - Text to copy
   * @returns Success status
   */
  private copyUsingExecCommand(text: string): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    // Create temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.setAttribute('readonly', '');

    document.body.appendChild(textarea);

    try {
      // Select text
      textarea.select();
      textarea.setSelectionRange(0, text.length);

      // Execute copy command
      const success = document.execCommand('copy');

      // Clean up
      document.body.removeChild(textarea);

      return success;
    } catch (error) {
      // Clean up on error
      if (textarea.parentNode) {
        document.body.removeChild(textarea);
      }
      return false;
    }
  }

  /**
   * Dispatch custom event for copy operations
   *
   * @param context - Execution context
   * @param eventName - Event name
   * @param detail - Event detail object
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
        cancelable: false,
      });
      context.me.dispatchEvent(event);
    }
  }
}

/**
 * Factory function to create CopyCommand instance
 */
export function createCopyCommand(): CopyCommand {
  return new CopyCommand();
}
