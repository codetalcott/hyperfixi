/**
 * TakeCommand - Decorated Implementation
 *
 * Class ownership transfer (upstream semantics) plus hyperfixi's
 * attribute/property value transfer.
 *
 * Syntax:
 *   take <class> [from <source>] [for <recipient>]      # upstream tab idiom
 *   take <property> from <source>
 *   take <property> from <source> and put it on <target>
 *
 * The class-reference variant follows the real `hyperscript.org` engine:
 * remove the class from EVERY source element (or every current holder when
 * no `from` is given), then add it to the recipient (default `me`). The
 * non-class forms keep hyperfixi's value-transfer behavior — move the
 * attribute/style/property value from ONE source element to the target.
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { resolveElement, resolveElements } from '../helpers/element-resolution';
import { evaluateFirstArg } from '../helpers/selector-type-detection';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

export interface TakeCommandInput {
  property: string;
  source?: unknown;
  target?: unknown;
}

export interface TakeCommandOutput {
  targetElement: HTMLElement;
  property: string;
  value: unknown;
}

/**
 * TakeCommand - Transfer properties between elements
 *
 * Before: 406 lines
 * After: ~180 lines (56% reduction)
 */
@command({ name: 'take' })
export class TakeCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Move classes, attributes, and properties from one element to another',
    syntax: [
      'take <class> [from <source>] [for <recipient>]',
      'take <property> from <source>',
      'take <property> from <source> and put it on <target>',
    ],
    examples: [
      'take .active from .tab for me',
      'take class from <#source/>',
      'take @data-value from <.source/> and put it on <#target/>',
    ],
    sideEffects: ['dom-mutation', 'property-transfer'],
    category: 'animation',
    compatibility: 'standard',
  });

  get metadata() {
    return TakeCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<TakeCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('take requires property, "from", and source');
    }

    // Class/attribute/property selector nodes are extracted as their literal
    // string (`.active`, `@data-x`) rather than evaluated — evaluation would
    // query the DOM and hand back elements where a name is needed.
    const { value: firstValue } = await evaluateFirstArg(raw.args[0], evaluator, context);
    const property = String(firstValue);

    // The `from` keyword is detected on the RAW node — evaluating an
    // identifier resolves it as a variable lookup, which comes back
    // undefined and made the traditional flat-args path unreachable.
    const isFromKeyword = (node: ASTNode | undefined): boolean => {
      const n = node as { type?: string; name?: string; value?: unknown } | undefined;
      if (!n) return false;
      return (n.type === 'identifier' && n.name === 'from') || n.value === 'from';
    };

    let source: unknown;
    if (raw.args.length >= 2) {
      if (!isFromKeyword(raw.args[1])) {
        throw new Error('take syntax: take <property> from <source>');
      }
      if (raw.args[2]) {
        source = await evaluator.evaluate(raw.args[2], context);
      }
    } else if (raw.modifiers?.from) {
      // Semantic-path shape: `take .active from .tab` → args [.active],
      // modifiers { from: .tab }
      source = await evaluator.evaluate(raw.modifiers.from, context);
    }

    // Recipient: the `and put it on <target>` tail (raw keyword check),
    // a bare fourth arg, or the on/for modifiers (`for` is upstream's
    // recipient clause, carried by the parser as a modifier).
    let target: unknown;
    if (raw.args.length >= 8) {
      const names = [3, 4, 5, 6].map(i => raw.args[i] as { name?: string; value?: unknown });
      const word = (n: { name?: string; value?: unknown }) => n?.name ?? n?.value;
      if (
        word(names[0]) === 'and' &&
        word(names[1]) === 'put' &&
        word(names[2]) === 'it' &&
        word(names[3]) === 'on' &&
        raw.args[7]
      ) {
        target = await evaluator.evaluate(raw.args[7], context);
      }
    } else if (raw.args.length > 3) {
      target = await evaluator.evaluate(raw.args[3], context);
    }

    if (!target && raw.modifiers?.on) target = await evaluator.evaluate(raw.modifiers.on, context);
    if (!target && raw.modifiers?.for)
      target = await evaluator.evaluate(raw.modifiers.for, context);

    // Only the class-reference variant may omit the source (it defaults to
    // "every element currently holding the class")
    if (source === undefined && !property.startsWith('.')) {
      throw new Error('take requires property, "from", and source');
    }

    return { property, source, target };
  }

  async execute(
    input: TakeCommandInput,
    context: TypedExecutionContext
  ): Promise<TakeCommandOutput> {
    const property = input.property.trim();

    // Class-reference variant — upstream ownership-transfer semantics:
    // remove the class from every source element (default: every current
    // holder), then add it to the recipient (default: me). The class is
    // added to the recipient even when no source held it — that is what
    // makes the tab idiom idempotent on the already-active tab.
    if (property.startsWith('.')) {
      const className = property.substring(1);

      let sources: HTMLElement[];
      if (input.source !== undefined && input.source !== null) {
        sources = resolveElements(
          input.source as string | HTMLElement | HTMLElement[] | NodeList | undefined,
          context
        );
      } else {
        const doc =
          (context.me as HTMLElement | undefined)?.ownerDocument ??
          (typeof document !== 'undefined' ? document : null);
        sources = doc ? (Array.from(doc.querySelectorAll('.' + className)) as HTMLElement[]) : [];
      }
      for (const el of sources) {
        el.classList.remove(className);
      }

      const recipients = resolveElements(
        input.target as string | HTMLElement | HTMLElement[] | NodeList | undefined,
        context
      );
      if (recipients.length === 0) {
        throw new Error('take: no recipient element found');
      }
      for (const el of recipients) {
        el.classList.add(className);
      }

      return { targetElement: recipients[0], property: input.property, value: className };
    }

    // Value-transfer variant (class keyword / @attr / style / property):
    // move the value from ONE source element to the target. Evaluated
    // selector nodes arrive as element arrays/NodeLists — normalize those to
    // their first element; strings keep resolveElement's throw-on-missing.
    const sourceElement = resolveElement(this.firstOf(input.source), context, 'take');
    const targetElement = input.target
      ? resolveElement(this.firstOf(input.target), context, 'take')
      : resolveElement(undefined, context, 'take');

    const value = this.takeProperty(sourceElement, input.property);
    this.putProperty(targetElement, input.property, value);

    return { targetElement, property: input.property, value };
  }

  /**
   * Normalize an evaluated value: element collections → first element.
   * An EMPTY collection throws rather than falling back to `me` — that
   * preserves resolveElement's throw-on-missing contract for evaluated
   * selectors ("[] from `.missing`" is the same failure as "no match for
   * '#missing'").
   */
  private firstOf(value: unknown): string | HTMLElement | undefined {
    const isNodeListLike =
      value !== null &&
      typeof value === 'object' &&
      typeof (value as NodeList).length === 'number' &&
      typeof (value as NodeList).item === 'function';

    if (Array.isArray(value) || isNodeListLike) {
      const first = (value as ArrayLike<unknown>)[0];
      if (first === undefined) {
        throw new Error('take: no matching elements');
      }
      return first as HTMLElement;
    }
    return value as string | HTMLElement | undefined;
  }

  private takeProperty(el: HTMLElement, prop: string): unknown {
    const p = prop.trim();
    const lp = p.toLowerCase();

    if (lp === 'class' || lp === 'classes') {
      const classes = Array.from(el.classList);
      el.className = '';
      return classes;
    }

    if (p.startsWith('.')) {
      const cn = p.substring(1);
      if (el.classList.contains(cn)) {
        el.classList.remove(cn);
        return cn;
      }
      return null;
    }

    if (p.startsWith('@')) {
      const an = p.substring(1);
      const v = el.getAttribute(an);
      el.removeAttribute(an);
      return v;
    }

    if (p.startsWith('data-')) {
      const v = el.getAttribute(p);
      el.removeAttribute(p);
      return v;
    }

    if (lp === 'id') {
      const v = el.id;
      el.id = '';
      return v;
    }
    if (lp === 'title') {
      const v = el.title;
      el.title = '';
      return v;
    }
    if (lp === 'value' && 'value' in el) {
      const v = (el as HTMLInputElement).value;
      (el as HTMLInputElement).value = '';
      return v;
    }

    const camel = p.replace(/-([a-z])/g, (_, l) => l.toUpperCase());
    if (p.includes('-') || camel in el.style || p in el.style) {
      let v: string;
      if (camel in el.style) {
        v = (el.style as any)[camel];
        (el.style as any)[camel] = '';
      } else if (p in el.style) {
        v = (el.style as any)[p];
        (el.style as any)[p] = '';
      } else {
        v = el.style.getPropertyValue(p);
        el.style.removeProperty(p);
      }
      return v;
    }

    const v = el.getAttribute(prop);
    if (v !== null) {
      el.removeAttribute(prop);
      return v;
    }
    return null;
  }

  private putProperty(el: HTMLElement, prop: string, value: unknown): void {
    if (value === null || value === undefined) return;

    const p = prop.trim();
    const lp = p.toLowerCase();

    if (lp === 'class' || lp === 'classes') {
      if (Array.isArray(value))
        value.forEach(c => c && typeof c === 'string' && el.classList.add(c));
      else if (typeof value === 'string') el.className = value;
      return;
    }

    if (p.startsWith('.')) {
      if (value) el.classList.add(p.substring(1));
      return;
    }
    if (p.startsWith('@')) {
      el.setAttribute(p.substring(1), String(value));
      return;
    }
    if (p.startsWith('data-')) {
      el.setAttribute(p, String(value));
      return;
    }

    if (lp === 'id') {
      el.id = String(value);
      return;
    }
    if (lp === 'title') {
      el.title = String(value);
      return;
    }
    if (lp === 'value' && 'value' in el) {
      (el as HTMLInputElement).value = String(value);
      return;
    }

    const camel = p.replace(/-([a-z])/g, (_, l) => l.toUpperCase());
    if (p.includes('-') || camel in el.style || p in el.style) {
      if (camel in el.style) (el.style as any)[camel] = String(value);
      else if (p in el.style) (el.style as any)[p] = String(value);
      else el.style.setProperty(p, String(value));
      return;
    }

    el.setAttribute(prop, String(value));
  }
}

export const createTakeCommand = createFactory(TakeCommand);
export default TakeCommand;
