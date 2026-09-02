/**
 * GoCommand - Decorated Implementation
 *
 * Provides navigation functionality with full support for:
 * - URL navigation: go to url <url> [in new window]
 * - History navigation: go back
 * - Element scrolling: go to [position] [of] <element> [offset] [behavior]
 *
 * Uses Stage 3 decorators for reduced boilerplate.
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
import { isDOMNode } from '../../types/type-guards';
import type { CommandRaw } from '../../parser/command-slots';

/**
 * Typed input for GoCommand
 */
/**
 * What the parser's slots resolve to (Arc 3 step 3).
 */
export type GoCommandInput =
  | { kind: 'back' }
  | { kind: 'forward' }
  | { kind: 'url'; url: string; newWindow: boolean }
  | {
      kind: 'scroll';
      target: HTMLElement;
      position: { vertical: string; horizontal: string };
      offset: number;
      behavior: ScrollBehavior;
    };

/**
 * Output from go command
 */
export interface GoCommandOutput {
  result: string | HTMLElement;
  type: 'back' | 'url' | 'scroll';
}

/**
 * GoCommand - Navigation and scrolling
 *
 * Before: 682 lines
 * After: ~350 lines (49% reduction)
 */
@command({ name: 'go' })
export class GoCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description:
      'Navigation functionality including URL navigation, element scrolling, and browser history',
    syntax: ['go back', 'go to url <url> [in new window]', 'go to [position] [of] <element>'],
    examples: [
      'go back',
      'go to url "https://example.com"',
      'go to url "https://example.com" in new window',
      'go to top of #header',
      'go to bottom of #footer smoothly',
    ],
    sideEffects: ['navigation', 'scrolling'],
    category: 'navigation',
    compatibility: 'standard',
  });

  get metadata() {
    return GoCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'go'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<GoCommandInput> {
    const m = raw.modifiers;
    if (m.back) return { kind: 'back' };
    if (m.forward) return { kind: 'forward' };
    const newWindow = m.in !== undefined;
    if (m.url !== undefined) {
      const url = String(await evaluator.evaluate(m.url, context));
      if (!this.isValidUrl(url)) throw new Error(`Invalid URL: "${url}"`);
      return { kind: 'url', url, newWindow };
    }
    const targetNode = m.of ?? raw.args[0];
    if (!targetNode && !m.position) throw new Error('Go command requires arguments');
    const targetValue = targetNode ? await evaluator.evaluate(targetNode, context) : 'body';
    if (typeof targetValue === 'string' && this.isBareUrl(targetValue) && !m.of && !m.position) {
      return { kind: 'url', url: targetValue, newWindow };
    }
    const target = this.resolveScrollTarget(targetValue, context);
    if (!target) throw new Error(`Target element not found: ${String(targetValue)}`);
    const word = m.position ? String(await evaluator.evaluate(m.position, context)) : undefined;
    const position = { vertical: 'top', horizontal: 'nearest' };
    if (word === 'top' || word === 'middle' || word === 'bottom') position.vertical = word;
    else if (word === 'left' || word === 'center' || word === 'right') {
      position.horizontal = word;
      position.vertical = 'nearest';
    }
    const behaviorWord = m.behavior ? await evaluator.evaluate(m.behavior, context) : undefined;
    const behavior: ScrollBehavior =
      behaviorWord === 'instant' ? ('instant' as ScrollBehavior) : 'smooth';
    let offset = 0;
    if (m.by !== undefined) {
      const n = Number(String(await evaluator.evaluate(m.by, context)).replace(/px$/, ''));
      if (!Number.isNaN(n)) offset = n;
    }
    return { kind: 'scroll', target, position, offset, behavior };
  }

  async execute(input: GoCommandInput, _context: TypedExecutionContext): Promise<GoCommandOutput> {
    if (input.kind === 'back' || input.kind === 'forward') {
      await this.goHistory(input.kind);
      return { result: input.kind, type: 'back' };
    }
    if (input.kind === 'url') {
      this.navigate(input.url, input.newWindow);
      return { result: input.url, type: 'url' };
    }
    const { target, position, offset, behavior } = input;
    if (typeof window !== 'undefined') {
      const block = this.mapVerticalPosition(position.vertical);
      const inline = this.mapHorizontalPosition(position.horizontal);
      target.scrollIntoView?.({ behavior, block, inline });
      if (offset !== 0) {
        const { x, y } = this.calculateScrollPosition(target, position, offset);
        window.scrollTo?.({ left: x, top: y, behavior });
      }
    }
    return { result: target, type: 'scroll' };
  }

  private isBareUrl(s: string): boolean {
    if (s.startsWith('/')) return true;
    return /^[a-z][a-z0-9+.-]*:/i.test(s);
  }

  private navigate(url: string, newWindow: boolean): void {
    if (newWindow) {
      if (typeof window !== 'undefined' && window.open) {
        const opened = window.open(url, '_blank');
        if (opened?.focus) opened.focus();
      }
    } else if (url.startsWith('#')) {
      if (typeof window !== 'undefined') window.location.hash = url;
    } else if (typeof window !== 'undefined') {
      window.location.assign?.(url) ?? (window.location.href = url);
    }
  }

  private async goHistory(direction: 'back' | 'forward'): Promise<void> {
    if (typeof window !== 'undefined' && window.history) {
      if (direction === 'back') window.history.back();
      else window.history.forward();
    } else {
      throw new Error('Browser history API not available');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      if (url.startsWith('/') || url.startsWith('#')) return true;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private mapVerticalPosition(pos: string): ScrollLogicalPosition {
    const map: Record<string, ScrollLogicalPosition> = {
      top: 'start',
      middle: 'center',
      bottom: 'end',
      nearest: 'nearest',
    };
    return map[pos] || 'start';
  }

  private mapHorizontalPosition(pos: string): ScrollLogicalPosition {
    const map: Record<string, ScrollLogicalPosition> = {
      left: 'start',
      center: 'center',
      right: 'end',
      nearest: 'nearest',
    };
    return map[pos] || 'nearest';
  }

  private calculateScrollPosition(
    element: HTMLElement,
    position: { vertical: string; horizontal: string },
    offset: number
  ): { x: number; y: number } {
    if (typeof window === 'undefined' || !element.getBoundingClientRect) return { x: 0, y: 0 };

    const rect = element.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement?.scrollLeft || 0;
    const scrollTop = window.pageYOffset || document.documentElement?.scrollTop || 0;
    const innerWidth = window.innerWidth || 800;
    const innerHeight = window.innerHeight || 600;

    let x = scrollLeft,
      y = scrollTop;

    switch (position.horizontal) {
      case 'left':
        x = rect.left + scrollLeft;
        break;
      case 'center':
        x = rect.left + scrollLeft + rect.width / 2 - innerWidth / 2;
        break;
      case 'right':
        x = rect.right + scrollLeft - innerWidth;
        break;
    }

    switch (position.vertical) {
      case 'top':
        y = rect.top + scrollTop + offset;
        break;
      case 'middle':
        y = rect.top + scrollTop + rect.height / 2 - innerHeight / 2 + offset;
        break;
      case 'bottom':
        y = rect.bottom + scrollTop - innerHeight + offset;
        break;
    }

    return { x: Math.max(0, x), y: Math.max(0, y) };
  }

  private resolveScrollTarget(target: unknown, context: ExecutionContext): HTMLElement | null {
    if (typeof target === 'object' && target && (target as any).nodeType)
      return target as HTMLElement;

    const str = typeof target === 'string' ? target : String(target);

    if (str === 'body' && typeof document !== 'undefined') return document.body;
    if (str === 'html' && typeof document !== 'undefined') return document.documentElement;

    if (str === 'me' && isHTMLElement(context.me)) return context.me as HTMLElement;
    if (str === 'it' && isHTMLElement(context.it)) return context.it as HTMLElement;
    if (str === 'you' && isHTMLElement(context.you)) return context.you as HTMLElement;

    const variable = getVariableValue(str, context);
    if (isHTMLElement(variable)) return variable as HTMLElement;

    if (typeof document !== 'undefined') {
      try {
        const el = document.querySelector(str);
        if (el) return el as HTMLElement;
      } catch {
        try {
          const els = document.getElementsByTagName(str);
          if (els.length > 0) return els[0] as HTMLElement;
        } catch {
          /* ignore */
        }
      }
    }
    return null;
  }
}

export const createGoCommand = createFactory(GoCommand);
export default GoCommand;
