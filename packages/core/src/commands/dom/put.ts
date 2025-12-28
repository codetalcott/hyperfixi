/**
 * PutCommand - Decorated Implementation
 *
 * Inserts content into DOM elements or element properties.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   put <value> into <target>
 *   put <value> before <target>
 *   put <value> after <target>
 *   put <value> at start of <target>
 *   put <value> at end of <target>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import {
  isPropertyOfExpressionNode,
  isPropertyAccessNode,
  isPropertyTargetString,
  resolvePropertyTargetFromNode,
  resolvePropertyTargetFromAccessNode,
  resolvePropertyTargetFromString,
  type PropertyOfExpressionNode,
  type PropertyAccessNode,
} from '../helpers/property-target';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

export type InsertPosition = 'replace' | 'beforeend' | 'afterend' | 'beforebegin' | 'afterbegin';

export interface PutCommandInput {
  value: any;
  targets: HTMLElement[];
  position: InsertPosition;
  memberPath?: string;
  variableName?: string;
}

/**
 * PutCommand - Insert content into elements
 *
 * Before: 562 lines
 * After: ~250 lines (56% reduction)
 */
@meta({
  description: 'Insert content into elements or properties',
  syntax: ['put <value> into <target>', 'put <value> before <target>', 'put <value> after <target>'],
  examples: ['put "Hello World" into me', 'put <div>Content</div> before #target', 'put value into #elem\'s innerHTML'],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'put', category: 'dom' })
export class PutCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<PutCommandInput> {
    if (!raw.args?.length) throw new Error('put requires arguments');

    const nodeType = (n: ASTNode): string => (n as any)?.type || 'unknown';
    const validPreps = ['into', 'before', 'after', 'at', 'at start of', 'at end of'];

    let prepIdx = -1, prepKw: string | null = null;
    for (let i = 0; i < raw.args.length; i++) {
      const arg = raw.args[i];
      const t = nodeType(arg);
      const v = (t === 'literal' ? (arg as any).value : (arg as any).name) as string;
      if ((t === 'literal' || t === 'identifier') && validPreps.includes(v)) {
        prepIdx = i; prepKw = v; break;
      }
    }

    let contentArg: ASTNode | null = null, targetArg: ASTNode | null = null;
    if (prepIdx === -1) {
      // Check modifiers for semantic parsing format (e.g., { args: [content], modifiers: { into: target } })
      if (raw.modifiers.into || raw.modifiers.before || raw.modifiers.after) {
        const prepKey = raw.modifiers.into ? 'into' : raw.modifiers.before ? 'before' : 'after';
        contentArg = raw.args[0];
        prepKw = prepKey;
        targetArg = raw.modifiers[prepKey] as ASTNode;
      } else if (raw.args.length >= 3) {
        contentArg = raw.args[0]; prepKw = (raw.args[1] as any)?.value || (raw.args[1] as any)?.name || null; targetArg = raw.args[2];
      } else if (raw.args.length >= 2) {
        contentArg = raw.args[0]; prepKw = (raw.args[1] as any)?.value || (raw.args[1] as any)?.name || 'into';
      } else throw new Error('put requires content and position');
    } else {
      contentArg = raw.args.slice(0, prepIdx)[0] || null;
      targetArg = raw.args.slice(prepIdx + 1)[0] || null;
    }

    if (!contentArg) throw new Error('put requires content');
    if (!prepKw) throw new Error('put requires position keyword');

    const value = await evaluator.evaluate(contentArg, context);
    const position = this.mapPosition(prepKw);

    let targetSelector: string | null = null, memberPath: string | undefined, variableName: string | undefined;

