/**
 * `add`, `remove`, `toggle`. Follows upstream `parsetree/commands/dom.js`.
 */
import type { AttributeRefNode, ClassRefNode, Cmd, Ctx, Expr, StyleLiteralNode } from '../ast';
import { assignable, attributeRef, classRef, eventName, expr, implicitMe, styleLiteral } from '../expressions';
import type { Grammar, Parser } from '../parser';
import { dataOf, implicitLoop, implicitLoopWhen, nullCheck } from '../runtime';
import { all, get, isEl, num, then1 } from '../util';

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function classRefs(p: Parser): ClassRefNode[] | undefined {
  const first = classRef(p);
  if (!first) return;
  const refs = [first];
  for (let next = classRef(p); next; next = classRef(p)) refs.push(next);
  return refs;
}

/** The class name each reference stands for; `.{expr}` is evaluated. */
const classNames = (refs: ClassRefNode[] | undefined, ctx: Ctx) =>
  (refs ?? []).map(ref => then1(ref.ev(ctx), c => String(get(c, 'className'))));

const cssProperties = (css: string) =>
  css
    .split(';')
    .map(declaration => declaration.split(':')[0].trim())
    .filter(Boolean);

const styleOf = (elt: unknown) => (elt instanceof HTMLElement || elt instanceof SVGElement ? elt.style : undefined);

/** Apply once per target, or — with a `when` clause — apply to the targets that pass and undo on the rest. */
const eachTarget = (
  targets: unknown,
  when: Expr | undefined,
  ctx: Ctx,
  apply: (elt: Element) => void,
  undo: (elt: Element) => void
) =>
  when
    ? implicitLoopWhen(targets, when, ctx, t => isEl(t) && apply(t), t => isEl(t) && undo(t))
    : implicitLoop(targets, t => isEl(t) && apply(t));

// ---------------------------------------------------------------------------
// add
// ---------------------------------------------------------------------------

export interface AddNode extends Cmd {
  type: 'addCommand';
  classRefs?: ClassRefNode[];
  attributeRef?: AttributeRefNode;
  css?: StyleLiteralNode;
  /** `add <value> to <array or set>`. */
  value?: Expr;
  to: Expr;
  when?: Expr;
}

export function add(g: Grammar): void {
  g.commands.add = (p, _keyword, start) => {
    const refs = classRefs(p);
    const attribute = refs ? undefined : attributeRef(p);
    const css = refs || attribute ? undefined : styleLiteral(p);
    let value: Expr | undefined;
    if (!refs && !attribute && !css) {
      value = p.withFollow(['to'], () => expr(p));
      if (p.cur().value !== 'to') p.err('Expected either a class reference or attribute expression');
    }
    const to = p.match('to') ? expr(p) : implicitMe(p);
    const whenClause = p.match('when') ? expr(p) : undefined;
    // Upstream accepts a `when` clause after CSS or a collection value and ignores it.
    const when = refs || attribute ? whenClause : undefined;
    const toText = p.text(to);
    const node: AddNode = {
      type: 'addCommand',
      classRefs: refs,
      attributeRef: attribute,
      css,
      value,
      to,
      when,
      start,
      end: p.endPos(),
      run: ctx =>
        all([to.ev(ctx), css?.ev(ctx), value?.ev(ctx), ...classNames(refs, ctx)], ([target, cssText, item, ...names]) => {
          nullCheck(target, toText);
          if (value) {
            if (Array.isArray(target)) target.push(item);
            else if (target instanceof Set) target.add(item);
            else if (target instanceof Map) throw new Error("Use 'set myMap[key] to value' for Maps");
            else throw new Error('Cannot add to ' + typeof target);
          } else if (refs) {
            return all(
              names.map(name =>
                eachTarget(target, when, ctx, t => t.classList.add(String(name)), t => t.classList.remove(String(name)))
              ),
              () => {}
            );
          } else if (attribute) {
            return eachTarget(
              target,
              when,
              ctx,
              t => t.setAttribute(attribute.name, String(attribute.value)),
              t => t.removeAttribute(attribute.name)
            );
          } else {
            implicitLoop(target, t => {
              const style = styleOf(t);
              if (style) style.cssText += cssText;
            });
          }
        }),
    };
    return node;
  };
}

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

export interface RemoveNode extends Cmd {
  type: 'removeCommand';
  classRefs?: ClassRefNode[];
  attributeRef?: AttributeRefNode;
  css?: StyleLiteralNode;
  /** `remove <element>` or `remove <item> from <collection>`. */
  element?: Expr;
  from?: Expr;
  when?: Expr;
}

const isDomTarget = (v: unknown) => v instanceof Node || v instanceof NodeList || v instanceof HTMLCollection;

