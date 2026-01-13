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
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

/**
 * Typed input for GoCommand
 */
export interface GoCommandInput {
  args: unknown[];
}

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
@meta({
  description:
    'Navigation functionality including URL navigation, element scrolling, and browser history',
  syntax: ['go back', 'go to url <url> [in new window]', 'go to [position] [of] <element>'],
  examples: ['go back', 'go to url "https://example.com"', 'go to top of #header'],
  sideEffects: ['navigation', 'scrolling'],
})
@command({ name: 'go', category: 'navigation' })
export class GoCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<GoCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      return { args: [] };
    }
    const args = await Promise.all(
      raw.args.map((arg: ASTNode) => evaluator.evaluate(arg, context))
    );
    return { args };
  }

  async execute(input: GoCommandInput, context: TypedExecutionContext): Promise<GoCommandOutput> {
    const { args } = input;

    if (args.length === 0) {
      throw new Error('Go command requires arguments');
    }

    // Handle "go back"
    if (typeof args[0] === 'string' && args[0].toLowerCase() === 'back') {
      await this.goBack();
      return { result: 'back', type: 'back' };
    }

    // Handle URL navigation
    if (this.isUrlNavigation(args)) {
      const url = await this.navigateToUrl(args, context);
      return { result: url, type: 'url' };
    }

    // Handle element scrolling
    const element = await this.scrollToElement(args, context);
    return { result: element, type: 'scroll' };
  }

  private isUrlNavigation(args: unknown[]): boolean {
    return args.findIndex(arg => arg === 'url') !== -1;
  }

  private async goBack(): Promise<void> {
    if (typeof window !== 'undefined' && window.history) {
      window.history.back();
    } else {
      throw new Error('Browser history API not available');
    }
  }

  private async navigateToUrl(args: unknown[], context: ExecutionContext): Promise<string> {
    const urlIndex = args.findIndex(arg => arg === 'url');
    const url = args[urlIndex + 1];

    if (!url) {
      throw new Error('URL is required after "url" keyword');
    }

    const resolvedUrl = typeof url === 'string' ? url : String(url);
    const inNewWindow = args.includes('new') && args.includes('window');

    if (!this.isValidUrl(resolvedUrl)) {
      throw new Error(`Invalid URL: "${resolvedUrl}"`);
    }

    if (inNewWindow) {
      if (typeof window !== 'undefined' && window.open) {
        const newWindow = window.open(resolvedUrl, '_blank');
        if (newWindow?.focus) newWindow.focus();
      }
    } else if (resolvedUrl.startsWith('#')) {
      if (typeof window !== 'undefined') window.location.hash = resolvedUrl;
    } else {
      if (typeof window !== 'undefined') {
        window.location.assign?.(resolvedUrl) ?? (window.location.href = resolvedUrl);
      }
    }

    return resolvedUrl;
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

  private async scrollToElement(args: unknown[], context: ExecutionContext): Promise<HTMLElement> {
    const position = this.parseScrollPosition(args);
    const target = this.parseScrollTarget(args);
    const offset = this.parseScrollOffset(args);
    const smooth = !args.includes('instantly');

    const element = this.resolveScrollTarget(target, context);
    if (!element) {
      throw new Error(`Target element not found: ${target}`);
    }

    if (typeof window !== 'undefined') {
      const behavior = smooth ? 'smooth' : 'instant';
      const block = this.mapVerticalPosition(position.vertical);
      const inline = this.mapHorizontalPosition(position.horizontal);

      if (offset !== 0) {
        element.scrollIntoView?.({ behavior: behavior as ScrollBehavior, block, inline });
        const { x, y } = this.calculateScrollPosition(element, position, offset);
        window.scrollTo?.({ left: x, top: y, behavior: behavior as ScrollBehavior });
      } else {
        element.scrollIntoView?.({ behavior: behavior as ScrollBehavior, block, inline });
      }
    }

    return element;
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

  private parseScrollPosition(args: unknown[]): { vertical: string; horizontal: string } {
    const position = { vertical: 'top', horizontal: 'nearest' };
    const vKeys = ['top', 'middle', 'bottom'];
    const hKeys = ['left', 'center', 'right'];
    let hasV = false,
      hasH = false;

    for (const arg of args) {
      if (typeof arg === 'string') {
        if (vKeys.includes(arg)) {
          position.vertical = arg;
          hasV = true;
        } else if (hKeys.includes(arg)) {
          position.horizontal = arg;
          hasH = true;
        }
      }
    }
    if (hasH && !hasV) position.vertical = 'nearest';
    return position;
  }

  private parseScrollTarget(args: unknown[]): string | HTMLElement {
    const ofIndex = args.findIndex(arg => arg === 'of');
    if (ofIndex !== -1 && ofIndex + 1 < args.length) {
      let target = args[ofIndex + 1];
      if (target === 'the' && ofIndex + 2 < args.length) target = args[ofIndex + 2];
      return target as string | HTMLElement;
    }

    for (const arg of args) {
      if (typeof arg === 'object' && arg && (arg as any).nodeType) return arg as HTMLElement;
    }

    const skip = [
      'top',
      'middle',
      'bottom',
      'left',
      'center',
      'right',
      'of',
      'the',
      'to',
      'smoothly',
      'instantly',
    ];
    for (const arg of args) {
      if (
        typeof arg === 'string' &&
        !skip.includes(arg) &&
        (arg.startsWith('#') ||
          arg.startsWith('.') ||
          arg.includes('[') ||
          /^[a-zA-Z][a-zA-Z0-9-]*$/.test(arg))
      ) {
        return arg;
      }
    }
    return 'body';
  }

  private parseScrollOffset(args: unknown[]): number {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === 'string') {
        const match = arg.match(/^([+-]?\d+)(px)?$/);
        if (match) return parseInt(match[1], 10);
      }
      if ((arg === '+' || arg === '-') && i + 1 < args.length) {
        const next = args[i + 1];
        const num = typeof next === 'number' ? next : parseInt(String(next).replace('px', ''), 10);
        if (!isNaN(num)) return arg === '-' ? -num : num;
      }
    }
    return 0;
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
}

export const createGoCommand = createFactory(GoCommand);
export default GoCommand;
