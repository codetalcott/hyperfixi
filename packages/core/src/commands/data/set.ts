/**
 * SetCommand - Optimized Implementation
 *
 * Sets values to variables, element attributes, or properties.
 *
 * Optimized: 622 lines → ~350 lines
 *
 * Syntax:
 *   set myVar to "value"
 *   set @data-theme to "dark"
 *   set my innerHTML to "content"
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types.ts';
import type { ExpressionEvaluator } from '../../core/expression-evaluator.ts';
import { isHTMLElement } from '../../utils/element-check';
import {
  resolveElement as resolveElementHelper,
  resolveElements as resolveElementsHelper,
  resolvePossessive,
} from '../helpers/element-resolution';
import { setElementProperty, isPlainObject } from '../helpers/element-property-access';
import { isCSSPropertySyntax, setStyleValue } from '../helpers/style-manipulation';
import { isAttributeSyntax } from '../helpers/attribute-manipulation';
import {
  isPropertyTargetString,
  resolveAnyPropertyTarget,
  resolvePropertyTargetFromString,
} from '../helpers/property-target';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

/** Typed input for SetCommand (Discriminated Union) */
export type SetCommandInput =
  | { type: 'variable'; name: string; value: unknown }
  | { type: 'attribute'; element: HTMLElement; name: string; value: unknown }
  | { type: 'property'; element: HTMLElement; property: string; value: unknown }
  | { type: 'style'; element: HTMLElement; property: string; value: string }
  | { type: 'object-literal'; properties: Record<string, unknown>; targets: HTMLElement[] }
  | {
      type: 'member-assignment';
      container: Record<string, unknown>;
      property: string;
      value: unknown;
    };

/** Output from SetCommand execution */
export interface SetCommandOutput {
  target: string | HTMLElement;
  value: unknown;
  targetType: 'variable' | 'attribute' | 'property';
}

@meta({
  description: 'Set values to variables, attributes, or properties',
  syntax: ['set <target> to <value>'],
  examples: ['set myVar to "value"', 'set @data-theme to "dark"', 'set my innerHTML to "content"'],
  sideEffects: ['state-mutation', 'dom-mutation'],
})
@command({ name: 'set', category: 'data' })
export class SetCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SetCommandInput> {
    if (!raw.args?.length) {
      throw new Error('set command requires a target');
    }

    const firstArg = raw.args[0] as Record<string, unknown>;
    const argName = (firstArg?.name || firstArg?.value) as string | undefined;

    // Unified PropertyTarget resolution: handles propertyOfExpression, propertyAccess, possessiveExpression
    const propertyTarget = await resolveAnyPropertyTarget(
      firstArg as import('../../types/base-types').ASTNode,
      evaluator,
      context
    );
    if (propertyTarget) {
      const value = await this.extractValue(raw, evaluator, context);
      // Handle CSS style properties (*opacity syntax)
      if (propertyTarget.property.startsWith('*')) {
        const styleProp = propertyTarget.property.substring(1);
        return {
          type: 'style',
          element: propertyTarget.element,
          property: styleProp,
          value: String(value),
        };
      }
      return {
        type: 'property',
        element: propertyTarget.element,
        property: propertyTarget.property,
        value,
      };
    }

    // Handle memberExpression / propertyAccess: "set my innerHTML to X", "set event.dataTransfer.effectAllowed to X"
    if (firstArg?.type === 'memberExpression' || firstArg?.type === 'propertyAccess') {
      const result = await this.tryParseMemberExpression(firstArg, raw, evaluator, context);
      if (result) return result;
    }

    // Get first value (identifier/variable nodes use name directly, others evaluated)
    let firstValue: unknown;
    if (
      (firstArg?.type === 'identifier' || firstArg?.type === 'variable') &&
      typeof argName === 'string'
    ) {
      firstValue = argName;
    } else {
      firstValue = await evaluator.evaluate(
        firstArg as import('../../types/base-types').ASTNode,
        context
      );
    }

    // Object literal: set { x: 1, y: 2 } on element
    if (isPlainObject(firstValue)) {
      const targets = await this.resolveTargets(raw.modifiers.on, evaluator, context);
      return { type: 'object-literal', properties: firstValue, targets };
    }

