/**
 * Syntax upstream `_hyperscript` does not have. Everything else in this engine
 * follows upstream's source; these two forms come from `packages/core`, are used
 * by the examples this repository ships, and were kept by decision (2026-10-01).
 * Each is an optional module, and neither changes how an upstream script reads:
 *
 * - `construct`: `new Date()`, `new Intl.NumberFormat('en')`. Upstream has the
 *   `make a Date` command and no expression; there, `set t to new Date().getDay()`
 *   parses (`new` is a variable, the call a second command) and fails when it runs.
 * - `toggleElement`: `toggle #dialog`, `toggle #dialog modal`, `toggle #details`.
 *   Upstream rejects `toggle <expression>` without `between`.
 */
import type { Cmd, Expr } from './ast';
import { expr } from './expressions';
import type { Grammar } from './parser';
import { implicitLoop, nullCheck, resolveSymbol } from './runtime';
import { all, fn, get, then1 } from './util';

export interface ConstructNode extends Expr {
  type: 'newExpression';
  /** `Intl.NumberFormat` is `['Intl', 'NumberFormat']`. */
  path: string[];
  args: Expr[];
}

/** `new <Constructor>(<args>)`: construct an object, as JavaScript's `new` does. */
export function construct(g: Grammar): void {
  g.unaries.push(p => {
    // `new` stays an ordinary name (`set new to 1`) unless a constructor call follows it.
    let n = 1;
    while (p.tok(n).type === 'IDENTIFIER' && p.tok(n + 1).op && p.tok(n + 1).value === '.') n += 2;
    const open = p.tok(n + 1);
    if (!p.peek('new') || p.tok(n).type !== 'IDENTIFIER' || !open.op || open.value !== '(') return;

    const start = p.pos();
    p.consume();
    const path = [p.consume().value];
    while (p.matchOp('.')) path.push(p.consume().value);
    p.reqOp('(');
    const args: Expr[] = [];
    if (!p.matchOp(')')) {
      do args.push(expr(p));
      while (p.matchOp(','));
      p.reqOp(')');
    }
    const node: ConstructNode = {
      type: 'newExpression',
      path,
      args,
      start,
      end: p.endPos(),
      ev: ctx =>
        all(
          args.map(a => a.ev(ctx)),
          values => {
            const constructor = path
              .slice(1)
              .reduce((owner, name) => get(owner, name), resolveSymbol(path[0], ctx));
            if (!fn(constructor)) throw new Error(`'${path.join('.')}' is not a constructor`);
            return Reflect.construct(constructor, values);
          }
        ),
    };
    return node;
  });
}

export interface ToggleElementNode extends Cmd {
  type: 'toggleElementCommand';
  target: Expr;
  /** `toggle #d modal` / `toggle #d as modal`: open with `showModal()`. */
  modal: boolean;
}

/**
 * Open what is closed and close what is open: a `<dialog>`, a `<details>` (or its
 * `<summary>`), a popover, a `<select>`'s picker.
 */
function flip(elt: unknown, modal: boolean): void {
  const target = elt instanceof HTMLElement && elt.tagName === 'SUMMARY' ? elt.parentElement : elt;
  if (target instanceof HTMLDialogElement) {
    if (target.open) target.close();
    else if (modal) target.showModal();
    else target.show();
  } else if (target instanceof HTMLDetailsElement) target.open = !target.open;
  else if (target instanceof HTMLSelectElement) {
    if (document.activeElement === target) return target.blur();
    target.focus();
    try {
      target.showPicker();
    } catch {
      // The picker opens only on a user's gesture; elsewhere the focus is what is left.
    }
  } else if (target instanceof HTMLElement && target.hasAttribute('popover'))
    target.togglePopover();
  else throw new Error('toggle needs a dialog, details, select or popover element');
}

/** `toggle <element> [modal | as modal]`: the form `toggle` takes when no `between` follows. */
export function toggleElement(g: Grammar): void {
  g.toggleElement = (p, target, start) => {
    const modal = p.match('as') ? !!p.req('modal') : !!p.match('modal');
    const text = p.text(target);
    const node: ToggleElementNode = {
      type: 'toggleElementCommand',
      target,
      modal,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(target.ev(ctx), value => {
          nullCheck(value, text);
          implicitLoop(value, elt => flip(elt, modal));
        }),
    };
    return node;
  };
}