export function remove(g: Grammar): void {
  g.commands.remove = (p, _keyword, start) => {
    const refs = classRefs(p);
    const attribute = refs ? undefined : attributeRef(p);
    const css = refs || attribute ? undefined : styleLiteral(p);
    const element = refs || attribute || css ? undefined : expr(p);
    const from = p.match('from') ? expr(p) : element ? undefined : implicitMe(p);
    let when: Expr | undefined;
    if (p.match('when')) {
      if (element) p.err("'when' clause is not supported when removing elements");
      when = expr(p);
    }
    const fromText = from ? p.text(from) : '';
    const elementText = element ? p.text(element) : '';

    const removeValue = (ctx: Ctx, value: unknown, container: unknown) => {
      // `remove x.y` / `remove a[i]` with no `from` deletes the property, unless it holds a DOM node.
      if (container == null && element?.del && element.lhs && !isDomTarget(value)) {
        const target = element;
        return then1(element.lhs(ctx), lhs => target.del?.(ctx, lhs));
      }
      nullCheck(value, elementText);
      if (Array.isArray(container)) {
        const index = container.indexOf(value);
        if (index > -1) container.splice(index, 1);
      } else if (container instanceof Set || container instanceof Map) {
        container.delete(value);
      } else {
        implicitLoop(value, t => {
          if (isEl(t) && t.parentElement && (container == null || (container instanceof Node && container.contains(t)))) {
            t.parentElement.removeChild(t);
          }
        });
      }
    };

    const node: RemoveNode = {
      type: 'removeCommand',
      classRefs: refs,
      attributeRef: attribute,
      css,
      element,
      from,
      when,
      start,
      end: p.endPos(),
      run: ctx =>
        all(
          [from?.ev(ctx), css?.ev(ctx), element?.ev(ctx), ...classNames(refs, ctx)],
          ([container, cssText, value, ...names]) => {
            if (element) return removeValue(ctx, value, container);
            nullCheck(container, fromText);
            if (css) {
              const properties = cssProperties(String(cssText));
              implicitLoop(container, t => properties.forEach(property => styleOf(t)?.removeProperty(property)));
            } else if (refs) {
              return all(
                names.map(name =>
                  eachTarget(container, when, ctx, t => t.classList.remove(String(name)), t => t.classList.add(String(name)))
                ),
                () => {}
              );
            } else if (attribute) {
              return eachTarget(
                container,
                when,
                ctx,
                t => t.removeAttribute(attribute.name),
                t => t.setAttribute(attribute.name, String(attribute.value))
              );
            }
          }
        ),
    };
    return node;
  };
}

// ---------------------------------------------------------------------------
// Visibility strategies, shared by toggle / hide / show
// ---------------------------------------------------------------------------

export type Visibility = (op: 'hide' | 'show' | 'toggle', elt: HTMLElement, arg?: string) => void;

const byStyle =
  (property: 'visibility' | 'opacity', hidden: string, shown: string): Visibility =>
  (op, elt, arg) => {
    if (arg) elt.style[property] = arg;
    else if (op === 'toggle') elt.style[property] = getComputedStyle(elt)[property] === hidden ? shown : hidden;
    else elt.style[property] = op === 'hide' ? hidden : shown;
  };

export const strategies: Record<string, Visibility> = {
  display(op, elt, arg) {
    if (!arg && elt instanceof HTMLDialogElement) {
      if (op === 'hide' || (op === 'toggle' && elt.open)) elt.close();
      else if (!elt.open) elt.show();
      return;
    }
    const data = dataOf(elt);
    if (arg) elt.style.display = arg;
    else if (op === 'toggle') strategies.display(getComputedStyle(elt).display === 'none' ? 'show' : 'hide', elt);
    else if (op === 'hide') {
      data.originalDisplay ??= elt.style.display;
      elt.style.display = 'none';
    } else if (data.originalDisplay && data.originalDisplay !== 'none') elt.style.display = data.originalDisplay;
    else elt.style.removeProperty('display');
  },
  visibility: byStyle('visibility', 'hidden', 'visible'),
  opacity: byStyle('opacity', '0', '1'),
  hidden(op, elt) {
    const hide = op === 'toggle' ? !elt.hasAttribute('hidden') : op === 'hide';
    if (hide) elt.setAttribute('hidden', '');
    else elt.removeAttribute('hidden');
  },
};

export function strategy(p: Parser, name?: string): Visibility {
  return strategies[name ?? 'display'] ?? p.err('Unknown show/hide strategy : ' + name);
}

// ---------------------------------------------------------------------------
// toggle
// ---------------------------------------------------------------------------

export interface ToggleNode extends Cmd {
  type: 'toggleCommand';
  classRefs?: ClassRefNode[];
  /** `toggle between .a and .b` / `toggle between @a and @b`. */
  between?: [ClassRefNode, ClassRefNode] | [AttributeRefNode, AttributeRefNode];
  attributeRef?: AttributeRefNode;
  /** `toggle *display`. */
  styleProp?: string;
  /** `toggle <assignable> between <values>`. */
  target?: Expr;
  betweenValues?: Expr[];
  on?: Expr;
  /** `for <duration>`. */
  time?: Expr;
  /** `until <event> [from <source>]`. */
  until?: string;
  from?: Expr;
}

