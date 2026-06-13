/**
 * Base Tokenizer Class
 *
 * Abstract base class for language-specific tokenizers.
 * Provides keyword management, morphological normalization,
 * and high-level token extraction methods.
 */

import type { LanguageToken, TokenKind, TokenStream, LanguageTokenizer } from '../types';
import type { MorphologicalNormalizer, NormalizationResult } from './morphology/types';
import {
  type ValueExtractor,
  type KeywordEntry,
  isContextAwareExtractor,
  createTokenizerContext,
} from '../../interfaces/value-extractor';
import {
  createToken,
  createPosition,
  isWhitespace,
  isDigit,
  isAsciiIdentifierChar,
  TokenStreamImpl,
  type TimeUnitMapping,
  type CreateTokenOptions,
} from './token-utils';
import { extractCssSelector, extractStringLiteral, extractNumber, extractUrl } from './extractors';
import { DEFAULT_OPERATORS } from './extractors/operator';
import { getDefaultExtractors } from './default-extractors';

// Module-scope operator set for O(1) lookup in createSimpleTokenizer.
// Uses the canonical list from OperatorExtractor to avoid duplication.
const SIMPLE_TOKENIZER_OPERATOR_SET = new Set(DEFAULT_OPERATORS);

/**
 * Normalized concepts that are matched via the pattern matcher's ROLE-MARKER
 * MECHANISM (the source/destination/event clause matchers in
 * `packages/semantic/src/parser/pattern-matcher.ts`), which peeks/advances a
 * SINGLE token and checks `.value`/`.normalized`. A multi-word phrase carrying
 * one of these must NOT be pre-matched as a single keyword token — doing so
 * shadows the single-word marker those clause matchers expect (e.g. id
 * `ke dalam`=into hides the `ke` destination marker; ko `할 때`=eventMarker
 * pre-empts SOV event extraction).
 *
 * NOTE — what is *not* here. Prepositional modifiers that the generated patterns
 * expose as ordinary pattern LITERALS (`before`/`after` in put-before/after,
 * `until` in repeat-until) are deliberately absent: those are read by
 * `matchLiteralToken`, which compares the whole token by exact value OR
 * normalized form (`getMatchType`), so a multi-word marker token (`से पहले`,
 * `cho đến khi`) matches the literal's value/alternatives directly with no
 * special handling. Keeping them out lets `tryMultiWordKeyword` emit them as one
 * token — the profile-driven replacement for the per-language hardcoded compound
 * lists (Task #10). `into` stays excluded because it IS consumed by the role
 * mechanism in some languages (id destination `ke`), and `from`/`to`/`with`/
 * `on`/`at`/`of`/`as`/`by`/`in` are genuine role markers. Command verbs /
 * control-flow / event names were always absent. See `multiWordKeywords` /
 * `tryMultiWordKeyword`.
 */
const MARKER_CONCEPT_NORMALIZEDS: ReadonlySet<string> = new Set([
  // Role-marker role names (profile.roleMarkers normalizeds)
  'patient',
  'destination',
  'source',
  'style',
  'event',
  'eventMarker',
  'agent',
  'goal',
  'manner',
  // Prepositional / positional modifier concepts matched via the role mechanism
  // (profile.keywords "Modifiers"). `before`/`after`/`until` are intentionally
  // NOT here — they are pattern literals (see the note above).
  'into',
  'from',
  'to',
  'with',
  'at',
  'of',
  'as',
  'by',
  'in',
  'on',
  'over',
  'under',
  'between',
  'through',
  'without',
]);

// =============================================================================
// Types
// =============================================================================

// KeywordEntry is imported from interfaces/value-extractor and re-exported
// for backward compatibility with code importing from this module.
export type { KeywordEntry };

/**
 * Standard DOM event names recognized in every language as universal fallbacks.
 * The i18n grammar transformer emits these verbatim (no native dictionary form),
 * so each tokenizer must accept them or English-named event handlers won't parse.
 * Kept to genuine DOM event names (not command verbs) to minimize collisions; the
 * registration is `!has`-guarded so any native keyword of the same spelling wins.
 */
const ENGLISH_DOM_EVENT_NAMES: readonly string[] = [
  'click',
  'dblclick',
  'input',
  'change',
  'submit',
  'keydown',
  'keyup',
  'keypress',
  'mousedown',
  'mouseup',
  'mouseover',
  'mouseout',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'pointerdown',
  'pointerup',
  'pointermove',
  'focus',
  'blur',
  'load',
  'resize',
  'scroll',
];

/**
 * Profile interface for keyword derivation.
 * Matches the structure of LanguageProfile but only includes fields needed for tokenization.
 */
