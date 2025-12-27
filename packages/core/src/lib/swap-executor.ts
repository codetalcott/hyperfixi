/**
 * Swap Executor - Shared DOM swap execution logic
 *
 * Provides a unified interface for executing swap strategies across
 * swap command, history-swap behavior, and boosted behavior.
 *
 * Consolidates duplicated swap strategy implementation (~60 lines x 3 = 180 lines saved)
 *
 * @example
 * ```typescript
 * import { executeSwap, SwapStrategy } from '../lib/swap-executor';
 *
 * executeSwap(target, content, 'morph');
 * executeSwap(target, content, 'innerHTML');
 * executeSwap(target, null, 'delete');
 * ```
 */

import { morphAdapter, type MorphOptions } from './morph-adapter';
import { withViewTransition, isViewTransitionsSupported } from './view-transitions';
import { isHTMLElement, isDocumentFragment } from '../utils/element-check';
import {
  validatePartialContent,
  getPartialValidationConfig,
} from '../validation/partial-validator';
import { emitPartialValidationWarnings } from '../validation/partial-warning-formatter';

// ============================================================================
// Types
// ============================================================================

/**
 * All supported swap strategies
 */
export type SwapStrategy =
  | 'morph'        // Inner morph (default) - intelligent diffing, preserves state
  | 'morphOuter'   // Outer morph - replace element with morph
  | 'innerHTML'    // Replace inner content
  | 'outerHTML'    // Replace entire element
  | 'beforeBegin'  // Insert before element
  | 'afterBegin'   // Insert at start (prepend)
  | 'beforeEnd'    // Insert at end (append)
  | 'afterEnd'     // Insert after element
  | 'delete'       // Remove element
  | 'none';        // No DOM changes

/**
 * Options for swap execution
 */
export interface SwapExecutionOptions {
  /** Morphing options (for morph strategies) */
  morphOptions?: MorphOptions;
  /** Use View Transitions API for smooth animations */
  useViewTransition?: boolean;
  /** Validate content for layout elements before swapping (opt-in) */
  validateContent?: boolean;
  /** Target selector for validation context (used in warning messages) */
  targetSelector?: string;
}

// ============================================================================
// Strategy Mapping
// ============================================================================

/**
 * Map natural language keywords to swap strategies
 */
export const STRATEGY_KEYWORDS: Record<string, SwapStrategy> = {
  // Natural language (Option A from plan)
  'into': 'innerHTML',
  'over': 'outerHTML',

  // Explicit htmx-style strategies
  'innerhtml': 'innerHTML',
  'outerhtml': 'outerHTML',
  'beforebegin': 'beforeBegin',
  'afterbegin': 'afterBegin',
  'beforeend': 'beforeEnd',
  'afterend': 'afterEnd',
  'delete': 'delete',
  'none': 'none',

  // Morph strategies
  'morph': 'morph',
  'innermorph': 'morph',
  'outermorph': 'morphOuter',
};

/**
 * Detect strategy from parsed arguments
 */
export function detectStrategy(args: string[]): SwapStrategy {
  const normalized = args.map(a => a.toLowerCase());

  for (const arg of normalized) {
    if (STRATEGY_KEYWORDS[arg]) {
      return STRATEGY_KEYWORDS[arg];
    }
  }

  // Default to morph for best UX (preserves form state, focus, etc.)
  return 'morph';
}

// ============================================================================
// Core Execution
// ============================================================================

/**
 * Execute a swap strategy on a target element
 *
 * This is the core function that performs the actual DOM manipulation
 * for all swap strategies. Used by swap command, history-swap, and boosted.
 *
 * @param target - Target HTML element
 * @param content - Content to swap in (null for delete strategy)
 * @param strategy - Swap strategy to use
 * @param morphOptions - Optional morphing configuration
 */
