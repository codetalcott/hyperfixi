/**
 * SwapCommand & MorphCommand - Decorated Implementation
 *
 * htmx-inspired DOM swapping with morphing support.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Swap Strategies:
 * - morph (default): Intelligent DOM diffing, preserves state
 * - innerHTML/outerHTML: Replace content
 * - beforeBegin/afterBegin/beforeEnd/afterEnd: Insert positions
 * - delete: Remove element from DOM
 *
 * Syntax:
 *   swap #target with <content>
 *   swap [strategy] of #target with <content>
 *   swap delete #target
 *   morph #target with <content>
 */

import type { ExecutionContext, TypedExecutionContext, ASTNode } from '../../types/core';
import type { ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { resolveElements } from '../helpers/element-resolution';
import {
  executeSwap,
  executeSwapWithTransition,
  extractContent,
  STRATEGY_KEYWORDS,
  type SwapStrategy,
} from '../../lib/swap-executor';
import type { MorphOptions } from '../../lib/morph-adapter';
import { isHTMLElement } from '../../utils/element-check';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

// Re-export types from swap-executor for consumers
export type { SwapStrategy } from '../../lib/swap-executor';

// ============================================================================
// Types
// ============================================================================

/**
 * SwapCommand input. The optional `variant` distinguishes two modes:
 *
 *   - Absent / 'dom' → htmx-style DOM swap (default): targets/content/strategy
 *   - 'variable' → upstream `_hyperscript` value swap (setters.js:210-252):
 *     exchanges two local variables by name
 *
 * Kept as a single interface (rather than a union) so existing callers that
 * read `.targets` / `.strategy` directly don't need narrowing.
 */
export interface SwapCommandInput {
  variant?: 'dom' | 'variable';
  // DOM-swap fields
  targets?: HTMLElement[];
  content?: string | HTMLElement | null;
  strategy?: SwapStrategy;
  morphOptions?: MorphOptions;
  useViewTransition?: boolean;
  // Variable-swap fields (mutually exclusive with DOM fields)
  leftName?: string;
  rightName?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function resolveTargets(
  selector: string | null,
  context: ExecutionContext
): Promise<HTMLElement[]> {
  const elements = resolveElements(selector || undefined, context);

  if (elements.length === 0) {
    const selectorInfo = selector ? ` matching "${selector}"` : '';
    throw new Error(`[HyperFixi] swap: no elements found${selectorInfo}`);
  }

  return elements;
}

// ============================================================================
// SwapCommand - Decorated Implementation
// ============================================================================

/**
 * SwapCommand - DOM swapping with morphing support
 *
 * Before: ~210 lines (builder pattern section)
 * After: ~200 lines (decorator pattern)
 */
@meta({
  description: 'Swap content into target elements with intelligent morphing support',
  syntax: [
    'swap <target> with <content>',
    'swap [strategy] of <target> with <content>',
    'swap into <target> with <content>',
    'swap over <target> with <content>',
    'swap delete <target>',
    'swap <target> with <content> using view transition',
  ],
  examples: [
    'swap #target with it',
    'swap innerHTML of #target with it',
    'swap over #modal with fetchedContent',
    'swap delete #notification',
  ],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'swap', category: 'dom' })
export class SwapCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SwapCommandInput> {
    const args = raw.args;

    if (!args || args.length === 0) {
      throw new Error('[HyperFixi] swap: command requires arguments');
    }

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

    const argKeywords: (string | null)[] = args.map(getNodeKeyword);

    const withIndex = argKeywords.findIndex(k => k === 'with');
    const ofIndex = argKeywords.findIndex(k => k === 'of');
    const deleteIndex = argKeywords.findIndex(k => k === 'delete');
    const usingIndex = argKeywords.findIndex(k => k === 'using');

    // ------------------------------------------------------------------
    // Variable swap disambiguation (upstream _hyperscript setters.js:210)
    //
    // `swap a with b` exchanges two local variable values when:
    //   - args is exactly [identifier, 'with', identifier]
    //   - no strategy/keyword tokens are present (`of`, `delete`, `using`,
    //     `into`, `over`, no STRATEGY_KEYWORDS first)
    //   - neither operand is a selector or attribute reference
    //   - both operand names are not 'me'/'you'/'it'/'result' (those are
    //     read-only context references — falling back to DOM swap)
    //
    // When unmatched, fall through to the existing DOM-swap handler below.
    // ------------------------------------------------------------------
    if (
      args.length === 3 &&
      withIndex === 1 &&
      ofIndex === -1 &&
      deleteIndex === -1 &&
      usingIndex === -1
    ) {
      const left = args[0] as Record<string, unknown>;
      const right = args[2] as Record<string, unknown>;
      const leftIsIdent = left?.type === 'identifier' && typeof left.name === 'string';
      const rightIsIdent = right?.type === 'identifier' && typeof right.name === 'string';
      const RESERVED = new Set(['me', 'you', 'it', 'result', 'window', 'document']);
      if (
        leftIsIdent &&
        rightIsIdent &&
        !RESERVED.has((left.name as string).toLowerCase()) &&
        !RESERVED.has((right.name as string).toLowerCase()) &&
        !STRATEGY_KEYWORDS[(left.name as string).toLowerCase()]
      ) {
        return {
          variant: 'variable',
          leftName: left.name as string,
          rightName: right.name as string,
        };
      }
    }

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
      strategy = 'delete';
      targetNode = args[deleteIndex + 1];
      contentNode = null;
    } else if (ofIndex !== -1 && withIndex !== -1) {
      const potentialStrategy = argKeywords[0];
      if (potentialStrategy && STRATEGY_KEYWORDS[potentialStrategy]) {
        strategy = STRATEGY_KEYWORDS[potentialStrategy];
      }
      targetNode = args[ofIndex + 1];
      contentNode = args[withIndex + 1];
    } else if (withIndex !== -1) {
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
        const firstKeyword = argKeywords[0];
        if (firstKeyword && STRATEGY_KEYWORDS[firstKeyword]) {
          strategy = STRATEGY_KEYWORDS[firstKeyword];
          targetNode = args[1] || args[withIndex - 1];
        } else {
          targetNode = args[withIndex - 1];
        }
      }
      contentNode = args[withIndex + 1];
    } else {
      if (args.length >= 2) {
        const firstKeyword = argKeywords[0];
        if (firstKeyword && STRATEGY_KEYWORDS[firstKeyword]) {
          strategy = STRATEGY_KEYWORDS[firstKeyword];
        }
        targetNode = args[args.length - 2];
        contentNode = args[args.length - 1];
      } else {
        throw new Error(
          '[HyperFixi] swap: could not parse arguments. Expected "swap <target> with <content>"'
        );
      }
    }

    let targetArg: unknown = null;
    let contentArg: unknown = null;

    if (targetNode) {
      const nodeType = (targetNode as Record<string, unknown>).type;
      const nodeValue = (targetNode as Record<string, unknown>).value;

      if (nodeType === 'selector' && typeof nodeValue === 'string') {
        targetArg = nodeValue;
      } else if (
        nodeType === 'binaryExpression' &&
        (targetNode as Record<string, unknown>).operator === 'of'
      ) {
        const left = (targetNode as Record<string, unknown>).left as Record<string, unknown>;
        const right = (targetNode as Record<string, unknown>).right as Record<string, unknown>;

        if (left && left.type === 'identifier' && typeof left.name === 'string') {
          const strategyName = left.name.toLowerCase();
          if (STRATEGY_KEYWORDS[strategyName]) {
            strategy = STRATEGY_KEYWORDS[strategyName];
          }
        }

        if (right && right.type === 'selector' && typeof right.value === 'string') {
          targetArg = right.value;
        } else if (right) {
          targetArg = await evaluator.evaluate(right as ASTNode, context);
        }
      } else {
        targetArg = await evaluator.evaluate(targetNode, context);
      }
    }
    if (contentNode) {
      contentArg = await evaluator.evaluate(contentNode, context);
    }

    let targetSelector: string | null = null;
    if (typeof targetArg === 'string') {
      targetSelector = targetArg;
    } else if (isHTMLElement(targetArg)) {
      return {
        targets: [targetArg as HTMLElement],
        content: extractContent(contentArg),
        strategy,
        morphOptions: { preserveChanges: true },
        useViewTransition,
      };
    }

    const targets = await resolveTargets(targetSelector, context);
    const content = extractContent(contentArg);

    return {
      targets,
      content,
      strategy,
      morphOptions: { preserveChanges: true },
      useViewTransition,
    };
  }

  async execute(input: SwapCommandInput, context: TypedExecutionContext): Promise<void> {
    // Variable swap (upstream _hyperscript setters.js): exchange two locals.
    if (input.variant === 'variable') {
      const { leftName, rightName } = input as { leftName: string; rightName: string };
      const readVar = (name: string): unknown => {
        if (context.locals?.has(name)) return context.locals.get(name);
        if (context.globals?.has(name)) return context.globals.get(name);
        return undefined;
      };
      const writeVar = (name: string, value: unknown): void => {
        // Prefer the scope the variable already lives in so we don't shadow.
        if (context.locals?.has(name)) {
          context.locals.set(name, value);
        } else if (context.globals?.has(name)) {
          context.globals.set(name, value);
        } else if (context.locals) {
          // Neither side defined yet → default to locals (matches `set` behavior).
          context.locals.set(name, value);
        }
      };
      const leftValue = readVar(leftName);
      const rightValue = readVar(rightName);
      writeVar(leftName, rightValue);
      writeVar(rightName, leftValue);
      return;
    }

    // DOM swap (htmx-style).
    const { targets, content, strategy, morphOptions, useViewTransition } = input;
    if (!targets || !strategy) {
      throw new Error('[HyperFixi] swap: DOM swap requires targets and strategy');
    }
    await executeSwapWithTransition(targets, content ?? null, strategy, {
      morphOptions,
      useViewTransition,
    });
  }
}

