/**
 * OpenCommand - Open dialogs, details, and popovers
 *
 * Dispatches on element type:
 *   <dialog>   → showModal() or show() (based on "as modal" / "as non-modal" modifier)
 *   <details>  → set open=true
 *   <summary>  → set parent <details> open=true
 *   popover    → showPopover()
 *
 * For elements without a native "open" concept, this is a no-op.
 *
 * Syntax:
 *   open                      # Open context.me
 *   open <target>             # Open specified element(s)
 *   open <dialog> as modal    # Dialog-specific: showModal()
 *   open <dialog> as non-modal
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

export type OpenDialogMode = 'modal' | 'non-modal';

export interface OpenCommandInput {
  targets: HTMLElement[];
  /** Dialog mode — only relevant when target is a <dialog>. Defaults to 'modal'. */
  dialogMode: OpenDialogMode;
}

async function parseDialogMode(
  args: ASTNode[],
  modifiers: Record<string, ExpressionNode>,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<OpenDialogMode> {
  if (modifiers?.as) {
    const value = await evaluator.evaluate(modifiers.as, context);
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      if (normalized === 'non-modal' || normalized === 'nonmodal') return 'non-modal';
      if (normalized === 'modal') return 'modal';
    }
  }
  for (let i = 0; i < args.length - 1; i++) {
    const arg = args[i] as Record<string, unknown>;
    if (arg?.type === 'identifier' && (arg.name as string)?.toLowerCase() === 'as') {
      const next = await evaluator.evaluate(args[i + 1], context);
      if (typeof next === 'string') {
        const normalized = next.toLowerCase().trim();
        if (normalized === 'non-modal' || normalized === 'nonmodal') return 'non-modal';
        if (normalized === 'modal') return 'modal';
      }
    }
  }
  return 'modal';
}

/** Type guard for elements with the Popover API (popover attribute present) */
function isPopoverElement(el: HTMLElement): boolean {
  return el.hasAttribute('popover');
}

@meta({
  description: 'Open a dialog, details element, or popover',
  syntax: ['open [<target>]', 'open <dialog> as modal', 'open <dialog> as non-modal'],
  examples: ['open', 'open #myDialog', 'open #details', 'open #popup as non-modal'],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'open', category: 'dom' })
export class OpenCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<OpenCommandInput> {
    const targetArgs = (raw.args ?? []).filter(arg => {
      const a = arg as Record<string, unknown>;
      if (a?.type !== 'identifier') return true;
      const name = (a.name as string)?.toLowerCase();
      return name !== 'as' && name !== 'modal' && name !== 'non-modal' && name !== 'nonmodal';
    });

    const rawTargets = await resolveTargetsFromArgs(
      targetArgs,
      evaluator,
      context,
      'open',
      { filterPrepositions: true, fallbackModifierKey: 'on' },
      raw.modifiers
    );
    const targets = resolveSmartElementTargets(rawTargets);
    const dialogMode = await parseDialogMode(
      raw.args ?? [],
      raw.modifiers ?? {},
      evaluator,
      context
    );
    return { targets, dialogMode };
  }

  async execute(input: OpenCommandInput, _context: TypedExecutionContext): Promise<void> {
    for (const el of input.targets) {
      if (isDialogElement(el)) {
        if (!el.open) {
          if (input.dialogMode === 'modal') {
            el.showModal();
          } else {
            el.show();
          }
        }
      } else if (isDetailsElement(el)) {
        el.open = true;
      } else if (isPopoverElement(el)) {
        const popoverEl = el as HTMLElement & { showPopover?: () => void };
        if (typeof popoverEl.showPopover === 'function') {
          try {
            popoverEl.showPopover();
          } catch {
            // showPopover throws if already open — ignore
          }
        }
      }
    }
  }

  validate(input: unknown): input is OpenCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<OpenCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    if (!typed.targets.every(t => isHTMLElement(t))) return false;
    return typed.dialogMode === 'modal' || typed.dialogMode === 'non-modal';
  }
}

export const createOpenCommand = createFactory(OpenCommand);
export default OpenCommand;
