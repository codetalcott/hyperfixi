/**
 * Type predicates over the AST union
 *
 * Arc 2 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Step 5 replaces the
 * `(arg as Record<string, unknown>).name === 'x'` idiom scattered through
 * `commands/` with narrowing guards; this is where they live.
 *
 * ## Deliberately small
 *
 * The generic {@link isNodeOfKind} plus four thin kind guards. Guards are added
 * as consumers adopt them, not in advance — a guard nothing calls is the same
 * dead-scaffolding shape Arc 6a has been deleting.
 *
 * `commands/helpers/property-target.ts`'s `isPropertyOfExpressionNode` /
 * `isPropertyAccessNode` were the obvious first move and are deliberately NOT
 * here yet. They narrow to that file's OWN local node interfaces — a fourth
 * definition set, narrower than this union (`property` typed
 * `{type:'identifier'; name}` and `string` respectively, where the parser emits
 * a general expression and both spellings). Moving them means reconciling
 * those, which is adoption work (Arc 2 step 5), not union work. This arc's
 * step 2 stays purely additive.
 *
 * ## Naming
 *
 * `isXxxNode`, never bare `isXxx`. `parser/token-predicates.ts` already exports
 * `isIdentifier` / `isSelector` / `isLiteral` / `isString` operating on
 * **tokens**, and a file importing both would otherwise get two same-named
 * predicates that answer different questions about different things. The
 * `Node` suffix is the disambiguator, and it matches what
 * `property-target.ts` had already settled on.
 */

import type {
  SyntaxNode,
  SyntaxKind,
  IdentifierNode,
  LiteralNode,
  SelectorNode,
  CommandNode,
} from './nodes';

/** Anything shaped like an AST node: an object carrying a string `type`. */
export function isNode(value: unknown): value is SyntaxNode {
  return (
    !!value && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * Narrow to one kind by its discriminant.
 *
 * The generic form exists because most call sites want exactly this and
 * writing 30 one-line predicates for it would be noise. Reach for a named
 * guard below only when the check is more than the discriminant — the two
 * property guards are named precisely because they also validate a field's
 * shape.
 */
export function isNodeOfKind<K extends SyntaxKind>(
  value: unknown,
  kind: K
): value is Extract<SyntaxNode, { type: K }> {
  return isNode(value) && value.type === kind;
}

export function isIdentifierNode(value: unknown): value is IdentifierNode {
  return isNodeOfKind(value, 'identifier');
}

export function isLiteralNode(value: unknown): value is LiteralNode {
  return isNodeOfKind(value, 'literal');
}

export function isSelectorNode(value: unknown): value is SelectorNode {
  return isNodeOfKind(value, 'selector');
}

export function isCommandNode(value: unknown): value is CommandNode {
  return isNodeOfKind(value, 'command');
}
