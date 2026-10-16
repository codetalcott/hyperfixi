/**
 * Patterns from command schemas: the generator semantic's hyperscript parser
 * runs (domains rethink Phase 4.4, `docs-internal/DOMAINS_RETHINK.md`), moved
 * here from `@lokascript/semantic` beside the domains' own `generatePattern`
 * (`pattern-generator.ts`), which `createMultilingualDSL` still uses.
 *
 * Per command and language it builds the main pattern and its variants: the
 * simple variant (required roles only), the omit-role, widened-type and
 * required-role variants, an SOV language's verb-first fallback, and the
 * value-prefix-literal variants (`RoleSpec` / `CommandSchema` document each).
 * What differs between grammars is a hook (`SchemaPatternGrammar`); what a
 * grammar adds on top (hyperscript's fused event-handler patterns) stays in the
 * grammar's package.
 */

import type { ExtractionRule, LanguagePattern, PatternToken } from '../core/types';
import type { CommandSchema, RoleSpec } from '../schema';

/** What differs between grammars in how a schema becomes patterns. */
export interface SchemaPatternGrammar {
  /**
   * How `svoPosition` / `sovPosition` sort: `'ascending'` puts the lowest first
   * (hyperscript's schemas, 1-based), `'descending'` the highest (a domain's
   * schemas, as framework's `generatePattern` reads them).
   */
  readonly positionOrder: 'ascending' | 'descending';
}

/** A role marker in a language profile. */
export interface SchemaPatternMarker {
  readonly primary: string;
  readonly alternatives?: string[];
  readonly position: 'before' | 'after';
}

/** What the generator reads of a language profile. */
export interface SchemaPatternProfile {
  readonly code: string;
  readonly wordOrder: string;
  readonly keywords: Readonly<
    Record<string, { readonly primary: string; readonly alternatives?: string[] } | undefined>
  >;
  readonly roleMarkers: Readonly<Partial<Record<string, SchemaPatternMarker>>>;
  /**
   * The language may drop its role markers colloquially (Turkish case
   * suffixes): each marker becomes an optional group that still renders.
   */
  readonly markersOptional?: boolean;
}

/** The generator, bound to a grammar (`createSchemaPatternGenerator`). */
export interface SchemaPatternGenerator {
  /** The main pattern for a command in a language. */
  generatePattern(
    schema: CommandSchema,
    profile: SchemaPatternProfile,
    config?: SchemaPatternConfig
  ): LanguagePattern;
  /** The command without its optional roles; null when it has none. */
  generateSimplePattern(
    schema: CommandSchema,
    profile: SchemaPatternProfile,
    config?: SchemaPatternConfig
  ): LanguagePattern | null;
  /** An SOV language's verb-first fallback; null for other word orders. */
  generateVerbFirstPattern(
    schema: CommandSchema,
    profile: SchemaPatternProfile,
    config?: SchemaPatternConfig
  ): LanguagePattern | null;
  /** The main pattern and every variant the schema and config ask for. */
  generatePatternVariants(
    schema: CommandSchema,
    profile: SchemaPatternProfile,
    config?: SchemaPatternConfig
  ): LanguagePattern[];
  /** The token(s) of one role: its value slot and marker, in the language's order. */
  buildRoleToken(roleSpec: RoleSpec, profile: SchemaPatternProfile): PatternToken[];
}

/** A generator for the grammar's schemas. */
export function createSchemaPatternGenerator(
  grammar: SchemaPatternGrammar
): SchemaPatternGenerator {
  return {
    generatePattern: (schema, profile, config) => generatePattern(grammar, schema, profile, config),
    generateSimplePattern: (schema, profile, config) =>
      generateSimplePattern(grammar, schema, profile, config),
    generateVerbFirstPattern: (schema, profile, config) =>
      generateVerbFirstPattern(schema, profile, config),
    generatePatternVariants: (schema, profile, config) =>
      generatePatternVariants(grammar, schema, profile, config),
    buildRoleToken,
  };
}

/** The schema without its variant-only roles: what every pattern but a required-role variant is built from. */
export function withoutVariantOnlyRoles<S extends CommandSchema>(schema: S): S {
  return schema.roles.some(r => r.variantOnly)
    ? { ...schema, roles: schema.roles.filter(r => !r.variantOnly) }
    : schema;
}

/**
 * Roles in the grammar's position order for the word order (a stable sort).
 * Each order keeps the rule its generator always had for a role with no
 * position: 99 ascending (semantic's `sortRolesByWordOrder`), 0 descending
 * (framework's `sortRolesByWordOrder`).
 */
