/**
 * TransitionCommand - Decorated Implementation
 *
 * Animates CSS properties using CSS transitions.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   transition <property> to <value>
 *   transition <property> to <value> over <duration>
 *   transition <property> to <value> over <duration> with <timing-function>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement, isNodeList } from '../../utils/element-check';
import { resolveElement } from '../helpers/element-resolution';
import { parseDuration, camelToKebab } from '../helpers/duration-parsing';
import { waitForTransitionEnd } from '../helpers/event-waiting';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import type { CommandRaw } from '../../ast/command-slots';

/**
 * The CSS property name a node NAMES, for a node the evaluator resolves to
 * nothing.
 *
 * `transition <property>` takes a property NAME, but the two parse paths spell
 * it differently and only one of them evaluates to its own text:
 *
 *   traditional   `transition opacity to 0.5`  → `string{value:'opacity'}`   → "opacity"
 *   semantic      same source                  → `identifier{name:'opacity'}` → **undefined**
 *
 * An unbound identifier evaluates to `undefined`, so `String(firstArg)` became
 * the literal string `"undefined"` — truthy, so the guard below let it through,
 * and the command transitioned a CSS property named `undefined`: a SILENT
 * no-op on the DEFAULT parse path. Measured before this existed: `transition
 * opacity to 0.5` and `transition color to red` changed nothing, while
 * `transition *opacity …` and `transition left …` worked — the first because
 * the `*` sigil makes it a selector token, the second because `left` is a
 * keyword token, so both arrive as strings either way. That is the same
 * `String(undefined)` class this file already fixed once for the TARGET slot.
 *
 * `my opacity` is the second shape: the semantic path builds one
 * `propertyAccess` node (`me` . `opacity`) where the traditional path emits two
 * args (`[me, "opacity"]`), so the property name is the node's own field and
 * the object is the target.
 *
 * Fixed at the consumer rather than at either producer: `transition` is the
 * only command that needs a CSS property name out of an expression slot, the
 * semantic schema admits `expression` there DELIBERATELY (see transitionSchema
 * — a literal-only patient dropped the idiomatic unquoted form in every
 * language), and every runtime consumer — core, the multilingual bundles, the
 * R2 execution validator — goes through this method.
 */
function namedPropertyOf(node: unknown): { property: string; objectNode?: unknown } | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as {
    type?: string;
    name?: unknown;
    value?: unknown;
    property?: unknown;
    object?: unknown;
  };

  if (n.type === 'identifier' && typeof n.name === 'string' && n.name) {
    return { property: n.name };
  }

  if (n.type === 'propertyAccess' || n.type === 'memberExpression') {
    // `property` is a bare string on the semantic node and an identifier node
    // on the core one.
    const prop = n.property;
    const name =
      typeof prop === 'string'
        ? prop
        : typeof (prop as { name?: unknown })?.name === 'string'
          ? (prop as { name: string }).name
          : undefined;
    if (name) return { property: name, objectNode: n.object };
  }

  return null;
}

/**
 * Typed input for TransitionCommand
 */
export interface TransitionCommandInput {
  target?: string | HTMLElement;
  property: string;
  value: string | number;
  duration?: number | string;
  timingFunction?: string;
}

/**
 * Output from Transition command execution
 */
export interface TransitionCommandOutput {
  element: HTMLElement;
  property: string;
  fromValue: string;
  toValue: string;
  duration: number;
  completed: boolean;
}

/**
 * TransitionCommand - Animate CSS with transitions
 *
 * Before: 250 lines
 * After: ~130 lines (48% reduction)
 */
