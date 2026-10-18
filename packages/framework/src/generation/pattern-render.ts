/**
 * Rendering a command through a language's own patterns: the renderer core
 * semantic's hyperscript renderer runs (domains rethink Phase 4.5,
 * `docs-internal/DOMAINS_RETHINK.md`), moved here from `@lokascript/semantic`.
 *
 * A node renders with the pattern its parser would read it back through:
 * `selectRenderPattern` scores a language's patterns for the node (the roles it
 * carries, the slots each pattern has, the values a pattern pins), and
 * `renderPattern` walks the chosen pattern's tokens. What a value looks like in
 * the language, and the grammar's preferences, are `PatternRenderHooks`.
 * (The domains' `renderer.ts` renders from the schema instead, for
 * `createMultilingualDSL`.)
 */

import type {
  ExtractionRule,
  GroupPatternToken,
  LanguagePattern,
  PatternToken,
  RolePatternToken,
  SemanticNode,
} from '../core/types';

/**
 * What the core reads of a node: its roles. A grammar's own node type (semantic's
 * `SemanticNode`) qualifies as it is; the hooks receive it unchanged.
 */
export interface RenderableNode {
  readonly roles: ReadonlyMap<string, { readonly type: string }>;
}

/** A grammar's part of rendering through patterns, for its node type `N`. */
export interface PatternRenderHooks<N extends RenderableNode = SemanticNode> {
  /**
   * The patterns a node may render with, from those that are not parse-only
   * (hyperscript: an event handler renders only with a trigger pattern, never a
   * fused `<command>-event-*` one).
   */
  candidates?(node: N, patterns: readonly LanguagePattern[]): readonly LanguagePattern[];
  /** Whether the node carries `role` as written, not as a default its parser filled in. */
  hasRealRole(node: N, role: string): boolean;
  /** The grammar's own preference between patterns, added to the score. */
  adjustScore?(pattern: LanguagePattern, node: N): number;
  /**
   * Text for token `i` and the tokens after it it covers, when the grammar
   * writes them as one (hyperscript: a reference in its case, es `a mí`);
   * undefined renders the token as usual.
   */
  span?(
    tokens: readonly PatternToken[],
    i: number,
    node: N,
    language: string,
    topLevel: boolean
  ): { text: string; tokens: number } | undefined;
  /** A role slot's text; null writes nothing. */
  writeRole(token: RolePatternToken, node: N, language: string): string | null;
  /**
   * Whether an optional group whose required roles the node carries is written
   * (hyperscript: not for the implicit `me` its parser filled in). Default yes.
   */
  writeGroup?(token: GroupPatternToken, node: N, language: string): boolean;
  /**
   * Add a token's text to `parts` (hyperscript: a marker written onto its
   * word, ko `#out에`). Default: a part of its own.
   */
  pushPart?(
    parts: string[],
    text: string,
    token: PatternToken,
    previous: PatternToken | undefined,
    node: N,
    language: string
  ): void;
  /** Before top-level token `i` (hyperscript: a scroll's direction word before its amount). */
  beforeToken?(
    tokens: readonly PatternToken[],
    i: number,
    parts: string[],
    node: N,
    language: string
  ): void;
  /** After a top-level token wrote `parts[part]` (hyperscript: where the event went). */
  afterToken?(token: PatternToken, part: number, node: N): void;
}

/**
 * Score a role slot nested inside an OPTIONAL group. Lower than the top-level
 * bonus on purpose: it must break a tie between two patterns that are otherwise
 * equal (the handcrafted `toggle-{L}-full` versus the generated pattern that
 * also carries `[{duration}]`) without ever outweighing a top-level difference.
 */
const NESTED_ROLE_BONUS = 5;

/**
 * Score against a pattern that has no slot for a role the node carries. Larger
 * than any priority gap between a command's patterns (80–100), so rendering
 * the role always beats a more idiomatic form that drops it.
 */
const UNCOVERED_ROLE_PENALTY = 30;

/**
 * The literal a pattern pins a role to, normalized for comparison: an
 * extraction default, or a fixed value the pattern records when it matches.
 * The second is how `go`'s url variant says what it means (`go url /page`
 * records `method: 'url'`); reading only defaults let that variant render every
 * `go`, so `go back` came out as `go url back`: a navigation to a page named
 * "back" in every language.
 */
function pinnedLiteral(rule: ExtractionRule | undefined): string | undefined {
  if (rule?.default?.type === 'literal') return String(rule.default.value).trim().toLowerCase();
  if (rule?.value !== undefined) return String(rule.value).trim().toLowerCase();
  return undefined;
}

/**
 * The pattern to render `node` with, or null when there is none.
 */
