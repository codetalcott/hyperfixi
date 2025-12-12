/**
 * Element Resolution Helpers - Shared utilities for DOM element targeting
 *
 * Used by: transition, settle, toggle, add, remove, show, hide, put, make
 *
 * These utilities handle:
 * - Resolving elements from various input types (string selectors, context refs, HTMLElement)
 * - CSS selector queries with DOM availability checking
 * - Context reference resolution (me, it, you)
 * - Type guards and conversions
 *
 * Bundle size savings: ~60 lines per command using these helpers
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/base-types';
import { isHTMLElement } from '../../utils/element-check';

/**
 * Resolve target element from various input types
 *
 * Handles:
 * - HTMLElement: return as-is
 * - undefined: use context.me
 * - "me" | "it" | "you": resolve from context
 * - CSS selectors (#id, .class, tag): query DOM
 *
 * @param target - Target (element, selector, context ref, or undefined for me)
 * @param context - Execution context
 * @returns Resolved HTML element
 * @throws Error if element cannot be resolved
 */
export function resolveElement(
  target: string | HTMLElement | undefined,
  context: ExecutionContext | TypedExecutionContext
): HTMLElement {
  // If target is already an HTMLElement, return it
  if (isHTMLElement(target)) {
    return target as HTMLElement;
  }

  // If no target specified, use context.me
  if (!target) {
    const me = context.me;
    if (!me) {
      throw new Error('No target element - provide explicit target or ensure context.me is set');
    }
    return asHTMLElement(me);
  }

  // Handle string targets (context refs or CSS selectors)
  if (typeof target === 'string') {
    const trimmed = target.trim();

    // Handle context references
    if (trimmed === 'me') {
      if (!context.me) {
        throw new Error('Context reference "me" is not available');
      }
      return asHTMLElement(context.me);
    }

    if (trimmed === 'it') {
      if (!isHTMLElement(context.it)) {
        throw new Error('Context reference "it" is not an HTMLElement');
      }
      return context.it as HTMLElement;
    }

    if (trimmed === 'you') {
      if (!context.you) {
        throw new Error('Context reference "you" is not available');
      }
      return asHTMLElement(context.you);
    }

    // Handle CSS selector
    if (typeof document !== 'undefined') {
      const element = document.querySelector(trimmed);
      if (!element) {
        throw new Error(`Element not found with selector: ${trimmed}`);
      }
      if (!isHTMLElement(element)) {
        throw new Error(`Element found but is not an HTMLElement: ${trimmed}`);
      }
      return element as HTMLElement;
    }

    throw new Error('DOM not available - cannot resolve element selector');
  }

  throw new Error(`Invalid target type: ${typeof target}`);
}

/**
 * Resolve multiple elements from a selector or array
 *
 * @param target - Target (selector, element, or array of elements)
 * @param context - Execution context
 * @returns Array of resolved HTML elements
 */
export function resolveElements(
  target: string | HTMLElement | HTMLElement[] | NodeList | undefined,
  context: ExecutionContext | TypedExecutionContext
): HTMLElement[] {
  // Handle array or NodeList
  if (Array.isArray(target)) {
    return target.filter(isHTMLElement) as HTMLElement[];
  }

  if (target instanceof NodeList) {
    return Array.from(target).filter(isHTMLElement) as HTMLElement[];
  }

  // Handle single element
  if (isHTMLElement(target)) {
    return [target as HTMLElement];
  }

  // If no target, use context.me
  if (!target) {
    const me = context.me;
    if (!me) {
      return [];
    }
    return isHTMLElement(me) ? [me as HTMLElement] : [];
  }

  // Handle string selector
  if (typeof target === 'string') {
    const trimmed = target.trim();

    // Handle context references
    if (trimmed === 'me') {
      return context.me && isHTMLElement(context.me) ? [context.me as HTMLElement] : [];
    }
    if (trimmed === 'it') {
      return isHTMLElement(context.it) ? [context.it as HTMLElement] : [];
    }
    if (trimmed === 'you') {
      return context.you && isHTMLElement(context.you) ? [context.you as HTMLElement] : [];
    }

    // Query DOM for selector
    if (typeof document !== 'undefined') {
      const elements = document.querySelectorAll(trimmed);
      return Array.from(elements).filter(isHTMLElement) as HTMLElement[];
    }
  }

  return [];
}

