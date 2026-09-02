/**
 * ResetCommand - Reset a <form> element to its default values
 *
 * Calls HTMLFormElement.reset(). No-op on non-form targets.
 *
 * Syntax:
 *   reset                 # Reset context.me (must be a <form>)
 *   reset <target>        # Reset specified form(s)
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
import type { CommandRaw } from '../../ast/command-slots';

export interface ResetCommandInput {
  targets: HTMLElement[];
}

function isFormElement(el: HTMLElement): el is HTMLFormElement {
  return el.tagName === 'FORM';
}

@command({ name: 'reset' })
export class ResetCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Reset a <form> element to its default values (HTMLFormElement.reset())',
    syntax: ['reset', 'reset <target>'],
    examples: ['reset', 'reset #myForm', 'reset <form/>'],
    sideEffects: ['dom-mutation'],
    category: 'dom',
    compatibility: 'standard',
  });

  get metadata() {
    return ResetCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'reset'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ResetCommandInput> {
    const targets = await resolveTargetsFromArgs(
      raw.args,
      evaluator,
      context,
      'reset',
      { fallbackModifierKey: 'on' },
      raw.modifiers
    );
    return { targets };
  }

  async execute(input: ResetCommandInput, _context: TypedExecutionContext): Promise<void> {
    for (const el of input.targets) {
      if (isFormElement(el)) {
        el.reset();
      }
    }
  }

  validate(input: unknown): input is ResetCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<ResetCommandInput>;
    if (!Array.isArray(typed.targets)) return false;
    return typed.targets.every(t => isHTMLElement(t));
  }
}

export const createResetCommand = createFactory(ResetCommand);
export default ResetCommand;