function sortRolesByPosition<T extends Pick<RoleSpec, 'svoPosition' | 'sovPosition'>>(
  roles: readonly T[],
  wordOrder: string,
  order: SchemaPatternGrammar['positionOrder']
): T[] {
  const sortKey = wordOrder === 'SOV' ? 'sovPosition' : 'svoPosition';
  return [...roles].sort((a, b) =>
    order === 'ascending'
      ? (a[sortKey] ?? 99) - (b[sortKey] ?? 99)
      : (b[sortKey] ?? 0) - (a[sortKey] ?? 0)
  );
}

/**
 * Minimum interface for role specs that can have marker resolution.
 * Compatible with the RoleSpec type from command-schemas.
 */
export interface RoleSpecWithMarker {
  role: string;
  markerOverride?: Record<string, string | undefined>;
  markerLegacy?: Record<string, readonly string[]>;
  markerVariants?: Record<string, readonly string[]>;
  methodCarrier?: string;
}

/**
 * Resolved marker information for a role.
 */
export interface ResolvedMarker {
  /** Primary marker string (may be empty string for no marker) */
  primary: string;
  /** Alternative markers */
  alternatives?: string[];
  /** Position relative to role value */
  position: 'before' | 'after';
  /** Whether this is an override marker */
  isOverride: boolean;
}

/**
 * Resolve the marker for a role in a specific language.
 *
 * Checks for command-specific marker overrides first,
 * then falls back to the default marker from the language profile.
 *
 * @param roleSpec Role specification with optional override
 * @param profile Language profile with role markers
 * @returns Resolved marker info, or null if no marker
 */
export function resolveMarkerForRole(
  roleSpec: RoleSpecWithMarker,
  profile: SchemaPatternProfile
): ResolvedMarker | null {
  // Check for command-specific marker override first
  const overrideMarker = roleSpec.markerOverride?.[profile.code];
  const defaultMarker = profile.roleMarkers[roleSpec.role];

  if (overrideMarker !== undefined) {
    // Use override marker (can be empty string to suppress default marker).
    // markerLegacy entries stay accepted, so correcting an override does not
    // stop the marker a previous release rendered from parsing.
    const alternatives = legacyMarkerAlternatives(roleSpec, profile.code, overrideMarker);
    return {
      primary: overrideMarker,
      ...(alternatives && { alternatives }),
      position: defaultMarker?.position ?? 'before',
      isOverride: true,
    };
  }

  if (defaultMarker && defaultMarker.primary) {
    const result: ResolvedMarker = {
      primary: defaultMarker.primary,
      position: defaultMarker.position,
      isOverride: false,
    };
    if (defaultMarker.alternatives) {
      result.alternatives = defaultMarker.alternatives;
    }
    return result;
  }

  return null;
}

/**
 * Alternatives an OVERRIDE marker accepts: the role's {@link RoleSpecWithMarker.markerLegacy}
 * entries for this language, minus the override itself.
 *
 * Every generator that resolves a marker has its own override branch, and each
 * one used to drop alternatives entirely — so correcting a marker silently
 * stopped the previous one parsing. This is the single definition of what an
 * override still accepts; call it from each of those branches.
 *
 * Prefer {@link schemaMarkerAlternatives}, which also merges `markerVariants`.
 * This narrower entry point remains for callers that must exclude variants.
 */
export function legacyMarkerAlternatives(
  roleSpec: RoleSpecWithMarker,
  languageCode: string,
  overrideMarker: string
): string[] | undefined {
  const legacy = roleSpec.markerLegacy?.[languageCode];
  if (!legacy?.length) return undefined;
  const alternatives = [...new Set(legacy)].filter(a => a && a !== overrideMarker);
  return alternatives.length ? alternatives : undefined;
}

/**
 * Every schema-declared alternative a role's marker accepts in this language:
 * `markerLegacy` ∪ `markerVariants`, minus the marker itself.
 *
 * **The single definition — call it from every branch of every generator.** The
 * two fields used to sit on DIFFERENT branches: the override branch read only
 * `markerLegacy`, the profile-default branch only `markerVariants`. So giving a
 * language a `markerOverride` silently deleted its `markerVariants`, and giving
 * it `markerVariants` did nothing at all wherever an override existed. Both
 * halves were live: tr `set`'s dative allomorphs (`e|a|ye|ya`) were declared as
 * variants but dropped by the tr override, so `… doğru ya ayarla` parsed only
 * inside an event handler — the one generator that happened to merge both.
 *
 * `markerVariants` are held out for a role with a {@link RoleSpecWithMarker.methodCarrier}:
 * there they are not synonyms but distinct command shapes recorded into another
 * role (`put`'s `into|before|after` → `method`), and merging them as synonyms is
 * what broke `put-before`/`put-after` in 23 languages at once. That flag is the
 * discriminator because it is set on exactly the role whose variants carry
 * meaning — pinned by `schema-consistency.test.ts`, which fails if a new
 * `markerVariants` appears without that decision being made.
 */