    if (targetArg) {
      const tt = nodeType(targetArg);

      // Parser path: propertyOfExpression AST node (e.g., "the innerHTML of #target")
      if (isPropertyOfExpressionNode(targetArg)) {
        const target = await resolvePropertyTargetFromNode(
          targetArg as PropertyOfExpressionNode,
          evaluator,
          context
        );
        if (target) {
          return { value, targets: [target.element], position: 'replace', memberPath: target.property };
        }
      }

      // Semantic parser path: propertyAccess AST node ("#element's X")
      if (isPropertyAccessNode(targetArg)) {
        const target = await resolvePropertyTargetFromAccessNode(
          targetArg as PropertyAccessNode,
          evaluator,
          context
        );
        if (target) {
          return { value, targets: [target.element], position: 'replace', memberPath: target.property };
        }
      }

      if (tt === 'memberExpression') {
        const obj = (targetArg as any).object, prop = (targetArg as any).property;
        if (obj?.type === 'selector') targetSelector = obj.value;
        else if (obj?.type === 'identifier') targetSelector = obj.name;
        if (targetSelector && prop?.name) memberPath = prop.name;
        else { const ev = await evaluator.evaluate(targetArg, context); if (typeof ev === 'string') targetSelector = ev; }
      } else if (tt === 'identifier' && (targetArg as any).name === 'me') {
        targetSelector = null;
      } else if (tt === 'selector' || tt === 'cssSelector') {
        targetSelector = (targetArg as any).value || (targetArg as any).selector;
      } else if (tt === 'literal') {
        const lv = (targetArg as any).value;
        // Runtime path: "the X of Y" string pattern
        if (typeof lv === 'string' && isPropertyTargetString(lv)) {
          const target = resolvePropertyTargetFromString(lv, context);
          if (target) {
            return { value, targets: [target.element], position: 'replace', memberPath: target.property };
          }
        }
        if (typeof lv === 'string' && this.looksLikeCss(lv)) targetSelector = lv;
        else variableName = String(lv);
      } else if (tt === 'identifier') {
        const nm = (targetArg as any).name;
        if (this.looksLikeCss(nm)) targetSelector = nm;
        else variableName = nm;
      } else {
        const ev = await evaluator.evaluate(targetArg, context);
        if (typeof ev === 'string') {
          if (this.looksLikeCss(ev)) targetSelector = ev;
          else variableName = ev;
        }
      }
    }

    if (variableName) return { value, targets: [], position, memberPath, variableName };

    const targets = await this.resolveTargets(targetSelector, context);
    return { value, targets, position, memberPath };
  }

  async execute(input: PutCommandInput, context: TypedExecutionContext): Promise<HTMLElement[]> {
    const { value, targets, position, memberPath, variableName } = input;

    if (variableName) {
      if (context.locals) context.locals.set(variableName, value);
      (context as any)[variableName] = value;
      return [];
    }

    if (memberPath) {
      for (const t of targets) this.setProperty(t, memberPath, value);
    } else {
      for (const t of targets) {
        const content = this.parseValue(value);
        this.insertContent(t, content, position);
      }
    }
    return targets;
  }

  private mapPosition(prep: string): InsertPosition {
    switch (prep) {
      case 'into': return 'replace';
      case 'before': return 'beforebegin';
      case 'after': return 'afterend';
      case 'at start of': return 'afterbegin';
      case 'at end of': return 'beforeend';
      default: throw new Error(`Invalid position: ${prep}`);
    }
  }

  private async resolveTargets(sel: string | null, ctx: ExecutionContext): Promise<HTMLElement[]> {
    if (!sel || sel === 'me') {
      if (!ctx.me || !isHTMLElement(ctx.me)) throw new Error('put: no target and context.me is null');
      return [ctx.me as HTMLElement];
    }
    const els = Array.from(document.querySelectorAll(sel)).filter((e): e is HTMLElement => isHTMLElement(e));
    if (!els.length) throw new Error(`No elements: "${sel}"`);
    return els;
  }

  private parseValue(v: any): string | HTMLElement {
    if (isHTMLElement(v)) return v as HTMLElement;
    return v == null ? '' : String(v);
  }

  private insertContent(target: HTMLElement, content: string | HTMLElement, pos: InsertPosition): void {
    if (pos === 'replace') {
      if (isHTMLElement(content)) { target.innerHTML = ''; target.appendChild(content as HTMLElement); }
      else {
        const hasHTML = content.includes('<') && content.includes('>');
        if (hasHTML) target.innerHTML = content; else target.textContent = content;
      }
      return;
    }
    if (isHTMLElement(content)) {
      const el = content as HTMLElement;
      switch (pos) {
        case 'beforebegin': target.parentElement?.insertBefore(el, target); break;
        case 'afterbegin': target.insertBefore(el, target.firstChild); break;
        case 'beforeend': target.appendChild(el); break;
        case 'afterend': target.parentElement?.insertBefore(el, target.nextSibling); break;
      }
    } else {
      const hasHTML = content.includes('<') && content.includes('>');
      if (hasHTML) target.insertAdjacentHTML(pos, content);
      else target.insertAdjacentText(pos, content);
    }
  }

  private looksLikeCss(s: string): boolean {
    if (!s) return false;
    if (/^[#.\[]/.test(s)) return true;
    if (/[>+~\s]/.test(s) && s.length > 1) return true;
    const tags = ['div', 'span', 'p', 'a', 'button', 'input', 'form', 'ul', 'li', 'ol', 'table', 'tr', 'td', 'th', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'dialog', 'label', 'select', 'option', 'textarea'];
    return tags.includes(s.toLowerCase());
  }

  private setProperty(el: HTMLElement, path: string, value: any): void {
    const parts = path.split('.');
    let cur: any = el;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) throw new Error(`Property path "${path}" does not exist`);
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
}

export const createPutCommand = createFactory(PutCommand);
export default PutCommand;
