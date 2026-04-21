/**
 * ScrollCommand — `scroll to <target>` (upstream _hyperscript 0.9.90)
 *
 * Replaces the deprecated `go to the top of <element>` scroll form. The
 * legacy form on GoCommand keeps working for compat.
 *
 * Syntax:
 *   scroll to <target>
 *   scroll to top|middle|bottom [of] <target>
 *   scroll to <target> smoothly|instantly
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { getVariableValue } from '../helpers/variable-access';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

export interface ScrollCommandInput {
  args: unknown[];
}

export interface ScrollCommandOutput {
  element: HTMLElement;
  position: ScrollLogicalPosition;
  smooth: boolean;
}

@meta({
  description: 'Scroll an element into view (upstream _hyperscript 0.9.90)',
  syntax: ['scroll to <target>', 'scroll to top of <target>', 'scroll to <target> smoothly'],
  examples: ['scroll to #top', 'scroll to bottom of #chat', 'scroll to me smoothly'],
  sideEffects: ['scrolling'],
})
@command({ name: 'scroll', category: 'navigation' })
export class ScrollCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
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
    const position = this.parsePosition(args);
    const smooth = !args.includes('instantly');
    const target = this.resolveTarget(args, context);

    if (!target) {
      throw new Error('scroll: target element not found');
    }

    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({
        block: position,
        behavior: (smooth ? 'smooth' : 'instant') as ScrollBehavior,
      });
    }

    return { element: target, position, smooth };
  }

  private parsePosition(args: unknown[]): ScrollLogicalPosition {
    for (const a of args) {
      if (a === 'top') return 'start';
      if (a === 'bottom') return 'end';
      if (a === 'middle' || a === 'center') return 'center';
      if (a === 'nearest') return 'nearest';
    }
    return 'start';
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
