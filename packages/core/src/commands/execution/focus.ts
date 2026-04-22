/**
 * FocusCommand - Focus elements
 *
 * Calls HTMLElement.focus() on the target(s).
 *
 * Syntax:
 *   focus                 # Focus context.me
 *   focus <target>        # Focus specified element(s)
 *   focus on <target>     # Focus specified element(s) (preposition form)
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

export interface FocusCommandInput {
  targets: HTMLElement[];
}

@meta({
  description: 'Focus an element (calls HTMLElement.focus())',
  syntax: ['focus', 'focus <target>', 'focus on <target>'],
  examples: ['focus', 'focus #search', 'focus on <input/>'],
  sideEffects: ['focus'],
})
@command({ name: 'focus', category: 'execution' })
export class FocusCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<FocusCommandInput> {
    const targets = await resolveTargetsFromArgs(
      raw.args,
      evaluator,
      context,
      'focus',
      { filterPrepositions: true, fallbackModifierKey: 'on' },
      raw.modifiers
    );
    return { targets };
  }

  async execute(input: FocusCommandInput, _context: TypedExecutionContext): Promise<void> {
    for (const el of input.targets) {
      el.focus();
    }
  }

  validate(input: unknown): input is FocusCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<FocusCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    return typed.targets.every(t => isHTMLElement(t));
  }
}

export const createFocusCommand = createFactory(FocusCommand);
export default FocusCommand;