    // Runtime path: "the X of Y" string pattern (dynamic/literal values)
    if (isPropertyTargetString(firstValue)) {
      const target = resolvePropertyTargetFromString(firstValue, context);
      if (target) {
        const value = await this.extractValue(raw, evaluator, context);
        return { type: 'property', element: target.element, property: target.property, value };
      }
      // Fallback to original parseTheXofY if utility fails (rollback-friendly)
      return this.parseTheXofY(firstValue, raw, evaluator, context);
    }

    // CSS shorthand: *property
    if (typeof firstValue === 'string' && isCSSPropertySyntax(firstValue)) {
      const property = firstValue.substring(1).trim();
      const value = await this.extractValue(raw, evaluator, context);
      const element = await this.resolveElement(raw.modifiers.on, evaluator, context);
      return { type: 'style', element, property, value: String(value) };
    }

    // Attribute syntax: @attr
    if (typeof firstValue === 'string' && isAttributeSyntax(firstValue)) {
      const name = firstValue.substring(1).trim();
      const value = await this.extractValue(raw, evaluator, context);
      const element = await this.resolveElement(raw.modifiers.on, evaluator, context);
      return { type: 'attribute', element, name, value };
    }

    // Possessive syntax: my/its property
    if (typeof firstValue === 'string') {
      const match = firstValue.match(/^(my|me|its?|your?)\s+(.+)$/i);
      if (match) {
        const element = resolvePossessive(match[1], context);
        const value = await this.extractValue(raw, evaluator, context);
        return { type: 'property', element, property: match[2], value };
      }
    }

    // Element target: set #element to value (sets textContent)
    if (isHTMLElement(firstValue)) {
      const value = await this.extractValue(raw, evaluator, context);
      return { type: 'property', element: firstValue, property: 'textContent', value };
    }

    // Array of elements: set first element's textContent
    if (Array.isArray(firstValue) && firstValue.length > 0 && isHTMLElement(firstValue[0])) {
      const value = await this.extractValue(raw, evaluator, context);
      return { type: 'property', element: firstValue[0], property: 'textContent', value };
    }

    // Default: variable assignment
    if (typeof firstValue !== 'string') {
      throw new Error('set command target must be a string or object literal');
    }