export function schemaMarkerAlternatives(
  roleSpec: RoleSpecWithMarker,
  languageCode: string,
  marker: string
): string[] | undefined {
  const legacy = roleSpec.markerLegacy?.[languageCode] ?? [];
  const variants = roleSpec.methodCarrier ? [] : (roleSpec.markerVariants?.[languageCode] ?? []);
  const alternatives = [...new Set([...legacy, ...variants])].filter(a => a && a !== marker);
  return alternatives.length ? alternatives : undefined;
}

/**
 * Configuration for pattern generation.
 */
export interface SchemaPatternConfig {
  /** Base priority for generated patterns (higher = checked first) */
  basePriority?: number;
  /** Whether to generate simple patterns (without optional roles) */
  generateSimpleVariants?: boolean;
  /** Whether to generate alternative keyword patterns */
  generateAlternatives?: boolean;
  /**
   * Whether to generate verb-first fallback patterns for SOV languages
   * (`トグル .active` alongside the canonical `.active を トグル`). Default on.
   * These are strictly lower priority than the canonical patterns, so native
   * SOV order always wins; this only accepts bilingual/code-switched input.
   */
  generateVerbFirstVariants?: boolean;
}

const defaultConfig: SchemaPatternConfig = {
  basePriority: 100,
  generateSimpleVariants: true,
  generateAlternatives: true,
};

/**
 * Generate a pattern for a command in a specific language.
 */
function generatePattern(
  grammar: SchemaPatternGrammar,
  schema: CommandSchema,
  profile: SchemaPatternProfile,
  config: SchemaPatternConfig = defaultConfig
): LanguagePattern {
  const id = `${schema.action}-${profile.code}-generated`;
  const priority = config.basePriority ?? 100;

  // Get keyword translation
  const keyword = profile.keywords[schema.action];
  if (!keyword) {
    throw new Error(`No keyword translation for '${schema.action}' in ${profile.code}`);
  }

  // Build tokens based on word order
  const tokens = buildTokens(grammar, schema, profile, keyword);

  // Build extraction rules with defaults for optional roles
  // This ensures defaults are applied even when optional groups don't match
  const extraction = buildExtractionRulesWithDefaults(schema, profile);

  // Build template format string (for documentation)
  const format = buildFormatString(grammar, schema, profile, keyword);

  return {
    id,
    language: profile.code,
    command: schema.action,
    priority,
    template: {
      format,
      tokens,
    },
    extraction,
  };
}

/**
 * Generate a simple variant pattern (without optional roles).
 */
function generateSimplePattern(
  grammar: SchemaPatternGrammar,
  schema: CommandSchema,
  profile: SchemaPatternProfile,
  config: SchemaPatternConfig = defaultConfig
): LanguagePattern | null {
  // Only generate simple variant if there are optional roles
  const optionalRoles = schema.roles.filter(r => !r.required);
  if (optionalRoles.length === 0) {
    return null;
  }

  const requiredRoles = schema.roles.filter(r => r.required);
  const simpleSchema: CommandSchema = {
    ...schema,
    roles: requiredRoles,
  };

  const pattern = generatePattern(grammar, simpleSchema, profile, config);

  // Adjust for simple variant
  return {
    ...pattern,
    id: `${schema.action}-${profile.code}-generated-simple`,
    priority: (config.basePriority ?? 100) - 5, // Lower priority than full pattern (was -10)
    extraction: buildExtractionRulesWithDefaults(schema, profile),
  };
}

/**
 * Generate a verb-first fallback pattern for an SOV language.
 *
 * Canonical SOV order is patient-then-verb (`.active を トグル`). Bilingual and
 * code-switching authors often write the English/loanword verb first
 * (`トグル .active`). This emits `[verb] [required role(s), UNMARKED]` at a lower
 * priority so the canonical pattern always wins for native input — the
 * verb-first form only matches when the input genuinely starts with the verb.
 *
 * Kept deliberately conservative: only commands with a single required role
 * (patient-focused: toggle/add/remove/show/hide/…) get this fallback, which
 * keeps the unmarked match unambiguous. Returns null otherwise.
 */
