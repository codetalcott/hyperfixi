/**
 * GoCommand V2 - Standalone Implementation (Zero V1 Dependencies)
 *
 * Provides navigation functionality with full support for:
 * - URL navigation: go to url <url> [in new window]
 * - History navigation: go back
 * - Element scrolling: go to [position] [of] <element> [offset] [behavior]
 *
 * Part of Phase 5: Hybrid Tree-Shaking Architecture
 * Week 5 Migration - Complete standalone rewrite with zero V1 dependencies
 */

import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface GoCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Standalone GoCommand V2 - Zero V1 dependencies
 *
 * This implementation completely rewrites go command logic with:
 * - Inlined utilities (zero external dependencies)
 * - parseInput() for AST parsing
 * - execute() for command execution
 * - Type-only imports for tree-shaking
 */
export class GoCommand {
  readonly name = 'go';

  // ============================================================================
  // INLINED UTILITIES (Zero External Dependencies)
  // ============================================================================

  /**
   * Check if URL is valid
   *
   * Handles:
   * - Relative URLs: /, #anchor
   * - Absolute URLs: https://example.com
   *
   * @param url - URL string to validate
   * @returns true if valid URL
   */
  private isValidUrl(url: string): boolean {
    try {
      // Allow relative URLs (starting with /, #) and absolute URLs
      if (url.startsWith('/') || url.startsWith('#')) {
        return true;
      }

      // Check if it's a valid URL
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if arguments match URL navigation pattern
   *
   * Pattern: go to url <url> [in new window]
   *
   * @param args - Evaluated arguments
   * @returns true if URL navigation
   */
  private isUrlNavigation(args: any[]): boolean {
    // Check for "url" keyword
    const urlIndex = args.findIndex(arg => arg === 'url');
    return urlIndex !== -1;
  }

  /**
   * Navigate to URL
   *
   * Handles:
   * - Current window: go to url "https://example.com"
   * - New window: go to url "https://example.com" in new window
   * - Anchor links: go to url "#section"
   *
   * @param args - Evaluated arguments
   * @param context - Execution context
   * @returns URL navigated to
   */
  private async navigateToUrl(args: any[], context: ExecutionContext): Promise<string> {
    const urlIndex = args.findIndex(arg => arg === 'url');
    const url = args[urlIndex + 1];

    if (!url) {
      throw new Error('URL is required after "url" keyword');
    }

    // Check for "in new window" modifier
    const inNewWindow = args.includes('new') && args.includes('window');

    // Resolve URL (could be from context variables)
    const resolvedUrl = this.resolveUrl(url, context);

    // Validate resolved URL
    if (!this.isValidUrl(resolvedUrl)) {
      throw new Error(`Invalid URL: "${resolvedUrl}"`);
    }

    if (inNewWindow) {
      // Open in new window/tab
      if (typeof window !== 'undefined' && window.open) {
        const newWindow = window.open(resolvedUrl, '_blank');
        if (newWindow && newWindow.focus) {
          newWindow.focus();
        }
      }
    } else {
      // Handle anchor navigation (hash-only URLs)
      if (resolvedUrl.startsWith('#')) {
        if (typeof window !== 'undefined' && window.location) {
          window.location.hash = resolvedUrl;
        }
      } else {
        // Navigate in current window using assign method
        if (typeof window !== 'undefined' && window.location && window.location.assign) {
          window.location.assign(resolvedUrl);
        } else if (typeof window !== 'undefined' && window.location) {
          window.location.href = resolvedUrl;
        }
      }
    }

    return resolvedUrl;
  }

  /**
   * Resolve URL from string or context variable
   *
   * @param url - URL value
   * @param context - Execution context
   * @returns Resolved URL string
   */
  private resolveUrl(url: unknown, context: ExecutionContext): string {
    // If URL is a string, return it
    if (typeof url === 'string') {
      return url;
    }

    return String(url);
  }

  /**
   * Navigate back in browser history
   *
   * @param context - Execution context
   * @returns "back" string
   */
  private async goBack(context: ExecutionContext): Promise<string> {
    if (typeof window !== 'undefined' && window.history) {
      window.history.back();
    } else {
      throw new Error('Browser history API not available');
    }

    return 'back';
  }

  /**
   * Scroll to element
   *
   * Handles:
   * - Position: top, middle, bottom (vertical); left, center, right (horizontal)
   * - Offset: +100px, -50, etc.
   * - Behavior: smooth (default), instant
   *
   * @param args - Evaluated arguments
   * @param context - Execution context
   * @returns Target element
   */
  private async scrollToElement(args: any[], context: ExecutionContext): Promise<HTMLElement> {
    const position = this.parseScrollPosition(args);
    const target = this.parseScrollTarget(args);
    const offset = this.parseScrollOffset(args);
    const smooth = this.parseScrollBehavior(args);

    // Resolve target element
    const element = this.resolveScrollTarget(target, context);
    if (!element) {
      throw new Error(`Target element not found: ${target}`);
    }

    // Perform scroll
    if (typeof window !== 'undefined') {
      const behavior = smooth ? 'smooth' : 'instant';

      // Map position to scrollIntoView options
      let block: ScrollLogicalPosition = 'start';
      let inline: ScrollLogicalPosition = 'nearest';

      switch (position.vertical) {
        case 'top':
          block = 'start';
          break;
        case 'middle':
          block = 'center';
          break;
        case 'bottom':
          block = 'end';
          break;
        case 'nearest':
          block = 'nearest';
          break;
        default:
          block = 'start';
          break;
      }

      switch (position.horizontal) {
        case 'left':
          inline = 'start';
          break;
        case 'center':
          inline = 'center';
          break;
        case 'right':
          inline = 'end';
          break;
        case 'nearest':
        default:
          inline = 'nearest';
          break;
      }

      // For scrolling with offsets, calculate position and use scrollTo
      if (offset !== 0) {
        // Still call scrollIntoView first to handle basic positioning
        if (element.scrollIntoView) {
          element.scrollIntoView({
            behavior: behavior as ScrollBehavior,
            block,
            inline,
          });
        }

        // Then adjust with scrollTo for offset
        if (window.scrollTo) {
          const { x, y } = this.calculateScrollPosition(element, position, offset);
          window.scrollTo({
            left: x,
            top: y,
            behavior: behavior as ScrollBehavior,
          });
        }
      } else {
        // For basic element scrolling, use scrollIntoView
        if (element.scrollIntoView) {
          element.scrollIntoView({
            behavior: behavior as ScrollBehavior,
            block,
            inline,
          });
        }
      }
    }

    return element;
  }

  /**
   * Parse scroll position from arguments
   *
   * Looks for: top, middle, bottom, left, center, right
   *
   * @param args - Evaluated arguments
   * @returns Position object {vertical, horizontal}
   */
  private parseScrollPosition(args: any[]): { vertical: string; horizontal: string } {
    const position = { vertical: 'top', horizontal: 'nearest' }; // Default values

    // Look for position keywords
    const verticalKeywords = ['top', 'middle', 'bottom'];
    const horizontalKeywords = ['left', 'center', 'right'];

    let hasVerticalKeyword = false;
    let hasHorizontalKeyword = false;

    for (const arg of args) {
      if (typeof arg === 'string') {
        if (verticalKeywords.includes(arg)) {
          position.vertical = arg;
          hasVerticalKeyword = true;
        } else if (horizontalKeywords.includes(arg)) {
          position.horizontal = arg;
          hasHorizontalKeyword = true;
        }
      }
    }

    // If only horizontal positioning is specified, use 'nearest' for vertical
    if (hasHorizontalKeyword && !hasVerticalKeyword) {
      position.vertical = 'nearest';
    }

    return position;
  }

  /**
   * Parse scroll target from arguments
   *
   * Looks for:
   * - After "of" keyword: go to top of <element>
   * - Direct element: go to <element>
   * - After "the" keyword: go to the <element>
   *
   * @param args - Evaluated arguments
   * @returns Target identifier
   */
  private parseScrollTarget(args: any[]): string | HTMLElement {
    // Find target after "of" keyword
    const ofIndex = args.findIndex(arg => arg === 'of');
    if (ofIndex !== -1 && ofIndex + 1 < args.length) {
      let targetArg = args[ofIndex + 1];

      // Skip "the" keyword if it appears right after "of"
      if (targetArg === 'the' && ofIndex + 2 < args.length) {
        targetArg = args[ofIndex + 2];
      }

      return targetArg;
    }

    // Handle direct element arguments (not strings)
    for (const arg of args) {
      if (typeof arg === 'object' && arg && (arg as any).nodeType) {
        // This is likely an HTMLElement
        return arg;
      }
    }

    // Handle "the" keyword - skip it and get next argument that's not a position keyword
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'the' && i + 1 < args.length) {
        const next = args[i + 1];
        if (
          typeof next === 'string' &&
          next !== 'top' &&
          next !== 'middle' &&
          next !== 'bottom' &&
          next !== 'left' &&
          next !== 'center' &&
          next !== 'right' &&
          next !== 'of'
        ) {
          return next;
        }
      }
    }

    // Look for selector-like arguments or element names (skip position keywords)
    const positionKeywords = [
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
        !positionKeywords.includes(arg) &&
        (arg.startsWith('#') ||
          arg.startsWith('.') ||
          arg.includes('[') ||
          /^[a-zA-Z][a-zA-Z0-9-]*$/.test(arg)) // Allow hyphens in element names
      ) {
        return arg;
      }
    }

