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

import type { ASTNode } from './types';
import { reactive } from './signals';

export interface CaretVarNode extends ASTNode {
  type: 'caretVar';
  name: string;
  onTarget: ASTNode | null;
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
 * Node evaluator for `caretVar`. Walks up from the resolved anchor element,
 * tracking every element visited so that writes at any ancestor notify
 * dependent effects.
 */
export async function evaluateCaretVar(node: ASTNode, ctx: unknown): Promise<unknown> {
  const n = node as CaretVarNode;
  const context = ctx as { me?: Element | null };
  let anchor: Element | null = context.me ?? null;

  if (n.onTarget) {
    // Re-entering the evaluator via onTarget: we don't have direct access to
    // the core's evaluateExpression here. The onTarget is typically a simple
    // `me` reference or identifier; if it's a literal element, use it. The
    // full dispatch is deferred to the plugin install, which injects a
    // resolver — see index.ts.
    const resolver = (globalThis as any).__hyperfixi_reactivity_eval_expr;
    if (resolver) {
      const resolved = await resolver(n.onTarget, ctx);
      if (resolved instanceof Element) anchor = resolved;
    }
  }

  if (!anchor) return undefined;
  return reactive.readCaret(anchor, n.name);
}
