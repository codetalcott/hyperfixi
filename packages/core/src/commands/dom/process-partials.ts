/**
 * ProcessPartialsCommand - Multi-target swaps from <hx-partial> elements
 *
 * Processes HTML responses containing multiple swap targets using <hx-partial>
 * elements (similar to htmx's out-of-band swaps but cleaner syntax).
 *
 * Response Format:
 *   <hx-partial target="#main">
 *     <div>Main content here</div>
 *   </hx-partial>
 *   <hx-partial target="#sidebar" strategy="innerHTML">
 *     <nav>Sidebar content</nav>
 *   </hx-partial>
 *   <hx-partial target="#notification" strategy="beforeEnd">
 *     <div class="toast">New notification!</div>
 *   </hx-partial>
 *
 * Syntax:
 *   process partials in <content>                    # Process all <hx-partial> elements
 *   process partials in it                           # After fetch, process response partials
 *   process partials in it using view transition     # With View Transitions
 *
 * @example
 *   on click
 *     fetch "/api/dashboard" as html
 *     process partials in it                   -- Swaps #main, #sidebar, #notifications
 *
 *   on click
 *     fetch "/api/with-updates" as html
 *     process partials in it using view transition
 */

import { defineCommand, type RawCommandArgs } from '../command-builder';
import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { morphAdapter, type MorphOptions } from '../../lib/morph-adapter';
import { withViewTransition, isViewTransitionsSupported } from '../../lib/view-transitions';
import { isHTMLElement } from '../../utils/element-check';
import type { SwapStrategy } from './swap';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a parsed partial from the response
 */
export interface ParsedPartial {
  /** Target CSS selector */
  target: string;
  /** Swap strategy (defaults to morph) */
  strategy: SwapStrategy;
  /** HTML content to swap */
  content: string;
}

/**
 * Parsed input for process-partials command
 */
export interface ProcessPartialsCommandInput {
  /** HTML content containing <hx-partial> elements */
  html: string;
  /** Use View Transitions API for smooth animations */
  useViewTransition?: boolean;
  /** Morph options for morphing strategies */
  morphOptions?: MorphOptions;
}

/**
 * Result of processing partials
 */
export interface ProcessPartialsResult {
  /** Number of partials processed */
  count: number;
  /** Targets that were swapped */
  targets: string[];
  /** Any errors encountered (partial processing continues on error) */
  errors: string[];
}

// ============================================================================
// Strategy Mapping
// ============================================================================

const STRATEGY_MAP: Record<string, SwapStrategy> = {
  'morph': 'morph',
  'morphouter': 'morphOuter',
  'innerhtml': 'innerHTML',
  'outerhtml': 'outerHTML',
  'beforebegin': 'beforeBegin',
  'afterbegin': 'afterBegin',
  'beforeend': 'beforeEnd',
  'afterend': 'afterEnd',
  'delete': 'delete',
  'none': 'none',
};

// ============================================================================
// Partial Processing Functions
// ============================================================================

/**
 * Extract <hx-partial> elements from HTML string
 */
export function extractPartials(html: string): ParsedPartial[] {
  const partials: ParsedPartial[] = [];

  // Create a temporary container to parse HTML
  const container = document.createElement('div');
  container.innerHTML = html;

  // Find all <hx-partial> elements
  const partialElements = container.querySelectorAll('hx-partial');

  for (const element of partialElements) {
    const target = element.getAttribute('target');
    if (!target) {
      console.warn('hx-partial element missing target attribute, skipping');
      continue;
    }

    // Get strategy (defaults to morph)
    const strategyAttr = element.getAttribute('strategy')?.toLowerCase() || 'morph';
    const strategy = STRATEGY_MAP[strategyAttr] || 'morph';

    // Get inner content
    const content = element.innerHTML;

    partials.push({ target, strategy, content });
  }

  return partials;
}

/**
 * Execute swap for a single partial
 */