@command({ name: 'transition' })
export class TransitionCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Animate CSS properties using CSS transitions',
    syntax: 'transition [<target>] <property> to <value> [over <duration>] [with <timing>]',
    examples: [
      'transition opacity to 0.5',
      'transition my *opacity to 0 over 200ms',
      "transition #box's *opacity to 0 over 200ms",
      'transition left to 100px over 500ms',
      'transition background-color to red over 1s with ease-in-out',
    ],
    sideEffects: ['style-change', 'timing'],
    category: 'animation',
    compatibility: 'standard',
  });

  get metadata() {
    return TransitionCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'transition'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<TransitionCommandInput> {
    if (!raw.args?.length) throw new Error('transition requires property and value');

    let property: string;
    let target: string | HTMLElement | undefined;

    const firstArg = await evaluator.evaluate(raw.args[0], context);

    // A selector arg can evaluate to an element collection; take the first,
    // as resolveElement would for a selector string.
    const asElement = (value: unknown): unknown =>
      Array.isArray(value) || isNodeList(value) ? (value as ArrayLike<unknown>)[0] : value;

    const firstAsElement = asElement(firstArg);

    if (
      isHTMLElement(firstAsElement) ||
      (typeof firstArg === 'string' && /^[#.]|^(?:me|it|you)$/.test(firstArg))
    ) {
      target = firstAsElement as string | HTMLElement;
      property = String(await evaluator.evaluate(raw.args[1], context));
    } else if (raw.args.length >= 2) {
      // The parser emits `[target, property]` (parseTransitionCommand), so a
      // two-arg call whose target did not resolve is a missing element — NOT a
      // property. Before this branch existed the target was silently ignored
      // and `String(undefined)` became the property name: an unset `its` /
      // absent selector transitioned a property called "undefined", a no-op
      // with no error.
      throw new Error('transition: target element not found');
    } else if (firstArg === undefined || firstArg === null) {
      // The node evaluated to nothing — take the name it SPELLS. See
      // namedPropertyOf: this is the semantic path's bare `opacity` /
      // `my opacity`, which the traditional path spells as a string.
      const named = namedPropertyOf(raw.args[0]);
      if (!named) throw new Error('transition requires a CSS property');
      property = named.property;
      if (named.objectNode !== undefined) {
        const owner = asElement(await evaluator.evaluate(named.objectNode as ASTNode, context));
        if (isHTMLElement(owner)) target = owner as HTMLElement;
      }
    } else {
      property = String(firstArg);
    }

    // `'undefined'` is not a CSS property, and reaching this line with it means
    // a node evaluated to nothing and was stringified anyway — the silent-no-op
    // class above. Fail loudly instead of animating a property that cannot
    // exist.
    if (!property || property === 'undefined' || property === 'null') {
      throw new Error('transition requires a CSS property');
    }
    if (!raw.modifiers?.to) throw new Error('transition requires "to <value>"');

    let value = await evaluator.evaluate(raw.modifiers.to, context);

    // Handle CSS keywords like 'initial', 'inherit', 'unset' that evaluate to undefined
    // because they're not defined as variables - use the raw identifier name instead
    if (value === undefined && (raw.modifiers.to as any).type === 'identifier') {
      value = (raw.modifiers.to as any).name;
    }

    const result: TransitionCommandInput = { property, value: value as string | number };
    if (target !== undefined) result.target = target;
    if (raw.modifiers?.over)
      result.duration = await evaluator.evaluate(raw.modifiers.over, context);
    if (raw.modifiers?.with)
      result.timingFunction = String(await evaluator.evaluate(raw.modifiers.with, context));
    return result;
  }

  async execute(
    input: TransitionCommandInput,
    context: TypedExecutionContext
  ): Promise<TransitionCommandOutput> {
    let { property } = input;
    const { target, value, duration: durationInput, timingFunction } = input;

    if (property.startsWith('*')) property = property.substring(1);
    property = camelToKebab(property);

    const targetElement = resolveElement(target, context, 'transition');
    const duration = parseDuration(durationInput, 300);
    const fromValue = getComputedStyle(targetElement).getPropertyValue(property);

    const originalTransition = targetElement.style.transition;
    const transitionProp = `${property} ${duration}ms ${timingFunction || 'ease'}`;
    targetElement.style.transition = originalTransition
      ? `${originalTransition}, ${transitionProp}`
      : transitionProp;

    let toValue = String(value);
    let removeInlineAfter = false;

    // Handle CSS keywords that should restore to stylesheet value, not CSS spec initial
    // 'initial' in hyperscript means "restore to original" not CSS's transparent/default
    if (
      toValue === 'initial' ||
      toValue === 'inherit' ||
      toValue === 'unset' ||
      toValue === 'revert'
    ) {
      // Get the stylesheet value by temporarily removing inline style
      const currentInline = targetElement.style.getPropertyValue(property);
      targetElement.style.removeProperty(property);
      toValue = getComputedStyle(targetElement).getPropertyValue(property);
      // Restore inline style so transition can animate FROM current value
      if (currentInline) {
        targetElement.style.setProperty(property, currentInline);
      }
      removeInlineAfter = true;
    }

    targetElement.style.setProperty(property, toValue);

    const result = await waitForTransitionEnd(targetElement, property, duration);
    targetElement.style.transition = originalTransition;

    // If we transitioned to "initial", remove inline style to let stylesheet take over
    if (removeInlineAfter) {
      targetElement.style.removeProperty(property);
    }

    // No `it` assignment — upstream parity; same reasoning as settle.ts.
    return {
      element: targetElement,
      property,
      fromValue,
      toValue,
      duration,
      completed: result.completed,
    };
  }
}

export const createTransitionCommand = createFactory(TransitionCommand);
export default TransitionCommand;