function generateVerbFirstPattern(
  schema: CommandSchema,
  profile: SchemaPatternProfile,
  config: SchemaPatternConfig = defaultConfig
): LanguagePattern | null {
  if (profile.wordOrder !== 'SOV') return null;

  const requiredRoles = schema.roles.filter(r => r.required);
  if (requiredRoles.length !== 1) return null;

  const keyword = profile.keywords[schema.action];
  if (!keyword) return null;

  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };

  // Verb first, then the required role(s) with NO marker (the marker is what
  // disambiguates roles in canonical SOV; verb-first input typically omits it).
  // A valuePrefixLiteral (rolePrefixLiteralVariants clones only) still precedes
  // its role's value — the SOV transformer renders `移動 url "/page" に`
  // verb-first, which is exactly this shape (trailing particle tolerated).
  const roleTokens: PatternToken[] = requiredRoles.flatMap(r => {
    const prefix = r.valuePrefixLiteral?.[profile.code];
    const roleToken: PatternToken = {
      type: 'role',
      role: r.role,
      optional: false,
      expectedTypes: r.expectedTypes,
    };
    return prefix ? [{ type: 'literal', value: prefix } as PatternToken, roleToken] : [roleToken];
  });

  return {
    id: `${schema.action}-${profile.code}-generated-verb-first`,
    language: profile.code,
    command: schema.action,
    // Strictly below the canonical (basePriority) and simple (basePriority - 5)
    // patterns so native order is always preferred.
    priority: (config.basePriority ?? 100) - 20,
    template: {
      format: `${keyword.primary} <${requiredRoles[0].role}>`,
      tokens: [verbToken, ...roleTokens],
    },
    extraction: buildExtractionRulesWithDefaults(schema, profile),
  };
}

/**
 * Generate all pattern variants for a command in a language.
 */
function generatePatternVariants(
  grammar: SchemaPatternGrammar,
  schema: CommandSchema,
  profile: SchemaPatternProfile,
  config: SchemaPatternConfig = defaultConfig
): LanguagePattern[] {
  const patterns: LanguagePattern[] = [];
  // A variant-only role is in the required-role variants alone.
  const full = schema;
  schema = withoutVariantOnlyRoles(schema);

  // Main pattern
  patterns.push(generatePattern(grammar, schema, profile, config));

  // Simple variant (without optional roles)
  if (config.generateSimpleVariants) {
    const simple = generateSimplePattern(grammar, schema, profile, config);
    if (simple) {
      patterns.push(simple);
    }
  }

  // Omit-role variants: an EXTRA pattern per schema-listed role with that
  // role (and its marker phrase) removed entirely. Covers a REQUIRED role
  // whose phrase is legitimately absent in valid hyperscript (transition's
  // goal: `transition *max-height over 300ms`, slide-toggle) — making the
  // role optional inside the main pattern is the verified skippable-group
  // re-binding regression (see the transition goal NOTE); a separate variant
  // has no skippable group at all. Priority sits below the simple variant so
  // any text carrying the role phrase always prefers the fuller patterns.
  for (const omitted of schema.omitRoleVariants ?? []) {
    const variantSchema: CommandSchema = {
      ...schema,
      roles: schema.roles.filter(r => r.role !== omitted),
    };
    const variant = generatePattern(grammar, variantSchema, profile, config);
    patterns.push({
      ...variant,
      id: `${schema.action}-${profile.code}-generated-no-${omitted}`,
      priority: (config.basePriority ?? 100) - 8,
    });
  }

  // Widened-type variants: an EXTRA pattern per entry whose named role accepts a
  // wider set of value types. Deliberately BELOW every command pattern, so it is
  // inert on any span a real command can claim — see the schema field's doc for
  // the ko `transition opacity to 0` collision that rules out widening the main
  // pattern in place.
  for (const widen of schema.widenTypeVariants ?? []) {
    if (widen.excludeLanguages?.includes(profile.code)) continue;
    const cloneSchema: CommandSchema = {
      ...schema,
      roles: schema.roles.map(r =>
        r.role === widen.role ? { ...r, expectedTypes: [...widen.types] } : r
      ),
    };
    const main = generatePattern(grammar, cloneSchema, profile, config);
    patterns.push({
      ...main,
      id: `${schema.action}-${profile.code}-generated-${widen.idSuffix}`,
      priority: (config.basePriority ?? 100) - (widen.priorityDelta ?? 15),
    });
  }

  // Required-role variants: inert unless the role's marker is present, so they
  // may outrank the command's other patterns (see the schema field).
  for (const v of full.requiredRoleVariants ?? []) {
    const variantSchema: CommandSchema = {
      ...full,
      roles: full.roles
        .filter(r => !v.omit?.includes(r.role))
        .map(r => {
          const required = r.role === v.role ? { ...r, required: true } : r;
          return r.role === v.widen?.role
            ? { ...required, expectedTypes: [...v.widen.types] }
            : required;
        }),
    };
    const variant = generatePattern(grammar, variantSchema, profile, config);
    patterns.push({
      ...variant,
      id: `${schema.action}-${profile.code}-generated-${v.idSuffix}`,
      priority: (config.basePriority ?? 100) + (v.priorityDelta ?? 5),
    });
  }

  // Verb-first fallback for SOV languages (lower priority than the above).
  if (config.generateVerbFirstVariants !== false) {
    const verbFirst = generateVerbFirstPattern(schema, profile, config);
    if (verbFirst) {
      patterns.push(verbFirst);
    }
  }

  // Value-prefix-literal variants: an EXTRA pattern per entry with a REQUIRED
  // literal keyword immediately before the named role's value (`go [to] url
  // {destination}`). Higher priority than the counterpart pattern, but inert
  // unless the keyword is present — base patterns above stay byte-identical,
  // so forms riding on them (`go back`) cannot regress. The matched keyword is
  // recorded as a fixed-value literal in the variant's methodCarrier role.
  for (const v of schema.rolePrefixLiteralVariants ?? []) {
    const literal = v.literal[profile.code];
    if (!literal) continue;
    const { rolePrefixLiteralVariants: _omitted, ...baseSchema } = schema;
    const cloneSchema: CommandSchema = {
      ...baseSchema,
      roles: schema.roles.map(r =>
        r.role === v.role ? { ...r, valuePrefixLiteral: { [profile.code]: literal } } : r
      ),
    };
    const delta = v.priorityDelta ?? 5;
    const carrier: Record<string, ExtractionRule> = v.methodCarrier
      ? { [v.methodCarrier]: { value: literal } }
      : {};
    const main = generatePattern(grammar, cloneSchema, profile, config);
    patterns.push({
      ...main,
      id: `${schema.action}-${profile.code}-generated-${v.idSuffix}`,
      priority: (config.basePriority ?? 100) + delta,
      extraction: { ...main.extraction, ...carrier },
    });
    if (config.generateVerbFirstVariants !== false) {
      const verbFirstUrl = generateVerbFirstPattern(cloneSchema, profile, config);
      if (verbFirstUrl) {
        patterns.push({
          ...verbFirstUrl,
          id: `${schema.action}-${profile.code}-generated-verb-first-${v.idSuffix}`,
          priority: (config.basePriority ?? 100) - 20 + delta,
          extraction: { ...verbFirstUrl.extraction, ...carrier },
        });
      }
    }
  }

  return patterns;
}

