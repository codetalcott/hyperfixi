/**
 * MakeCommand - Optimized Implementation
 *
 * Creates DOM elements or class instances.
 *
 * Syntax:
 *   make a <tag#id.class1.class2/>
 *   make a URL from "/path/", "origin"
 */

import type { ASTNode, TypedExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { setVariableValue } from '../helpers/variable-access';
import { command, meta, createFactory, type DecoratedCommand, type CommandMetadata } from '../decorators';

/** Typed input after parsing */
export interface MakeCommandInput {
  article: 'a' | 'an';
  expression: string | HTMLElement;
  constructorArgs?: unknown[];
  variableName?: string;
}

/** Create DOM element from expression like <div#id.class1.class2/> */
function createDOMElement(expr: string): HTMLElement {
  const content = expr.slice(1, -2); // Remove < and />
  let tagName = 'div';
  let remainder = content;

  const tagMatch = content.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  if (tagMatch) {
    tagName = tagMatch[1];
    remainder = content.slice(tagMatch[0].length);
  }

  const element = document.createElement(tagName);
  const parts = remainder.split(/(?=[.#])/);

  for (const part of parts) {
    if (part.startsWith('#')) {
      const id = part.slice(1);
      if (id) element.id = id;
    } else if (part.startsWith('.')) {
      const className = part.slice(1);
      if (className) element.classList.add(className);
    }
  }

  return element;
}

/** Create class instance using constructor lookup */
function createClassInstance(className: string | HTMLElement, args: unknown[], context: TypedExecutionContext): unknown {
  if (isHTMLElement(className)) return className;

  const name = String(className);
  let Constructor: (new (...args: unknown[]) => unknown) | undefined;

  if (typeof window !== 'undefined') Constructor = (window as Record<string, unknown>)[name] as typeof Constructor;
  if (!Constructor && typeof global !== 'undefined') Constructor = (global as Record<string, unknown>)[name] as typeof Constructor;
  if (!Constructor && context.variables?.has(name)) Constructor = context.variables.get(name) as typeof Constructor;

  if (!Constructor || typeof Constructor !== 'function') {
    throw new Error(`Constructor '${name}' not found or is not a function`);
  }

  return args.length === 0 ? new Constructor() : new Constructor(...args);
}

/** Resolve constructor args from "from" modifier */
async function resolveConstructorArgs(
  fromMod: ASTNode | undefined,
  evaluator: ExpressionEvaluator,
  context: TypedExecutionContext
): Promise<unknown[]> {
  if (!fromMod) return [];
  if (fromMod.type === 'arrayLiteral' && Array.isArray(fromMod.args)) {
    const results: unknown[] = [];
    for (const arg of fromMod.args) {
      results.push(await evaluator.evaluate(arg, context));
    }
    return results;
  }
  const value = await evaluator.evaluate(fromMod, context);
  return Array.isArray(value) ? value : [value];
}

/** Resolve variable name from "called" modifier */
async function resolveVariableName(
  calledMod: ASTNode | undefined,
  evaluator: ExpressionEvaluator,
  context: TypedExecutionContext
): Promise<string | undefined> {
  if (!calledMod) return undefined;
  if (calledMod.type === 'symbol' && typeof (calledMod as Record<string, unknown>).name === 'string') {
    return (calledMod as Record<string, unknown>).name as string;
  }
  const value = await evaluator.evaluate(calledMod, context);
  return typeof value === 'string' ? value : String(value);
}

@meta({
  description: 'Create DOM elements or class instances',
  syntax: ['make a <tag#id.class1.class2/>', 'make a <ClassName> from <args> called <identifier>'],
  examples: ['make an <a.navlink/> called linkElement', 'make a URL from "/path/", "https://origin.example.com"'],
  sideEffects: ['dom-creation', 'data-mutation'],
})
@command({ name: 'make', category: 'dom' })
export class MakeCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ASTNode> },
    evaluator: ExpressionEvaluator,
    context: TypedExecutionContext
  ): Promise<MakeCommandInput> {
    const expression = raw.args.length > 0 ? await evaluator.evaluate(raw.args[0], context) : undefined;
    if (!expression) throw new Error('Make command requires class name or DOM element expression');

    const article = raw.modifiers.an !== undefined ? 'an' : 'a';
    const constructorArgs = await resolveConstructorArgs(raw.modifiers.from, evaluator, context);
    const variableName = await resolveVariableName(raw.modifiers.called, evaluator, context);

    return { article, expression, constructorArgs, variableName };
  }

  async execute(input: MakeCommandInput, context: TypedExecutionContext): Promise<unknown> {
    const { expression, constructorArgs = [], variableName } = input;

    const result = typeof expression === 'string' && expression.startsWith('<') && expression.endsWith('/>')
      ? createDOMElement(expression)
      : createClassInstance(expression, constructorArgs, context);

    Object.assign(context, { it: result });
    if (variableName) setVariableValue(variableName, result, context);

    return result;
  }
}

export const createMakeCommand = createFactory(MakeCommand);
export default MakeCommand;
