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
  executeSwapWithTransition,
  extractContent,
  STRATEGY_KEYWORDS,
  type SwapStrategy,
} from '../../lib/swap-executor';
import type { MorphOptions } from '../../lib/morph-adapter';
import { isHTMLElement } from '../../utils/element-check';
import { isNodeOfKind } from '../../ast/guards';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import type { CommandRaw } from '../../ast/command-slots';

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

/** The text of a literal/string/identifier node, for a word carried as a slot. */
function literalText(node: unknown): string | undefined {
  if (isNodeOfKind(node, 'literal') && typeof node.value === 'string') return node.value;
  if (isNodeOfKind(node, 'string')) return node.value;
  if (isNodeOfKind(node, 'identifier')) return node.name;
  return undefined;
}

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
@command({ name: 'swap' })
export class SwapCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
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
    category: 'dom',
    compatibility: 'standard',
  });

  get metadata() {
    return SwapCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'swap' | 'morph'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SwapCommandInput> {
    const args = raw.args ?? [];
    const modifiers = raw.modifiers ?? {};
    if (args.length === 0) {
      throw new Error('[HyperFixi] swap: command requires arguments');
    }

    // The parser carries every syntactic decision as a slot (Arc 3 step 3):
    // `modifiers.strategy` (the strategy word), `modifiers.with` (the content),
    // `modifiers.viewTransition` (the tail), and the target as the one
    // positional argument. The semantic front-end's shape — positional
    // `[method, destination, patient]` — is read by the fallback below, as it
    // always was; only the traditional path changed spelling.
    const strategyWord = literalText(modifiers.strategy)?.toLowerCase();
    let strategy: SwapStrategy = (strategyWord && STRATEGY_KEYWORDS[strategyWord]) || 'morph';
    const useViewTransition = modifiers.viewTransition !== undefined;

    let targetNode: ASTNode | undefined;
    let contentNode: ASTNode | undefined;
    if (modifiers.with !== undefined || args.length === 1) {
      targetNode = args[0];
      contentNode = modifiers.with as ASTNode | undefined;
    } else {
      // Front-end shape: an optional leading method literal, then the target
      // and the content.
      const lead = literalText(args[0])?.toLowerCase();
      if (args.length >= 3 && lead && STRATEGY_KEYWORDS[lead]) strategy = STRATEGY_KEYWORDS[lead];
      targetNode = args[args.length - 2];
      contentNode = args[args.length - 1];
    }

    // Variable swap (upstream _hyperscript setters.js:210): `swap a with b`
    // exchanges two local variable values when both operands are plain
    // identifiers, neither is a read-only context reference, and no strategy
    // was given. Otherwise it is a DOM swap.
    if (strategy === 'morph' && !strategyWord && isNodeOfKind(targetNode, 'identifier')) {
      const RESERVED = new Set(['me', 'you', 'it', 'result', 'window', 'document']);
      const leftName = targetNode.name;
      const rightName = isNodeOfKind(contentNode, 'identifier') ? contentNode.name : undefined;
      if (
        rightName !== undefined &&
        !RESERVED.has(leftName.toLowerCase()) &&
        !RESERVED.has(rightName.toLowerCase()) &&
        !STRATEGY_KEYWORDS[leftName.toLowerCase()]
      ) {
        return { variant: 'variable', leftName, rightName };
      }
    }

    if (!targetNode || (!contentNode && strategy !== 'delete')) {
      throw new Error(
        '[HyperFixi] swap: could not parse arguments. Expected "swap <target> with <content>"'
      );
    }

    const targetArg: unknown = isNodeOfKind(targetNode, 'selector')
      ? targetNode.value
      : await evaluator.evaluate(targetNode, context);
    const contentArg: unknown = contentNode ? await evaluator.evaluate(contentNode, context) : null;

    if (isHTMLElement(targetArg)) {
      return {
        targets: [targetArg as HTMLElement],
        content: extractContent(contentArg),
        strategy,
        morphOptions: { preserveChanges: true },
        useViewTransition,
      };
    }
    const targets = await resolveTargets(typeof targetArg === 'string' ? targetArg : null, context);
    return {
      targets,
      content: extractContent(contentArg),
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
@command({ name: 'morph' })
export class MorphCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Morph content into target elements (intelligent diffing, preserves state)',
    syntax: [
      'morph <target> with <content>',
      'morph over <target> with <content>',
      'morph <target> with <content> using view transition',
    ],
    examples: ['morph #target with it', 'morph over #modal with fetchedContent'],
    sideEffects: ['dom-mutation'],
    category: 'dom',
    compatibility: 'standard',
  });

  get metadata() {
    return MorphCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'swap' | 'morph'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SwapCommandInput> {
    const args = raw.args ?? [];
    const modifiers = raw.modifiers ?? {};
    if (args.length === 0 && modifiers.with === undefined) {
      throw new Error('[HyperFixi] morph: command requires arguments');
    }

    // Slots from the parser (Arc 3 step 3): `modifiers.strategy` is `over`
    // for the outer form, `modifiers.with` the content, `modifiers.viewTransition`
    // the tail, and the target is the one positional argument. The front-end
    // emits `args: [source]` with the target under `modifiers.on`; both are
    // read here.
    const strategy: SwapStrategy =
      literalText(modifiers.strategy)?.toLowerCase() === 'over' ? 'morphOuter' : 'morph';
    const useViewTransition = modifiers.viewTransition !== undefined;

    const targetNode: ASTNode | undefined =
      modifiers.on !== undefined ? (modifiers.on as ASTNode) : args[0];
    const contentNode: ASTNode | undefined =
      modifiers.with !== undefined
        ? (modifiers.with as ASTNode)
        : modifiers.on !== undefined
          ? args[0]
          : args[1];
    if (!targetNode || !contentNode) {
      throw new Error('[HyperFixi] morph: could not determine target');
    }

    const targetArg: unknown = isNodeOfKind(targetNode, 'selector')
      ? targetNode.value
      : await evaluator.evaluate(targetNode, context);
    const contentArg: unknown = contentNode ? await evaluator.evaluate(contentNode, context) : null;
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
    await executeSwapWithTransition(targets, content ?? null, strategy, {
      morphOptions,
      useViewTransition,
    });
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
