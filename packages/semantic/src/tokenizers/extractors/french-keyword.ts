/**
 * French Keyword Extractor (Context-Aware)
 *
 * Handles French-specific identifier and keyword extraction with:
 * - Morphological normalization (alternant → alterner, montrer-se → montrer)
 * - Accent mark handling (à, â, æ, ç, é, è, ê, ë, ï, î, ô, ù, û, ü, ÿ, œ)
 * - Preposition detection
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

function createLatinCharClassifiers(pattern: RegExp) {
  const isLetter = (char: string) => pattern.test(char);
  const isIdentifierChar = (char: string) => /[0-9]/.test(char) || pattern.test(char);
  return { isLetter, isIdentifierChar };
}

const { isLetter: isFrenchLetter, isIdentifierChar: isFrenchIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-ZàâæçéèêëïîôùûüÿœÀÂÆÇÉÈÊËÏÎÔÙÛÜŸŒ]/);

/**
 * French prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'à', // to, at
  'a', // to, at (no accent)
  'de', // of, from
  'du', // de + le
  'des', // de + les
  'dans', // in
  'sur', // on
  'sous', // under
  'avec', // with
  'sans', // without
  'par', // by
  'pour', // for
  'entre', // between
  'avant', // before
  'après', // after
  'apres', // after (no accent)
  'depuis', // since, from
  'vers', // towards
  'chez', // at (someone's place)
  'contre', // against
  'au', // à + le
  'aux', // à + les
]);

/**
 * FrenchKeywordExtractor - Context-aware extractor for French identifiers and keywords.
 */
export class FrenchKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'french-keyword';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isFrenchLetter(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('FrenchKeywordExtractor: context not set');
    }

    let pos = position;
    let word = '';

    while (pos < input.length && isFrenchIdentifierChar(input[pos])) {
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

    // Try morphological normalization if available and not already a keyword
    // The stem is the NATIVE dictionary form (`agregar`), and the pattern
    // matcher's verb literal is that same native form — so `stem` is what makes a
    // conjugated surface match. `normalized` is the ENGLISH concept (`add`) and
    // never equals the literal, which is why capturing it alone left `agrega`
    // unparseable. Same shape as turkish-keyword.ts / korean-keyword.ts, which
    // already do this; these three were the omission.
    let morphNormalized: string | undefined;
    let morphStem: string | undefined;
    let morphConfidence: number | undefined;
    if (!keywordEntry && this.context.normalizer) {
      const morphResult = this.context.normalizer.normalize(word);
      if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
        // Check if the stem is a known keyword
        const stemEntry = this.context.lookupKeyword(morphResult.stem);
        if (stemEntry) {
          morphNormalized = stemEntry.normalized;
          morphStem = morphResult.stem;
          morphConfidence = morphResult.confidence;
        }
      }
    }

    return {
      value: word,
      length: pos - position,
      metadata: {
        normalized: normalized || morphNormalized,
        stem: morphStem,
        stemConfidence: morphConfidence,
        isPreposition,
      },
    };
  }
}

/**
 * Create French-specific extractors.
 */
export function createFrenchExtractors(): ContextAwareExtractor[] {
  return [new FrenchKeywordExtractor()];
}