export interface TokenizerProfile {
  readonly keywords?: Record<
    string,
    { primary: string; alternatives?: string[]; normalized?: string }
  >;
  readonly references?: Record<string, string>;
  readonly roleMarkers?: Record<
    string,
    { primary: string; alternatives?: string[]; position?: string }
  >;
  readonly possessive?: {
    readonly marker: string;
    readonly markerPosition: 'after-object' | 'between' | 'before-property';
    readonly specialForms?: Record<string, string>;
    readonly usePossessiveAdjectives?: boolean;
    readonly keywords?: Record<string, string>;
  };
}

// =============================================================================
// Base Tokenizer Class
// =============================================================================

/**
 * Abstract base class for language-specific tokenizers.
 * Provides common functionality for CSS selectors, strings, and numbers.
 */
export abstract class BaseTokenizer implements LanguageTokenizer {
  abstract readonly language: string;
  abstract readonly direction: 'ltr' | 'rtl';

  /** Optional morphological normalizer for this language */
  protected normalizer?: MorphologicalNormalizer;

  /** Keywords derived from profile, sorted longest-first for greedy matching */
  protected profileKeywords: KeywordEntry[] = [];

  /**
   * Space-containing profile keywords (multi-word phrases), longest-first.
   * Used by `tryMultiWordKeyword` so natural spaced forms (hi `मेल खाता`,
   * vi `chuyển đổi`, es `tecla abajo`, …) tokenize as ONE keyword — the
   * profile-driven replacement for the per-language hardcoded compound lists.
   * Empty for no-space (CJK) languages, so they are unaffected.
   */
  protected multiWordKeywords: KeywordEntry[] = [];

  /** Map for O(1) keyword lookups by lowercase native word */
  protected profileKeywordMap: Map<string, KeywordEntry> = new Map();

  /**
   * The raw EXTRAS list passed to initializeKeywordsFromProfile, kept pre-dedup.
   * The keyword map is keyed by native word with last-wins insertion, so a
   * duplicate native word inside the extras silently shadows the earlier entry
   * (e.g. a `nächste→closest` entry shadowing `nächste→next` broke German
   * positional expressions). Exposed so consistency tests can detect such
   * intra-extras collisions, which are invisible in the deduplicated map.
   */
  private rawExtraEntries: KeywordEntry[] = [];

  /** Raw extras as passed in, pre-dedup — for consistency tests. */
  getExtraKeywordEntries(): readonly KeywordEntry[] {
    return this.rawExtraEntries;
  }

  /**
   * Pluggable value extractors for domain-specific syntax.
   * When registered, BaseTokenizer will use extractor-based tokenization instead of legacy methods.
   */
  protected extractors: ValueExtractor[] = [];

  /**
   * Tokenize input string to token stream.
   * Delegates to extractor-based tokenization if extractors are registered,
   * otherwise subclass must override this method.
   *
   * @param input - Input string to tokenize
   * @returns Token stream
   */
  tokenize(input: string): TokenStream {
    if (this.isUsingExtractors()) {
      return this.tokenizeWithExtractors(input);
    }

    // If no extractors registered, subclass must provide implementation
    throw new Error(
      `${this.constructor.name}: tokenize() not implemented and no extractors registered. ` +
        'Either register extractors or override tokenize() method.'
    );
  }

  abstract classifyToken(token: string): TokenKind;

  /**
   * Register a value extractor for domain-specific syntax.
   * Extractors are tried in registration order during tokenization.
   * Context-aware extractors automatically receive the tokenizer context.
   *
   * @param extractor - Value extractor to register
   */
  registerExtractor(extractor: ValueExtractor): void {
    if (isContextAwareExtractor(extractor)) {
      extractor.setContext(createTokenizerContext(this as any));
    }
    this.extractors.push(extractor);
  }

  /**
   * Register multiple value extractors at once.
   *
   * @param extractors - Array of value extractors to register
   */
  registerExtractors(extractors: ValueExtractor[]): void {
    for (const extractor of extractors) {
      this.registerExtractor(extractor);
    }
  }

  /**
   * Clear all registered extractors.
   * Returns tokenizer to legacy mode.
   */
  clearExtractors(): void {
    this.extractors = [];
  }

  /**
   * Check if this tokenizer is using extractor-based tokenization.
   * Returns true if any extractors are registered.
   */
  protected isUsingExtractors(): boolean {
    return this.extractors.length > 0;
  }

