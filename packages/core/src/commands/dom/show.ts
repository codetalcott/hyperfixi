/**
 * ShowCommand - Decorated Implementation
 *
 * Shows HTML elements by restoring display property. Uses Stage 3 decorators.
 * Extends VisibilityCommandBase for shared logic with HideCommand.
 *
 * Syntax:
 *   show                    # Show current element (me)
 *   show <target>           # Show specified element(s)
 *   show <target> when <c>  # Show those matching <c>, hide the rest
 */

import type { TypedExecutionContext } from '../../types/core';
import { commandMeta, command, createFactory } from '../decorators';
import { isHTMLElement } from '../../utils/element-check';
import { VisibilityCommandBase, type VisibilityCommandInput } from './visibility-base';

// Re-export for backward compatibility
export interface ShowCommandInput extends VisibilityCommandInput {
  defaultDisplay: string;
}

/**
 * ShowCommand - Restores element visibility
 */
@command({ name: 'show' })
export class ShowCommand extends VisibilityCommandBase {
  static readonly metadata = commandMeta({
    description: 'Show elements by restoring display property',
    syntax: 'show [<target>] [when <condition>]',
    examples: [
      'show me',
      'show #modal',
      'show .hidden',
      'show <button/>',
      'show <li/> when its textContent contains my value',
    ],
    sideEffects: ['dom-mutation'],
    category: 'dom',
    compatibility: 'standard',
  });

  get metadata() {
    return ShowCommand.metadata;
  }

  protected readonly mode = 'show' as const;

  async execute(input: VisibilityCommandInput, _context: TypedExecutionContext): Promise<void> {
    const defaultDisplay = input.defaultDisplay || 'block';
    for (const element of input.targets) {
      this.showElement(element, defaultDisplay);
    }
    // A `when` filter is two-sided: the elements it rejected are HIDDEN, so a
    // re-run of `show … when <search>` un-shows what no longer matches. Absent
    // when the command carried no filter.
    for (const element of input.inverse ?? []) {
      this.hideElement(element);
    }
  }

  // Override for backward compatibility - mode is optional for show
  override validate(input: unknown): input is VisibilityCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<ShowCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    if (!typed.targets.every(t => isHTMLElement(t))) return false;
    if (typeof typed.defaultDisplay !== 'string') return false;
    return true;
  }
}

export const createShowCommand = createFactory(ShowCommand);
export default ShowCommand;
