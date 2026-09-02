/**
 * Type predicates over the AST union
 *
 * Arc 2 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Step 5 replaces the
 * `(arg as Record<string, unknown>).name === 'x'` idiom scattered through
 * `commands/` with narrowing guards; this is where they live.
 *
 * ## Deliberately small
 *
 * The generic {@link isNodeOfKind}, thin kind guards, and the two property
 * guards moved here from `commands/helpers/property-target.ts` (which
 * re-exports them, so its callers did not churn). Guards are added as consumers
 * adopt them, not in advance — a guard nothing calls is the same
 * dead-scaffolding shape Arc 6a has been deleting.
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
  PropertyOfExpressionNode,
  PropertyAccessNode,
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

/**
 * Narrow to one kind, or throw.
 *
 * The crossing test code needs: `parse()` returns `ParseResult.node` as the
 * legacy wide `ASTNode`, and a test that wants to read a union member's fields
 * used to write `result.node as BehaviorNode` — an assertion that says nothing
 * and checks nothing. Since Arc 2 step 6 the two types no longer overlap, so
 * that cast does not even compile; this replaces it with the check the test
 * meant, and returns the narrowed node.
 *
 * The thrown message names both kinds, so a parser change that alters what a
 * source produces reports the actual kind instead of failing later on an
 * undefined field read.
 */
export function assertNodeOfKind<K extends SyntaxKind>(
  value: unknown,
  kind: K
): Extract<SyntaxNode, { type: K }> {
  if (!isNodeOfKind(value, kind)) {
    const actual = isNode(value) ? value.type : typeof value;
    throw new Error(`Expected an AST node of kind '${kind}', got '${actual}'`);
  }
  return value;
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

/**
 * `the X of Y` (core parser).
 *
 * More than the discriminant on purpose: consumers dereference `property`, so
 * the guard verifies it is a node. The check is EXACTLY what
 * `property-target.ts` shipped — its resolvers additionally assume the property
 * is an identifier carrying `name`, and strengthening the guard to verify that
 * would change which nodes route to them, which a types arc must not do.
 */
export function isPropertyOfExpressionNode(value: unknown): value is PropertyOfExpressionNode {
  if (!isNodeOfKind(value, 'propertyOfExpression')) return false;
  const property: unknown = (value as { property?: unknown }).property;
  return typeof property === 'object' && property !== null;
}

/**
 * `#element's X` (semantic parser) or `obj.prop` (expression parser).
 *
 * Accepts BOTH `property` spellings on purpose: the semantic parser emitted a
 * bare string and the expression parser a `{ name }` node, and a guard that
 * took only one silently rejected half the real inputs. Preserved verbatim
 * from `property-target.ts`, where that tolerance was established.
 */
export function isPropertyAccessNode(value: unknown): value is PropertyAccessNode {
  if (!isNodeOfKind(value, 'propertyAccess')) return false;
  const property: unknown = (value as { property?: unknown }).property;
  if (typeof property === 'string') return true;
  return (
    typeof property === 'object' &&
    property !== null &&
    typeof (property as { name?: unknown }).name === 'string'
  );
}
