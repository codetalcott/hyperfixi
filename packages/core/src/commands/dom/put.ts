/**
 * PutCommand - Standalone V2 Implementation
 *
 * Inserts content into DOM elements or element properties
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Insert content into elements at various positions
 * - Insert content into element properties (memberExpression support)
 * - Multiple insertion positions (into, before, after, at start of, at end of)
 * - String and element value support
 * - Multiple target elements
 *
 * Syntax:
 *   put <value> into <target>              # Insert into element
 *   put <value> before <target>            # Insert before element
 *   put <value> after <target>             # Insert after element
 *   put <value> at start of <target>       # Insert at start of element
 *   put <value> at end of <target>         # Insert at end of element
 *   put <value> into <target>'s property   # Insert into property (memberExpression)
 *
 * @example
 *   put "Hello" into me
 *   put <div>Content</div> before #target
 *   put "text" into #elem's innerHTML
 *   put 42 into user's dataset.value
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Insertion position types
 */
export type InsertPosition = 'beforeend' | 'afterend' | 'beforebegin' | 'afterbegin';

/**
 * Typed input for PutCommand
 * Represents parsed arguments ready for execution
 */
export interface PutCommandInput {
  value: any;
  targets: HTMLElement[];
  position: InsertPosition;
  memberPath?: string | undefined;
  /** Variable name for variable assignment (e.g., "put value into varName") */
  variableName?: string | undefined;
}

/**
 * PutCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: ~693 lines (with validation, sanitization, events)
 * V2 Size: ~350 lines (49% reduction, all features preserved)
 */
