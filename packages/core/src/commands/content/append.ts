/**
 * AppendCommand - Decorated Implementation
 *
 * Adds content to the end of a string, array, or HTML element.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   append <content>
 *   append <content> to <target>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { getVariableValue, setVariableValue } from '../helpers/variable-access';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

export interface AppendCommandInput {
  content: unknown;
  target?: string | HTMLElement | unknown[];
}

export interface AppendCommandOutput {
  result: unknown;
  targetType: 'result' | 'variable' | 'array' | 'element' | 'string';
  target?: string | HTMLElement;
}

/**
 * AppendCommand - Append content to targets
 *
 * Before: 298 lines
 * After: ~140 lines (53% reduction)
 */
@meta({
  description: 'Add content to the end of a string, array, or HTML element',
  syntax: ['append <content>', 'append <content> to <target>'],
  examples: ['append "Hello"', 'append "World" to greeting', 'append item to myArray', 'append "<p>New</p>" to #content'],
  sideEffects: ['data-mutation', 'dom-mutation'],
})
@command({ name: 'append', category: 'content' })
export class AppendCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<AppendCommandInput> {
    if (!raw.args?.length) throw new Error('append requires content');

    const content = await evaluator.evaluate(raw.args[0], context);
    let target: string | HTMLElement | unknown[] | undefined;

    if (raw.modifiers?.to) target = await evaluator.evaluate(raw.modifiers.to, context);
    else if ((raw as any).target) target = (raw as any).target;

    return { content, target };
  }

  async execute(input: AppendCommandInput, context: TypedExecutionContext): Promise<AppendCommandOutput> {
    const { content, target } = input;
    const contentStr = content == null ? String(content) : String(content);

    if (!target) {
      if (context.it === undefined) Object.assign(context, { it: contentStr });
      else Object.assign(context, { it: String(context.it) + contentStr });
      return { result: context.it, targetType: 'result' };
    }

    if (typeof target === 'string') {
      if (target.startsWith('#') || target.startsWith('.') || target.includes('[')) {
        const el = this.resolveDOMElement(target);
        el.innerHTML += contentStr;
        return { result: el, targetType: 'element', target: el };
      }

      if (target === 'me' || target === 'it' || target === 'you') {
        const ctxTarget = this.resolveContextRef(target, context);
        if (isHTMLElement(ctxTarget)) {
          (ctxTarget as HTMLElement).innerHTML += contentStr;
          return { result: ctxTarget, targetType: 'element', target: ctxTarget as HTMLElement };
        }
      }

      const current = getVariableValue(target, context);
      if (current !== undefined) {
        if (Array.isArray(current)) {
          current.push(content);
          return { result: current, targetType: 'array', target };
        }
        const newVal = (current == null ? '' : String(current)) + contentStr;
        setVariableValue(target, newVal, context);
        return { result: newVal, targetType: 'variable', target };
      } else {
        setVariableValue(target, contentStr, context);
        return { result: contentStr, targetType: 'variable', target };
      }
    } else if (Array.isArray(target)) {
      target.push(content);
      return { result: target, targetType: 'array' };
    } else if (isHTMLElement(target)) {
      (target as HTMLElement).innerHTML += contentStr;
      return { result: target, targetType: 'element', target: target as HTMLElement };
    } else {
      const newVal = String(target) + contentStr;
      Object.assign(context, { it: newVal });
      return { result: newVal, targetType: 'string' };
    }
  }

  private resolveDOMElement(sel: string): HTMLElement {
    if (typeof document === 'undefined') throw new Error('DOM not available');
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Element not found: ${sel}`);
    return el as HTMLElement;
  }

  private resolveContextRef(ref: string, ctx: TypedExecutionContext): any {
    switch (ref) {
      case 'me': return ctx.me;
      case 'it': return ctx.it;
      case 'you': return ctx.you;
      default: throw new Error(`Unknown context ref: ${ref}`);
    }
  }
}

export const createAppendCommand = createFactory(AppendCommand);
export default AppendCommand;
