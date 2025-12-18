/**
 * ToggleCommand - Optimized Implementation
 *
 * Toggles CSS classes, attributes, or interactive elements.
 *
 * Syntax:
 *   toggle .active [on <target>]
 *   toggle @disabled
 *   toggle #dialog [as modal]
 *   toggle .active for 2s
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveTargetsFromArgs } from '../helpers/element-resolution';
import { parseClasses } from '../helpers/class-manipulation';
import { parseAttribute } from '../helpers/attribute-manipulation';
import { parseDuration } from '../helpers/duration-parsing';
import { parseToggleableCSSProperty, toggleCSSProperty } from '../helpers/style-manipulation';
import { isSmartElementSelector, isBareSmartElementNode, evaluateFirstArg } from '../helpers/selector-type-detection';
import { detectSmartElementType, resolveSmartElementTargets, toggleDialog, toggleDetails, toggleSelect } from '../helpers/smart-element';
import { batchToggleClasses, batchToggleAttribute, batchApply } from '../helpers/batch-dom-operations';
import { setupDurationReversion, setupEventReversion } from '../helpers/temporal-modifiers';
import { command, meta, createFactory, type DecoratedCommand, type CommandMetadata } from '../decorators';

/** Typed input for ToggleCommand */
export type ToggleCommandInput =
  | { type: 'classes'; classes: string[]; targets: HTMLElement[]; duration?: number; untilEvent?: string }
  | { type: 'attribute'; name: string; value?: string; targets: HTMLElement[]; duration?: number; untilEvent?: string }
  | { type: 'css-property'; property: 'display' | 'visibility' | 'opacity'; targets: HTMLElement[] }
  | { type: 'dialog'; mode: 'modal' | 'non-modal'; targets: HTMLDialogElement[] }
  | { type: 'details'; targets: HTMLDetailsElement[] }
  | { type: 'select'; targets: HTMLSelectElement[] };

