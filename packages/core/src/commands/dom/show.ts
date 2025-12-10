/**
 * ShowCommand - Decorated Implementation
 *
 * Shows HTML elements by restoring display property. Uses Stage 3 decorators.
 *
 * Syntax:
 *   show                    # Show current element (me)
 *   show <target>           # Show specified element(s)
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { command, meta, createFactory, type CommandMetadata } from '../decorators';
import {
  parseVisibilityInput,
  type VisibilityRawInput,
  type VisibilityInput,
} from '../helpers/visibility-target-parser';

// Re-export for backward compatibility
export interface ShowCommandInput extends VisibilityInput {
  defaultDisplay: string;
}

/**
 * ShowCommand - Restores element visibility
 *
 * Before: 203 lines
 * After: ~65 lines (68% reduction)
 */
@meta({
  description: 'Show elements by restoring display property',
  syntax: 'show [<target>]',
  examples: ['show me', 'show #modal', 'show .hidden', 'show <button/>'],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'show', category: 'dom' })
export class ShowCommand {
  // Properties set by decorators
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: VisibilityRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ShowCommandInput> {
    const { targets } = await parseVisibilityInput(raw, evaluator, context, 'show');
    return { targets, defaultDisplay: 'block' };
  }

  async execute(input: ShowCommandInput, _context: TypedExecutionContext): Promise<void> {
    for (const element of input.targets) {
      element.classList.add('show');

      const originalDisplay = element.dataset.originalDisplay;
      if (originalDisplay !== undefined) {
        element.style.display = originalDisplay || input.defaultDisplay;
        delete element.dataset.originalDisplay;
      } else if (element.style.display === 'none') {
        element.style.display = input.defaultDisplay;
      }
    }
  }

  validate(input: unknown): input is ShowCommandInput {
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
