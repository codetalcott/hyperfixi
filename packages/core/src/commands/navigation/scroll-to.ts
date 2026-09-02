/**
 * ScrollCommand — `scroll to <target>` (upstream _hyperscript 0.9.90)
 *
 * Replaces the deprecated `go to the top of <element>` scroll form. The
 * legacy form on GoCommand keeps working for compat.
 *
 * Syntax:
 *   scroll to <target>
 *   scroll to top|middle|bottom [of] <target>       (vertical → block)
 *   scroll to left|center|right [of] <target>       (horizontal → inline)
 *   scroll to <target> smoothly|instantly
 *   scroll [<target>] [up|down|left|right] by <n> [px]   (scrollBy)
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { getVariableValue } from '../helpers/variable-access';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import type { CommandRaw } from '../../ast/command-slots';

/**
 * What the parser's slots resolve to (Arc 3 step 3). `offset` set means the
 * `scroll … by <n>` form (scrollBy); otherwise scrollIntoView with the
 * logical `position`.
 */
export interface ScrollCommandInput {
  target: HTMLElement;
  position?: string;
  behavior?: ScrollBehavior;
  direction?: 'up' | 'down' | 'left' | 'right';
  offset?: number;
}

export interface ScrollCommandOutput {
  element: HTMLElement;
  /** The vertical (`block`) position for the into-view form. */
  position: ScrollLogicalPosition;
  /** True only when `smoothly` was given — matching upstream, where no adverb
   *  leaves `behavior` unset (browser default `auto`), not smooth. */
  smooth: boolean;
}

@command({ name: 'scroll' })
export class ScrollCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Scroll an element into view (upstream _hyperscript 0.9.90)',
    syntax: [
      'scroll to <target>',
      'scroll to top of <target>',
      'scroll to <target> smoothly',
      'scroll [<target>] [up|down|left|right] by <n> [px]',
    ],
    examples: [
      'scroll to #top',
      'scroll to bottom of #chat',
      'scroll to me smoothly',
      'scroll down by 200',
    ],
    sideEffects: ['scrolling'],
    category: 'navigation',
    compatibility: 'standard',
  });

  get metadata() {
    return ScrollCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'scroll'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ScrollCommandInput> {
    const m = raw.modifiers;
    const targetNode = m.of ?? raw.args[0];
    const byForm = m.by !== undefined || m.direction !== undefined;
    if (!targetNode && !byForm) {
      throw new Error('scroll command requires a target');
    }
    // `scroll by <n>` with no target scrolls the document, like upstream.
    const target = targetNode
      ? this.resolveTarget(await evaluator.evaluate(targetNode, context), context)
      : typeof document !== 'undefined'
        ? document.documentElement
        : null;
    if (!target) {
      throw new Error('scroll: target element not found');
    }
    const input: ScrollCommandInput = { target };
    const text = async (node: ExpressionNode | undefined) =>
      node ? String(await evaluator.evaluate(node, context)) : undefined;
    const position = await text(m.position);
    if (position) input.position = position;
    const behavior = await text(m.behavior);
    if (behavior === 'smooth' || behavior === 'instant') input.behavior = behavior;
    const direction = await text(m.direction);
    if (
      direction === 'up' ||
      direction === 'down' ||
      direction === 'left' ||
      direction === 'right'
    ) {
      input.direction = direction;
    }
    if (m.by !== undefined) {
      const raw = await evaluator.evaluate(m.by, context);
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/px$/, ''));
      input.offset = Number.isNaN(n) ? 0 : n;
    }
    return input;
  }

  async execute(
    input: ScrollCommandInput,
    _context: TypedExecutionContext
  ): Promise<ScrollCommandOutput> {
    const { target, behavior } = input;
    if (input.offset !== undefined || input.direction !== undefined) {
      return this.executeScrollBy(input);
    }
    const options = this.scrollOptions(input.position);
    if (behavior) options.behavior = behavior;
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView(options);
    }
    return { element: target, position: options.block ?? 'start', smooth: behavior === 'smooth' };
  }

  /**
   * `scroll [<target>] [up|down|left|right] by <n> [px]` — upstream scrolls
   * the target (default: the document element) BY the offset via `scrollBy`,
   * vertical for `up`/`down` (default `down`), horizontal for `left`/`right`.
   */
  private executeScrollBy(input: ScrollCommandInput): ScrollCommandOutput {
    const { target, behavior } = input;
    const direction = input.direction ?? 'down';
    const offset = input.offset ?? 0;
    const options: ScrollToOptions = {
      top: direction === 'up' ? -offset : direction === 'down' ? offset : 0,
      left: direction === 'left' ? -offset : direction === 'right' ? offset : 0,
    };
    if (behavior) options.behavior = behavior;
    if (typeof target.scrollBy === 'function') {
      target.scrollBy(options);
    }
    return { element: target, position: 'start', smooth: behavior === 'smooth' };
  }

  /**
   * Position word → scrollIntoView options, mirroring upstream's
   * `_parseScrollModifiers` maps exactly: defaults `{block:'start',
   * inline:'nearest'}`; the VERTICAL words `top`/`middle`/`bottom` set
   * `block`, the HORIZONTAL words `left`/`center`/`right` set `inline`.
   * `nearest` is hyperfixi's own documented extension, kept on `block`.
   */
  private scrollOptions(position: string | undefined): ScrollIntoViewOptions {
    const options: ScrollIntoViewOptions = { block: 'start', inline: 'nearest' };
    if (position === 'top') options.block = 'start';
    else if (position === 'middle') options.block = 'center';
    else if (position === 'bottom') options.block = 'end';
    else if (position === 'nearest') options.block = 'nearest';
    else if (position === 'left') options.inline = 'start';
    else if (position === 'center') options.inline = 'center';
    else if (position === 'right') options.inline = 'end';
    return options;
  }

  /**
   * The evaluated target: an element, `me`/`it`/`you`, `body`/`html`, a
   * variable holding an element, or a selector string. The document element
   * is the `scroll by` default when nothing names a target.
   */
  private resolveTarget(value: unknown, context: ExecutionContext): HTMLElement | null {
    if (typeof value === 'object' && value && (value as { nodeType?: number }).nodeType) {
      return value as HTMLElement;
    }
    if (typeof value !== 'string') return null;
    if (value === 'me' && isHTMLElement(context.me)) return context.me as HTMLElement;
    if (value === 'it' && isHTMLElement(context.it)) return context.it as HTMLElement;
    if (value === 'you' && isHTMLElement(context.you)) return context.you as HTMLElement;
    if (value === 'body' && typeof document !== 'undefined') return document.body;
    if (value === 'html' && typeof document !== 'undefined') return document.documentElement;
    const variable = getVariableValue(value, context);
    if (isHTMLElement(variable)) return variable as HTMLElement;
    if (typeof document !== 'undefined') {
      try {
        const el = document.querySelector(value);
        if (isHTMLElement(el)) return el as HTMLElement;
      } catch {
        // not a selector
      }
    }
    return null;
  }
}

export const createScrollCommand = createFactory(ScrollCommand);
export default ScrollCommand;