/**
 * Convert value to HTMLElement with type checking
 *
 * @param value - Value to convert
 * @returns HTMLElement
 * @throws Error if value is not an HTMLElement
 */
export function asHTMLElement(value: unknown): HTMLElement {
  if (isHTMLElement(value)) {
    return value as HTMLElement;
  }
  throw new Error('Value is not an HTMLElement');
}

/**
 * Check if target is a context reference
 *
 * @param target - Target string to check
 * @returns true if target is me, it, or you
 */
export function isContextRef(target: string): boolean {
  return target === 'me' || target === 'it' || target === 'you';
}

/**
 * Check if target looks like a CSS selector
 *
 * @param target - Target string to check
 * @returns true if target appears to be a selector
 */
export function isCSSSelector(target: string): boolean {
  return (
    target.startsWith('#') ||
    target.startsWith('.') ||
    target.startsWith('[') ||
    target.includes(' ') ||
    /^[a-z]+$/i.test(target)
  );
}

/**
 * Get closest ancestor matching selector
 *
 * @param element - Starting element
 * @param selector - CSS selector to match
 * @returns Matching ancestor or null
 */
export function findClosest(element: HTMLElement, selector: string): HTMLElement | null {
  const result = element.closest(selector);
  return isHTMLElement(result) ? (result as HTMLElement) : null;
}

/**
 * Get all descendants matching selector
 *
 * @param element - Parent element
 * @param selector - CSS selector to match
 * @returns Array of matching descendants
 */
export function findAll(element: HTMLElement, selector: string): HTMLElement[] {
  const results = element.querySelectorAll(selector);
  return Array.from(results).filter(isHTMLElement) as HTMLElement[];
}

/**
 * Resolve possessive reference to HTMLElement
 *
 * Handles: my, me, its, it, your, you
 *
 * @param possessive - Possessive keyword
 * @param context - Execution context
 * @returns Resolved HTMLElement
 * @throws Error if context reference is unavailable or not an HTMLElement
 */
export function resolvePossessive(
  possessive: string,
  context: ExecutionContext | TypedExecutionContext
): HTMLElement {
  switch (possessive.toLowerCase()) {
    case 'my':
    case 'me':
      if (!context.me) throw new Error('No "me" element in context');
      if (!isHTMLElement(context.me)) throw new Error('context.me is not an HTMLElement');
      return context.me as HTMLElement;

    case 'its':
    case 'it':
      if (!context.it) throw new Error('No "it" value in context');
      if (!isHTMLElement(context.it)) throw new Error('context.it is not an HTMLElement');
      return context.it as HTMLElement;

    case 'your':
    case 'you':
      if (!context.you) throw new Error('No "you" element in context');
      if (!isHTMLElement(context.you)) throw new Error('context.you is not an HTMLElement');
      return context.you as HTMLElement;

    default:
      throw new Error(`Unknown possessive: ${possessive}`);
  }
}

/** Default keyword prepositions to filter out */
const KEYWORD_PREPOSITIONS = ['on', 'from', 'to', 'in', 'with', 'at'];

/**
 * Options for resolveTargetsFromArgs
 */
export interface ResolveTargetsOptions {
  /** Filter out keyword prepositions (on, from, to, etc.) - default false */
  filterPrepositions?: boolean;
  /** Fallback modifier key to check when args are empty (for semantic parsing format) */
  fallbackModifierKey?: string;
}

