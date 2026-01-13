/**
 * RemoveCommand - Decorated Implementation
 *
 * Removes CSS classes, attributes, styles, or elements from the DOM.
 * Extends DOMModificationBase for shared logic with AddCommand.
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
import { parseAttributeName } from '../helpers/attribute-manipulation';
import { removeElement } from '../helpers/dom-mutation';
import {
  batchRemoveClasses,
  batchRemoveAttribute,
  batchRemoveStyles,
} from '../helpers/batch-dom-operations';
import { resolveDynamicClasses } from '../helpers/class-manipulation';
import { command, meta, createFactory } from '../decorators';
import { DOMModificationBase } from './dom-modification-base';

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
export class RemoveCommand extends DOMModificationBase {
  protected readonly mode = 'remove' as const;
  protected readonly preposition = 'from';

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<RemoveCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('remove command requires an argument');
    }

    const { value: firstValue } = await this.evaluateFirst(raw.args[0], evaluator, context);

    // Check if we're removing an element from the DOM (e.g., "remove closest .item")
    if (isHTMLElement(firstValue)) {
      return { type: 'element', targets: [firstValue as HTMLElement] };
    }

    // Check if we're removing multiple elements (e.g., "remove <.items/>")
    if (Array.isArray(firstValue) && firstValue.length > 0 && isHTMLElement(firstValue[0])) {
      return {
        type: 'element',
        targets: firstValue.filter((el): el is HTMLElement => isHTMLElement(el)),
      };
    }

    // Check for string-based patterns
    if (typeof firstValue === 'string') {
      const trimmed = firstValue.trim();

      // Attribute syntax: [@attr] or @attr
      if (this.isAttribute(trimmed)) {
        const name = parseAttributeName(trimmed);
        const targets = await this.resolveTargets(
          raw.args.slice(1),
          evaluator,
          context,
          raw.modifiers
        );
        return { type: 'attribute', name, targets };
      }

      // CSS property shorthand: *property
      if (this.isCSSProperty(trimmed)) {
        const property = trimmed.substring(1).trim();
        const targets = await this.resolveTargets(
          raw.args.slice(1),
          evaluator,
          context,
          raw.modifiers
        );
        return { type: 'styles', properties: [property], targets };
      }
    }

    // Default: class names
    const classes = this.parseClassNames(firstValue);
    if (classes.length === 0) {
      throw new Error('remove command: no valid class names found');
    }

    const targets = await this.resolveTargets(raw.args.slice(1), evaluator, context, raw.modifiers);
    return { type: 'classes', classes, targets };
  }

  execute(input: RemoveCommandInput, context: TypedExecutionContext): void {
    switch (input.type) {
      case 'classes': {
        // Resolve any dynamic class expressions (e.g., {cls} → actual class name)
        const resolvedClasses = resolveDynamicClasses(input.classes, context);
        if (resolvedClasses.length > 0) {
          batchRemoveClasses(input.targets, resolvedClasses);
        }
        break;
      }
      case 'attribute':
        batchRemoveAttribute(input.targets, input.name);
        break;
      case 'styles':
        batchRemoveStyles(input.targets, input.properties);
        break;
      case 'element':
        for (const element of input.targets) {
          removeElement(element);
        }
        break;
    }
  }

  validate(input: unknown): input is RemoveCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<RemoveCommandInput>;

    if (!this.validateType(typed.type, ['classes', 'attribute', 'styles', 'element'] as const))
      return false;
    if (!this.validateTargets(typed.targets)) return false;

    if (typed.type === 'classes') {
      const classInput = input as Partial<{ classes: unknown }>;
      if (!this.validateStringArray(classInput.classes, 1)) return false;
    } else if (typed.type === 'attribute') {
      const attrInput = input as Partial<{ name: unknown }>;
      if (typeof attrInput.name !== 'string' || attrInput.name.length === 0) return false;
    } else if (typed.type === 'styles') {
      const styleInput = input as Partial<{ properties: unknown }>;
      if (!this.validateStringArray(styleInput.properties, 1)) return false;
    }

    return true;
  }
}

export const createRemoveCommand = createFactory(RemoveCommand);
export default RemoveCommand;
