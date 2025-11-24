/**
 * AddCommand - Standalone V2 Implementation
 *
 * Adds CSS classes to HTML elements
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * **Scope**: CSS classes only (most common use case)
 * **Not included**: Attributes, inline styles (can be added in future if needed)
 *
 * Syntax:
 *   add .active                     # Add single class to me
 *   add .active to <target>         # Add single class to target
 *   add "active selected"           # Add multiple classes
 *   add .active .selected           # Add multiple classes
 *
 * @example
 *   add .highlighted to me
 *   add "active selected" to <button/>
 *   add .loading to #submit-btn
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for AddCommand
 * Represents parsed arguments ready for execution
 */
export type AddCommandInput =
  | {
      type: 'classes';
      classes: string[];
      targets: HTMLElement[];
    }
  | {
      type: 'attribute';
      name: string;
      value: string;
      targets: HTMLElement[];
    }
  | {
      type: 'styles';
      styles: Record<string, string>;
      targets: HTMLElement[];
    };

/**
 * AddCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining resolveTargets and parseClasses utilities.
 *
 * V1 Size: 681 lines (with attributes, styles, validation, events)
 * V2 Size: ~180 lines (CSS classes only, 73% reduction)
 */
export class AddCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'add';

  /**
   * Command metadata for documentation and tooling
   */
  readonly metadata = {
    description: 'Add CSS classes to elements',
    syntax: 'add <classes> [to <target>]',
    examples: [
      'add .active to me',
      'add "active selected" to <button/>',
      'add .highlighted to #modal',
    ],
    category: 'DOM',
    sideEffects: ['dom-mutation'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Detects input type (classes, attributes, or styles) and parses accordingly.
   *
   * Supports:
   * - Classes: add .active, add "class1 class2"
   * - Attributes: add @data-x="value", add [@attr="value"]
   * - Styles: add { opacity: 0.5 }, add *opacity="0.5"
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
  ): Promise<AddCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('add command requires an argument');
    }

    // First arg determines the type
    const firstArg = raw.args[0];

    // Handle CSS selector nodes directly without evaluation
    // For "add .active", .active is a selector node with value='.active'
    // not evaluated as a DOM query (which would return an empty NodeList)
    let firstValue: unknown;
    const argValue = firstArg['value'];
    if (
      (firstArg.type === 'selector' || firstArg.type === 'cssSelector' || firstArg.type === 'classSelector') &&
      typeof argValue === 'string' &&
      argValue.startsWith('.')
    ) {
      // Use value directly for class names (includes the leading dot)
      firstValue = argValue;
    } else {
      firstValue = await evaluator.evaluate(firstArg, context);
    }

    // Detect input type based on first argument

    // Check for object literal (inline styles)
    if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue)) {
      const styles = firstValue as Record<string, string>;
      const targetArgs = raw.args.slice(1);
      const targets = await this.resolveTargets(targetArgs, evaluator, context);
      return { type: 'styles', styles, targets };
    }

    // Check for string-based patterns
    if (typeof firstValue === 'string') {
      const trimmed = firstValue.trim();

      // Attribute syntax: [@attr="value"] or @attr
      if (this.isAttributeSyntax(trimmed)) {
        const { name, value } = this.parseAttribute(trimmed);
        const targetArgs = raw.args.slice(1);
        const targets = await this.resolveTargets(targetArgs, evaluator, context);
        return { type: 'attribute', name, value, targets };
      }

      // CSS property shorthand: *property
      if (trimmed.startsWith('*')) {
        const property = trimmed.substring(1);
        // Next arg should be the value
        if (raw.args.length < 2) {
          throw new Error('add *property requires a value argument');
        }
        const valueArg = await evaluator.evaluate(raw.args[1], context);
        const styles = { [property]: String(valueArg) };
        const targetArgs = raw.args.slice(2);
        const targets = await this.resolveTargets(targetArgs, evaluator, context);
        return { type: 'styles', styles, targets };
      }
    }

    // Default: class names
    const classes = this.parseClasses(firstValue);
    if (classes.length === 0) {
      throw new Error('add command: no valid class names found');
    }

    const targetArgs = raw.args.slice(1);
    const targets = await this.resolveTargets(targetArgs, evaluator, context);

    return { type: 'classes', classes, targets };
  }

  /**
   * Execute the add command
   *
   * Adds CSS classes, attributes, or inline styles to all target elements.
   *
   * @param input - Typed command input from parseInput()
   * @param _context - Typed execution context (unused but required by interface)
   * @returns void (command performs side effects)
   */
  execute(
    input: AddCommandInput,
    _context: TypedExecutionContext
  ): void {
    // Handle different input types using discriminated union
    switch (input.type) {
      case 'classes':
        // Add CSS classes
        for (const element of input.targets) {
          for (const className of input.classes) {
            // Only add if not already present
            if (!element.classList.contains(className)) {
              element.classList.add(className);
            }
          }
        }
        break;

      case 'attribute':
        // Add HTML attribute
        for (const element of input.targets) {
          element.setAttribute(input.name, input.value);
        }
        break;

      case 'styles':
        // Add inline styles
        for (const element of input.targets) {
          for (const [property, value] of Object.entries(input.styles)) {
            // Use setProperty for type-safe style assignment (handles both kebab-case and camelCase)
            element.style.setProperty(property, value);
          }
        }
        break;
    }
  }

  /**
   * Validate parsed input (optional but recommended)
   *
   * Runtime validation to catch parsing errors early.
   *
   * @param input - Input to validate
   * @returns true if input is valid AddCommandInput
   */
  validate(input: unknown): input is AddCommandInput {
    if (typeof input !== 'object' || input === null) return false;

    const typed = input as Partial<AddCommandInput>;

    // Check type discriminator
    if (!typed.type || !['classes', 'attribute', 'styles'].includes(typed.type)) {
      return false;
    }

    // Validate targets (required for all types)
    if (!Array.isArray(typed.targets)) return false;
    if (typed.targets.length === 0) return false; // Must have at least one target
    if (!typed.targets.every(t => t instanceof HTMLElement)) return false;

    // Type-specific validation
    if (typed.type === 'classes') {
      const classInput = input as Partial<{ type: 'classes'; classes: unknown; targets: unknown }>;
      if (!Array.isArray(classInput.classes)) return false;
      if (classInput.classes.length === 0) return false;
      if (!classInput.classes.every(c => typeof c === 'string' && c.length > 0)) return false;
    } else if (typed.type === 'attribute') {
      const attrInput = input as Partial<{ type: 'attribute'; name: unknown; value: unknown; targets: unknown }>;
      if (typeof attrInput.name !== 'string' || attrInput.name.length === 0) return false;
      if (typeof attrInput.value !== 'string') return false;
    } else if (typed.type === 'styles') {
      const styleInput = input as Partial<{ type: 'styles'; styles: unknown; targets: unknown }>;
      if (typeof styleInput.styles !== 'object' || styleInput.styles === null) return false;
      if (Array.isArray(styleInput.styles)) return false;
      const styles = styleInput.styles as Record<string, unknown>;
      if (Object.keys(styles).length === 0) return false;
      if (!Object.values(styles).every(v => typeof v === 'string')) return false;
    }

    return true;
  }

  // ========== Private Utility Methods ==========

  /**
   * Parse class names from various input formats
   *
   * Handles:
   * - Single class: ".active" or "active"
   * - Multiple classes: "active selected" or ".active .selected"
   * - Array of classes: [".active", "selected"]
   *
   * @param classValue - Evaluated class value from AST
   * @returns Array of clean class names (no leading dots)
   */
  private parseClasses(classValue: unknown): string[] {
    if (!classValue) {
      return [];
    }

    if (typeof classValue === 'string') {
      // Split by whitespace and/or commas
      return classValue
        .trim()
        .split(/[\s,]+/)
        .map(cls => {
          const trimmed = cls.trim();
          // Remove leading dot from CSS selectors
          return trimmed.startsWith('.') ? trimmed.substring(1) : trimmed;
        })
        .filter(cls => cls.length > 0 && this.isValidClassName(cls));
    }

    if (Array.isArray(classValue)) {
      return classValue
        .map(cls => {
          const str = String(cls).trim();
          return str.startsWith('.') ? str.substring(1) : str;
        })
        .filter(cls => cls.length > 0 && this.isValidClassName(cls));
    }

    // Fallback: convert to string
    const str = String(classValue).trim();
    const cleanStr = str.startsWith('.') ? str.substring(1) : str;
    return cleanStr.length > 0 && this.isValidClassName(cleanStr) ? [cleanStr] : [];
  }

  /**
   * Validate CSS class name
   *
   * Class names must:
   * - Not be empty
   * - Not start with a digit
   * - Only contain letters, digits, hyphens, underscores
   *
   * @param className - Class name to validate
   * @returns true if valid CSS class name
   */
  private isValidClassName(className: string): boolean {
    if (!className || className.trim().length === 0) {
      return false;
    }

    // CSS class name regex: starts with letter/underscore/hyphen, then letters/digits/hyphens/underscores
    const cssClassNameRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
    return cssClassNameRegex.test(className.trim());
  }

  /**
   * Check if string is attribute syntax
   *
   * Detects:
   * - Bracket syntax: [@attr="value"] or [@attr]
   * - Direct syntax: @attr
   *
   * @param expression - Expression to check
   * @returns true if attribute syntax
   */
  private isAttributeSyntax(expression: string): boolean {
    const trimmed = expression.trim();

    // Bracket syntax: [@attr="value"] or [@attr]
    if (trimmed.startsWith('[@') && trimmed.endsWith(']')) {
      return true;
    }

    // Direct syntax: @attr
    if (trimmed.startsWith('@')) {
      return true;
    }

    return false;
  }

  /**
   * Parse attribute name and value from expression
   *
   * Supports:
   * - [@attr="value"] → { name: "attr", value: "value" }
   * - [@attr] → { name: "attr", value: "" }
   * - @attr → { name: "attr", value: "" }
   *
   * @param expression - Attribute expression to parse
   * @returns Object with name and value
   */
  private parseAttribute(expression: string): { name: string; value: string } {
    const trimmed = expression.trim();

    // Handle bracket syntax: [@attr="value"]
    if (trimmed.startsWith('[@') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(2, -1); // Remove [@ and ]
      const equalIndex = inner.indexOf('=');

      if (equalIndex === -1) {
        // No value: [@attr]
        return { name: inner.trim(), value: '' };
      }

      // Has value: [@attr="value"]
      const name = inner.slice(0, equalIndex).trim();
      let value = inner.slice(equalIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      return { name, value };
    }

    // Handle direct syntax: @attr
    if (trimmed.startsWith('@')) {
      return { name: trimmed.substring(1).trim(), value: '' };
    }

    throw new Error(`Invalid attribute syntax: ${expression}`);
  }

  /**
   * Resolve target elements from AST args
   *
   * Inline version of dom-utils.resolveTargets
   * Handles: context.me default, HTMLElement, NodeList, CSS selectors
   *
   * @param args - Raw AST arguments
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Array of resolved HTMLElements
   */
  private async resolveTargets(
    args: ASTNode[],
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HTMLElement[]> {
    // Default to context.me if no target args
    if (!args || args.length === 0) {
      if (!context.me) {
        throw new Error('add command: no target specified and context.me is null');
      }
      if (!(context.me instanceof HTMLElement)) {
        throw new Error('add command: context.me must be an HTMLElement');
      }
      return [context.me];
    }

    const targets: HTMLElement[] = [];

    for (const arg of args) {
      const evaluated = await evaluator.evaluate(arg, context);

      if (evaluated instanceof HTMLElement) {
        targets.push(evaluated);
      } else if (evaluated instanceof NodeList) {
        const elements = Array.from(evaluated).filter(
          (el): el is HTMLElement => el instanceof HTMLElement
        );
        targets.push(...elements);
      } else if (Array.isArray(evaluated)) {
        const elements = evaluated.filter(
          (el): el is HTMLElement => el instanceof HTMLElement
        );
        targets.push(...elements);
      } else if (typeof evaluated === 'string') {
        try {
          const selected = document.querySelectorAll(evaluated);
          const elements = Array.from(selected).filter(
            (el): el is HTMLElement => el instanceof HTMLElement
          );
          targets.push(...elements);
        } catch (error) {
          throw new Error(
            `Invalid CSS selector: "${evaluated}" - ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        throw new Error(
          `Invalid add target: expected HTMLElement or CSS selector, got ${typeof evaluated}`
        );
      }
    }

    if (targets.length === 0) {
      throw new Error('add command: no valid targets found');
    }

    return targets;
  }
}

// ========== Factory Function ==========

/**
 * Factory function for creating AddCommand instances
 * Maintains compatibility with existing command registration patterns
 *
 * @returns New AddCommand instance
 */
export function createAddCommand(): AddCommand {
  return new AddCommand();
}

// Default export for convenience
export default AddCommand;

// ========== Usage Example ==========
//
// import { AddCommand } from './commands-v2/dom/add-standalone';
// import { RuntimeBase } from './runtime/runtime-base';
//
// const runtime = new RuntimeBase({
//   registry: {
//     add: new AddCommand(),
//   },
// });
//
// // Now only AddCommand is bundled, not all V1 dependencies!
// // Bundle size: ~3-4 KB (vs ~230 KB with V1 inheritance)
