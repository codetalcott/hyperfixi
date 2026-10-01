/**
 * The rest of the DOM commands: `hide` / `show`, `take`, `measure`, `make`,
 * `append`, `swap`, and the family that applies one action to a target
 * (`focus`, `blur`, `select`, `empty` / `clear`, `reset`, `open`, `close`).
 * Follows upstream `parsetree/commands/dom.js`, `basic.js` and `setters.js`.
 */
import type { AttributeRefNode, ClassRefNode, Cmd, Expr } from '../ast';
import {
  assignable,
  attributeRef,
  classRef,
  expr,
  implicitMe,
  symbol,
  unwrap,
} from '../expressions';
import type { Grammar } from '../parser';
import {
  host,
  implicitLoop,
  implicitLoopWhen,
  nullCheck,
  resolveSymbol,
  rx,
  setSymbol,
} from '../runtime';
import { all, fn, get, isEl, isIterable, num, then1 } from '../util';
import { strategy, type Visibility } from './dom';

// ---------------------------------------------------------------------------
// hide / show
// ---------------------------------------------------------------------------

export interface VisibilityNode extends Cmd {
  type: 'hideCommand' | 'showCommand';
  target: Expr;
  /** `with <strategy>`: display (default), visibility, opacity, hidden, or a configured one. */
  strategy?: string;
  /** `show … with display:inline-block`: the value to show with. */
  arg?: string;
  when?: Expr;
}

export function hideShow(g: Grammar): void {
  for (const op of ['hide', 'show'] as const) {
    g.commands[op] = (p, _keyword, start) => {
      const next = p.cur();
      const target =
        next.value === 'when' || next.value === 'with' || p.commandBoundary(next)
          ? implicitMe(p)
          : expr(p);
      let name: string | undefined;
      if (p.match('with')) name = p.reqType('IDENTIFIER', 'STYLE_REF').value.replace(/^\*/, '');
      let arg: string | undefined;
      if (op === 'show' && p.matchOp(':')) {
        arg = p
          .consumeUntil(undefined, 'WHITESPACE')
          .map(t => t.value)
          .join('');
      }
      const when = p.match('when') ? expr(p) : undefined;
      const apply: Visibility = strategy(p, name);
      const targetText = p.text(target);
      const act = (which: 'hide' | 'show') => (elt: unknown) => {
        if (elt instanceof HTMLElement) apply(which, elt, which === 'show' ? arg : undefined);
      };
      const node: VisibilityNode = {
        type: `${op}Command`,
        target,
        strategy: name,
        arg,
        when,
        start,
        end: p.endPos(),
        run: ctx =>
          then1(target.ev(ctx), elements => {
            nullCheck(elements, targetText);
            // With `when`, elements that fail the test get the opposite action.
            if (when)
              return implicitLoopWhen(
                elements,
                when,
                ctx,
                act(op),
                act(op === 'hide' ? 'show' : 'hide')
              );
            implicitLoop(elements, act(op));
          }),
      };
      return node;
    };
  }
}

// ---------------------------------------------------------------------------
// take
// ---------------------------------------------------------------------------

export interface TakeNode extends Cmd {
  type: 'takeCommand';
  classRefs: ClassRefNode[];
  attributeRef?: AttributeRefNode;
  from?: Expr;
  for: Expr;
  /** `with` / `giving`: what the elements that lose the class or attribute get instead. */
  replacementClass?: ClassRefNode;
  replacementValue?: Expr;
}

