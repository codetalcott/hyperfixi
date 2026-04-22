/**
 * ClearCommand - Reset variable values or clear form field values
 *
 * Dispatches on the shape of the first argument:
 *   clear :var              → context.locals.set('var', null)
 *   clear ::global          → context.locals.set('global', null) (scope is
 *                              tracked on the identifier; we store in locals
 *                              to match the set command's behavior)
 *   clear myName            → context.locals.set('myName', null)
 *   clear <input/>          → input.value = ''
 *   clear #search           → input.value = ''
 *   clear <textarea/>       → textarea.value = ''
 *   clear <select/>         → select.selectedIndex = -1
 *   clear                   → clears context.me if it's a form field
 *
 * NOTE: to remove all child nodes from an arbitrary element, use `empty`.
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

export type ClearCommandInput =
  | { type: 'variable'; name: string }
  | { type: 'form-fields'; targets: HTMLElement[] };

function isFormFieldElement(
  el: HTMLElement
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

@meta({
  description:
    'Reset a variable to null or clear the value of a form field (<input>, <textarea>, <select>)',
  syntax: ['clear <var>', 'clear :var', 'clear <target>'],
  examples: ['clear :count', 'clear myVar', 'clear #search', 'clear <textarea/>'],
  sideEffects: ['state-mutation', 'dom-mutation'],
})
@command({ name: 'clear', category: 'data' })
export class ClearCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ClearCommandInput> {
    const firstArg = raw.args?.[0] as Record<string, unknown> | undefined;
    const firstArgType = firstArg?.type as string | undefined;
    const firstArgName = firstArg?.name as string | undefined;

    // Variable target: clear :var  |  clear myName  |  clear global x
    // Parser emits these as identifier/variable nodes. Evaluating would
    // attempt a lookup (failing for undefined vars), so we use the raw name.
    if (
      firstArg &&
      (firstArgType === 'variable' ||
        (firstArgType === 'identifier' && typeof firstArgName === 'string'))
    ) {
      // Only treat as a variable if it does NOT resolve to an element-like thing.
      // Try evaluating cheaply; if it throws or gives non-element, fall back to variable.
      try {
        const evaluated = await evaluator.evaluate(firstArg as ASTNode, context);
        if (isHTMLElement(evaluated) || Array.isArray(evaluated)) {
          // It's an element — fall through to form-field handling below
        } else {
          return { type: 'variable', name: firstArgName! };
        }
      } catch {
        return { type: 'variable', name: firstArgName! };
      }
    }

    // Element target(s): resolve and require a form field
    const targets = await resolveTargetsFromArgs(
      raw.args,
      evaluator,
      context,
      'clear',
      { filterPrepositions: true, fallbackModifierKey: 'on' },
      raw.modifiers
    );
    return { type: 'form-fields', targets };
  }

  async execute(input: ClearCommandInput, context: TypedExecutionContext): Promise<void> {
    if (input.type === 'variable') {
      context.locals.set(input.name, null);
      Object.assign(context, { it: null });
      return;
    }

    for (const el of input.targets) {
      if (!isFormFieldElement(el)) continue;
      if (el.tagName === 'SELECT') {
        (el as HTMLSelectElement).selectedIndex = -1;
      } else {
        (el as HTMLInputElement | HTMLTextAreaElement).value = '';
      }
    }
  }

  validate(input: unknown): input is ClearCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<ClearCommandInput>;
    if (typed.type === 'variable') return typeof (typed as { name?: unknown }).name === 'string';
    if (typed.type === 'form-fields') {
      const targets = (typed as { targets?: unknown }).targets;
      return Array.isArray(targets) && targets.every(t => isHTMLElement(t));
    }
    return false;
  }
}

export const createClearCommand = createFactory(ClearCommand);
export default ClearCommand;