/**
 * Build pattern tokens based on word order.
 */
function buildTokens(
  grammar: SchemaPatternGrammar,
  schema: CommandSchema,
  profile: SchemaPatternProfile,
  keyword: { primary: string; alternatives?: string[] }
): PatternToken[] {
  const tokens: PatternToken[] = [];

  // Get verb token
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };

  // Get role tokens sorted by position. In SOV a role with `sovSlot: 'postVerb'`
  // follows the verb (a domain's summarize format: `content 要約 として format`).
  const postVerbRoles =
    profile.wordOrder === 'SOV' ? schema.roles.filter(r => r.sovSlot === 'postVerb') : [];
  const roleTokens = buildRoleTokens(
    grammar,
    postVerbRoles.length
      ? { ...schema, roles: schema.roles.filter(r => r.sovSlot !== 'postVerb') }
      : schema,
    profile
  );
  const postVerbTokens = postVerbRoles.length
    ? buildRoleTokens(grammar, { ...schema, roles: postVerbRoles }, profile)
    : [];

  // Arrange based on word order
  switch (profile.wordOrder) {
    case 'SVO':
      // Verb first, then roles in order
      tokens.push(verbToken);
      tokens.push(...roleTokens);
      break;

    case 'SOV':
      // Roles first (reversed for SOV), then verb
      tokens.push(...roleTokens);
      tokens.push(verbToken);
      tokens.push(...postVerbTokens);
      break;

    case 'VSO':
      // Verb first, then subject, then object
      tokens.push(verbToken);
      tokens.push(...roleTokens);
      break;

    default:
      // Default to SVO
      tokens.push(verbToken);
      tokens.push(...roleTokens);
  }

  return collapseAdjacentLiterals(tokens);
}