    const value = await this.extractValue(raw, evaluator, context);
    return { type: 'variable', name: firstValue, value };
  }

  async execute(input: SetCommandInput, context: TypedExecutionContext): Promise<SetCommandOutput> {
    switch (input.type) {
      case 'variable':
        context.locals.set(input.name, input.value);
        if (input.name === 'result' || input.name === 'it') {
          Object.assign(context, { [input.name]: input.value });
        }
        Object.assign(context, { it: input.value });
        return { target: input.name, value: input.value, targetType: 'variable' };

      case 'attribute':
        input.element.setAttribute(input.name, String(input.value));
        Object.assign(context, { it: input.value });
        return { target: `@${input.name}`, value: input.value, targetType: 'attribute' };

      case 'property':
        setElementProperty(input.element, input.property, input.value);
        Object.assign(context, { it: input.value });
        return { target: input.element, value: input.value, targetType: 'property' };

      case 'style':
        setStyleValue(input.element, input.property, input.value);
        Object.assign(context, { it: input.value });
        return { target: input.element, value: input.value, targetType: 'property' };

      case 'object-literal':
        for (const target of input.targets) {
          for (const [key, val] of Object.entries(input.properties)) {
            setElementProperty(target, key, val);
          }
        }
        Object.assign(context, { it: input.properties });
        return {
          target: input.targets[0] || 'unknown',
          value: input.properties,
          targetType: 'property',
        };

      case 'member-assignment':
        input.container[input.property] = input.value;
        Object.assign(context, { it: input.value });
        return { target: input.property, value: input.value, targetType: 'property' };

      default:
        throw new Error(`Unknown input type: ${(input as { type: string }).type}`);
    }
  }

  // ========== Private Helpers ==========

  private async tryParseMemberExpression(
    firstArg: Record<string, unknown>,
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SetCommandInput | null> {
    const objectNode = firstArg.object as { name?: string } | undefined;
    const propertyNode = firstArg.property as { name?: string } | undefined;

    if (objectNode?.name && propertyNode?.name) {
      const objectName = objectNode.name.toLowerCase();
      if (['me', 'my', 'it', 'its', 'you', 'your'].includes(objectName)) {
        const element = resolvePossessive(objectName, context);
        const value = await this.extractValue(raw, evaluator, context);
        return { type: 'property', element, property: propertyNode.name, value };
      }
    }

    // General member expression assignment (e.g. window.foo, element.style.color)
    // Evaluate the object sub-expression to get the container, then assign the property.
    const objectAst = firstArg.object as ASTNode | undefined;
    const computed = firstArg.computed as boolean | undefined;
    if (objectAst) {
      const container = await evaluator.evaluate(objectAst, context);
      if (container != null && typeof container === 'object') {
        const property = computed
          ? String(await evaluator.evaluate(firstArg.property as ASTNode, context))
          : propertyNode?.name || '';
        if (property) {
          const value = await this.extractValue(raw, evaluator, context);
          return {
            type: 'member-assignment',
            container: container as Record<string, unknown>,
            property,
            value,
          };
        }
      }
    }

    return null;
  }

  private async extractValue(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<unknown> {
    if (raw.modifiers.to) {
      return evaluator.evaluate(raw.modifiers.to, context);
    }

    const toIndex = raw.args.findIndex(
      arg => arg.type === 'identifier' && (arg as Record<string, unknown>).name === 'to'
    );

    if (toIndex >= 0 && raw.args.length > toIndex + 1) {
      return evaluator.evaluate(raw.args[toIndex + 1], context);
    }

    if (raw.args.length >= 2) {
      return evaluator.evaluate(raw.args[1], context);
    }

    throw new Error('set command requires a value (use "to" keyword)');
  }

  private async resolveElement(
    onModifier: ExpressionNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HTMLElement> {
    if (!onModifier) return resolveElementHelper(undefined, context);
    const evaluated = await evaluator.evaluate(onModifier, context);
    return resolveElementHelper(evaluated as string | HTMLElement | undefined, context);
  }

  private async resolveTargets(
    onModifier: ExpressionNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HTMLElement[]> {
    if (!onModifier) return resolveElementsHelper(undefined, context);
    const evaluated = await evaluator.evaluate(onModifier, context);
    return resolveElementsHelper(
      evaluated as string | HTMLElement | HTMLElement[] | NodeList | undefined,
      context
    );
  }

  private async parseTheXofY(
    expression: string,
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SetCommandInput> {
    const match = expression.match(/^the\s+(.+?)\s+of\s+(.+)$/i);
    if (!match) throw new Error('Invalid "the X of Y" syntax');

    const [, property, targetExpr] = match;
    const element = resolveElementHelper(targetExpr, context);
    const value = await this.extractValue(raw, evaluator, context);

    return { type: 'property', element, property: property.trim(), value };
  }

  /** Validate input conforms to SetCommandInput */
  validate(input: unknown): input is SetCommandInput {
    if (!input || typeof input !== 'object') return false;
    const obj = input as Record<string, unknown>;
    if (!obj.type || typeof obj.type !== 'string') return false;
    const validTypes = ['variable', 'attribute', 'property', 'style', 'object-literal'];
    if (!validTypes.includes(obj.type)) return false;
    switch (obj.type) {
      case 'variable':
        return typeof obj.name === 'string' && 'value' in obj;
      case 'attribute':
        return typeof obj.name === 'string' && isHTMLElement(obj.element) && 'value' in obj;
      case 'property':
        return typeof obj.property === 'string' && isHTMLElement(obj.element) && 'value' in obj;
      case 'style':
        return (
          typeof obj.property === 'string' &&
          obj.property !== '' &&
          isHTMLElement(obj.element) &&
          typeof obj.value === 'string'
        );
      case 'object-literal':
        return (
          obj.properties !== null &&
          typeof obj.properties === 'object' &&
          Array.isArray(obj.targets) &&
          obj.targets.length > 0
        );
      default:
        return false;
    }
  }
}

export const createSetCommand = createFactory(SetCommand);
export default SetCommand;