// ============================================================================
// MorphCommand - Decorated Implementation
// ============================================================================

/**
 * MorphCommand - Alias for swap with morph strategy
 *
 * Before: ~90 lines (builder pattern section)
 * After: ~80 lines (decorator pattern)
 */
@meta({
  description: 'Morph content into target elements (intelligent diffing, preserves state)',
  syntax: ['morph <target> with <content>', 'morph over <target> with <content>'],
  examples: ['morph #target with it', 'morph over #modal with fetchedContent'],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'morph', category: 'dom' })
export class MorphCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SwapCommandInput> {
    const args = raw.args;

    if (!args || args.length === 0) {
      throw new Error('[HyperFixi] morph: command requires arguments');
    }

    // Extract keywords from raw AST nodes (before evaluation)
    // This is more robust than evaluating and checking strings
    const getNodeKeyword = (arg: ASTNode): string | null => {
      const nodeObj = arg as Record<string, unknown>;
      const nodeType = nodeObj.type;
      if (nodeType === 'identifier' && typeof nodeObj.name === 'string') {
        return (nodeObj.name as string).toLowerCase();
      }
      return null;
    };

    const argKeywords: (string | null)[] = args.map(getNodeKeyword);
    const withIndex = argKeywords.findIndex(k => k === 'with');
    const overIndex = argKeywords.findIndex(k => k === 'over');
    const usingIndex = argKeywords.findIndex(k => k === 'using');