  /**
   * Tokenize input using registered value extractors.
   * This is the new path - extractors handle all syntax detection.
   *
   * @param input - Input string to tokenize
   * @returns Token stream
   */
  protected tokenizeWithExtractors(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace
      while (pos < input.length && isWhitespace(input[pos])) {
        pos++;
      }
      if (pos >= input.length) break;

      // Multi-word keyword pre-match: a profile keyword containing a space
      // (e.g. hi `मेल खाता`, vi `chuyển đổi`, es `tecla abajo`) is matched as ONE
      // keyword token at a word boundary, longest-first. Runs before the
      // per-language extractors so natural spaced multi-word keywords tokenize
      // without each tokenizer hardcoding a compound list. No-op for single-word
      // and no-space (CJK) languages (multiWordKeywords is empty).
      const multiWord = this.tryMultiWordKeyword(input, pos);
      if (multiWord) {
        tokens.push(multiWord);
        pos = multiWord.position.end;
        continue;
      }

      // Try registered extractors in order
      let extracted = false;
      for (const extractor of this.extractors) {
        if (extractor.canExtract(input, pos)) {
          const result = extractor.extract(input, pos);
          if (result) {
            // Promote normalized/stem/stemConfidence from metadata to top-level token options
            const normalized = result.metadata?.normalized as string | undefined;
            const stem = result.metadata?.stem as string | undefined;
            const stemConfidence = result.metadata?.stemConfidence as number | undefined;

            // Build clean metadata without promoted fields
            const cleanMetadata: Record<string, unknown> = {};
            if (result.metadata) {
              for (const [key, value] of Object.entries(result.metadata)) {
                if (key !== 'normalized' && key !== 'stem' && key !== 'stemConfidence') {
                  cleanMetadata[key] = value;
                }
              }
            }

            const options: CreateTokenOptions = {};
            if (normalized) options.normalized = normalized;
            if (stem) options.stem = stem;
            if (stemConfidence !== undefined) options.stemConfidence = stemConfidence;
            if (Object.keys(cleanMetadata).length > 0) options.metadata = cleanMetadata;

            tokens.push(
              createToken(
                result.value,
                this.classifyToken(result.value),
                createPosition(pos, pos + result.length),
                Object.keys(options).length > 0 ? options : undefined
              )
            );
            pos += result.length;
            extracted = true;
            break;
          }
        }
      }

      // Fallback: single character as operator/punctuation
      if (!extracted) {
        const char = input[pos];
        const kind = this.classifyUnknownChar(char);
        tokens.push(createToken(char, kind, createPosition(pos, pos + 1)));
        pos++;
      }
    }

