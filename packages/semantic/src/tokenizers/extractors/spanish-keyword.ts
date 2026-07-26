/**
 * Spanish Keyword Extractor (Context-Aware)
 *
 * Handles Spanish-specific identifier and keyword extraction with:
 * - Multi-word phrases (de lo contrario, de lo normal)
 * - Morphological normalization (alternando → alternar, mostrarse → mostrar)
 * - Accent mark handling (á, é, í, ó, ú, ü, ñ)
 * - Preposition detection
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';
import { isWhitespace } from '../base';

function createLatinCharClassifiers(pattern: RegExp) {
  const isLetter = (char: string) => pattern.test(char);
  const isIdentifierChar = (char: string) => /[0-9]/.test(char) || pattern.test(char);
  return { isLetter, isIdentifierChar };
}

const { isLetter: isSpanishLetter, isIdentifierChar: isSpanishIdentifierChar } =
  createLatinCharClassifiers(
    /[a-zA-Z\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1]/
  );

/**
 * Spanish prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'en',
  'a',
  'de',
  'desde',
  'hasta',
  'con',
  'sin',
  'por',
  'para',
  'sobre',
  'entre',
  'antes',
  'después',
  'despues',
  'dentro',
  'fuera',
  'al',
  'del',
]);

/**
 * SpanishKeywordExtractor - Context-aware extractor for Spanish identifiers and keywords.
 */
export class SpanishKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'spanish-keyword';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isSpanishLetter(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('SpanishKeywordExtractor: context not set');
    }

    // Try multi-word phrase first (higher priority)
    const phraseResult = this.tryMultiWordPhrase(input, position);
    if (phraseResult) {
      return phraseResult;
    }

    // Extract single word
    return this.extractSpanishWord(input, position);
  }

  /**
   * Try to match multi-word phrases from the keyword map.
   * E.g., "de lo contrario", "de lo normal"
   */
  private tryMultiWordPhrase(input: string, position: number): ExtractionResult | null {
    if (!this.context) return null;

    // Note: This is a simplification - in production, we'd need access to
    // this.profileKeywords from the tokenizer. For now, we'll rely on
    // the context.isKeyword() to check if compound phrases are keywords.

    // Try common multi-word Spanish phrases
    const multiWordPhrases = [
      'de lo contrario',
      'de lo normal',
      'por defecto',
      'de nuevo',
      'de otra manera',
    ];

    for (const phrase of multiWordPhrases) {
      const candidate = input.slice(position, position + phrase.length).toLowerCase();
      if (candidate === phrase.toLowerCase()) {
        // Check word boundary
        const nextPos = position + phrase.length;
        if (
          nextPos >= input.length ||
          isWhitespace(input[nextPos]) ||
          !isSpanishLetter(input[nextPos])
        ) {
          // Look up the normalized form
          const keywordEntry = this.context.lookupKeyword(phrase);
          return {
            value: input.slice(position, nextPos),
            length: phrase.length,
            metadata: {
              normalized: keywordEntry?.normalized,
              multiWord: true,
            },
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract a Spanish word with morphological normalization.
   */
  private extractSpanishWord(input: string, position: number): ExtractionResult | null {
    if (!this.context) return null;

    let pos = position;
    let word = '';

    while (pos < input.length && isSpanishIdentifierChar(input[pos])) {
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
 * Create Spanish-specific extractors.
 */
export function createSpanishExtractors(): ContextAwareExtractor[] {
  return [new SpanishKeywordExtractor()];
}