/** Parse modal mode from args and modifiers */
async function parseModalMode(
  args: ASTNode[],
  modifiers: Record<string, ExpressionNode>,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<'modal' | 'non-modal'> {
  if (modifiers?.as) {
    const asValue = await evaluator.evaluate(modifiers.as, context);
    if (typeof asValue === 'string' && asValue.toLowerCase() === 'modal') return 'modal';
  }
  if (args.length >= 2) {
    const secondArg = await evaluator.evaluate(args[1], context);
    if (typeof secondArg === 'string') {
      const normalized = secondArg.toLowerCase();
      if (normalized === 'modal' || normalized === 'as modal') return 'modal';
      if (normalized === 'as' && args.length >= 3) {
        const thirdArg = await evaluator.evaluate(args[2], context);
        if (typeof thirdArg === 'string' && thirdArg.toLowerCase() === 'modal') return 'modal';
      }
    }
  }
  return 'non-modal';
}

/** Parse temporal modifiers (for duration, until event) */
async function parseTemporalModifiers(
  modifiers: Record<string, ExpressionNode>,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<{ duration?: number; untilEvent?: string }> {
  let duration: number | undefined;
  let untilEvent: string | undefined;
  if (modifiers?.for) {
    const val = await evaluator.evaluate(modifiers.for, context);
    duration = typeof val === 'number' ? val : typeof val === 'string' ? parseDuration(val) : undefined;
  }
  if (modifiers?.until) {
    const val = await evaluator.evaluate(modifiers.until, context);
    if (typeof val === 'string') untilEvent = val;
  }
  return { duration, untilEvent };
}

/** Detect expression type from first value */
function detectExpressionType(firstValue: unknown, firstArg: ASTNode): { type: 'class' | 'attribute' | 'css-property' | 'element'; expression: string } {
  const firstArgName = (firstArg as Record<string, unknown>)?.name as string | undefined;
  const isBareTag = isBareSmartElementNode(firstArg);

  if (isHTMLElement(firstValue) || (Array.isArray(firstValue) && firstValue.every(el => isHTMLElement(el)))) {
    return { type: 'element', expression: '' };
  }
  if (isBareTag && firstArgName) {
    return { type: 'element', expression: firstArgName };
  }
  if (typeof firstValue === 'string') {
    const expr = firstValue.trim();
    if (expr.startsWith('@') || expr.startsWith('[@')) return { type: 'attribute', expression: expr };
    if (expr.startsWith('*')) return { type: 'css-property', expression: expr };
    if (expr.startsWith('.')) return { type: 'class', expression: expr };
    if (expr.startsWith('#') || isSmartElementSelector(expr)) return { type: 'element', expression: expr };
    return { type: 'class', expression: expr };
  }
  return { type: 'class', expression: '' };
}

@meta({
  description: 'Toggle classes, attributes, or interactive elements',
  syntax: ['toggle <class> [on <target>]', 'toggle @attr', 'toggle <element> [as modal]', 'toggle <expr> for <duration>'],
  examples: ['toggle .active on me', 'toggle @disabled', 'toggle #myDialog as modal', 'toggle .loading for 2s'],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'toggle', category: 'dom' })
export class ToggleCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ToggleCommandInput> {
    if (!raw.args?.length) throw new Error('toggle command requires an argument');

    const { duration, untilEvent } = await parseTemporalModifiers(raw.modifiers, evaluator, context);
    const firstArg = raw.args[0];
    const { value: firstValue } = await evaluateFirstArg(firstArg, evaluator, context);
    const { type: exprType, expression } = detectExpressionType(firstValue, firstArg);
    const resolveOpts = { filterPrepositions: true, fallbackModifierKey: 'on' } as const;

    switch (exprType) {
      case 'attribute': {
        const { name, value } = parseAttribute(expression);
        const targets = await resolveTargetsFromArgs(raw.args.slice(1), evaluator, context, 'toggle', resolveOpts, raw.modifiers);
        return { type: 'attribute', name, value, targets, duration, untilEvent };
      }
      case 'css-property': {
        const property = parseToggleableCSSProperty(expression);
        if (!property) throw new Error(`Invalid CSS property: ${expression}`);
        const targets = await resolveTargetsFromArgs(raw.args.slice(1), evaluator, context, 'toggle', resolveOpts, raw.modifiers);
        return { type: 'css-property', property, targets };
      }
      case 'element': {
        let elements: HTMLElement[];
        if (isHTMLElement(firstValue)) {
          elements = [firstValue];
        } else if (Array.isArray(firstValue) && firstValue.every(el => isHTMLElement(el))) {
          elements = firstValue as HTMLElement[];
        } else if (expression) {
          const selected = document.querySelectorAll(expression);
          elements = Array.from(selected).filter((el): el is HTMLElement => isHTMLElement(el));
        } else {
          elements = await resolveTargetsFromArgs([firstArg], evaluator, context, 'toggle', resolveOpts, raw.modifiers);
        }

        const smartType = detectSmartElementType(elements);
        if (smartType === 'dialog') {
          const mode = await parseModalMode(raw.args, raw.modifiers, evaluator, context);
          return { type: 'dialog', mode, targets: elements as HTMLDialogElement[] };
        }
        if (smartType === 'details') {
          return { type: 'details', targets: resolveSmartElementTargets(elements) as HTMLDetailsElement[] };
        }
        if (smartType === 'select') {
          return { type: 'select', targets: elements as HTMLSelectElement[] };
        }
        // Fallback to class toggle
        const classes = parseClasses(expression);
        return { type: 'classes', classes, targets: elements, duration, untilEvent };
      }
      case 'class':
      default: {
        const classes = parseClasses(expression || firstValue);
        if (!classes.length) throw new Error('toggle command: no valid class names found');
        const targets = await resolveTargetsFromArgs(raw.args.slice(1), evaluator, context, 'toggle', resolveOpts, raw.modifiers);
        return { type: 'classes', classes, targets, duration, untilEvent };
      }
    }
  }

  async execute(input: ToggleCommandInput, context: TypedExecutionContext): Promise<HTMLElement[]> {
    switch (input.type) {
      case 'classes':
        batchToggleClasses(input.targets, input.classes);
        if ((input.duration || input.untilEvent) && input.classes.length) {
          for (const el of input.targets) {
            if (input.duration) setupDurationReversion(el, 'class', input.classes[0], input.duration);
            if (input.untilEvent) setupEventReversion(el, 'class', input.classes[0], input.untilEvent);
          }
        }
        return [...input.targets];

      case 'attribute':
        batchToggleAttribute(input.targets, input.name, input.value);
        if (input.duration || input.untilEvent) {
          for (const el of input.targets) {
            if (input.duration) setupDurationReversion(el, 'attribute', input.name, input.duration);
            if (input.untilEvent) setupEventReversion(el, 'attribute', input.name, input.untilEvent);
          }
        }
        return [...input.targets];

      case 'css-property':
        return batchApply(input.targets, el => toggleCSSProperty(el, input.property));

      case 'dialog':
        return batchApply(input.targets as HTMLElement[], el => toggleDialog(el as HTMLDialogElement, input.mode));

      case 'details':
        return batchApply(input.targets as HTMLElement[], el => toggleDetails(el as HTMLDetailsElement));

      case 'select':
        return batchApply(input.targets as HTMLElement[], el => toggleSelect(el as HTMLSelectElement));
    }
  }
}

export const createToggleCommand = createFactory(ToggleCommand);
export default ToggleCommand;