/**
 * Collapse adjacent identical literal tokens into one.
 *
 * For the event-handler trigger (`on`) schema, a handful of languages use the
 * same word for the trigger keyword (the `on` verb) and the event role's marker —
 * bn `তে`, hi `पर`, th `เมื่อ`. `buildTokens` then emits it twice (`<event> তে তে`),
 * which the renderer prints verbatim; on re-parse the duplicate pairs with the
 * following token as a phantom command (e.g. `তে আমি` → a spurious `on me`). No
 * trigger pattern needs to match the same literal twice in a row, so fold the
 * duplicate, preserving any `alternatives` from either side. Verified to affect
 * only the `on` patterns of bn/hi/th — no other command/language has adjacent
 * duplicate literals. See MULTILINGUAL_BEHAVIORS_PLAN.md Phase 2.
 */
function collapseAdjacentLiterals(tokens: PatternToken[]): PatternToken[] {
  const out: PatternToken[] = [];
  for (const tok of tokens) {
    const prev = out[out.length - 1];
    if (prev && prev.type === 'literal' && tok.type === 'literal' && prev.value === tok.value) {
      const alts = [...(prev.alternatives ?? []), ...(tok.alternatives ?? [])];
      if (alts.length) out[out.length - 1] = { ...prev, alternatives: [...new Set(alts)] };
      continue;
    }
    out.push(tok);
  }
  return out;
}

/**
 * Build tokens for roles.
 */
function buildRoleTokens(
  grammar: SchemaPatternGrammar,
  schema: CommandSchema,
  profile: SchemaPatternProfile
): PatternToken[] {
  const tokens: PatternToken[] = [];

  // Sort roles by position using shared utility
  const sortedRoles = sortRolesByPosition(schema.roles, profile.wordOrder, grammar.positionOrder);

  for (const roleSpec of sortedRoles) {
    const roleToken = buildRoleToken(roleSpec, profile);

    if (!roleSpec.required) {
      // Wrap optional roles in a group
      tokens.push({
        type: 'group',
        optional: true,
        tokens: roleToken,
      });
    } else {
      tokens.push(...roleToken);
    }
  }

  return tokens;
}

/**
 * Build token(s) for a single role.
 *
 * Exported so the fused event-handler generators can build a wrapped command's
 * optional-role slots from the very same code the standalone command patterns
 * use — a hand-rolled copy there is what let the two drift apart in the first
 * place (see `appendRemainingOptionalRoles` in event-handlers-sov.ts).
 */
