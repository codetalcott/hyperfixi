/**
 * TakeCommand - Decorated Implementation
 *
 * Moves classes, attributes, and properties between elements.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   take <property> from <source>
 *   take <property> from <source> and put it on <target>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { resolveElement } from '../helpers/element-resolution';
import { command, meta, createFactory } from '../decorators';

export interface TakeCommandInput {
  property: string;
  source: unknown;
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
@meta({
  description: 'Move classes, attributes, and properties from one element to another',
  syntax: ['take <property> from <source>', 'take <property> from <source> and put it on <target>'],
  examples: ['take class from <#source/>', 'take @data-value from <.source/> and put it on <#target/>'],
  sideEffects: ['dom-mutation', 'property-transfer'],
})
@command({ name: 'take', category: 'animation' })
export class TakeCommand {
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<TakeCommandInput> {
    if (raw.args.length < 3) throw new Error('take requires property, "from", and source');

    const property = String(await evaluator.evaluate(raw.args[0], context));
    const fromKw = await evaluator.evaluate(raw.args[1], context);
    if (fromKw !== 'from') throw new Error('take syntax: take <property> from <source>');

    const source = await evaluator.evaluate(raw.args[2], context);

    let target: unknown;
    if (raw.args.length >= 8) {
      const kws = await Promise.all([3, 4, 5, 6].map(i => evaluator.evaluate(raw.args[i], context)));
      if (kws[0] === 'and' && kws[1] === 'put' && kws[2] === 'it' && kws[3] === 'on' && raw.args[7]) {
        target = await evaluator.evaluate(raw.args[7], context);
      }
    } else if (raw.args.length > 3) {
      target = await evaluator.evaluate(raw.args[3], context);
    }

    if (!target && raw.modifiers?.on) target = await evaluator.evaluate(raw.modifiers.on, context);

    return { property, source, target };
  }

  async execute(input: TakeCommandInput, context: TypedExecutionContext): Promise<TakeCommandOutput> {
    const sourceElement = resolveElement(input.source as string | HTMLElement | undefined, context);
    const targetElement = input.target
      ? resolveElement(input.target as string | HTMLElement | undefined, context)
      : resolveElement(undefined, context);

    const value = this.takeProperty(sourceElement, input.property);
    this.putProperty(targetElement, input.property, value);

    return { targetElement, property: input.property, value };
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
      if (el.classList.contains(cn)) { el.classList.remove(cn); return cn; }
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

    if (lp === 'id') { const v = el.id; el.id = ''; return v; }
    if (lp === 'title') { const v = el.title; el.title = ''; return v; }
    if (lp === 'value' && 'value' in el) { const v = (el as HTMLInputElement).value; (el as HTMLInputElement).value = ''; return v; }

    const camel = p.replace(/-([a-z])/g, (_, l) => l.toUpperCase());
    if (p.includes('-') || camel in el.style || p in el.style) {
      let v: string;
      if (camel in el.style) { v = (el.style as any)[camel]; (el.style as any)[camel] = ''; }
      else if (p in el.style) { v = (el.style as any)[p]; (el.style as any)[p] = ''; }
      else { v = el.style.getPropertyValue(p); el.style.removeProperty(p); }
      return v;
    }

    const v = el.getAttribute(prop);
    if (v !== null) { el.removeAttribute(prop); return v; }
    return null;
  }

  private putProperty(el: HTMLElement, prop: string, value: unknown): void {
    if (value === null || value === undefined) return;

    const p = prop.trim();
    const lp = p.toLowerCase();

    if (lp === 'class' || lp === 'classes') {
      if (Array.isArray(value)) value.forEach(c => c && typeof c === 'string' && el.classList.add(c));
      else if (typeof value === 'string') el.className = value;
      return;
    }

    if (p.startsWith('.')) { if (value) el.classList.add(p.substring(1)); return; }
    if (p.startsWith('@')) { el.setAttribute(p.substring(1), String(value)); return; }
    if (p.startsWith('data-')) { el.setAttribute(p, String(value)); return; }

    if (lp === 'id') { el.id = String(value); return; }
    if (lp === 'title') { el.title = String(value); return; }
    if (lp === 'value' && 'value' in el) { (el as HTMLInputElement).value = String(value); return; }

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
