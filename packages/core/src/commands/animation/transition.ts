/**
 * TransitionCommand - Decorated Implementation
 *
 * Animates CSS properties using CSS transitions.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   transition <property> [from <value>] to <value> [<property> … to <value>]…
 *              [over <duration>] [using <css transition> | with <timing-function>]
 *
 * Each <property> names a style and, optionally, its owner: `*opacity`,
 * `#a's *opacity`, `next .panel's *max-height`, `*max-height of #panel`.
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
 * One property of a transition: its owner, the style, an optional start value
 * and the value it moves to.
 */
export interface TransitionPairInput {
  /**
   * The element(s) whose style moves; `me` when absent. A collection moves
   * every element in it, as upstream's implicit loop does.
   */
  target?: string | HTMLElement | HTMLElement[];
  property: string;
  value: string | number;
  /** `from <value>`: applied before the transition starts. */
  from?: string | number;
}

/**
 * Typed input for TransitionCommand. The first pair's fields sit at the top
 * level, so a single-property transition reads as it always has.
 */
export interface TransitionCommandInput extends TransitionPairInput {
  duration?: number | string;
  timingFunction?: string;
  /** `using <css>`, upstream's form: the element's whole `transition` value while it runs. */
  using?: string;
  /** Every pair after the first: `transition *width to 100px *height to 50px`. */
  pairs?: TransitionPairInput[];
}

/** One element's share of one pair, as `execute` runs it. */
interface TransitionJob {
  element: HTMLElement;
  property: string;
  pair: TransitionPairInput;
  fromValue: string;
  toValue: string;
  removeInlineAfter: boolean;
}

/** Values that restore the stylesheet's value rather than naming one. */
const RESTORE_KEYWORDS = new Set(['initial', 'inherit', 'unset', 'revert']);

/** The HTML elements a value holds: one element, or a collection's. */
function elementsOf(value: unknown): HTMLElement[] {
  if (Array.isArray(value) || isNodeList(value)) {
    return Array.from(value as ArrayLike<unknown>).filter(isHTMLElement) as HTMLElement[];
  }
  return isHTMLElement(value) ? [value as HTMLElement] : [];
}

/**
 * A value node's value. A CSS keyword (`initial`, `inherit`, …) is an unbound
 * name that evaluates to undefined, so it stands for its own name.
 */
