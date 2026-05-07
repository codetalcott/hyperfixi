/**
 * Schema-driven role inference.
 *
 * Maps a parser's positional args + modifiers + target → a role-keyed map,
 * driven by a `CommandSchema`. Used by IR bridges (core's `from-core.ts`,
 * framework's `from-interchange.ts`) to convert positional ASTs into the
 * role-based semantic IR without hand-rolling per-command switch cases.
 *
 * The function is generic over input/output value types via a small `ValueAdapter`
 * interface so callers with different node shapes (InterchangeNode, structural
 * INode, SemanticValue) can all share the same role-mapping logic.
 *
 * The schema-driven inference operates on the **English form** only (the surface
 * form the core hyperscript parser produces); per-language profile defaults
 * are not consulted here.
 */
import type { CommandSchema, RoleSpec } from '../schema';
import type { SemanticRole } from '../types';

/**
 * Adapter interface that abstracts over the caller's node shape.
 *
 * @typeParam T - The input value type (e.g., `InterchangeNode`, `INode`).
 * @typeParam V - The output role-value type (e.g., `InterchangeNode`, `SemanticValue`).
 */
export interface ValueAdapter<T, V> {
  /**
   * If `node` is an identifier, return its keyword string; otherwise return
   * `undefined`. Used to match marker keywords and skip-tokens against args.
   */
  getIdentifierName(node: T): string | undefined;
  /**
   * Convert an input node to the output role-value type.
   */
  convertValue(node: T): V;
  /**
   * Wrap a raw string as a literal output value (used for `methodCarrier`
   * literals and for string-shaped modifier values).
   */
  createLiteralValue(text: string): V;
}

/**
 * Infer semantic roles from a `CommandSchema` plus the parser's positional
 * args, modifier object, and trailing-target node.
 *
 * Returns the role map (possibly empty). Returns `null` only if the schema is
 * not applicable (currently never — the function always returns a map).
 *
 * @example
 * ```ts
 * const roles = inferRolesFromSchema(toggleSchema, args, modifiers, target, adapter);
 * // → { patient: <args[0]>, destination: <target> }
 * ```
 */
export function inferRolesFromSchema<T, V>(
  schema: CommandSchema,
  args: readonly T[],
  modifiers: Readonly<Record<string, unknown>> | undefined,
  target: T | undefined,
  adapter: ValueAdapter<T, V>
): Record<SemanticRole, V> {
  const roles: Record<SemanticRole, V> = {};
  const skipTokens = new Set(schema.argSkipTokens ?? []);
  const usedArgIndices = new Set<number>();

  // Pass 1: marker-keyed roles (modifier hit, then marker-in-args).
  // Iterate in declaration order so methodCarrier writes happen alongside their owning role.
  for (const role of schema.roles) {
    const markers = englishMarkers(role);
    if (markers.length === 0) continue; // No marker → handled in pass 2

    // Try modifiers first.
    let matched = tryModifierMarkers(role, markers, modifiers, adapter);

    // Fall back to scanning args for marker-in-args (e.g., scroll's `to`).
    if (!matched) {
      matched = tryArgMarkers(role, markers, args, skipTokens, usedArgIndices, adapter);
    }

    if (matched) {
      roles[role.role] = matched.value;
      if (role.methodCarrier) {
        roles[role.methodCarrier] = adapter.createLiteralValue(matched.matchedMarker);
      }
    }
  }

  // Pass 2: target field → targetRole (default 'destination').
  // Done before the positional pass so the target-filled role isn't also
  // considered for a positional arg slot.
  if (target !== undefined) {
    const tgtRole = schema.targetRole ?? 'destination';
    if (roles[tgtRole] === undefined) {
      roles[tgtRole] = adapter.convertValue(target);
    }
  }

  // Pass 3: positional (no-marker, not-yet-filled) roles, ordered by
  // svoPosition ASCENDING (semantic's convention — lower number = earlier
  // in surface form, matches `sortRolesByWordOrder` in @lokascript/semantic).
  const positionalRoles = schema.roles
    .filter(r => englishMarkers(r).length === 0 && roles[r.role] === undefined)
    .sort((a, b) => (a.svoPosition ?? 99) - (b.svoPosition ?? 99));

  let cursor = 0;
  for (const role of positionalRoles) {
    while (cursor < args.length) {
      if (usedArgIndices.has(cursor)) {
        cursor++;
        continue;
      }
      const name = adapter.getIdentifierName(args[cursor]);
      if (name !== undefined && skipTokens.has(name)) {
        cursor++;
        continue;
      }
      roles[role.role] = adapter.convertValue(args[cursor]);
      usedArgIndices.add(cursor);
      cursor++;
      break;
    }
  }

  return roles;
}

