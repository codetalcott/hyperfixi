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
import { isHTMLElement, isInsertableNode } from '../../utils/element-check';
import {
  isPropertyTargetString,
  resolveAnyPropertyTarget,
  resolvePropertyTargetFromString,
} from '../helpers/property-target';
import {
  insertContentSemantic,
  insertElementsInOrder,
  toInsertPosition,
  type ContentInsertPosition,
  type SemanticPosition,
} from '../helpers/dom-mutation';
import { queryTargetElements, toElementListFiltered } from '../helpers/target-elements';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

/**
 * @deprecated Use `ContentInsertPosition` from `commands/helpers/dom-mutation`,
 * which this now aliases (the two were value-identical duplicates). `put`'s own
 * input carries `SemanticPosition` names, shared with `append`/`prepend`.
 */
export type InsertPosition = ContentInsertPosition;

export interface PutCommandInput {
  value: any;
  targets: HTMLElement[];
  position: SemanticPosition;
  memberPath?: string;
  variableName?: string;
}

/**
 * PutCommand - Insert content into elements
 *
 * Before: 562 lines
 * After: ~250 lines (56% reduction)
 */
@command({ name: 'put' })
export class PutCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Insert content into elements or properties',
    syntax: [
      'put <value> into <target>',
      'put <value> before <target>',
      'put <value> after <target>',
    ],
    examples: [
      'put "Hello World" into me',
      'put <div>Content</div> before #target',
      "put value into #elem's innerHTML",
    ],
    sideEffects: ['dom-mutation'],
    category: 'dom',
    compatibility: 'standard',
  });

  get metadata() {
    return PutCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<PutCommandInput> {
    if (!raw.args?.length) throw new Error('put requires arguments');

    const nodeType = (n: ASTNode): string => (n as any)?.type || 'unknown';
    const validPreps = ['into', 'before', 'after', 'at', 'at start of', 'at end of'];

    let prepIdx = -1,
      prepKw: string | null = null;
    for (let i = 0; i < raw.args.length; i++) {
      const arg = raw.args[i];
      const t = nodeType(arg);
      const v = (t === 'literal' ? (arg as any).value : (arg as any).name) as string;
      if ((t === 'literal' || t === 'identifier') && validPreps.includes(v)) {
        prepIdx = i;
        prepKw = v;
        break;
      }
    }

    let contentArg: ASTNode | null = null,
      targetArg: ASTNode | null = null;
    if (prepIdx === -1) {
      // Check modifiers for semantic parsing format (e.g., { args: [content], modifiers: { into: target } })
      // Any valid preposition can arrive as a modifier key, including the
      // multi-word positional forms ('at start of' / 'at end of').
      const prepKey = validPreps.find(p => raw.modifiers[p]);
      if (prepKey) {
        contentArg = raw.args[0];
        prepKw = prepKey;
        targetArg = raw.modifiers[prepKey] as ASTNode;
      } else if (raw.args.length >= 3) {
        contentArg = raw.args[0];
        prepKw = (raw.args[1] as any)?.value || (raw.args[1] as any)?.name || null;
        targetArg = raw.args[2];
      } else if (raw.args.length >= 2) {
        contentArg = raw.args[0];
        prepKw = (raw.args[1] as any)?.value || (raw.args[1] as any)?.name || 'into';
      } else throw new Error('put requires content and position');
    } else {
      contentArg = raw.args.slice(0, prepIdx)[0] || null;
      targetArg = raw.args.slice(prepIdx + 1)[0] || null;
    }

    if (!contentArg) throw new Error('put requires content');
    if (!prepKw) throw new Error('put requires position keyword');

    const value = await evaluator.evaluate(contentArg, context);
    const position = this.mapPosition(prepKw);

    let targetSelector: string | null = null,
      memberPath: string | undefined,
      variableName: string | undefined;

    if (targetArg) {
      const tt = nodeType(targetArg);

      // Unified PropertyTarget resolution: handles propertyOfExpression, propertyAccess, possessiveExpression
      const propertyTarget = await resolveAnyPropertyTarget(targetArg, evaluator, context);
      if (propertyTarget) {
        return {
          value,
          targets: [propertyTarget.element],
          position: 'into',
          memberPath: propertyTarget.property,
        };
      }

      if (tt === 'memberExpression') {
        const obj = (targetArg as any).object,
          prop = (targetArg as any).property;
        if (obj?.type === 'selector') targetSelector = obj.value;
        else if (obj?.type === 'identifier') {
          const objName = obj.name;
          // Context references (my, me, its, your) resolve to context elements
          if (objName === 'my' || objName === 'me' || objName === 'I') {
            if (context.me && prop?.name) {
              return {
                value,
                targets: [context.me as HTMLElement],
                position: 'into',
                memberPath: prop.name,
              };
            }
          } else if (objName === 'its' || objName === 'it') {
            // `it` often holds the result of a previous command (e.g., fetch result)
            // For member access like it.property, evaluate the full expression
            const ev = await evaluator.evaluate(targetArg, context);
            if (typeof ev === 'string') targetSelector = ev;
          } else {
            targetSelector = objName;
          }
        }
        if (targetSelector && prop?.name) memberPath = prop.name;
        else if (!targetSelector && !memberPath) {
          const ev = await evaluator.evaluate(targetArg, context);
          if (typeof ev === 'string') targetSelector = ev;
        }
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
            return {
              value,
              targets: [target.element],
              position: 'into',
              memberPath: target.property,
            };
          }
        }
        if (typeof lv === 'string' && this.looksLikeCss(lv)) targetSelector = lv;
        else variableName = String(lv);
      } else if (tt === 'identifier') {
        const nm = (targetArg as any).name;
        if (this.looksLikeCss(nm)) {
          targetSelector = nm;
        } else {
          // Evaluate to check if variable holds an element reference (matches _hyperscript semantics)
          const ev = await evaluator.evaluate(targetArg, context);
          const resolved = toElementListFiltered(ev);
          if (resolved) {
            return { value, targets: resolved, position, memberPath };
          }
          variableName = nm;
        }
      } else {
        const ev = await evaluator.evaluate(targetArg, context);
        const resolved = toElementListFiltered(ev);
        if (resolved) {
          return { value, targets: resolved, position, memberPath };
        } else if (typeof ev === 'string') {
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
      Object.assign(context, { it: value });
      return undefined as unknown as HTMLElement[];
    }

    if (memberPath) {
      for (const t of targets) this.setProperty(t, memberPath, value);
    } else {
      for (const t of targets) {
        const content = this.parseValue(value);
        // NOTE: an Element value can only exist in one place, so across multiple
        // targets it MOVES and ends up inside the last one. Strings are copied.
        // A homogeneous element ARRAY moves the same way, order preserved —
        // `put <tr/> in me sorted by … at end of me` is an in-place reorder
        // (state-preserving; the anti-morph — nothing is serialized).
        if (Array.isArray(content)) {
          insertElementsInOrder(t, content, toInsertPosition(position));
        } else {
          insertContentSemantic(t, content, position);
        }
      }
    }
    return targets;
  }

  /** Preposition surface form → the shared semantic position vocabulary. */
  private mapPosition(prep: string): SemanticPosition {
    switch (prep) {
      case 'into':
        return 'into';
      case 'before':
        return 'before';
      case 'after':
        return 'after';
      case 'at start of':
        return 'prepend';
      case 'at end of':
        return 'append';
      default:
        throw new Error(`Invalid position: ${prep}`);
    }
  }

  private async resolveTargets(sel: string | null, ctx: ExecutionContext): Promise<HTMLElement[]> {
    if (!sel || sel === 'me') {
      if (!ctx.me || !isHTMLElement(ctx.me))
        throw new Error('put: no target and context.me is null');
      return [ctx.me as HTMLElement];
    }
    return queryTargetElements(sel);
  }

  private parseValue(v: any): string | HTMLElement | HTMLElement[] {
    if (isHTMLElement(v)) return v as HTMLElement;
    // A non-empty homogeneous element array passes through for ordered
    // insertion. Mixed or empty arrays keep the string fallback (previously
    // "[object HTMLElement],…" — output nothing could have relied on).
    if (Array.isArray(v) && v.length > 0 && v.every(isHTMLElement)) {
      return v as HTMLElement[];
    }
    // `fetch … as html` resolves to a DocumentFragment (see FetchCommand's
    // parseHTML), and the htmx-compat layer's whole swap path is
    // `fetch … as html then put it into <target>`. Without this branch the
    // fragment fell to String(v) and every such swap inserted the literal
    // text "[object DocumentFragment]". Insertion helpers accept any Node —
    // insertBefore/appendChild splice a fragment's children in place — so
    // pass it straight through. Checked after the Element and array cases,
    // which have their own handling.
    if (isInsertableNode(v)) return v as unknown as HTMLElement;
    return v == null ? '' : String(v);
  }

  private looksLikeCss(s: string): boolean {
    if (!s) return false;
    if (/^[#.\[]/.test(s)) return true;
    if (/[>+~\s]/.test(s) && s.length > 1) return true;
    const tags = [
      'div',
      'span',
      'p',
      'a',
      'button',
      'input',
      'form',
      'ul',
      'li',
      'ol',
      'table',
      'tr',
      'td',
      'th',
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'section',
      'article',
      'header',
      'footer',
      'nav',
      'main',
      'aside',
      'dialog',
      'label',
      'select',
      'option',
      'textarea',
    ];
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
