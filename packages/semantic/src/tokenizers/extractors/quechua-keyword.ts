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

      // Check all chars are Quechua
      let allQuechua = true;
      for (let i = 0; i < candidate.length; i++) {
        if (!isQuechuaLetter(candidate[i])) {
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
      // Break for an attached keyword (agglutinative suffix like `-ta`, `-man`)
      // only when the match ends at a word boundary. A raw isKeywordStart check
      // splits native words around embedded English-fallback keywords (me, it,
      // you, … are injected for every language): ñit'iy → ñ + it + 'iy.
      // isQuechuaLetter keeps the glottal apostrophe inside the word.
      if (word.length > 0 && this.context.isKeywordStartAtBoundary?.(input, pos, isQuechuaLetter)) {
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
