/**
 * CopyCommand - Decorated Implementation
 *
 * Copies text or element content to the system clipboard.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   copy <text>
 *   copy <element>
 *   copy <text> to clipboard
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { command, meta, createFactory } from '../decorators';

/**
 * Typed input for CopyCommand
 */
export interface CopyCommandInput {
  source: string | HTMLElement;
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
 * CopyCommand - Copy to clipboard
 *
 * Before: 312 lines
 * After: ~140 lines (55% reduction)
 */
@meta({
  description: 'Copy text or element content to the clipboard',
  syntax: ['copy <source>', 'copy <source> to clipboard'],
  examples: ['copy "Hello World"', 'copy #code-snippet', 'copy my textContent'],
  sideEffects: ['clipboard-write', 'custom-events'],
})
@command({ name: 'copy', category: 'utility' })
export class CopyCommand {
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<CopyCommandInput> {
    if (raw.args.length < 1) {
      throw new Error('copy command requires a source (text or element)');
    }

    const source = await evaluator.evaluate(raw.args[0], context);
    let format: 'text' | 'html' = 'text';

    if (raw.modifiers?.format) {
      const formatValue = await evaluator.evaluate(raw.modifiers.format, context);
      if (formatValue === 'html' || formatValue === 'text') format = formatValue;
    }

    return { source, format };
  }

  async execute(
    input: CopyCommandInput,
    context: TypedExecutionContext
  ): Promise<CopyCommandOutput> {
    const { source, format = 'text' } = input;
    const textToCopy = this.extractText(source, format, context);

    // Try Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        this.dispatchCopyEvent(context, 'copy:success', { text: textToCopy, method: 'clipboard-api' });
        return { success: true, text: textToCopy, format, method: 'clipboard-api' };
      } catch { /* fallback */ }
    }

    // Fallback to execCommand
    try {
      if (this.copyUsingExecCommand(textToCopy)) {
        this.dispatchCopyEvent(context, 'copy:success', { text: textToCopy, method: 'execCommand' });
        return { success: true, text: textToCopy, format, method: 'execCommand' };
      }
    } catch { /* fallback */ }

    this.dispatchCopyEvent(context, 'copy:error', { text: textToCopy, error: 'All copy methods failed' });
    return { success: false, text: textToCopy, format, method: 'fallback' };
  }

  private extractText(source: string | HTMLElement, format: 'text' | 'html', context: TypedExecutionContext): string {
    if (typeof source === 'string') return source;
    if (isHTMLElement(source)) {
      return format === 'html' ? source.outerHTML : (source.textContent || '');
    }
    if (source === context.me && isHTMLElement(context.me)) {
      const el = context.me as HTMLElement;
      return format === 'html' ? el.outerHTML : (el.textContent || '');
    }
    return String(source);
  }

  private copyUsingExecCommand(text: string): boolean {
    if (typeof document === 'undefined') return false;

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;top:0;left:-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);

    try {
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      textarea.parentNode?.removeChild(textarea);
      return false;
    }
  }

  private dispatchCopyEvent(context: TypedExecutionContext, eventName: string, detail: Record<string, any>): void {
    if (isHTMLElement(context.me)) {
      const event = new CustomEvent(eventName, { detail, bubbles: true, cancelable: false });
      (context.me as HTMLElement).dispatchEvent(event);
    }
  }
}

export const createCopyCommand = createFactory(CopyCommand);
export default CopyCommand;
