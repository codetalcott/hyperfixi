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

/** Node-array fields the walk recurses into (event/loop/conditional/behavior bodies). */
const CHILD_FIELDS = [
  'body',
  'statements',
  'thenBranch',
  'elseBranch',
  'branches',
  'eventHandlers',
  'initBlock',
] as const;

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
 * Like {@link collectActions} but **multiset**: duplicates are preserved (sorted,
 * not deduped). Needed for precision — a *duplicate* spurious command (e.g. a
 * renderer that injects a phantom `toggle` ahead of a real `toggle`, yielding
 * `[toggle, toggle, put]`) is invisible to the Set-based `collectActions`.
 *
 * Kept as a parallel walk rather than refactoring `collectActions`: the latter
 * feeds the committed regression baseline, so its traversal stays byte-identical.
 */
export function collectActionsMultiset(node: unknown): string[] {
  const acc: string[] = [];
  walkMultiset(node, acc, 0);
  return acc.sort();
}

function walkMultiset(node: unknown, acc: string[], depth: number): void {
  if (depth > 64 || node === null || typeof node !== 'object') return;

  const rec = node as Record<string, unknown>;
  const action = rec.action;
  if (typeof action === 'string' && !STRUCTURAL_ACTIONS.has(action)) {
    acc.push(action);
  }

  for (const field of CHILD_FIELDS) {
    const child = rec[field];
    if (Array.isArray(child)) {
      for (const c of child) walkMultiset(c, acc, depth + 1);
    } else if (child && typeof child === 'object') {
      walkMultiset(child, acc, depth + 1);
    }
  }
}

