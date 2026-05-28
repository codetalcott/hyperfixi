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
import type { ExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { setVariableValue } from '../helpers/variable-access';
import { evaluateExpressionFromSource } from '../../parser/runtime';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => HTML_ESCAPE[c]);
}

/**
 * Interpolate `{expr}` placeholders in a make element literal against the live
 * context (e.g. `<li>Article #{itemNum}</li>` → `<li>Article #5</li>`, where
 * `#` is literal and `{itemNum}` is evaluated). Values are HTML-escaped to keep
 * the innerHTML build safe. Braces whose contents aren't a valid/evaluable
 * expression are left untouched, so literal `{...}` text survives.
 */
async function interpolateLiteral(html: string, context: ExecutionContext): Promise<string> {
  if (!html.includes('{')) return html;
  const re = /\{([^{}]+)\}/g;
  const replacements: Array<{ index: number; length: number; text: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let text = m[0]; // default: leave the literal `{…}` untouched
    try {
      const value = await evaluateExpressionFromSource(m[1].trim(), context);
      if (value !== undefined && value !== null) text = escapeHtml(String(value));
    } catch {
      /* not an expression — keep the literal text */
    }
    replacements.push({ index: m.index, length: m[0].length, text });
  }
  let result = html;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { index, length, text } = replacements[i];
    result = result.slice(0, index) + text + result.slice(index + length);
  }
  return result;
}

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

/**
 * Create a DOM element from a full open/close HTML literal like
 * `<li class='x'><span>1</span></li>` (with nested children), as opposed to the
 * `<tag#id.class/>` self-closing shorthand handled by createDOMElement.
 */
function createElementFromHTML(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const fromTemplate = template.content.firstElementChild;
  if (fromTemplate && isHTMLElement(fromTemplate)) return fromTemplate;
  // Fallback for environments where <template>.content is unavailable.
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();
  const child = wrapper.firstElementChild;
  return child && isHTMLElement(child) ? child : wrapper;
}

/** Create class instance using constructor lookup */
function createClassInstance(
  className: string | HTMLElement,
  args: unknown[],
  context: TypedExecutionContext
): unknown {
  if (isHTMLElement(className)) return className;

  const name = String(className);
  let Constructor: (new (...args: unknown[]) => unknown) | undefined;

  if (typeof window !== 'undefined')
    Constructor = (window as unknown as Record<string, unknown>)[name] as typeof Constructor;
  if (!Constructor && typeof global !== 'undefined')
    Constructor = (global as Record<string, unknown>)[name] as typeof Constructor;
  if (!Constructor && context.variables?.has(name))
    Constructor = context.variables.get(name) as typeof Constructor;

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
  // `called <name>` parses the name as a symbol or a bare identifier; use the
  // node's name directly rather than evaluating it (the name isn't a variable).
  if (
    (calledMod.type === 'symbol' || calledMod.type === 'identifier') &&
    typeof (calledMod as Record<string, unknown>).name === 'string'
  ) {
    return (calledMod as Record<string, unknown>).name as string;
  }
  const value = await evaluator.evaluate(calledMod, context);
  return typeof value === 'string' ? value : undefined;
}

@meta({
  description: 'Create DOM elements or class instances',
  syntax: ['make a <tag#id.class1.class2/>', 'make a <ClassName> from <args> called <identifier>'],
  examples: [
    'make an <a.navlink/> called linkElement',
    'make a URL from "/path/", "https://origin.example.com"',
  ],
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
    // `make a <…>` parses the element as the value of the article modifier
    // (a/an), not a positional arg. Fall back to args[0] for direct callers.
    const elementNode = raw.modifiers.an ?? raw.modifiers.a ?? raw.args[0];
    if (!elementNode) {
      throw new Error('Make command requires class name or DOM element expression');
    }
    // Element literals carry their full `<…>` markup on `node.raw`; use it
    // directly so the element is created rather than querySelector-ed.
    const rawLiteral = (elementNode as Record<string, unknown>).raw;
    let expression =
      typeof rawLiteral === 'string' && rawLiteral.startsWith('<')
        ? rawLiteral
        : await evaluator.evaluate(elementNode, context);
    if (expression === undefined || expression === null) {
      throw new Error('Make command requires class name or DOM element expression');
    }
    // Evaluate `{expr}` interpolation inside element literals against the live
    // context (vars bound by the surrounding handler, e.g. `{itemNum}`).
    if (typeof expression === 'string' && expression.startsWith('<')) {
      expression = await interpolateLiteral(expression, context as ExecutionContext);
    }

    const article = raw.modifiers.an !== undefined ? 'an' : 'a';
    const constructorArgs = await resolveConstructorArgs(raw.modifiers.from, evaluator, context);
    const variableName = await resolveVariableName(raw.modifiers.called, evaluator, context);

    return { article, expression, constructorArgs, variableName };
  }

  async execute(input: MakeCommandInput, context: TypedExecutionContext): Promise<unknown> {
    const { expression, constructorArgs = [], variableName } = input;

    const isLiteral = typeof expression === 'string' && expression.startsWith('<');
    const result =
      isLiteral && (expression as string).endsWith('/>')
        ? createDOMElement(expression as string)
        : isLiteral && /<\/[a-zA-Z]/.test(expression as string)
          ? createElementFromHTML(expression as string)
          : createClassInstance(expression, constructorArgs, context);

    Object.assign(context, { it: result });
    if (variableName) setVariableValue(variableName, result, context);

    return result;
  }
}

export const createMakeCommand = createFactory(MakeCommand);
export default MakeCommand;