    // Check for 'using view transition' modifier
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

    if (overIndex !== -1 && overIndex < (withIndex === -1 ? Infinity : withIndex)) {
      // morph over <target> with <content>
      strategy = 'morphOuter';
      targetNode = args[overIndex + 1];
      if (withIndex !== -1) {
        contentNode = args[withIndex + 1];
      }
    } else if (withIndex !== -1) {
      // morph <target> with <content>
      targetNode = args[withIndex - 1];
      contentNode = args[withIndex + 1];
    } else if (args.length >= 2) {
      // Fallback: morph <target> <content>
      targetNode = args[0];
      contentNode = args[1];
    }

    if (!targetNode) {
      throw new Error('[HyperFixi] morph: could not determine target');
    }

    // Evaluate target
    let targetArg: unknown = null;
    const targetNodeObj = targetNode as Record<string, unknown>;
    if (targetNodeObj.type === 'selector' && typeof targetNodeObj.value === 'string') {
      targetArg = targetNodeObj.value;
    } else {
      targetArg = await evaluator.evaluate(targetNode, context);
    }

    // Evaluate content
    let contentArg: unknown = null;
    if (contentNode) {
      contentArg = await evaluator.evaluate(contentNode, context);
    }

    if (!targetArg) {
      throw new Error('[HyperFixi] morph: could not determine target');
    }

    let targets: HTMLElement[];
    if (typeof targetArg === 'string') {
      targets = await resolveTargets(targetArg, context);
    } else if (isHTMLElement(targetArg)) {
      targets = [targetArg as HTMLElement];
    } else {
      throw new Error('[HyperFixi] morph: target must be a selector or element');
    }

    return {
      targets,
      content: extractContent(contentArg),
      strategy,
      morphOptions: { preserveChanges: true },
      useViewTransition,
    };
  }

  async execute(input: SwapCommandInput, _context: TypedExecutionContext): Promise<void> {
    const { targets, content, strategy, morphOptions, useViewTransition } = input;
    if (!targets || !strategy) {
      throw new Error('[HyperFixi] morph: requires targets and strategy');
    }
    const safeContent = content ?? null;

    if (useViewTransition) {
      await executeSwapWithTransition(targets, safeContent, strategy, {
        morphOptions,
        useViewTransition,
      });
    } else {
      for (const target of targets) {
        executeSwap(target, safeContent, strategy, morphOptions);
      }
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export const createSwapCommand = createFactory(SwapCommand);
export const createMorphCommand = createFactory(MorphCommand);

// Legacy exports for compatibility
export const swapCommand = createSwapCommand();
export const morphCommand = createMorphCommand();

export default SwapCommand;