/** Build a multiset count map from an action list. */
function actionCounts(items: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
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
 * R0-recall on the **multiset** in [0, 1]: the fraction of the reference's
 * actions — counting duplicates — also present in the candidate.
 *
 * {@link computeFidelity} scores the deduped Set signature, so a candidate that
 * drops a REPEATED command scores 1.0: reference `[bind, bind]` collapses to
 * `{bind}`, which `[bind]` satisfies in full. That is how `bind-two-way` sat at
 * fidelity 1.0 across all 24 languages while every one of them parsed only the
 * first of its two `bind`s. R1 (role signatures) is a Set too, and is equally
 * blind. {@link computePrecision} catches the mirror case — a candidate that ADDS
 * a duplicate — so before this signal existed the ratchet saw spurious commands
 * but never dropped ones.
 *
 * Pass multisets (see {@link collectActionsMultiset}) on both sides.
 * Returns `undefined` when the reference has no actions to compare against.
 */
export function computeMultisetRecall(
  reference: readonly string[],
  candidate: readonly string[]
): number | undefined {
  if (reference.length === 0) return undefined;
  const cand = actionCounts(candidate);
  let matched = 0;
  for (const a of reference) {
    const remaining = cand.get(a) ?? 0;
    if (remaining > 0) {
      matched++;
      cand.set(a, remaining - 1);
    }
  }
  return matched / reference.length;
}

/**
 * Structural **precision** in [0, 1]: the fraction of the *candidate's* actions
 * that are justified by the reference (multiset-aware). The complement of
 * {@link computeFidelity}'s recall — it falls below 1.0 when a parse/render adds
 * commands the source never had.
 *
 * This is the signal recall + role-fidelity (R1) cannot see: a renderer that
 * injects a phantom `toggle` (ja/ko/tr/ar/ru event-handler rendering) keeps recall
 * 1.0 while precision drops. Pass multisets (see {@link collectActionsMultiset})
 * so a *duplicated* spurious action is counted, not absorbed.
 *
 * Returns `undefined` when the candidate has no actions to score.
 */
export function computePrecision(
  reference: readonly string[],
  candidate: readonly string[]
): number | undefined {
  if (candidate.length === 0) return undefined;
  const ref = actionCounts(reference);
  let matched = 0;
  for (const a of candidate) {
    const remaining = ref.get(a) ?? 0;
    if (remaining > 0) {
      matched++;
      ref.set(a, remaining - 1);
    }
  }
  return matched / candidate.length;
}

/**
 * The candidate actions **not** justified by the reference (multiset difference,
 * sorted) — i.e. the spurious/hallucinated commands a parse or render introduced.
 * Empty when the candidate is a structural subset of the reference. Use for
 * diagnostics ("which command was hallucinated?"), complementing the
 * {@link computePrecision} score.
 */
export function spuriousActions(
  reference: readonly string[],
  candidate: readonly string[]
): string[] {
  const ref = actionCounts(reference);
  const extras: string[] = [];
  for (const a of candidate) {
    const remaining = ref.get(a) ?? 0;
    if (remaining > 0) ref.set(a, remaining - 1);
    else extras.push(a);
  }
  return extras.sort();
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

/**
 * Role-value kinds never emitted by the R3 walker. `reference` values (`me`,
 * `it`, …) are mostly `fillSchemaDefaults` injections present identically on
 * both sides — noise. `flag` names and `property-path` properties are bare
 * identifiers, excluded by v1 (see {@link collectRoleValueSignature}).
 */
const VALUE_KIND_EXCLUSIONS = new Set(['reference', 'flag', 'property-path']);

/**
 * A role value is compared cross-language only when its WHOLE surface form is
 * code-shaped — language-invariant by construction, never legitimately
 * translated. Conservative v1 whitelist; when a sweep firing turns out to be a
 * legit translation difference, tighten here and document the exclusion.
 */
const INVARIANT_VALUE_PATTERNS: readonly RegExp[] = [
  /^[#.[<@*]/, // selectors: #id  .class  [attr]  <tag/>  @attr  *style
  /^[:$^][A-Za-z_]\w*$/, // sigil refs: :local  $global  ^element
  /^\d+(\.\d+)?(ms|s|m|h)?$/, // numbers and time literals: 2  1.5  200ms
  /^[A-Za-z_][\w-]*:[\w-]+$/, // colon-qualified event names: draggable:start
  /^(\.{0,2}\/|https?:)/, // URLs / paths: /api/data  ./x  ../y  https://…
];

function isInvariantSurface(surface: string): boolean {
  // Whole-surface rule, sweep-validated exclusions:
  // - whitespace ⇒ mixed content. `if #modal exists` captures its condition as
  //   `#modal exists` — starts selector-shaped, but `exists` is prose that every
  //   language legitimately translates (16-language false firing without this).
  // - `${` ⇒ template interpolation. `/api/search?q=${my value}` is an
  //   expression, and tokenizers split it at different points per language, so
  //   the captured surface isn't comparable verbatim.
  if (/\s/.test(surface) || surface.includes('${')) return false;
  return INVARIANT_VALUE_PATTERNS.some(re => re.test(surface));
}

/**
 * The comparable surface form of a role value, or `undefined` when the value
 * carries none: `.value` for `literal`/`selector` (string/number/boolean
 * coerced), `.raw` for `expression`. Kinds in {@link VALUE_KIND_EXCLUSIONS}
 * and values without a string `type` discriminator yield `undefined`.
 */
function roleValueSurface(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') return undefined;
  const rec = value as { type?: unknown; value?: unknown; raw?: unknown };
  if (typeof rec.type !== 'string' || VALUE_KIND_EXCLUSIONS.has(rec.type)) return undefined;
  if (rec.type === 'expression') {
    return typeof rec.raw === 'string' ? rec.raw : undefined;
  }
  const v = rec.value;
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    ? String(v)
    : undefined;
}

/**
 * R3 — role-VALUE signature (invariant values only, multiset).
 *
 * R0/R1 compare actions and role *types*; values are never compared because
 * they are legitimately translated. That leaves a live defect class with zero
 * signal: right action counts, right role types, wrong role VALUE — the #633
 * class, where ms captured `trigger` events named `draggable` instead of
 * `draggable:start` (correct multiset, correct `trigger.event:literal`
 * signature, silently wrong runtime behavior), and 18 other languages carried
 * the same corruption with no side-effect at all.
 *
 * The subset of values compared here is language-invariant by construction —
 * code, not prose (see {@link INVARIANT_VALUE_PATTERNS}). Emits a **multiset**
 * of `` `action.role=value` `` entries (duplicates preserved, sorted); score
 * with {@link computeMultisetRecall} so a dropped duplicate value is visible.
 *
 * Deliberately EXCLUDED in v1: bare-word identifiers (`startX` — usually
 * invariant, but property/variable names occasionally get localized in seeds),
 * string literals (message strings are legitimately translated), expression
 * raws mixing native words + code (`次 .item`), and `reference` values
 * (`me`/`it` — mostly `fillSchemaDefaults` injections on both sides).
 *
 * Blind spot: recall fires when a *translation* loses/corrupts an invariant
 * value. If the **en reference itself** corrupts a value, every language flags
 * at once — a 24-language R3 firestorm on one pattern means "suspect the en
 * parse first" (unlike R0, where en corruption moves nothing).
 *
 * The roles container is a ReadonlyMap on live nodes (serializes to {} in
 * results.json), so collect at validation time, never from the JSON.
 */
export function collectRoleValueSignature(node: unknown): string[] {
  const acc: string[] = [];
  walkRoleValues(node, acc, 0);
  return acc.sort();
}

function walkRoleValues(node: unknown, acc: string[], depth: number): void {
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
      const surface = roleValueSurface(value);
      if (surface === undefined || !isInvariantSurface(surface)) continue;
      acc.push(`${action}.${String(role)}=${surface}`);
    }
  }

  for (const field of CHILD_FIELDS) {
    const child = rec[field];
    if (Array.isArray(child)) {
      for (const c of child) walkRoleValues(c, acc, depth + 1);
    } else if (child && typeof child === 'object') {
      walkRoleValues(child, acc, depth + 1);
    }
  }
}
