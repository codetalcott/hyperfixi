/**
 * Swahili Keyword Extractor (Context-Aware)
 *
 * Extracts Swahili keywords with morphological normalization support.
 * Swahili (Kiswahili) characteristics:
 * - Latin script (standard ASCII)
 * - SVO word order
 * - Agglutinative morphology with noun class prefixes and verb affixes
 * - No grammatical gender, but noun class system (m-, wa-, ki-, vi-, etc.)
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

/**
 * Swahili prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'kwa', // to, for, with, by
  'na', // and, with
  'katika', // in, at
  'kwenye', // on, at
  'kutoka', // from
  'hadi', // until, to
  'mpaka', // until, up to
  'kabla', // before
  'baada', // after
  'wakati', // during, when
  'bila', // without
  'kuhusu', // about
  'karibu', // near
  'mbele', // in front of
  'nyuma', // behind
  'ndani', // inside
  'nje', // outside
  'juu', // above, on
  'chini', // below, under
  'kati', // between
]);

/**
 * Character classifiers for Swahili (standard Latin).
 */
function createSwahiliCharClassifiers() {
  const swahiliPattern = /[a-zA-Z]/;
  const isLetter = (char: string) => swahiliPattern.test(char);
  // `_` is a word character mid-word (never a word start: canExtract tests isLetter), so a
  // snake_case name (`my_func()`) is one word and an `_`-joined keyword is looked up whole,
  // as the Cyrillic and Malay extractors read them. It split at `_` before.
  const isIdentifierChar = (char: string) => /[0-9_]/.test(char) || swahiliPattern.test(char);
  return { isLetter, isIdentifierChar };
}

const { isLetter: isSwahiliLetter, isIdentifierChar: isSwahiliIdentifierChar } =
  createSwahiliCharClassifiers();

/**
 * Swahili keyword extractor with morphological normalization.
 */
export class SwahiliKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'swahili-keyword';
  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isSwahiliLetter(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('SwahiliKeywordExtractor: context not set');
    }

    let pos = position;
    let word = '';

    // Extract word
    while (pos < input.length && isSwahiliIdentifierChar(input[pos])) {
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
 * Factory function to create Swahili extractors.
 */
export function createSwahiliExtractors(): ContextAwareExtractor[] {
  return [new SwahiliKeywordExtractor()];
}
