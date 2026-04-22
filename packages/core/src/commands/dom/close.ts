/**
 * CloseCommand - Close dialogs, details, and popovers
 *
 * Dispatches on element type:
 *   <dialog>   → close()
 *   <details>  → set open=false
 *   <summary>  → set parent <details> open=false
 *   popover    → hidePopover()
 *
 * For elements without a native "close" concept, this is a no-op.
 *
 * Syntax:
 *   close                 # Close context.me
 *   close <target>        # Close specified element(s)
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
  isDialogElement,
  isDetailsElement,
  resolveSmartElementTargets,
} from '../helpers/smart-element';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

export interface CloseCommandInput {
  targets: HTMLElement[];
}

function isPopoverElement(el: HTMLElement): boolean {
  return el.hasAttribute('popover');
}

@meta({
  description: 'Close a dialog, details element, or popover',
  syntax: ['close', 'close <target>'],
  examples: ['close', 'close #myDialog', 'close #details', 'close #popup'],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'close', category: 'dom' })
export class CloseCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<CloseCommandInput> {
    const rawTargets = await resolveTargetsFromArgs(
      raw.args,
      evaluator,
      context,
      'close',
      { filterPrepositions: true, fallbackModifierKey: 'on' },
      raw.modifiers
    );
    const targets = resolveSmartElementTargets(rawTargets);
    return { targets };
  }

  async execute(input: CloseCommandInput, _context: TypedExecutionContext): Promise<void> {
    for (const el of input.targets) {
      if (isDialogElement(el)) {
        if (el.open) {
          el.close();
        }
      } else if (isDetailsElement(el)) {
        el.open = false;
      } else if (isPopoverElement(el)) {
        const popoverEl = el as HTMLElement & { hidePopover?: () => void };
        if (typeof popoverEl.hidePopover === 'function') {
          try {
            popoverEl.hidePopover();
          } catch {
            // hidePopover throws if already hidden — ignore
          }
        }
      }
    }
  }

  validate(input: unknown): input is CloseCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<CloseCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    return typed.targets.every(t => isHTMLElement(t));
  }
}

export const createCloseCommand = createFactory(CloseCommand);
export default CloseCommand;
