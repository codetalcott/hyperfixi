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
import type { CommandRaw } from '../../parser/command-slots';

export interface ScrollCommandInput {
  args: unknown[];
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
    if (!raw.args || raw.args.length === 0) {
      throw new Error('scroll command requires a target');
    }
    const args = await Promise.all(raw.args.map(arg => evaluator.evaluate(arg, context)));
    return { args };
  }

  async execute(
    input: ScrollCommandInput,
    context: TypedExecutionContext
  ): Promise<ScrollCommandOutput> {
    const { args } = input;

    // `behavior` is set ONLY when an adverb was given — upstream leaves it
    // unset otherwise (browser default `auto`). Always defaulting to
    // `smooth` force-animated every `scroll to <target>`.
    const behavior: ScrollBehavior | undefined = args.includes('smoothly')
      ? 'smooth'
      : args.includes('instantly')
        ? ('instant' as ScrollBehavior)
        : undefined;

    if (args.includes('by')) {
      return this.executeScrollBy(args, behavior, context);
    }

    const options = this.parseScrollOptions(args);
    if (behavior) options.behavior = behavior;
    const target = this.resolveTarget(args, context);

    if (!target) {
      throw new Error('scroll: target element not found');
    }

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
  private async executeScrollBy(
    args: unknown[],
    behavior: ScrollBehavior | undefined,
    context: ExecutionContext
  ): Promise<ScrollCommandOutput> {
    const direction =
      (args.find(a => a === 'up' || a === 'down' || a === 'left' || a === 'right') as
        string | undefined) ?? 'down';
    const offset = this.parseByOffset(args);
    const target =
      this.resolveTarget(args, context) ??
      (typeof document !== 'undefined' ? document.documentElement : null);

    if (!target) {
      throw new Error('scroll: target element not found');
    }

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
   * Position words → scrollIntoView options, mirroring upstream's
   * `_parseScrollModifiers` maps exactly: defaults `{block:'start',
   * inline:'nearest'}`; the VERTICAL words `top`/`middle`/`bottom` set
   * `block`, the HORIZONTAL words `left`/`center`/`right` set `inline`.
   * (`center` used to land on `block`, and the horizontal words were
   * otherwise dropped — so `scroll to the right of #chat` scrolled to the
   * top.) `nearest` is hyperfixi's own documented extension, kept on `block`.
   */
  private parseScrollOptions(args: unknown[]): ScrollIntoViewOptions {
    const options: ScrollIntoViewOptions = { block: 'start', inline: 'nearest' };
    for (const a of args) {
      if (a === 'top') options.block = 'start';
      else if (a === 'middle') options.block = 'center';
      else if (a === 'bottom') options.block = 'end';
      else if (a === 'nearest') options.block = 'nearest';
      else if (a === 'left') options.inline = 'start';
      else if (a === 'center') options.inline = 'center';
      else if (a === 'right') options.inline = 'end';
    }
    return options;
  }

  /** Offset for the `by` form: a number literal, or an `"<n>px"` string when
   *  the unit was written adjacent (`50px`). A preceding `-` sign negates. */
  private parseByOffset(args: unknown[]): number {
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      const sign = args[i - 1] === '-' ? -1 : 1;
      if (typeof a === 'number') return sign * a;
      if (typeof a === 'string') {
        const m = /^(-?\d+(?:\.\d+)?)px$/.exec(a);
        if (m) return sign * parseFloat(m[1]);
      }
    }
    return 0;
  }

  /**
   * Resolve the scroll target from the arg list. Skips position/behavior
   * keywords (`to`, `of`, `the`, `top`, `bottom`, `middle`, `center`,
   * `smoothly`, `instantly`) and returns the first real target — an HTML
   * element, a context reference (`me`/`it`/`you`), a local variable, or
   * a CSS selector string.
   */
  private resolveTarget(args: unknown[], context: ExecutionContext): HTMLElement | null {
    const skip = new Set([
      'to',
      'of',
      'the',
      'top',
      'bottom',
      'middle',
      'center',
      'left',
      'right',
      'nearest',
      'smoothly',
      'instantly',
      // Structural words `parseScrollCommand` emits that carry no target:
      // `in` introduces the CONTAINER (not modelled here — see
      // docs-internal/PARSER_NEXT_STEPS.md), `px` follows an offset, and
      // `up`/`down`/`by` belong to the scrollBy form.
      'in',
      'px',
      'up',
      'down',
      'by',
    ]);

    for (const a of args) {
      if (typeof a === 'object' && a && (a as { nodeType?: number }).nodeType) {
        return a as HTMLElement;
      }
      if (typeof a !== 'string' || skip.has(a)) continue;

      if (a === 'me' && isHTMLElement(context.me)) return context.me as HTMLElement;
      if (a === 'it' && isHTMLElement(context.it)) return context.it as HTMLElement;
      if (a === 'you' && isHTMLElement(context.you)) return context.you as HTMLElement;
      if (a === 'body' && typeof document !== 'undefined') return document.body;
      if (a === 'html' && typeof document !== 'undefined') return document.documentElement;

      const variable = getVariableValue(a, context);
      if (isHTMLElement(variable)) return variable as HTMLElement;

      if (typeof document !== 'undefined') {
        try {
          const el = document.querySelector(a);
          if (el) return el as HTMLElement;
        } catch {
          try {
            const els = document.getElementsByTagName(a);
            if (els.length > 0) return els[0] as HTMLElement;
          } catch {
            /* ignore */
          }
        }
      }
    }
    return null;
  }
}

export const createScrollCommand = createFactory(ScrollCommand);
export default ScrollCommand;