/**
 * Resolve target elements from raw AST arguments
 *
 * This is a higher-level helper that combines AST evaluation with element resolution.
 * Used by show, hide, add, remove, toggle commands that take AST args.
 *
 * Pattern:
 * 1. If no args, return [context.me]
 * 2. For each arg, evaluate with evaluator
 * 3. Skip empty strings
 * 4. Handle HTMLElement, NodeList, Array, CSS selector string
 * 5. If no valid targets found, return [context.me]
 *
 * @param args - Raw AST arguments
 * @param evaluator - Expression evaluator with evaluate() method
 * @param context - Execution context
 * @param commandName - Command name for error messages
 * @param options - Additional options (filterPrepositions, fallbackModifierKey)
 * @param modifiers - Raw modifiers from semantic parsing (optional, for fallback)
 * @returns Array of resolved HTMLElements
 * @throws Error if no valid targets and context.me is unavailable
 */
export async function resolveTargetsFromArgs(
  args: unknown[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluator: { evaluate: (arg: any, context: any) => Promise<any> },
  context: ExecutionContext | TypedExecutionContext,
  commandName: string,
  options: ResolveTargetsOptions = {},
  modifiers?: Record<string, unknown>
): Promise<HTMLElement[]> {
  // Filter out keyword prepositions if requested
  let processedArgs = args;
  if (options.filterPrepositions && args) {
    processedArgs = args.filter(arg => {
      const argAny = arg as Record<string, unknown>;
      if (argAny?.type === 'identifier' && typeof argAny.name === 'string') {
        return !KEYWORD_PREPOSITIONS.includes((argAny.name as string).toLowerCase());
      }
      return true;
    });
  }

  // Fallback to modifiers if args are empty (semantic parsing format)
  if ((!processedArgs || processedArgs.length === 0) && options.fallbackModifierKey && modifiers) {
    const fallbackValue = modifiers[options.fallbackModifierKey];
    if (fallbackValue) {
      processedArgs = [fallbackValue];
    }
  }

  // Default to context.me if no args
  if (!processedArgs || processedArgs.length === 0) {
    if (!context.me) {
      throw new Error(`${commandName} command: no target specified and context.me is null`);
    }
    if (!isHTMLElement(context.me)) {
      throw new Error(`${commandName} command: context.me must be an HTMLElement`);
    }
    return [context.me as HTMLElement];
  }

  const targets: HTMLElement[] = [];

  for (const arg of processedArgs) {
    const evaluated = await evaluator.evaluate(arg, context);

    // Skip empty strings - treat as "no target specified"
    if (evaluated === '' || (typeof evaluated === 'string' && evaluated.trim() === '')) {
      continue;
    }

    if (isHTMLElement(evaluated)) {
      targets.push(evaluated as HTMLElement);
    } else if (evaluated instanceof NodeList) {
      const elements = Array.from(evaluated).filter(isHTMLElement) as HTMLElement[];
      targets.push(...elements);
    } else if (Array.isArray(evaluated)) {
      const elements = evaluated.filter(isHTMLElement) as HTMLElement[];
      targets.push(...elements);
    } else if (typeof evaluated === 'string') {
      try {
        const selected = document.querySelectorAll(evaluated);
        const elements = Array.from(selected).filter(isHTMLElement) as HTMLElement[];
        targets.push(...elements);
      } catch (error) {
        throw new Error(
          `Invalid CSS selector: "${evaluated}" - ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      throw new Error(
        `Invalid ${commandName} target: expected HTMLElement or CSS selector, got ${typeof evaluated}`
      );
    }
  }

  // If no valid targets found after filtering, default to context.me
  if (targets.length === 0) {
    if (!context.me) {
      throw new Error(`${commandName} command: no target specified and context.me is null`);
    }
    if (!isHTMLElement(context.me)) {
      throw new Error(`${commandName} command: context.me must be an HTMLElement`);
    }
    return [context.me as HTMLElement];
  }

  return targets;
}