    return 'body'; // Default to body
  }

  /**
   * Parse scroll offset from arguments
   *
   * Looks for: +100px, -50, +25, etc.
   *
   * @param args - Evaluated arguments
   * @returns Offset in pixels
   */
  private parseScrollOffset(args: any[]): number {
    // Look for +/- number patterns
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === 'string') {
        const match = arg.match(/^([+-]?\d+)(px)?$/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
      // Also check for separate + or - followed by number
      if ((arg === '+' || arg === '-') && i + 1 < args.length) {
        const nextArg = args[i + 1];
        if (typeof nextArg === 'number') {
          return arg === '-' ? -nextArg : nextArg;
        }
        if (typeof nextArg === 'string') {
          const num = parseInt(nextArg.replace('px', ''), 10);
          if (!isNaN(num)) {
            return arg === '-' ? -num : num;
          }
        }
      }
    }
    return 0;
  }

  /**
   * Parse scroll behavior from arguments
   *
   * Looks for: smoothly (default), instantly
   *
   * @param args - Evaluated arguments
   * @returns true for smooth, false for instant
   */
  private parseScrollBehavior(args: any[]): boolean {
    if (args.includes('instantly')) {
      return false; // instant scrolling
    }
    return true; // smooth by default, or if 'smoothly' is specified
  }

  /**
   * Resolve scroll target to HTMLElement
   *
   * Handles:
   * - Direct HTMLElement objects
   * - Special elements: body, html
   * - Context references: me, it, you
   * - Variables
   * - CSS selectors
   * - Tag names
   *
   * @param target - Target identifier
   * @param context - Execution context
   * @returns Resolved element or null
   */
  private resolveScrollTarget(
    target: unknown,
    context: ExecutionContext
  ): HTMLElement | null {
    // Handle direct HTMLElement objects
    if (typeof target === 'object' && target && (target as any).nodeType) {
      return target as HTMLElement;
    }

    // Handle string targets
    if (typeof target !== 'string') {
      target = String(target);
    }

    // Handle special element names
    if (target === 'body' && typeof document !== 'undefined') {
      return document.body;
    }
    if (target === 'html' && typeof document !== 'undefined') {
      return document.documentElement;
    }

    // Handle context references
    if (target === 'me' && isHTMLElement(context.me)) {
      return context.me as HTMLElement;
    } else if (target === 'it' && isHTMLElement(context.it)) {
      return context.it as HTMLElement;
    } else if (target === 'you' && isHTMLElement(context.you)) {
      return context.you as HTMLElement;
    }

    // Handle variable references
    const variable = this.getVariableValue(String(target), context);
    if (isHTMLElement(variable)) {
      return variable as HTMLElement;
    }

    // Handle CSS selectors and tag names
    if (typeof document !== 'undefined') {
      try {
        // Try as CSS selector first
        const element = document.querySelector(target as string);
        if (element) {
          return element as HTMLElement;
        }
      } catch (error) {
        // If selector fails, try as tag name
        try {
          const elements = document.getElementsByTagName(target as string);
          if (elements.length > 0) {
            return elements[0] as HTMLElement;
          }
        } catch (e) {
          // Ignore tag name errors
        }
      }
    }

    return null;
  }

  /**
   * Calculate scroll position with offset
   *
   * @param element - Target element
   * @param position - Position {vertical, horizontal}
   * @param offset - Offset in pixels
   * @returns Coordinates {x, y}
   */
  private calculateScrollPosition(
    element: HTMLElement,
    position: { vertical: string; horizontal: string },
    offset: number
  ): { x: number; y: number } {
    // Default values for test environment
    let x = 0;
    let y = 0;

    if (typeof window !== 'undefined' && element.getBoundingClientRect) {
      const rect = element.getBoundingClientRect();
      const scrollLeft =
        window.pageXOffset ||
        (document.documentElement && document.documentElement.scrollLeft) ||
        0;
      const scrollTop =
        window.pageYOffset ||
        (document.documentElement && document.documentElement.scrollTop) ||
        0;
      const innerWidth = window.innerWidth || 800; // Default width for testing
      const innerHeight = window.innerHeight || 600; // Default height for testing

      x = scrollLeft;
      y = scrollTop;

      // Calculate horizontal position
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

      // Calculate vertical position
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
    }

    return { x: Math.max(0, x), y: Math.max(0, y) };
  }

  /**
   * Get variable value from execution context
   *
   * @param name - Variable name
   * @param context - Execution context
   * @returns Variable value or undefined
   */
  private getVariableValue(name: string, context: ExecutionContext): unknown {
    // Check local variables first
    if (context.locals && context.locals.has(name)) {
      return context.locals.get(name);
    }

    // Check global variables
    if (context.globals && context.globals.has(name)) {
      return context.globals.get(name);
    }

    // Check general variables
    if (context.variables && context.variables.has(name)) {
      return context.variables.get(name);
    }

    return undefined;
  }

  // ============================================================================
  // COMMAND INTERFACE
  // ============================================================================

  /**
   * Parse raw AST input into evaluated arguments
   *
   * Go command syntax patterns:
   * - "go back" - Browser history navigation
   * - "go to url <url> [in new window]" - URL navigation
   * - "go to [position] [of] <element> [offset] [behavior]" - Element scrolling
   *
   * The GoCommand's execute method handles the complex pattern matching internally.
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Array of evaluated arguments for execute()
   */
  async parseInput(
    raw: GoCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any[]> {
    if (!raw.args || raw.args.length === 0) {
      return [];
    }

    // Evaluate all arguments - the GoCommand handles complex pattern matching
    const evaluatedArgs = await Promise.all(
      raw.args.map((arg: ASTNode) => evaluator.evaluate(arg, context))
    );

    return evaluatedArgs;
  }

  /**
   * Execute the go command
   *
   * Handles three patterns:
   * 1. go back - Navigate browser history
   * 2. go to url <url> [in new window] - URL navigation
   * 3. go to [position] [of] <element> [offset] [behavior] - Element scrolling
   *
   * @param args - Evaluated arguments from parseInput()
   * @param context - Execution context
   * @returns URL string, "back", or target element
   */
  async execute(args: any[], context: ExecutionContext): Promise<string | HTMLElement> {
    if (args.length === 0) {
      throw new Error('Go command requires arguments');
    }

    // Handle "go back" command (case insensitive)
    if (typeof args[0] === 'string' && args[0].toLowerCase() === 'back') {
      return await this.goBack(context);
    }

    // Handle URL navigation
    if (this.isUrlNavigation(args)) {
      return await this.navigateToUrl(args, context);
    }

    // Handle element scrolling
    return await this.scrollToElement(args, context);
  }

  // ============================================================================
  // METADATA
  // ============================================================================

  static metadata = {
    description:
      'Provides navigation functionality including URL navigation, element scrolling, and browser history management',
    syntax:
      'go [to] url <url> [in new window] | go [to] [position] [of] <target> [offset] [behavior] | go back',
    examples: [
      'go to url "https://example.com"',
      'go back',
      'go to top of <#header/>',
      'go to url "https://example.com" in new window',
      'go to middle of <.content/>',
      'go to bottom of <#footer/> +100px smoothly',
    ],
    category: 'navigation',
  };
}

/**
 * Factory function for creating GoCommand instances
 * Maintains compatibility with existing command registration
 */
export function createGoCommand(): GoCommand {
  return new GoCommand();
}
