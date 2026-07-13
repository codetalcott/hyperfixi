/**
 * Indonesian Keyword Extractor (Context-Aware)
 *
 * Extracts Indonesian keywords with morphological normalization support.
 * Indonesian characteristics:
 * - Latin script (standard ASCII)
 * - SVO word order
 * - Agglutinative affixation (me-, ber-, di-, -kan, -i)
 * - No grammatical gender or conjugation (simpler than Romance languages)
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

/**
 * Indonesian prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'di', // at, in
  'ke', // to
  'dari', // from
  'pada', // on, at
  'dengan', // with
  'tanpa', // without
  'untuk', // for
  'oleh', // by
  'antara', // between
  'sebelum', // before
  'sesudah', // after
  'setelah', // after
  'selama', // during
  'sampai', // until
  'hingga', // until
  'sejak', // since
  'menuju', // towards
  'tentang', // about
  'terhadap', // towards, against
  'melalui', // through
  'dalam', // inside
  'luar', // outside
]);

/**
 * Character classifiers for Indonesian (standard Latin).
 */
function createIndonesianCharClassifiers() {
  const indonesianPattern = /[a-zA-Z]/;
  const isLetter = (char: string) => indonesianPattern.test(char);
  const isIdentifierChar = (char: string) => /[0-9]/.test(char) || indonesianPattern.test(char);
  return { isLetter, isIdentifierChar };
}

const { isLetter: isIndonesianLetter, isIdentifierChar: isIndonesianIdentifierChar } =
  createIndonesianCharClassifiers();

/**
 * Indonesian keyword extractor with morphological normalization.
 */
export class IndonesianKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'indonesian-keyword';
  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isIndonesianLetter(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('IndonesianKeywordExtractor: context not set');
    }

    let pos = position;
    let word = '';

    // Extract word
    while (pos < input.length && isIndonesianIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    // Underscore-joined keyword recovery (the swahili-keyword.ts mechanism).
    // The i18n id dict joins multi-word names with `_` (`ubah_ukuran`=resize);
    // the reader stops at `_`, so the compound shattered into ubah(→change) +
    // `_ ukuran` junk (the id window-resize event mis-bind, Arc F). When `_`
    // follows, read the full `_`-joined run and adopt it ONLY if it resolves
    // to a REGISTERED keyword — arbitrary snake_case identifiers stay split
    // exactly as before.
    if (this.context && pos < input.length && input[pos] === '_') {
      let extPos = pos;
      let ext = word;
      while (
        extPos < input.length &&
        (input[extPos] === '_' || isIndonesianIdentifierChar(input[extPos]))
      ) {
        ext += input[extPos++];
      }
      if (this.context.lookupKeyword(ext.toLowerCase())) {
        word = ext;
        pos = extPos;
      }
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
 * Factory function to create Indonesian extractors.
 */
export function createIndonesianExtractors(): ContextAwareExtractor[] {
  return [new IndonesianKeywordExtractor()];
}
