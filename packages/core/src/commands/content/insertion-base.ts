/**
 * ContentInsertionCommand — shared implementation for `append` and `prepend`.
 *
 * `append` is upstream _hyperscript's command; `prepend` is a hyperfixi
 * extension with identical semantics at the other end (upstream only offers
 * `put X at the start of Y`).
 *
 * Upstream `append` (hyperscript.org 0.9.93) resolves in this order:
 *   Array   → push
 *   Set     → add
 *   Element → insertAdjacentElement/insertAdjacentHTML('beforeend') + processNode
 *   assignable target → set(target, (target || "") + value)
 *   otherwise → throw new Error("Unable to append a value!")
 * with a missing `to` defaulting to the implicit `result` symbol (aliased by `it`).
 *
 * Two deliberate divergences, both improvements:
 *
 * 1. Multi-element targets. Upstream evaluates `.items` to an ElementCollection
 *    which is neither Array nor Element but IS "assignable", so upstream's
 *    `append "x" to .items` replaces every match with the string
 *    `"[object Object]x"` — a genuine upstream bug. We instead insert into each
 *    matched element, mirroring upstream's own `put X at end of Y` (implicitLoop).
 *
 * 2. Writable non-variable targets. `@attr`, `#el's value`, `my innerHTML` are
 *    resolved from the RAW AST before evaluation, so they read-modify-write the
 *    real attribute/property. Evaluating them first (the previous behavior)
 *    yielded the current value and then treated it as a variable NAME, silently
 *    creating junk locals and never touching the DOM.
 *
 * No explicit processNode call: commands cannot reach the runtime, and the
 * attribute processors' MutationObserver already wires inserted `_="..."`
 * content. Using insertAdjacent* rather than `innerHTML +=` is what makes that
 * work — `innerHTML +=` tears down and recreates every existing child, which
 * loses input state, event listeners and node identity, and floods the observer.
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { getVariableValue, setVariableValue } from '../helpers/variable-access';
import { insertContentSemantic, type SemanticPosition } from '../helpers/dom-mutation';
import {
  resolveAnyPropertyTarget,
  readPropertyTarget,
  writePropertyTarget,
  type PropertyTarget,
} from '../helpers/property-target';
import { resolveAttributeWriteTarget } from '../helpers/attribute-target';
import type { DecoratedCommand, CommandMetadata } from '../decorators';

/** Where content lands, and how scalar values combine. */
export type InsertionPosition = Extract<SemanticPosition, 'append' | 'prepend'>;

/** Typed input (discriminated union, mirroring SetCommand's shape). */
export type InsertionCommandInput =
  | { kind: 'selector'; selector: string; content: unknown }
  | { kind: 'elements'; elements: HTMLElement[]; content: unknown }
  | { kind: 'attribute'; elements: HTMLElement[]; name: string; content: unknown }
  | { kind: 'property'; property: PropertyTarget; content: unknown }
  | { kind: 'variable'; name: string; scope?: 'element' | 'global'; content: unknown }
  | { kind: 'value'; target: unknown; content: unknown }
  | { kind: 'implicit'; content: unknown };

/**
 * Output shape matches SetCommand's so `unwrapCommandResult` (runtime-base)
 * assigns the VALUE to `it`/`result` between commands, not the wrapper object.
 */
export interface InsertionCommandOutput {
  target: unknown;
  value: unknown;
  targetType: 'element' | 'attribute' | 'property' | 'variable' | 'array' | 'set' | 'result';
}

/** Content coerced for DOM insertion: elements stay live, everything else stringifies. */
function toInsertable(content: unknown): string | HTMLElement {
  return isHTMLElement(content) ? (content as HTMLElement) : String(content);
}