/** `take .class [with .other] [from <others> [giving .other]] [for <target>]`, or the same with `@attr`. */
export function take(g: Grammar): void {
  g.commands.take = (p, _keyword, start) => {
    const refs: ClassRefNode[] = [];
    for (let ref = classRef(p); ref; ref = classRef(p)) refs.push(ref);
    const classes = refs.length > 0;
    const attribute = classes
      ? undefined
      : (attributeRef(p) ?? p.err('Expected either a class reference or attribute expression'));
    let replacementClass: ClassRefNode | undefined;
    let replacementValue: Expr | undefined;
    const single = (word: string) => {
      if (refs.length > 1) p.err(`\`${word}\` cannot be combined with multiple class refs`);
      return classRef(p) ?? p.err('Expected classRef');
    };
    if (p.match('with')) {
      if (classes) replacementClass = single('with');
      else replacementValue = expr(p);
    }
    let from: Expr | undefined;
    if (p.match('from')) {
      from = expr(p);
      if (p.match('giving')) {
        if (replacementClass || replacementValue) p.err('`giving` cannot be combined with `with`');
        if (classes) replacementClass = single('giving');
        else replacementValue = expr(p);
      }
    }
    const target = p.match('for') ? expr(p) : implicitMe(p);
    const targetText = p.text(target);
    const fromText = from ? p.text(from) : '';
    const other = replacementClass?.className;
    const each = (elements: unknown, f: (elt: Element) => void) =>
      implicitLoop(elements, e => isEl(e) && f(e));

    const node: TakeNode = {
      type: 'takeCommand',
      classRefs: refs,
      attributeRef: attribute,
      from,
      for: target,
      replacementClass,
      replacementValue,
      start,
      end: p.endPos(),
      run: ctx =>
        all(
          [from?.ev(ctx), target.ev(ctx), replacementValue?.ev(ctx), ...refs.map(r => r.ev(ctx))],
          ([others, winners, value, ...holders]) => {
            nullCheck(winners, targetText);
            if (attribute) {
              nullCheck(others, fromText);
              each(others, e =>
                value
                  ? e.setAttribute(attribute.name, String(value))
                  : e.removeAttribute(attribute.name)
              );
              each(winners, e => e.setAttribute(attribute.name, attribute.value || ''));
              return;
            }
            refs.forEach((ref, i) => {
              const name = String(ref.className);
              // Without `from`, every element that currently has the class loses it.
              each(from ? others : holders[i], e => {
                e.classList.remove(name);
                if (other) e.classList.add(other);
              });
              each(winners, e => {
                e.classList.add(name);
                if (other) e.classList.remove(other);
              });
            });
          }
        ),
    };
    return node;
  };
}

// ---------------------------------------------------------------------------
// measure
// ---------------------------------------------------------------------------

export interface MeasureNode extends Cmd {
  type: 'measureCommand';
  target: Expr;
  properties: string[];
}

const MEASUREMENTS =
  'x y left top right bottom width height bounds scrollLeft scrollTop scrollLeftMax scrollTopMax scrollWidth scrollHeight scroll'.split(
    ' '
  );

/** `measure [<target>'s] [x, y, width, …]`: the result holds every measurement; named ones also become locals. */
export function measure(g: Grammar): void {
  g.commands.measure = (p, _keyword, start) => {
    let target: Expr = implicitMe(p);
    const properties: string[] = [];
    if (!p.commandBoundary(p.cur())) {
      const parsed = expr(p);
      if (parsed.type === 'symbol' && parsed.name && MEASUREMENTS.includes(parsed.name))
        properties.push(parsed.name);
      else if (parsed.type === 'possessive' && parsed.prop && parsed.root) {
        target = parsed.root;
        properties.push(parsed.prop);
      } else if (parsed.type === 'ofExpression' && parsed.name && parsed.root) {
        target = parsed.root;
        properties.push(parsed.name);
      } else target = parsed;
    }
    while (p.matchOp(',')) properties.push(p.reqType('IDENTIFIER').value);
    const targetText = p.text(target);
    const node: MeasureNode = {
      type: 'measureCommand',
      target,
      properties,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(target.ev(ctx), value => {
          nullCheck(value, targetText);
          // Only the first element of a collection is measured.
          const elt = isEl(value)
            ? value
            : isIterable(value)
              ? Array.from(value).find(isEl)
              : undefined;
          if (!elt) throw new Error(`'${targetText}' is not an element`);
          const bounds = elt.getBoundingClientRect();
          const scroll = {
            top: elt.scrollTop,
            left: elt.scrollLeft,
            topMax: get(elt, 'scrollTopMax'),
            leftMax: get(elt, 'scrollLeftMax'),
            height: elt.scrollHeight,
            width: elt.scrollWidth,
          };
          const { x, y, left, top, right, bottom, width, height } = bounds;
          const result: Record<string, unknown> = {
            x,
            y,
            left,
            top,
            right,
            bottom,
            width,
            height,
            bounds,
            scrollLeft: scroll.left,
            scrollTop: scroll.top,
            scrollLeftMax: scroll.leftMax,
            scrollTopMax: scroll.topMax,
            scrollWidth: scroll.width,
            scrollHeight: scroll.height,
            scroll,
          };
          ctx.result = result;
          for (const property of properties) {
            if (!(property in result)) throw new Error('No such measurement as ' + property);
            ctx.locals[property] = result[property];
          }
        }),
    };
    return node;
  };
}