function buildRoleToken(roleSpec: RoleSpec, profile: SchemaPatternProfile): PatternToken[] {
  const tokens: PatternToken[] = [];

  // Check for command-specific marker override first
  const overrideMarker = roleSpec.markerOverride?.[profile.code];
  const defaultMarker = profile.roleMarkers[roleSpec.role];

  // A role whose renderOverride is the empty string parses WITH its marker but
  // renders WITHOUT it (e.g. fetch's `from`: `fetch from /api` must parse, yet
  // canonical _hyperscript rejects `fetch from "/api"` while accepting
  // `fetch "/api"`). Tag the emitted marker literal so the renderer skips it;
  // the pattern matcher ignores the flag, so parsing is unchanged.
  const suppressMarker = roleSpec.renderOverride?.[profile.code] === '';

  // Role value token
  const roleValueToken: PatternToken = {
    type: 'role',
    role: roleSpec.role,
    optional: !roleSpec.required,
    expectedTypes: roleSpec.expectedTypes,
    // The matcher reads this too — a `'keyword'`-shaped slot holds a fixed
    // keyword phrase (`using view transition`) and must not be skipped by the
    // trailing-slot verb guard.
    ...(roleSpec.valueShape !== undefined ? { valueShape: roleSpec.valueShape } : {}),
    // A greedy role reads up to the next marker the pattern owes (a domain's
    // SQL condition); its value reader does the reading.
    ...(roleSpec.greedy ? { greedy: true } : {}),
  };

  // Required literal immediately before the role VALUE (rolePrefixLiteralVariants
  // clones only): `[to] url {destination}`, `url {destination} に`. Deliberately
  // NOT an optional group — the variant must only match when the keyword is
  // present, so base patterns keep winning everywhere else.
  const prefixLiteral = roleSpec.valuePrefixLiteral?.[profile.code];
  const pushPrefixed = (): void => {
    if (prefixLiteral) tokens.push({ type: 'literal', value: prefixLiteral });
    tokens.push(roleValueToken);
  };

  // Use override marker if available, otherwise use default
  if (overrideMarker !== undefined) {
    // Command-specific marker override. Multi-word markers (e.g. "partials in",
    // "with title") split into one literal token per word so the matcher
    // consumes them sequentially. A per-command markerOptional wraps each word
    // in an optional group (`go to /page` and `go back` both parse — the
    // render side drops the preposition, so the parse side can't require it).
    const markerWords = overrideMarker ? overrideMarker.split(/\s+/).filter(Boolean) : [];
    // Where the profile carries no RoleMarker for this role there is nothing to
    // take a side from, and 'before' is wrong in a verb-final language: ja
    // rendered `opacity を に 0` and bn `opacity কে তে 0`, the override marker
    // stranded AHEAD of its own value. Default to 'after' for SOV.
    //
    // EXEMPT a PASSTHROUGH override — one whose marker is the same string en
    // uses (`scope`, `manner`). Those are English words carried verbatim into
    // every language, so they keep English's prepositional side; without the
    // exemption ja/ko/qu lose `set`'s scope.
    const isPassthroughOverride =
      overrideMarker !== undefined && overrideMarker === roleSpec.markerOverride?.en;
    const position =
      roleSpec.markerPositionOverride?.[profile.code] ??
      roleSpec.markerPosition ??
      defaultMarker?.position ??
      (profile.wordOrder === 'SOV' && !isPassthroughOverride ? 'after' : 'before');
    const optionalMarker = roleSpec.markerOptional?.[profile.code] === true;
    // Single-word overrides also accept every schema-declared alternative
    // (markerLegacy ∪ markerVariants), so correcting an override's marker does
    // not stop the previous one parsing, and declaring an override does not
    // silently delete that language's variants. schemaMarkerAlternatives holds
    // variants out for a methodCarrier role (`put`'s before/after) — see its doc.
    const pushWord = (word: string): void => {
      const alternatives =
        markerWords.length === 1
          ? (schemaMarkerAlternatives(roleSpec, profile.code, word) ?? [])
          : [];
      const literal: PatternToken = {
        type: 'literal',
        value: word,
        ...(alternatives.length ? { alternatives } : {}),
        ...(suppressMarker ? { renderSuppress: true } : {}),
      };
      tokens.push(optionalMarker ? { type: 'group', optional: true, tokens: [literal] } : literal);
    };
    if (position === 'before') {
      for (const word of markerWords) pushWord(word);
      pushPrefixed();
    } else {
      pushPrefixed();
      for (const word of markerWords) pushWord(word);
    }
  } else if (defaultMarker) {
    // When the profile allows colloquial marker-dropping, the marker becomes an
    // optional group so `.active değiştir` parses as well as `.active i değiştir`.
    // The marked form still matches the marker literal directly (higher
    // confidence); the unmarked form falls back through the optional group.
    // The schema's markerVariants/markerLegacy merge in as extra alternatives:
    // the transformer can render a role with a particle the profile default
    // doesn't cover (zh 把 before go's destination in `go back`).
    const asMarker = (): PatternToken => {
      const alternatives = [
        ...new Set([
          ...(defaultMarker.alternatives ?? []),
          ...(schemaMarkerAlternatives(roleSpec, profile.code, defaultMarker.primary) ?? []),
        ]),
      ].filter(a => a !== defaultMarker.primary);
      return {
        type: 'literal',
        value: defaultMarker.primary,
        ...(alternatives.length ? { alternatives } : {}),
        ...(suppressMarker ? { renderSuppress: true } : {}),
      };
    };
    const pushMarker = (marker: PatternToken): void => {
      if (!profile.markersOptional && !roleSpec.markerOptional?.[profile.code]) {
        tokens.push(marker);
        return;
      }
      // A profile-wide `markersOptional` says the marker may be DROPPED
      // colloquially, not that it is absent from canonical output — so the group
      // still renders. A per-role `markerOptional` is the opposite: the render
      // side genuinely omits that marker (`go to /page` vs `go back`), so it
      // stays render-optional too.
      tokens.push({
        type: 'group',
        optional: true,
        ...(profile.markersOptional && !roleSpec.markerOptional?.[profile.code]
          ? { renderRequired: true }
          : {}),
        tokens: [marker],
      });
    };
    // A schema's own side for the role (a domain's `markerPosition`) outranks the profile's.
    if ((roleSpec.markerPosition ?? defaultMarker.position) === 'before') {
      // Preposition: "on #button"
      if (defaultMarker.primary) {
        pushMarker(asMarker());
      }
      pushPrefixed();
    } else {
      // Postposition/particle: "#button に"
      pushPrefixed();
      pushMarker(asMarker());
    }
  } else {
    // No marker, just the role value
    pushPrefixed();
  }

  return tokens;
}

