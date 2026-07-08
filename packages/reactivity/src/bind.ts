/**
 * `bind X [to|and|with] Y` — two-way binding.
 *
 * Creates two effects (registration order is load-bearing — both initialize
 * via `queueMicrotask` and run in registration order):
 *   1. DOM → var: read DOM, write var. DOM "wins" on init.
 *   2. var → DOM: read var, write DOM. Fires on programmatic var writes
 *      after init. On its own initial run, var === DOM (Effect 1 just synced
 *      them), so the write is a no-op.
 *
 * Two binding forms:
 *
 *   1. Auto-detected (DOM side is a bare element expression):
 *
 *        bind $name to #input          -- detects `value`
 *        bind $checked to me           -- detects `checked` on a checkbox
 *
 *      Auto-detected property by element type:
 *        - INPUT[type=checkbox|radio]      → `checked`
 *        - INPUT[type=number|range]        → `valueAsNumber`
 *        - INPUT|TEXTAREA|SELECT           → `value`
 *        - contenteditable="true"          → `textContent`
 *        - Custom elements with own `value` → `value`
 *
 *   2. Explicit property (DOM side is a member or possessive expression):
 *
 *        bind $color to #picker's value    -- possessive (preferred — reads in any language)
 *        bind $color to #picker.value      -- dot (JS-style alternative)
 *        bind $text to #div's textContent  -- non-form properties: var→DOM only
 *
 *      For form-like elements, both directions work. For non-form elements
 *      (e.g., binding a div's `textContent`), only var→DOM fires — there are
 *      no input/change events to drive DOM→var, so user mutations of the
 *      property via devtools won't propagate back.
 */

import type { ASTNode, ExecutionContext, FeatureParserCtx } from './types';
import { reactive } from './signals';

export interface BindFeatureNode extends ASTNode {
  type: 'bindFeature';
  left: ASTNode;
  right: ASTNode;
}

export function parseBindFeature(ctx: unknown, token: unknown): ASTNode {
  const pctx = ctx as FeatureParserCtx;
  const left = pctx.parseExpression();
  // Accept any of `to` / `and` / `with` as the separator.
  if (!(pctx.match('to') || pctx.match('and') || pctx.match('with'))) {
    throw new Error("bind requires 'to', 'and', or 'with' between the two sides");
  }
  const right = pctx.parseExpression();
  // Optional `end` terminator (matches upstream which allows both forms).
  if (pctx.check('end')) pctx.match('end');
  const tok = token as { start?: number; end?: number; line?: number; column?: number };
  return {
    type: 'bindFeature',
    left,
    right,
    start: tok?.start ?? 0,
    end: pctx.getPosition().end,
    line: tok?.line,
    column: tok?.column,
  } as BindFeatureNode;
}

/**
 * Auto-detect the DOM property to bind by element type. Returns null if the
 * target isn't a recognized form/editable element.
 */
function detectProperty(el: Element): string | null {
  const tag = el.tagName;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    if (type === 'checkbox' || type === 'radio') return 'checked';
    if (type === 'number' || type === 'range') return 'valueAsNumber';
    return 'value';
  }
  if (tag === 'TEXTAREA' || tag === 'SELECT') return 'value';
  const ce = (el as HTMLElement).contentEditable;
  if (ce === 'true') return 'textContent';
  // Custom elements with own `value` prop.
  if ('value' in el) return 'value';
  return null;
}

/**
 * If `node` is a `memberExpression` or `possessiveExpression` with a static
 * identifier property (`#el.value` or `#el's value`), return the inner element
 * expression and the property name. Returns null for anything else.
 *
 * Computed member access (`#el[prop]`) is intentionally rejected — we'd have to
 * evaluate the index dynamically and the binding direction would be unclear.
 * Chained property access (`#el.dataset.value`) is also not unpacked — we only
 * peel one level. Multi-level support is a future arc.
 */
function unwrapExplicitProperty(node: ASTNode): { element: ASTNode; propertyName: string } | null {
  if (!node || (node.type !== 'memberExpression' && node.type !== 'possessiveExpression')) {
    return null;
  }
  if (node.type === 'memberExpression' && node.computed === true) return null;
  const property = node.property as ASTNode | undefined;
  const object = node.object as ASTNode | undefined;
  if (!property || !object || property.type !== 'identifier') return null;
  const name = (property.name as string) ?? '';
  if (!name) return null;
  return { element: object, propertyName: name };
}

/**
 * Detect a chained property access on the bind RHS — e.g.
 * `me.style.backgroundColor` or `#el's dataset's value`.
 *
 * After `unwrapExplicitProperty` peels the outermost member, the returned
 * `element` is the object of that member. If that object is itself a
 * member/possessive expression, we have a multi-level chain that v1 of
 * bind doesn't support. Used only for the error path; the parsed AST is
 * left intact.
 */
function isChainedMember(node: ASTNode | undefined): boolean {
  if (!node) return false;
  return node.type === 'memberExpression' || node.type === 'possessiveExpression';
}

