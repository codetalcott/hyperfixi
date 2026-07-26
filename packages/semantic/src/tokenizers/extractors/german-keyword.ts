/**
 * German Keyword Extractor (Context-Aware)
 *
 * Handles German-specific identifier and keyword extraction with:
 * - Compound noun support (typical in German)
 * - Morphological normalization (erhöhe → erhöhen, umschalten → umschalten)
 * - Umlaut handling (ä, ö, ü, ß)
 * - Preposition detection
 * - Umlaut-free variant support (hinzufugen → hinzufügen)
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

function createLatinCharClassifiers(pattern: RegExp) {
  const isLetter = (char: string) => pattern.test(char);
  const isIdentifierChar = (char: string) => /[0-9]/.test(char) || pattern.test(char);
  return { isLetter, isIdentifierChar };
}

const { isLetter: isGermanLetter, isIdentifierChar: isGermanIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-Z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]/);

/**
 * German prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'an', // at, on
  'auf', // on
  'aus', // from, out of
  'bei', // at, near
  'durch', // through
  'für', // for
  'fur', // for (no umlaut)
  'gegen', // against
  'in', // in
  'mit', // with
  'nach', // after, to
  'ohne', // without
  'seit', // since
  'über', // over, about
  'uber', // over (no umlaut)
  'um', // around, at
  'unter', // under
  'von', // from, of
  'vor', // before, in front of
  'zu', // to
  'zwischen', // between
  'bis', // until
  'gegenüber', // opposite
  'gegenuber', // opposite (no umlaut)
  'während', // during
  'wahrend', // during (no umlaut)
  'wegen', // because of
  'trotz', // despite
  'statt', // instead of
  'innerhalb', // inside
  'außerhalb', // outside
  'ausserhalb', // outside (no umlaut)
]);

/**
 * GermanKeywordExtractor - Context-aware extractor for German identifiers and keywords.
 */
export class GermanKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'german-keyword';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isGermanLetter(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('GermanKeywordExtractor: context not set');
    }

    // Extract single word (German doesn't have as many multi-word phrases as Spanish)
    return this.extractGermanWord(input, position);
  }

  /**
   * Extract a German word with morphological normalization.
   */
  private extractGermanWord(input: string, position: number): ExtractionResult | null {
    if (!this.context) return null;

    let pos = position;
    let word = '';

    while (pos < input.length && isGermanIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();

    // Check if it's a preposition
    const isPreposition = PREPOSITIONS.has(lower);

    // Look up keyword entry
    const keywordEntry = this.context.lookupKeyword(word);
    const normalized =
      keywordEntry && keywordEntry.normalized !== keywordEntry.native
        ? keywordEntry.normalized
        : undefined;

    // Try morphological normalization if available and not already a keyword
    let morphNormalized: string | undefined;
    if (!keywordEntry && this.context.normalizer) {
      const morphResult = this.context.normalizer.normalize(word);
      if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
        // Check if the stem is a known keyword
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
 * Create German-specific extractors.
 */
export function createGermanExtractors(): ContextAwareExtractor[] {
  return [new GermanKeywordExtractor()];
}