export function selectRenderPattern<N extends RenderableNode>(
  node: N,
  patterns: readonly LanguagePattern[],
  hooks: PatternRenderHooks<N>
): LanguagePattern | null {
  let candidates: readonly LanguagePattern[] = patterns.filter(pattern => !pattern.parseOnly);
  if (candidates.length === 0) candidates = patterns;
  if (hooks.candidates) candidates = hooks.candidates(node, candidates);

  // Which literal values does the candidate set pin, per role? A value that is
  // pinned by SOME candidate is a real alternative the pattern set distinguishes
  // (put's manner: before / after / at end of), so choosing a pattern pinned to a
  // different one would silently change meaning. A value nothing pins is not an
  // alternative — it is just the value that came out of the parse — and must not
  // disqualify anything. That distinction is what keeps `repeat until event X`
  // renderable: a zh parse yields loopType `until` while the English pattern that
  // carries the event pins `until-event`, and nothing pins bare `until`.
  const pinnedValues = new Map<string, Set<string>>();
  for (const pattern of candidates) {
    for (const [role, rule] of Object.entries(pattern.extraction ?? {})) {
      const key = pinnedLiteral(rule);
      if (key === undefined) continue;
      const set = pinnedValues.get(role) ?? new Set<string>();
      set.add(key);
      pinnedValues.set(role, set);
    }
  }

  // Score patterns by how well they match our roles
  const scored = candidates.map(pattern => {
    let score = pattern.priority;

    // Check each role token in the pattern, INCLUDING the ones nested inside
    // optional groups. Scoring only the top level made a slot the pattern
    // really has invisible: every `[for {duration}]` / `[with {style}]` group
    // lives one level down, so a handcrafted pattern without the slot tied
    // with the generated one that has it and won on order — `toggle .loading
    // for 2s` rendered as `alternar .loading` in es/it/pl/ru/uk/vi/zh, the
    // duration dropped in silence.
    //
    // A role inside a group is scored as PRESENT-only: its absence is what
    // "optional" means, and the group's own role tokens are not consistently
    // flagged `optional` (a handcrafted `[en {destination}]` writes the role
    // bare), so reading the flag there would apply the missing-role penalty to
    // a slot that is optional by construction.
    const hasRealRole = (role: string): boolean => hooks.hasRealRole(node, role);
    const scoreTokens = (tokens: readonly PatternToken[], inGroup: boolean): void => {
      for (const token of tokens) {
        if (token.type === 'group') {
          scoreTokens(token.tokens, true);
        } else if (token.type === 'role') {
          if (hasRealRole(token.role)) {
            // Bonus for patterns that use roles we have. A nested slot scores
            // LESS than a top-level one, so carrying an extra optional slot
            // breaks a tie without ever outweighing a top-level difference —
            // measured: at equal weight it also re-ordered the pl behavior
            // handler and three qu positional rows.
            score += inGroup ? NESTED_ROLE_BONUS : 10;
          } else if (!inGroup && !token.optional) {
            // Heavy penalty for patterns that require roles we DON'T have
            // This prevents selecting "source" patterns when there's no source
            score -= 50;
          }
        }
      }
    };
    scoreTokens(pattern.template.tokens, false);

    // A pattern with no slot for a role the node really carries drops it in
    // silence, so it loses to one that renders it. The bonuses above only
    // reward coverage, which let a slot-less pattern win on a top-level-vs-
    // nested difference: once show's patient became optional, zh `显示
    // {patient}` beat the generated `显示 [把 {patient}] [用 {style}]` and
    // `show #modal with *opacity` rendered without its strategy (bn/hi/zh).
    const slots = new Set<string>();
    const collectSlots = (tokens: readonly PatternToken[]): void => {
      for (const token of tokens) {
        if (token.type === 'group') collectSlots(token.tokens);
        else if (token.type === 'role') slots.add(token.role);
      }
    };
    collectSlots(pattern.template.tokens);
    for (const role of node.roles.keys()) {
      if (hasRealRole(role) && !slots.has(role)) score -= UNCOVERED_ROLE_PENALTY;
    }

    // Value-pinned variants. A positional pattern (`put X before Y`, `at end
    // of`, `after`) carries its position as a baked-in literal plus an
    // extraction default that records which value it means:
    //   put-es-before -> extraction.manner.default = 'before'
    //   put-es-at-end -> extraction.manner.default = 'at end of'
    // while the neutral `put-es-full` pins nothing. So the pattern set already
    // says which surface each value selects; scoring just has to read it.
    //
    // The rule: a pattern that pins a role to a literal may be chosen ONLY when
    // the node carries that exact value. Matching is a strong preference (the
    // pinned form is the whole reason the value exists); mismatching — or the
    // node not carrying the role at all — disqualifies it, so a plain
    // `put X into Y` can never render as `poner X en fin de Y`.
    //
    // This replaces an id-regex that penalized every `-at-end|-before|-after`
    // pattern unconditionally. That kept plain puts safe but made the positional
    // forms unreachable: `put "<p>" before me` rendered with the into-pattern in
    // all 23 languages, losing the distinction the source drew.
    for (const [role, rule] of Object.entries(pattern.extraction ?? {})) {
      const pinnedKey = pinnedLiteral(rule);
      if (pinnedKey === undefined) continue;
      const actual = node.roles.get(role);
      // The value as the pattern would produce it: a literal, or an
      // expression where the rule says so (`go back`).
      const actualKey =
        actual?.type === (rule.valueIsExpression ? 'expression' : 'literal')
          ? String(
              actual.type === 'expression'
                ? (actual as { raw?: unknown }).raw
                : (actual as { value?: unknown }).value
            )
              .trim()
              .toLowerCase()
          : undefined;

      if (actualKey === pinnedKey) {
        // The pinned form is the whole reason this value exists — prefer it
        // decisively over the neutral pattern, whatever the parse priorities say.
        score += 60;
      } else if (actualKey === undefined || pinnedValues.get(role)?.has(actualKey)) {
        // Either the node has no such value (so this pattern would invent one:
        // a plain `put X into Y` must never render as `put X at end of Y`), or it
        // has a DIFFERENT value that the pattern set treats as an alternative.
        // Both are wrong surfaces; disqualify.
        score -= 200;
      }
      // Otherwise the node's value is not one of the pinned alternatives, so this
      // pattern is still the best available carrier for it — leave the score alone
      // and let priority and role coverage decide.
    }

    score += hooks.adjustScore?.(pattern, node) ?? 0;

    return { pattern, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored[0]!.pattern : null;
}

/**
 * The parts `node` renders to through `pattern`'s tokens, in order: each
 * literal (unless parse-only), each role's text, each group that is written.
 * The grammar joins them (and adds what the pattern does not model).
 */
export function renderPattern<N extends RenderableNode>(
  node: N,
  pattern: LanguagePattern,
  hooks: PatternRenderHooks<N>
): string[] {
  const parts: string[] = [];
  const language = pattern.language;
  const tokens = pattern.template.tokens;
  for (let i = 0; i < tokens.length; i++) {
    hooks.beforeToken?.(tokens, i, parts, node, language);
    const span = hooks.span?.(tokens, i, node, language, true);
    if (span !== undefined) {
      parts.push(span.text);
      i += span.tokens - 1;
      continue;
    }
    const token = tokens[i]!;
    const rendered = renderPatternToken(token, node, language, hooks);
    if (rendered !== null) {
      pushPart(hooks, parts, rendered, token, tokens[i - 1], node, language);
      hooks.afterToken?.(token, parts.length - 1, node);
    }
  }
  return parts;
}

function pushPart<N extends RenderableNode>(
  hooks: PatternRenderHooks<N>,
  parts: string[],
  text: string,
  token: PatternToken,
  previous: PatternToken | undefined,
  node: N,
  language: string
): void {
  if (hooks.pushPart) hooks.pushPart(parts, text, token, previous, node, language);
  else parts.push(text);
}

/**
 * Render a single pattern token.
 */
function renderPatternToken<N extends RenderableNode>(
  token: PatternToken,
  node: N,
  language: string,
  hooks: PatternRenderHooks<N>
): string | null {
  switch (token.type) {
    case 'literal':
      // Parse-only markers (renderSuppress) consume input but never render —
      // e.g. fetch's `from`, which parses `fetch from /api` yet must be absent
      // from output (`fetch from "/api"` is invalid canonical _hyperscript).
      return token.renderSuppress ? null : token.value;

    case 'role':
      return hooks.writeRole(token, node, language);

    case 'group': {
      // Check if we have all required roles in the group
      const hasRequired = token.tokens
        .filter(t => t.type === 'role' && !t.optional)
        .every(t => node.roles.has((t as RolePatternToken).role));

      if (!hasRequired && token.optional) {
        return null;
      }

      if (hooks.writeGroup && !hooks.writeGroup(token, node, language)) return null;

      const groupParts: string[] = [];
      let hasRoleValue = false;
      for (let i = 0; i < token.tokens.length; i++) {
        const span = hooks.span?.(token.tokens, i, node, language, false);
        if (span !== undefined) {
          groupParts.push(span.text);
          hasRoleValue = true;
          i += span.tokens - 1;
          continue;
        }
        const subToken = token.tokens[i]!;
        const rendered = renderPatternToken(subToken, node, language, hooks);
        if (rendered !== null) {
          pushPart(hooks, groupParts, rendered, subToken, token.tokens[i - 1], node, language);
          if (subToken.type === 'role') hasRoleValue = true;
        }
      }

      // Don't emit an optional group that DECLARES a role slot and did not
      // fill it — e.g. don't emit a dangling "with" when the style role is
      // absent from "hide #output".
      //
      // …unless the group is `renderRequired`: a MARKER wrapped on its own by
      // `profile.markersOptional` (tr, where the case suffix may be dropped
      // colloquially, so the parse side has to accept both forms). Dropping
      // those cost tr every role marker in every rendered command —
      // `add .selected to #item` came out `#item .selected ekle` where the
      // corpus has `#item e .selected i ekle`, and the marker-less surface
      // re-parses as a one-role `add` with the destination defaulted to `me`.
      if (token.optional && !hasRoleValue && !token.renderRequired) return null;

      return groupParts.length > 0 ? groupParts.join(' ') : null;
    }

    default:
      return null;
  }
}