/**
 * Whether the input/change listener installed by `trackDomProperty` would
 * actually fire for this element. Used to decide whether to wire up the
 * DOM→var direction when an explicit property is given.
 */
function isFormLikeElement(el: Element): boolean {
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if ((el as HTMLElement).contentEditable === 'true') return true;
  return false;
}

/**
 * Whether debug logging is enabled. Mirrors signals.ts — keeps a single
 * convention for the package.
 */
function debugEnabled(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('hyperfixi:debug') !== null;
  } catch {
    return false;
  }
}

/**
 * Create the bind evaluator. Because `bind` has unusual parse shape (AST
 * nodes for left/right that may be identifiers, `$name` references, or DOM
 * element lookups), we rely on the runtime to evaluate them.
 */
export function makeEvaluateBindFeature(runtime: {
  execute(node: ASTNode, ctx: ExecutionContext): Promise<unknown>;
}): (node: ASTNode, ctx: unknown) => unknown | Promise<unknown> {
  return async function evaluateBindFeature(node, ctx) {
    const context = ctx as ExecutionContext;
    const owner = (context.me as Element) ?? document.body;
    const n = node as BindFeatureNode;

    // Dynamically import the element-scope accessor from core. A static import
    // would pull core's full index into this module's load graph — and core's
    // index eagerly evaluates `morphlex` (which touches `Element.prototype` at
    // module scope), throwing `Element is not defined` when @hyperfixi/reactivity
    // is imported in bare Node/SSR. This evaluator only runs in a browser (it
    // uses `document.body` above), so deferring the import keeps the package
    // importable in Node while `:name` binds still address the core store.
    const { getElementScopeMap } = await import('@hyperfixi/core');

    // Resolve sides. One is a var reference (read/write a symbol), the other
    // a DOM target (read/write a property). Determine direction from node shape.
    const leftIsVar = isVarRef(n.left);
    const rightIsVar = isVarRef(n.right);

    // We need a DOM-side descriptor (element + property) and a var-side name.
    let varSide: { name: string; isGlobal: boolean } | null = null;
    let domSide: { exprNode: ASTNode } | null = null;

    if (leftIsVar && !rightIsVar) {
      varSide = varRefInfo(n.left);
      domSide = { exprNode: n.right };
    } else if (rightIsVar && !leftIsVar) {
      varSide = varRefInfo(n.right);
      domSide = { exprNode: n.left };
    } else if (leftIsVar && rightIsVar) {
      // var-to-var binding not supported in v1 (no DOM side).
      throw new Error('bind: cannot bind two symbols together (need a DOM side)');
    } else {
      throw new Error('bind: could not identify a symbol side');
    }

    // Unwrap explicit property syntax: `#el.value` or `#el's value` becomes
    // (element-expression, propertyName). Otherwise, evaluate the whole side
    // and rely on auto-detection.
    const explicit = unwrapExplicitProperty(domSide.exprNode);
    // Multi-level property access (`#el.style.background`, `me's dataset's id`)
    // is not supported in v1. Surface that diagnosis up front; otherwise the
    // user gets the generic "did not resolve to an element" message and no
    // hint that the chain is the problem.
    if (explicit && isChainedMember(explicit.element)) {
      throw new Error(
        'bind: multi-level property access (e.g., `#el.a.b`) is not supported in v1 — restructure to a single property write or pass the element directly for auto-detection (e.g., `bind $x to #el`).'
      );
    }
    const elementExpr = explicit ? explicit.element : domSide.exprNode;
    const domValue = await runtime.execute(elementExpr, context);
    if (!(domValue instanceof Element)) {
      const valueType =
        domValue === null ? 'null' : domValue === undefined ? 'undefined' : typeof domValue;
      const snippet =
        domValue !== null && domValue !== undefined ? ` "${String(domValue).slice(0, 40)}"` : '';
      const suggestion = explicit
        ? ''
        : " If you meant to write to a property, use the explicit form: `<selector>'s <property>`.";
      throw new Error(
        `bind: right-hand side did not resolve to an element (got ${valueType}${snippet}).${suggestion}`
      );
    }
    const el = domValue;
    // Explicit property bypasses auto-detect; the user takes responsibility for
    // picking something readable from the element. For DOM→var to work without
    // explicit property, fall back to auto-detect.
    const prop = explicit ? explicit.propertyName : detectProperty(el);
    if (!prop) {
      throw new Error(
        `bind: could not auto-detect property for <${el.tagName.toLowerCase()}> — use explicit \`<expr>'s <property>\` form`
      );
    }
    // For explicit-property mode on non-form elements, DOM→var can't sync via
    // input/change events. Skip the listener install; only var→DOM runs.
    const installDomToVar = !explicit || isFormLikeElement(el);
    if (explicit && !installDomToVar && debugEnabled() && typeof console !== 'undefined') {
      console.warn(
        `[@hyperfixi/reactivity] bind: DOM→var skipped for <${el.tagName.toLowerCase()}>.${prop} — no input/change event source.`
      );
    }

    // Initial sync: DOM → var.
    const readDom = (): unknown => {
      if (prop === 'valueAsNumber') return (el as HTMLInputElement).valueAsNumber;
      if (prop === 'checked') return (el as HTMLInputElement).checked;
      if (prop === 'textContent') return el.textContent ?? '';
      return (el as any)[prop];
    };
    const writeDom = (value: unknown): void => {
      if (prop === 'valueAsNumber') {
        const n = Number(value);
        (el as HTMLInputElement).valueAsNumber = Number.isNaN(n) ? (null as never) : n;
      } else if (prop === 'checked') {
        (el as HTMLInputElement).checked = Boolean(value);
      } else if (prop === 'textContent') {
        el.textContent = value == null ? '' : String(value);
      } else {
        (el as any)[prop] = value;
      }
    };
    const readVar = (): unknown => {
      if (varSide!.isGlobal) return context.globals?.get(varSide!.name);
      // `:name` is element-scoped — read from the owner element's store, the same
      // place the core `set :name` writes. (Direct Map access, not getElementVar,
      // so we don't double-fire the read hook; bind tracks via trackElement.)
      return getElementScopeMap(owner).get(varSide!.name);
    };
    const writeVar = (value: unknown): void => {
      if (varSide!.isGlobal) {
        context.globals?.set(varSide!.name, value);
        // Bypass the global-write hook (we're touching the Map directly), so
        // notify the reactive graph manually for the var→DOM effect.
        reactive.notifyGlobal(varSide!.name);
      } else {
        // Element-scoped `:name`: write to the owner element's store (same place
        // core's `set :name` writes), then notify manually — the direct Map write
        // skips the localWriteHook.
        getElementScopeMap(owner).set(varSide!.name, value);
        reactive.notifyElement(owner, varSide!.name);
      }
    };

    // Effect 1: DOM → var (fires on user input). Skipped for explicit-property
    // bindings on non-form elements — no input/change events would drive it.
    let stopDomToVar: (() => void) | null = null;
    if (installDomToVar) {
      stopDomToVar = reactive.createEffect(
        () => {
          reactive.trackDomProperty(el, prop);
          return readDom();
        },
        newValue => {
          writeVar(newValue);
        },
        owner
      );
    }

    // Effect 2: var → DOM (fires on programmatic var writes — for globals
    // via the core's globalWriteHook, for locals via the localWriteHook the
    // reactivity plugin registers).
    const stopVarToDom = reactive.createEffect(
      () => {
        if (varSide!.isGlobal) reactive.trackGlobal(varSide!.name);
        else reactive.trackElement(owner, varSide!.name);
        return readVar();
      },
      newValue => {
        if (newValue === undefined) return;
        writeDom(newValue);
      },
      owner
    );

    if (stopDomToVar) context.registerCleanup?.(owner, stopDomToVar, 'bind-dom-to-var');
    context.registerCleanup?.(owner, stopVarToDom, 'bind-var-to-dom');
    return undefined;
  };
}