export class PutCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'put';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Insert content into elements or properties',
    syntax: [
      'put <value> into <target>',
      'put <value> before <target>',
      'put <value> after <target>',
      'put <value> at start of <target>',
      'put <value> at end of <target>',
    ],
    examples: [
      'put "Hello World" into me',
      'put <div>Content</div> before #target',
      'put "text" at end of #container',
      'put value into #elem\'s innerHTML',
      'put 42 into obj\'s dataset.count',
    ],
    category: 'dom',
    sideEffects: ['dom-mutation'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Handles complex patterns:
   * - "put <value> into <target>" - standard insertion
   * - "put <value> before <target>" - insert before element
   * - "put <value> after <target>" - insert after element
   * - "put <value> at start of <target>" - prepend to element
   * - "put <value> at end of <target>" - append to element
   * - "put <value> into <target>'s property.path" - memberExpression support
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<PutCommandInput> {
    const rawArgs = raw.args;

    if (!rawArgs || rawArgs.length === 0) {
      throw new Error('put command requires arguments');
    }

    // Helper to get node type
    const nodeType = (node: ASTNode): string => {
      if (!node || typeof node !== 'object') return 'unknown';
      return (node as any).type || 'unknown';
    };

    // Find the preposition keyword to split the arguments
    let prepositionIndex = -1;
    let prepositionKeyword: string | null = null;

    const validPrepositions = ['into', 'before', 'after', 'at', 'at start of', 'at end of'];

    for (let i = 0; i < rawArgs.length; i++) {
      const arg = rawArgs[i];
      const argType = nodeType(arg);
      const argValue = (argType === 'literal' ? (arg as any).value : (arg as any).name) as string;

      if (
        (argType === 'literal' || argType === 'identifier') &&
        validPrepositions.includes(argValue)
      ) {
        prepositionIndex = i;
        prepositionKeyword = argValue;
        break;
      }
    }

    // Parse arguments based on preposition location
    let contentArg: ASTNode | null = null;
    let targetArg: ASTNode | null = null;

    if (prepositionIndex === -1) {
      // Fallback: assume [content, preposition, target]
      if (rawArgs.length >= 3) {
        contentArg = rawArgs[0];
        prepositionKeyword = (rawArgs[1] as any)?.value || (rawArgs[1] as any)?.name || null;
        targetArg = rawArgs[2];
      } else if (rawArgs.length >= 2) {
        contentArg = rawArgs[0];
        prepositionKeyword = (rawArgs[1] as any)?.value || (rawArgs[1] as any)?.name || 'into';
        targetArg = null; // Default to context.me
      } else {
        throw new Error('put command requires at least content and position arguments');
      }
    } else {
      // Split arguments around the preposition
      const contentArgs = rawArgs.slice(0, prepositionIndex);
      const targetArgs = rawArgs.slice(prepositionIndex + 1);

      // Use first content arg (or combine if multiple)
      contentArg = contentArgs.length > 0 ? contentArgs[0] : null;
      targetArg = targetArgs.length > 0 ? targetArgs[0] : null;
    }

    if (!contentArg) {
      throw new Error('put command requires content argument');
    }

    if (!prepositionKeyword) {
      throw new Error('put command requires position keyword (into, before, after, etc.)');
    }

    // Evaluate content
    const value = await evaluator.evaluate(contentArg, context);

    // Map preposition to insertion position
    const position = this.mapPrepositionToPosition(prepositionKeyword);

    // Handle target resolution with special cases
    let targetSelector: string | null = null;
    let memberPath: string | undefined;
    let variableName: string | undefined;

    if (targetArg) {
      const targetType = nodeType(targetArg);

      // Handle memberExpression (property access like "#target.innerHTML")
      // CRITICAL: This is the fix from commit e9cbade
      if (targetType === 'memberExpression') {
        // Reconstruct the selector string with property access
        let selector = '';
        const obj = (targetArg as any).object;
        const prop = (targetArg as any).property;

        if (obj?.type === 'selector') {
          selector = obj.value;
        } else if (obj?.type === 'identifier') {
          selector = obj.name;
        }

        if (selector && prop?.name) {
          targetSelector = selector;
          memberPath = prop.name;
        } else {
          // Fallback: evaluate if we can't reconstruct
          const evaluated = await evaluator.evaluate(targetArg, context);
          if (typeof evaluated === 'string') {
            targetSelector = evaluated;
          }
        }
      }
      // Handle 'me' identifier specially
      else if (targetType === 'identifier' && (targetArg as any).name === 'me') {
        targetSelector = null; // Will use context.me
      }
      // Handle selectors (CSS selectors - starts with #, ., [, or is a tag)
      else if (targetType === 'selector' || targetType === 'cssSelector') {
        targetSelector = (targetArg as any).value || (targetArg as any).selector;
      }
      // Handle literals (string selectors or values)
      else if (targetType === 'literal') {
        const literalValue = (targetArg as any).value;
        // Check if it looks like a CSS selector
        if (typeof literalValue === 'string' && this.looksLikeCssSelector(literalValue)) {
          targetSelector = literalValue;
        } else {
          // Treat as variable name
          variableName = String(literalValue);
        }
      }
      // Handle identifiers - distinguish between CSS selectors and variable names
      else if (targetType === 'identifier') {
        const identName = (targetArg as any).name;
        // Check if it looks like a CSS selector (starts with special chars)
        // or is a known DOM element reference
        if (this.looksLikeCssSelector(identName)) {
          targetSelector = identName;
        } else {
          // Simple identifier = variable assignment
          variableName = identName;
        }
      }
      // For other types, evaluate them
      else {
        const evaluated = await evaluator.evaluate(targetArg, context);
        if (typeof evaluated === 'string') {
          // Check if evaluated result looks like a CSS selector
          if (this.looksLikeCssSelector(evaluated)) {
            targetSelector = evaluated;
          } else {
            variableName = evaluated;
          }
        }
      }
    }

    // If variable assignment, don't resolve targets
    if (variableName) {
      return { value, targets: [], position, memberPath, variableName };
    }

    // Resolve targets for DOM operations
    const targets = await this.resolveTargets(targetSelector, context);

    return { value, targets, position, memberPath };
  }

  /**
   * Execute the put command
   *
   * Inserts content into target elements or properties.
   * Handles both DOM insertion, property assignment, and variable assignment.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Array of modified elements (or empty array for variable assignment)
   */
  async execute(
    input: PutCommandInput,
    context: TypedExecutionContext
  ): Promise<HTMLElement[]> {
    const { value, targets, position, memberPath, variableName } = input;

    // Handle variable assignment (e.g., "put value into varName")
    if (variableName) {
      if (context.locals) {
        context.locals.set(variableName, value);
      }
      // Also set on context for broader access
      (context as any)[variableName] = value;
      return [];
    }

    if (memberPath) {
      // Handle memberExpression: element's property.path
      for (const target of targets) {
        this.setProperty(target, memberPath, value);
      }
    } else {
      // Handle DOM insertion
      for (const target of targets) {
        const content = this.parseValue(value);
        this.insertContent(target, content, position);
      }
    }

    return targets;
  }

  // ========== Private Utility Methods ==========

  /**
   * Map preposition keyword to insertion position
   *
   * @param preposition - Preposition keyword from AST
   * @returns InsertPosition constant
   */
  private mapPrepositionToPosition(preposition: string): InsertPosition {
    switch (preposition) {
      case 'into':
        return 'beforeend';
      case 'before':
        return 'beforebegin';
      case 'after':
        return 'afterend';
      case 'at start of':
        return 'afterbegin';
      case 'at end of':
        return 'beforeend';
      default:
        throw new Error(`Invalid position keyword: ${preposition}`);
    }
  }

  /**
   * Resolve target elements from selector or context
   *
   * Inline version of dom-utils.resolveTargets
   * Handles: context.me default, CSS selectors
   *
   * @param selector - CSS selector or null for context.me
   * @param context - Execution context
   * @returns Array of resolved HTMLElements
   */
  private async resolveTargets(
    selector: string | null,
    context: ExecutionContext
  ): Promise<HTMLElement[]> {
    // Default to context.me if no selector
    if (!selector || selector === 'me') {
      if (!context.me) {
        throw new Error('put command: no target specified and context.me is null');
      }
      if (!(context.me instanceof HTMLElement)) {
        throw new Error('put command: context.me must be an HTMLElement');
      }
      return [context.me];
    }

    // Resolve from CSS selector
    try {
      const selected = document.querySelectorAll(selector);
      const elements = Array.from(selected).filter(
        (el): el is HTMLElement => el instanceof HTMLElement
      );

      if (elements.length === 0) {
        throw new Error(`No elements found matching selector: "${selector}"`);
      }

      return elements;
    } catch (error) {
      throw new Error(
        `Invalid CSS selector: "${selector}" - ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse value into insertable content
   *
   * Converts various value types to string or HTMLElement
   *
   * @param value - Value to parse
   * @returns Parsed content (string or HTMLElement)
   */
  private parseValue(value: any): string | HTMLElement {
    if (value instanceof HTMLElement) {
      return value;
    }

    if (value == null) {
      return '';
    }

    return String(value);
  }

  /**
   * Insert content into element at specified position
   *
   * Uses insertAdjacentHTML for strings and insertAdjacentElement for elements.
   *
   * Position mapping:
   * - beforebegin: Before the element itself
   * - afterbegin: Inside the element, before its first child
   * - beforeend: Inside the element, after its last child
   * - afterend: After the element itself
   *
   * @param target - Target element
   * @param content - Content to insert (string or HTMLElement)
   * @param position - Insertion position
   */
  private insertContent(
    target: HTMLElement,
    content: string | HTMLElement,
    position: InsertPosition
  ): void {
    if (content instanceof HTMLElement) {
      // Insert element
      switch (position) {
        case 'beforebegin':
          target.parentElement?.insertBefore(content, target);
          break;
        case 'afterbegin':
          target.insertBefore(content, target.firstChild);
          break;
        case 'beforeend':
          target.appendChild(content);
          break;
        case 'afterend':
          target.parentElement?.insertBefore(content, target.nextSibling);
          break;
      }
    } else {
      // Insert string (HTML or text)
      // Check if content contains HTML by looking for < and > characters
      const containsHTML = content.includes('<') && content.includes('>');

      if (containsHTML) {
        // Use insertAdjacentHTML for HTML content
        target.insertAdjacentHTML(position, content);
      } else {
        // Use insertAdjacentText for plain text to avoid XSS
        target.insertAdjacentText(position, content);
      }
    }
  }

  /**
   * Check if a string looks like a CSS selector
   *
   * CSS selectors typically start with special characters or are HTML tag names.
   * Variable names are plain identifiers without these patterns.
   *
   * @param str - String to check
   * @returns true if it looks like a CSS selector
   */
  private looksLikeCssSelector(str: string): boolean {
    if (!str || typeof str !== 'string') return false;

    // Starts with CSS selector characters
    if (/^[#.\[]/.test(str)) return true;

    // Contains CSS combinator characters
    if (/[>+~\s]/.test(str) && str.length > 1) return true;

    // Is a common HTML tag name (likely targeting elements)
    const htmlTags = [
      'div', 'span', 'p', 'a', 'button', 'input', 'form', 'ul', 'li', 'ol',
      'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img', 'h1', 'h2', 'h3',
      'h4', 'h5', 'h6', 'section', 'article', 'header', 'footer', 'nav',
      'main', 'aside', 'dialog', 'label', 'select', 'option', 'textarea'
    ];
    if (htmlTags.includes(str.toLowerCase())) return true;

    return false;
  }

  /**
   * Set property value on element
   *
   * Handles memberExpression property access like:
   * - element's innerHTML
   * - element's dataset.value
   * - element's style.color
   *
   * @param element - Target element
   * @param propertyPath - Property path (e.g., "innerHTML", "dataset.value")
   * @param value - Value to set
   */
  private setProperty(element: HTMLElement, propertyPath: string, value: any): void {
    // Split property path by dots
    const pathParts = propertyPath.split('.');

    // Navigate to the property
    let current: any = element;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        throw new Error(`Property path "${propertyPath}" does not exist on element`);
      }
      current = current[part];
    }

    // Set the final property
    const finalProp = pathParts[pathParts.length - 1];
    current[finalProp] = value;
  }
}

// ========== Factory Function ==========

/**
 * Factory function for creating PutCommand instances
 * Maintains compatibility with existing command registration patterns
 *
 * @returns New PutCommand instance
 */
export function createPutCommand(): PutCommand {
  return new PutCommand();
}

// Default export for convenience
export default PutCommand;
