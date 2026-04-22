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
import type { ASTNode } from '../../types/base-types';

export type CollectionOperator = 'where' | 'sorted by' | 'mapped to' | 'split by' | 'joined by';

export type SortOrder = 'asc' | 'desc';

/**
 * AST node emitted by the Pratt parser for collection operators.
 * Field meaning depends on `operator`:
 *   where/mapped to : `right` is a per-element predicate AST, evaluated with `it` bound
 *   sorted by       : `right` is a per-element key AST; `order` selects ascending/descending
 *   split by/joined by : `right` is a separator value (evaluated once)
 */
export interface CollectionExpressionNode {
  type: 'collectionExpression';
  operator: CollectionOperator;
  collection: ASTNode;
  right: ASTNode;
  order?: SortOrder;
  start?: number;
  end?: number;
  line?: number;
  column?: number;
}

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
  predicate: ASTNode,
  evalWithIt: (node: ASTNode, it: unknown) => Promise<unknown>
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
  keyExpr: ASTNode,
  order: SortOrder,
  evalWithIt: (node: ASTNode, it: unknown) => Promise<unknown>
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
  expr: ASTNode,
  evalWithIt: (node: ASTNode, it: unknown) => Promise<unknown>
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

export const whereExpression: ExpressionImplementation = {
  name: 'where',
  category: 'Special',
  evaluatesTo: 'Array',
  operators: ['where'],
  async evaluate(_context: ExecutionContext, _collection: unknown, _predicate: unknown) {
    throw new Error(
      '`where` is a collection expression; it is dispatched via the `collectionExpression` AST node, not evaluate()'
    );
  },
  validate() {
    return null;
  },
};

export const sortedByExpression: ExpressionImplementation = {
  name: 'sortedBy',
  category: 'Special',
  evaluatesTo: 'Array',
  operators: ['sorted by'],
  async evaluate(_context: ExecutionContext, _collection: unknown, _keyExpr: unknown) {
    throw new Error(
      '`sorted by` is a collection expression; dispatched via the `collectionExpression` AST node'
    );
  },
  validate() {
    return null;
  },
};

export const mappedToExpression: ExpressionImplementation = {
  name: 'mappedTo',
  category: 'Special',
  evaluatesTo: 'Array',
  operators: ['mapped to'],
  async evaluate(_context: ExecutionContext, _collection: unknown, _expr: unknown) {
    throw new Error(
      '`mapped to` is a collection expression; dispatched via the `collectionExpression` AST node'
    );
  },
  validate() {
    return null;
  },
};

export const splitByExpression: ExpressionImplementation = {
  name: 'splitBy',
  category: 'Special',
  evaluatesTo: 'Array',
  operators: ['split by'],
  async evaluate(_context: ExecutionContext, str: unknown, separator: unknown) {
    return evaluateSplitBy(str, separator);
  },
  validate() {
    return null;
  },
};

export const joinedByExpression: ExpressionImplementation = {
  name: 'joinedBy',
  category: 'Special',
  evaluatesTo: 'String',
  operators: ['joined by'],
  async evaluate(_context: ExecutionContext, arr: unknown, separator: unknown) {
    return evaluateJoinedBy(arr, separator);
  },
  validate() {
    return null;
  },
};

export const collectionExpressions = {
  where: whereExpression,
  sortedBy: sortedByExpression,
  mappedTo: mappedToExpression,
  splitBy: splitByExpression,
  joinedBy: joinedByExpression,
} as const;

export type CollectionExpressionName = keyof typeof collectionExpressions;
