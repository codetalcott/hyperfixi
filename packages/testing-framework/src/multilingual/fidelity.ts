/**
 * Structural fidelity for multilingual parses.
 *
 * The parse-validator's success metric is "the parser returned a non-null node".
 * That conflates a faithful parse with a *degenerate* one — a translated pattern
 * can parse non-null while silently dropping most of the source's commands (e.g.
 * `focus-trap` parses as a bare `if` or a stray `from` in several languages, with
 * the `focus`/`halt`/condition lost). This module derives a lightweight
 * structural signature from a parsed node and scores a translation's parse against
 * the English reference parse, so those degenerate passes are visible.
 *
 * The signature is intentionally word-order agnostic: it is the *set* of command
 * actions in the node tree, so a faithful SOV/VSO reorder scores 1.0 while a parse
 * that loses commands scores low.
 */

/** Passes scoring below this are flagged as degenerate (lost >half the structure). */
export const FIDELITY_THRESHOLD = 0.5;

/** The structural `compound` wrapper is not a command; never counts as an action. */
const STRUCTURAL_ACTIONS = new Set(['compound']);

/** Node-array fields the walk recurses into (event/loop/conditional bodies). */
const CHILD_FIELDS = ['body', 'statements', 'thenBranch', 'elseBranch', 'branches'] as const;

/**
 * Collect the distinct command actions anywhere in a parsed semantic node tree
 * (top-level action + nested body/statements/branches), excluding the structural
 * `compound` wrapper. Returns a sorted array for stable comparison/serialization.
 */
export function collectActions(node: unknown): string[] {
  const acc = new Set<string>();
  walk(node, acc, 0);
  return [...acc].sort();
}

function walk(node: unknown, acc: Set<string>, depth: number): void {
  // Guard against pathological/cyclic structures.
  if (depth > 64 || node === null || typeof node !== 'object') return;

  const rec = node as Record<string, unknown>;
  const action = rec.action;
  if (typeof action === 'string' && !STRUCTURAL_ACTIONS.has(action)) {
    acc.add(action);
  }

  for (const field of CHILD_FIELDS) {
    const child = rec[field];
    if (Array.isArray(child)) {
      for (const c of child) walk(c, acc, depth + 1);
    } else if (child && typeof child === 'object') {
      walk(child, acc, depth + 1);
    }
  }
}

/**
 * Structural fidelity in [0, 1]: the fraction of the reference (English) actions
 * also present in the candidate (recall). Returns `undefined` when the reference
 * has no actions to compare against.
 */
export function computeFidelity(
  reference: readonly string[],
  candidate: readonly string[]
): number | undefined {
  if (reference.length === 0) return undefined;
  const cand = new Set(candidate);
  let hits = 0;
  for (const a of reference) {
    if (cand.has(a)) hits++;
  }
  return hits / reference.length;
}

/**
 * R1 — role-fidelity signature.
 *
 * Action-set fidelity cannot see a parse that finds the right commands with the
 * WRONG roles: a swapped patient/destination executes wrongly while scoring 1.0.
 * This signature captures, for every command node in the tree, which roles were
 * filled and with what value *type* (`add.patient:selector`,
 * `put.destination:reference`). Cross-language comparison is by role name +
 * value type — never by value string, which is legitimately translated.
 * The roles container is a ReadonlyMap on live nodes (serializes to {} in JSON),
 * so the signature must be collected at validation time, not from results.json.
 */
export function collectRoleSignature(node: unknown): string[] {
  const acc = new Set<string>();
  walkRoles(node, acc, 0);
  return [...acc].sort();
}

function walkRoles(node: unknown, acc: Set<string>, depth: number): void {
  if (depth > 64 || node === null || typeof node !== 'object') return;

  const rec = node as Record<string, unknown>;
  const action = rec.action;
  if (typeof action === 'string' && !STRUCTURAL_ACTIONS.has(action)) {
    const roles = rec.roles;
    const entries: Array<[unknown, unknown]> =
      roles instanceof Map
        ? [...roles.entries()]
        : roles && typeof roles === 'object'
          ? Object.entries(roles)
          : [];
    for (const [role, value] of entries) {
      if (value === undefined || value === null) continue;
      const kind =
        typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string'
          ? (value as { type: string }).type
          : typeof value;
      acc.add(`${action}.${String(role)}:${kind}`);
    }
  }

  for (const field of CHILD_FIELDS) {
    const child = rec[field];
    if (Array.isArray(child)) {
      for (const c of child) walkRoles(c, acc, depth + 1);
    } else if (child && typeof child === 'object') {
      walkRoles(child, acc, depth + 1);
    }
  }
}
