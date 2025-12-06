/**
 * SwapCommand - htmx-inspired DOM swapping with morphing support
 *
 * First command built using the new defineCommand() Builder Pattern.
 * Provides intelligent DOM replacement with multiple strategies including
 * morphing (preserves form state, focus, scroll position).
 *
 * Swap Strategies:
 * - morph (default): Intelligent DOM diffing via morphlex, preserves state
 * - innerHTML: Replace inner content, destroys state
 * - outerHTML: Replace entire element, destroys state
 * - beforeBegin: Insert before element
 * - afterBegin: Insert at start of element (prepend)
 * - beforeEnd: Insert at end of element (append)
 * - afterEnd: Insert after element
 * - delete: Remove element from DOM
 * - none: No DOM changes (useful with event triggers)
 *
 * Natural Language Syntax:
 *   swap #target with <content>                        # morph (default, preserves state)
 *   morph #target with <content>                       # explicit morph
 *   morph over #target with <content>                  # outer morph (replace element)
 *   swap into #target with <content>                   # innerHTML (destroys state)
 *   swap over #target with <content>                   # outerHTML (replace element)
 *   swap innerHTML of #target with <content>           # explicit innerHTML
 *   swap outerHTML of #target with <content>           # explicit outerHTML
 *   swap beforeBegin of #target with <content>
 *   swap afterEnd of #target with <content>
 *   swap delete #target                                # remove element
 *   swap #target with <content> using view transition  # with View Transitions API
 *
 * View Transitions API:
 *   The "using view transition" modifier enables smooth CSS-powered transitions
 *   between DOM states. Transitions are queued to prevent cancellation.
 *
 * @example
 *   on click
 *     fetch "/api/content" as html
 *     swap #target with it                   -- morph (preserves form state)
 *
 *   on click
 *     fetch "/api/content" as html
 *     swap innerHTML of #target with it      -- raw innerHTML
 *
 *   on click
 *     swap delete #modal                     -- remove element
 *
 *   on click
 *     fetch "/page/2" as html
 *     swap #content with it using view transition  -- smooth page transition
 */

import { defineCommand, type RawCommandArgs } from '../command-builder';
import type { ExecutionContext, TypedExecutionContext, ASTNode } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { morphAdapter, type MorphOptions } from '../../lib/morph-adapter';
import { withViewTransition, isViewTransitionsSupported } from '../../lib/view-transitions';
import { isHTMLElement } from '../../utils/element-check';

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
 * Parsed and validated input for swap command
 */
export interface SwapCommandInput {
  /** Target element(s) to swap */
  targets: HTMLElement[];
  /** Content to swap in (null for delete strategy) */
  content: string | HTMLElement | null;
  /** Swap strategy to use */
  strategy: SwapStrategy;
  /** Morphing options (for morph strategies) */
  morphOptions?: MorphOptions;
  /** Use View Transitions API for smooth animations */
  useViewTransition?: boolean;
}

// ============================================================================
// Strategy Mapping
// ============================================================================

/**
 * Map natural language keywords to swap strategies
 */
const STRATEGY_KEYWORDS: Record<string, SwapStrategy> = {
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
function detectStrategy(args: string[]): SwapStrategy {
  // Normalize args to lowercase for matching
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
// Helper Functions
// ============================================================================

/**
 * Resolve target elements from selector or context
 */
async function resolveTargets(
  selector: string | null,
  context: ExecutionContext
): Promise<HTMLElement[]> {
  // Default to context.me if no selector
  if (!selector || selector === 'me') {
    if (!context.me || !isHTMLElement(context.me)) {
      throw new Error('swap command: no target specified and context.me is not an HTMLElement');
    }
    return [context.me as HTMLElement];
  }

  // Resolve from CSS selector
  const selected = document.querySelectorAll(selector);
  const elements = Array.from(selected).filter(
    (el): el is HTMLElement => isHTMLElement(el)
  );

  if (elements.length === 0) {
    throw new Error(`swap command: no elements found matching "${selector}"`);
  }

  return elements;
}

/**
 * Extract content string from various value types
 */
function extractContent(value: unknown): string | HTMLElement | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (isHTMLElement(value)) {
    return value as HTMLElement;
  }
  return String(value);
}

/**
 * Execute a swap strategy on a target element
 */
function executeSwapStrategy(
  target: HTMLElement,
  content: string | HTMLElement | null,
  strategy: SwapStrategy,
  morphOptions?: MorphOptions
): void {
  const contentStr = content !== null && !isHTMLElement(content) ? content : '';
  const contentEl = isHTMLElement(content) ? content : null;

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
      throw new Error(`swap command: unknown strategy "${strategy}"`);
  }
}