export function executeSwap(
  target: HTMLElement,
  content: string | HTMLElement | null,
  strategy: SwapStrategy,
  morphOptions?: MorphOptions
): void {
  const contentStr = content !== null && !isHTMLElement(content) ? content : '';
  const contentEl = isHTMLElement(content) ? content as HTMLElement : null;

  switch (strategy) {
    case 'morph':
      // Inner morph - morph children only
      if (content !== null) {
        try {
          morphAdapter.morphInner(target, contentEl || contentStr, morphOptions);
        } catch (error) {
          // Fallback to innerHTML if morph fails (e.g., mismatched elements)
          console.warn('[HyperFixi] Morph failed, falling back to innerHTML:', error);
          if (contentEl) {
            target.innerHTML = '';
            target.appendChild(contentEl);
          } else {
            target.innerHTML = contentStr;
          }
        }
      }
      break;

    case 'morphOuter':
      // Outer morph - morph the entire element
      if (content !== null) {
        try {
          morphAdapter.morph(target, contentEl || contentStr, morphOptions);
        } catch (error) {
          // Fallback to outerHTML if morph fails
          console.warn('[HyperFixi] Morph failed, falling back to outerHTML:', error);
          if (contentEl) {
            target.replaceWith(contentEl);
          } else {
            target.outerHTML = contentStr;
          }
        }
      }
      break;

    case 'innerHTML':
      if (contentEl) {
        target.innerHTML = '';
        target.appendChild(contentEl);
      } else {
        target.innerHTML = contentStr;
      }
      break;

    case 'outerHTML':
      if (contentEl) {
        target.replaceWith(contentEl);
      } else {
        target.outerHTML = contentStr;
      }
      break;

    case 'beforeBegin':
      if (contentEl) {
        target.parentElement?.insertBefore(contentEl, target);
      } else {
        target.insertAdjacentHTML('beforebegin', contentStr);
      }
      break;

    case 'afterBegin':
      if (contentEl) {
        target.insertBefore(contentEl, target.firstChild);
      } else {
        target.insertAdjacentHTML('afterbegin', contentStr);
      }
      break;

    case 'beforeEnd':
      if (contentEl) {
        target.appendChild(contentEl);
      } else {
        target.insertAdjacentHTML('beforeend', contentStr);
      }
      break;

    case 'afterEnd':
      if (contentEl) {
        target.parentElement?.insertBefore(contentEl, target.nextSibling);
      } else {
        target.insertAdjacentHTML('afterend', contentStr);
      }
      break;

    case 'delete':
      target.remove();
      break;

    case 'none':
      // No DOM changes
      break;

    default:
      throw new Error(`[HyperFixi] swap: unknown strategy "${strategy}"`);
  }
}

/**
 * Execute swap with optional View Transitions
 *
 * Wraps executeSwap with View Transitions API support.
 * Uses the transition queue to prevent cancellation.
 *
 * @param targets - Array of target elements
 * @param content - Content to swap in
 * @param strategy - Swap strategy to use
 * @param options - Execution options (morphOptions, useViewTransition)
 */
export async function executeSwapWithTransition(
  targets: HTMLElement[],
  content: string | HTMLElement | null,
  strategy: SwapStrategy,
  options: SwapExecutionOptions = {}
): Promise<void> {
  const { morphOptions, useViewTransition = false, validateContent = false, targetSelector } = options;

  // Validate content if enabled and content is a string
  if (validateContent && typeof content === 'string') {
    const config = getPartialValidationConfig();
    if (config.enabled) {
      // Derive target selector from first target if not provided
      const selector = targetSelector || deriveTargetSelector(targets[0]);
      const validation = validatePartialContent(content, selector);

      if (validation.totalIssues > 0 && config.showWarnings) {
        emitPartialValidationWarnings(validation);
      }
    }
  }

  const performSwap = () => {
    for (const target of targets) {
      executeSwap(target, content, strategy, morphOptions);
    }
  };

  // Use View Transitions API if requested and supported
  if (useViewTransition && isViewTransitionsSupported()) {
    await withViewTransition(performSwap);
  } else {
    performSwap();
  }
}

/**
 * Derive a target selector string from an element for validation context
 */
function deriveTargetSelector(element?: HTMLElement): string {
  if (!element) return '';
  if (element.id) return `#${element.id}`;
  if (element.className) {
    const firstClass = element.className.split(' ')[0];
    if (firstClass) return `.${firstClass}`;
  }
  return element.tagName.toLowerCase();
}

/**
 * Extract content string from various value types
 *
 * Handles:
 * - null/undefined -> null
 * - HTMLElement -> HTMLElement (passed through)
 * - DocumentFragment -> HTML string (serialized)
 * - string/other -> string
 *
 * @param value - Value to extract content from
 * @returns Content as string, HTMLElement, or null
 */
export function extractContent(value: unknown): string | HTMLElement | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (isHTMLElement(value)) {
    return value as HTMLElement;
  }
  // Handle DocumentFragment from fetch ... as html
  if (isDocumentFragment(value)) {
    const fragment = value as DocumentFragment;
    // Serialize fragment children to HTML string
    const div = document.createElement('div');
    div.appendChild(fragment.cloneNode(true));
    return div.innerHTML;
  }
  return String(value);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  executeSwap,
  executeSwapWithTransition,
  extractContent,
  detectStrategy,
  STRATEGY_KEYWORDS,
};
