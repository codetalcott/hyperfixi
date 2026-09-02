/**
 * Duck-typed reads over `ast-utils`' wide node type
 *
 * `ast-utils` is deliberately duck-typed, and Arc 2 step 4 measured why it has
 * to stay that way rather than adopt `ast/nodes.ts`'s union outright:
 *
 *   - it is PUBLIC — `@hyperfixi/core/ast-utils` is a package export, and
 *     `mcp-server`, `language-server` and `developer-tools` all `await import`
 *     it and feed it whatever AST they hold;
 *   - its modules discriminate on kinds NO core parser emits (`conditional`,
 *     `logicalExpression`, `returnStatement`, `program`, `function`) and read
 *     fields no union member declares (`variable`, `features`, `then`, `else`).
 *     The 348 tests never parse real code; they hand-build those shapes.
 *
 * So the union cannot type most of what is read here. What CAN change is what a
 * read is claimed to return. The index signature is `unknown` now (it was
 * `any`, which made every `(node as any).foo` in the package redundant and let
 * the type-escape ratchet be moved 157 → 81 while changing nothing — #1048).
 * With `unknown` underneath, a consumer has to look before it leaps, and these
 * three helpers are the whole vocabulary for looking, so it is written once.
 *
 * `field` carries this package's ONE `as Record<string, unknown>`. It is the
 * typed spelling of the arbitrary `x?.key` read the untyped code made
 * everywhere, and a single counted hatch in one helper is the honest price of
 * a duck-typed public contract — better than the same read hidden behind an
 * index signature the ratchet cannot see.
 */

import type { ASTNode } from './types.js';

/** Anything shaped like a node: a non-null object carrying a string `type`. */
export function isASTNode(value: unknown): value is ASTNode {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * Read `key` off `value` if it is an object, `undefined` otherwise — the
 * `x?.key` of the old code, returning `unknown` instead of `any`.
 */
export function field(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object') return undefined;
  return (value as Record<string, unknown>)[key];
}

/**
 * `value` as a node list if it is an array, else `undefined`.
 *
 * Elements are trusted as nodes without inspection, because that is exactly
 * what the untyped code did (`(node as any).commands.map(cmd => cmd.name)`) and
 * this arc is types-only: filtering non-nodes out would change what the
 * transformer's `batched.length !== commands.length` comparisons see.
 */
export function nodeList(value: unknown): ASTNode[] | undefined {
  return Array.isArray(value) ? (value as ASTNode[]) : undefined;
}