// ============================================================================
// Command Definition using Builder Pattern
// ============================================================================

/**
 * SwapCommand - Built using defineCommand() Builder Pattern
 */
export const swapCommand = defineCommand('swap')
  .category('dom')
  .description('Swap content into target elements with intelligent morphing support')
  .syntax([
    'swap <target> with <content>',
    'swap [strategy] of <target> with <content>',
    'swap into <target> with <content>',
    'swap over <target> with <content>',
    'swap delete <target>',
    'swap <target> with <content> using view transition',
  ])
  .examples([
    'swap #target with it',
    'swap innerHTML of #target with it',
    'swap over #modal with fetchedContent',
    'swap delete #notification',
    'swap beforeEnd of #list with newItem',
    'swap #content with it using view transition',
  ])
  .sideEffects(['dom-mutation'])
  .relatedCommands(['put', 'morph', 'remove', 'append', 'prepend'])

  .parseInput<SwapCommandInput>(async (
    raw: RawCommandArgs,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SwapCommandInput> => {
    console.log('[SWAP DEBUG] parseInput called with raw:', JSON.stringify(raw, null, 2));
    const args = raw.args;

    if (!args || args.length === 0) {
      console.log('[SWAP DEBUG] No args provided!');
      throw new Error('swap command requires arguments');
    }
    console.log('[SWAP DEBUG] args.length:', args.length);

    // Parse arguments to extract: strategy, target, content
    // Syntax patterns:
    //   swap <target> with <content>           → strategy=morph
    //   swap [strategy] of <target> with <content>
    //   swap into <target> with <content>      → strategy=innerHTML
    //   swap over <target> with <content>      → strategy=outerHTML
    //   swap delete <target>                   → strategy=delete

    // Helper to extract keyword name from AST node without evaluation
    // This follows the pattern used by put command
    const getNodeKeyword = (node: unknown): string | null => {
      if (!node || typeof node !== 'object') return null;
      const nodeObj = node as Record<string, unknown>;
      const nodeType = nodeObj.type as string;

      if (nodeType === 'literal' && typeof nodeObj.value === 'string') {
        return (nodeObj.value as string).toLowerCase();
      }
      if (nodeType === 'identifier' && typeof nodeObj.name === 'string') {
        return (nodeObj.name as string).toLowerCase();
      }
      return null;
    };

    // First pass: extract keywords from AST nodes and find key positions
    const argKeywords: (string | null)[] = args.map(getNodeKeyword);

    // Find keyword positions
    const withIndex = argKeywords.findIndex(k => k === 'with');
    const ofIndex = argKeywords.findIndex(k => k === 'of');
    const deleteIndex = argKeywords.findIndex(k => k === 'delete');
    const usingIndex = argKeywords.findIndex(k => k === 'using');

    // Detect "using view transition" modifier
    let useViewTransition = false;
    if (usingIndex !== -1) {
      const afterUsing = argKeywords.slice(usingIndex + 1);
      if (afterUsing.includes('view') && afterUsing.includes('transition')) {
        useViewTransition = true;
      }
    }

    let strategy: SwapStrategy = 'morph';
    let targetNode: ASTNode | null = null;
    let contentNode: ASTNode | null = null;

    if (deleteIndex !== -1) {
      // Delete pattern: swap delete <target>
      strategy = 'delete';
      targetNode = args[deleteIndex + 1];
      contentNode = null;
    } else if (ofIndex !== -1 && withIndex !== -1) {
      // "swap [strategy] of <target> with <content>" pattern
      const potentialStrategy = argKeywords[0];
      if (potentialStrategy && STRATEGY_KEYWORDS[potentialStrategy]) {
        strategy = STRATEGY_KEYWORDS[potentialStrategy];
      }
      targetNode = args[ofIndex + 1];
      contentNode = args[withIndex + 1];
    } else if (withIndex !== -1) {
      // Check for "into" or "over" before target
      const beforeWithKeywords = argKeywords.slice(0, withIndex);
      const intoIdx = beforeWithKeywords.findIndex(k => k === 'into');
      const overIdx = beforeWithKeywords.findIndex(k => k === 'over');

      if (intoIdx !== -1) {
        strategy = 'innerHTML';
        targetNode = args[intoIdx + 1];
      } else if (overIdx !== -1) {
        strategy = 'outerHTML';
        targetNode = args[overIdx + 1];
      } else {
        // Simple "swap <target> with <content>" - use morph as default
        // Check first arg for potential strategy
        const firstKeyword = argKeywords[0];
        if (firstKeyword && STRATEGY_KEYWORDS[firstKeyword]) {
          strategy = STRATEGY_KEYWORDS[firstKeyword];
          // In this case, target is after the strategy keyword
          targetNode = args[1] || args[withIndex - 1];
        } else {
          targetNode = args[withIndex - 1];
        }
      }
      contentNode = args[withIndex + 1];
    } else {
      // Fallback: assume [target, content] or [strategy, target, content]
      if (args.length >= 2) {
        const firstKeyword = argKeywords[0];
        if (firstKeyword && STRATEGY_KEYWORDS[firstKeyword]) {
          strategy = STRATEGY_KEYWORDS[firstKeyword];
        }
        targetNode = args[args.length - 2];
        contentNode = args[args.length - 1];
      } else {
        throw new Error('swap command: could not parse arguments. Expected "swap <target> with <content>"');
      }
    }

    // Now evaluate the target and content nodes
    let targetArg: unknown = null;
    let contentArg: unknown = null;

    console.log('[SWAP DEBUG] targetNode:', JSON.stringify(targetNode, null, 2));
    console.log('[SWAP DEBUG] contentNode:', JSON.stringify(contentNode, null, 2));

    if (targetNode) {
      // Check if targetNode is a selector - if so, extract the selector string
      const nodeType = (targetNode as Record<string, unknown>).type;
      const nodeValue = (targetNode as Record<string, unknown>).value;

      if (nodeType === 'selector' && typeof nodeValue === 'string') {
        // Don't evaluate selector nodes - use the selector string directly
        targetArg = nodeValue;
        console.log('[SWAP DEBUG] Using selector value directly:', targetArg);
      } else if (nodeType === 'binaryExpression' && (targetNode as Record<string, unknown>).operator === 'of') {
        // Handle "beforeEnd of #target" style - extract strategy from left, target from right
        const left = (targetNode as Record<string, unknown>).left as Record<string, unknown>;
        const right = (targetNode as Record<string, unknown>).right as Record<string, unknown>;

        // Extract strategy from left side (e.g., "beforeEnd", "afterBegin")
        if (left && left.type === 'identifier' && typeof left.name === 'string') {
          const strategyName = left.name.toLowerCase();
          if (STRATEGY_KEYWORDS[strategyName]) {
            strategy = STRATEGY_KEYWORDS[strategyName];
            console.log('[SWAP DEBUG] Extracted strategy from binary "of":', strategy);
          }
        }

        // Extract target from right side (selector or expression)
        if (right && right.type === 'selector' && typeof right.value === 'string') {
          targetArg = right.value;
          console.log('[SWAP DEBUG] Extracted selector from binary "of":', targetArg);
        } else if (right) {
          targetArg = await evaluator.evaluate(right, context);
          console.log('[SWAP DEBUG] Evaluated right side of binary "of":', typeof targetArg);
        }
      } else {
        targetArg = await evaluator.evaluate(targetNode, context);
        console.log('[SWAP DEBUG] Evaluated targetArg:', typeof targetArg, isHTMLElement(targetArg) ? 'HTMLElement' : targetArg);
      }
    }
    if (contentNode) {
      contentArg = await evaluator.evaluate(contentNode, context);
      console.log('[SWAP DEBUG] Evaluated contentArg:', typeof contentArg, String(contentArg).substring(0, 50));
    }

    // Resolve target selector
    let targetSelector: string | null = null;
    if (typeof targetArg === 'string') {
      targetSelector = targetArg;
      console.log('[SWAP DEBUG] Using string selector:', targetSelector);
    } else if (isHTMLElement(targetArg)) {
      // Direct element reference
      console.log('[SWAP DEBUG] Using direct element:', (targetArg as HTMLElement).id || (targetArg as HTMLElement).tagName);
      return {
        targets: [targetArg as HTMLElement],
        content: extractContent(contentArg),
        strategy,
        morphOptions: { preserveChanges: true },
        useViewTransition,
      };
    } else {
      console.log('[SWAP DEBUG] targetArg is neither string nor HTMLElement:', typeof targetArg, targetArg);
    }

    console.log('[SWAP DEBUG] Calling resolveTargets with selector:', targetSelector);
    const targets = await resolveTargets(targetSelector, context);
    const content = extractContent(contentArg);

    return {
      targets,
      content,
      strategy,
      morphOptions: { preserveChanges: true },
      useViewTransition,
    };
  })

  .execute(async (
    input: SwapCommandInput,
    context: TypedExecutionContext
  ): Promise<void> => {
    console.log('[SWAP DEBUG] execute called with input:', JSON.stringify(input, null, 2));
    const { targets, content, strategy, morphOptions, useViewTransition } = input;
    console.log('[SWAP DEBUG] targets:', targets?.length, 'content:', content, 'strategy:', strategy);

    const performSwap = () => {
      for (const target of targets) {
        executeSwapStrategy(target, content, strategy, morphOptions);
      }
    };

    // Use View Transitions API if requested and supported
    if (useViewTransition && isViewTransitionsSupported()) {
      await withViewTransition(performSwap);
    } else {
      performSwap();
    }
  })

  .build();

// ============================================================================
// Morph Command (Alias)
// ============================================================================

/**
 * MorphCommand - Alias for swap with morph strategy
 *
 * Provides natural language syntax for morphing:
 *   morph #target with <content>        # inner morph (children only)
 *   morph over #target with <content>   # outer morph (replace element)
 */
export const morphCommand = defineCommand('morph')
  .category('dom')
  .description('Morph content into target elements (intelligent diffing, preserves state)')
  .syntax([
    'morph <target> with <content>',
    'morph over <target> with <content>',
  ])
  .examples([
    'morph #target with it',
    'morph over #modal with fetchedContent',
  ])
  .sideEffects(['dom-mutation'])
  .relatedCommands(['swap', 'put'])

  .parseInput<SwapCommandInput>(async (
    raw: RawCommandArgs,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SwapCommandInput> => {
    const args = raw.args;

    if (!args || args.length === 0) {
      throw new Error('morph command requires arguments');
    }

    let strategy: SwapStrategy = 'morph';
    let targetArg: unknown = null;
    let contentArg: unknown = null;

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

    // Find 'with' and 'over' keywords
    const withIndex = argStrings.findIndex(s => s === 'with');
    const overIndex = argStrings.findIndex(s => s === 'over');

    if (overIndex !== -1 && overIndex < (withIndex === -1 ? Infinity : withIndex)) {
      // "morph over <target> with <content>" pattern
      strategy = 'morphOuter';
      targetArg = evaluatedArgs[overIndex + 1];
    } else if (withIndex !== -1) {
      // "morph <target> with <content>" pattern
      targetArg = evaluatedArgs[withIndex - 1];
    }

    if (withIndex !== -1) {
      contentArg = evaluatedArgs[withIndex + 1];
    }

    if (!targetArg) {
      throw new Error('morph command: could not determine target');
    }

    // Resolve target
    let targets: HTMLElement[];
    if (typeof targetArg === 'string') {
      targets = await resolveTargets(targetArg, context);
    } else if (isHTMLElement(targetArg)) {
      targets = [targetArg as HTMLElement];
    } else {
      throw new Error('morph command: target must be a selector or element');
    }

    return {
      targets,
      content: extractContent(contentArg),
      strategy,
      morphOptions: { preserveChanges: true },
    };
  })

  .execute(async (
    input: SwapCommandInput,
    context: TypedExecutionContext
  ): Promise<void> => {
    const { targets, content, strategy, morphOptions } = input;

    for (const target of targets) {
      executeSwapStrategy(target, content, strategy, morphOptions);
    }
  })

  .build();

// ============================================================================
// Exports
// ============================================================================

export default swapCommand;

/**
 * Factory function for SwapCommand (compatibility with existing patterns)
 */
export function createSwapCommand() {
  return swapCommand;
}

/**
 * Factory function for MorphCommand
 */
export function createMorphCommand() {
  return morphCommand;
}