async function valueOf(
  node: ASTNode,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<string | number> {
  const value = await evaluator.evaluate(node, context);
  const name = (node as { name?: unknown }).name;
  if (value === undefined && node.type === 'identifier' && typeof name === 'string') return name;
  return value as string | number;
}

/**
 * The longest duration plus delay in a CSS `transition` value, in ms: how long
 * a `using <css>` transition can take, and so how long to wait for it before
 * giving up on `transitionend`. Undefined when the value names no time.
 */
function longestTransitionMs(css: string): number | undefined {
  let longest: number | undefined;
  for (const item of css.split(',')) {
    const times = [...item.matchAll(/(\d*\.?\d+)(ms|s)\b/g)].map(
      m => parseFloat(m[1]!) * (m[2] === 's' ? 1000 : 1)
    );
    if (times.length > 0) longest = Math.max(longest ?? 0, times[0]! + (times[1] ?? 0));
  }
  return longest;
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
    syntax:
      'transition <property> [from <value>] to <value> [<property> … to <value>]… [over <duration>] [using <css> | with <timing>]',
    examples: [
      'transition opacity to 0.5',
      'transition my *opacity to 0 over 200ms',
      "transition #box's *opacity to 0 over 200ms",
      'transition left to 100px over 500ms',
      'transition background-color to red over 1s with ease-in-out',
      'transition *width to 100px *height to 50px over 300ms',
      'transition *opacity of #panel from 0 to 1 over 200ms',
      'transition my *opacity to 0 using "opacity 1s ease-in"',
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
    let target: string | HTMLElement | HTMLElement[] | undefined;

    const firstArg = await evaluator.evaluate(raw.args[0], context);
    // A selector or query owner evaluates to a collection, and every element
    // in it moves (upstream's implicit loop). This took the first one only.
    const owners = elementsOf(firstArg);

    if (
      owners.length > 0 ||
      (typeof firstArg === 'string' && /^[#.]|^(?:me|it|you)$/.test(firstArg))
    ) {
      target = owners.length === 1 ? owners[0] : owners.length > 1 ? owners : (firstArg as string);
      property = String(await evaluator.evaluate(raw.args[1] as ASTNode, context));
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
        const owner = elementsOf(await evaluator.evaluate(named.objectNode as ASTNode, context));
        if (owner.length > 0) target = owner.length === 1 ? owner[0] : owner;
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

    const result: TransitionCommandInput = {
      property,
      value: await valueOf(raw.modifiers.to, evaluator, context),
    };
    if (target !== undefined) result.target = target;
    if (raw.modifiers?.from) result.from = await valueOf(raw.modifiers.from, evaluator, context);
    if (raw.modifiers?.pairs) {
      result.pairs = await this.laterPairs(raw.modifiers.pairs, evaluator, context);
    }
    if (raw.modifiers?.over)
      result.duration = await evaluator.evaluate(raw.modifiers.over, context);
    if (raw.modifiers?.with)
      result.timingFunction = String(await evaluator.evaluate(raw.modifiers.with, context));
    if (raw.modifiers?.using)
      result.using = String(await evaluator.evaluate(raw.modifiers.using, context));
    return result;
  }

  /**
   * The pairs after the first, from the parser's `pairs` slot: an array of
   * objects with `property` and `to`, and `owner` / `from` when given.
   */
  private async laterPairs(
    node: ASTNode,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<TransitionPairInput[]> {
    const pairs: TransitionPairInput[] = [];
    for (const pairNode of (node as { elements?: ASTNode[] }).elements ?? []) {
      const fields = new Map<string, ASTNode>();
      const properties =
        (pairNode as { properties?: Array<{ key: { name?: unknown }; value: ASTNode }> })
          .properties ?? [];
      for (const { key, value } of properties) {
        if (typeof key.name === 'string') fields.set(key.name, value);
      }
      const propertyNode = fields.get('property');
      const toNode = fields.get('to');
      if (!propertyNode || !toNode) throw new Error('transition requires property and value');

      const pair: TransitionPairInput = {
        property: String(await evaluator.evaluate(propertyNode, context)),
        value: await valueOf(toNode, evaluator, context),
      };
      const ownerNode = fields.get('owner');
      if (ownerNode) {
        const owners = elementsOf(await evaluator.evaluate(ownerNode, context));
        if (owners.length === 0) throw new Error('transition: target element not found');
        pair.target = owners.length === 1 ? owners[0] : owners;
      }
      const fromNode = fields.get('from');
      if (fromNode) pair.from = await valueOf(fromNode, evaluator, context);
      pairs.push(pair);
    }
    return pairs;
  }

  async execute(
    input: TransitionCommandInput,
    context: TypedExecutionContext
  ): Promise<TransitionCommandOutput> {
    const duration = parseDuration(
      input.duration,
      (input.using !== undefined && longestTransitionMs(input.using)) || 300
    );
    const timing = input.timingFunction || 'ease';

    // Every element of every pair. Each pair moves its own owner, as
    // upstream's: `*width of #a to 10px *height to 5px` moves #a's width and
    // `me`'s height.
    const jobs: TransitionJob[] = [];
    for (const pair of [input, ...(input.pairs ?? [])]) {
      let property = pair.property;
      if (property.startsWith('*')) property = property.substring(1);
      property = camelToKebab(property);
      const elements = Array.isArray(pair.target)
        ? pair.target.filter(isHTMLElement)
        : [resolveElement(pair.target, context, 'transition')];
      for (const element of elements) {
        jobs.push({
          element,
          property,
          pair,
          fromValue: getComputedStyle(element).getPropertyValue(property),
          toValue: '',
          removeInlineAfter: false,
        });
      }
    }
    if (jobs.length === 0) throw new Error('transition: target element not found');

    // 1. `from` values, before the transition style exists so they apply at
    //    once, then a reflow so the browser starts from them.
    for (const job of jobs) {
      if (job.pair.from !== undefined) {
        job.element.style.setProperty(job.property, String(job.pair.from));
      }
    }
    for (const job of jobs) if (job.pair.from !== undefined) void job.element.offsetWidth;

    // 2. The transition, once per element, for all of that element's
    //    properties. `using` replaces the whole value, as upstream's does.
    const originals = new Map<HTMLElement, string>();
    for (const job of jobs) {
      if (!originals.has(job.element)) originals.set(job.element, job.element.style.transition);
    }
    for (const [element, original] of originals) {
      const own = jobs
        .filter(job => job.element === element)
        .map(job => `${job.property} ${duration}ms ${timing}`);
      element.style.transition = input.using ?? [original, ...own].filter(Boolean).join(', ');
    }

    // 3. The values each property moves to.
    for (const job of jobs) {
      const { element, property } = job;
      let toValue = String(job.pair.value);

      // Handle CSS keywords that should restore to stylesheet value, not CSS spec initial
      // 'initial' in hyperscript means "restore to original" not CSS's transparent/default
      if (RESTORE_KEYWORDS.has(toValue)) {
        // Get the stylesheet value by temporarily removing inline style
        const currentInline = element.style.getPropertyValue(property);
        element.style.removeProperty(property);
        toValue = getComputedStyle(element).getPropertyValue(property);
        // Restore inline style so transition can animate FROM current value
        if (currentInline) {
          element.style.setProperty(property, currentInline);
        }
        job.removeInlineAfter = true;
      }

      job.toValue = toValue;
      element.style.setProperty(property, toValue);
    }

    // 4. Wait for every one, then put each element's transition back.
    const results = await Promise.all(
      jobs.map(job => waitForTransitionEnd(job.element, job.property, duration))
    );
    for (const [element, original] of originals) element.style.transition = original;

    // If we transitioned to "initial", remove inline style to let stylesheet take over
    for (const job of jobs) {
      if (job.removeInlineAfter) job.element.style.removeProperty(job.property);
    }

    // No `it` assignment — upstream parity; same reasoning as settle.ts.
    const first = jobs[0]!;
    return {
      element: first.element,
      property: first.property,
      fromValue: first.fromValue,
      toValue: first.toValue,
      duration,
      completed: results.every(result => result.completed),
    };
  }
}

export const createTransitionCommand = createFactory(TransitionCommand);
export default TransitionCommand;
