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
import { isHTMLElement } from '../../utils/element-check';
import { resolveTargetsFromArgs } from '../helpers/element-resolution';
import { parseClasses, isValidClassName } from '../helpers/class-manipulation';
import { isAttributeSyntax, parseAttributeWithValue } from '../helpers/attribute-manipulation';

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
    //
    // Parser creates TWO different node types:
    // - { type: 'selector', value: '.active' } - uses 'value' property
    // - { type: 'cssSelector', selectorType: 'class', selector: '.active' } - uses 'selector' property
    let firstValue: unknown;
    const argValue = firstArg['value'] || firstArg['selector'];
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
      const targets = await resolveTargetsFromArgs(targetArgs, evaluator, context, 'add', { filterPrepositions: true });
      return { type: 'styles', styles, targets };
    }

    // Check for string-based patterns
    if (typeof firstValue === 'string') {
      const trimmed = firstValue.trim();

      // Attribute syntax: [@attr="value"] or @attr
      if (isAttributeSyntax(trimmed)) {
        const { name, value } = parseAttributeWithValue(trimmed);
        const targetArgs = raw.args.slice(1);
        const targets = await resolveTargetsFromArgs(targetArgs, evaluator, context, 'add', { filterPrepositions: true });
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
        const targets = await resolveTargetsFromArgs(targetArgs, evaluator, context, 'add', { filterPrepositions: true });
        return { type: 'styles', styles, targets };
      }
    }

    // Default: class names
    const classes = parseClasses(firstValue);
    if (classes.length === 0) {
      throw new Error('add command: no valid class names found');
    }

    const targetArgs = raw.args.slice(1);
    const targets = await resolveTargetsFromArgs(targetArgs, evaluator, context, 'add', { filterPrepositions: true });

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
    if (!typed.targets.every(t => isHTMLElement(t))) return false;

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
