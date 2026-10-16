/**
 * The pattern matcher's skeleton: the grammar-neutral half of semantic's matcher
 * (domains rethink Phase 4.2-4.3, `docs-internal/DOMAINS_RETHINK.md`).
 *
 * It walks a pattern's literals, groups and role slots against the token
 * stream: literal matching (exact, normalized, stem, case- and
 * diacritic-insensitive, shattered compounds), optional groups with exact
 * rollback and the marker discipline of a postpositional group, the
 * speculative skip of an optional slot, role spans, memoized ranking by
 * priority then confidence, the confidence model, and the extraction rules.
 * Every value is read by the grammar's `ValueReader` (`value-reader.ts`);
 * hyperscript's is `@lokascript/semantic`'s `HyperscriptValueReader`, and its
 * confidence model semantic's `DefaultConfidenceModel`.
 */

import type {
  LanguagePattern,
  PatternToken,
  PatternMatchResult,
  SemanticRole,
  SemanticValue,
  TokenStream,
  LanguageToken,
} from '../types';
import { stripOptionalDiacritics } from '../tokenization/token-utils';
import type { ConfidenceModel } from './confidence-model';
import type { MatchView, ValueReader } from './value-reader';

/** Whether a group binds a role, at any depth. */
function groupHasRole(group: PatternToken & { type: 'group' }): boolean {
  return group.tokens.some(t => t.type === 'role' || (t.type === 'group' && groupHasRole(t)));
}

export class MatchSkeleton {
  /**
   * The pattern tokens still to match after the one being matched, through
   * every enclosing group: a value stops at any marker the pattern still owes.
   */
  private patternRest: PatternToken[] = [];

  /**
   * Whether the role slot being matched directly follows a literal the pattern
   * matched: its marker (`[por {quantity}]`), or the command's verb.
   */
  private slotAfterLiteral = false;

  /** Injectable confidence scoring model (Phase 3.3) */
  private readonly confidenceModel: ConfidenceModel;

  /**
   * Selective memoization cache (Phase 6.1).
   * Caches pattern match results keyed by `tokenPosition:patternId`.
   * Cleared before each top-level matchBest() call.
   */
  private matchCache = new Map<string, PatternMatchResult | null>();

  /**
   * Stream index where each role's capture began, for the current
   * `matchPattern` call. Rebuilt per call, written on the same success path as
   * `captured` — see `PatternMatchResult.roleStarts`.
   */
  private roleStarts = new Map<SemanticRole, number>();

  /** The grammar's value reading: every role slot, and the grammar's hooks. */
  private readonly reader: ValueReader;

  /**
   * @param makeReader - builds the grammar's reader, handed this matcher's view
   *   of the match in progress (one reader per matcher).
   */
  constructor(makeReader: (view: MatchView) => ValueReader, confidenceModel: ConfidenceModel) {
    this.confidenceModel = confidenceModel;
    this.reader = makeReader({
      patternRest: () => this.patternRest,
      slotAfterLiteral: () => this.slotAfterLiteral,
      wouldMatch: (pt, token) => this.patternTokenWouldMatch(pt, token),
    });
  }

  /**
   * Try to match a single pattern against the token stream.
   * Returns the match result or null if no match.
   */
  matchPattern(tokens: TokenStream, pattern: LanguagePattern): PatternMatchResult | null {
    const mark = tokens.mark();
    const captured = new Map<SemanticRole, SemanticValue>();

    this.reader.beginPattern(pattern);

    // Reset match counters for this pattern
    this.stemMatchCount = 0;
    this.totalKeywordMatches = 0;
    this.roleStarts = new Map();

    this.patternRest = [];
    const success = this.matchTokenSequence(tokens, pattern.template.tokens, captured);

    if (!success) {
      tokens.reset(mark);
      return null;
    }

    // Calculate confidence BEFORE applying defaults
    // This ensures defaulted roles don't artificially inflate confidence
    const confidence = this.confidenceModel.calculate({
      pattern,
      captured,
      stemMatchCount: this.stemMatchCount,
      totalKeywordMatches: this.totalKeywordMatches,
    });

    // Apply extraction rules to fill in any missing roles with defaults
    this.applyExtractionRules(pattern, captured);

    return {
      pattern,
      captured,
      consumedTokens: tokens.position() - mark.position,
      confidence,
      roleStarts: this.roleStarts,
      ...this.reader.resultFields?.(),
    };
  }

