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
import { parseClasses, resolveDynamicClasses } from '../helpers/class-manipulation';
import { parseAttribute } from '../helpers/attribute-manipulation';
import { parseDuration } from '../helpers/duration-parsing';
import { parseToggleableCSSProperty, toggleCSSProperty } from '../helpers/style-manipulation';
import {
  isSmartElementSelector,
  isBareSmartElementNode,
  evaluateFirstArg,
} from '../helpers/selector-type-detection';
import {
  detectSmartElementType,
  resolveSmartElementTargets,
  toggleDialog,
  toggleDetails,
  toggleSelect,
} from '../helpers/smart-element';
import {
  batchToggleClasses,
  batchToggleAttribute,
  batchApply,
} from '../helpers/batch-dom-operations';
import { setupDurationReversion, setupEventReversion } from '../helpers/temporal-modifiers';
import {
  isPropertyTargetString,
  resolveAnyPropertyTarget,
  resolvePropertyTargetFromString,
  togglePropertyTarget,
  type PropertyTarget,
} from '../helpers/property-target';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import { isNodeOfKind } from '../../ast/guards';
import type { CommandRaw } from '../../parser/command-slots';

/** Typed input for ToggleCommand */
export type ToggleCommandInput =
  | {
      type: 'classes';
      classes: string[];
      targets: HTMLElement[];
      duration?: number;
      untilEvent?: string;
    }
  | {
      type: 'attribute';
      name: string;
      value?: string;
      targets: HTMLElement[];
      duration?: number;
      untilEvent?: string;
    }
  | {
      type: 'css-property';
      property: 'display' | 'visibility' | 'opacity';
      targets: HTMLElement[];
      duration?: number;
      untilEvent?: string;
    }
  | { type: 'property'; target: PropertyTarget }
  | { type: 'dialog'; mode: 'modal' | 'non-modal'; targets: HTMLDialogElement[] }
  | { type: 'details'; targets: HTMLDetailsElement[] }
  | { type: 'select'; targets: HTMLSelectElement[] }
  | {
      type: 'classes-between';
      classA: string;
      classB: string;
      targets: HTMLElement[];
      duration?: number;
      untilEvent?: string;
    };

/**
 * Dialog mode: `modifiers.as` — `as modal` / `as non-modal` / a bare `modal`,
 * all carried by the parser as the one slot (Arc 3 step 3). Anything other
 * than `modal` is non-modal, as before.
 */
async function parseModalMode(
  modifiers: Record<string, ExpressionNode>,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<'modal' | 'non-modal'> {
  if (!modifiers?.as) return 'non-modal';
  const asValue = await evaluator.evaluate(modifiers.as, context);
  return typeof asValue === 'string' && asValue.toLowerCase() === 'modal' ? 'modal' : 'non-modal';
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
    duration =
      typeof val === 'number' ? val : typeof val === 'string' ? parseDuration(val) : undefined;
  }
  if (modifiers?.until) {
    const val = await evaluator.evaluate(modifiers.until, context);
    if (typeof val === 'string') untilEvent = val;
  }
  return { duration, untilEvent };
}

/** Detect expression type from first value */
function detectExpressionType(
  firstValue: unknown,
  firstArg: ASTNode
): { type: 'class' | 'attribute' | 'css-property' | 'element'; expression: string } {
  const firstArgName = (firstArg as Record<string, unknown>)?.name as string | undefined;
  const isBareTag = isBareSmartElementNode(firstArg);

  if (
    isHTMLElement(firstValue) ||
    (Array.isArray(firstValue) && firstValue.every(el => isHTMLElement(el)))
  ) {
    return { type: 'element', expression: '' };
  }
  if (isBareTag && firstArgName) {
    return { type: 'element', expression: firstArgName };
  }
  if (typeof firstValue === 'string') {
    const expr = firstValue.trim();
    if (expr.startsWith('@') || expr.startsWith('[@'))
      return { type: 'attribute', expression: expr };
    if (expr.startsWith('*')) return { type: 'css-property', expression: expr };
    if (expr.startsWith('.')) return { type: 'class', expression: expr };
    if (expr.startsWith('#') || isSmartElementSelector(expr))
      return { type: 'element', expression: expr };
    return { type: 'class', expression: expr };
  }
  return { type: 'class', expression: '' };
}