    return new TokenStreamImpl(tokens, this.language);
  }

  /**
   * Classify an unknown character when no extractor matches.
   * Provides sensible defaults for common syntax.
   *
   * @param char - Character to classify
   * @returns Token kind
   */
  protected classifyUnknownChar(char: string): TokenKind {
    if ('()[]{},:;'.includes(char)) return 'punctuation';
    if ('+-*/<>=!&|'.includes(char)) return 'operator';
    return 'identifier';
  }

  /**
   * Check if current position is a property access (obj.prop) vs CSS selector (.active).
   * Property access: no whitespace before '.', previous token is identifier/keyword/selector.
   * Also detects standalone method calls: .identifier( pattern.
   *
   * Returns true if '.' was emitted as an operator token and pos should advance by 1.
   * Returns false if this is a CSS selector and should be handled by trySelector().
   */
  protected tryPropertyAccess(input: string, pos: number, tokens: LanguageToken[]): boolean {
    if (input[pos] !== '.') return false;

    const lastToken = tokens[tokens.length - 1];
    // Property access requires NO whitespace between tokens (e.g., "obj.prop")
    const hasWhitespaceBefore = lastToken && lastToken.position.end < pos;
    const isPropertyAccess =
      lastToken &&
      !hasWhitespaceBefore &&
      (lastToken.kind === 'identifier' ||
        lastToken.kind === 'keyword' ||
        lastToken.kind === 'selector');

    if (isPropertyAccess) {
      tokens.push(createToken('.', 'operator', createPosition(pos, pos + 1)));
      return true;
    }

    // Check for method call pattern at start: .identifier(
    const methodStart = pos + 1;
    let methodEnd = methodStart;
    while (methodEnd < input.length && isAsciiIdentifierChar(input[methodEnd])) {
      methodEnd++;
    }
    if (methodEnd < input.length && input[methodEnd] === '(') {
      tokens.push(createToken('.', 'operator', createPosition(pos, pos + 1)));
      return true;
    }

    return false;
  }

  /**
   * Initialize keyword mappings from a language profile.
   * Builds a list of native→english mappings from:
   * - profile.keywords (primary + alternatives)
   * - profile.references (me, it, you, etc.)
   * - profile.roleMarkers (into, from, with, etc.)
   *
   * Results are sorted longest-first for greedy matching (important for non-space languages).
   * Extras take precedence over profile entries when there are duplicates.
   *
   * @param profile - Language profile containing keyword translations
   * @param extras - Additional keyword entries to include (literals, positional, events)
   */
  protected initializeKeywordsFromProfile(
    profile: TokenizerProfile,
    extras: KeywordEntry[] = []
  ): void {
    // Use a Map to deduplicate, with extras taking precedence
    const keywordMap = new Map<string, KeywordEntry>();
    this.rawExtraEntries = extras;

    // Extract from keywords (command translations)
    if (profile.keywords) {
      for (const [normalized, translation] of Object.entries(profile.keywords)) {
        // Primary translation
        keywordMap.set(translation.primary, {
          native: translation.primary,
          normalized: translation.normalized || normalized,
        });

        // Alternative forms
        if (translation.alternatives) {
          for (const alt of translation.alternatives) {
            keywordMap.set(alt, {
              native: alt,
              normalized: translation.normalized || normalized,
            });
          }
        }
      }
    }

    // Extract from references (me, it, you, etc.)
    if (profile.references) {
      for (const [normalized, native] of Object.entries(profile.references)) {
        keywordMap.set(native, { native, normalized });
      }
      // Also register English canonical forms as universal fallbacks.
      // Users frequently mix English references (me, it, you) into non-English
      // hyperscript (e.g., "alternar .active on me"). Without this, the English
      // word "me" would be unrecognized in non-English token streams.
      for (const canonical of Object.keys(profile.references)) {
        if (!keywordMap.has(canonical)) {
          keywordMap.set(canonical, { native: canonical, normalized: canonical });
        }
      }
    }

    // Extract from roleMarkers (into, from, with, etc.)
    if (profile.roleMarkers) {
      for (const [role, marker] of Object.entries(profile.roleMarkers)) {
        if (marker.primary) {
          keywordMap.set(marker.primary, { native: marker.primary, normalized: role });
        }
        if (marker.alternatives) {
          for (const alt of marker.alternatives) {
            keywordMap.set(alt, { native: alt, normalized: role });
          }
        }
      }
    }

    // Extract from possessive keywords (e.g., ñuqapa, qampa for Quechua)
    if (profile.possessive?.keywords) {
      for (const [native, normalized] of Object.entries(profile.possessive.keywords)) {
        keywordMap.set(native, { native, normalized });
      }
    }

    // Register English DOM event names as universal fallbacks. The i18n grammar
    // transformer has no native form for most DOM events, so it passes them
    // through verbatim (`on keyup …` → `<on-marker> keyup …`). Without these,
    // non-English token streams treat `keyup`/`keydown`/`resize`/… as bare
    // identifiers, and event handlers using them (often with `[key==…]` guards)
    // fail to parse. Guarded by `!has` so any native mapping wins (same policy
    // as the English-reference fallbacks above). Generalizes the per-language
    // registration introduced for Hebrew in #272.
    for (const evt of ENGLISH_DOM_EVENT_NAMES) {
      if (!keywordMap.has(evt)) {
        keywordMap.set(evt, { native: evt, normalized: evt });
      }
    }

    // Add extra entries (literals, positional, events) - these OVERRIDE profile entries
    for (const extra of extras) {
      keywordMap.set(extra.native, extra);
    }

    // Convert to array and sort longest-first for greedy matching
    this.profileKeywords = Array.from(keywordMap.values()).sort(
      (a, b) => b.native.length - a.native.length
    );

    // Multi-word (space-containing) keywords, for longest-phrase matching at a
    // token boundary. Already longest-first (profileKeywords is sorted above).
    // Marker/modifier concepts are EXCLUDED: those are matched positionally by
    // the pattern matcher (role markers), and greedily consuming a multi-word
    // marker phrase shadows the single-word marker patterns rely on — e.g. id
    // `ke dalam` (into) would swallow the `ke` destination marker, and ko `할 때`
    // (eventMarker) would pre-empt the SOV event extraction. Command verbs,
    // control-flow, and event-name keywords (vi `với mỗi`=for, es `tecla abajo`=
    // keydown, bn `তৈরি করুন`=make) are kept — the pattern matcher treats those
    // as keyword literals, so one-token matching is strictly better.
    this.multiWordKeywords = this.profileKeywords.filter(
      k => k.native.includes(' ') && !MARKER_CONCEPT_NORMALIZEDS.has(k.normalized)
    );

    // Build Map for O(1) lookups (case-insensitive + diacritic-insensitive)
    // This allows matching both 'بدّل' (with shadda) and 'بدل' (without) to the same entry
    this.profileKeywordMap = new Map();
    for (const keyword of this.profileKeywords) {
      // Add original form (with diacritics if present)
      this.profileKeywordMap.set(keyword.native.toLowerCase(), keyword);

      // Add diacritic-normalized form (for Arabic, Turkish, etc.)
      const normalized = this.removeDiacritics(keyword.native);
      if (normalized !== keyword.native && !this.profileKeywordMap.has(normalized.toLowerCase())) {
        this.profileKeywordMap.set(normalized.toLowerCase(), keyword);
      }
    }
  }

  /**
   * Remove diacritical marks from a word for normalization.
   * Primarily for Arabic (shadda, fatha, kasra, damma, sukun, etc.)
   * but could be extended for other languages.
   *
   * @param word - Word to normalize
   * @returns Word without diacritics
   */
  protected removeDiacritics(word: string): string {
    // Arabic diacritics: U+064B-U+0652 (fatha, kasra, damma, sukun, shadda, etc.)
    // U+0670 (superscript alif)
    return word.replace(/[\u064B-\u0652\u0670]/g, '');
  }

  /**
   * Try to match a keyword from profile at the current position.
   * Uses longest-first greedy matching (important for non-space languages).
   *
   * @param input - Input string
   * @param pos - Current position
   * @returns Token if matched, null otherwise
   */
  protected tryProfileKeyword(input: string, pos: number): LanguageToken | null {
    for (const entry of this.profileKeywords) {
      if (input.slice(pos).startsWith(entry.native)) {
        return createToken(
          entry.native,
          'keyword',
          createPosition(pos, pos + entry.native.length),
          entry.normalized
        );
      }
    }
    return null;
  }

  /**
   * Match the longest multi-word (space-containing) profile keyword at `pos`,
   * requiring the match to end at a word boundary. The profile-driven
   * counterpart of the per-language hardcoded compound lists (the hindi and
   * vietnamese keyword extractors). Returns a keyword token (with the normalized
   * form) or null. Case-sensitive against the stored native form, mirroring
   * `tryProfileKeyword`/`isKeywordStart` (the i18n dicts emit a fixed surface
   * case). No-op when `multiWordKeywords` is empty (no-space/CJK languages).
   *
   * @param input - Input string
   * @param pos - Current position (must be a token-start boundary)
   * @param isWordChar - End-boundary predicate (defaults to Unicode letter/digit/_)
   */
  protected tryMultiWordKeyword(
    input: string,
    pos: number,
    isWordChar: (char: string) => boolean = ch => /[\p{L}\p{N}_]/u.test(ch)
  ): LanguageToken | null {
    if (this.multiWordKeywords.length === 0) return null;
    const rest = input.slice(pos);
    for (const entry of this.multiWordKeywords) {
      if (!rest.startsWith(entry.native)) continue;
      const after = input[pos + entry.native.length];
      if (after !== undefined && isWordChar(after)) continue; // not a word boundary
      return createToken(
        entry.native,
        'keyword',
        createPosition(pos, pos + entry.native.length),
        entry.normalized
      );
    }
    return null;
  }

  /**
   * Check if the remaining input starts with any known keyword.
   * Useful for non-space languages to detect word boundaries.
   *
   * @param input - Input string
   * @param pos - Current position
   * @returns true if a keyword starts at this position
   */
  protected isKeywordStart(input: string, pos: number): boolean {
    const remaining = input.slice(pos);
    return this.profileKeywords.some(entry => remaining.startsWith(entry.native));
  }

  /**
   * Check if a known keyword starts at the given position AND ends at a word
   * boundary (end of input or a non-word character).
   *
   * Space-delimited languages must use this (not `isKeywordStart`) for
   * word-walk break checks: the keyword table includes English canonical
   * fallbacks (me, it, you, …), so a raw `startsWith` check splits any native
   * word with an embedded fallback mid-word (e.g. Quechua ñit'iy contains
   * "it"). CJK/no-space tokenizers rely on mid-text keyword starts and must
   * keep using `isKeywordStart`.
   *
   * @param input - Input string
   * @param pos - Current position
   * @param isWordChar - Language-specific word-character predicate; pass the
   *   tokenizer's letter classifier so e.g. the Quechua glottal apostrophe
   *   counts as part of a word. Defaults to Unicode letters/digits/underscore.
   * @returns true if a keyword starts here and is not followed by a word char
   */
  protected isKeywordStartAtBoundary(
    input: string,
    pos: number,
    isWordChar: (char: string) => boolean = ch => /[\p{L}\p{N}_]/u.test(ch)
  ): boolean {
    const remaining = input.slice(pos);
    return this.profileKeywords.some(entry => {
      if (!remaining.startsWith(entry.native)) return false;
      const after = input[pos + entry.native.length];
      return after === undefined || !isWordChar(after);
    });
  }

  /**
   * Look up a keyword by native word (case-insensitive).
   * O(1) lookup using the keyword map.
   *
   * @param native - Native word to look up
   * @returns KeywordEntry if found, undefined otherwise
   */
  protected lookupKeyword(native: string): KeywordEntry | undefined {
    return this.profileKeywordMap.get(native.toLowerCase());
  }

  /**
   * Check if a word is a known keyword (case-insensitive).
   * O(1) lookup using the keyword map.
   *
   * @param native - Native word to check
   * @returns true if the word is a keyword
   */
  protected isKeyword(native: string): boolean {
    return this.profileKeywordMap.has(native.toLowerCase());
  }

  /**
   * Set the morphological normalizer for this tokenizer.
   */
  setNormalizer(normalizer: MorphologicalNormalizer): void {
    this.normalizer = normalizer;
  }

  /**
   * Try to normalize a word using the morphological normalizer.
   * Returns null if no normalizer is set or normalization fails.
   *
   * Note: We don't check isNormalizable() here because the individual tokenizers
   * historically called normalize() directly without that check. The normalize()
   * method itself handles returning noChange() for words that can't be normalized.
   */
  protected tryNormalize(word: string): NormalizationResult | null {
    if (!this.normalizer) return null;

    const result = this.normalizer.normalize(word);

    // Only return if actually normalized (stem differs from input)
    if (result.stem !== word && result.confidence >= 0.7) {
      return result;
    }

    return null;
  }

  /**
   * Try morphological normalization and keyword lookup.
   *
   * If the word can be normalized to a stem that matches a known keyword,
   * returns a keyword token with morphological metadata (stem, stemConfidence).
   *
   * This is the common pattern for handling conjugated verbs across languages:
   * 1. Normalize the word (e.g., "toggled" → "toggle")
   * 2. Look up the stem in the keyword map
   * 3. Create a token with both the original form and stem metadata
   *
   * @param word - The word to normalize and look up
   * @param startPos - Start position for the token
   * @param endPos - End position for the token
   * @returns Token if stem matches a keyword, null otherwise
   */
  protected tryMorphKeywordMatch(
    word: string,
    startPos: number,
    endPos: number
  ): LanguageToken | null {
    const result = this.tryNormalize(word);
    if (!result) return null;

    // Check if the stem is a known keyword
    const stemEntry = this.lookupKeyword(result.stem);
    if (!stemEntry) return null;

    const tokenOptions: CreateTokenOptions = {
      normalized: stemEntry.normalized,
      stem: result.stem,
      stemConfidence: result.confidence,
    };
    return createToken(word, 'keyword', createPosition(startPos, endPos), tokenOptions);
  }

  /**
   * Try to extract a CSS selector at the current position.
   */
  protected trySelector(input: string, pos: number): LanguageToken | null {
    const selector = extractCssSelector(input, pos);
    if (selector) {
      return createToken(selector, 'selector', createPosition(pos, pos + selector.length));
    }
    return null;
  }

  /**
   * Try to extract an event modifier at the current position.
   * Event modifiers are .once, .debounce(N), .throttle(N), .queue(strategy)
   */
  protected tryEventModifier(input: string, pos: number): LanguageToken | null {
    // Must start with a dot
    if (input[pos] !== '.') {
      return null;
    }

    // Match pattern: .(once|debounce|throttle|queue) followed by optional (value)
    const match = input
      .slice(pos)
      .match(/^\.(?:once|debounce|throttle|queue)(?:\(([^)]+)\))?(?:\s|$|\.)/);
    if (!match) {
      return null;
    }

    const fullMatch = match[0].replace(/(\s|\.)$/, ''); // Remove trailing space or dot
    const modifierName = fullMatch.slice(1).split('(')[0]; // Extract modifier name
    const value = match[1]; // Extract value from parentheses if present

    // Create token with metadata
    const token = createToken(
      fullMatch,
      'event-modifier',
      createPosition(pos, pos + fullMatch.length)
    );

    // Add metadata for the modifier
    return {
      ...token,
      metadata: {
        modifierName,
        value: value ? (modifierName === 'queue' ? value : parseInt(value, 10)) : undefined,
      },
    };
  }

  /**
   * Try to extract a string literal at the current position.
   */
  protected tryString(input: string, pos: number): LanguageToken | null {
    const literal = extractStringLiteral(input, pos);
    if (literal) {
      return createToken(literal, 'literal', createPosition(pos, pos + literal.length));
    }
    return null;
  }

  /**
   * Try to extract a number at the current position.
   */
  protected tryNumber(input: string, pos: number): LanguageToken | null {
    const number = extractNumber(input, pos);
    if (number) {
      return createToken(number, 'literal', createPosition(pos, pos + number.length));
    }
    return null;
  }

  /**
   * Configuration for native language time units.
   * Maps patterns to their standard suffix (ms, s, m, h).
   */
  protected static readonly STANDARD_TIME_UNITS: readonly TimeUnitMapping[] = [
    { pattern: 'ms', suffix: 'ms', length: 2 },
    { pattern: 's', suffix: 's', length: 1, checkBoundary: true },
    { pattern: 'm', suffix: 'm', length: 1, checkBoundary: true, notFollowedBy: 's' },
    { pattern: 'h', suffix: 'h', length: 1, checkBoundary: true },
  ];

  /**
   * Try to match a time unit from a list of patterns.
   *
   * @param input - Input string
   * @param pos - Position after the number
   * @param timeUnits - Array of time unit mappings (native pattern → standard suffix)
   * @param skipWhitespace - Whether to skip whitespace before time unit (default: false)
   * @returns Object with matched suffix and new position, or null if no match
   */
  protected tryMatchTimeUnit(
    input: string,
    pos: number,
    timeUnits: readonly TimeUnitMapping[],
    skipWhitespace = false
  ): { suffix: string; endPos: number } | null {
    let unitPos = pos;

    // Optionally skip whitespace before time unit
    if (skipWhitespace) {
      while (unitPos < input.length && isWhitespace(input[unitPos])) {
        unitPos++;
      }
    }

    const remaining = input.slice(unitPos);

    // Check each time unit pattern
    for (const unit of timeUnits) {
      const candidate = remaining.slice(0, unit.length);
      const matches = unit.caseInsensitive
        ? candidate.toLowerCase() === unit.pattern.toLowerCase()
        : candidate === unit.pattern;

      if (matches) {
        // Check notFollowedBy constraint (e.g., 'm' should not match 'ms')
        if (unit.notFollowedBy) {
          const nextChar = remaining[unit.length] || '';
          if (nextChar === unit.notFollowedBy) continue;
        }

        // Check word boundary if required
        if (unit.checkBoundary) {
          const nextChar = remaining[unit.length] || '';
          if (isAsciiIdentifierChar(nextChar)) continue;
        }

        return { suffix: unit.suffix, endPos: unitPos + unit.length };
      }
    }

    return null;
  }

  /**
   * Parse a base number (sign, integer, decimal) without time units.
   * Returns the number string and end position.
   *
   * @param input - Input string
   * @param startPos - Start position
   * @param allowSign - Whether to allow +/- sign (default: true)
   * @returns Object with number string and end position, or null
   */
  protected parseBaseNumber(
    input: string,
    startPos: number,
    allowSign = true
  ): { number: string; endPos: number } | null {
    let pos = startPos;
    let number = '';

    // Optional sign
    if (allowSign && (input[pos] === '-' || input[pos] === '+')) {
      number += input[pos++];
    }

    // Must have at least one digit
    if (pos >= input.length || !isDigit(input[pos])) {
      return null;
    }

    // Integer part
    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    // Optional decimal
    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    if (!number || number === '-' || number === '+') return null;

    return { number, endPos: pos };
  }

  /**
   * Try to extract a number with native language time units.
   *
   * This is a template method that handles the common pattern:
   * 1. Parse the base number (sign, integer, decimal)
   * 2. Try to match native language time units
   * 3. Fall back to standard time units (ms, s, m, h)
   *
   * @param input - Input string
   * @param pos - Start position
   * @param nativeTimeUnits - Language-specific time unit mappings
   * @param options - Configuration options
   * @returns Token if number found, null otherwise
   */
  protected tryNumberWithTimeUnits(
    input: string,
    pos: number,
    nativeTimeUnits: readonly TimeUnitMapping[],
    options: { allowSign?: boolean; skipWhitespace?: boolean } = {}
  ): LanguageToken | null {
    const { allowSign = true, skipWhitespace = false } = options;

    // Parse base number
    const baseResult = this.parseBaseNumber(input, pos, allowSign);
    if (!baseResult) return null;

    let { number, endPos } = baseResult;

    // Try native time units first, then standard
    const allUnits = [...nativeTimeUnits, ...BaseTokenizer.STANDARD_TIME_UNITS];
    const timeMatch = this.tryMatchTimeUnit(input, endPos, allUnits, skipWhitespace);

    if (timeMatch) {
      number += timeMatch.suffix;
      endPos = timeMatch.endPos;
    }

    return createToken(number, 'literal', createPosition(pos, endPos));
  }

  /**
   * Try to extract a URL at the current position.
   * Handles /path, ./path, ../path, //domain.com, http://, https://
   */
  protected tryUrl(input: string, pos: number): LanguageToken | null {
    const url = extractUrl(input, pos);
    if (url) {
      return createToken(url, 'url', createPosition(pos, pos + url.length));
    }
    return null;
  }

  /**
   * Try to extract a variable reference (:varname) at the current position.
   * In hyperscript, :x refers to a local variable named x.
   */
  protected tryVariableRef(input: string, pos: number): LanguageToken | null {
    if (input[pos] !== ':') return null;
    if (pos + 1 >= input.length) return null;
    if (!isAsciiIdentifierChar(input[pos + 1])) return null;

    let endPos = pos + 1;
    while (endPos < input.length && isAsciiIdentifierChar(input[endPos])) {
      endPos++;
    }

    const varRef = input.slice(pos, endPos);
    return createToken(varRef, 'identifier', createPosition(pos, endPos));
  }

  /**
   * Try to extract an operator or punctuation token at the current position.
   * Handles two-character operators (==, !=, etc.) and single-character operators.
   */
  protected tryOperator(input: string, pos: number): LanguageToken | null {
    // Two-character operators
    const twoChar = input.slice(pos, pos + 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '->'].includes(twoChar)) {
      return createToken(twoChar, 'operator', createPosition(pos, pos + 2));
    }

    // Single-character operators
    const oneChar = input[pos];
    if (['<', '>', '!', '+', '-', '*', '/', '='].includes(oneChar)) {
      return createToken(oneChar, 'operator', createPosition(pos, pos + 1));
    }

    // Punctuation
    if (['(', ')', '{', '}', ',', ';', ':'].includes(oneChar)) {
      return createToken(oneChar, 'punctuation', createPosition(pos, pos + 1));
    }

    return null;
  }

  /**
   * Try to match a multi-character particle from a list.
   *
   * Used by languages like Japanese, Korean, and Chinese that have
   * multi-character particles (e.g., Japanese から, まで, より).
   *
   * @param input - Input string
   * @param pos - Current position
   * @param particles - Array of multi-character particles to match
   * @returns Token if matched, null otherwise
   */
  protected tryMultiCharParticle(
    input: string,
    pos: number,
    particles: readonly string[]
  ): LanguageToken | null {
    for (const particle of particles) {
      if (input.slice(pos, pos + particle.length) === particle) {
        return createToken(particle, 'particle', createPosition(pos, pos + particle.length));
      }
    }
    return null;
  }
}