/**
 * Return the role's English marker(s). Empty array means "positional"
 * (either explicit empty string `''` or no `markerOverride.en` at all).
 */
function englishMarkers(role: RoleSpec): readonly string[] {
  const primary = role.markerOverride?.en;
  const variants = role.markerVariants?.en ?? [];

  const out: string[] = [];
  if (typeof primary === 'string' && primary !== '') out.push(primary);
  for (const v of variants) if (v !== '') out.push(v);
  return out;
}

interface MarkerMatch<V> {
  readonly value: V;
  readonly matchedMarker: string;
}

/**
 * Look up each candidate marker as a key in the modifiers object. Returns the
 * first hit. Modifier values may be nodes (objects with `type`) or strings.
 */
function tryModifierMarkers<T, V>(
  _role: RoleSpec,
  markers: readonly string[],
  modifiers: Readonly<Record<string, unknown>> | undefined,
  adapter: ValueAdapter<T, V>
): MarkerMatch<V> | undefined {
  if (!modifiers) return undefined;
  for (const m of markers) {
    if (!(m in modifiers)) continue;
    const raw = modifiers[m];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === 'string') {
      return { value: adapter.createLiteralValue(raw), matchedMarker: m };
    }
    if (typeof raw === 'object' && 'type' in (raw as object)) {
      return { value: adapter.convertValue(raw as T), matchedMarker: m };
    }
  }
  return undefined;
}

/**
 * Scan args for a marker token (or multi-word marker phrase) followed by a
 * non-skip value arg. Mutates `usedArgIndices` to record consumed positions.
 *
 * Longest-match-first ordering ensures e.g. `partials in` matches before a
 * bare `in` would.
 */
function tryArgMarkers<T, V>(
  _role: RoleSpec,
  markers: readonly string[],
  args: readonly T[],
  skipTokens: ReadonlySet<string>,
  usedArgIndices: Set<number>,
  adapter: ValueAdapter<T, V>
): MarkerMatch<V> | undefined {
  const sorted = [...markers].sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length);

  for (const marker of sorted) {
    const words = marker.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) continue;

    for (let i = 0; i + words.length <= args.length; i++) {
      // Check that `args[i..i+words.length)` are unused identifiers matching `words`.
      let allMatch = true;
      for (let w = 0; w < words.length; w++) {
        if (usedArgIndices.has(i + w)) {
          allMatch = false;
          break;
        }
        const name = adapter.getIdentifierName(args[i + w]);
        if (name !== words[w]) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) continue;

      // Find the next non-used, non-skip arg as the role value.
      for (let v = i + words.length; v < args.length; v++) {
        if (usedArgIndices.has(v)) continue;
        const name = adapter.getIdentifierName(args[v]);
        if (name !== undefined && skipTokens.has(name)) continue;

        for (let w = 0; w < words.length; w++) usedArgIndices.add(i + w);
        usedArgIndices.add(v);
        return { value: adapter.convertValue(args[v]), matchedMarker: marker };
      }
    }
  }

  return undefined;
}
