/**
 * Command Schema Types
 *
 * Defines the structure of DSL commands for pattern generation and validation.
 * Language-neutral — describes semantic structure, not surface syntax.
 *
 * One schema type for every grammar: the domain DSLs (`@lokascript/framework`'s
 * generator, matcher and renderer) and hyperscript (`@lokascript/semantic`, whose
 * `RoleSpec` and `CommandSchema` are these, narrowed to its action, role and
 * category names). A field one grammar's code never reads is inert in the other's
 * schemas: the field docs say which reads it.
 */

import type { ActionType, SemanticRole, SemanticValue, ExpectedType } from './types';

/**
 * A role in a command schema.
 *
 * @typeParam Role - the grammar's role names (`string` for a domain DSL;
 *   semantic narrows it to hyperscript's).
 * @typeParam Value - the value type a role's {@link RoleSpec.default} holds.
 */
export interface RoleSpec<Role extends string = SemanticRole, Value = SemanticValue> {
  readonly role: Role;
  readonly description: string;
  readonly required: boolean;
  /**
   * The role belongs only to the `requiredRoleVariants` patterns, never to the
   * main, simple, omit or widened patterns, nor to a handler's fused patterns
   * (`variantOnlyRoles` strips it). For a slot that exists only beside another
   * role's marker: scroll's bare element before `by` (`scroll #box by 200px`).
   * In the main pattern an optional bare slot before the destination took the
   * destination's own marker (th `ใน`, tl `sa`) on the fused path, and a fused
   * SOV head made it the command's primary slot.
   *
   * Read by semantic's pattern generator.
   */
  readonly variantOnly?: boolean;
  readonly expectedTypes: Array<ExpectedType>;
  /** Default value if not provided. */
  readonly default?: Value;
  /**
   * Ordering priority for SVO (Subject-Verb-Object) languages.
   *
   * **The sort direction is the generator's, and the two differ:**
   *
   * - framework's generator (the domain DSLs) sorts DESCENDING: **higher values
   *   appear EARLIER** in the surface form. For `select <columns> from <source>
   *   where <condition>`: `columns: 2, source: 1, condition: 0`. Pick values so
   *   the most "central" role is highest and optional / trailing clauses are
   *   lowest; when adding a role between two existing ones, bump all higher
   *   positions rather than using fractional numbers.
   * - semantic's generator (hyperscript) sorts ASCENDING, 1-based: **lower values
   *   appear earlier** (position 1 = first; `parser/utils/role-positioning.ts`,
   *   `a - b`).
   *
   * A hyperscript schema reused in a domain needs its positions inverted.
   */
  readonly svoPosition?: number;
  /**
   * Ordering priority for SOV (Subject-Object-Verb) languages.
   *
   * Same convention, and the same two directions, as {@link svoPosition}: the
   * verb is appended last by the pattern generator, so role positions order the
   * pre-verb material.
   */
  readonly sovPosition?: number;
  /**
   * Per-language primary marker keyword for this role.
   *
   * - Non-empty string (e.g., `'to'`) — the canonical marker.
   * - Empty string `''` — explicitly no marker (bare positional arg).
   * - Multi-word strings (e.g., `'partials in'`) — match consecutive identifier tokens.
   * - `undefined` — the language profile's default marker for the role applies.
   *
   * For roles that accept multiple alternate markers (e.g., `put`'s
   * `into|before|after`), declare the alternates separately in {@link markerVariants}.
   */
  readonly markerOverride?: Record<string, string>;
  /**
   * Mark this role as SHAPE-ANCHORED: its surface form is unambiguous on its
   * own, so the slot needs no marker to be safe. The kinds:
   *
   * - `'time'` — a unit-suffixed time literal (`2s`, `500ms`, `1.5s`).
   * - `'reference'` — a CLOSED-CLASS context reference (`me`, `it`, `you` and
   *   their per-language equivalents). Closed-class is the whole argument: the
   *   tokenizer already classifies these as references, so a reference-typed
   *   slot cannot swallow a selector or a literal.
   * - `'keyword'` — a FIXED keyword phrase behind a required multi-word marker
   *   (`using view transition` on swap/process). The marker literals must all
   *   match before the slot can capture anything, so the slot is guarded by
   *   construction: nothing else in the grammar can land in it, and its absence
   *   says only that the caller didn't ask for the flag.
   * - `'clause'` — an expression behind its own marker word (`when <condition>`
   *   on add/remove/hide/show). The marker must match before the slot captures
   *   anything, so, as with a keyword phrase, an absent clause says only that
   *   none was written. Without it the slot cost every add/remove/hide/show
   *   parse a quarter of its confidence (hi `click पर .a को जोड़ें`: 1.0 →
   *   0.67). The confidence model is the only reader of this kind.
   * - `'list'` — a clause whose value is a LIST, items separated by commas
   *   (toggle's `between 'a', 'b' and 'c'`). The value extent reads each item
   *   as one expression (`readsAsValueList`); otherwise as `'clause'`.
   *
   * Enforced in the CONFIDENCE model (`scoreRoleCoverage`): a shape-anchored
   * role counts toward a pattern's score only when captured, so an uncaptured
   * optional slot carries no evidence against the pattern.
   *
   * This is the lever that makes a MARKER-LESS optional slot safe. Without it,
   * toggle's trailing `[{duration}]` weighed into every toggle pattern's
   * denominator, dropping `toggle-*-generated` from 1.0 to 0.69 on inputs with
   * no duration at all — so the same-priority hand pattern (0.82, wrong
   * destination markers) won and es/pl/vi silently lost the second toggle's
   * positional destination on `toggle-aria-expanded` (`next .panel` became
   * `me`). Only the R1 role-set flip ratchet sees that class.
   *
   * A matcher-side token guard (refuse non-time tokens at capture) was built,
   * probed and REMOVED: no constructible input fires it — `expectedTypes`
   * plus the positional assembler's own next-token gating already refuse every
   * non-time capture into the slot, and an unfireable branch is unverifiable.
   * If a future shape (an `omitRoleVariants` clone, a required slot) makes
   * spurious capture possible again, reinstate it THERE with a failing test
   * first.
   *
   * Read by semantic's matcher, confidence model and value extent.
   */
  readonly valueShape?: 'time' | 'reference' | 'keyword' | 'object' | 'clause' | 'list';
  /**
   * Make this role's object marker OPTIONAL in the generated pattern (wrapped in
   * an optional group), per language, so both the marked and unmarked surface forms
   * parse. Used for roles whose value is sometimes an unmarked expression — e.g.
   * `call`'s function-call patient, which the transformer leaves unmarked in a
   * multi-command body but marks (את / 把) elsewhere. Scoped per language (only the
   * langs that need it) so it doesn't relax marking — and role typing — everywhere.
   * Independent of `profile.markersOptional` (which applies the same to every command).
   *
   * Read by semantic's pattern generator.
   */
  readonly markerOptional?: Record<string, boolean>;
  /**
   * Additional alternate marker keywords for this role, beyond {@link markerOverride}.
   * Used by schema-driven role inference (e.g., `inferRolesFromSchema`) to
   * recognize any of the listed markers as signaling this role; the matched marker
   * is recorded in {@link methodCarrier} if set.
   *
   * semantic's generator ALSO merges them into every generated pattern as marker
   * alternatives, on both the override and profile-default branches
   * (`schemaMarkerAlternatives` in `parser/utils/marker-resolution.ts`) —
   * **unless the role sets {@link methodCarrier}.** There the variants are not
   * synonyms but distinct command shapes recorded into another role (`put`'s
   * `into|before|after` → `method`), and merging them as synonyms swallowed
   * `put-before`/`put-after` in 23 languages at once. That flag is the only
   * discriminator, so setting it is a decision, not a detail —
   * `schema-consistency.test.ts` pins every role that declares this field.
   * framework's generator reads only `markerOverride`.
   */
  readonly markerVariants?: Record<string, readonly string[]>;
  /**
   * Markers a previous release rendered for this role: still ACCEPTED when
   * parsing, never rendered. Correcting a {@link markerOverride} would otherwise
   * stop the old marker parsing at all, making every marker fix a breaking
   * change for source already written.
   *
   * Distinct from {@link markerVariants} only in intent: a legacy marker means
   * the same thing as the current one and is merely spelled the way an older
   * release spelled it, whereas a variant may carry meaning of its own (see
   * that field). Both are merged as alternatives by the same helper, so the
   * choice between them is documentation for the next reader, not behaviour —
   * except when {@link methodCarrier} is set, which holds variants out.
   *
   * Read by semantic's pattern generator.
   */
  readonly markerLegacy?: Record<string, readonly string[]>;
  /**
   * Per-language marker to use when RENDERING, overriding {@link markerOverride}
   * and the profile default. Empty string `''` means "render this role bare" —
   * for a marker that exists to help the parser but is not written by hand
   * (SQL's `insert` takes its values with no `set` before them, though the
   * profile gives the `values` role that marker; hyperscript's `go to /home`
   * parses with `to` and renders `go /home`).
   *
   * The key `'*'` is a blanket statement about the PROFILE default marker, so
   * it ranks below a per-language {@link markerOverride}: `{ '*': '' }` renders
   * the role bare in every language except those with an explicit override.
   * Full precedence: `renderOverride[lang]` → `markerOverride[lang]` →
   * `renderOverride['*']` → profile default. (framework's renderer; semantic's
   * pattern generator reads only `''`, which makes the parsed marker optional.)
   */
  readonly renderOverride?: Record<string, string>;
  /** Which side of its value this role's marker goes on (framework's generator and renderer). */
  readonly markerPosition?: 'before' | 'after';
  /**
   * Per-language override of {@link markerPosition}, for languages whose marker
   * sits on the other side of its value than their word order implies: zh's
   * `之间` follows the pair it names (`切换 .a 和 .b 之间`), as no zh preposition
   * does.
   *
   * Resolution when rendering: this → {@link markerPosition} → the profile's
   * marker position for the role → the word-order default (SOV: after, else before).
   */
  readonly markerPositionOverride?: Record<string, 'before' | 'after'>;
  /**
   * Which side of the verb this role renders on in SOV languages.
   *
   * SOV puts roles before the verb by default (`preVerb`). `postVerb` moves this
   * role after it — e.g. summarize's format renders `content 要約 として format`,
   * not `content として format 要約`. Ignored for non-SOV languages.
   * (framework's generator and renderer.)
   */
  readonly sovSlot?: 'preVerb' | 'postVerb';
  /**
   * Wrap this role's value in double quotes when rendering, if it contains
   * whitespace and is not already quoted. For free-text roles (a question, a
   * prompt) whose value would otherwise be re-parsed as several tokens.
   * (framework's renderer.)
   */
  readonly quoteMultiword?: boolean;
  /**
   * Capture every token up to the next role marker (or the end of the input) as
   * one value, rather than one value token: SQL's `where` condition, a column
   * list. (framework's generator and matcher.)
   */
  readonly greedy?: boolean;
  /**
   * Restricts which selector subtypes are valid for this role.
   * Only meaningful when expectedTypes includes 'selector'.
   * If omitted, all selector kinds are accepted.
   */
  readonly selectorKinds?: ReadonlyArray<'id' | 'class' | 'attribute' | 'element' | 'complex'>;
  /**
   * When this role's marker has alternates (via {@link markerVariants}), the
   * matched marker keyword is recorded as a literal in the role named here.
   * Used by `put` to expose `into|before|after` as the `method` role.
   */
  readonly methodCarrier?: Role;
  /**
   * Literal keyword required IMMEDIATELY before this role's VALUE, independent
   * of the role marker's side (a preposition stays before it, a postposed
   * particle stays after the value): `a url "/page"`, `url "/page" তে`. Set
   * only on schema clones built by the pattern generator's
   * `rolePrefixLiteralVariants` expansion — never on a base schema, so base
   * patterns stay byte-identical. (semantic's pattern generator.)
   */
  readonly valuePrefixLiteral?: Record<string, string>;
}