@command({ name: 'toggle' })
export class ToggleCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Toggle classes, attributes, or interactive elements',
    syntax: [
      'toggle <class> [on <target>]',
      'toggle @attr',
      'toggle <element> [as modal]',
      'toggle <expr> for <duration>',
    ],
    examples: [
      'toggle .active on me',
      'toggle @disabled',
      'toggle #myDialog as modal',
      'toggle .loading for 2s',
      'toggle between .expanded and .collapsed',
      'toggle .loading until click from #done',
    ],
    sideEffects: ['dom-mutation'],
    category: 'dom',
    compatibility: 'standard',
  });

  get metadata() {
    return ToggleCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'toggle'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ToggleCommandInput> {
    // `toggle between A and B [on target]` — the pair arrives as the
    // `between` slot (an arrayLiteral), the target as `modifiers.on`.
    const between: unknown = raw.modifiers?.between;
    if (isNodeOfKind(between, 'arrayLiteral') && between.elements.length >= 2) {
      const { duration, untilEvent } = await parseTemporalModifiers(
        raw.modifiers,
        evaluator,
        context
      );
      // `.on`/`.off` here are class NAMES to alternate, not selectors to query —
      // so read a selector node's literal value directly; only evaluate
      // non-selector elements (e.g. a variable holding a dynamic class name).
      const classNameOf = async (node: unknown): Promise<unknown> =>
        isNodeOfKind(node, 'selector') ? node.value : evaluator.evaluate(node as ASTNode, context);
      const classA = String(await classNameOf(between.elements[0])).replace(/^\./, '');
      const classB = String(await classNameOf(between.elements[1])).replace(/^\./, '');
      const targets = await resolveTargetsFromArgs(
        [],
        evaluator,
        context,
        'toggle',
        { fallbackModifierKey: 'on' } as const,
        raw.modifiers
      );
      return { type: 'classes-between', classA, classB, targets, duration, untilEvent };
    }

    if (!raw.args?.length) throw new Error('toggle command requires an argument');
    const firstArg = raw.args[0];

    // Unified PropertyTarget resolution: handles propertyOfExpression, propertyAccess, possessiveExpression
    const propertyTarget = await resolveAnyPropertyTarget(firstArg, evaluator, context);
    if (propertyTarget) {
      return { type: 'property', target: propertyTarget };
    }

    // CSS property syntax: toggle *display on #target
    // Traditional parser: firstArg = { type: 'selector', value: '*display' } — all in one token
    // Semantic parser:    firstArg = { type: 'selector', value: '*' } — drops 'display' entirely
    // Handle before evaluateFirstArg which would try querySelectorAll('*display')
    if (
      firstArg.type === 'selector' &&
      typeof (firstArg as any).value === 'string' &&
      (firstArg as any).value.startsWith('*')
    ) {
      let expression = (firstArg as any).value as string;
      let argsConsumed = 1;
      // Semantic parser may split '*display' — check if next arg has the property name
      if (expression === '*' && raw.args.length > 1 && raw.args[1].type === 'identifier') {
        expression = '*' + ((raw.args[1] as any).name as string);
        argsConsumed = 2;
      }
      // Semantic parser may drop property name entirely — recover from modifier value
      // The semantic parser puts destination (#target) in modifiers.on, but may have
      // put the property name there instead. Check if modifiers.on looks like a CSS property.
      if (expression === '*' && raw.modifiers?.on) {
        const modOnName = (raw.modifiers.on as any)?.name as string | undefined;
        if (modOnName && ['display', 'visibility', 'opacity'].includes(modOnName)) {
          expression = '*' + modOnName;
          // Target was lost — fall back to context element
          const { duration, untilEvent } = await parseTemporalModifiers(
            raw.modifiers,
            evaluator,
            context
          );
          const property = parseToggleableCSSProperty(expression);
          if (property) {
            const me = context.me as HTMLElement;
            return {
              type: 'css-property',
              property,
              targets: me ? [me] : [],
              duration,
              untilEvent,
            };
          }
        }
      }
      const property = parseToggleableCSSProperty(expression);
      if (property) {
        const { duration, untilEvent } = await parseTemporalModifiers(
          raw.modifiers,
          evaluator,
          context
        );
        const resolveOpts = { fallbackModifierKey: 'on' } as const;
        const targets = await resolveTargetsFromArgs(
          raw.args.slice(argsConsumed),
          evaluator,
          context,
          'toggle',
          resolveOpts,
          raw.modifiers
        );
        return { type: 'css-property', property, targets, duration, untilEvent };
      }
    }

    const { duration, untilEvent } = await parseTemporalModifiers(
      raw.modifiers,
      evaluator,
      context
    );
    const { value: firstValue } = await evaluateFirstArg(firstArg, evaluator, context);

    // Runtime path: "the X of Y" string pattern
    if (isPropertyTargetString(firstValue)) {
      const target = resolvePropertyTargetFromString(firstValue as string, context);
      if (target) {
        return { type: 'property', target };
      }
    }

    const { type: exprType, expression } = detectExpressionType(firstValue, firstArg);
    const resolveOpts = { fallbackModifierKey: 'on' } as const;

    switch (exprType) {
      case 'attribute': {
        const { name, value } = parseAttribute(expression);
        const targets = await resolveTargetsFromArgs(
          raw.args.slice(1),
          evaluator,
          context,
          'toggle',
          resolveOpts,
          raw.modifiers
        );
        return { type: 'attribute', name, value, targets, duration, untilEvent };
      }
      case 'css-property': {
        const property = parseToggleableCSSProperty(expression);
        if (!property) throw new Error(`Invalid CSS property: ${expression}`);
        const targets = await resolveTargetsFromArgs(
          raw.args.slice(1),
          evaluator,
          context,
          'toggle',
          resolveOpts,
          raw.modifiers
        );
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
          elements = await resolveTargetsFromArgs(
            [firstArg],
            evaluator,
            context,
            'toggle',
            resolveOpts,
            raw.modifiers
          );
        }

        const smartType = detectSmartElementType(elements);
        if (smartType === 'dialog') {
          const mode = await parseModalMode(raw.modifiers, evaluator, context);
          return { type: 'dialog', mode, targets: elements as HTMLDialogElement[] };
        }
        if (smartType === 'details') {
          return {
            type: 'details',
            targets: resolveSmartElementTargets(elements) as HTMLDetailsElement[],
          };
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
        const targets = await resolveTargetsFromArgs(
          raw.args.slice(1),
          evaluator,
          context,
          'toggle',
          resolveOpts,
          raw.modifiers
        );
        return { type: 'classes', classes, targets, duration, untilEvent };
      }
    }
  }

  async execute(input: ToggleCommandInput, context: TypedExecutionContext): Promise<HTMLElement[]> {
    switch (input.type) {
      case 'classes': {
        // Resolve any dynamic class expressions (e.g., {cls} → actual class name)
        const resolvedClasses = resolveDynamicClasses(input.classes, context);
        if (resolvedClasses.length === 0) {
          return [...input.targets]; // No valid classes to toggle
        }
        batchToggleClasses(input.targets, resolvedClasses);
        if ((input.duration || input.untilEvent) && resolvedClasses.length) {
          for (const el of input.targets) {
            if (input.duration)
              setupDurationReversion(el, 'class', resolvedClasses[0], input.duration);
            if (input.untilEvent)
              setupEventReversion(el, 'class', resolvedClasses[0], input.untilEvent);
          }
        }
        return [...input.targets];
      }

      case 'attribute':
        batchToggleAttribute(input.targets, input.name, input.value);
        if (input.duration || input.untilEvent) {
          for (const el of input.targets) {
            if (input.duration) setupDurationReversion(el, 'attribute', input.name, input.duration);
            if (input.untilEvent)
              setupEventReversion(el, 'attribute', input.name, input.untilEvent);
          }
        }
        return [...input.targets];

      case 'css-property':
        return batchApply(input.targets, el => toggleCSSProperty(el, input.property));

      case 'property': {
        togglePropertyTarget(input.target);
        return [input.target.element];
      }

      case 'dialog':
        return batchApply(input.targets as HTMLElement[], el =>
          toggleDialog(el as HTMLDialogElement, input.mode)
        );

      case 'details':
        return batchApply(input.targets as HTMLElement[], el =>
          toggleDetails(el as HTMLDetailsElement)
        );

      case 'select':
        return batchApply(input.targets as HTMLElement[], el =>
          toggleSelect(el as HTMLSelectElement)
        );

      case 'classes-between': {
        // Toggle between two mutually exclusive classes
        // If element has classA, switch to classB; if has classB, switch to classA
        for (const el of input.targets) {
          const hasA = el.classList.contains(input.classA);
          const hasB = el.classList.contains(input.classB);

          if (hasA) {
            el.classList.remove(input.classA);
            el.classList.add(input.classB);
          } else if (hasB) {
            el.classList.remove(input.classB);
            el.classList.add(input.classA);
          } else {
            // Neither present - add first class as default
            el.classList.add(input.classA);
          }
        }

        if (input.duration || input.untilEvent) {
          for (const el of input.targets) {
            if (input.duration) setupDurationReversion(el, 'class', input.classA, input.duration);
            if (input.untilEvent) setupEventReversion(el, 'class', input.classA, input.untilEvent);
          }
        }
        return [...input.targets];
      }
    }
  }
}

export const createToggleCommand = createFactory(ToggleCommand);
export default ToggleCommand;
