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
    /[a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/
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
          !/[a-zA-Zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/.test(
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