/**
 * A command schema: the roles a command takes, and how its patterns are built.
 *
 * @typeParam Action - the grammar's action names (`string` for a domain DSL).
 * @typeParam Role - the grammar's role names.
 * @typeParam Value - the value type a role default holds.
 * @typeParam Category - the grammar's command categories.
 */
export interface CommandSchema<
  Action extends string = ActionType,
  Role extends string = SemanticRole,
  Value = SemanticValue,
  Category extends string = string,
> {
  readonly action: Action;
  readonly description: string;
  readonly roles: RoleSpec<Role, Value>[];
  readonly primaryRole: Role;
  readonly category: Category;
  readonly hasBody?: boolean;
  /**
   * Generate a bare keyword pattern even when the command has no roles.
   * Normally `getDefinedSchemas` only emits patterns for schemas with at least
   * one role (a roleless keyword like `compound`/`else`/`async` would otherwise
   * match greedily and mis-parse). Block keywords that legitimately stand alone
   * before a body — `live <body> end` — opt in here so a `[keyword]` pattern is
   * generated and the construct parses (body handled like other block bodies).
   * (semantic's pattern generator.)
   */
  readonly bareKeyword?: boolean;
  /**
   * Parsed by the structural feature-block layer (`tryParseFeatureBlock`), never
   * by a generated pattern: excluded from `getDefinedSchemas`, so no command
   * pattern and no fused event-handler pattern is emitted for it in any
   * language. For a head whose shape the generator cannot express — the reactive
   * `when <expr> changes`, where the REQUIRED trailing `changes` literal is what
   * bounds the multi-token watched expression and what keeps the reactive head
   * apart from the temporal `when {event}` handler patterns (a generated `when
   * {condition}` command pattern would collide with them in every language that
   * has one). Registered all the same so the schema stays the documented role
   * contract: the R1 reference, the adapter's syntax table, the validators.
   * (semantic.)
   */
  readonly structuralOnly?: boolean;
  /**
   * Generate an EXTRA, lower-priority pattern variant per listed role with
   * that role (and its marker phrase) omitted entirely. For a REQUIRED role
   * whose phrase is legitimately absent in valid hyperscript (`transition
   * *max-height over 300ms` — no `to {goal}`): making the role optional
   * inside the main pattern wraps its marker group as skippable and the bare
   * value re-binds by particle metadata (verified regression, see the
   * transition goal NOTE); a separate variant has no skippable group at all.
   * (semantic's pattern generator.)
   */
  readonly omitRoleVariants?: ReadonlyArray<Role>;
  /**
   * Generate an EXTRA, LOWER-priority pattern variant whose named role accepts a
   * wider set of value types than the schema declares.
   *
   * `onSchema.event` is the case: a handler's event is `literal` for the ~60
   * names the dictionaries localize (`click` → `クリック`, a keyword token), but a
   * CUSTOM event passes through untranslated and tokenizes as an identifier, so
   * `on message …` bound nothing in ar/ja/ko/tr — the three whose handler
   * patterns come from this generator rather than from a handcrafted head.
   *
   * Widening the MAIN pattern instead was measured and rejected: ko renders
   * `transition opacity to 0` as `opacity 을 에 0`, the same `<x> 을 에` shape as
   * its handler head, so at equal priority the widened `on` pattern claimed the
   * transition and three corpus rows flipped. A lower-priority variant is inert
   * wherever a real command pattern can match the span. (semantic's pattern generator.)
   */
  readonly widenTypeVariants?: ReadonlyArray<{
    readonly role: Role;
    readonly types: ReadonlyArray<ExpectedType>;
    readonly idSuffix: string;
    /** Subtracted from `basePriority`. Default 15 — below every command pattern. */
    readonly priorityDelta?: number;
    /**
     * Languages that do NOT get the variant, with the measured reason. ko is the
     * one: its on-marker `에` is also its destination marker, and its event-role
     * marker `을` is also its patient marker, so `<x> 을 에 <value>` is BOTH a
     * handler head and the shape ko renders `transition opacity to 0` in
     * (`opacity 을 에 0 300ms 트랜지션`). With the variant, that bare transition
     * reads as a handler named `opacity`. No other language has both collisions
     * — ja's on-marker is `で` while its transition marks the goal with `に`.
     */
    readonly excludeLanguages?: ReadonlyArray<string>;
  }>;
  /**
   * Generate an EXTRA, higher-priority pattern variant per entry, with a
   * REQUIRED literal keyword inserted immediately before the named role's
   * value token (`go [to] url {destination}` beside `go [to] {destination}`).
   * Because the literal is required, the variant is inert unless the keyword
   * is present — the base patterns are untouched, so forms that ride on them
   * (`go back`) cannot regress. The matched keyword is recorded as a
   * fixed-value literal in `methodCarrier` (mirroring {@link RoleSpec.methodCarrier}).
   * (semantic's pattern generator.)
   */
  readonly rolePrefixLiteralVariants?: ReadonlyArray<{
    readonly role: Role;
    /** Per-language keyword (e.g. URL_MARKER_ALL_LANGS). Languages absent from the map get no variant. */
    readonly literal: Record<string, string>;
    /** Pattern id suffix, e.g. 'url' → `<action>-<lang>-generated-url`. */
    readonly idSuffix: string;
    /** Priority delta over the counterpart pattern (default +5). */
    readonly priorityDelta?: number;
    /** Record the matched keyword as this role (fixed-value extraction). */
    readonly methodCarrier?: Role;
  }>;
  /**
   * Generate an EXTRA pattern variant per entry in which an optional `role` is
   * REQUIRED, with `omit` roles removed and `widen` given more value types. Its
   * marker must match, so the variant is inert without it and may outrank the
   * command's other patterns: a hand-crafted `toggle {patient}` otherwise wins
   * `toggle $x between 1 and 2` by reading `$x` and stranding the rest.
   * (semantic's pattern generator.)
   */
  readonly requiredRoleVariants?: ReadonlyArray<{
    readonly role: Role;
    readonly omit?: ReadonlyArray<Role>;
    readonly widen?: { readonly role: Role; readonly types: ReadonlyArray<ExpectedType> };
    /** Pattern id suffix: `<action>-<lang>-generated-<idSuffix>`. */
    readonly idSuffix: string;
    /** Added to `basePriority`. Default +5. */
    readonly priorityDelta?: number;
  }>;
  readonly notes?: string;
  /**
   * Identifier tokens that may appear in the core parser's positional `args`
   * but are not bound to any role — e.g., scroll's `top|bottom|smoothly`.
   * These are skipped when scanning args for role values.
   */
  readonly argSkipTokens?: ReadonlyArray<string>;
  /**
   * Which role consumes the core parser's `target` field (the trailing
   * `on X` / `to X` / `from X` captured separately from args). Defaults to
   * `'destination'`. Set to `'source'` for commands like `remove .x from #y`.
   */
  readonly targetRole?: Role;
}