// ---------------------------------------------------------------------------
// One action applied to a target: focus, blur, select, empty, reset, open, close
// ---------------------------------------------------------------------------

export interface TargetNode extends Cmd {
  type: string;
  /** Absent means `me`. */
  target?: Expr;
}

/** `<keyword> [<target>]`: evaluate the target (default `me`) and hand it to `apply`. */
function targetCommand(g: Grammar, keywords: string[], apply: (target: unknown) => unknown): void {
  for (const keyword of keywords) {
    g.commands[keyword] = (p, _keyword, start) => {
      const target = p.commandBoundary(p.cur()) ? undefined : expr(p);
      const node: TargetNode = {
        type: `${keywords[0]}Command`,
        target,
        start,
        end: p.endPos(),
        run: ctx => then1(target?.ev(ctx), value => then1(apply(value || ctx.me), () => {})),
      };
      return node;
    };
  }
}

const callMethod = (name: string) => (target: unknown) => {
  const method = get(target, name);
  if (fn(method)) Reflect.apply(method, target, []);
};

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
const isField = (e: unknown): e is Field =>
  e instanceof HTMLInputElement ||
  e instanceof HTMLTextAreaElement ||
  e instanceof HTMLSelectElement;
const isToggle = (e: Field): e is HTMLInputElement =>
  e instanceof HTMLInputElement && (e.type === 'checkbox' || e.type === 'radio');

/** Apply to a form field, or to every field of a form. Returns false for anything else. */
const eachField = (e: unknown, f: (field: Field) => void): boolean => {
  if (isField(e)) f(e);
  else if (e instanceof HTMLFormElement)
    e.querySelectorAll('input, textarea, select').forEach(i => isField(i) && f(i));
  else return false;
  return true;
};

const clearField = (field: Field) => {
  if (field instanceof HTMLSelectElement) field.selectedIndex = -1;
  else if (isToggle(field)) field.checked = false;
  else field.value = '';
};

const resetField = (field: Field) => {
  if (field instanceof HTMLSelectElement)
    for (const option of field.options) option.selected = option.defaultSelected;
  else if (isToggle(field)) field.checked = field.defaultChecked;
  else field.value = field.defaultValue;
};

/** Dialogs, `<details>`, popovers, or anything with an `open()` / `close()` method. */
const setOpen = (open: boolean) => (target: unknown) =>
  implicitLoop(target, elt => {
    if (elt instanceof HTMLDialogElement) {
      if (!open) elt.close();
      else if (!elt.open) elt.showModal();
    } else if (elt instanceof HTMLDetailsElement) elt.open = open;
    else if (elt instanceof HTMLElement && elt.hasAttribute('popover'))
      elt[open ? 'showPopover' : 'hidePopover']();
    else callMethod(open ? 'open' : 'close')(elt);
  });

export function targetCommands(g: Grammar): void {
  targetCommand(g, ['focus'], callMethod('focus'));
  targetCommand(g, ['blur'], callMethod('blur'));
  targetCommand(g, ['select'], callMethod('select'));
  targetCommand(g, ['empty', 'clear'], target => {
    if (Array.isArray(target) || target instanceof Set || target instanceof Map) {
      if (Array.isArray(target)) target.splice(0);
      else target.clear();
      rx.wroteProperty(target);
    } else implicitLoop(target, e => eachField(e, clearField) || (isEl(e) && e.replaceChildren()));
  });
  targetCommand(g, ['reset'], target =>
    implicitLoop(target, e => (e instanceof HTMLFormElement ? e.reset() : eachField(e, resetField)))
  );
}

export function openClose(g: Grammar): void {
  // `open fullscreen [<target>]` / `close fullscreen` take the fullscreen path instead.
  for (const open of [true, false]) {
    const keyword = open ? 'open' : 'close';
    g.commands[keyword] = (p, _keyword, start) => {
      const full = !!p.match('fullscreen');
      const target = p.commandBoundary(p.cur()) ? undefined : expr(p);
      const node: TargetNode = {
        type: `${keyword}Command`,
        target,
        start,
        end: p.endPos(),
        run: ctx =>
          then1(target?.ev(ctx), value => {
            if (!full) return setOpen(open)(value || ctx.me);
            if (!open) return document.exitFullscreen();
            return (isEl(value) ? value : document.documentElement).requestFullscreen();
          }),
      };
      return node;
    };
  }
}

