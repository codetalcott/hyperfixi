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
 * Auto-detects the DOM property by element type:
 *   - INPUT[type=checkbox]              → `checked`
 *   - INPUT[type=number|range]          → `valueAsNumber`
 *   - INPUT|TEXTAREA|SELECT             → `value`
 *   - contenteditable="true"            → `textContent`
 *   - Custom elements with own `value`  → `value`
 *
 * Users can override by binding directly to a property expression, e.g.
 * `bind $state to #el's value`.
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

    // Resolve DOM element synchronously by executing the expression.
    const domValue = await runtime.execute(domSide.exprNode, context);
    if (!(domValue instanceof Element)) {
      throw new Error('bind: right-hand side did not resolve to an element');
    }
    const el = domValue;
    const prop = detectProperty(el);
    if (!prop) {
      throw new Error(
        `bind: could not auto-detect property for <${el.tagName.toLowerCase()}> — use explicit \`<expr>'s <property>\` form`
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
      return context.locals?.get(varSide!.name);
    };
    const writeVar = (value: unknown): void => {
      if (varSide!.isGlobal) {
        context.globals?.set(varSide!.name, value);
        // Notify the reactive graph so the var→DOM effect sees the change.
        reactive.notifyGlobal(varSide!.name);
      } else {
        context.locals?.set(varSide!.name, value);
        // Note: locals have no core-side write hook today, so a programmatic
        // `set :foo to ...` elsewhere will not trigger reactivity. Within bind
        // itself we wire DOM→var→DOM via element-scoped notify so the bind's
        // own roundtrip is reactive.
        reactive.notifyElement(owner, varSide!.name);
      }
    };

    // Effect 1: DOM → var (fires on user input)
    const stopDomToVar = reactive.createEffect(
      () => {
        reactive.trackDomProperty(el, prop);
        return readDom();
      },
      newValue => {
        writeVar(newValue);
      },
      owner
    );

    // Effect 2: var → DOM (fires on programmatic var writes for globals;
    // for locals, only the bind's own DOM→var path notifies, since core has
    // no localWriteHook).
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

    context.registerCleanup?.(owner, stopDomToVar, 'bind-dom-to-var');
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
 *   - `:foo` → `{ type: 'identifier', name: 'foo', scope: 'local' }`
 *   - `::foo` → `{ type: 'identifier', name: 'foo', scope: 'global' }`
 *
 * We accept all three. The legacy `$`-prefix sniff stays as a fallback because
 * `parseExpression` doesn't always set `scope`.
 */
function isVarRef(node: ASTNode): boolean {
  if (!node) return false;
  if (node.type !== 'identifier') return false;
  const scope = node.scope as string | undefined;
  if (scope === 'local' || scope === 'global') return true;
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
  } else if (scope === 'local') {
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
