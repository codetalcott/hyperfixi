/**
 * EmptyCommand - Remove all children from an element
 *
 * Sets innerHTML to '' on the target(s), clearing child nodes.
 *
 * Syntax:
 *   empty                 # Empty context.me
 *   empty <target>        # Empty specified element(s)
 *   empty the <target>    # Empty specified element(s) (natural-language form)
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

export interface EmptyCommandInput {
  targets: HTMLElement[];
}

@meta({
  description: 'Remove all children from an element (sets innerHTML to empty)',
  syntax: ['empty', 'empty <target>', 'empty the <target>'],
  examples: ['empty me', 'empty #list', 'empty .results'],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'empty', category: 'dom' })
export class EmptyCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<EmptyCommandInput> {
    const targets = await resolveTargetsFromArgs(
      raw.args,
      evaluator,
      context,
      'empty',
      { filterPrepositions: true, fallbackModifierKey: 'on' },
      raw.modifiers
    );
    return { targets };
  }

  async execute(input: EmptyCommandInput, _context: TypedExecutionContext): Promise<void> {
    for (const el of input.targets) {
      el.innerHTML = '';
    }
  }

  validate(input: unknown): input is EmptyCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<EmptyCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    return typed.targets.every(t => isHTMLElement(t));
  }
}

export const createEmptyCommand = createFactory(EmptyCommand);
export default EmptyCommand;