// =============================================================================
// Simple Tokenizer Factory
// =============================================================================

/**
 * Configuration for createSimpleTokenizer.
 *
 * Creates a tokenizer from declarative config instead of a class definition.
 * Covers the common pattern used by domain packages (SQL, BDD, JSX).
 *
 * **Keyword resolution** uses two additive paths:
 * 1. `keywords` — explicit list, checked first. Respects `caseInsensitive`.
 * 2. `keywordProfile` — populates BaseTokenizer's profile keyword map via
 *    `initializeKeywordsFromProfile()`. Checked second via `isKeyword()`, which
 *    always lowercases (harmless for CJK/Arabic; notable for Latin scripts
 *    with `caseInsensitive: false`). Provides normalization metadata for
 *    non-Latin scripts.
 */
export interface SimpleTokenizerConfig {
  /** ISO 639-1 language code */
  language: string;
  /** Text direction (default: 'ltr') */
  direction?: 'ltr' | 'rtl';
  /** Keywords to recognize (lowercased for lookup if caseInsensitive) */
  keywords: string[];
  /** Extra keyword entries for non-Latin normalization */
  keywordExtras?: KeywordEntry[];
  /** Profile for initializeKeywordsFromProfile (for non-Latin scripts) */
  keywordProfile?: TokenizerProfile;
  /** Include operator classification (default: false). Uses DEFAULT_OPERATORS from OperatorExtractor. */
  includeOperators?: boolean;
  /** Case-insensitive keyword matching (default: true) */
  caseInsensitive?: boolean;
  /** Custom extractors registered BEFORE default extractors */
  customExtractors?: ValueExtractor[];
}

