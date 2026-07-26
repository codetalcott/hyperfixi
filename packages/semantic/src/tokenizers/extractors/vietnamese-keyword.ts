/**
 * Vietnamese Keyword Extractor (Context-Aware)
 *
 * Handles Vietnamese-specific identifier and keyword extraction with:
 * - Tone mark handling (à, á, ả, ã, ạ, etc.)
 * - Vowel modifications (ă, â, ê, ô, ơ, ư, đ)
 * - Preposition detection (21 prepositions)
 * - Multi-word phrase support
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

function createLatinCharClassifiers(pattern: RegExp) {
  const isLetter = (char: string) => pattern.test(char);
  const isIdentifierChar = (char: string) => /[0-9]/.test(char) || pattern.test(char);
  return { isLetter, isIdentifierChar };
}

const { isLetter: isVietnameseLetter, isIdentifierChar: isVietnameseIdentifierChar } =
  createLatinCharClassifiers(
    /[a-zA-Z\u00e0\u00e1\u1ea3\u00e3\u1ea1\u0103\u1eb1\u1eaf\u1eb3\u1eb5\u1eb7\u00e2\u1ea7\u1ea5\u1ea9\u1eab\u1ead\u00e8\u00e9\u1ebb\u1ebd\u1eb9\u00ea\u1ec1\u1ebf\u1ec3\u1ec5\u1ec7\u00ec\u00ed\u1ec9\u0129\u1ecb\u00f2\u00f3\u1ecf\u00f5\u1ecd\u00f4\u1ed3\u1ed1\u1ed5\u1ed7\u1ed9\u01a1\u1edd\u1edb\u1edf\u1ee1\u1ee3\u00f9\u00fa\u1ee7\u0169\u1ee5\u01b0\u1eeb\u1ee9\u1eed\u1eef\u1ef1\u1ef3\u00fd\u1ef7\u1ef9\u1ef5\u0111\u00c0\u00c1\u1ea2\u00c3\u1ea0\u0102\u1eb0\u1eae\u1eb2\u1eb4\u1eb6\u00c2\u1ea6\u1ea4\u1ea8\u1eaa\u1eac\u00c8\u00c9\u1eba\u1ebc\u1eb8\u00ca\u1ec0\u1ebe\u1ec2\u1ec4\u1ec6\u00cc\u00cd\u1ec8\u0128\u1eca\u00d2\u00d3\u1ece\u00d5\u1ecc\u00d4\u1ed2\u1ed0\u1ed4\u1ed6\u1ed8\u01a0\u1edc\u1eda\u1ede\u1ee0\u1ee2\u00d9\u00da\u1ee6\u0168\u1ee4\u01af\u1eea\u1ee8\u1eec\u1eee\u1ef0\u1ef2\u00dd\u1ef6\u1ef8\u1ef4\u0110]/
  );

/**
 * Vietnamese prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'trong', // in, inside
  'ngoài', // outside
  'trên', // on, above
  'dưới', // under, below
  'vào', // into
  'ra', // out
  'đến', // to
  'từ', // from
  'với', // with
  'cho', // for, to
  'bởi', // by
  'qua', // through
  'trước', // before
  'sau', // after
  'giữa', // between
  'bên', // beside
  'theo', // according to, along
  'về', // about, towards
  'tới', // to, towards
  'lên', // up
  'xuống', // down
]);

/**
 * VietnameseKeywordExtractor - Context-aware extractor for Vietnamese identifiers and keywords.
 */
export class VietnameseKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'vietnamese-keyword';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isVietnameseLetter(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('VietnameseKeywordExtractor: context not set');
    }

    // Try multi-word phrase first
    const phraseResult = this.tryMultiWordPhrase(input, position);
    if (phraseResult) {
      return phraseResult;
    }

    // Fall back to single word
    let pos = position;
    let word = '';

    while (pos < input.length && isVietnameseIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();

    // Check if it's a preposition
    const isPreposition = PREPOSITIONS.has(lower);

    // Look up keyword entry
    const keywordEntry = this.context.lookupKeyword(lower);
    const normalized =
      keywordEntry && keywordEntry.normalized !== keywordEntry.native
        ? keywordEntry.normalized
        : undefined;

    return {
      value: word,
      length: pos - position,
      metadata: {
        normalized,
        isPreposition,
      },
    };
  }

  /**
   * Try to match a multi-word ROLE-MARKER phrase that the base tokenizer cannot.
   *
   * Task #10 Phase C retired this extractor's ~80-entry compound allowlist: every
   * non-marker Vietnamese multi-word keyword (chuyển đổi=toggle, hiển thị=show,
   * với mỗi=for, trước khi=before, cho đến khi=until, …) is now a profile keyword
   * whose natural spaced form the base tokenizer's profile-driven
   * `tryMultiWordKeyword` (#416) emits as ONE keyword token before any extractor
   * runs. Only the two phrases the base mechanism MUST exclude remain here:
   * `vào trong` (into) and `sự kiện` (event) carry marker concepts matched by the
   * pattern matcher's role mechanism (see MARKER_CONCEPT_NORMALIZEDS in the
   * framework base tokenizer), so pre-matching them as one keyword would shadow
   * the single-word markers the patterns rely on.
   */
  private tryMultiWordPhrase(input: string, position: number): ExtractionResult | null {
    if (!this.context) return null;

    const multiWordPhrases = [
      'vào trong', // into (marker — kept out of base multi-word matching)
      'sự kiện', // event (marker — kept out of base multi-word matching)
    ];

    for (const phrase of multiWordPhrases) {
      const candidate = input.slice(position, position + phrase.length).toLowerCase();
      if (candidate === phrase.toLowerCase()) {
        // Check word boundary
        const nextPos = position + phrase.length;
        if (
          nextPos >= input.length ||
          !/[a-zA-Z\u00e0\u00e1\u1ea3\u00e3\u1ea1\u0103\u1eb1\u1eaf\u1eb3\u1eb5\u1eb7\u00e2\u1ea7\u1ea5\u1ea9\u1eab\u1ead\u00e8\u00e9\u1ebb\u1ebd\u1eb9\u00ea\u1ec1\u1ebf\u1ec3\u1ec5\u1ec7\u00ec\u00ed\u1ec9\u0129\u1ecb\u00f2\u00f3\u1ecf\u00f5\u1ecd\u00f4\u1ed3\u1ed1\u1ed5\u1ed7\u1ed9\u01a1\u1edd\u1edb\u1edf\u1ee1\u1ee3\u00f9\u00fa\u1ee7\u0169\u1ee5\u01b0\u1eeb\u1ee9\u1eed\u1eef\u1ef1\u1ef3\u00fd\u1ef7\u1ef9\u1ef5\u0111]/.test(
            input[nextPos]
          )
        ) {
          // Look up the normalized form
          const keywordEntry = this.context.lookupKeyword(phrase);
          return {
            value: input.slice(position, nextPos),
            length: phrase.length,
            metadata: {
              normalized: keywordEntry?.normalized,
              isPreposition: false,
            },
          };
        }
      }
    }

    return null;
  }
}

/**
 * Create Vietnamese-specific extractors.
 */
export function createVietnameseExtractors(): ContextAwareExtractor[] {
  return [new VietnameseKeywordExtractor()];
}
