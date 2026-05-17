/**
 * Swap Executor — shared DOM swap dispatch.
 *
 * Used by the swap/morph commands and the boosted + history-swap behaviors so
 * the 10-strategy switch lives in exactly one place. Optional View Transitions
 * wrapping is folded in via `executeSwapWithTransition`.
 */

import { morphAdapter, type MorphOptions } from './morph-adapter';
import { withViewTransition, isViewTransitionsSupported } from './view-transitions';
import { isHTMLElement, isDocumentFragment } from '../utils/element-check';

export type SwapStrategy =
  | 'morph' // Inner morph (default) — intelligent diffing, preserves state
  | 'morphOuter' // Outer morph — replace element with morph
  | 'innerHTML' // Replace inner content
  | 'outerHTML' // Replace entire element
  | 'beforeBegin' // Insert before element
  | 'afterBegin' // Insert at start (prepend)
  | 'beforeEnd' // Insert at end (append)
  | 'afterEnd' // Insert after element
  | 'delete' // Remove element
  | 'none'; // No DOM changes

export interface SwapExecutionOptions {
  /** Morphing options (for morph strategies). */
  morphOptions?: MorphOptions;
  /** Wrap the swap in `document.startViewTransition` when supported. */
  useViewTransition?: boolean;
}

/**
 * Natural-language → strategy mapping. Shared between the swap parser
 * ([parser/command-parsers/dom-commands.ts]) and the swap command runtime.
 */
export const STRATEGY_KEYWORDS: Record<string, SwapStrategy> = {
  // Natural language
  into: 'innerHTML',
  over: 'outerHTML',

  // Explicit htmx-style strategies
  innerhtml: 'innerHTML',
  outerhtml: 'outerHTML',
  beforebegin: 'beforeBegin',
  afterbegin: 'afterBegin',
  beforeend: 'beforeEnd',
  afterend: 'afterEnd',
  delete: 'delete',
  none: 'none',

  // Morph strategies
  morph: 'morph',
  innermorph: 'morph',
  outermorph: 'morphOuter',
};

export function detectStrategy(args: string[]): SwapStrategy {
  for (const arg of args) {
    const lower = arg.toLowerCase();
    if (STRATEGY_KEYWORDS[lower]) return STRATEGY_KEYWORDS[lower];
  }
  // Default to morph for best UX (preserves form state, focus, etc.)
  return 'morph';
}

/**
 * Execute a swap strategy on a single target.
 *
 * Used by `executeSwapWithTransition` and is exported for legacy callers; new
 * code should prefer the async wrapper so View Transitions stay opt-in via
 * options rather than ad-hoc boilerplate.
 */
export function executeSwap(
  target: HTMLElement,
  content: string | HTMLElement | null,
  strategy: SwapStrategy,
  morphOptions?: MorphOptions
): void {
  const contentStr = content !== null && !isHTMLElement(content) ? content : '';
  const contentEl = isHTMLElement(content) ? (content as HTMLElement) : null;

  switch (strategy) {
    case 'morph':
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
      if (content !== null) {
        try {
          morphAdapter.morph(target, contentEl || contentStr, morphOptions);
        } catch (error) {
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
      break;

    default:
      throw new Error(`[HyperFixi] swap: unknown strategy "${strategy}"`);
  }
}

/**
 * Execute a swap across one or more targets, optionally inside a View
 * Transition. Prefer this entry point — boosted, history-swap, swap, morph,
 * and process-partials all funnel through it so VT wrapping is consistent.
 */
export async function executeSwapWithTransition(
  targets: HTMLElement[],
  content: string | HTMLElement | null,
  strategy: SwapStrategy,
  options: SwapExecutionOptions = {}
): Promise<void> {
  const { morphOptions, useViewTransition = false } = options;

  const performSwap = () => {
    for (const target of targets) {
      executeSwap(target, content, strategy, morphOptions);
    }
  };

  if (useViewTransition && isViewTransitionsSupported()) {
    await withViewTransition(performSwap);
  } else {
    performSwap();
  }
}

/**
 * Coerce a swap value (raw expression output) into something `executeSwap` can
 * use: HTMLElement passthrough, DocumentFragment → serialized HTML string,
 * null/undefined → null, anything else → String(value).
 */
export function extractContent(value: unknown): string | HTMLElement | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (isHTMLElement(value)) {
    return value as HTMLElement;
  }
  if (isDocumentFragment(value)) {
    const fragment = value as DocumentFragment;
    const div = document.createElement('div');
    div.appendChild(fragment.cloneNode(true));
    return div.innerHTML;
  }
  return String(value);
}
