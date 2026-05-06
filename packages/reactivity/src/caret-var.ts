/**
 * `^name` — DOM-scoped inherited variable.
 *
 * Upstream syntax:
 *   ^counter              → read from nearest ancestor that has `counter` set
 *   ^counter on #target   → read from (or near) #target
 *   set ^counter to 42    → write to owner (or lookupRoot if not yet defined)
 *
 * Parse side: register `^` as a Pratt prefix operator. The handler consumes
 * the identifier token and an optional `on <target>` clause, emitting a
 * `caretVar` AST node.
 *
 * Eval side: `caretVar` node evaluator calls `reactive.readCaret(anchor,
 * name)` which walks the DOM tree for the owner and records deps as it goes.
 */

import type { ASTNode, ExecutionContext } from './types';
import { reactive } from './signals';

export interface CaretVarNode extends ASTNode {
  type: 'caretVar';
  name: string;
  onTarget: ASTNode | null;
}

interface CaretVarRuntime {
  execute(node: ASTNode, ctx: ExecutionContext): Promise<unknown>;
}

/**
 * Pratt prefix handler for `^`. Consumes the following identifier token and
 * an optional `on <expr>` clause.
 */
export function parseCaretPrefix(token: unknown, ctx: unknown): ASTNode {
  // `ctx` is hyperfixi's PrattContext: { peek, advance, parseExpr, isStopToken, atEnd }.
  const pctx = ctx as {
    peek(): { value?: string; kind?: string } | undefined;
    advance(): { value: string; kind?: string };
    parseExpr(minBp: number): ASTNode;
  };
  const ident = pctx.advance();
  if (!ident || !ident.value) {
    throw new Error("Expected identifier after '^'");
  }
  let onTarget: ASTNode | null = null;
  const next = pctx.peek();
  if (next && next.value === 'on') {
    pctx.advance(); // consume 'on'
    // Binding power 86 — higher than standard comparisons so `^x on me` doesn't
    // over-consume into surrounding expressions.
    onTarget = pctx.parseExpr(86);
  }
  const startTok = token as { start?: number; end?: number; line?: number; column?: number };
  return {
    type: 'caretVar',
    name: ident.value,
    onTarget,
    start: startTok?.start ?? 0,
    end: startTok?.end ?? 0,
    line: startTok?.line,
    column: startTok?.column,
  } as CaretVarNode;
}

/**
 * Build a node evaluator for `caretVar` bound to a specific runtime. The
 * evaluator walks up from the resolved anchor element, tracking every element
 * visited so writes at any ancestor notify dependent effects.
 *
 * Capturing `runtime` via a factory closure (matching live/when/bind) keeps
 * the evaluator independent of any module-scope state.
 */
export function makeEvaluateCaretVar(
  runtime: CaretVarRuntime
): (node: ASTNode, ctx: unknown) => Promise<unknown> {
  return async function evaluateCaretVar(node, ctx) {
    const n = node as CaretVarNode;
    const context = ctx as ExecutionContext;
    let anchor: Element | null = (context.me as Element | null) ?? null;

    if (n.onTarget) {
      const resolved = await runtime.execute(n.onTarget, context);
      if (resolved instanceof Element) anchor = resolved;
    }

    if (!anchor) return undefined;
    return reactive.readCaret(anchor, n.name);
  };
}

/**
 * Build a node writer for `caretVar` bound to a specific runtime. Used by the
 * core `set` command via `parserExtensions.registerNodeWriter`.
 */
export function makeWriteCaretVar(
  runtime: CaretVarRuntime
): (node: ASTNode, value: unknown, ctx: unknown) => Promise<void> {
  return async function writeCaretVar(node, value, ctx) {
    const n = node as CaretVarNode;
    const context = ctx as ExecutionContext;
    const anchor: Element | null = (context.me as Element | null) ?? null;
    if (!anchor) return;

    let target: Element | undefined;
    if (n.onTarget) {
      const resolved = await runtime.execute(n.onTarget, context);
      if (resolved instanceof Element) target = resolved;
    }
    reactive.writeCaret(anchor, n.name, value, target);
  };
}