function executePartialSwap(
  partial: ParsedPartial,
  morphOptions?: MorphOptions
): { success: boolean; error?: string } {
  const { target, strategy, content } = partial;

  // Find target element
  const targetElement = document.querySelector(target);
  if (!targetElement || !isHTMLElement(targetElement)) {
    return { success: false, error: `Target "${target}" not found` };
  }

  try {
    switch (strategy) {
      case 'morph':
        morphAdapter.morphInner(targetElement, content, morphOptions);
        break;

      case 'morphOuter':
        morphAdapter.morph(targetElement, content, morphOptions);
        break;

      case 'innerHTML':
        targetElement.innerHTML = content;
        break;

      case 'outerHTML':
        targetElement.outerHTML = content;
        break;

      case 'beforeBegin':
        targetElement.insertAdjacentHTML('beforebegin', content);
        break;

      case 'afterBegin':
        targetElement.insertAdjacentHTML('afterbegin', content);
        break;

      case 'beforeEnd':
        targetElement.insertAdjacentHTML('beforeend', content);
        break;

      case 'afterEnd':
        targetElement.insertAdjacentHTML('afterend', content);
        break;

      case 'delete':
        targetElement.remove();
        break;

      case 'none':
        // No DOM changes
        break;

      default:
        return { success: false, error: `Unknown strategy "${strategy}"` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Process all partials in HTML content
 */
export function processPartials(
  html: string,
  morphOptions?: MorphOptions
): ProcessPartialsResult {
  const partials = extractPartials(html);
  const result: ProcessPartialsResult = {
    count: 0,
    targets: [],
    errors: [],
  };

  for (const partial of partials) {
    const swapResult = executePartialSwap(partial, morphOptions);

    if (swapResult.success) {
      result.count++;
      result.targets.push(partial.target);
    } else if (swapResult.error) {
      result.errors.push(`${partial.target}: ${swapResult.error}`);
    }
  }

  return result;
}

// ============================================================================
// Command Definition
// ============================================================================

/**
 * ProcessPartialsCommand - Built using defineCommand() Builder Pattern
 */
export const processPartialsCommand = defineCommand('process')
  .category('dom')
  .description('Process <hx-partial> elements for multi-target swaps')
  .syntax([
    'process partials in <content>',
    'process partials in <content> using view transition',
  ])
  .examples([
    'process partials in it',
    'process partials in fetchedHtml',
    'process partials in it using view transition',
  ])
  .sideEffects(['dom-mutation'])
  .relatedCommands(['swap', 'morph', 'fetch'])

  .parseInput<ProcessPartialsCommandInput>(async (
    raw: RawCommandArgs,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ProcessPartialsCommandInput> => {
    const args = raw.args;

    if (!args || args.length === 0) {
      throw new Error('process partials command requires content argument');
    }

    // Evaluate all arguments
    const evaluatedArgs: unknown[] = [];
    const argStrings: string[] = [];
    for (const arg of args) {
      const evaluated = await evaluator.evaluate(arg, context);
      evaluatedArgs.push(evaluated);
      if (typeof evaluated === 'string') {
        argStrings.push(evaluated.toLowerCase());
      }
    }

    // Verify "partials" keyword is present
    const partialsIndex = argStrings.findIndex(s => s === 'partials');
    if (partialsIndex === -1) {
      throw new Error('process command expects "partials" keyword: process partials in <content>');
    }

    // Find "in" keyword position
    const inIndex = argStrings.findIndex(s => s === 'in');
    if (inIndex === -1 || inIndex <= partialsIndex) {
      throw new Error('process partials command expects "in" keyword: process partials in <content>');
    }

    // Get content argument (after "in")
    const contentArg = evaluatedArgs[inIndex + 1];

    // Extract HTML string
    let html: string;
    if (typeof contentArg === 'string') {
      html = contentArg;
    } else if (isHTMLElement(contentArg)) {
      html = (contentArg as HTMLElement).outerHTML;
    } else if (contentArg && typeof (contentArg as any).text === 'function') {
      // Handle Response object
      html = await (contentArg as Response).text();
    } else {
      throw new Error('process partials: content must be an HTML string or element');
    }

    // Detect "using view transition" modifier
    const usingIndex = argStrings.findIndex(s => s === 'using');
    let useViewTransition = false;
    if (usingIndex !== -1) {
      const remaining = argStrings.slice(usingIndex + 1).join(' ');
      if (remaining.includes('view') && remaining.includes('transition')) {
        useViewTransition = true;
      }
    }

    return {
      html,
      useViewTransition,
      morphOptions: { preserveChanges: true },
    };
  })

  .execute(async (
    input: ProcessPartialsCommandInput,
    context: TypedExecutionContext
  ): Promise<ProcessPartialsResult> => {
    const { html, useViewTransition, morphOptions } = input;

    const performProcessing = () => processPartials(html, morphOptions);

    let result: ProcessPartialsResult;

    // Use View Transitions API if requested and supported
    if (useViewTransition && isViewTransitionsSupported()) {
      await withViewTransition(() => {
        result = performProcessing();
      });
    } else {
      result = performProcessing();
    }

    // Store result in context.it for chaining
    (context as any).it = result!;

    // Dispatch custom event for monitoring
    window.dispatchEvent(new CustomEvent('hyperfixi:partials', {
      detail: result!,
    }));

    // Log any errors as warnings
    if (result!.errors.length > 0) {
      console.warn('Some partials failed to process:', result!.errors);
    }

    return result!;
  })

  .build();

// ============================================================================
// Exports
// ============================================================================

export default processPartialsCommand;

/**
 * Factory function for ProcessPartialsCommand
 */
export function createProcessPartialsCommand() {
  return processPartialsCommand;
}
