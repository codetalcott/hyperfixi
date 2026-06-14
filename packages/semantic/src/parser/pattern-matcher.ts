/**
 * Pattern Matcher
 *
 * Matches tokenized input against language patterns to extract semantic roles.
 * This is the core algorithm for multilingual parsing.
 */

import type {
  LanguagePattern,
  PatternToken,
  PatternMatchResult,
  ReferenceValue,
  SemanticRole,
  SemanticValue,
  TokenStream,
  LanguageToken,
} from '../types';
import {
  createSelector,
  createLiteral,
  createReference,
  createPropertyPath,
  isValidReference,
} from '../types';
import { isTypeCompatible } from './utils/type-validation';
import { commandSchemas } from '../generators/command-schemas';
import { getPossessiveReference } from './utils/possessive-keywords';
import type { LanguageProfile } from '../generators/profiles/types';
import { tryGetProfile } from '../registry';
import { isAtEndConnective } from '../patterns/put';
import type { ConfidenceModel } from './confidence-model';
import { defaultConfidenceModel } from './confidence-model';

// =============================================================================
// Pattern Matcher
// =============================================================================

export class PatternMatcher {
  /** Current language profile for the pattern being matched */
  private currentProfile: LanguageProfile | undefined;
  /** Injectable confidence scoring model (Phase 3.3) */
  private readonly confidenceModel: ConfidenceModel;
  /**
   * Selective memoization cache (Phase 6.1).
   * Caches pattern match results keyed by `tokenPosition:patternId`.
   * Cleared before each top-level matchBest() call.
   */
  private matchCache = new Map<string, PatternMatchResult | null>();

  constructor(confidenceModel?: ConfidenceModel) {
    this.confidenceModel = confidenceModel ?? defaultConfidenceModel;
  }

  /**
   * Try to match a single pattern against the token stream.
   * Returns the match result or null if no match.
   */
  matchPattern(tokens: TokenStream, pattern: LanguagePattern): PatternMatchResult | null {
    const mark = tokens.mark();
    const captured = new Map<SemanticRole, SemanticValue>();

    // Get language profile for possessive keyword lookup
    this.currentProfile = tryGetProfile(pattern.language);

    // Reset match counters for this pattern
    this.stemMatchCount = 0;
    this.totalKeywordMatches = 0;

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
    captured: Map<SemanticRole, SemanticValue>
  ): boolean {
    // Skip leading conjunctions for Arabic (proclitics: و, ف, ول, وب, etc.)
    // BUT NOT if the pattern explicitly expects a conjunction (proclitic patterns)
    const firstPatternToken = patternTokens[0];
    const patternExpectsConjunction =
      firstPatternToken?.type === 'literal' &&
      (firstPatternToken.value === 'and' ||
        firstPatternToken.value === 'then' ||
        firstPatternToken.alternatives?.includes('and') ||
        firstPatternToken.alternatives?.includes('then'));

    if (this.currentProfile?.code === 'ar' && !patternExpectsConjunction) {
      while (tokens.peek()?.kind === 'conjunction') {
        tokens.advance();
      }
    }

    // Source-clause window: after the event role matches, the next 1–2 pattern
    // tokens may be preceded in the stream by a source clause the fused
    // patterns have no slot for — `gdy keydown[…] z .modal jeśli …` (marker
    // BEFORE: pl z / uk з / zh 从) or `keydown[…] de .modal den eğer …`
    // (marker AFTER: ja から / ko 에서 / bn থেকে / hi से / tr den). The window
    // spans 2 pattern tokens because SOV emissions put the clause after the
    // event-marker literal, not directly after the event. See
    // tryConsumeEventSourceClause for the guards.
    let sourceWindow = 0;

    for (let i = 0; i < patternTokens.length; i++) {
      const patternToken = patternTokens[i];

      if (sourceWindow > 0 && patternToken.type === 'literal') {
        this.tryConsumeEventSourceClause(tokens, captured, patternToken);
      }

      const matched = this.matchPatternToken(tokens, patternToken, captured, patternTokens[i + 1]);

      sourceWindow =
        patternToken.type === 'role' && patternToken.role === 'event'
          ? 2
          : Math.max(0, sourceWindow - 1);

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
   * Consume a source clause (`<marker> <selector>` or `<selector> <marker>`,
   * per the profile's source-marker position) sitting between the event head
   * and the next pattern literal. Fired only inside the post-event window and
   * only when the upcoming literal does NOT match the stream position — a
   * pattern that explicitly handles the marker (`bei {event} von {source}`)
   * is left alone, and a failing consumption is harmless because matchPattern
   * resets the stream on failure.
   */
  private tryConsumeEventSourceClause(
    tokens: TokenStream,
    captured: Map<SemanticRole, SemanticValue>,
    upcoming: PatternToken & { type: 'literal' }
  ): void {
    if (captured.has('source')) return;
    const tok0 = tokens.peek();
    const tok1 = tokens.peek(1);
    if (!tok0 || !tok1) return;
    // The pattern explicitly expects this token next — leave it alone.
    if (this.patternTokenWouldMatch(upcoming, tok0)) return;

    const src = this.currentProfile?.roleMarkers?.source;
    const isMarker = (t: LanguageToken): boolean => {
      if (t.kind !== 'particle' && t.kind !== 'keyword') return false;
      if ((t.normalized ?? '').toLowerCase() === 'source') return true;
      if (!src) return false;
      const v = t.value.toLowerCase();
      if (src.primary?.toLowerCase() === v) return true;
      return !!src.alternatives?.some(a => a.toLowerCase() === v);
    };
    const position = src?.position;

    // Prepositional `from .modal` (pl z, uk з, zh 从, de von, sw kutoka).
    if (position !== 'after' && isMarker(tok0) && tok1.kind === 'selector') {
      tokens.advance();
      const v = this.tokenToSemanticValue(tokens.advance());
      if (v) captured.set('source', v);
      return;
    }
    // Postpositional `.modal から` (ja から, ko 에서, bn থেকে, hi से, tr den).
    if (position === 'after' && tok0.kind === 'selector' && isMarker(tok1)) {
      const v = this.tokenToSemanticValue(tok0);
      tokens.advance();
      tokens.advance();
      if (v) captured.set('source', v);
    }
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

      case 'role':
        return this.matchRoleToken(tokens, patternToken, captured, nextPatternToken);

      case 'group':
        return this.matchGroupToken(tokens, patternToken, captured);

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

    return false;
  }

  /**
   * Match a role pattern token (captures a semantic value).
   * Handles multi-token expressions like:
   * - 'my value' (possessive keyword + property)
   * - '#dialog.showModal()' (method call)
   * - "#element's *opacity" (possessive selector + property)
   */
  private matchRoleToken(
    tokens: TokenStream,
    patternToken: PatternToken & { type: 'role' },
    captured: Map<SemanticRole, SemanticValue>,
    nextPatternToken?: PatternToken
  ): boolean {
    // Skip noise words like "the" before selectors (English idiom support)
    this.skipNoiseWords(tokens);

    const token = tokens.peek();
    if (!token) {
      return patternToken.optional || false;
    }

    // A `duration` slot is never a positional/scope keyword. The temporal
    // `in {duration}` idiom (`in 2s`) otherwise greedily swallows a *locative*
    // `in closest <form/>` (the scope of `focus first <input/> in closest <form/>`)
    // and spuriously emits a `wait` — which corrupted the English *reference* parse
    // (`focus first … in closest …` → {focus, wait}) and made first-in-parent /
    // focus-trap read as lossy in every other language. `closest` tokenizes as a
    // `literal` (same type as `2s`), so this keyword guard is the disambiguator.
    if (patternToken.role === 'duration') {
      const norm = (token.normalized ?? token.value).toLowerCase();
      if (PatternMatcher.POSITIONAL_OR_SCOPE_KEYWORDS.has(norm)) {
        return patternToken.optional || false;
      }
    }

    // Check for a positional query expression (e.g., 'last <.message/> in #chat',
    // 'first <button/> in .modal'). Triggered only when the role starts with a
    // positional keyword, so non-positional roles are unaffected.
    const positionalValue = this.tryMatchPositionalExpression(tokens);
    if (positionalValue) {
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        if (!isTypeCompatible(positionalValue.type, patternToken.expectedTypes)) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, positionalValue);
      return true;
    }

    // Check for a caret-scoped variable read (e.g. `^count on #host` — a
    // DOM-scoped `^name` variable read from a specific element). The `^` prefix
    // disambiguates this `on` from the event/destination `on`, so a normal
    // `toggle .active on #button` (selector patient) is never affected. Folds
    // `^name on <element>` into one expression value so a following destination
    // (`into me`) still matches.
    const caretScopeValue = this.tryMatchCaretScopeExpression(tokens);
    if (caretScopeValue) {
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        if (!isTypeCompatible(caretScopeValue.type, patternToken.expectedTypes)) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, caretScopeValue);
      return true;
    }

    // Check for an "of"-possessive expression (e.g. "*--primary-color of #theme",
    // AR "*--primary-color من #theme", TL "*--primary-color ng #theme"). Gated to
    // roles that opt into property-path (currently `set`'s destination), so the
    // "of"/source marker can't be confused with a real source role on other
    // commands (e.g. `get data from #input`).
    if (patternToken.expectedTypes?.includes('property-path')) {
      const ofPossessive = this.tryMatchOfPossessiveExpression(tokens);
      if (ofPossessive) {
        captured.set(patternToken.role, ofPossessive);
        return true;
      }
    }

    // Check for possessive expression (e.g., 'my value', 'its innerHTML')
    const possessiveValue = this.tryMatchPossessiveExpression(tokens);
    if (possessiveValue) {
      // Validate expected types if specified
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        if (
          !patternToken.expectedTypes.includes(possessiveValue.type) &&
          !patternToken.expectedTypes.includes('expression')
        ) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, possessiveValue);
      return true;
    }

    // Check for method call expression (e.g., '#dialog.showModal()')
    const methodCallValue = this.tryMatchMethodCallExpression(tokens);
    if (methodCallValue) {
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        if (
          !patternToken.expectedTypes.includes(methodCallValue.type) &&
          !patternToken.expectedTypes.includes('expression')
        ) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, methodCallValue);
      return true;
    }

