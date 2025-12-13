/**
 * RemoveCommand - Decorated Implementation
 *
 * Removes CSS classes, attributes, styles, or elements from the DOM.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   remove .active                     # Remove single class from me
 *   remove .active from <target>       # Remove single class from target
 *   remove "active selected"           # Remove multiple classes
 *   remove @data-x                     # Remove attribute
 *   remove me                          # Remove current element from DOM
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveTargetsFromArgs } from '../helpers/element-resolution';
import { parseClasses } from '../helpers/class-manipulation';
import { isAttributeSyntax, parseAttributeName } from '../helpers/attribute-manipulation';
import { command, meta, createFactory, type DecoratedCommand, type CommandMetadata } from '../decorators';

/**
 * Typed input for RemoveCommand
 * Represents parsed arguments ready for execution
 */
export type RemoveCommandInput =
  | {
      type: 'classes';
      classes: string[];
      targets: HTMLElement[];
    }
  | {
      type: 'attribute';
      name: string;
      targets: HTMLElement[];
    }
  | {
      type: 'styles';
      properties: string[];
      targets: HTMLElement[];
    }
  | {
      type: 'element';
      targets: HTMLElement[];
    };

/**
 * RemoveCommand - Removes classes, attributes, styles, or elements
 *
 * Before: 308 lines
 * After: ~200 lines (35% reduction)
 */
@meta({
  description: 'Remove CSS classes, attributes, styles, or elements from the DOM',
  syntax: 'remove <classes|@attr|*prop|element> [from <target>]',
  examples: [
    'remove .active from me',
    'remove "active selected" from <button/>',
    'remove .highlighted from #modal',
    'remove me',
    'remove closest .item',
  ],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'remove', category: 'dom' })
export class RemoveCommand implements DecoratedCommand {
  // Properties set by decorators
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  /**
   * Parse raw AST nodes into typed command input
   *
   * Detects input type (classes, attributes, or styles) and parses accordingly.
   *
   * Supports:
   * - Classes: remove .active, remove "class1 class2"
   * - Attributes: remove @data-x, remove [@attr]
   * - Styles: remove *opacity, remove *background-color
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
  ): Promise<RemoveCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('remove command requires an argument');
    }

    // First arg determines the type
    const firstArg = raw.args[0];

    // Handle CSS selector nodes directly without evaluation
    // For "remove .active", .active is a selector node with value='.active'
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

    // Check if we're removing an element from the DOM (e.g., "remove closest .item")
    // When firstValue is an HTMLElement, we remove it from the DOM entirely
    if (isHTMLElement(firstValue)) {
      return { type: 'element', targets: [firstValue as HTMLElement] };
    }

    // Check if we're removing multiple elements (e.g., "remove <.items/>")
    if (Array.isArray(firstValue) && firstValue.length > 0 && isHTMLElement(firstValue[0])) {
      return { type: 'element', targets: firstValue.filter((el): el is HTMLElement => isHTMLElement(el)) };
    }

    // Check for string-based patterns
    if (typeof firstValue === 'string') {
      const trimmed = firstValue.trim();

      // Attribute syntax: [@attr] or @attr
      if (isAttributeSyntax(trimmed)) {
        const name = parseAttributeName(trimmed);
        const targetArgs = raw.args.slice(1);
        const targets = await resolveTargetsFromArgs(targetArgs, evaluator, context, 'remove', { filterPrepositions: true, fallbackModifierKey: 'from' }, raw.modifiers);
        return { type: 'attribute', name, targets };
      }

      // CSS property shorthand: *property
      if (trimmed.startsWith('*')) {
        const property = trimmed.substring(1);
        const targetArgs = raw.args.slice(1);
        const targets = await resolveTargetsFromArgs(targetArgs, evaluator, context, 'remove', { filterPrepositions: true, fallbackModifierKey: 'from' }, raw.modifiers);
        return { type: 'styles', properties: [property], targets };
      }
    }

    // Default: class names
    const classes = parseClasses(firstValue);
    if (classes.length === 0) {
      throw new Error('remove command: no valid class names found');
    }

    const targetArgs = raw.args.slice(1);
    const targets = await resolveTargetsFromArgs(targetArgs, evaluator, context, 'remove', { filterPrepositions: true, fallbackModifierKey: 'from' }, raw.modifiers);

    return { type: 'classes', classes, targets };
  }

  /**
   * Execute the remove command
   *
   * Removes CSS classes, attributes, or inline styles from all target elements.
   *
   * @param input - Typed command input from parseInput()
   * @param _context - Typed execution context (unused but required by interface)
   * @returns void (command performs side effects)
   */
  execute(
    input: RemoveCommandInput,
    _context: TypedExecutionContext
  ): void {
    // Handle different input types using discriminated union
    switch (input.type) {
      case 'classes':
        // Remove CSS classes
        for (const element of input.targets) {
          for (const className of input.classes) {
            // classList.remove() is safe even if class doesn't exist
            element.classList.remove(className);
          }
        }
        break;

      case 'attribute':
        // Remove HTML attribute
        for (const element of input.targets) {
          element.removeAttribute(input.name);
        }
        break;

      case 'styles':
        // Remove inline styles
        for (const element of input.targets) {
          for (const property of input.properties) {
            // Use removeProperty for type-safe style removal
            element.style.removeProperty(property);
          }
        }
        break;

      case 'element':
        // Remove elements from the DOM entirely
        for (const element of input.targets) {
          element.remove();
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
   * @returns true if input is valid RemoveCommandInput
   */
  validate(input: unknown): input is RemoveCommandInput {
    if (typeof input !== 'object' || input === null) return false;

    const typed = input as Partial<RemoveCommandInput>;

    // Check type discriminator
    if (!typed.type || !['classes', 'attribute', 'styles', 'element'].includes(typed.type)) {
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
      const attrInput = input as Partial<{ type: 'attribute'; name: unknown; targets: unknown }>;
      if (typeof attrInput.name !== 'string' || attrInput.name.length === 0) return false;
    } else if (typed.type === 'styles') {
      const styleInput = input as Partial<{ type: 'styles'; properties: unknown; targets: unknown }>;
      if (!Array.isArray(styleInput.properties)) return false;
      if (styleInput.properties.length === 0) return false;
      if (!styleInput.properties.every(p => typeof p === 'string' && p.length > 0)) return false;
    }

    return true;
  }

}

export const createRemoveCommand = createFactory(RemoveCommand);
export default RemoveCommand;
