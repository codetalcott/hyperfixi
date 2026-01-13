/**
 * AddCommand - Decorated Implementation
 *
 * Adds CSS classes, attributes, or styles to HTML elements.
 * Extends DOMModificationBase for shared logic with RemoveCommand.
 *
 * Syntax:
 *   add .active                     # Add single class to me
 *   add .active to <target>         # Add single class to target
 *   add "active selected"           # Add multiple classes
 *   add [@data-x="value"]           # Add attribute
 *   add { opacity: 0.5 }            # Add inline styles
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { parseAttributeWithValue } from '../helpers/attribute-manipulation';
import {
  batchAddClasses,
  batchSetAttribute,
  batchSetStyles,
} from '../helpers/batch-dom-operations';
import { resolveDynamicClasses } from '../helpers/class-manipulation';
import { command, meta, createFactory } from '../decorators';
import { DOMModificationBase } from './dom-modification-base';

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
 * AddCommand - Adds classes, attributes, or styles to elements
 */
@meta({
  description: 'Add CSS classes, attributes, or styles to elements',
  syntax: 'add <classes|@attr|{styles}> [to <target>]',
  examples: [
    'add .active to me',
    'add "active selected" to <button/>',
    'add .highlighted to #modal',
    'add [@data-test="value"] to #element',
  ],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'add', category: 'dom' })
export class AddCommand extends DOMModificationBase {
  protected readonly mode = 'add' as const;
  protected readonly preposition = 'to';

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<AddCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('add command requires an argument');
    }

    const { value: firstValue } = await this.evaluateFirst(raw.args[0], evaluator, context);

    // Check for object literal (inline styles)
    if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue)) {
      const styles = firstValue as Record<string, string>;
      const targets = await this.resolveTargets(
        raw.args.slice(1),
        evaluator,
        context,
        raw.modifiers
      );
      return { type: 'styles', styles, targets };
    }

    // Check for string-based patterns
    if (typeof firstValue === 'string') {
      const trimmed = firstValue.trim();

      // Attribute syntax: [@attr="value"] or @attr
      if (this.isAttribute(trimmed)) {
        const { name, value } = parseAttributeWithValue(trimmed);
        const targets = await this.resolveTargets(
          raw.args.slice(1),
          evaluator,
          context,
          raw.modifiers
        );
        return { type: 'attribute', name, value, targets };
      }

      // CSS property shorthand: *property
      if (this.isCSSProperty(trimmed)) {
        const property = trimmed.substring(1).trim();
        if (raw.args.length < 2) {
          throw new Error('add *property requires a value argument');
        }
        const valueArg = await evaluator.evaluate(raw.args[1], context);
        const styles = { [property]: String(valueArg) };
        const targets = await this.resolveTargets(
          raw.args.slice(2),
          evaluator,
          context,
          raw.modifiers
        );
        return { type: 'styles', styles, targets };
      }
    }

    // Default: class names
    const classes = this.parseClassNames(firstValue);
    if (classes.length === 0) {
      throw new Error('add command: no valid class names found');
    }

    const targets = await this.resolveTargets(raw.args.slice(1), evaluator, context, raw.modifiers);
    return { type: 'classes', classes, targets };
  }

  async execute(input: AddCommandInput, context: TypedExecutionContext): Promise<void> {
    switch (input.type) {
      case 'classes': {
        // Resolve any dynamic class expressions (e.g., {cls} → actual class name)
        const resolvedClasses = resolveDynamicClasses(input.classes, context);
        if (resolvedClasses.length > 0) {
          batchAddClasses(input.targets, resolvedClasses);
        }
        break;
      }
      case 'attribute':
        batchSetAttribute(input.targets, input.name, input.value);
        break;
      case 'styles':
        batchSetStyles(input.targets, input.styles);
        break;
    }
  }

  validate(input: unknown): input is AddCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<AddCommandInput>;

    if (!this.validateType(typed.type, ['classes', 'attribute', 'styles'] as const)) return false;
    if (!this.validateTargets(typed.targets)) return false;

    if (typed.type === 'classes') {
      const classInput = input as Partial<{ classes: unknown }>;
      if (!this.validateStringArray(classInput.classes, 1)) return false;
    } else if (typed.type === 'attribute') {
      const attrInput = input as Partial<{ name: unknown; value: unknown }>;
      if (typeof attrInput.name !== 'string' || attrInput.name.length === 0) return false;
      if (typeof attrInput.value !== 'string') return false;
    } else if (typed.type === 'styles') {
      const styleInput = input as Partial<{ styles: unknown }>;
      if (typeof styleInput.styles !== 'object' || styleInput.styles === null) return false;
      if (Array.isArray(styleInput.styles)) return false;
      const styles = styleInput.styles as Record<string, unknown>;
      if (Object.keys(styles).length === 0) return false;
      if (!Object.values(styles).every(v => typeof v === 'string')) return false;
    }

    return true;
  }
}

export const createAddCommand = createFactory(AddCommand);
export default AddCommand;
