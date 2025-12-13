/**
 * MeasureCommand - Decorated Implementation
 *
 * Measures DOM element dimensions, positions, and properties.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   measure
 *   measure <property>
 *   measure <target> <property>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveElement } from '../helpers/element-resolution';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

export interface MeasureCommandInput {
  target?: string | HTMLElement;
  property?: string;
  variable?: string;
}

export interface MeasureCommandOutput {
  result: number;
  wasAsync: boolean;
  element: HTMLElement;
  property: string;
  value: number;
  unit: string;
  stored?: boolean;
}

/**
 * MeasureCommand - Measure element properties
 *
 * Before: 376 lines
 * After: ~180 lines (52% reduction)
 */
@meta({
  description: 'Measure DOM element dimensions, positions, and properties',
  syntax: ['measure', 'measure <property>', 'measure <target> <property>'],
  examples: ['measure', 'measure width', 'measure #element height', 'measure x and set dragX'],
  sideEffects: ['data-mutation'],
})
@command({ name: 'measure', category: 'animation' })
export class MeasureCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<MeasureCommandInput> {
    let target: string | HTMLElement | undefined;
    let property: string | undefined;
    let variable: string | undefined;

    if (raw.args?.length) {
      const first = raw.args[0] as any;

      if (first.type === 'identifier' && first.name) {
        const name = first.name.toLowerCase();
        if (name === 'me' || name === 'it' || name === 'you') {
          const ev = await evaluator.evaluate(first, context);
          if (isHTMLElement(ev)) {
            target = ev;
            if (raw.args.length > 1) {
              const s = raw.args[1] as any;
              property = s.type === 'identifier' ? s.name : String(await evaluator.evaluate(s, context));
            }
          }
        } else {
          property = first.name;
        }
      } else {
        const ev = await evaluator.evaluate(first, context);
        if (isHTMLElement(ev) || (typeof ev === 'string' && /^[#.]/.test(ev))) {
          target = ev as string | HTMLElement;
          if (raw.args.length > 1) {
            const s = raw.args[1] as any;
            property = s.type === 'identifier' ? s.name : String(await evaluator.evaluate(s, context));
          }
        } else if (typeof ev === 'string') {
          property = ev;
        }
      }
    }

    if (raw.modifiers?.set) variable = String(await evaluator.evaluate(raw.modifiers.set, context));

    const result: MeasureCommandInput = {};
    if (target !== undefined) result.target = target;
    if (property !== undefined) result.property = property;
    if (variable !== undefined) result.variable = variable;
    return result;
  }

  async execute(input: MeasureCommandInput, context: TypedExecutionContext): Promise<MeasureCommandOutput> {
    const targetElement = resolveElement(input.target, context);
    const prop = input.property || 'width';
    const measurement = this.getMeasurement(targetElement, prop);

    if (input.variable && context.locals) context.locals.set(input.variable, measurement.value);

    Object.assign(context, { it: measurement.value });

    return { result: measurement.value, wasAsync: false, element: targetElement, property: prop, value: measurement.value, unit: measurement.unit, stored: !!input.variable };
  }

  private getMeasurement(el: HTMLElement, prop: string): { value: number; unit: string } {
    const style = getComputedStyle(el);

    if (prop.startsWith('*')) {
      const cssVal = style.getPropertyValue(prop.substring(1));
      const num = parseFloat(cssVal);
      if (!isNaN(num)) {
        const unitMatch = cssVal.match(/([a-zA-Z%]+)$/);
        return { value: num, unit: unitMatch ? unitMatch[1] : '' };
      }
      return { value: cssVal as any, unit: '' };
    }

    const p = prop.toLowerCase();
    const rect = el.getBoundingClientRect();

    const measurements: Record<string, () => number> = {
      width: () => rect.width,
      height: () => rect.height,
      top: () => rect.top,
      left: () => rect.left,
      right: () => rect.right,
      bottom: () => rect.bottom,
      x: () => el.offsetLeft,
      y: () => el.offsetTop,
      clientwidth: () => el.clientWidth,
      'client-width': () => el.clientWidth,
      clientheight: () => el.clientHeight,
      'client-height': () => el.clientHeight,
      offsetwidth: () => el.offsetWidth,
      'offset-width': () => el.offsetWidth,
      offsetheight: () => el.offsetHeight,
      'offset-height': () => el.offsetHeight,
      scrollwidth: () => el.scrollWidth,
      'scroll-width': () => el.scrollWidth,
      scrollheight: () => el.scrollHeight,
      'scroll-height': () => el.scrollHeight,
      scrolltop: () => el.scrollTop,
      'scroll-top': () => el.scrollTop,
      scrollleft: () => el.scrollLeft,
      'scroll-left': () => el.scrollLeft,
      offsettop: () => el.offsetTop,
      'offset-top': () => el.offsetTop,
      offsetleft: () => el.offsetLeft,
      'offset-left': () => el.offsetLeft,
    };

    if (measurements[p]) return { value: measurements[p](), unit: 'px' };

    const cssVal = style.getPropertyValue(prop);
    const num = parseFloat(cssVal);
    if (!isNaN(num)) {
      const unitMatch = cssVal.match(/([a-zA-Z%]+)$/);
      return { value: num, unit: unitMatch ? unitMatch[1] : 'px' };
    }

    return { value: 0, unit: 'px' };
  }
}

export const createMeasureCommand = createFactory(MeasureCommand);
export default MeasureCommand;
