/**
 * Collection expressions — upstream _hyperscript 0.9.90
 *
 * Infix operators that transform collections (arrays, NodeLists) and strings:
 *
 *   <collection> where <predicate>           filter by per-element predicate
 *   <collection> sorted by <keyExpr> [asc|desc|ascending|descending]
 *                                            sort by per-element key
 *   <collection> mapped to <expr>            transform each element
 *   <string>     split by <separator>        string → array
 *   <array>      joined by <separator>       array → string
 *
 * For `where`, `sorted by`, and `mapped to`, the RHS expression is evaluated
 * once per element with `it` bound to the current element. This means those
 * three operators take an **unevaluated AST** for the RHS — unlike all other
 * binary operators which pass already-evaluated values to their `.evaluate()`.
 *
 * The parser produces a custom AST node type `collectionExpression` which the
 * runtime evaluator (`evaluateCollectionExpression` in parser/runtime.ts) walks
 * directly. These helpers are exported so the runtime can dispatch by operator
 * name without duplicating the per-element iteration logic.
 */

import type { ExecutionContext, ExpressionImplementation } from '../../types/core';
import type { AnyNode } from '../../ast/legacy';

export type CollectionOperator = 'where' | 'sorted by' | 'mapped to' | 'split by' | 'joined by';

export type SortOrder = 'asc' | 'desc';

/*
 * The node these evaluators serve is `ast/nodes.CollectionExpressionNode`.
 * This module used to declare its OWN copy of it — a fifth prose description
 * of one kind, exported and imported by nothing (`parser/runtime.ts` takes the
 * union member and the four functions below, never the interface). Deleted by
 * Arc 2 step 6; the field meanings it documented live on the union member.
 */

/** Coerce a collection-like value to an array for iteration. Strings pass through for `split by`. */
export function toIterableArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === 'string') return [value];
  if (value instanceof NodeList || value instanceof HTMLCollection) {
    return Array.from(value as ArrayLike<unknown>);
  }
  if (typeof (value as any).length === 'number') {
    return Array.from(value as ArrayLike<unknown>);
  }
  return [value];
}

/**
 * Evaluator for `collection where <predicate>`.
 * `evalWithIt` is provided by the runtime — it evaluates an AST in a context
 * where `it` is bound to the given element. This keeps the collection module
 * decoupled from the runtime's context-mutation mechanics.
 */
export async function evaluateWhere(
  collection: unknown,
  predicate: AnyNode,
  evalWithIt: (node: AnyNode, it: unknown) => Promise<unknown>
): Promise<unknown[]> {
  const arr = toIterableArray(collection);
  const out: unknown[] = [];
  for (const element of arr) {
    const ok = await evalWithIt(predicate, element);
    if (ok) out.push(element);
  }
  return out;
}

/** Evaluator for `collection sorted by <keyExpr> [asc|desc]`. Default order: `asc`. */
export async function evaluateSortedBy(
  collection: unknown,
  keyExpr: AnyNode,
  order: SortOrder,
  evalWithIt: (node: AnyNode, it: unknown) => Promise<unknown>
): Promise<unknown[]> {
  const arr = [...toIterableArray(collection)];
  const keys = await Promise.all(arr.map(el => evalWithIt(keyExpr, el)));
  const indices = arr.map((_, i) => i);
  indices.sort((a, b) => {
    const ka = keys[a] as any;
    const kb = keys[b] as any;
    if (ka === kb) return 0;
    if (ka == null) return 1;
    if (kb == null) return -1;
    return ka < kb ? -1 : 1;
  });
  const sorted = indices.map(i => arr[i]);
  return order === 'desc' ? sorted.reverse() : sorted;
}

/** Evaluator for `collection mapped to <expr>`. */
export async function evaluateMappedTo(
  collection: unknown,
  expr: AnyNode,
  evalWithIt: (node: AnyNode, it: unknown) => Promise<unknown>
): Promise<unknown[]> {
  const arr = toIterableArray(collection);
  return Promise.all(arr.map(el => evalWithIt(expr, el)));
}

/** Evaluator for `string split by <separator>`. */
export function evaluateSplitBy(value: unknown, separator: unknown): string[] {
  if (value == null) return [];
  const str = String(value);
  const sep = separator == null ? '' : String(separator);
  return str.split(sep);
}

/** Evaluator for `array joined by <separator>`. */
export function evaluateJoinedBy(value: unknown, separator: unknown): string {
  const arr = toIterableArray(value);
  const sep = separator == null ? '' : String(separator);
  return arr.map(v => (v == null ? '' : String(v))).join(sep);
}

// ---------------------------------------------------------------------------
// Expression registry entries
// ---------------------------------------------------------------------------
// These exist mainly for introspection/LSP surface consistency with other
// expressions. The actual runtime dispatch happens via the `collectionExpression`
// AST node, not by looking up these `.evaluate()` methods — the per-element ones
// can't be invoked with plain values anyway because they need an AST on the RHS.