  /**
   * Try to match multiple patterns, return the best match.
   */
  matchBest(tokens: TokenStream, patterns: LanguagePattern[]): PatternMatchResult | null {
    // Clear memoization cache for this matching round (Phase 6.1)
    this.matchCache.clear();

    const matches: PatternMatchResult[] = [];
    const startPos = tokens.position();

    for (const pattern of patterns) {
      const mark = tokens.mark();

      // Check memoization cache (Phase 6.1)
      const cacheKey = `${startPos}:${pattern.id}`;
      let result: PatternMatchResult | null;

      if (this.matchCache.has(cacheKey)) {
        result = this.matchCache.get(cacheKey)!;
      } else {
        result = this.matchPattern(tokens, pattern);
        this.matchCache.set(cacheKey, result);
      }

      if (result) {
        matches.push(result);
      }

      tokens.reset(mark);
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by confidence and priority
    matches.sort((a, b) => {
      // First by priority
      const priorityDiff = b.pattern.priority - a.pattern.priority;
      if (priorityDiff !== 0) return priorityDiff;

      // Then by confidence
      return b.confidence - a.confidence;
    });

    // Re-consume tokens for the best match
    const best = matches[0];
    this.matchPattern(tokens, best.pattern);

    return best;
  }

  /**
   * Match a sequence of pattern tokens against the token stream.
   */
  private matchTokenSequence(
    tokens: TokenStream,
    patternTokens: PatternToken[],
    captured: Map<SemanticRole, SemanticValue>,
    // What follows the sequence itself — a GROUP's last inner token must see the
    // token after the group as its `next` (the trailing-slot verb guard in
    // matchRoleToken keys on nextPatternToken === undefined meaning "pattern
    // truly ends here", and a mid-pattern single-token group is not the end).
    nextAfterSequence?: PatternToken
  ): boolean {
    this.reader.skipLeading?.(tokens, patternTokens);

    for (let i = 0; i < patternTokens.length; i++) {
      const patternToken = patternTokens[i];

      this.reader.beforePatternToken?.(tokens, patternTokens, i, captured);

      // Marker-less optional slot about to eat a command VERB, mid-pattern.
      //
      // The reader's own guard (hyperscript's matchRoleToken) skips such a slot only when the pattern's
      // very next token is a literal the verb itself satisfies. Where an
      // OPTIONAL group sits between the slot and the verb literal
      // (`[{method}] [using view {manner}] 交換`) that test looks at the
      // group's first token, sees no match, and lets the slot swallow the verb
      // — so `swap #a with #b` rendered SOV (`#a に #b を 交換`) did not parse
      // at all in bn/hi/ja/ko/qu/tr.
      //
      // Widening that test to look THROUGH skippable groups was measured to
      // work and to BREAK the ja goal-reclaim lock: the no-goal transition
      // variant's mid-pattern slot must keep capturing 遷移 and failing, so the
      // verb-anchoring fallback can reclaim goal+duration. Both shapes are
      // structurally identical at the slot, so no per-slot test can separate
      // them.
      //
      // What separates them is the OUTCOME. Skipping the slot lets swap's
      // pattern consume its clause ENTIRELY (`#a に #b を 交換` → end), while
      // the ja no-goal variant completes having eaten only `opacity を 遷移`
      // and STRANDS `0 に 300ms` — the sloppy match the lock exists to prevent.
      // So: speculatively skip, match the rest of THIS pattern, and adopt the
      // skip only when it consumes the whole clause. A stranded tail falls
      // through to the capture-and-fail below, unchanged.
      //
      // Bounded: fires only on an optional marker-less role slot facing a
      // command-verb keyword the next pattern token does not want, and recurses
      // on a strictly shorter token list — never a re-run of other patterns
      // (the abandoned last-resort retry in matchBest, which compounded).
      if (
        this.reader.maySkipSlot(
          patternToken,
          tokens.peek(),
          patternTokens[i + 1] ?? nextAfterSequence
        )
      ) {
        const skipMark = tokens.mark();
        const speculative = new Map(captured);
        if (
          this.matchTokenSequence(
            tokens,
            patternTokens.slice(i + 1),
            speculative,
            nextAfterSequence
          ) &&
          this.reader.atClauseEnd(tokens)
        ) {
          captured.clear();
          for (const [role, value] of speculative) captured.set(role, value);
          return true;
        }
        tokens.reset(skipMark);
      }

      const outerRest = this.patternRest;
      this.patternRest = [...patternTokens.slice(i + 1), ...outerRest];
      this.slotAfterLiteral =
        patternToken.type === 'role' && patternTokens[i - 1]?.type === 'literal';
      const matched = this.matchPatternToken(
        tokens,
        patternToken,
        captured,
        patternTokens[i + 1] ?? nextAfterSequence
      );
      this.patternRest = outerRest;

      if (!matched) {
        // If token is optional, continue
        if (this.isOptional(patternToken)) {
          continue;
        }
        return false;
      }
    }

    return true;
  }

  /**
   * Match a single pattern token against the current position in the stream.
   */
  private matchPatternToken(
    tokens: TokenStream,
    patternToken: PatternToken,
    captured: Map<SemanticRole, SemanticValue>,
    nextPatternToken?: PatternToken
  ): boolean {
    switch (patternToken.type) {
      case 'literal':
        return this.matchLiteralToken(tokens, patternToken);

      case 'role': {
        // Record where this slot's own span begins, but only once it actually
        // captured — an optional role that matched nothing must not claim a
        // position. See `PatternMatchResult.roleStarts`.
        const roleStart = tokens.position();
        const matchedRole = this.reader.readRole(tokens, patternToken, captured, nextPatternToken);
        if (matchedRole && captured.has(patternToken.role)) {
          this.roleStarts.set(patternToken.role, roleStart);
        }
        return matchedRole;
      }

      case 'group':
        return this.matchGroupToken(tokens, patternToken, captured, nextPatternToken);

      default:
        return false;
    }
  }

  /**
   * Match a literal pattern token (keyword or particle).
   */
  private matchLiteralToken(
    tokens: TokenStream,
    patternToken: PatternToken & { type: 'literal' }
  ): boolean {
    const token = tokens.peek();
    if (!token) return false;

    // Check main value
    const matchType = this.getMatchType(token, patternToken.value);
    if (matchType !== 'none') {
      this.totalKeywordMatches++;
      if (matchType === 'stem') {
        this.stemMatchCount++;
      }
      tokens.advance();
      return true;
    }

    // Check alternatives
    if (patternToken.alternatives) {
      for (const alt of patternToken.alternatives) {
        const altMatchType = this.getMatchType(token, alt);
        if (altMatchType !== 'none') {
          this.totalKeywordMatches++;
          if (altMatchType === 'stem') {
            this.stemMatchCount++;
          }
          tokens.advance();
          return true;
        }
      }
    }

    // Hyphen/underscore-compound fold: many keyword translations are compounds
    // (ms `titik-henti`, es `punto-interrupción`, ru `по_умолчанию`,
    // qu `ñawpaq_kaq`) that the tokenizers shatter into word/sep/word runs —
    // and a segment can be ANOTHER command's keyword (ms `henti` → halt,
    // qu `ñawpaq` → first), so the run mis-anchors that command instead.
    // Join the run and compare it to any separator-bearing expected value;
    // only fires after every single-token match above has failed.
    for (const value of [patternToken.value, ...(patternToken.alternatives ?? [])]) {
      for (const sep of ['-', '_'] as const) {
        if (value.includes(sep) && this.tryMatchShatteredCompound(tokens, value, sep)) {
          this.totalKeywordMatches++;
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Match a compound keyword (`titik-henti`, `по_умолчанию`) against a
   * shattered token run (`titik` `-` `henti` / `по` `_` `умолчанию`): word
   * segments must be identifier/keyword/particle tokens equal to the expected
   * segments (case-insensitive; particle because prepositions like ru `по` /
   * uk `за` lead some underscore compounds), separators lone `sep` tokens.
   * Consumes the run on success, resets the stream on failure.
   */
  private tryMatchShatteredCompound(
    tokens: TokenStream,
    expected: string,
    sep: '-' | '_'
  ): boolean {
    const segments = expected.split(sep);
    if (segments.length < 2 || segments.some(s => s.length === 0)) return false;
    const mark = tokens.mark();
    for (let i = 0; i < segments.length; i++) {
      if (i > 0) {
        const sepToken = tokens.peek();
        if (!sepToken || sepToken.value !== sep) {
          tokens.reset(mark);
          return false;
        }
        tokens.advance();
      }
      const word = tokens.peek();
      if (
        !word ||
        (word.kind !== 'identifier' && word.kind !== 'keyword' && word.kind !== 'particle') ||
        word.value.toLowerCase() !== segments[i]!.toLowerCase()
      ) {
        tokens.reset(mark);
        return false;
      }
      tokens.advance();
    }
    return true;
  }

  /**
   * Match a group pattern token (optional sequence).
   */
  private matchGroupToken(
    tokens: TokenStream,
    patternToken: PatternToken & { type: 'group' },
    captured: Map<SemanticRole, SemanticValue>,
    nextPatternToken?: PatternToken
  ): boolean {
    const mark = tokens.mark();

    // Snapshot the captured roles' VALUES, not just their keys. Clearing only
    // the newly-added keys leaves an OVERWRITE by a failed group in place.
    //
    // 90 shipped patterns bind one role in TWO optional groups — every
    // `<cmd>-event-<lang>-sov` has a pre-verb `[{destination} <marker>]` and a
    // post-verb one, because the transformer emits the to-phrase on either side
    // depending on the command. When the trailing group speculatively captures
    // the next token into that role and then fails on its marker, the token
    // stream rolls back but the corrupted value survives: ja
    // `クリック で #panel に .active を トグル ゴミ` returned
    // `destination="ゴミ"` with the real `#panel` captured and discarded.
    const capturedBefore = new Map(captured);

    let success = this.matchTokenSequence(tokens, patternToken.tokens, captured, nextPatternToken);

    // A group that read its marker and bound no role (`take .foo from .div for
    // #d3`: `for` matched, and the recipient slot declined `#d3`) took a word
    // that now stands for nothing, and the clause after it lost its head.
    if (
      success &&
      tokens.position() > mark.position &&
      groupHasRole(patternToken) &&
      [...captured].every(([role, value]) => capturedBefore.get(role) === value) &&
      captured.size === capturedBefore.size
    ) {
      success = false;
    }

    // A postpositional marker group ([{destination} [e]]) can "succeed" by
    // capturing ONLY the role: the role is optional-in-group, the trailing
    // marker sub-group is optional too, so `.loading i 2s değiştir` binds
    // `.loading` as the DESTINATION and the pattern then dies on `patient` —
    // with no backtracking, the whole (correct) parse is lost. A role captured
    // without its own marker is indistinguishable from the next slot's value,
    // so require the marker: if this group added a role capture but none of
    // the tokens it consumed matched a `renderRequired` marker sub-group's
    // literal, fail the group and roll back — the value stays available for
    // the slot that really owns it. Scoped to groups that carry a
    // renderRequired literal-only sub-group (the generated postpositional
    // shape); prepositional groups ([จาก {source}]) fail fast on their leading
    // literal and never reach this.
    //
    // The marker is the group's LAST token: the sub-group follows the role. A
    // marker word inside the role's own run is the value's, not the role's
    // marker: tr `in` is also the operator (`2 dir in arr`), `a` the article
    // (`id dir a Number`), `nin` the possessive (`length nin textContent nin
    // #a < 4`). Counted anywhere, they let the unmarked destination take an
    // `if` condition's tail, so `if 2 is in arr add .a end` read `if 2 add .a
    // to is in arr end` (P54).
    if (success) {
      const markerLiterals: string[] = [];
      for (const inner of patternToken.tokens) {
        if (inner.type === 'group' && (inner as { renderRequired?: boolean }).renderRequired) {
          for (const t of inner.tokens) {
            if (t.type === 'literal') markerLiterals.push(t.value, ...(t.alternatives ?? []));
          }
        }
      }
      if (markerLiterals.length > 0) {
        const addedRole = [...captured.keys()].some(role => !capturedBefore.has(role));
        if (addedRole) {
          const last = tokens.tokens[tokens.position() - 1] as LanguageToken | undefined;
          const markerSeen =
            last !== undefined &&
            tokens.position() > mark.position &&
            markerLiterals.some(lit => this.getMatchType(last, lit) !== 'none');
          if (!markerSeen) success = false;
        }
      }
    }

    if (!success) {
      tokens.reset(mark);
      // Restore the pre-group capture state exactly: drop roles the failed group
      // added, and put back the values it overwrote.
      for (const role of captured.keys()) {
        if (!capturedBefore.has(role)) {
          captured.delete(role);
        }
      }
      for (const [role, value] of capturedBefore) {
        if (captured.get(role) !== value) {
          captured.set(role, value);
        }
      }
      return patternToken.optional || false;
    }

    return true;
  }

  /**
   * Whether a pattern token (literal, or a group starting with a literal) would
   * match the given stream token. Used to keep the event-head source-clause
   * consumption from stealing a marker the pattern explicitly expects.
   */
  private patternTokenWouldMatch(pt: PatternToken | undefined, token: LanguageToken): boolean {
    if (!pt) return false;
    if (pt.type === 'literal') {
      if (this.getMatchType(token, pt.value) !== 'none') return true;
      return !!pt.alternatives?.some(a => this.getMatchType(token, a) !== 'none');
    }
    if (pt.type === 'group') {
      return this.patternTokenWouldMatch(pt.tokens?.[0], token);
    }
    return false;
  }

  /**
   * Get the type of match for a token against a value.
   * Used for confidence calculation.
   */
  private getMatchType(
    token: LanguageToken,
    value: string
  ): 'exact' | 'normalized' | 'stem' | 'case-insensitive' | 'none' {
    // Exact match (highest confidence)
    if (token.value === value) return 'exact';

    // Explicit keyword map normalized match (high confidence)
    if (token.normalized === value) return 'normalized';

    // Morphologically normalized stem match (medium-high confidence)
    // Only accept if stem confidence is reasonable
    if (token.stem === value && token.stemConfidence !== undefined && token.stemConfidence >= 0.7) {
      return 'stem';
    }

    // Case-insensitive match for keywords (medium confidence)
    if (token.kind === 'keyword' && token.value.toLowerCase() === value.toLowerCase()) {
      return 'case-insensitive';
    }

    // Diacritic-insensitive match for keywords (medium confidence). Arabic
    // harakat are OPTIONAL in the script — `بدّل` and `بَدِّل` are the same word,
    // and a pattern literal carries whichever spelling the profile declared. The
    // keyword map is queried diacritic-insensitively, so the token is correctly
    // recognized; without this the surface still fails to match its own literal
    // here, one layer later. Restricted to keywords, and `stripOptionalDiacritics`
    // touches only Arabic-exclusive codepoints, so it is inert for every other
    // script (Latin accents are meaning-bearing and must never be stripped).
    if (token.kind === 'keyword') {
      const strippedToken = stripOptionalDiacritics(token.value).toLowerCase();
      if (strippedToken && strippedToken === stripOptionalDiacritics(value).toLowerCase()) {
        return 'case-insensitive';
      }
    }

    return 'none';
  }

  /**
   * Track stem matches for confidence calculation.
   * This is set during matching and read during confidence calculation.
   */
  private stemMatchCount: number = 0;

  private totalKeywordMatches: number = 0;

  /**
   * Apply extraction rules to fill in static values and defaults for missing
   * roles, and re-shape captured roles that declare a `transform` (the
   * ExtractionRule field was documented but unwired — go-qu-url-dest is the
   * first consumer: it re-types the marker-bound capture to the expression
   * shape the en reference produces).
   */
  private applyExtractionRules(
    pattern: LanguagePattern,
    captured: Map<SemanticRole, SemanticValue>
  ): void {
    for (const [role, rule] of Object.entries(pattern.extraction)) {
      const existing = captured.get(role as SemanticRole);
      if (existing) {
        if (rule.transform) {
          const raw =
            existing.type === 'literal'
              ? String(existing.value)
              : String((existing as { raw?: unknown }).raw ?? '');
          captured.set(role as SemanticRole, rule.transform(raw));
        }
      } else if (rule.value !== undefined) {
        // Static value extraction (e.g., action: { value: "toggle" })
        captured.set(
          role as SemanticRole,
          rule.valueIsExpression
            ? { type: 'expression', raw: rule.value }
            : { type: 'literal', value: rule.value }
        );
      } else if (rule.default) {
        // Copied, never aliased (the rule's default object is shared across
        // parses), and tagged implicit: materialized from the default, not
        // captured from source text — renderers suppress implicit values only.
        // (`implicit` is semantic's value field; intent's value type has none.)
        const implicitDefault: SemanticValue & { readonly implicit: true } = {
          ...rule.default,
          implicit: true,
        };
        captured.set(role as SemanticRole, implicitDefault);
      }
    }
  }

  /**
   * Check if a pattern token is optional.
   */
  private isOptional(patternToken: PatternToken): boolean {
    return patternToken.type !== 'literal' && patternToken.optional === true;
  }
}
