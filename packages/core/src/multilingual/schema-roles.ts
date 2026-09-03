/**
 * Schema-driven role inference for the core→interchange converter.
 *
 * `fromCoreAST` (the engine's structural converter) knows how to turn the core
 * parser's positional args and modifier bag into an interchange node, but it
 * cannot name the SEMANTIC ROLES those args fill — that needs each command's
 * `CommandSchema`, which lives in the multilingual front-end.
 *
 * So the engine takes the inferrer by injection (`fromCoreAST(node, {
 * inferRoles })`) and this module supplies the stock one. It lives here because
 * `src/multilingual/` is the one core module allowed to import the front-end —
 * see Arc 1 of `docs-internal/ENGINE_MIGRATION_PLAN.md`.
 *
 * **This is not a marginal fallback.** Measured over the engine corpus's 214
 * parsing sources: 43 command names receive roles, and 41 of them get those
 * roles from here — only `set` and `go` have explicit cases in the engine. A
 * consumer that converts without passing this gets roles for two commands.
 */

import { getSchema } from '@lokascript/semantic';
import { inferRolesFromSchema, type ValueAdapter } from '@lokascript/intent';
import type { InterchangeNode } from '../ast-utils/interchange/types';
import type { RoleInferrer } from '../ast-utils/interchange/from-core';

/**
 * Adapter for `inferRolesFromSchema` operating on InterchangeNode values.
 * Identifier args carry the keyword in `name` (or `value` as a fallback for
 * contextReference-converted nodes). String modifier values are wrapped as
 * literal nodes; object modifier values pass through unchanged.
 */
const INTERCHANGE_ADAPTER: ValueAdapter<InterchangeNode, InterchangeNode> = {
  getIdentifierName(node: InterchangeNode): string | undefined {
    if (node.type !== 'identifier') return undefined;
    const ident = node as { name?: unknown; value?: unknown };
    if (typeof ident.name === 'string' && ident.name !== '') return ident.name;
    if (typeof ident.value === 'string') return ident.value;
    return undefined;
  },
  convertValue(node: InterchangeNode): InterchangeNode {
    return node;
  },
  createLiteralValue(text: string): InterchangeNode {
    return { type: 'literal', value: text };
  },
};

/**
 * The stock `RoleInferrer`: consults the command's `CommandSchema` and binds
 * the converter's positional args, modifiers and target to named roles.
 *
 * Returns null when the command has no schema, or when the schema binds
 * nothing — the same "no roles" signal the converter uses.
 */
export const schemaRoleInferrer: RoleInferrer = (name, args, modifiers, target) => {
  const schema = getSchema(name as Parameters<typeof getSchema>[0]);
  if (!schema) return null;

  const inferred = inferRolesFromSchema(
    schema,
    args as InterchangeNode[],
    modifiers,
    target,
    INTERCHANGE_ADAPTER
  );

  // The schema's own `ast` descriptor — the declarative shape `buildAST`
  // emits, e.g. toggle's `{ modifiers: { on: 'destination' } }` — is also the
  // reverse map: a core node carrying `modifiers.on` IS that role, whether or
  // not the role declares an English `markerOverride` (toggle's destination
  // does not; its `on` comes from the profile, which `inferRolesFromSchema`
  // never consults). Before Arc 3 step 3 the traditional parser left the
  // marker in `args` and the positional pass bound the value after it; now
  // the parser emits the slot, and this is what reads it.
  const declared = (schema as { ast?: { modifiers?: Readonly<Record<string, string>> } }).ast
    ?.modifiers;
  if (declared && modifiers) {
    for (const [key, role] of Object.entries(declared)) {
      const value = modifiers[key];
      const isNode = !!value && typeof value === 'object' && 'type' in value;
      if (isNode && inferred[role as keyof typeof inferred] === undefined) {
        inferred[role as keyof typeof inferred] = value as InterchangeNode;
      }
    }
  }
  return Object.keys(inferred).length > 0
    ? (inferred as Readonly<Record<string, InterchangeNode>>)
    : null;
};
