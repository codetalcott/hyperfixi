/**
 * Quechua Keyword Extractor (Context-Aware)
 *
 * Handles Quechua (Runasimi) word extraction for:
 * - Latin alphabet with special characters (ñ, glottal stop apostrophe)
 * - SOV word order
 * - Agglutinative/polysynthetic morphology
 * - Postposition suffixes (case markers)
 *
 * Integrates with morphological normalizer for verb conjugations.
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

/**
 * Check if a character is a Quechua letter.
 * Quechua uses Latin alphabet with special glottal stop apostrophe and ñ.
 */
function isQuechuaLetter(char: string): boolean {
  const code = char.charCodeAt(0);
  // Basic Latin letters
  if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
    return true;
  }
  // Quechua special characters: ñ, apostrophe
  return char === 'ñ' || char === 'Ñ' || char === "'" || char === '\u2019';
}

/**
 * Quechua suffixes (postpositions/case markers).
 * These can be written with or without hyphens.
 */
const SUFFIXES = new Set([
  '-ta', // accusative (direct object)
  '-man', // allative (to, towards)
  '-manta', // ablative (from)
  '-pi', // locative (at, in)
  '-wan', // comitative/instrumental (with)
  '-paq', // benefactive (for)
  '-kama', // limitative (until, up to)
  '-rayku', // causative (because of)
  '-hina', // simulative (like, as)
  // Standalone (unhyphenated) forms — used when written as separate words
  'ta',
  'man',
  'manta',
  'pi',
  'wan',
  'paq',
  'kama',
  'hina',
  'pa',
]);

/**
 * Common Quechua postpositions that are not typically attached as suffixes.
 */
const POSTPOSITIONS = new Set([
  'kama', // until
  'hina', // like, as
  'rayku', // because of
  'paq', // for
]);

/**
 * Standalone (unhyphenated) Quechua case-marker forms that legitimately
 * agglutinate onto a stem — used by the word reader to decide where to break.
 * Derived from {@link SUFFIXES}/{@link POSTPOSITIONS} (hyphen stripped, plus the
 * `rayku` postposition the suffix set lists only hyphenated).
 */
const AGGLUTINATIVE_MARKERS: ReadonlySet<string> = new Set(
  [...SUFFIXES, ...POSTPOSITIONS].map(s => (s.startsWith('-') ? s.slice(1) : s))
);

/**
 * Whether a Quechua case-marker suffix starts at `pos` and ends at a word
 * boundary (end of input or a non-Quechua-letter). Unlike a generic
 * isKeywordStart check, this never fires on the English canonical fallbacks
 * injected into the keyword table, so native words containing `it`/`me`/… are
 * not split (`init`, `ñit'iy`).
 */
function quechuaSuffixStartsAt(input: string, pos: number): boolean {
  const remaining = input.slice(pos);
  for (const marker of AGGLUTINATIVE_MARKERS) {
    if (!remaining.startsWith(marker)) continue;
    const after = input[pos + marker.length];
    if (after === undefined || !isQuechuaLetter(after)) return true;
  }
  return false;
}

/**
 * QuechuaKeywordExtractor - Context-aware extractor for Quechua words.
 *
 * Handles:
 * - Quechua alphabet with glottal stop apostrophe
 * - Agglutinative morphology
 * - Postposition detection with metadata
 */