/**
 * Is this AST node a var reference we can bind to?
 *
 * The hyperfixi parser emits `identifier` nodes for both globals and locals,
 * but with different shapes:
 *   - `$foo` → `{ type: 'identifier', name: '$foo' }` (no scope field)
 *   - `:foo` → `{ type: 'identifier', name: 'foo', scope: 'element' }` (element-scoped)
 *   - `::foo` → `{ type: 'identifier', name: 'foo', scope: 'global' }`
 *
 * We accept all of them. The legacy `$`-prefix sniff stays as a fallback because
 * `parseExpression` doesn't always set `scope`.
 */
function isVarRef(node: ASTNode): boolean {
  if (!node) return false;
  if (node.type !== 'identifier') return false;
  const scope = node.scope as string | undefined;
  if (scope === 'local' || scope === 'element' || scope === 'global') return true;
  const name = (node.name as string) ?? '';
  return name.startsWith('$') || name.startsWith(':');
}

function varRefInfo(node: ASTNode): { name: string; isGlobal: boolean } {
  const rawName = (node.name as string) ?? '';
  const scope = node.scope as string | undefined;
  // Prefer the parser-emitted scope marker. Fall back to prefix sniffing for
  // shapes where scope isn't set (e.g. `$foo` arriving as bare identifier
  // with name '$foo').
  let isGlobal: boolean;
  let name: string;
  if (scope === 'global') {
    isGlobal = true;
    name = rawName;
  } else if (scope === 'local' || scope === 'element') {
    isGlobal = false;
    name = rawName;
  } else if (rawName.startsWith('$')) {
    isGlobal = true;
    name = rawName.slice(1);
  } else if (rawName.startsWith(':')) {
    isGlobal = false;
    name = rawName.slice(1);
  } else {
    isGlobal = false;
    name = rawName;
  }
  if (!name) {
    throw new Error('bind: variable reference has empty name');
  }
  return { name, isGlobal };
}