export abstract class ContentInsertionCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  protected constructor(protected readonly position: InsertionPosition) {}

  /** Combine a scalar current value with the content, respecting insertion end. */
  private concat(current: unknown, content: unknown): string {
    const base = current == null ? '' : String(current);
    const added = String(content);
    return this.position === 'append' ? base + added : added + base;
  }

  /** Add to a list at the correct end. */
  private pushInto(list: unknown[], content: unknown): unknown[] {
    if (this.position === 'append') list.push(content);
    else list.unshift(content);
    return list;
  }

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<InsertionCommandInput> {
    if (!raw.args?.length) throw new Error(`${this.name} requires content`);

    const content = await evaluator.evaluate(raw.args[0], context);

    // The hybrid parser emits a top-level `target` instead of a `to` modifier.
    const toNode = (raw.modifiers?.to ?? (raw as { target?: ExpressionNode }).target) as
      ExpressionNode | undefined;
    if (!toNode) return { kind: 'implicit', content };

    const node = toNode as unknown as Record<string, unknown>;
    const nodeType = node.type as string | undefined;

    // (1) Selector nodes keep their SOURCE text — resolving at execute time lets
    //     a multi-match selector insert into every element.
    if (nodeType === 'selector' && typeof node.value === 'string') {
      return { kind: 'selector', selector: node.value, content };
    }

    // (2) Attribute write targets (`@attr`, `@attr of X`, `X[@attr]`), recognized
    //     before evaluation. Standalone `@attr` scopes to `me` — append/prepend
    //     have no `on` modifier (MULTI_WORD_PATTERNS lists only `to`).
    const attrTarget = await resolveAttributeWriteTarget(toNode, evaluator, context, async () =>
      isHTMLElement(context.me) ? [context.me as HTMLElement] : []
    );
    if (attrTarget) {
      return {
        kind: 'attribute',
        elements: attrTarget.elements,
        name: attrTarget.name,
        content,
      };
    }

    // (3) Property targets: `#el's value`, `my innerHTML`, `the X of Y`, `*opacity`.
    const propertyTarget = await resolveAnyPropertyTarget(toNode as ASTNode, evaluator, context);
    if (propertyTarget) return { kind: 'property', property: propertyTarget, content };

    // (4) Bare references keep their NAME so execute can read+write the binding.
    //     Evaluating would yield the current value and lose it. The parser's
    //     scope tag routes `:name` to element scope and `$name`/`global` to globals.
    if (
      (nodeType === 'identifier' || nodeType === 'variable' || nodeType === 'symbol') &&
      typeof node.name === 'string'
    ) {
      const rawScope = node.scope as string | undefined;
      const scope = rawScope === 'element' || rawScope === 'global' ? rawScope : undefined;
      return { kind: 'variable', name: node.name, scope, content };
    }

    // (5) Anything else: evaluate and dispatch on the runtime value.
    const value = await evaluator.evaluate(toNode as ASTNode, context);
    const elements = this.asElementList(value);
    if (elements) return { kind: 'elements', elements, content };
    return { kind: 'value', target: value, content };
  }

  async execute(
    input: InsertionCommandInput,
    context: TypedExecutionContext
  ): Promise<InsertionCommandOutput> {
    switch (input.kind) {
      case 'selector':
        return this.done(context, this.insertIntoSelector(input.selector, input.content));

      case 'elements':
        return this.done(context, this.insertIntoEach(input.elements, input.content));

      case 'attribute': {
        for (const el of input.elements) {
          el.setAttribute(input.name, this.concat(el.getAttribute(input.name), input.content));
        }
        const value =
          input.elements[0]?.getAttribute(input.name) ?? this.concat(null, input.content);
        Object.assign(context, { it: value });
        return { target: `@${input.name}`, value, targetType: 'attribute' };
      }

      case 'property': {
        const current = readPropertyTarget(input.property);
        const combined = this.combineValue(current, input.content);
        // An element-valued property (e.g. an element's `firstChild`) is not a
        // string slot — combineValue already inserted into it; don't overwrite.
        if (!isHTMLElement(current)) writePropertyTarget(input.property, combined);
        Object.assign(context, { it: combined });
        return { target: input.property.element, value: combined, targetType: 'property' };
      }

      case 'variable':
        return this.executeVariable(input, context);

      case 'value': {
        const combined = this.combineValue(input.target, input.content, true);
        Object.assign(context, { it: combined });
        return {
          target: input.target,
          value: combined,
          targetType: this.targetTypeOf(input.target),
        };
      }

      case 'implicit':
        return this.execImplicit(context, input.content);
    }
  }

  // ========== Private helpers ==========

  /** Resolve a selector to elements and insert into every match. */
  private insertIntoSelector(selector: string, content: unknown): HTMLElement[] {
    if (typeof document === 'undefined') throw new Error('DOM not available');
    const els = Array.from(document.querySelectorAll(selector)).filter((e): e is HTMLElement =>
      isHTMLElement(e)
    );
    // Same contract as `put`: an unmatched selector is a programming error, not
    // a silent no-op.
    if (!els.length) throw new Error(`No elements: "${selector}"`);
    return this.insertIntoEach(els, content);
  }

  private insertIntoEach(elements: HTMLElement[], content: unknown): HTMLElement[] {
    const insertable = toInsertable(content);
    for (const el of elements) {
      // NOTE: an Element value can only exist in one place, so across multiple
      // targets it MOVES and ends up inside the last one. Strings are copied.
      insertContentSemantic(el, insertable, this.position);
    }
    return elements;
  }

  /**
   * Combine a resolved target value with the content, upstream's dispatch order.
   *
   * @param strict - when true, an unappendable target throws (upstream parity).
   *   Variable/implicit slots pass false: an undefined or scalar binding is a
   *   legitimate string accumulator there.
   */
  private combineValue(current: unknown, content: unknown, strict = false): unknown {
    if (Array.isArray(current)) return this.pushInto(current, content);
    if (current instanceof Set) {
      current.add(content);
      return current;
    }
    if (isHTMLElement(current)) {
      insertContentSemantic(current as HTMLElement, toInsertable(content), this.position);
      return current;
    }
    if (strict && current != null && typeof current !== 'string' && typeof current !== 'number') {
      throw new Error(`Unable to ${this.name} a value!`);
    }
    return this.concat(current, content);
  }

  private targetTypeOf(current: unknown): InsertionCommandOutput['targetType'] {
    if (Array.isArray(current)) return 'array';
    if (current instanceof Set) return 'set';
    if (isHTMLElement(current)) return 'element';
    return 'result';
  }

  /** An evaluated value that is element-like, or null. */
  private asElementList(value: unknown): HTMLElement[] | null {
    if (isHTMLElement(value)) return [value as HTMLElement];
    if (Array.isArray(value) && value.length > 0 && value.every(v => isHTMLElement(v))) {
      return value as HTMLElement[];
    }
    if (
      value &&
      typeof value === 'object' &&
      typeof (value as { length?: unknown }).length === 'number' &&
      typeof (value as { item?: unknown }).item === 'function'
    ) {
      const list = Array.from(value as ArrayLike<unknown>).filter((v): v is HTMLElement =>
        isHTMLElement(v)
      );
      return list.length ? list : null;
    }
    return null;
  }

  private executeVariable(
    input: Extract<InsertionCommandInput, { kind: 'variable' }>,
    context: TypedExecutionContext
  ): InsertionCommandOutput {
    // Context references resolve to their element/value, not a named binding.
    if (input.name === 'me' || input.name === 'you') {
      const el = input.name === 'me' ? context.me : context.you;
      if (isHTMLElement(el)) {
        insertContentSemantic(el as HTMLElement, toInsertable(input.content), this.position);
        Object.assign(context, { it: el });
        return { target: el, value: el, targetType: 'element' };
      }
    }
    if (input.name === 'it' || input.name === 'result') {
      return this.execImplicit(context, input.content);
    }

    const current = getVariableValue(input.name, context, input.scope);
    const combined = this.combineValue(current, input.content);
    // Arrays/Sets/Elements mutate in place; only scalar slots need a write back.
    if (!Array.isArray(current) && !(current instanceof Set) && !isHTMLElement(current)) {
      setVariableValue(input.name, combined, context, input.scope);
    }
    Object.assign(context, { it: combined });
    return { target: input.name, value: combined, targetType: this.targetTypeOf(current) };
  }

  private execImplicit(context: TypedExecutionContext, content: unknown): InsertionCommandOutput {
    // Upstream's implicit target is the `result` symbol, which `it` aliases. In
    // core `it` is the slot every command writes (and `result` is initialized to
    // null), so read `it` first and fall back only when it holds nothing.
    const current = context.it ?? context.result;
    const combined = this.combineValue(current, content);
    Object.assign(context, { it: combined, result: combined });
    return { target: 'result', value: combined, targetType: this.targetTypeOf(current) };
  }

  private done(context: TypedExecutionContext, elements: HTMLElement[]): InsertionCommandOutput {
    const value = elements.length === 1 ? elements[0] : elements;
    Object.assign(context, { it: value });
    return { target: value, value, targetType: 'element' };
  }
}