export class QuechuaKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'quechua-keyword';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    if (isQuechuaLetter(input[position])) return true;
    // Hyphenated suffix notation (`-ta`, `-pi`, `-manta`, …). Without this the
    // bare `-` is split off as a stray operator token, which breaks SOV pattern
    // matching (`.active -ta tikray` would fail where `.active ta tikray` works).
    return this.isHyphenatedSuffix(input, position) !== null;
  }

  /**
   * Return the suffix (without the leading hyphen) if `position` begins a
   * hyphenated Quechua suffix like `-ta`, else null.
   */
  private isHyphenatedSuffix(input: string, position: number): string | null {
    if (input[position] !== '-') return null;
    const match = input.slice(position).match(/^-([a-zñ'’]+)/i);
    if (match && SUFFIXES.has(`-${match[1].toLowerCase()}`)) return match[1];
    return null;
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('QuechuaKeywordExtractor: context not set');
    }

    const startPos = position;

    // Hyphenated suffix (`-ta`): consume the leading hyphen and emit the bare
    // suffix token, so it tokenizes identically to the standalone `ta` form.
    const hyphenSuffix = this.isHyphenatedSuffix(input, position);
    if (hyphenSuffix !== null) {
      return {
        value: hyphenSuffix,
        length: hyphenSuffix.length + 1, // +1 for the consumed hyphen
        metadata: { suffixValue: hyphenSuffix.toLowerCase() },
      };
    }

    // First, try to find the longest matching keyword starting at this position
    // This ensures compound words are recognized whole
    const maxKeywordLen = 12; // Longest Quechua keyword
    for (let len = Math.min(maxKeywordLen, input.length - startPos); len >= 2; len--) {
      const candidate = input.slice(startPos, startPos + len);

      // Only accept a match that ends at a word boundary. Without this, a
      // keyword prefix steals the front of a longer native word (ñit'iy
      // matching inside ñit'iyq leaves a stray `q` token). Boundary-broken
      // suffix splits (wasita → wasi + ta) still happen in the word-walk below.
      const after = input[startPos + len];
      if (after !== undefined && isQuechuaLetter(after)) continue;

      // Check all chars are Quechua. An interior `_` is allowed so the dict's
      // underscore compounds (k_iri, hatun_kay — exact keyword entries) can
      // match whole; a compound with no entry fails the lookup below and falls
      // through to the word-walk, splitting at `_` exactly as before.
      let allQuechua = true;
      for (let i = 0; i < candidate.length; i++) {
        const ch = candidate[i];
        if (ch === '_' && i > 0 && i < candidate.length - 1) continue;
        if (!isQuechuaLetter(ch)) {
          allQuechua = false;
          break;
        }
      }
      if (!allQuechua) continue;

      // Look up keyword entry
      const keywordEntry = this.context.lookupKeyword(candidate);
      if (keywordEntry) {
        return {
          value: candidate,
          length: len,
          metadata: {
            normalized:
              keywordEntry.normalized !== keywordEntry.native ? keywordEntry.normalized : undefined,
          },
        };
      }

      // Try morphological normalization
      if (this.context.normalizer) {
        const morphResult = this.context.normalizer.normalize(candidate);
        if (morphResult.stem !== candidate && morphResult.confidence >= 0.7) {
          const stemEntry = this.context.lookupKeyword(morphResult.stem);
          if (stemEntry) {
            return {
              value: candidate,
              length: len,
              metadata: {
                normalized: stemEntry.normalized,
              },
            };
          }
        }
      }
    }

    // No keyword match - extract as regular word using character classification
    let word = '';
    let pos = position;

    while (pos < input.length && isQuechuaLetter(input[pos])) {
      // Break for an attached agglutinative case-marker suffix (`-ta`, `-man`,
      // `-pi`, …) at a word boundary. Restricted to the Quechua suffix set — a
      // generic isKeywordStart(AtBoundary) check also fires on the English
      // canonical fallbacks (me, it, you, …) injected into every language's
      // keyword table, splitting native words around them: `init` → `in` + `it`
      // (which silently dropped the behavior `init` block — the parser saw `in`,
      // not the `init` keyword), `ñit'iy` → `ñ` + `it` + `'iy`. Only real case
      // markers legitimately agglutinate onto a stem; English fallbacks never do.
      if (word.length > 0 && quechuaSuffixStartsAt(input, pos)) {
        break;
      }
      word += input[pos];
      pos++;
    }

    if (!word) return null;

    // Check if it's a suffix (with metadata for disambiguation)
    if (SUFFIXES.has(word.toLowerCase())) {
      return {
        value: word,
        length: pos - startPos,
        metadata: {
          suffixValue: word.toLowerCase(),
        },
      };
    }

    // Check if it's a postposition (with metadata for disambiguation)
    if (POSTPOSITIONS.has(word.toLowerCase())) {
      return {
        value: word,
        length: pos - startPos,
        metadata: {
          postpositionValue: word.toLowerCase(),
        },
      };
    }

    // Look up keyword entry
    const keywordEntry = this.context.lookupKeyword(word);
    const normalized =
      keywordEntry && keywordEntry.normalized !== keywordEntry.native
        ? keywordEntry.normalized
        : undefined;

    // Try morphological normalization if available
    let morphNormalized: string | undefined;
    if (!keywordEntry && this.context.normalizer) {
      const morphResult = this.context.normalizer.normalize(word);
      if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
        const stemEntry = this.context.lookupKeyword(morphResult.stem);
        if (stemEntry) {
          morphNormalized = stemEntry.normalized;
        }
      }
    }

    return {
      value: word,
      length: pos - startPos,
      metadata: {
        normalized: normalized || morphNormalized,
      },
    };
  }
}

/**
 * Create Quechua-specific keyword extractor.
 */
export function createQuechuaKeywordExtractor(): ContextAwareExtractor {
  return new QuechuaKeywordExtractor();
}
