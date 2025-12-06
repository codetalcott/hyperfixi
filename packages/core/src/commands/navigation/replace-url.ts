/**
 * ReplaceUrlCommand - Replace current URL in browser history (htmx 4 pattern)
 *
 * Simple history management following htmx 4's approach:
 * - No localStorage snapshots
 * - Replaces current history entry (no back navigation to original)
 * - Useful for filter/sort changes that shouldn't create history
 *
 * Syntax:
 *   replace url "/path"              # Replace current URL
 *   replace url location.pathname    # Dynamic URL from expression
 *   replace url "/page" with title "Page Title"  # With title update
 *
 * @example
 *   on click
 *     fetch "/search?q=test" as html
 *     swap #results with it
 *     replace url "/search?q=test"   -- No history entry created
 *
 *   on input from #search-input throttled at 500ms
 *     fetch `/search?q=${my value}` as html
 *     swap #results with it
 *     replace url `/search?q=${my value}`
 */

import { defineCommand, type RawCommandArgs } from '../command-builder';
import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed input for replace-url command
 */
export interface ReplaceUrlCommandInput {
  /** URL to replace in history */
  url: string;
  /** Optional title for document.title update */
  title?: string;
  /** Optional state object to store with history entry */
  state?: Record<string, unknown>;
}

// ============================================================================
// Command Definition
// ============================================================================

/**
 * ReplaceUrlCommand - Built using defineCommand() Builder Pattern
 */
export const replaceUrlCommand = defineCommand('replace')
  .category('navigation')
  .description('Replace current URL in browser history without page reload')
  .syntax([
    'replace url <url>',
    'replace url <url> with title <title>',
  ])
  .examples([
    'replace url "/search?q=test"',
    'replace url location.pathname',
    'replace url "/page" with title "Updated Page"',
  ])
  .sideEffects(['navigation'])
  .relatedCommands(['push', 'go'])

  .parseInput<ReplaceUrlCommandInput>(async (
    raw: RawCommandArgs,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ReplaceUrlCommandInput> => {
    const args = raw.args;

    if (!args || args.length === 0) {
      throw new Error('replace url command requires a URL argument');
    }

    // Evaluate all arguments with keyword handling
    // NOTE: Keywords like 'url', 'with', 'title' are identifiers that should NOT be evaluated
    //       as variables - they should be kept as their literal name
    const KEYWORDS = ['url', 'with', 'title'];
    const evaluatedArgs: unknown[] = [];
    const argStrings: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i] as Record<string, unknown>;
      const argType = arg?.type || 'unknown';
      const argName = arg?.name as string | undefined;

      // If this is an identifier that matches a keyword, use the name as-is
      if (argType === 'identifier' && argName && KEYWORDS.includes(argName.toLowerCase())) {
        evaluatedArgs.push(argName.toLowerCase());
        argStrings.push(argName.toLowerCase());
      } else {
        // Otherwise evaluate the expression
        const evaluated = await evaluator.evaluate(arg, context);
        evaluatedArgs.push(evaluated);
        if (typeof evaluated === 'string') {
          argStrings.push(evaluated.toLowerCase());
        }
      }
    }

    // DEBUG: Show what we got by including in error message if there's an issue
    const debugInfo = `urlKeywordIndex=${argStrings.findIndex(s => s === 'url')}, argCount=${evaluatedArgs.length}, argStrings=${JSON.stringify(argStrings)}`;

    // Find 'url' keyword position
    const urlKeywordIndex = argStrings.findIndex(s => s === 'url');

    // Find 'with' keyword for title
    const withIndex = argStrings.findIndex(s => s === 'with');
    const titleIndex = argStrings.findIndex(s => s === 'title');

    let url: string;
    let title: string | undefined;

    // Extract URL
    if (urlKeywordIndex !== -1 && evaluatedArgs.length > urlKeywordIndex + 1) {
      url = String(evaluatedArgs[urlKeywordIndex + 1]);
    } else if (evaluatedArgs.length >= 1) {
      // First arg is the URL
      url = String(evaluatedArgs[0]);
    } else {
      throw new Error(`replace url command: URL is required. Debug: ${debugInfo}`);
    }

    // Extract title if present
    if (withIndex !== -1 && titleIndex !== -1 && titleIndex > withIndex) {
      if (evaluatedArgs.length > titleIndex + 1) {
        title = String(evaluatedArgs[titleIndex + 1]);
      }
    }

    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error(`replace url command: URL must be a string (got ${typeof url}: ${url}). Debug: ${debugInfo}`);
    }

    // Additional validation: if URL is 'undefined' as a string, that's a bug
    if (url === 'undefined') {
      throw new Error(`replace url command: URL evaluated to string 'undefined'. Debug: ${debugInfo}`);
    }

    return { url, title };
  })

  .execute(async (
    input: ReplaceUrlCommandInput,
    context: TypedExecutionContext
  ): Promise<void> => {
    const { url, title, state } = input;

    // Replace current history entry
    window.history.replaceState(state || null, '', url);

    // Update document title if provided
    if (title) {
      document.title = title;
    }

    // Dispatch custom event for monitoring
    window.dispatchEvent(new CustomEvent('hyperfixi:replaceurl', {
      detail: { url, title, state },
    }));
  })

  .build();

// ============================================================================
// Exports
// ============================================================================

export default replaceUrlCommand;

/**
 * Factory function for ReplaceUrlCommand
 */
export function createReplaceUrlCommand() {
  return replaceUrlCommand;
}