// =============================================================================
// Extraction Rules Building
// =============================================================================

/**
 * Build extraction rules for a pattern.
 */
function buildExtractionRules(
  schema: CommandSchema,
  profile: SchemaPatternProfile
): Record<string, ExtractionRule> {
  const rules: Record<string, ExtractionRule> = {};

  for (const roleSpec of schema.roles) {
    // Check for command-specific marker override first
    const overrideMarker = roleSpec.markerOverride?.[profile.code];
    const defaultMarker = profile.roleMarkers[roleSpec.role];

    if (roleSpec.valuePrefixLiteral?.[profile.code]) {
      // The prefix literal sits immediately before the value on every surface,
      // so it is the extraction anchor (push/replace's proven `url` shape) —
      // it wins over the role's own marker (`to`), which may be optional/absent.
      rules[roleSpec.role] = { marker: roleSpec.valuePrefixLiteral[profile.code] };
    } else if (overrideMarker !== undefined) {
      // Use the override marker, accepting the schema's declared alternatives
      // so a corrected marker does not stop the previous one parsing and an
      // override does not delete that language's variants (mirrors
      // buildRoleToken; single-word overrides only, as a multi-word marker has
      // no single token to swap).
      if (!overrideMarker) {
        rules[roleSpec.role] = {};
      } else {
        const isSingleWord = !/\s/.test(overrideMarker.trim());
        const markerAlternatives = isSingleWord
          ? (schemaMarkerAlternatives(roleSpec, profile.code, overrideMarker) ?? [])
          : [];
        rules[roleSpec.role] = markerAlternatives.length
          ? { marker: overrideMarker, markerAlternatives }
          : { marker: overrideMarker };
      }
    } else if (defaultMarker && defaultMarker.primary) {
      // Merge the schema's declared alternatives (mirrors buildRoleToken)
      const markerAlternatives = [
        ...new Set([
          ...(defaultMarker.alternatives ?? []),
          ...(schemaMarkerAlternatives(roleSpec, profile.code, defaultMarker.primary) ?? []),
        ]),
      ].filter(a => a !== defaultMarker.primary);
      rules[roleSpec.role] = markerAlternatives.length
        ? { marker: defaultMarker.primary, markerAlternatives }
        : { marker: defaultMarker.primary };
    } else {
      rules[roleSpec.role] = {};
    }
  }

  return rules;
}

/**
 * Build extraction rules with defaults for optional roles.
 */
function buildExtractionRulesWithDefaults(
  schema: CommandSchema,
  profile: SchemaPatternProfile
): Record<string, ExtractionRule> {
  const baseRules = buildExtractionRules(schema, profile);
  const rules: Record<string, ExtractionRule> = {};

  // Copy base rules and add defaults for optional roles
  for (const roleSpec of schema.roles) {
    const baseRule = baseRules[roleSpec.role] || {};

    if (!roleSpec.required && roleSpec.default) {
      rules[roleSpec.role] = { ...baseRule, default: roleSpec.default };
    } else {
      rules[roleSpec.role] = baseRule;
    }
  }

  return rules;
}

// =============================================================================
// Format String Building
// =============================================================================

/**
 * Build a human-readable format string for documentation.
 */
function buildFormatString(
  grammar: SchemaPatternGrammar,
  schema: CommandSchema,
  profile: SchemaPatternProfile,
  keyword: { primary: string }
): string {
  const parts: string[] = [];

  // Sort roles by position using shared utility
  const sortedRoles = sortRolesByPosition(schema.roles, profile.wordOrder, grammar.positionOrder);

  // Build role parts
  const roleParts = sortedRoles.map(roleSpec => {
    // Use shared marker resolution utility
    const resolved = resolveMarkerForRole(roleSpec, profile);
    let part = '';

    if (resolved && resolved.primary) {
      // Has a marker
      if (resolved.position === 'before') {
        part = `${resolved.primary} {${roleSpec.role}}`;
      } else {
        part = `{${roleSpec.role}} ${resolved.primary}`;
      }
    } else {
      // No marker
      part = `{${roleSpec.role}}`;
    }

    return roleSpec.required ? part : `[${part}]`;
  });

  // Arrange based on word order
  switch (profile.wordOrder) {
    case 'SVO':
    case 'VSO':
      parts.push(keyword.primary, ...roleParts);
      break;
    case 'SOV':
      parts.push(...roleParts, keyword.primary);
      break;
    default:
      parts.push(keyword.primary, ...roleParts);
  }

  return parts.join(' ');
}
