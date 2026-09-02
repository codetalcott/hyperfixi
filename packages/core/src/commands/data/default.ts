/**
 * DefaultCommand - Optimized Implementation
 *
 * Sets values only if they don't already exist.
 * Uses shared helpers to reduce code duplication.
 *
 * Optimized: 424 lines → ~160 lines using shared helpers
 *
 * Syntax:
 *   default <expression> to <expression>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { getVariableValue, setVariableValue } from '../helpers/variable-access';
import {
  getElementProperty,
  setElementProperty,
  getElementValue,
  setElementValue,
  isEmpty,
} from '../helpers/element-property-access';
import { resolveWriteTarget, type WriteTarget } from '../helpers/write-target';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

/**
 * Typed input for DefaultCommand (discriminated union).
 *
 * Mirrors `SetCommandInput`: `default` is set's write surface with a nullish
 * guard in front of it, and it resolves its target the same way — symbolically,
 * from the raw AST node. The previous single `{ target, value }` shape forced
 * `parseInput` to EVALUATE the target and `execute` to re-derive the slot by
 * string-matching the result, which is what broke every documented example
 * (evaluating an unset variable yields `undefined` — precisely the case
 * `default` exists to handle).
 */
export type DefaultCommandInput =
  | { type: 'variable'; name: string; value: unknown; scope?: 'element' | 'global' }
  | { type: 'attribute'; elements: HTMLElement[]; name: string; value: unknown }
  | { type: 'property'; element: HTMLElement; property: string; value: unknown }
  | { type: 'element'; element: HTMLElement; value: unknown };

/**
 * Output from default command execution
 */
export interface DefaultCommandOutput {
  target: string;
  value: unknown;
  wasSet: boolean;
  existingValue?: unknown;
  targetType: 'variable' | 'attribute' | 'property' | 'element';
}

/**
 * `:x` / `$x` — the semantic path's shape for a scoped variable.
 *
 * The shared ladder's bare-reference rung claims `identifier`/`variable`/
 * `symbol` nodes, which is what the TRADITIONAL parser emits (`:x` →
 * `identifier{ name:'x', scope:'element' }`). The semantic path renders the
 * same source as a `contextReference`, a kind the rung does not claim — and
 * must not, since `me`/`it`/`result` are contextReferences too and are not
 * writable variable slots. Hence the sigil gate here rather than a widening of
 * the shared ladder, which `set`/`append`/`prepend` also walk.
 */
function scopedVariableTarget(
  node: Record<string, unknown> | undefined
): { name: string; scope: 'element' | 'global' } | null {
  if (node?.['type'] !== 'contextReference') return null;
  const name = node['name'];
  if (typeof name !== 'string') return null;
  if (name.startsWith(':')) return { name: name.slice(1), scope: 'element' };
  if (name.startsWith('$')) return { name: name.slice(1), scope: 'global' };
  return null;
}

/** Map a resolved write slot onto default's input union. */
function toDefaultInput(target: WriteTarget, value: unknown): DefaultCommandInput {
  switch (target.kind) {
    case 'attribute':
      return { type: 'attribute', elements: target.elements, name: target.name, value };
    case 'property':
      return {
        type: 'property',
        element: target.target.element,
        property: target.target.property,
        value,
      };
    case 'variable': {
      // A `$`-prefixed name must lose its sigil here: `setVariableValue` stores
      // `$g` under the BARE key `g` in globals while `getVariableValue` looks up
      // the literal name, so a target that kept its sigil would read `undefined`
      // forever and overwrite the global on every run — the exact bug `default`
      // exists to avoid. (`set` never reads, so it does not notice.)
      const isGlobalSigil = target.name.startsWith('$');
      const name = isGlobalSigil ? target.name.slice(1) : target.name;
      const scope = isGlobalSigil ? 'global' : target.scope;
      return { type: 'variable', name, value, ...(scope ? { scope } : {}) };
    }
    default:
      throw new Error(`default: unrequested write-target rung '${target.kind}'`);
  }
}

