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
import type { ASTNode, ExpressionNode } from '../../types/ast';
import type { ExpressionEvaluator } from '../../runtime/expression-evaluator';

/**
 * Typed input for AddCommand
 * Represents parsed arguments ready for execution
 */
export interface AddCommandInput {
  /** CSS class names to add */
  classes: string[];
  /** Target elements to modify */
  targets: HTMLElement[];
}

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
   * Extracts class names from args and evaluates target expressions.
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
      throw new Error('add command requires class names');
    }

    // First arg is the class expression
    const classArg = raw.args[0];
    const classValue = await evaluator.evaluate(classArg, context);
    const classes = this.parseClasses(classValue);

    if (classes.length === 0) {
      throw new Error('add command: no valid class names found');
    }

    // Remaining args are targets (if any)
    const targetArgs = raw.args.slice(1);
    const targets = await this.resolveTargets(targetArgs, evaluator, context);

    return { classes, targets };
  }

  /**
   * Execute the add command
   *
   * Adds CSS classes to all target elements.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns void (command performs side effects)
   */
  async execute(
    input: AddCommandInput,
    context: TypedExecutionContext
  ): Promise<void> {
    for (const element of input.targets) {
      for (const className of input.classes) {
        // Only add if not already present
        if (!element.classList.contains(className)) {
          element.classList.add(className);
        }
      }
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

    if (!Array.isArray(typed.classes)) return false;
    if (typed.classes.length === 0) return false; // Must have at least one class
    if (!typed.classes.every(c => typeof c === 'string' && c.length > 0)) return false;

    if (!Array.isArray(typed.targets)) return false;
    if (typed.targets.length === 0) return false; // Must have at least one target
    if (!typed.targets.every(t => t instanceof HTMLElement)) return false;

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