export function toggle(g: Grammar): void {
  g.commands.toggle = (p, _keyword, start) => {
    p.matchAny('the', 'my');
    const node: ToggleNode = { type: 'toggleCommand', start, end: start, run: () => {} };
    let visibility: Visibility | undefined;

    if (p.cur().type === 'STYLE_REF') {
      const styleProp = (node.styleProp = p.consume().value.slice(1));
      visibility = strategy(p, styleProp);
      node.on = p.match('of') ? p.withFollow(['with', 'between'], () => expr(p)) : implicitMe(p);
    } else if (p.match('between')) {
      const first = classRef(p);
      if (first) {
        p.req('and');
        node.between = [first, classRef(p) ?? p.err('Expected classRef')];
      } else {
        const attribute = attributeRef(p) ?? p.err('Expected either a class reference or attribute expression');
        p.req('and');
        node.between = [attribute, attributeRef(p) ?? p.err('Expected attributeRef')];
      }
    } else if (!(node.classRefs = classRefs(p)) && !(node.attributeRef = attributeRef(p))) {
      node.target = p.withFollow(['between'], () => assignable(p));
    }

    if (!node.styleProp && !node.target) node.on = p.match('on') ? expr(p) : implicitMe(p);

    if (p.match('between')) {
      const values = (node.betweenValues = p.withFollow(['and'], () => {
        const list = [expr(p)];
        while (p.matchOp(',')) list.push(expr(p));
        return list;
      }));
      p.req('and');
      values.push(expr(p));
    }
    if (node.target && !node.betweenValues) p.err("toggle <expression> requires 'between' with values");

    if (p.peek('for') && !p.peek('in', 2)) {
      p.match('for');
      node.time = expr(p);
    } else if (p.match('until')) {
      node.until = eventName(p);
      if (p.match('from')) node.from = expr(p);
    }
    node.end = p.endPos();

    const { on, target, betweenValues, between, attributeRef: attribute, styleProp } = node;
    const onText = on ? p.text(on) : '';
    const next = (values: unknown[], current: unknown) => values[(values.findIndex(v => v == current) + 1) % values.length];

    const flip = (ctx: Ctx, targets: unknown, values: unknown[], names: unknown[]) => {
      if (betweenValues && target?.lhs && target.put) {
        const write = target;
        return all([target.ev(ctx), target.lhs(ctx)], ([current, lhs]) => write.put?.(ctx, lhs, next(values, current)));
      }
      if (betweenValues && styleProp) {
        return implicitLoop(targets, t => {
          const style = styleOf(t);
          if (!style || !isEl(t)) return;
          const current = style.getPropertyValue(styleProp) || getComputedStyle(t).getPropertyValue(styleProp);
          style.setProperty(styleProp, String(next(values, current)));
        });
      }
      nullCheck(targets, onText);
      implicitLoop(targets, t => {
        if (!isEl(t)) return;
        if (visibility) {
          if (t instanceof HTMLElement) visibility('toggle', t);
        } else if (between) {
          const [a, b] = between;
          if (a.type === 'classRef' && b.type === 'classRef') {
            const [first, second] = [String(a.className), String(b.className)];
            const had = t.classList.contains(first);
            t.classList.toggle(first, !had);
            t.classList.toggle(second, had);
          } else if (a.type === 'attributeRef' && b.type === 'attributeRef') {
            if (t.getAttribute(a.name) === String(a.value)) {
              t.removeAttribute(a.name);
              t.setAttribute(b.name, String(b.value));
            } else {
              t.removeAttribute(b.name);
              t.setAttribute(a.name, String(a.value));
            }
          }
        } else if (attribute) {
          if (t.hasAttribute(attribute.name)) t.removeAttribute(attribute.name);
          else t.setAttribute(attribute.name, String(attribute.value));
        } else names.forEach(name => t.classList.toggle(String(name)));
      });
    };

    node.run = ctx =>
      all(
        [on?.ev(ctx), node.time?.ev(ctx), node.from?.ev(ctx), all((betweenValues ?? []).map(v => v.ev(ctx)), v => v), ...classNames(node.classRefs, ctx)],
        ([targets, time, source, values, ...names]) => {
          const once = () => flip(ctx, targets, Array.isArray(values) ? values : [], names);
          if (node.time) {
            // Toggle now, toggle back after the duration, then carry on.
            return new Promise<void>(resolve => {
              once();
              setTimeout(() => {
                once();
                resolve();
              }, num(time));
            });
          }
          if (node.until) {
            const until = node.until;
            const eventSource = source || ctx.me;
            return new Promise<void>(resolve => {
              if (eventSource instanceof EventTarget) {
                eventSource.addEventListener(
                  until,
                  () => {
                    once();
                    resolve();
                  },
                  { once: true }
                );
              }
              once();
            });
          }
          return then1(once(), () => {});
        }
      );
    return node;
  };
}
