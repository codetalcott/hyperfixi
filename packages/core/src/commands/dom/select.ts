/**
 * SelectCommand - Select text content
 *
 * Dispatches on element type:
 *   <input>/<textarea> → HTMLInputElement.select() (selects all text)
 *   other elements     → creates a Range covering the element and sets it
 *                        as the current window selection
 *
 * Syntax:
 *   select                # Select context.me
 *   select <target>       # Select specified element(s) — acts on the last one
 */

import type {
  ExecutionContext,
  TypedExecutionContext,
  ASTNode,
  ExpressionNode,
} from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveTargetsFromArgs } from '../helpers/element-resolution';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

export interface SelectCommandInput {
  targets: HTMLElement[];
}

function isTextFieldElement(el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement {
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

@meta({
  description: 'Select the contents of a text field, or select the contents of a DOM element',
  syntax: ['select', 'select <target>'],
  examples: ['select #search', 'select <textarea/>', 'select me'],
  sideEffects: ['focus', 'dom-mutation'],
})
@command({ name: 'select', category: 'dom' })
export class SelectCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SelectCommandInput> {
    const targets = await resolveTargetsFromArgs(
      raw.args,
      evaluator,
      context,
      'select',
      { filterPrepositions: true, fallbackModifierKey: 'on' },
      raw.modifiers
    );
    return { targets };
  }

  async execute(input: SelectCommandInput, _context: TypedExecutionContext): Promise<void> {
    if (input.targets.length === 0) return;

    for (const el of input.targets) {
      if (isTextFieldElement(el)) {
        el.select();
        continue;
      }

      // Non-text-field: use Selection API + Range to cover the element's contents
      const doc = el.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
      const win = doc?.defaultView;
      if (!doc || !win) continue;

      const selection = win.getSelection?.();
      if (!selection) continue;

      try {
        const range = doc.createRange();
        range.selectNodeContents(el);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch {
        // Some environments (happy-dom, detached nodes) may reject selectNodeContents — ignore
      }
    }
  }

  validate(input: unknown): input is SelectCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<SelectCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    return typed.targets.every(t => isHTMLElement(t));
  }
}

export const createSelectCommand = createFactory(SelectCommand);
export default SelectCommand;