/**
 * Helper to create a command schema with sensible defaults.
 *
 * @throws TypeError when `schema` is missing `action` or `roles`, or when they
 *   have the wrong shape. The types catch this for TypeScript callers; the
 *   runtime check exists so JavaScript callers and hand-built objects fail with
 *   a message naming the field instead of a `roles[0] of undefined` crash from
 *   deep inside the package.
 */
export function defineCommand(
  schema: Partial<CommandSchema> & Pick<CommandSchema, 'action' | 'roles'>
): CommandSchema {
  if (typeof schema !== 'object' || schema === null) {
    throw new TypeError(`defineCommand: expected a schema object, got ${describeValue(schema)}.`);
  }
  if (typeof schema.action !== 'string' || schema.action.length === 0) {
    throw new TypeError(
      `defineCommand: 'action' must be a non-empty string (got ${describeValue(schema.action)}).`
    );
  }
  if (!Array.isArray(schema.roles)) {
    throw new TypeError(
      `defineCommand("${schema.action}"): 'roles' must be an array of RoleSpec ` +
        `(got ${describeValue(schema.roles)}). Build entries with defineRole().`
    );
  }
  for (const [index, role] of schema.roles.entries()) {
    if (typeof role !== 'object' || role === null || typeof role.role !== 'string') {
      throw new TypeError(
        `defineCommand("${schema.action}"): roles[${index}] must be a RoleSpec with a string ` +
          `'role' field (got ${describeValue(role)}). Build it with defineRole().`
      );
    }
  }

  return {
    description: schema.description || `${schema.action} command`,
    category: schema.category || 'general',
    primaryRole: schema.primaryRole || schema.roles[0]?.role || 'patient',
    ...schema,
    action: schema.action,
    roles: schema.roles,
  } as CommandSchema;
}

/**
 * Helper to create a role spec with sensible defaults.
 */
export function defineRole(
  role: Partial<RoleSpec> & Pick<RoleSpec, 'role' | 'required' | 'expectedTypes'>
): RoleSpec {
  return {
    description: role.description || `${role.role} role`,
    ...role,
    role: role.role,
    required: role.required,
    expectedTypes: role.expectedTypes,
  };
}

/**
 * Look up a role spec by name within a command schema.
 * Returns `undefined` if no role with that name exists.
 *
 * @example
 * const spec = getRoleSpec(toggleSchema, 'patient');
 * if (spec?.required) { ... }
 */
export function getRoleSpec(schema: CommandSchema, role: string): RoleSpec | undefined {
  // Contract is already "undefined when not found", so a malformed schema
  // answers the same question rather than throwing.
  if (!schema || !Array.isArray(schema.roles)) return undefined;
  return schema.roles.find(r => r.role === role);
}

/** Render a value for an error message without dumping large objects. */
function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `an array of length ${value.length}`;
  if (typeof value === 'string') return `the string ${JSON.stringify(value)}`;
  if (typeof value === 'object') return 'an object';
  return typeof value === 'undefined' ? 'undefined' : String(value);
}