    // Check for possessive selector expression (e.g., "#element's *opacity")
    const possessiveSelectorValue = this.tryMatchPossessiveSelectorExpression(tokens);
    if (possessiveSelectorValue) {
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        // property-path is compatible with selector, reference, and expression
        if (!isTypeCompatible(possessiveSelectorValue.type, patternToken.expectedTypes)) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, possessiveSelectorValue);
      return true;
    }

    // Check for property access expression (e.g., 'userData.name', 'it.data')
    const propertyAccessValue = this.tryMatchPropertyAccessExpression(tokens);
    if (propertyAccessValue) {
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        if (
          !patternToken.expectedTypes.includes(propertyAccessValue.type) &&
          !patternToken.expectedTypes.includes('expression')
        ) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, propertyAccessValue);
      return true;
    }

    // Check for selector + property expression (e.g., '#output.innerText')
    // This handles cases where the tokenizer produces two selector tokens
    const selectorPropertyValue = this.tryMatchSelectorPropertyExpression(tokens);
    if (selectorPropertyValue) {
      if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
        if (!isTypeCompatible(selectorPropertyValue.type, patternToken.expectedTypes)) {
          return patternToken.optional || false;
        }
      }
      captured.set(patternToken.role, selectorPropertyValue);
      return true;
    }

    // Attribute selectors (`@attr`) tokenize with kind `identifier`, not
    // `selector` — and that kind is load-bearing: roles like bind's `@property`
    // (expectedTypes ['reference','expression']) rely on the identifier reading.
    // But when a role *explicitly expects a selector* (e.g. add/remove/toggle's
    // patient), an `@`-identifier is an attribute selector — so convert it here,
    // gated on the role opting into `selector`. This lets `add @disabled to
    // <button/>` fill its patient without disturbing the non-selector @-roles.
    if (
      token.kind === 'identifier' &&
      token.value.startsWith('@') &&
      patternToken.expectedTypes?.includes('selector')
    ) {
      captured.set(patternToken.role, createSelector(token.value));
      tokens.advance();
      return true;
    }

    // Try to extract a semantic value from the token
    const value = this.tokenToSemanticValue(token);
    if (!value) {
      return patternToken.optional || false;
    }

    // Validate expected types if specified
    if (patternToken.expectedTypes && patternToken.expectedTypes.length > 0) {
      if (!patternToken.expectedTypes.includes(value.type)) {
        return patternToken.optional || false;
      }
    }

    captured.set(patternToken.role, value);
    tokens.advance();

    // Event-head tolerance: a bracket key-filter and/or a prepositional source
    // clause can trail the event token (`keydown` + `[key=="Tab"]` — the
    // tokenizer splits them — then `von .modal`). Fused event patterns
    // (`<marker> {event} <verb> …`) expect the wrapped command's verb right
    // after the event role, so without consuming these the whole fused match
    // fails and the input falls to a plain event pattern whose body re-parse
    // drops the wrapped block command (focus-trap's `if` across de/it/es/fr/pt).
    // Mirrors the bracket-filter skip already in the SOV/mid-stream extractors.
    if (patternToken.role === 'event') {
      const filterTok = tokens.peek();
      if (
        filterTok &&
        filterTok.kind === 'selector' &&
        filterTok.value.startsWith('[') &&
        'value' in value
      ) {
        // Fold the filter back onto the event value (the tokenizer split it off).
        captured.set(patternToken.role, createLiteral(`${String(value.value)}${filterTok.value}`));
        tokens.advance();
      }
      // `<source-marker> <element>` (`von .modal` / `kutoka .modal` / `from window`).
      // Skipped when the pattern itself expects the marker next (e.g. the
      // handcrafted `event-de-bei-source` carries an explicit `von {source}`).
      const srcMarker = tokens.peek();
      if (
        srcMarker &&
        (srcMarker.kind === 'particle' || srcMarker.kind === 'keyword') &&
        (srcMarker.normalized ?? '').toLowerCase() === 'source' &&
        !this.patternTokenWouldMatch(nextPatternToken, srcMarker)
      ) {
        const srcValueTok = tokens.peek(1);
        if (srcValueTok && (srcValueTok.kind === 'selector' || srcValueTok.kind === 'identifier')) {
          tokens.advance(); // the source marker
          const srcValue = this.tokenToSemanticValue(tokens.advance());
          if (srcValue && !captured.has('source')) {
            captured.set('source', srcValue);
          }
        }
      }
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
   * Positional query keywords (English + normalized forms produced by the
   * tokenizers for every language, e.g. AR آخر→last, TL huli→last).
   * `closest` is included: `closest <sel>` is the ancestor-scope query form
   * (`hide closest .modal`, `toggle .x on closest .card`) and folds to the
   * same call-expression shape the runtime's positional expressions evaluate
   * (the expression-parser positional fold). Without it the patient/destination
   * role rejected the keyword and the whole command dropped from event bodies.
   */
  private static readonly POSITIONAL_KEYWORDS = new Set([
    'first',
    'last',
    'next',
    'previous',
    'random',
    'closest',
  ]);

  /**
   * Positional + DOM-scope keywords that must never fill a `duration` slot (see the
   * guard in matchRoleToken). Superset of POSITIONAL_KEYWORDS plus the scope words
   * (`closest`, `parent`) that lead a locative `in <scope>`.
   */
  private static readonly POSITIONAL_OR_SCOPE_KEYWORDS = new Set([
    'first',
    'last',
    'next',
    'previous',
    'random',
    'closest',
    'parent',
  ]);

  /**
   * Reference bases that can lead a fused-dot property access (`it.value`,
   * `event.detail.message`, `my.innerHTML`). Command verbs are deliberately
   * excluded so `<verb> .class` (toggle .active) is never read as a property
   * path. The corpus uses the English reference forms (they pass through the
   * transformer verbatim); plain identifiers are handled separately.
   */
  private static readonly PROPERTY_ACCESS_BASES = new Set([
    'it',
    'me',
    'you',
    'my',
    'its',
    'your',
    'event',
    'result',
    'target',
    'detail',
    'body',
    'window',
    'document',
    'self',
    'this',
  ]);

  /**
   * Normalized command-action keywords (the schema registry's action names).
   * Tokenizers normalize every language's command verbs to these forms, so the
   * set is language-independent. Used to keep the positional source clause
   * from consuming a following command's verb as a locative marker.
   */
  private static readonly COMMAND_ACTION_KEYWORDS = new Set(
    Object.keys(commandSchemas).map(a => a.toLowerCase())
  );

  /**
   * Try to match a positional query expression:
   *   <positional> <selector> [<in/from-marker> <source-selector>]
   * e.g. "last <.message/> in #chat", "first <button/> in .modal", "آخر <.message/> في #chat".
   *
   * Only fires when the role begins with a positional keyword, so ordinary
   * roles are untouched. The whole construct is captured as a single
   * expression value (the harness/AST treats positional queries as
   * expressions). The optional source clause consumes exactly one
   * `<marker> <selector>` pair, which is safe because positional queries are
   * terminal in their role (e.g. scroll's only role is the destination).
   */
  private tryMatchPositionalExpression(tokens: TokenStream): SemanticValue | null {
    const token = tokens.peek();
    if (!token) return null;

    const norm = (token.normalized ?? token.value).toLowerCase();
    if (
      !PatternMatcher.POSITIONAL_KEYWORDS.has(norm) &&
      !PatternMatcher.POSITIONAL_KEYWORDS.has(token.value.toLowerCase())
    ) {
      return null;
    }

    const mark = tokens.mark();
    // The captured `raw` is evaluated by the core's English positional
    // expression parser (`next(...)`, `closest(...)`), so the positional KEYWORD
    // must be its normalized English form — a source-language keyword
    // (`cercano`, `次`, `التالي`) is unevaluable as-is and the runtime either
    // errors, drops to `me`, or matches every element. Same idiom as the
    // conditional fold's joinTokenText (semantic-parser): keyword/marker tokens
    // contribute their normalized form; selectors/identifiers are code and keep
    // their surface value (for en the two are identical).
    const parts: string[] = [token.normalized ?? token.value];
    tokens.advance();

    // Required: the queried selector (e.g. <.message/>, .message, <button/>).
    const sel = tokens.peek();
    if (!sel || sel.kind !== 'selector') {
      tokens.reset(mark);
      return null;
    }
    parts.push(sel.value);
    tokens.advance();

    // Optional member access on the queried element: `.value`, `.textContent`
    // (`previous <input/>.value`). The tokenizer emits these as `.`-prefixed
    // selector tokens; fold them into the expression so the whole lvalue is one
    // value.
    let memberGuard = 0;
    while (memberGuard++ < 8) {
      const member = tokens.peek();
      if (member && member.kind === 'selector' && member.value.startsWith('.')) {
        parts.push(member.value);
        tokens.advance();
      } else {
        break;
      }
    }

    // Optional source clause: <marker> <source-selector> (in #chat / في #chat /
    // sa_loob #chat). The marker may be a keyword, particle, or (TL) identifier;
    // we only consume it when a selector follows, so a trailing command keyword
    // is never swallowed.
    const marker = tokens.peek();
    const source = tokens.peek(1);
    if (
      marker &&
      source &&
      source.kind === 'selector' &&
      (marker.kind === 'keyword' || marker.kind === 'particle' || marker.kind === 'identifier') &&
      !PatternMatcher.POSITIONAL_KEYWORDS.has((marker.normalized ?? marker.value).toLowerCase()) &&
      // A command verb is never a locative marker: in a juxtaposed body
      // (`hide closest .modal remove .modal-open from body`) the next clause's
      // verb (`remove`) would otherwise be swallowed as the source marker and
      // the following command lost.
      !PatternMatcher.COMMAND_ACTION_KEYWORDS.has((marker.normalized ?? marker.value).toLowerCase())
    ) {
      // Marker is a locative keyword/particle (`in`/`from`/في/から) the English
      // runtime reads — normalize it; the source selector is code.
      parts.push(marker.normalized ?? marker.value, source.value);
      tokens.advance();
      tokens.advance();
    }

    return { type: 'expression', raw: parts.join(' ') } as SemanticValue;
  }

  /**
   * Match a caret-scoped variable read: `^name on <element>`.
   *
   * `^name` is a DOM-scoped variable; `^name on #host` reads it from a specific
   * element rather than walking up from `me`. Gated to `^`-prefixed identifier
   * tokens followed by an `on`-marker and a selector — so the overloaded `on`
   * (event marker / destination marker) is never misread on ordinary commands
   * like `toggle .active on #button` (whose patient is a class selector, not a
   * caret variable). Works across languages: the `on` marker is matched by its
   * normalized form (ar `عند`, tl `kapag`, …) and selectors aren't translated.
   */
  private tryMatchCaretScopeExpression(tokens: TokenStream): SemanticValue | null {
    const token = tokens.peek();
    if (!token || token.kind !== 'identifier' || !token.value.startsWith('^')) {
      return null;
    }

    const onMarker = tokens.peek(1);
    const scope = tokens.peek(2);
    // The `on` marker is normalized to the `destination` role by the tokenizers
    // (it is the destination marker for toggle/add), so accept it by raw value
    // (`on`) or normalized role (`destination`/`on`). `into` normalizes
    // elsewhere, so a `put ^x into #y` is never misread as a scoped read.
    const markerForm = (onMarker?.normalized ?? '').toLowerCase();
    const isOnMarker =
      !!onMarker &&
      (onMarker.value.toLowerCase() === 'on' ||
        markerForm === 'destination' ||
        markerForm === 'on');
    if (!onMarker || !scope || scope.kind !== 'selector' || !isOnMarker) {
      return null;
    }

    tokens.advance(); // ^name
    tokens.advance(); // on-marker
    tokens.advance(); // scope selector
    return { type: 'expression', raw: `${token.value} on ${scope.value}` } as SemanticValue;
  }

  /**
   * Markers that introduce the owner in a prepositional ("of") possessive:
   * EN `of`; AR من / others that tokenize with a `source`/`of` normalized form;
   * TL genitive linker `ng`. Kept narrow and only consulted for property-path
   * roles, so it never shadows a real source role.
   */
  private isOfPossessiveMarker(token: LanguageToken): boolean {
    const value = token.value.toLowerCase();
    const normalized = (token.normalized ?? '').toLowerCase();
    return value === 'of' || value === 'ng' || normalized === 'of' || normalized === 'source';
  }

  /**
   * Try to match a prepositional "of" possessive:
   *   <property-selector> <of-marker> <owner-selector>
   * e.g. "*--primary-color of #theme" → property-path(#theme, *--primary-color).
   *
   * This is the surface the i18n transformer emits for "set the X of #y to Z"
   * across languages (`set #y's X` would be the alternative, but the transformer
   * uses the `of` form). Only called for property-path roles (see matchRoleToken).
   */
  private tryMatchOfPossessiveExpression(tokens: TokenStream): SemanticValue | null {
    const property = tokens.peek();
    if (!property || property.kind !== 'selector') return null;

    const mark = tokens.mark();
    tokens.advance();

    const marker = tokens.peek();
    if (!marker || !this.isOfPossessiveMarker(marker)) {
      tokens.reset(mark);
      return null;
    }
    tokens.advance();

    const owner = tokens.peek();
    if (!owner || owner.kind !== 'selector') {
      tokens.reset(mark);
      return null;
    }
    tokens.advance();

    // "X of #y" means the X property of #y → property-path(object: #y, property: X).
    return createPropertyPath(createSelector(owner.value), property.value);
  }

  /**
   * Try to match a possessive expression like 'my value' or 'its innerHTML'.
   * Returns the PropertyPathValue if matched, or null if not.
   */
  private tryMatchPossessiveExpression(tokens: TokenStream): SemanticValue | null {
    const token = tokens.peek();
    if (!token) return null;

    // Use profile-based possessive keyword lookup
    if (!this.currentProfile) return null;

    // Look up the possessive keyword by BOTH the native value and the normalized
    // form. Profiles key `possessive.keywords` by the NATIVE word (EN 'my',
    // AR 'لي', TL 'aking', HE 'שלי', KO '내'), but most non-English tokenizers
    // normalize that word to its English base ('لي' → normalized 'me'). Looking
    // up only the normalized form misses every native-keyed profile, so the
    // possessive value-filler ('my value', 'لي قيمة') never matches outside
    // English. Trying the native value first makes the lookup language-agnostic.
    const candidates = [token.value, token.normalized].filter(Boolean) as string[];
    let baseRef: string | undefined;
    for (const candidate of candidates) {
      baseRef =
        getPossessiveReference(this.currentProfile, candidate) ??
        getPossessiveReference(this.currentProfile, candidate.toLowerCase());
      if (baseRef) break;
    }

    if (!baseRef) return null;

    // We have a possessive keyword, look ahead for property name
    const mark = tokens.mark();
    tokens.advance();

    // Skip a possessive CONNECTOR for multi-word possessor-first constructions
    // (Indonesian `saya punya *background` = "I have *background" = "my
    // *background"). The connector sits between the possessor keyword and the
    // property; without skipping it, `punya` is read as the property and the
    // whole set body fails to parse (id set-style/set-text).
    const connectors = this.currentProfile.possessive?.connectors;
    if (connectors && connectors.length > 0) {
      const next = tokens.peek();
      if (next) {
        const nv = next.value.toLowerCase();
        const nn = (next.normalized ?? '').toLowerCase();
        if (connectors.some(c => c.toLowerCase() === nv || c.toLowerCase() === nn)) {
          tokens.advance();
        }
      }
    }

    const propertyToken = tokens.peek();
    if (!propertyToken) {
      // Just the possessive keyword, no property - revert
      tokens.reset(mark);
      return null;
    }

    // Property should be an identifier, keyword (not structural), or selector (for style/dot/attr)
    // Examples: "my value", "my innerHTML", "my *background", "my *opacity", "my @data-count"
    // Also handles dot-property access: "my.textContent" tokenized as "my" + ".textContent"
    // Structural keywords are checked by NORMALIZED form too — non-English
    // structural words (ms kemudian→then, tamat→end) otherwise read as a
    // property ("its then"), forming a phantom property-path whose type check
    // fails the whole pattern (ms `letak 'X' ke ia kemudian …` dropped the put).
    //
    // The same trap exists for ROLE-MARKER keywords whose normalized form is a
    // role *concept* rather than an English preposition surface word: ms `ke`
    // (into) normalizes to `destination`, `dari` (from) to `source`, `pada` (to)
    // to `destination`. `isStructuralKeyword` only knows the English surface
    // prepositions (`into`/`to`/`from`), so a possessive pronoun directly
    // followed by such a marker — `letak ia ke #container` (put it into X),
    // `letak saya ke …` (put me into …) — read `ia ke` as the phantom possessive
    // `it.ke`, the literal `ke` match then failed, and the whole put dropped
    // (the §10 "ms put-with-`ia`" bug). A marker concept is never a real DOM
    // property name, so reject it as a possessive property head.
    //
    // A positional `at end of` connective (ms `di`/`tamat`/`daripada`, zh
    // `在`/`结束`/`的`) tokenizes as a bare identifier with NO normalized concept,
    // so the guards above miss it. `letak ia di tamat daripada badan` (put it at
    // end of body, make-toast's attaching put) read `ia di` as the phantom
    // possessive `it.di`, the literal `di` then failed and the put dropped. Bail
    // so `ia` stays a bare patient and the at-end pattern matches.
    if (isAtEndConnective(this.currentProfile.code, propertyToken.value)) {
      tokens.reset(mark);
      return null;
    }
    if (
      propertyToken.kind === 'identifier' ||
      (propertyToken.kind === 'keyword' &&
        !this.isStructuralKeyword(propertyToken.value) &&
        !(propertyToken.normalized && this.isStructuralKeyword(propertyToken.normalized)) &&
        !(propertyToken.normalized && this.isRoleMarkerConcept(propertyToken.normalized))) ||
      (propertyToken.kind === 'selector' && propertyToken.value.startsWith('*')) ||
      (propertyToken.kind === 'selector' && propertyToken.value.startsWith('@')) ||
      (propertyToken.kind === 'selector' &&
        propertyToken.value.startsWith('.') &&
        /^\.[a-zA-Z_]\w*/.test(propertyToken.value))
    ) {
      tokens.advance();

      // For dot-property selectors (.textContent), strip the leading dot
      let propertyName = propertyToken.value;
      if (
        propertyToken.kind === 'selector' &&
        propertyName.startsWith('.') &&
        /^\.[a-zA-Z_]\w*/.test(propertyName)
      ) {
        propertyName = propertyName.substring(1);
      }

      // Consume chained dot-property access (.parentElement.style.display)
      let chainedProps = propertyName;
      while (
        tokens.peek()?.kind === 'selector' &&
        tokens.peek()!.value.startsWith('.') &&
        /^\.[a-zA-Z_]\w*/.test(tokens.peek()!.value)
      ) {
        chainedProps += tokens.peek()!.value; // keep the dots for chaining
        tokens.advance();
      }

      // Check for a trailing method call: chain + '(' [args...] ')'
      // (e.g., my.value.toUpperCase(), my.getAttribute("data-id")). The tokenizer
      // may emit the call as one token (`("data-id")`) or split it into `(` / args
      // / `)` (kinds vary: identifier/punctuation/literal), so consume by value
      // until the parentheses balance rather than relying on a single-token form.
      const afterChain = tokens.peek();
      if (afterChain && afterChain.value.startsWith('(')) {
        let call = '';
        let depth = 0;
        let guard = 0;
        while (!tokens.isAtEnd() && guard++ < PatternMatcher.MAX_METHOD_ARGS + 2) {
          const t = tokens.peek();
          if (!t) break;
          call += t.value;
          tokens.advance();
          for (const ch of t.value) {
            if (ch === '(') depth++;
            else if (ch === ')') depth--;
          }
          if (depth <= 0) break;
        }
        chainedProps += call;
      }

      // Create property-path: my value -> { object: me, property: 'value' }
      // baseRef from getPossessiveReference is always a valid reference ('me', 'you', 'it', etc.)
      return createPropertyPath(createReference(baseRef as ReferenceValue['value']), chainedProps);
    }

    // Not a valid property, revert
    tokens.reset(mark);
    return null;
  }

  /**
   * Check if a keyword is a structural keyword (preposition, control flow, etc.)
   * that shouldn't be consumed as a property name.
   */
  private isStructuralKeyword(value: string): boolean {
    const structural = new Set([
      // Prepositions
      'into',
      'in',
      'to',
      'from',
      'at',
      'by',
      'with',
      'without',
      'before',
      'after',
      'of',
      'as',
      'on',
      // Control flow
      'then',
      'end',
      'else',
      'if',
      'repeat',
      'while',
      'for',
      // Commands (shouldn't be property names)
      'toggle',
      'add',
      'remove',
      'put',
      'set',
      'show',
      'hide',
      'increment',
      'decrement',
      'send',
      'trigger',
      'call',
    ]);
    return structural.has(value.toLowerCase());
  }

  /**
   * Whether a NORMALIZED token form is a role-marker *concept* (the abstract
   * role name a non-English marker keyword normalizes to, e.g. ms `ke`→
   * `destination`, `dari`→`source`). These are markers, never DOM property
   * names — so a possessive property head normalizing to one is a mis-read
   * (`letak ia ke …` = "put it into …", not "put it's `ke`"). Only checked
   * against the `normalized` form: a real English property surface word
   * (`value`, `style`) tokenizes as a bare identifier with no normalized concept,
   * so this never blocks a genuine `my value` / `its style` possessive.
   */
  private isRoleMarkerConcept(normalized: string): boolean {
    const markerConcepts = new Set([
      'destination',
      'source',
      'patient',
      'object',
      'event',
      'eventmarker',
      'manner',
      'instrument',
    ]);
    return markerConcepts.has(normalized.toLowerCase());
  }

  /**
   * Try to match a method call expression like '#dialog.showModal()'.
   * Pattern: selector + '.' + identifier + '(' + [args] + ')'
   * Returns an expression value if matched, or null if not.
   */
  private tryMatchMethodCallExpression(tokens: TokenStream): SemanticValue | null {
    const token = tokens.peek();
    if (!token || token.kind !== 'selector') return null;

    // Look ahead for: . identifier (
    const mark = tokens.mark();
    tokens.advance(); // consume selector

    const dotToken = tokens.peek();
    if (!dotToken || dotToken.kind !== 'operator' || dotToken.value !== '.') {
      tokens.reset(mark);
      return null;
    }
    tokens.advance(); // consume .

    const methodToken = tokens.peek();
    if (!methodToken || methodToken.kind !== 'identifier') {
      tokens.reset(mark);
      return null;
    }
    tokens.advance(); // consume method name

    const openParen = tokens.peek();
    if (!openParen || openParen.kind !== 'punctuation' || openParen.value !== '(') {
      tokens.reset(mark);
      return null;
    }
    tokens.advance(); // consume (

    // Consume arguments until we find ) (with depth limit for security)
    const args: string[] = [];
    while (!tokens.isAtEnd() && args.length < PatternMatcher.MAX_METHOD_ARGS) {
      const argToken = tokens.peek();
      if (!argToken) break;
      if (argToken.kind === 'punctuation' && argToken.value === ')') {
        tokens.advance(); // consume )
        break;
      }
      // Skip commas
      if (argToken.kind === 'punctuation' && argToken.value === ',') {
        tokens.advance();
        continue;
      }
      // Collect arg value
      args.push(argToken.value);
      tokens.advance();
    }

    // Create expression value: #dialog.showModal()
    const methodCall = `${token.value}.${methodToken.value}(${args.join(', ')})`;
    return {
      type: 'expression',
      raw: methodCall,
    } as SemanticValue;
  }

  /**
   * Try to match a property access expression like 'userData.name' or 'it.data'.
   * Pattern: (identifier | keyword) + '.' + identifier [+ '.' + identifier ...]
   * Returns an expression value if matched, or null if not.
   */
  private tryMatchPropertyAccessExpression(tokens: TokenStream): SemanticValue | null {
    const token = tokens.peek();
    if (!token) return null;

    // Must start with an identifier or keyword reference
    if (token.kind !== 'identifier' && token.kind !== 'keyword') return null;

    // Look ahead for: . identifier
    const mark = tokens.mark();
    tokens.advance(); // consume first token

    // Fused-dot form: the tokenizer emits `it.value` / `event.detail.message` as
    // a base token + `.`-prefixed *selector* tokens (`.value`, `.detail`), since
    // `.foo` looks like a class selector. Fold a chain of those into the property
    // path (the `.` operator path below handles the rare un-fused form).
    //
    // Gated to identifiers and known reference bases so a command verb followed
    // by a class selector (`بدل .active` = "toggle .active") is never swallowed as
    // a property access — command verbs are never reference bases.
    const baseLower = token.value.toLowerCase();
    const fusedFirst = tokens.peek();
    if (
      (token.kind === 'identifier' || PatternMatcher.PROPERTY_ACCESS_BASES.has(baseLower)) &&
      fusedFirst &&
      fusedFirst.kind === 'selector' &&
      /^\.[a-zA-Z_]/.test(fusedFirst.value)
    ) {
      let fusedChain = token.value;
      let fusedDepth = 0;
      while (fusedDepth < PatternMatcher.MAX_PROPERTY_DEPTH) {
        const prop = tokens.peek();
        if (prop && prop.kind === 'selector' && /^\.[a-zA-Z_]/.test(prop.value)) {
          fusedChain += `.${prop.value.slice(1)}`;
          tokens.advance();
          fusedDepth++;
        } else {
          break;
        }
      }
      return { type: 'expression', raw: fusedChain } as SemanticValue;
    }

    const dotToken = tokens.peek();
    if (!dotToken || dotToken.kind !== 'operator' || dotToken.value !== '.') {
      tokens.reset(mark);
      return null;
    }
    tokens.advance(); // consume .

    const propertyToken = tokens.peek();
    if (!propertyToken || propertyToken.kind !== 'identifier') {
      tokens.reset(mark);
      return null;
    }
    tokens.advance(); // consume property name

    // Build the property chain
    let chain = `${token.value}.${propertyToken.value}`;
    let depth = 1; // Already have one property access

    // Continue for nested property access (e.g., userData.address.city)
    // With depth limit for security
    while (!tokens.isAtEnd() && depth < PatternMatcher.MAX_PROPERTY_DEPTH) {
      const nextDot = tokens.peek();
      if (!nextDot || nextDot.kind !== 'operator' || nextDot.value !== '.') {
        break;
      }
      tokens.advance(); // consume .

      const nextProp = tokens.peek();
      if (!nextProp || nextProp.kind !== 'identifier') {
        // Dot without property - put the dot back and stop
        // Can't easily put a single token back, so we'll include it
        break;
      }
      tokens.advance(); // consume property
      chain += `.${nextProp.value}`;
      depth++;
    }

    // Check for method call: chain + '(' + args + ')'
    // e.g., me.insertBefore(draggedItem, dropTarget)
    const openParen = tokens.peek();
    if (openParen && openParen.kind === 'punctuation' && openParen.value === '(') {
      tokens.advance(); // consume (

      // Collect arguments (comma-separated values)
      const args: string[] = [];
      let argDepth = 0; // Track nested parentheses
      while (!tokens.isAtEnd() && args.length < PatternMatcher.MAX_METHOD_ARGS) {
        const argToken = tokens.peek();
        if (!argToken) break;

        // Handle close paren - respecting nesting
        if (argToken.kind === 'punctuation' && argToken.value === ')') {
          if (argDepth === 0) {
            tokens.advance(); // consume )
            break;
          }
          argDepth--;
        }
        // Track nested open parens
        if (argToken.kind === 'punctuation' && argToken.value === '(') {
          argDepth++;
        }
        // Skip commas between arguments
        if (argToken.kind === 'punctuation' && argToken.value === ',') {
          tokens.advance();
          continue;
        }
        // Collect arg value
        args.push(argToken.value);
        tokens.advance();
      }

      // Create expression value with method call: me.insertBefore(a, b)
      const methodCall = `${chain}(${args.join(', ')})`;
      return {
        type: 'expression',
        raw: methodCall,
      } as SemanticValue;
    }

    // Create expression value: userData.name
    return {
      type: 'expression',
      raw: chain,
    } as SemanticValue;
  }

  /**
   * Try to match a possessive selector expression like "#element's *opacity".
   * Pattern: selector + possessive-marker + (selector | identifier)
   *
   * The possessive marker is English `'s` (a punctuation token) or, for other
   * languages, the active profile's `possessive.marker` emitted as a `particle`
   * token (e.g. Japanese `の`, Korean `의`). Returns a property-path value if
   * matched, or null if not.
   */
  private tryMatchPossessiveSelectorExpression(tokens: TokenStream): SemanticValue | null {
    const token = tokens.peek();
    if (!token || token.kind !== 'selector') return null;

    // Look ahead for the possessive marker.
    const mark = tokens.mark();
    tokens.advance(); // consume selector

    const possessiveToken = tokens.peek();
    // Agglutinative suffix markers may be written with a leading hyphen in the
    // profile (e.g. Quechua `-pa`) but tokenize without it; normalize before
    // comparing.
    const profileMarker = this.currentProfile?.possessive?.marker?.replace(/^-/, '');
    const isEnglishPossessive =
      !!possessiveToken && possessiveToken.kind === 'punctuation' && possessiveToken.value === "'s";
    // Non-English markers (の, 의, র, pa, …) arrive as `particle` tokens. Match
    // them against the active profile's possessive marker. Empty markers
    // (Turkish, suffix-fused) don't have a standalone token and aren't handled here.
    const isProfilePossessive =
      !!possessiveToken &&
      !!profileMarker &&
      profileMarker !== "'s" &&
      possessiveToken.value === profileMarker &&
      (possessiveToken.kind === 'particle' || possessiveToken.kind === 'punctuation');
    if (!isEnglishPossessive && !isProfilePossessive) {
      tokens.reset(mark);
      return null;
    }
    tokens.advance(); // consume the possessive marker

    const propertyToken = tokens.peek();
    if (!propertyToken) {
      tokens.reset(mark);
      return null;
    }

    // English keeps the historical selector-or-identifier property (e.g.
    // `#element's *opacity`). For profile markers, only an identifier is a
    // property — otherwise a target+patient construct like `#button の .active`
    // ("toggle .active on #button") would be mis-read as a property path.
    const propertyOk =
      propertyToken.kind === 'identifier' ||
      (isEnglishPossessive && propertyToken.kind === 'selector');
    if (!propertyOk) {
      tokens.reset(mark);
      return null;
    }
    tokens.advance(); // consume property

    // Create property-path: #element's *opacity
    return createPropertyPath(createSelector(token.value), propertyToken.value);
  }

  /**
   * Try to match a selector + property expression like "#output.innerText".
   * This handles cases where the tokenizer produces two selector tokens:
   * - #output (id selector)
   * - .innerText (looks like class selector, but is actually property)
   *
   * Pattern: id-selector + class-selector-that-is-actually-property
   * Returns a property-path value if matched, or null if not.
   */
  private tryMatchSelectorPropertyExpression(tokens: TokenStream): SemanticValue | null {
    const token = tokens.peek();
    if (!token || token.kind !== 'selector') return null;

    // Must be an ID selector (starts with #)
    if (!token.value.startsWith('#')) return null;

    // Look ahead for: selector that looks like a property (.something)
    const mark = tokens.mark();
    tokens.advance(); // consume first selector

    const propertyToken = tokens.peek();
    if (!propertyToken || propertyToken.kind !== 'selector') {
      tokens.reset(mark);
      return null;
    }

    // Second token must look like a class selector (starts with .)
    // but we interpret it as a property access
    if (!propertyToken.value.startsWith('.')) {
      tokens.reset(mark);
      return null;
    }

    // Verify the next token is not a selector (to avoid consuming too many)
    // This helps distinguish "#output.innerText" from "#box .child"
    const peek2 = tokens.peek(1);
    if (peek2 && peek2.kind === 'selector') {
      // Could be a compound selector chain - only take first two
    }

    tokens.advance(); // consume property selector

    // Create property-path: #output.innerText
    // Extract property name without the leading dot
    const propertyName = propertyToken.value.slice(1);

    return createPropertyPath(createSelector(token.value), propertyName);
  }

  /**
   * Match a group pattern token (optional sequence).
   */
  private matchGroupToken(
    tokens: TokenStream,
    patternToken: PatternToken & { type: 'group' },
    captured: Map<SemanticRole, SemanticValue>
  ): boolean {
    const mark = tokens.mark();

    // Track which roles were captured before this group
    const capturedBefore = new Set(captured.keys());

    const success = this.matchTokenSequence(tokens, patternToken.tokens, captured);

    if (!success) {
      tokens.reset(mark);
      // Clear any roles that were partially captured during the failed group match
      for (const role of captured.keys()) {
        if (!capturedBefore.has(role)) {
          captured.delete(role);
        }
      }
      return patternToken.optional || false;
    }

    return true;
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

    return 'none';
  }

  /**
   * Track stem matches for confidence calculation.
   * This is set during matching and read during confidence calculation.
   */
  private stemMatchCount: number = 0;
  private totalKeywordMatches: number = 0;

  // ==========================================================================
  // Depth Limits for Expression Parsing (security hardening)
  // ==========================================================================

  /** Maximum depth for nested property access (e.g., a.b.c.d...) */
  private static readonly MAX_PROPERTY_DEPTH = 10;

  /** Maximum number of arguments in method calls */
  private static readonly MAX_METHOD_ARGS = 20;

  /**
   * Convert a language token to a semantic value.
   */
  private tokenToSemanticValue(token: LanguageToken): SemanticValue | null {
    switch (token.kind) {
      case 'selector':
        return createSelector(token.value);

      case 'literal':
        return this.parseLiteralValue(token.value);

      case 'keyword':
        // Keywords might be references or values
        const lower = (token.normalized || token.value).toLowerCase();
        if (isValidReference(lower)) {
          return createReference(lower);
        }
        return createLiteral(token.normalized || token.value);

      case 'identifier':
        // Check if it's a variable reference (:local or $global)
        // Note: these don't match the ReferenceValue union but are used as a
        // reference token downstream — this cast preserves existing behavior
        if (token.value.startsWith(':') || token.value.startsWith('$')) {
          return createReference(token.value as ReferenceValue['value']);
        }
        // Check if it's a built-in reference
        const identLower = token.value.toLowerCase();
        if (isValidReference(identLower)) {
          return createReference(identLower);
        }
        // Regular identifiers are variable references - use 'expression' type
        // which gets converted to 'identifier' AST nodes by semantic-integration.ts
        return { type: 'expression', raw: token.value } as const;

      case 'url':
        // URLs are treated as string literals (paths/URLs for navigation/fetch)
        return createLiteral(token.value, 'string');

      default:
        return null;
    }
  }

  /**
   * Parse a literal value (string, number, boolean).
   */
  private parseLiteralValue(value: string): SemanticValue {
    // String literal
    if (
      value.startsWith('"') ||
      value.startsWith("'") ||
      value.startsWith('`') ||
      value.startsWith('「')
    ) {
      const inner = value.slice(1, -1);
      return createLiteral(inner, 'string');
    }

    // Boolean
    if (value === 'true') return createLiteral(true, 'boolean');
    if (value === 'false') return createLiteral(false, 'boolean');

    // Duration (number with suffix)
    const durationMatch = value.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
    if (durationMatch) {
      const num = parseFloat(durationMatch[1]);
      const unit = durationMatch[2];
      if (unit) {
        return createLiteral(value, 'duration');
      }
      return createLiteral(num, 'number');
    }

    // Plain number
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return createLiteral(num, 'number');
    }

    // Default to string
    return createLiteral(value, 'string');
  }

  /**
   * Apply extraction rules to fill in static values and defaults for missing roles.
   */
  private applyExtractionRules(
    pattern: LanguagePattern,
    captured: Map<SemanticRole, SemanticValue>
  ): void {
    for (const [role, rule] of Object.entries(pattern.extraction)) {
      if (!captured.has(role as SemanticRole)) {
        if (rule.value !== undefined) {
          // Static value extraction (e.g., action: { value: "toggle" })
          captured.set(role as SemanticRole, { type: 'literal', value: rule.value });
        } else if (rule.default) {
          captured.set(role as SemanticRole, rule.default);
        }
      }
    }
  }

  /**
   * Check if a pattern token is optional.
   */
  private isOptional(patternToken: PatternToken): boolean {
    return patternToken.type !== 'literal' && patternToken.optional === true;
  }

  // Confidence scoring delegated to ConfidenceModel (Phase 3.3)
  // See confidence-model.ts for DefaultConfidenceModel implementation

  // ===========================================================================
  // English Idiom Support - Noise Word Handling
  // ===========================================================================

  /**
   * Noise words that can be skipped in English for more natural syntax.
   * - "the" before selectors: "toggle the .active" → "toggle .active"
   * - "the" before identifiers: "set the color to red" → "set color to red"
   * - "class" after class selectors: "add the .visible class" → "add .visible"
   */
  private static readonly ENGLISH_NOISE_WORDS = new Set(['the', 'a', 'an']);

  /**
   * Skip noise words like "the" before selectors and identifiers.
   * This enables more natural English syntax like "toggle the .active"
   * and "set the color to red".
   */
  private skipNoiseWords(tokens: TokenStream): void {
    const token = tokens.peek();
    if (!token) return;

    const tokenLower = token.value.toLowerCase();

    // Check if current token is a noise word (like "the")
    if (PatternMatcher.ENGLISH_NOISE_WORDS.has(tokenLower)) {
      // Look ahead to see if the next token is a selector or identifier
      const mark = tokens.mark();
      tokens.advance();
      const nextToken = tokens.peek();

      if (nextToken && (nextToken.kind === 'selector' || nextToken.kind === 'identifier')) {
        // Keep the position after "the" - effectively skipping it
        return;
      }

      // "the next <sel>" / "the closest .modal": the article also precedes
      // positional-phrase heads, which tokenize as keywords/literals — skip it
      // so tryMatchPositionalExpression sees the positional keyword first.
      const nextNorm = nextToken ? (nextToken.normalized ?? nextToken.value).toLowerCase() : '';
      if (nextToken && PatternMatcher.POSITIONAL_OR_SCOPE_KEYWORDS.has(nextNorm)) {
        return;
      }

      // Not followed by a selector, identifier, or positional keyword — revert
      tokens.reset(mark);
    }

    // Also handle "class" after class selectors: ".visible class" → ".visible"
    // This is handled when the selector has already been consumed,
    // so we check if current token is "class" and skip it
    if (tokenLower === 'class') {
      // Skip "class" as it's just noise after a class selector
      tokens.advance();
    }
  }

  /**
   * Extract event modifiers from the token stream.
   * Event modifiers are .once, .debounce(N), .throttle(N), .queue(strategy)
   * that can appear after event names.
   *
   * Returns EventModifiers object or undefined if no modifiers found.
   */
  extractEventModifiers(tokens: TokenStream): import('../types').EventModifiers | undefined {
    const modifiers: {
      once?: boolean;
      debounce?: number;
      throttle?: number;
      queue?: 'first' | 'last' | 'all' | 'none';
      from?: SemanticValue;
    } = {};

    let foundModifier = false;

    // Consume all consecutive event modifier tokens
    while (!tokens.isAtEnd()) {
      const token = tokens.peek();
      if (!token || token.kind !== 'event-modifier') {
        break;
      }

      const metadata = token.metadata as
        | { modifierName: string; value?: number | string }
        | undefined;
      if (!metadata) {
        break;
      }

      foundModifier = true;

      switch (metadata.modifierName) {
        case 'once':
          modifiers.once = true;
          break;
        case 'debounce':
          if (typeof metadata.value === 'number') {
            modifiers.debounce = metadata.value;
          }
          break;
        case 'throttle':
          if (typeof metadata.value === 'number') {
            modifiers.throttle = metadata.value;
          }
          break;
        case 'queue':
          if (
            metadata.value === 'first' ||
            metadata.value === 'last' ||
            metadata.value === 'all' ||
            metadata.value === 'none'
          ) {
            modifiers.queue = metadata.value;
          }
          break;
      }

      tokens.advance();
    }

    return foundModifier ? modifiers : undefined;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Singleton pattern matcher instance.
 */
export const patternMatcher = new PatternMatcher();

/**
 * Match tokens against a pattern.
 */
export function matchPattern(
  tokens: TokenStream,
  pattern: LanguagePattern
): PatternMatchResult | null {
  return patternMatcher.matchPattern(tokens, pattern);
}

/**
 * Match tokens against multiple patterns, return best match.
 */
export function matchBest(
  tokens: TokenStream,
  patterns: LanguagePattern[]
): PatternMatchResult | null {
  return patternMatcher.matchBest(tokens, patterns);
}
