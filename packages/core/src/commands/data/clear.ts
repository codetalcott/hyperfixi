/**
 * ClearCommand - Reset variable values or clear form field values
 *
 * Dispatches on the shape of the first argument:
 *   clear :var              → element-scoped store, set to null
 *   clear $global           → global store, set to null
 *   clear myName            → locals, set to null
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
import { setVariableValue } from '../helpers/variable-access';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import type { CommandRaw } from '../../ast/command-slots';

export type ClearCommandInput =
  | { type: 'variable'; name: string; scope?: string }
  | { type: 'form-fields'; targets: HTMLElement[] };

/**
 * The variable a node names, with its SCOPE — or null if it names none.
 *
 * `clear` used to take `node.name` and write `context.locals.set(name, null)`
 * unconditionally, ignoring scope entirely. Measured: `clear :count` was a
 * silent NO-OP on the traditional path (`log :count` still read 5 afterwards),
 * because `:count` lives in the element-scoped store and the write went to
 * `locals`. `clear $g` and `clear x` worked, which is why it went unnoticed —
 * only the element scope is a genuinely separate store.
 *
 * The two parse paths also spell the node differently, and this is the one
 * place that difference reaches behaviour: traditional emits
 * `identifier{name:'count', scope:'element'}` (sigil stripped, scope tagged),
 * semantic emits `contextReference{name:':count'}` (sigil KEPT, no scope). Both
 * are accepted here and normalised to the same `{name, scope}`, so the two
 * paths clear the same store.
 *
 * `clear` is a hyperfixi extension — upstream has no such keyword and parses
 * `clear :count` as something else entirely — so there is no upstream oracle.
 * The oracle is internal consistency with `set`/`get`, via `setVariableValue`.
 */
function scopedVariableOf(node: Record<string, unknown> | undefined): {
  name: string;
  scope?: string;
} | null {
  if (!node) return null;
  const type = node.type as string | undefined;
  const name = node.name as string | undefined;
  if (typeof name !== 'string' || name === '') return null;

  if (type === 'variable' || type === 'identifier') {
    return { name, scope: node.scope as string | undefined };
  }

  // The semantic path's shape: the sigil is part of the name and there is no
  // `scope` field, so the sigil IS the scope.
  if (type === 'contextReference') {
    if (name.startsWith(':')) return { name: name.slice(1), scope: 'element' };
    if (name.startsWith('$')) return { name: name.slice(1), scope: 'global' };
  }

  return null;
}

function isFormFieldElement(
  el: HTMLElement
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

@command({ name: 'clear' })
export class ClearCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description:
      'Reset a variable to null or clear the value of a form field (<input>, <textarea>, <select>)',
    syntax: ['clear <var>', 'clear :var', 'clear <target>'],
    examples: ['clear :count', 'clear myVar', 'clear #search', 'clear <textarea/>'],
    sideEffects: ['state-mutation', 'dom-mutation'],
    category: 'data',
    compatibility: 'standard',
  });

  get metadata() {
    return ClearCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'clear'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ClearCommandInput> {
    const firstArg = raw.args?.[0] as Record<string, unknown> | undefined;

    // Variable target: clear :var  |  clear $global  |  clear myName
    // Parser emits these as identifier/variable/contextReference nodes.
    // Evaluating would attempt a lookup (failing for undefined vars), so we use
    // the raw name and the scope the node carries.
    const variable = scopedVariableOf(firstArg);
    if (variable) {
      // Only treat as a variable if it does NOT resolve to an element-like thing.
      // Try evaluating cheaply; if it throws or gives non-element, fall back to variable.
      try {
        const evaluated = await evaluator.evaluate(firstArg as ASTNode, context);
        if (isHTMLElement(evaluated) || Array.isArray(evaluated)) {
          // It's an element — fall through to form-field handling below
        } else {
          return { type: 'variable', ...variable };
        }
      } catch {
        return { type: 'variable', ...variable };
      }
    }

    // Element target(s): resolve and require a form field
    const targets = await resolveTargetsFromArgs(
      raw.args,
      evaluator,
      context,
      'clear',
      { fallbackModifierKey: 'on' },
      raw.modifiers
    );
    return { type: 'form-fields', targets };
  }

  async execute(input: ClearCommandInput, context: TypedExecutionContext): Promise<void> {
    if (input.type === 'variable') {
      // Scope-aware, via the same helper `set` writes through — see
      // scopedVariableOf. A bare `context.locals.set()` here silently missed
      // every element-scoped `:var`.
      setVariableValue(input.name, null, context, input.scope);
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