@command({ name: 'default' })
export class DefaultCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: "Set a value only if it doesn't already exist",
    syntax: ['default <expression> to <expression>'],
    examples: [
      'default myVar to "fallback"',
      'default @data-theme to "light"',
      'default my innerHTML to "No content"',
    ],
    sideEffects: ['data-mutation', 'dom-mutation'],
    category: 'data',
    compatibility: 'standard',
  });

  get metadata() {
    return DefaultCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<DefaultCommandInput> {
    if (raw.args.length < 1) {
      throw new Error('default command requires a target');
    }

    const value = await this.extractValue(raw, evaluator, context);
    const firstArg = raw.args[0] as unknown as Record<string, unknown>;

    const scoped = scopedVariableTarget(firstArg);
    if (scoped) {
      return { type: 'variable', name: scoped.name, value, scope: scoped.scope };
    }

    // The shared raw-AST write-target ladder (`helpers/write-target.ts`), the
    // same one `set`/`append`/`prepend` walk. Every rung inspects the node
    // BEFORE evaluation, which is the whole point: evaluating a write target
    // yields its current VALUE, and for `default` that value is `undefined`
    // exactly when the command is supposed to act.
    //
    // Rungs requested: attribute + property + bare reference. Not requested:
    // `nodeWriters` (plugin write targets like reactivity's `^count` — `default
    // ^count to 0` is undocumented and the plugin has no read side to guard
    // against), `selectorSource` and `styleSplit` (default has no `on` modifier
    // and no `*prop` form; a selector target means "fill this element's value",
    // which is the evaluated tail below).
    const slot = await resolveWriteTarget(firstArg, evaluator, context, {
      scopeElements: async () => (context.me ? [context.me as HTMLElement] : []),
      bareReference: true,
    });
    if (slot) return toDefaultInput(slot, value);

    // Evaluated tail: shapes the ladder does not name. A selector or expression
    // whose VALUE is the element to fill (`default #out to "x"`) — here
    // evaluation is correct, because the element is the target, not its name.
    const evaluated = await evaluator.evaluate(raw.args[0], context);
    if (isHTMLElement(evaluated)) {
      return { type: 'element', element: evaluated as HTMLElement, value };
    }
    if (Array.isArray(evaluated) && isHTMLElement(evaluated[0])) {
      return { type: 'element', element: evaluated[0] as HTMLElement, value };
    }
    if (typeof evaluated === 'string') {
      // A target that legitimately evaluates to a NAME (e.g. a literal node).
      return { type: 'variable', name: evaluated, value };
    }

    throw new Error(`Invalid target type: ${typeof evaluated}`);
  }

  /**
   * The value to install: `to <value>`.
   *
   * Both parsers emit `modifiers.to` (the traditional one since Arc 3 step
   * 3's `set` migration — before that it emitted a positional
   * `[target, identifier('to'), value]` triple, and the code here once took
   * `args[1]` for the value, which was the KEYWORD, so every traditionally
   * parsed `default X to Y` installed `undefined`). The bare two-arg form is
   * kept for callers that build the node directly.
   */
  private async extractValue(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<unknown> {
    if (raw.modifiers?.to) {
      return evaluator.evaluate(raw.modifiers.to, context);
    }

    if (raw.args.length >= 2) {
      return evaluator.evaluate(raw.args[1], context);
    }

    throw new Error('default command requires a value (use "to <value>")');
  }

  async execute(
    input: DefaultCommandInput,
    context: TypedExecutionContext
  ): Promise<DefaultCommandOutput> {
    switch (input.type) {
      case 'variable':
        return this.defaultVariable(context, input.name, input.value, input.scope);
      case 'attribute':
        return this.defaultAttribute(context, input.elements, input.name, input.value);
      case 'property':
        return this.defaultElementProperty(context, input.element, input.property, input.value);
      case 'element':
        return this.defaultElementValue(context, input.element, input.value);
    }
  }

  private defaultVariable(
    context: TypedExecutionContext,
    name: string,
    value: unknown,
    scope?: 'element' | 'global'
  ): DefaultCommandOutput {
    const existingValue = getVariableValue(name, context, scope);

    // Nullish check (matches upstream _hyperscript 0.9.90+): only null/undefined
    // are considered "missing". Preserves falsy values like 0, false, ''.
    if (existingValue != null) {
      return { target: name, value, wasSet: false, existingValue, targetType: 'variable' };
    }

    setVariableValue(name, value, context, scope);
    Object.assign(context, { it: value });

    return { target: name, value, wasSet: true, targetType: 'variable' };
  }

  private defaultAttribute(
    context: TypedExecutionContext,
    elements: HTMLElement[],
    name: string,
    value: unknown
  ): DefaultCommandOutput {
    if (elements.length === 0) {
      throw new Error('No element context available for attribute default');
    }

    const missing = elements.filter(el => el.getAttribute(name) === null);

    if (missing.length === 0) {
      return {
        target: `@${name}`,
        value,
        wasSet: false,
        existingValue: elements[0].getAttribute(name),
        targetType: 'attribute',
      };
    }

    for (const el of missing) {
      el.setAttribute(name, String(value));
    }
    Object.assign(context, { it: value });

    return { target: `@${name}`, value, wasSet: true, targetType: 'attribute' };
  }

  private defaultElementProperty(
    context: TypedExecutionContext,
    element: HTMLElement,
    property: string,
    value: unknown
  ): DefaultCommandOutput {
    const existingValue = getElementProperty(element, property);

    if (!isEmpty(existingValue)) {
      return { target: property, value, wasSet: false, existingValue, targetType: 'property' };
    }

    setElementProperty(element, property, value);
    Object.assign(context, { it: value });

    return { target: property, value, wasSet: true, targetType: 'property' };
  }

  private defaultElementValue(
    context: TypedExecutionContext,
    element: HTMLElement,
    value: unknown
  ): DefaultCommandOutput {
    const existingValue = getElementValue(element);

    if (!isEmpty(existingValue)) {
      return { target: 'element', value, wasSet: false, existingValue, targetType: 'element' };
    }

    setElementValue(element, value);
    Object.assign(context, { it: value });

    return { target: 'element', value, wasSet: true, targetType: 'element' };
  }
}

export const createDefaultCommand = createFactory(DefaultCommand);
export default DefaultCommand;
