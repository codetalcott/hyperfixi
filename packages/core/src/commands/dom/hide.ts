/**
 * HideCommand - Decorated Implementation
 *
 * Hides HTML elements by setting display: none. Uses Stage 3 decorators.
 *
 * Syntax:
 *   hide                    # Hide current element (me)
 *   hide <target>           # Hide specified element(s)
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { command, meta, createFactory, type DecoratedCommand, type CommandMetadata } from '../decorators';
import {
  parseVisibilityInput,
  type VisibilityRawInput,
  type VisibilityInput,
} from '../helpers/visibility-target-parser';

// Re-export for backward compatibility
export type HideCommandInput = VisibilityInput;

/**
 * HideCommand - Hides elements
 *
 * Before: 189 lines
 * After: ~55 lines (71% reduction)
 */
@meta({
  description: 'Hide elements by setting display to none',
  syntax: 'hide [<target>]',
  examples: ['hide me', 'hide #modal', 'hide .warnings', 'hide <button/>'],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'hide', category: 'dom' })
export class HideCommand implements DecoratedCommand {
  // Properties set by decorators
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: VisibilityRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HideCommandInput> {
    return parseVisibilityInput(raw, evaluator, context, 'hide');
  }

  async execute(input: HideCommandInput, _context: TypedExecutionContext): Promise<void> {
    for (const element of input.targets) {
      element.classList.remove('show');

      // Preserve original display value if not already stored
      if (!element.dataset.originalDisplay) {
        const currentDisplay = element.style.display;
        element.dataset.originalDisplay = currentDisplay === 'none' ? '' : currentDisplay;
      }

      element.style.display = 'none';
    }
  }

  validate(input: unknown): input is HideCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<HideCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    if (!typed.targets.every(t => isHTMLElement(t))) return false;
    return true;
  }
}

export const createHideCommand = createFactory(HideCommand);
export default HideCommand;
