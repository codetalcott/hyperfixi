/**
 * BlurCommand - Remove focus from elements
 *
 * Calls HTMLElement.blur() on the target(s).
 *
 * Syntax:
 *   blur                 # Blur context.me
 *   blur <target>        # Blur specified element(s)
 *   blur on <target>     # Blur specified element(s) (preposition form)
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
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

export interface BlurCommandInput {
  targets: HTMLElement[];
}

@command({ name: 'blur' })
export class BlurCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Remove focus from an element (calls HTMLElement.blur())',
    syntax: ['blur', 'blur <target>', 'blur on <target>'],
    examples: ['blur', 'blur #search', 'blur on <input/>'],
    sideEffects: ['focus'],
    category: 'execution',
    compatibility: 'standard',
  });

  get metadata() {
    return BlurCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<BlurCommandInput> {
    const targets = await resolveTargetsFromArgs(
      raw.args,
      evaluator,
      context,
      'blur',
      { filterPrepositions: true, fallbackModifierKey: 'on' },
      raw.modifiers
    );
    return { targets };
  }

  async execute(input: BlurCommandInput, _context: TypedExecutionContext): Promise<void> {
    for (const el of input.targets) {
      el.blur();
    }
  }

  validate(input: unknown): input is BlurCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<BlurCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    return typed.targets.every(t => isHTMLElement(t));
  }
}

export const createBlurCommand = createFactory(BlurCommand);
export default BlurCommand;
