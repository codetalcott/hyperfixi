/**
 * HideCommand - Decorated Implementation
 *
 * Hides HTML elements by setting display: none. Uses Stage 3 decorators.
 * Extends VisibilityCommandBase for shared logic with ShowCommand.
 *
 * Syntax:
 *   hide                    # Hide current element (me)
 *   hide <target>           # Hide specified element(s)
 */

import type { TypedExecutionContext } from '../../types/core';
import { commandMeta, command, createFactory } from '../decorators';
import { isHTMLElement } from '../../utils/element-check';
import { VisibilityCommandBase, type VisibilityCommandInput } from './visibility-base';
import type { VisibilityInput } from '../helpers/visibility-target-parser';

// Re-export for backward compatibility
export type HideCommandInput = VisibilityInput;

/**
 * HideCommand - Hides elements
 */
@command({ name: 'hide', category: 'dom' })
export class HideCommand extends VisibilityCommandBase {
  static readonly metadata = commandMeta({
    description: 'Hide elements by setting display to none',
    syntax: 'hide [<target>]',
    examples: ['hide me', 'hide #modal', 'hide .warnings', 'hide <button/>'],
    sideEffects: ['dom-mutation'],
    category: 'dom',
    compatibility: 'standard',
  });

  get metadata() {
    return HideCommand.metadata;
  }

  protected readonly mode = 'hide' as const;

  async execute(input: VisibilityCommandInput, _context: TypedExecutionContext): Promise<void> {
    for (const element of input.targets) {
      this.hideElement(element);
    }
  }

  // Override for backward compatibility - mode is optional for hide
  override validate(input: unknown): input is VisibilityCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<HideCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    if (!typed.targets.every(t => isHTMLElement(t))) return false;
    return true;
  }
}

export const createHideCommand = createFactory(HideCommand);
export default HideCommand;
