/**
 * PushUrlCommand - Push URL to browser history (htmx 4 pattern)
 *
 * Simple history management following htmx 4's approach:
 * - No localStorage snapshots
 * - Re-fetch on popstate navigation
 * - Works with HistorySwap behavior for popstate handling
 *
 * Syntax:
 *   push url "/path"              # Push URL to history
 *   push url location.pathname    # Dynamic URL from expression
 *   push url "/page" with title "Page Title"  # With title update
 *
 * @example
 *   on click
 *     fetch "/page/2" as html
 *     swap #content with it
 *     push url "/page/2"
 *
 *   on click
 *     fetch `/search?q=${query}` as html
 *     swap #results with it
 *     push url `/search?q=${query}` with title "Search Results"
 */

import { defineCommand, type RawCommandArgs } from '../command-builder';
import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed input for push-url command
 */
export interface PushUrlCommandInput {
  /** URL to push to history */
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
 * PushUrlCommand - Built using defineCommand() Builder Pattern
 */
export const pushUrlCommand = defineCommand('push')
  .category('navigation')
  .description('Push URL to browser history without page reload')
  .syntax([
    'push url <url>',
    'push url <url> with title <title>',
  ])
  .examples([
    'push url "/page/2"',
    'push url location.pathname',
    'push url "/search" with title "Search Results"',
  ])
  .sideEffects(['navigation'])
  .relatedCommands(['replace', 'go'])

  .parseInput<PushUrlCommandInput>(async (
    raw: RawCommandArgs,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<PushUrlCommandInput> => {
    const args = raw.args;

    if (!args || args.length === 0) {
      throw new Error('push url command requires a URL argument');
    }

    // Evaluate all arguments with detailed tracking
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

    // Find 'url' keyword position
    const urlKeywordIndex = argStrings.findIndex(s => s === 'url');

    // Find 'with' keyword for title
    const withIndex = argStrings.findIndex(s => s === 'with');
    const titleIndex = argStrings.findIndex(s => s === 'title');

    let url: string;
    let title: string | undefined;

    // DEBUG: Show what we got by including in error message if there's an issue
    const debugInfo = `urlKeywordIndex=${urlKeywordIndex}, argCount=${evaluatedArgs.length}, argStrings=${JSON.stringify(argStrings)}`;

    // Extract URL
    if (urlKeywordIndex !== -1 && evaluatedArgs.length > urlKeywordIndex + 1) {
      url = String(evaluatedArgs[urlKeywordIndex + 1]);
    } else if (evaluatedArgs.length >= 1) {
      // First arg is the URL
      url = String(evaluatedArgs[0]);
    } else {
      throw new Error(`push url command: URL is required. Debug: ${debugInfo}`);
    }

    // Extract title if present
    if (withIndex !== -1 && titleIndex !== -1 && titleIndex > withIndex) {
      if (evaluatedArgs.length > titleIndex + 1) {
        title = String(evaluatedArgs[titleIndex + 1]);
      }
    }

    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error(`push url command: URL must be a string (got ${typeof url}: ${url}). Debug: ${debugInfo}`);
    }

    // Additional validation: if URL is 'undefined' as a string, that's a bug
    if (url === 'undefined') {
      throw new Error(`push url command: URL evaluated to string 'undefined'. Debug: ${debugInfo}`);
    }

    return { url, title };
  })

  .execute(async (
    input: PushUrlCommandInput,
    context: TypedExecutionContext
  ): Promise<void> => {
    const { url, title, state } = input;

    console.log('[PUSH-URL EXECUTE] About to pushState with url:', url);

    // Push to history
    window.history.pushState(state || null, '', url);

    // Update document title if provided
    if (title) {
      document.title = title;
    }

    // Dispatch custom event for monitoring
    window.dispatchEvent(new CustomEvent('hyperfixi:pushurl', {
      detail: { url, title, state },
    }));
  })

  .build();

// ============================================================================
// Exports
// ============================================================================

export default pushUrlCommand;

/**
 * Factory function for PushUrlCommand
 */
export function createPushUrlCommand() {
  return pushUrlCommand;
}
