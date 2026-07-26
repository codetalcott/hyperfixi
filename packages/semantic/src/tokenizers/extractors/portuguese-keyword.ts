/**
 * Portuguese Keyword Extractor (Context-Aware)
 *
 * Handles Portuguese-specific identifier and keyword extraction with:
 * - Morphological normalization (alternando → alternar, mostrar-se → mostrar)
 * - Accent mark handling (á, â, ã, é, ê, í, ó, ô, õ, ú, ç)
 * - Preposition detection
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

function createLatinCharClassifiers(pattern: RegExp) {
  const isLetter = (char: string) => pattern.test(char);
  const isIdentifierChar = (char: string) => /[0-9]/.test(char) || pattern.test(char);
  return { isLetter, isIdentifierChar };
}

const { isLetter: isPortugueseLetter, isIdentifierChar: isPortugueseIdentifierChar } =
  createLatinCharClassifiers(
    /[a-zA-Z\u00e1\u00e2\u00e3\u00e9\u00ea\u00ed\u00f3\u00f4\u00f5\u00fa\u00e7\u00c1\u00c2\u00c3\u00c9\u00ca\u00cd\u00d3\u00d4\u00d5\u00da\u00c7]/
  );

/**
 * Portuguese prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'em',
  'a',
  'de',
  'para',
  'com',
  'sem',
  'por',
  'sobre',
  'entre',
  'antes',
  'depois',
  'dentro',
  'fora',
  'ao',
  'do',
  'da',
  'no',
  'na',
]);

/**
 * PortugueseKeywordExtractor - Context-aware extractor for Portuguese identifiers and keywords.
 */
export class PortugueseKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'portuguese-keyword';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isPortugueseLetter(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('PortugueseKeywordExtractor: context not set');
    }

    let pos = position;
    let word = '';

    while (pos < input.length && isPortugueseIdentifierChar(input[pos])) {
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
 * Create Portuguese-specific extractors.
 */
export function createPortugueseExtractors(): ContextAwareExtractor[] {
  return [new PortugueseKeywordExtractor()];
}
