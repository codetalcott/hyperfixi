/**
 * VisibilityCommandBase - Shared logic for show/hide commands
 *
 * This base class contains the common parseInput and validate logic.
 * ShowCommand and HideCommand extend this and provide their own
 * execute implementations and metadata.
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import type { DecoratedCommand, CommandMetadata } from '../decorators';
import {
  parseVisibilityInput,
  type VisibilityRawInput,
  type VisibilityInput,
} from '../helpers/visibility-target-parser';

/** Visibility mode type */
export type VisibilityMode = 'show' | 'hide';

/**
 * Base input for visibility commands
 */
export interface VisibilityCommandInput extends VisibilityInput {
  mode: VisibilityMode;
  defaultDisplay?: string;
}

/**
 * Abstract base class for visibility commands
 */
export abstract class VisibilityCommandBase implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  /** Subclasses must define this to identify their mode */
  protected abstract readonly mode: VisibilityMode;

  async parseInput(
    raw: VisibilityRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<VisibilityCommandInput> {
    const { targets } = await parseVisibilityInput(raw, evaluator, context, this.mode);
    return {
      targets,
      mode: this.mode,
      defaultDisplay: this.mode === 'show' ? 'block' : undefined,
    };
  }

  abstract execute(input: VisibilityCommandInput, context: TypedExecutionContext): Promise<void>;

  validate(input: unknown): input is VisibilityCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<VisibilityCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    if (!typed.targets.every(t => isHTMLElement(t))) return false;
    if (typed.mode !== 'show' && typed.mode !== 'hide') return false;
    if (typed.mode === 'show' && typeof typed.defaultDisplay !== 'string') return false;
    return true;
  }

  /**
   * Show an element - restores original display or uses default
   */
  protected showElement(element: HTMLElement, defaultDisplay: string = 'block'): void {
    const originalDisplay = element.dataset.originalDisplay;
    if (originalDisplay !== undefined) {
      element.style.display = originalDisplay || defaultDisplay;
      delete element.dataset.originalDisplay;
    } else if (element.style.display === 'none') {
      element.style.display = defaultDisplay;
    }
    element.classList.add('show');
  }

  /**
   * Hide an element - stores original display and sets to none
   */
  protected hideElement(element: HTMLElement): void {
    // Preserve original display value if not already stored
    if (!element.dataset.originalDisplay) {
      const currentDisplay = element.style.display;
      element.dataset.originalDisplay = currentDisplay === 'none' ? '' : currentDisplay;
    }

    element.style.display = 'none';
    element.classList.remove('show');
  }
}