// ---------------------------------------------------------------------------
// make, append, swap
// ---------------------------------------------------------------------------

export interface MakeNode extends Cmd {
  type: 'makeCommand';
  /** `<tag#id.class/>`, or a constructor. */
  value: Expr;
  args: Expr[];
  /** `called <name>`. */
  called?: Expr;
}

export function make(g: Grammar): void {
  g.commands.make = (p, _keyword, start) => {
    if (!p.match('a')) p.match('an');
    const value = expr(p);
    const args: Expr[] = [];
    const css = value.type === 'queryRef' ? value.css : undefined;
    if (css === undefined && p.match('from')) {
      do args.push(expr(p));
      while (p.matchOp(','));
    }
    const called = p.match('called') ? (symbol(p) ?? p.err('Expected symbol')) : undefined;
    const element = () => {
      let tag = 'div';
      const made: { id?: string; classes: string[] } = { classes: [] };
      for (const [, kind, name] of (css ?? '').matchAll(/(^|#|\.)([^#. ]+)/g)) {
        if (kind === '') tag = name.trim();
        else if (kind === '#') made.id = name.trim();
        else made.classes.push(name.trim());
      }
      const elt = document.createElement(tag);
      if (made.id !== undefined) elt.id = made.id;
      elt.classList.add(...made.classes);
      return elt;
    };
    const node: MakeNode = {
      type: 'makeCommand',
      value,
      args,
      called,
      start,
      end: p.endPos(),
      run: ctx =>
        all(
          [css === undefined ? value.ev(ctx) : undefined, ...args.map(a => a.ev(ctx))],
          ([ctor, ...values]) => {
            ctx.result =
              css === undefined ? Reflect.construct(fn(ctor) ? ctor : Object, values) : element();
            called?.put?.(ctx, undefined, ctx.result);
          }
        ),
    };
    return node;
  };
}

export interface AppendNode extends Cmd {
  type: 'appendCommand';
  value: Expr;
  /** Absent means the result (`it`). */
  target?: Expr;
}

/** `append <value> [to <target>]`: push to a list, add to a set, add content to an element, or concatenate. */
export function append(g: Grammar): void {
  g.commands.append = (p, _keyword, start) => {
    const value = expr(p);
    const target = p.match('to') ? unwrap(expr(p)) : undefined;
    const node: AppendNode = {
      type: 'appendCommand',
      value,
      target,
      start,
      end: p.endPos(),
      run: ctx =>
        all(
          [
            target ? target.ev(ctx) : resolveSymbol('result', ctx),
            value.ev(ctx),
            target?.lhs?.(ctx),
          ],
          ([current, v, lhs]) => {
            if (Array.isArray(current) || current instanceof Set) {
              if (Array.isArray(current)) current.push(v);
              else current.add(v);
              rx.wroteProperty(current);
            } else if (isEl(current)) {
              if (isEl(v)) current.insertAdjacentElement('beforeend', v);
              else current.insertAdjacentHTML('beforeend', String(v));
              host.process(current);
            } else {
              const joined = num(current || '') + num(v);
              if (!target) setSymbol('result', ctx, undefined, joined);
              else if (target.put) target.put(ctx, lhs, joined);
              else throw new Error('Unable to append a value!');
            }
          }
        ),
    };
    return node;
  };
}

export interface SwapNode extends Cmd {
  type: 'swapCommand';
  first: Expr;
  second: Expr;
}

/** `swap <a> with <b>`: exchange two values, or two elements' places in the document. */
export function swap(g: Grammar): void {
  g.commands.swap = (p, _keyword, start) => {
    const first = p.withFollow(['with'], () => assignable(p));
    p.req('with');
    const second = assignable(p);
    const node: SwapNode = {
      type: 'swapCommand',
      first,
      second,
      start,
      end: p.endPos(),
      run: ctx =>
        all(
          [first.ev(ctx), second.ev(ctx), first.lhs?.(ctx), second.lhs?.(ctx)],
          ([a, b, lhsA, lhsB]) => {
            if (isEl(a) && isEl(b)) {
              // A placeholder keeps the first position while the elements trade places.
              const placeholder = document.createComment('');
              a.replaceWith(placeholder);
              b.replaceWith(a);
              placeholder.replaceWith(b);
            } else {
              first.put?.(ctx, lhsA, b);
              second.put?.(ctx, lhsB, a);
            }
          }
        ),
    };
    return node;
  };
}
