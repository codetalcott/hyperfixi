/**
 * Polish Keyword Extractor (Context-Aware)
 *
 * Extracts Polish keywords with morphological normalization support.
 * Polish characteristics:
 * - Latin script with Polish diacritics (ą, ę, ć, ń, ó, ś, ź, ż, ł)
 * - SVO word order with relatively free word order
 * - Fusional morphology with verb conjugations
 * - Imperative forms commonly used in software UI
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

/**
 * Polish prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'do', // to, into
  'od', // from
  'z', // from, with
  'ze', // from, with (before consonant clusters)
  'w', // in
  'we', // in (before consonant clusters)
  'na', // on, for
  'po', // after, for
  'pod', // under
  'przed', // before, in front of
  'za', // behind, for
  'nad', // above
  'między', // between
  'miedzy', // between (no diacritic)
  'przez', // through, by
  'dla', // for
  'bez', // without
  'o', // about
  'przy', // at, by
  'u', // at (someone's place)
  'według', // according to
  'wedlug', // according to (no diacritic)
  'mimo', // despite
  'wśród', // among
  'wsrod', // among (no diacritic)
  'obok', // beside
  'poza', // outside, beyond
  'wokół', // around
  'wokol', // around (no diacritic)
  'przeciw', // against
  'ku', // towards
]);

/**
 * Character classifiers for Polish.
 */
function createPolishCharClassifiers() {
  const polishPattern =
    /[a-zA-Z\u0105\u0119\u0107\u0144\u00f3\u015b\u017a\u017c\u0142\u0104\u0118\u0106\u0143\u00d3\u015a\u0179\u017b\u0141]/;
  const isLetter = (char: string) => polishPattern.test(char);
  const isIdentifierChar = (char: string) => /[0-9]/.test(char) || polishPattern.test(char);
  return { isLetter, isIdentifierChar };
}

const { isLetter: isPolishLetter, isIdentifierChar: isPolishIdentifierChar } =
  createPolishCharClassifiers();

/**
 * Polish keyword extractor with morphological normalization.
 */
export class PolishKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'polish-keyword';
  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isPolishLetter(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('PolishKeywordExtractor: context not set');
    }

    let pos = position;
    let word = '';

    // Extract word
    while (pos < input.length && isPolishIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();
    const isPreposition = PREPOSITIONS.has(lower);

    // Look up keyword entry
    const keywordEntry = this.context.lookupKeyword(lower);
    const normalized =
      keywordEntry && keywordEntry.normalized !== keywordEntry.native
        ? keywordEntry.normalized
        : undefined;

    // Try morphological normalization if available and no direct match
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
      length: pos - position,
      metadata: {
        normalized: normalized || morphNormalized,
        isPreposition,
      },
    };
  }
}

/**
 * Factory function to create Polish extractors.
 */
export function createPolishExtractors(): ContextAwareExtractor[] {
  return [new PolishKeywordExtractor()];
}