/**
 * Create a tokenizer from declarative configuration.
 *
 * Eliminates the boilerplate of extending BaseTokenizer for simple domain tokenizers.
 * Handles keyword classification, optional operator support, and non-Latin keyword setup.
 *
 * @example
 * ```typescript
 * const englishSQL = createSimpleTokenizer({
 *   language: 'en',
 *   keywords: ['select', 'insert', 'update', 'delete', 'from', 'into', 'where', 'set', 'values'],
 *   includeOperators: true,
 *   caseInsensitive: true,
 * });
 * ```
 */
export function createSimpleTokenizer(config: SimpleTokenizerConfig): LanguageTokenizer {
  const {
    language,
    direction = 'ltr',
    keywords,
    keywordExtras,
    keywordProfile,
    includeOperators = false,
    caseInsensitive = true,
    customExtractors,
  } = config;

  const keywordSet = new Set(caseInsensitive ? keywords.map(k => k.toLowerCase()) : keywords);

  class SimpleTokenizer extends BaseTokenizer {
    readonly language = language;
    readonly direction = direction;

    constructor() {
      super();
      if (customExtractors) {
        this.registerExtractors(customExtractors);
      }
      this.registerExtractors(getDefaultExtractors());
      if (keywordProfile) {
        this.initializeKeywordsFromProfile(keywordProfile, keywordExtras);
      }
    }

    classifyToken(token: string): TokenKind {
      // Fast path: explicit keywords from config (respects caseInsensitive)
      const lookup = caseInsensitive ? token.toLowerCase() : token;
      if (keywordSet.has(lookup)) return 'keyword';
      // Profile path: non-Latin normalization (always lowercases via profileKeywordMap)
      if (this.isKeyword(token)) return 'keyword';
      if (/^\d/.test(token)) return 'literal';
      if (/^['"]/.test(token)) return 'literal';
      if (includeOperators && SIMPLE_TOKENIZER_OPERATOR_SET.has(token)) return 'operator';
      return 'identifier';
    }
  }

  return new SimpleTokenizer();
}
